const express = require('express');
const app = express();
const http = require('http');
const cors = require('cors');
const { Server } = require('socket.io');
const sqlite3 = require('sqlite3');
const { open } = require('sqlite');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const sharp = require('sharp'); // НУЖНО: npm install sharp

app.use(cors());
app.use(express.json());

// --- 1. НАСТРОЙКА ЗАГРУЗКИ ФАЙЛОВ ---
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Используем память, чтобы обработать файл перед сохранением
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Функция оптимизации изображения
async function processAndSaveImage(buffer, originalName) {
    const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webp';
    const outputPath = path.join(uploadDir, name);

    await sharp(buffer)
        .resize(1280, 1280, { // Ограничиваем макс. размер 1280px (сохраняя пропорции)
            fit: 'inside',
            withoutEnlargement: true 
        })
        .webp({ quality: 80 }) // Конвертируем в WebP с качеством 80%
        .toFile(outputPath);

    return `http://localhost:3001/uploads/${name}`;
}

// Сохранение аудио (без сжатия sharp, просто сохраняем буфер)
async function saveAudio(buffer) {
    const name = Date.now() + '-' + Math.round(Math.random() * 1E9) + '.webm';
    const outputPath = path.join(uploadDir, name);
    fs.writeFileSync(outputPath, buffer);
    return `http://localhost:3001/uploads/${name}`;
}

// Загрузка одного файла
app.post('/upload', upload.single('file'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    try {
        let fileUrl;
        // Проверяем mime-type
        if (req.file.mimetype.startsWith('image/')) {
            fileUrl = await processAndSaveImage(req.file.buffer, req.file.originalname);
        } else {
            // Аудио или другие файлы
            fileUrl = await saveAudio(req.file.buffer);
        }
        res.json({ url: fileUrl });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing file" });
    }
});

// Загрузка галереи (оптимизируем каждое фото)
app.post('/upload-multiple', upload.array('files', 10), async (req, res) => {
    if (!req.files || req.files.length === 0) return res.status(400).json({ message: 'No files uploaded' });
    
    try {
        // Параллельная обработка всех картинок
        const promises = req.files.map(file => processAndSaveImage(file.buffer, file.originalname));
        const urls = await Promise.all(promises);
        res.json({ urls });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error processing files" });
    }
});

// --- НОВЫЙ ЭНДПОИНТ ДЛЯ ЗАГРУЗКИ АВАТАРА ---
app.post('/upload-avatar', upload.single('avatar'), async (req, res) => {
    if (!req.file) return res.status(400).json({ message: 'No file uploaded' });
    
    const { username } = req.body;
    if (!username) return res.status(400).json({ message: 'Username is required' });

    try {
        const fileUrl = await processAndSaveImage(req.file.buffer, 'avatar.webp');
        
        await db.run('INSERT INTO user_avatars (username, avatar_url) VALUES (?, ?)', [username, fileUrl]);
        await db.run('UPDATE user_profiles SET avatar_url = ? WHERE username = ?', [fileUrl, username]);
        
        const updatedProfile = await db.get('SELECT * FROM user_profiles WHERE username = ?', [username]);
        res.json({ profile: updatedProfile });

    } catch (err) {
        console.error("Avatar Upload Error:", err);
        res.status(500).json({ message: "Error processing avatar" });
    }
});


const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "http://localhost:5173", methods: ["GET", "POST"] },
});

let db;
let onlineUsers = [];
const MESSAGES_PER_PAGE = 30;

async function initDB() {
    db = await open({ filename: './database.db', driver: sqlite3.Database });
    await db.exec(`
        CREATE TABLE IF NOT EXISTS messages (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            room TEXT, author TEXT, message TEXT, type TEXT DEFAULT 'text', time TEXT
        );
        CREATE TABLE IF NOT EXISTS friends (
            id INTEGER PRIMARY KEY AUTOINCREMENT, user_1 TEXT, user_2 TEXT
        );
        CREATE TABLE IF NOT EXISTS group_members (
            id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, username TEXT, role TEXT DEFAULT 'member', custom_title TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS user_profiles (
            username TEXT PRIMARY KEY, bio TEXT DEFAULT '', phone TEXT DEFAULT '', avatar_url TEXT DEFAULT ''
        );
        CREATE TABLE IF NOT EXISTS blocked_users (
            id INTEGER PRIMARY KEY AUTOINCREMENT, blocker TEXT, blocked TEXT
        );
        -- Новая таблица для истории аватарок
        CREATE TABLE IF NOT EXISTS user_avatars (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT,
            avatar_url TEXT,
            created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
            FOREIGN KEY (username) REFERENCES user_profiles(username) ON DELETE CASCADE
        );
    `);
    try { await db.exec(`ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'`); } catch (e) {}
    console.log("Database connected & Tables ready");
}
initDB();

// --- ВСПОМОГАТЕЛЬНЫЕ ФУНКЦИИ ---
async function getUserRole(room, username) {
    if (!room || !username) return null;
    const member = await db.get(`SELECT role FROM group_members WHERE room = ? AND username = ?`, [room, username]);
    return member ? member.role : null;
}

async function isBlocked(target, sender) {
    const block = await db.get(`SELECT * FROM blocked_users WHERE blocker = ? AND blocked = ?`, [target, sender]);
    return !!block;
}

// --- SOCKET.IO ---
io.on("connection", (socket) => {
    console.log(`User connected: ${socket.id}`);

    socket.on("login_user", async (username) => {
        socket.data.username = username;
        onlineUsers = onlineUsers.filter(u => u.username !== username); 
        onlineUsers.push({ socketId: socket.id, username });
        
        try { await db.run(`INSERT OR IGNORE INTO user_profiles (username) VALUES (?)`, [username]); } catch (e) {}
        
        const friends = await db.all(`SELECT user_2 as name FROM friends WHERE user_1 = ? UNION SELECT user_1 as name FROM friends WHERE user_2 = ?`, [username, username]);
        socket.emit("friends_list", friends.map(f => f.name));

        const myGroups = await db.all(`SELECT room FROM group_members WHERE username = ?`, [username]);
        const groupNames = myGroups.map(g => g.room);
        if (!groupNames.includes("General")) groupNames.unshift("General");
        socket.emit("user_groups", groupNames);
    });

    socket.on("join_room", async (data) => {
        socket.join(data.room);
        const history = await db.all(
            'SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT ? OFFSET 0', 
            [data.room, MESSAGES_PER_PAGE]
        );
        socket.emit("chat_history", history.reverse());
    });

    socket.on("load_more_messages", async (data) => {
        const moreMessages = await db.all(
            'SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT ? OFFSET ?',
            [data.room, MESSAGES_PER_PAGE, data.offset]
        );
        if (moreMessages.length > 0) {
            socket.emit("more_messages_loaded", moreMessages.reverse());
        } else {
            socket.emit("no_more_messages");
        }
    });

    socket.on("send_message", async (data) => {
        const author = socket.data.username || data.author;
        if (data.room.includes("_")) {
            const participants = data.room.split("_");
            const target = participants.find(p => p !== author);
            if (target && await isBlocked(target, author)) {
                socket.emit("error_message", { msg: "Вы не можете отправить сообщение." });
                return;
            }
        }
        try {
            const msgType = data.type || 'text';
            const result = await db.run('INSERT INTO messages (room, author, message, type, time) VALUES (?, ?, ?, ?, ?)', [data.room, author, data.message, msgType, data.time]);
            io.to(data.room).emit("receive_message", { ...data, id: result.lastID, author, type: msgType });
        } catch (e) { console.error(e); }
    });

    socket.on("typing", (data) => socket.to(data.room).emit("display_typing", { username: socket.data.username }));

    // --- ГРУППЫ ---
    socket.on("create_group", async (data) => {
        try { await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'owner')`, [data.room, socket.data.username]); socket.emit("group_created", { room: data.room }); } catch (e) {}
    });

    socket.on("search_groups", async (query) => {
        const groups = await db.all(`SELECT DISTINCT room FROM group_members WHERE room LIKE ? LIMIT 10`, [`%${query}%`]);
        socket.emit("search_groups_results", groups);
    });

    socket.on("join_existing_group", async (data) => {
        const user = socket.data.username;
        const existing = await db.get(`SELECT * FROM group_members WHERE room = ? AND username = ?`, [data.room, user]);
        if (!existing) await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`, [data.room, user]);
        socket.emit("group_joined", { room: data.room });
    });

    socket.on("get_group_info", async (room) => {
        const members = await db.all(`SELECT * FROM group_members WHERE room = ?`, [room]);
        const myRole = members.find(m => m.username === socket.data.username)?.role || 'guest';
        socket.emit("group_info_data", { room, members, myRole });
    });

    socket.on("add_group_member", async (data) => {
        if (!await getUserRole(data.room, socket.data.username)) return;
        if (!await db.get(`SELECT * FROM group_members WHERE room=? AND username=?`, [data.room, data.username])) {
            await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`, [data.room, data.username]);
            io.to(data.room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [data.room]) });
        }
    });

    socket.on("remove_group_member", async (data) => {
        const requesterRole = await getUserRole(data.room, socket.data.username);
        if (requesterRole !== 'owner') return; 
        if (socket.data.username === data.username) return;
        await db.run(`DELETE FROM group_members WHERE room = ? AND username = ?`, [data.room, data.username]);
        io.to(data.room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [data.room]) });
    });

    socket.on("leave_group", async (data) => {
        const user = socket.data.username;
        const role = await getUserRole(data.room, user);
        if (!role) return;
        if (role === 'owner') {
            await db.run(`DELETE FROM group_members WHERE room = ?`, [data.room]);
            await db.run(`DELETE FROM messages WHERE room = ?`, [data.room]);
            io.to(data.room).emit("group_deleted", { room: data.room });
        } else {
            await db.run(`DELETE FROM group_members WHERE room = ? AND username = ?`, [data.room, user]);
            io.to(data.room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [data.room]) });
            socket.emit("left_group_success", { room: data.room });
        }
    });

    // --- ПРОФИЛИ, ДРУЗЬЯ, АВАТАРЫ ---
    socket.on("get_my_profile", async (u) => socket.emit("my_profile_data", await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]) || { username: u, bio: '', phone: '', avatar_url: '' }));
    
    socket.on("update_profile", async (data) => {
        const u = socket.data.username;
        // Аватар обновляется через /upload-avatar, здесь только текст
        await db.run(`UPDATE user_profiles SET bio=?, phone=? WHERE username=?`, [data.bio, data.phone, u]);
        socket.emit("my_profile_data", await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]));
    });

    socket.on("get_user_profile", async (u) => {
        const p = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]);
        const me = socket.data.username;
        const f = await db.get(`SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [me, u, u, me]);
        socket.emit("user_profile_data", { ...(p || { username: u, bio: 'Нет инфо', phone: '', avatar_url: '' }), isFriend: !!f });
    });

    socket.on("get_avatar_history", async (username) => {
        const history = await db.all(`SELECT * FROM user_avatars WHERE username = ? ORDER BY id DESC`, [username]);
        socket.emit("avatar_history_data", history);
    });

    socket.on("delete_avatar", async ({ avatarId }) => {
        const user = socket.data.username;
        const avatarToDelete = await db.get("SELECT * FROM user_avatars WHERE id = ? AND username = ?", [avatarId, user]);
        
        if (!avatarToDelete) {
            return socket.emit("error_message", { msg: "Аватар не найден" });
        }

        try {
            const filename = path.basename(new URL(avatarToDelete.avatar_url).pathname);
            const filePath = path.join(uploadDir, filename);
            if (fs.existsSync(filePath)) fs.unlinkSync(filePath);
        } catch(e) { console.error("Could not delete file:", e.message) }
        
        await db.run("DELETE FROM user_avatars WHERE id = ?", [avatarId]);

        const currentUserProfile = await db.get("SELECT * FROM user_profiles WHERE username = ?", [user]);
        if (currentUserProfile.avatar_url === avatarToDelete.avatar_url) {
            const nextAvatar = await db.get("SELECT * FROM user_avatars WHERE username = ? ORDER BY id DESC LIMIT 1", [user]);
            const newAvatarUrl = nextAvatar ? nextAvatar.avatar_url : '';
            await db.run("UPDATE user_profiles SET avatar_url = ? WHERE username = ?", [newAvatarUrl, user]);
        }

        socket.emit("my_profile_data", await db.get(`SELECT * FROM user_profiles WHERE username=?`, [user]));
        const newHistory = await db.all(`SELECT * FROM user_avatars WHERE username = ? ORDER BY id DESC`, [user]);
        socket.emit("avatar_history_data", newHistory);
    });


    socket.on("search_users", (q) => socket.emit("search_results", onlineUsers.filter(u => u.username.toLowerCase().includes(q.toLowerCase()))));

    socket.on("send_friend_request", async (data) => {
        const s = socket.data.username;
        // if (s === data.fromUser) return; // <-- ЭТА СТРОКА БЫЛА ОШИБКОЙ И БЛОКИРОВАЛА ЗАПРОСЫ. ОНА УДАЛЕНА.
        const t = onlineUsers.find(u => u.socketId === data.toUserSocketId)?.username;
        if (t && await isBlocked(t, s)) return socket.emit("error_message", { msg: "Ошибка: вы заблокированы." });
        io.to(data.toUserSocketId).emit("incoming_friend_request", { from: s, socketId: socket.id });
    });

    socket.on("accept_friend_request", async (data) => {
        const u1 = onlineUsers.find(u => u.socketId === data.fromSocketId)?.username;
        const u2 = socket.data.username;
        if (u1 && u2) {
            if (!await db.get(`SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [u1, u2, u2, u1])) {
                await db.run('INSERT INTO friends (user_1, user_2) VALUES (?, ?)', [u1, u2]);
            }
            io.to(data.fromSocketId).emit("friend_added", { username: u2 });
            socket.emit("friend_added", { username: u1 });
        }
    });

    socket.on("decline_friend_request", (d) => io.to(d.fromSocketId).emit("request_declined", { from: socket.data.username }));
    
    socket.on("remove_friend", async (t) => {
        const me = socket.data.username;
        await db.run(`DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [me, t, t, me]);
        socket.emit("friend_removed", { username: t });
        const ts = onlineUsers.find(u => u.username === t);
        if (ts) io.to(ts.socketId).emit("friend_removed", { username: me });
    });

    socket.on("block_user", async (t) => {
        const me = socket.data.username;
        await db.run(`INSERT INTO blocked_users (blocker, blocked) VALUES (?, ?)`, [me, t]);
        await db.run(`DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [me, t, t, me]);
        socket.emit("friend_removed", { username: t });
        const ts = onlineUsers.find(u => u.username === t);
        if (ts) io.to(ts.socketId).emit("friend_removed", { username: me });
        socket.emit("info_message", { msg: `${t} заблокирован.` });
    });

    socket.on("delete_message", async (id) => {
        const user = socket.data.username;
        try {
            const msg = await db.get("SELECT * FROM messages WHERE id = ?", [id]);
            
            if (msg && msg.author === user) {
                await db.run("DELETE FROM messages WHERE id = ?", [id]);
                io.to(msg.room).emit("message_deleted", id);
            } else {
                socket.emit("error_message", { msg: "Нельзя удалить чужое сообщение" });
            }
        } catch (e) {
            console.error("Error deleting message:", e);
        }
    });

    socket.on("disconnect", () => onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id));
});

server.listen(3001, () => console.log("SERVER RUNNING ON PORT 3001"));