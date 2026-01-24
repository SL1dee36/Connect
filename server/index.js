require('dotenv').config();

const express = require("express");
const app = express();

// Доверяем прокси (для Vercel/CSB)
app.set('trust proxy', 1);

const http = require("http");
const cors = require("cors");
const { Server } = require("socket.io");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
const multer = require("multer");
const path = require("path");
const fs = require("fs");
const sharp = require("sharp");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const webpush = require("web-push");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET;
if (!JWT_SECRET) {
    throw new Error("FATAL ERROR: JWT_SECRET is not defined in .env");
}

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  "https://connect-apollo.vercel.app",
  "https://rs5y26-3001.csb.app"
];

const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true,
  allowedHeaders: ["Content-Type", "Authorization"],
  optionsSuccessStatus: 200
};

app.use(cors(corsOptions));
app.use(express.json());

app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      connectSrc: [
        "'self'", 
        "http://localhost:*", 
        "https://connect-apollo.vercel.app", 
        "ws://localhost:*", 
        "wss://connect-apollo.vercel.app",
        "https://rs5y26-3001.csb.app"
      ],
      imgSrc: ["'self'", "data:", "blob:", "http:", "https:"],
      mediaSrc: ["'self'", "blob:", "data:"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" },
  crossOriginEmbedderPolicy: false,
}));

// Лимитеры
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: "Слишком много попыток входа",
  standardHeaders: true,
  legacyHeaders: false,
});

const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 1000, // Увеличили лимит для активного чата
  standardHeaders: true,
  legacyHeaders: false,
});

const apiNoCache = (req, res, next) => {
  res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
  res.set('Pragma', 'no-cache');
  res.set('Expires', '0');
  res.set('Surrogate-Control', 'no-store');
  next();
};

app.use("/login", authLimiter, apiNoCache);
app.use("/register", authLimiter, apiNoCache);
app.use("/report-bug", apiLimiter, apiNoCache);
app.use("/resolve-bug", apiLimiter, apiNoCache);
app.use("/", apiLimiter);

const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const uploadDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

// --- VAPID KEYS ---
const vapidKeysPath = path.join(dataDir, "vapid.json");
let vapidKeys = {
  publicKey: process.env.VAPID_PUBLIC_KEY,
  privateKey: process.env.VAPID_PRIVATE_KEY,
};

if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
  if (fs.existsSync(vapidKeysPath)) {
    try {
      vapidKeys = JSON.parse(fs.readFileSync(vapidKeysPath, "utf-8"));
    } catch (err) {}
  }
  if (!vapidKeys.publicKey || !vapidKeys.privateKey) {
    vapidKeys = webpush.generateVAPIDKeys();
    fs.writeFileSync(vapidKeysPath, JSON.stringify(vapidKeys, null, 2));
  }
}

webpush.setVapidDetails(
  "mailto:admin@connect.local",
  vapidKeys.publicKey,
  vapidKeys.privateKey
);

app.use("/uploads", express.static(uploadDir, {
  setHeaders: (res, path) => {
    res.set('Cache-Control', 'public, max-age=31536000');
    res.set('X-Content-Type-Options', 'nosniff');
  }
}));

let db;

// --- DB INIT ---
async function initDB() {
  const dbPath = path.join(dataDir, "database.db");
  db = await open({ filename: dbPath, driver: sqlite3.Database });

  await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, author TEXT, message TEXT, type TEXT DEFAULT 'text', time TEXT, reply_to_id INTEGER, reply_to_author TEXT, reply_to_message TEXT);
        CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, user_1 TEXT, user_2 TEXT);
        CREATE TABLE IF NOT EXISTS group_members (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, username TEXT, role TEXT DEFAULT 'member', custom_title TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS user_profiles (username TEXT PRIMARY KEY, bio TEXT DEFAULT '', phone TEXT DEFAULT '', avatar_url TEXT DEFAULT '', display_name TEXT DEFAULT '', notifications_enabled BOOLEAN DEFAULT 1);
        CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY AUTOINCREMENT, blocker TEXT, blocked TEXT);
        CREATE TABLE IF NOT EXISTS user_avatars (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, avatar_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_to TEXT, type TEXT, content TEXT, data TEXT, is_read BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS bug_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter TEXT, description TEXT, media_urls TEXT, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subscription TEXT);
        CREATE TABLE IF NOT EXISTS chat_wallpapers (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, room TEXT, settings TEXT, UNIQUE(username, room));
        
        -- НОВЫЕ ТАБЛИЦЫ ДЛЯ РОЛЕЙ И ФУНКЦИЙ --
        CREATE TABLE IF NOT EXISTS group_settings (room TEXT PRIMARY KEY, avatar_url TEXT, is_private BOOLEAN DEFAULT 0, slow_mode INTEGER DEFAULT 0);
        CREATE TABLE IF NOT EXISTS badges (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT, svg_content TEXT);
        CREATE TABLE IF NOT EXISTS user_badges (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, badge_id INTEGER);
    `);

  // Migrations logic
  const safeRun = async (query) => { try { await db.exec(query); } catch (e) {} };
  
  // Добавляем глобальную роль пользователю
  await safeRun(`ALTER TABLE users ADD COLUMN global_role TEXT DEFAULT 'member'`);
  
  // Existing migrations
  await safeRun(`ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_id INTEGER`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_author TEXT`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_message TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN user_to TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN type TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN content TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN data TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT 0`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`);
  await safeRun(`ALTER TABLE user_profiles ADD COLUMN display_name TEXT DEFAULT ''`);
  await safeRun(`ALTER TABLE user_profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1`);

  // Ставим дефолтного админа и овнера General
  try { await db.run(`INSERT INTO group_members (room, username, role) SELECT 'General', username, 'member' FROM users WHERE username NOT IN (SELECT username FROM group_members WHERE room = 'General')`); } catch (e) {}
  try { await db.run("UPDATE group_members SET role = 'owner' WHERE username = 'slide36' AND room = 'General'"); } catch (e) {}
  
  // Устанавливаем глобального админа
  try { await db.run("UPDATE users SET global_role = 'mod' WHERE username = 'slide36'"); } catch (e) {}

  // Создаем дефолтный бейдж модератора, если нет
  const modBadge = await db.get("SELECT * FROM badges WHERE name = 'Moderator'");
  if (!modBadge) {
      const modSvg = `<svg width="24" height="24" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 32"><path fill="#2b95ff" d="M23.62 15.24v-3.05H22.1v3.05h-1.53v3.05h1.53v1.52h1.52v1.52h4.57v-1.52h1.52v-1.52h1.53v-3.05h-1.53v-3.05h-1.52v3.05zm3.05-6.1h1.52v3.05h-1.52Zm-1.53 0h1.53V4.57h1.52V3.05h-3.05v1.52H22.1V6.1h3.04zm-1.52 0h1.52v3.05h-1.52ZM12.95 30.48v-1.53h-1.52v1.53H9.9V32h13.72v-1.52H22.1v-1.53h-1.53v1.53zm6.1-24.38h3.05v1.52h-3.05Zm-1.53-4.58h1.53v1.53h-1.53Z"/><path fill="#2b95ff" d="M16 27.43h-3.05v1.52h7.62v-1.52h-3.05V9.14h1.53V7.62h-1.53V3.05H16v6.09h-3.05v1.53H16zM16 0h1.52v1.52H16Zm-1.52 1.52H16v1.53h-1.52ZM9.9 10.67h3.05v1.52H9.9ZM3.81 22.86v-3.05H2.29v3.05H.76v3.05h1.53v1.52h1.52v1.52h4.57v-1.52H9.9v-1.52h1.53v-3.05H9.9v-3.05H8.38v3.05z"/><path fill="#2b95ff" d="M6.86 16.76h1.52v3.05H6.86Zm0-4.57H9.9v1.53H6.86Zm-3.05 4.57h1.52v3.05H3.81Zm3.05 0v-3.04H3.81v1.52h1.52v1.52z"/></svg>`;
      await db.run("INSERT INTO badges (name, svg_content) VALUES (?, ?)", ["Moderator", modSvg]);
  }

  console.log("Database connected & Schema synced");
}
initDB();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// --- MIDDLEWARES FOR ADMIN API ---
const authenticateToken = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];
    if (!token) return res.sendStatus(401);
    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) return res.sendStatus(403);
        req.user = user;
        next();
    });
};

const verifyMod = async (req, res, next) => {
    if (!db) return res.sendStatus(500);
    const user = await db.get("SELECT global_role FROM users WHERE username = ?", [req.user.username]);
    if (user && user.global_role === 'mod') {
        next();
    } else {
        res.status(403).json({ message: "Access denied. Admins only." });
    }
};

// --- ROUTES ---

// AUTH
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password) return res.status(400).json({ message: "Required fields missing" });
  try {
    if (!db) throw new Error("Database not ready");
    const existing = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (existing) return res.status(409).json({ message: "User exists" });
    const hash = await bcrypt.hash(password, 10);
    // Новый юзер - member
    await db.run("INSERT INTO users (username, password_hash, global_role) VALUES (?, ?, 'member')", [username, hash]);
    await db.run("INSERT INTO user_profiles (username, display_name) VALUES (?, ?)", [username, username]);
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    const token = jwt.sign({ id: user.id, username: user.username, role: 'member' }, JWT_SECRET, { expiresIn: "7d" });
    res.status(201).json({ token });
    await db.run("INSERT INTO group_members (room, username, role) VALUES ('General', ?, 'member')", [username]);
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!db) throw new Error("Database not ready");
    const user = await db.get("SELECT * FROM users WHERE username = ?", [username]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign({ id: user.id, username: user.username, role: user.global_role }, JWT_SECRET, { expiresIn: "7d" });
    res.json({ token, role: user.global_role });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

// ADMIN API
app.get("/admin/users", authenticateToken, verifyMod, async (req, res) => {
    const users = await db.all(`
        SELECT u.id, u.username, u.global_role, u.created_at, p.display_name 
        FROM users u LEFT JOIN user_profiles p ON u.username = p.username 
        ORDER BY u.created_at DESC
    `);
    res.json(users);
});

app.post("/admin/user-action", authenticateToken, verifyMod, async (req, res) => {
    const { action, targetUsername, payload } = req.body;
    try {
        if (action === 'delete') {
            await db.run("DELETE FROM users WHERE username=?", [targetUsername]);
            await db.run("DELETE FROM user_profiles WHERE username=?", [targetUsername]);
            await db.run("DELETE FROM messages WHERE author=?", [targetUsername]);
            // Сброс коннекта через сокет произойдет при следующей проверке токена
        } else if (action === 'reset_password') {
            const hash = await bcrypt.hash("123456", 10); // Default pass
            await db.run("UPDATE users SET password_hash=? WHERE username=?", [hash, targetUsername]);
        } else if (action === 'set_role') {
            await db.run("UPDATE users SET global_role=? WHERE username=?", [payload.role, targetUsername]);
            
            // Автоматически даем бейдж модератора
            const modBadge = await db.get("SELECT id FROM badges WHERE name='Moderator'");
            if (payload.role === 'mod' && modBadge) {
                await db.run("INSERT OR IGNORE INTO user_badges (username, badge_id) VALUES (?, ?)", [targetUsername, modBadge.id]);
            } else if (payload.role === 'member' && modBadge) {
                await db.run("DELETE FROM user_badges WHERE username=? AND badge_id=?", [targetUsername, modBadge.id]);
            }
        }
        res.json({ status: "ok" });
    } catch (e) { res.status(500).json({ error: e.message }); }
});

app.get("/admin/badges", authenticateToken, verifyMod, async (req, res) => {
    res.json(await db.all("SELECT * FROM badges"));
});

app.post("/admin/badges", authenticateToken, verifyMod, async (req, res) => {
    const { name, svg_content } = req.body;
    await db.run("INSERT INTO badges (name, svg_content) VALUES (?, ?)", [name, svg_content]);
    res.json({ status: "ok" });
});

app.post("/admin/assign-badge", authenticateToken, verifyMod, async (req, res) => {
    const { username, badgeId, action } = req.body; // action: 'add' or 'remove'
    if (action === 'add') {
        await db.run("INSERT OR IGNORE INTO user_badges (username, badge_id) VALUES (?, ?)", [username, badgeId]);
    } else {
        await db.run("DELETE FROM user_badges WHERE username=? AND badge_id=?", [username, badgeId]);
    }
    res.json({ status: "ok" });
});


// UPLOADS & IMAGES
const upload = multer({ storage: multer.memoryStorage() });

const processImage = async (buf) => {
  const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webp";
  await sharp(buf).resize(1280, 1280, { fit: "inside" }).webp().toFile(path.join(uploadDir, name));
  return `${BACKEND_URL}/uploads/${name}`;
};

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  try {
    const url = req.file.mimetype.startsWith("image/")
      ? await processImage(req.file.buffer)
      : `${BACKEND_URL}/uploads/${Date.now()}.webm`;
    if (!req.file.mimetype.startsWith("image/"))
      fs.writeFileSync(path.join(uploadDir, path.basename(url)), req.file.buffer);
    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: "Upload failed" });
  }
});

app.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  if (!req.files) return res.status(400).json({ message: "No files" });
  try {
    const urls = await Promise.all(req.files.map((f) => processImage(f.buffer)));
    res.json({ urls });
  } catch (e) {
    res.status(500).json({ message: "Upload failed" });
  }
});

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!db) throw new Error("Database not ready");
    const url = await processImage(req.file.buffer);
    await db.run("INSERT INTO user_avatars (username, avatar_url) VALUES (?, ?)", [req.body.username, url]);
    await db.run("UPDATE user_profiles SET avatar_url = ? WHERE username = ?", [url, req.body.username]);
    res.json({ profile: await db.get("SELECT * FROM user_profiles WHERE username = ?", [req.body.username]) });
  } catch (e) {
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

// BUGS & SUBSCRIPTIONS
app.post("/report-bug", upload.array("files", 5), async (req, res) => {
  try {
    if (!db) throw new Error("Database not ready");
    const { description, reporter } = req.body;
    let mediaUrls = [];
    if (req.files && req.files.length > 0)
      mediaUrls = await Promise.all(req.files.map((f) => processImage(f.buffer)));
    await db.run("INSERT INTO bug_reports (reporter, description, media_urls) VALUES (?, ?, ?)", [reporter, description, JSON.stringify(mediaUrls)]);
    res.json({ status: "ok", message: "Bug reported successfully" });
  } catch (e) {
    res.status(500).json({ message: "Failed to report bug" });
  }
});

app.get("/bug-reports", async (req, res) => {
  try {
    if (!db) throw new Error("Database not ready");
    res.json(await db.all("SELECT * FROM bug_reports ORDER BY id DESC"));
  } catch (e) {
    res.status(500).json({ message: "Error fetching reports" });
  }
});

app.delete("/admin/badges/:id", authenticateToken, verifyMod, async (req, res) => {
    const { id } = req.params;
    try {
        // Удаляем сам бейдж
        await db.run("DELETE FROM badges WHERE id = ?", [id]);
        // Удаляем связи этого бейджа с пользователями
        await db.run("DELETE FROM user_badges WHERE badge_id = ?", [id]);
        res.json({ status: "ok" });
    } catch (e) {
        res.status(500).json({ error: e.message });
    }
});

app.post("/resolve-bug", async (req, res) => {
  try {
    const { id } = req.body;
    await db.run("UPDATE bug_reports SET status = 'resolved' WHERE id = ?", [id]);
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

app.get("/vapid-key", (req, res) => {
  res.json({ publicKey: vapidKeys.publicKey });
});

app.post("/subscribe", async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader) return res.status(401).json({ message: "No token" });
  try {
    const token = authHeader.split(" ")[1];
    const decoded = jwt.verify(token, JWT_SECRET);
    const username = decoded.username;
    const subscription = req.body;
    if (!db || !subscription || !subscription.endpoint) return res.status(400).json({ message: "Bad request" });
    const subStr = JSON.stringify(subscription);
    const existing = await db.get("SELECT id FROM push_subscriptions WHERE username=? AND subscription=?", [username, subStr]);
    if (!existing) {
      await db.run("INSERT INTO push_subscriptions (username, subscription) VALUES (?, ?)", [username, subStr]);
    }
    res.json({ status: "ok" });
  } catch (e) {
    res.status(401).json({ message: "Invalid token or error" });
  }
});

async function sendWebPush(username, payload) {
  if (!db) return;
  const pref = await db.get("SELECT notifications_enabled FROM user_profiles WHERE username = ?", [username]);
  if (pref && pref.notifications_enabled === 0) return;
  const subs = await db.all("SELECT * FROM push_subscriptions WHERE username = ?", [username]);
  for (const subRecord of subs) {
    try {
      const sub = JSON.parse(subRecord.subscription);
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.run("DELETE FROM push_subscriptions WHERE id = ?", [subRecord.id]);
      }
    }
  }
}

// --- SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = [];
// Карта для Slow Mode: { room_username: lastMessageTimestamp }
const lastMessageTimes = new Map();

async function getListsData(username) {
  if (!db) return { friends: [], groups: [] };
  const friendsData = await db.all(`SELECT u.username, p.avatar_url FROM user_profiles p JOIN (SELECT user_2 as username FROM friends WHERE user_1 = ? UNION SELECT user_1 as username FROM friends WHERE user_2 = ?) u ON u.username = p.username`, [username, username]);
  const groups = await db.all(`SELECT room FROM group_members WHERE username = ?`, [username]);
  return { friends: friendsData, groups: groups.map((g) => g.room) };
}

async function pushUpdatesToUser(username) {
  const target = onlineUsers.find((u) => u.username === username);
  if (target) {
    const data = await getListsData(username);
    io.to(target.socketId).emit("friends_list", data.friends);
    io.to(target.socketId).emit("user_groups", data.groups);
  }
}

async function getTotalUsers() {
  if (!db) return 0;
  const res = await db.get("SELECT COUNT(*) as count FROM users");
  return res ? res.count : 0;
}

async function isBlocked(t, s) {
  if (!db) return false;
  return !!(await db.get(`SELECT * FROM blocked_users WHERE blocker=? AND blocked=?`, [t, s]));
}

async function getUserBadges(username) {
    if (!db) return [];
    const badges = await db.all(`
        SELECT b.svg_content, b.name 
        FROM user_badges ub 
        JOIN badges b ON ub.badge_id = b.id 
        WHERE ub.username = ?`, [username]);
    return badges;
}

async function getProfileInfo(username) {
    if(!db) return { display_name: username };
    const p = await db.get("SELECT display_name FROM user_profiles WHERE username = ?", [username]);
    return { display_name: (p && p.display_name) ? p.display_name : username };
}

async function attachProfileInfo(messages) {
    if (!db) return messages;
    const result = [];
    for (const msg of messages) {
        const profile = await getProfileInfo(msg.author);
        const badges = await getUserBadges(msg.author);
        result.push({
            ...msg,
            author_display_name: profile.display_name,
            author_badges: badges
        });
    }
    return result;
}

async function sendNotification(toUser, type, content, dataStr = "") {
  if (!db) return;
  const pref = await db.get("SELECT notifications_enabled FROM user_profiles WHERE username = ?", [toUser]);
  if (pref && pref.notifications_enabled === 0) return;
  const res = await db.run("INSERT INTO notifications (user_to, type, content, data) VALUES (?, ?, ?, ?)", [toUser, type, content, dataStr]);
  const targetSocket = onlineUsers.find((u) => u.username === toUser);
  if (targetSocket) {
    io.to(targetSocket.socketId).emit("new_notification", { id: res.lastID, user_to: toUser, type, content, data: dataStr, is_read: 0, created_at: new Date() });
  } else {
    let title = "Connect";
    if (type === "friend_request") title = "Заявка в друзья";
    if (type === "mention") title = "Вас упомянули";
    if (type === "dm") title = "Новое сообщение";
    let room = null;
    if (type === "mention") room = dataStr;
    await sendWebPush(toUser, { title: title, body: content, tag: type, room: room, data: { room: room } });
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.data.username = user.username;
    socket.data.role = user.role; // 'mod' or 'member'
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket) => {
  const username = socket.data.username;
  console.log(`Connect: ${socket.id} (${username})`);
  
  // Получаем актуальную роль из БД
  const dbUser = await db.get("SELECT global_role FROM users WHERE username=?", [username]);
  const globalRole = dbUser ? dbUser.global_role : 'member';
  
  socket.join(username);
  onlineUsers = onlineUsers.filter((u) => u.username !== username);
  onlineUsers.push({ socketId: socket.id, username: username });

  if (db) {
    await db.run(`INSERT OR IGNORE INTO user_profiles (username, display_name) VALUES (?, ?)`, [username, username]);
    const lists = await getListsData(username);
    socket.emit("friends_list", lists.friends);
    socket.emit("user_groups", lists.groups);
    socket.emit("total_users", await getTotalUsers());
    socket.emit("global_role", globalRole);
    try { socket.emit("notification_history", await db.all("SELECT * FROM notifications WHERE user_to = ? ORDER BY id DESC LIMIT 50", [username])); } catch (e) {}
  }

  socket.on("get_initial_data", async () => {
    if (username && db) {
      const lists = await getListsData(username);
      socket.emit("friends_list", lists.friends);
      socket.emit("user_groups", lists.groups);
      socket.emit("total_users", await getTotalUsers());
      socket.emit("global_role", globalRole);
    }
  });

  socket.on("join_room", async ({ room }) => {
    if (!db) return;
    
    let canJoin = false;

    if (globalRole === 'mod') {
        canJoin = true;
    } else if (room.includes("_")) {
        const users = room.split("_");
        if (users.includes(username)) canJoin = true;
    } else if (room !== "General") {
        const member = await db.get("SELECT * FROM group_members WHERE room = ? AND username = ?", [room, username]);
        if (member) {
            canJoin = true;
        } else {
             // Проверка на публичность группы
             const settings = await db.get("SELECT is_private FROM group_settings WHERE room = ?", [room]);
             // Если нет настроек, считаем публичной (для обратной совместимости или дефолт 0)
             if (!settings || settings.is_private === 0) {
                 // Авто-вход в публичную группу
                 await db.run("INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')", [room, username]);
                 canJoin = true;
             }
        }
    } else {
        canJoin = true; // General открыт
    }

    if (!canJoin) return socket.emit("error_message", { msg: "Доступ запрещен. Группа приватная." });

    Array.from(socket.rooms).forEach((r) => { if (r !== socket.id && r !== username) socket.leave(r); });
    socket.join(room);
    
    let msgs = await db.all("SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30", [room]);
    // Enrich with display names and badges
    msgs = await attachProfileInfo(msgs.reverse());

    socket.emit("chat_history", msgs);

    // Send Room Settings & My Role
    if (!room.includes("_")) {
        const settings = await db.get("SELECT * FROM group_settings WHERE room=?", [room]);
        const myMember = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [room, username]);
        
        let effectiveRole = 'guest';
        if (globalRole === 'mod') effectiveRole = 'owner'; // Mod acts as owner
        else if (myMember) effectiveRole = myMember.role;

        socket.emit("room_settings", { 
            ...(settings || { is_private: 0, slow_mode: 0, avatar_url: '' }), 
            myRole: effectiveRole
        });
    }

    // Wallpaper
    const wp = await db.get("SELECT settings FROM chat_wallpapers WHERE username=? AND room=?", [username, room]);
    if (wp) socket.emit("wallpaper_data", JSON.parse(wp.settings));
    else socket.emit("wallpaper_data", null);
  });

  socket.on("save_wallpaper", async ({ room, settings }) => {
      if (!db) return;
      const settingsStr = JSON.stringify(settings);
      await db.run(`INSERT INTO chat_wallpapers (username, room, settings) VALUES (?, ?, ?) 
                    ON CONFLICT(username, room) DO UPDATE SET settings=excluded.settings`, 
                    [username, room, settingsStr]);
      socket.emit("wallpaper_saved", settings);
      socket.emit("wallpaper_data", settings);
  });

  socket.on("load_more_messages", async ({ room, offset }) => {
    if (!db) return;
    let msgs = await db.all("SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30 OFFSET ?", [room, offset]);
    msgs = await attachProfileInfo(msgs.reverse());
    socket.emit(msgs.length ? "more_messages_loaded" : "no_more_messages", msgs);
  });

  socket.on("send_message", async (data, callback) => {
    if (!db) return;
    const author = socket.data.username;
    
    // Slow Mode Check
    if (!data.room.includes("_")) {
        const settings = await db.get("SELECT slow_mode FROM group_settings WHERE room=?", [data.room]);
        if (settings && settings.slow_mode > 0 && globalRole !== 'mod') {
             // Check if user is owner/mod of chat
             const member = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [data.room, author]);
             if (member?.role !== 'owner' && member?.role !== 'editor') {
                 const key = `${data.room}_${username}`;
                 const lastTime = lastMessageTimes.get(key) || 0;
                 const now = Date.now();
                 if (now - lastTime < settings.slow_mode * 1000) {
                     const wait = Math.ceil((settings.slow_mode * 1000 - (now - lastTime)) / 1000);
                     return socket.emit("error_message", { msg: `Slow mode: подождите ${wait} сек.` });
                 }
                 lastMessageTimes.set(key, now);
             }
        }
    }

    if (data.room.includes("_")) {
      const target = data.room.split("_").find((u) => u !== author);
      if (target && (await isBlocked(target, author))) return socket.emit("error_message", { msg: "Blocked" });
    }
    
    const res = await db.run("INSERT INTO messages (room, author, message, type, time, reply_to_id, reply_to_author, reply_to_message) VALUES (?,?,?,?,?,?,?,?)", [data.room, author, data.message, data.type || "text", data.time, data.replyTo?.id, data.replyTo?.author, data.replyTo?.message]);
    
    // Получаем бейджи и Display Name автора для отображения
    const badges = await getUserBadges(author);
    const profile = await getProfileInfo(author);

    const broadcastMessage = { 
        id: res.lastID, 
        room: data.room, 
        author: author,
        author_display_name: profile.display_name,
        message: data.message, 
        type: data.type || "text", 
        time: data.time, 
        reply_to_id: data.replyTo?.id || null, 
        reply_to_author: data.replyTo?.author || null, 
        reply_to_message: data.replyTo?.message || null, 
        tempId: data.tempId,
        author_badges: badges 
    };
    
    io.to(data.room).emit("receive_message", broadcastMessage);
    if (callback) callback({ status: "ok", id: res.lastID });

    if (data.room.includes("_")) {
      const parts = data.room.split("_");
      const recipient = parts.find((u) => u !== author);
      if (recipient) {
        const authorProfile = await db.get("SELECT avatar_url FROM user_profiles WHERE username=?", [author]);
        const recipientSocket = onlineUsers.find((u) => u.username === recipient);
        const bodyText = data.type === "text" ? data.message : "📎 Вложение";
        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit("dm_notification", { author: author, message: bodyText, room: data.room, avatar: authorProfile?.avatar_url });
        } else {
          await sendWebPush(recipient, { title: author, body: bodyText, tag: `dm-${data.room}`, room: data.room, data: { room: data.room } });
        }
      }
    }
    
    const mentionRegex = /@(\w+)/g;
    let match;
    const uniqueMentions = new Set();
    while ((match = mentionRegex.exec(data.message)) !== null) uniqueMentions.add(match[1]);
    for (const mentionedUser of uniqueMentions) {
      const userExists = await db.get("SELECT id FROM users WHERE username = ?", [mentionedUser]);
      if (userExists && mentionedUser !== author) {
        let isInRoom = data.room === "General";
        if (!isInRoom && data.room.includes("_") && data.room.includes(mentionedUser)) isInRoom = true;
        else if (!isInRoom) {
          const member = await db.get("SELECT * FROM group_members WHERE room = ? AND username = ?", [data.room, mentionedUser]);
          if (member) isInRoom = true;
        }
        if (isInRoom) await sendNotification(mentionedUser, "mention", `${author} упомянул вас в ${data.room}`, data.room);
      }
    }
  });

  socket.on("create_group", async ({ room }) => {
    if (!db) return;
    await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'owner')`, [room, username]);
    // Дефолтные настройки
    await db.run(`INSERT INTO group_settings (room, is_private, slow_mode) VALUES (?, 0, 0)`, [room]);
    socket.emit("group_created", { room });
    await pushUpdatesToUser(username);
  });

  socket.on("join_existing_group", async ({ room }) => {
    if (!db) return;
    // Check if private
    const settings = await db.get("SELECT is_private FROM group_settings WHERE room=?", [room]);
    if (settings && settings.is_private === 1 && globalRole !== 'mod') {
         return socket.emit("error_message", { msg: "Это приватная группа" });
    }

    if (!(await db.get(`SELECT * FROM group_members WHERE room=? AND username=?`, [room, username]))) {
      await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`, [room, username]);
    }
    socket.emit("group_joined", { room });
    await pushUpdatesToUser(username);
  });

  socket.on("leave_group", async ({ room }) => {
    if (!db) return;
    const role = (await db.get(`SELECT role FROM group_members WHERE room=? AND username=?`, [room, username]))?.role;
    if (role === "owner" && room !== "General") {
      await db.run(`DELETE FROM group_members WHERE room=?`, [room]);
      await db.run(`DELETE FROM messages WHERE room=?`, [room]);
      await db.run(`DELETE FROM group_settings WHERE room=?`, [room]);
      io.to(room).emit("group_deleted", { room });
    } else {
      await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [room, username]);
      io.to(room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]) });
      socket.emit("left_group_success", { room });
      await pushUpdatesToUser(username);
    }
  });

  socket.on("add_group_member", async ({ room, username: targetUser }) => {
    if (!db) return;
    // Check permissions (Owner/Editor/Mod)
    const actor = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [room, username]);
    if (globalRole !== 'mod' && (!actor || (actor.role !== 'owner' && actor.role !== 'editor'))) {
        return socket.emit("error_message", { msg: "Нет прав для добавления" });
    }

    if (!(await db.get(`SELECT * FROM group_members WHERE room=? AND username=?`, [room, targetUser]))) {
      await db.run(`INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`, [room, targetUser]);
      io.to(room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]) });
      await pushUpdatesToUser(targetUser);
    }
  });

  socket.on("remove_group_member", async ({ room, username: targetUser }) => {
    if (!db) return;
    // Check permissions
    const actor = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [room, username]);
    if (globalRole !== 'mod' && (!actor || actor.role !== 'owner')) {
        return socket.emit("error_message", { msg: "Нет прав" });
    }
    await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [room, targetUser]);
    io.to(room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]) });
    await pushUpdatesToUser(targetUser);
  });

  // --- NEW CHAT SETTINGS & ROLES MANAGEMENT ---

  socket.on("update_group_settings", async (data) => {
        // data: { room, is_private, slow_mode, avatar_url }
        const member = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [data.room, username]);
        if (globalRole !== 'mod' && member?.role !== 'owner') return socket.emit("error_message", { msg: "Нет прав" });

        await db.run(`INSERT INTO group_settings (room, is_private, slow_mode, avatar_url) VALUES (?, ?, ?, ?)
            ON CONFLICT(room) DO UPDATE SET is_private=excluded.is_private, slow_mode=excluded.slow_mode, avatar_url=excluded.avatar_url`,
            [data.room, data.is_private ? 1 : 0, data.slow_mode, data.avatar_url]);
        
        io.to(data.room).emit("room_settings_updated", data);
  });

  socket.on("assign_chat_role", async ({ room, targetUsername, newRole }) => {
        // newRole: 'owner', 'editor', 'member', 'kick'
        const actor = await db.get("SELECT role FROM group_members WHERE room=? AND username=?", [room, username]);
        if (globalRole !== 'mod' && actor?.role !== 'owner') return socket.emit("error_message", {msg: "Нет прав"});

        if (newRole === 'kick') {
            await db.run("DELETE FROM group_members WHERE room=? AND username=?", [room, targetUsername]);
            io.to(room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]) });
            await pushUpdatesToUser(targetUsername);
        } else {
            await db.run("UPDATE group_members SET role=? WHERE room=? AND username=?", [newRole, room, targetUsername]);
            io.to(room).emit("group_info_updated", { members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]) });
        }
  });

  socket.on("typing", (d) => socket.to(d.room).emit("display_typing", { username: username, room: d.room }));
  
  socket.on("search_groups", async (q) => {
    try {
      if (!db) return socket.emit("search_groups_results", []);
      // Show only public groups in search
      const groups = await db.all(`
          SELECT DISTINCT gm.room 
          FROM group_members gm 
          LEFT JOIN group_settings gs ON gm.room = gs.room
          WHERE lower(gm.room) LIKE lower(?) 
          AND (gs.is_private IS NULL OR gs.is_private = 0)
          LIMIT 20`, [`%${q}%`]);
      socket.emit("search_groups_results", groups);
    } catch (e) {
      socket.emit("search_groups_results", []);
    }
  });

  socket.on("search_users", async (q) => {
    try {
      if (!db) return socket.emit("search_results", []);
      const dbUsers = await db.all(`SELECT u.username, p.display_name, p.avatar_url FROM users u LEFT JOIN user_profiles p ON u.username = p.username WHERE u.username LIKE ? OR p.display_name LIKE ? LIMIT 20`, [`%${q}%`, `%${q}%`]);
      const results = dbUsers.map((user) => {
        const onlineUser = onlineUsers.find((u) => u.username === user.username);
        return { username: user.username, display_name: user.display_name || user.username, avatar_url: user.avatar_url, socketId: onlineUser ? onlineUser.socketId : null, isOnline: !!onlineUser };
      });
      socket.emit("search_results", results);
    } catch (e) {
      socket.emit("search_results", []);
    }
  });

  socket.on("get_group_info", async (room) => {
    if (!db) return;
    const members = await db.all(`SELECT gm.*, up.avatar_url, up.display_name FROM group_members gm LEFT JOIN user_profiles up ON gm.username = up.username WHERE gm.room=?`, [room]);
    
    // Attach badges to members
    for(let m of members) {
        m.badges = await getUserBadges(m.username);
    }
    
    // Determine role considering global mod
    let myRole = "guest";
    if (globalRole === 'mod') {
        myRole = "owner"; // Admins see owner view
    } else {
        const me = members.find((m) => m.username === username);
        if (me) myRole = me.role;
    }

    socket.emit("group_info_data", { room, members, myRole });
  });

  socket.on("get_my_profile", async (u) => {
    if (db) {
      let data = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]);
      if (!data) {
        data = { username: u, display_name: u, bio: "", phone: "", avatar_url: "", notifications_enabled: 1 };
        await db.run(`INSERT OR IGNORE INTO user_profiles (username, display_name) VALUES (?, ?)`, [u, u]);
      }
      if (!data.display_name) data.display_name = u;
      socket.emit("my_profile_data", data);
    }
  });

  socket.on("update_profile", async (d) => {
    if (!db) return;
    if (d.newUsername && d.newUsername !== username) {
      const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
      if (!usernameRegex.test(d.newUsername)) return socket.emit("error_message", { msg: "Nametag может содержать только латинские буквы (a-Z) и цифры (0-9), минимум 3 символа." });
      try {
        const exists = await db.get("SELECT id FROM users WHERE username = ?", [d.newUsername]);
        if (exists) return socket.emit("error_message", { msg: "Это имя пользователя (@nametag) уже занято." });
        await db.run("BEGIN TRANSACTION");
        await db.run("UPDATE users SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE messages SET author = ? WHERE author = ?", [d.newUsername, username]);
        await db.run("UPDATE messages SET reply_to_author = ? WHERE reply_to_author = ?", [d.newUsername, username]);
        await db.run("UPDATE friends SET user_1 = ? WHERE user_1 = ?", [d.newUsername, username]);
        await db.run("UPDATE friends SET user_2 = ? WHERE user_2 = ?", [d.newUsername, username]);
        await db.run("UPDATE group_members SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE user_profiles SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE blocked_users SET blocker = ? WHERE blocker = ?", [d.newUsername, username]);
        await db.run("UPDATE blocked_users SET blocked = ? WHERE blocked = ?", [d.newUsername, username]);
        await db.run("UPDATE user_avatars SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE notifications SET user_to = ? WHERE user_to = ?", [d.newUsername, username]);
        await db.run("UPDATE chat_wallpapers SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE push_subscriptions SET username = ? WHERE username = ?", [d.newUsername, username]);
        await db.run("UPDATE user_badges SET username = ? WHERE username = ?", [d.newUsername, username]);
        
        const involvedRooms = await db.all("SELECT DISTINCT room FROM messages WHERE room LIKE ? OR room LIKE ?", [`${username}_%`, `%_${username}`]);
        for (const row of involvedRooms) {
          const parts = row.room.split("_");
          if (parts.length === 2 && (parts[0] === username || parts[1] === username)) {
            const otherUser = parts[0] === username ? parts[1] : parts[0];
            const newRoomName = [d.newUsername, otherUser].sort().join("_");
            await db.run("UPDATE messages SET room = ? WHERE room = ?", [newRoomName, row.room]);
          }
        }
        await db.run("COMMIT");
        socket.emit("force_logout", { msg: "Ваш @nametag изменен. Пожалуйста, войдите снова." });
        return;
      } catch (err) {
        await db.run("ROLLBACK");
        console.error(err);
        return socket.emit("error_message", { msg: "Ошибка при смене @nametag." });
      }
    }
    await db.run(`UPDATE user_profiles SET bio=?, phone=?, display_name=?, notifications_enabled=? WHERE username=?`, [d.bio, d.phone, d.display_name, d.notifications_enabled ? 1 : 0, username]);
    socket.emit("my_profile_data", await db.get(`SELECT * FROM user_profiles WHERE username=?`, [username]));
  });

  socket.on("get_user_profile", async (u) => {
    if (!db) return;
    const p = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]);
    const f = await db.get(`SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [username, u, u, username]);
    const badges = await getUserBadges(u);
    const userRec = await db.get("SELECT global_role FROM users WHERE username=?", [u]);
    
    socket.emit("user_profile_data", { 
        ...(p || { username: u, display_name: u }), 
        isFriend: !!f, 
        badges, 
        isGlobalMod: userRec?.global_role === 'mod' 
    });
  });

  socket.on("get_avatar_history", async (u) => {
    if (db) socket.emit("avatar_history_data", await db.all(`SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`, [u]));
  });

  socket.on("delete_avatar", async ({ avatarId }) => {
    if (!db) return;
    await db.run("DELETE FROM user_avatars WHERE id=?", [avatarId]);
    const last = await db.get("SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC LIMIT 1", [username]);
    await db.run("UPDATE user_profiles SET avatar_url=? WHERE username=?", [last?.avatar_url || "", username]);
    socket.emit("my_profile_data", await db.get(`SELECT * FROM user_profiles WHERE username=?`, [username]));
    socket.emit("avatar_history_data", await db.all(`SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`, [username]));
  });

  socket.on("send_friend_request_by_name", async ({ toUsername }) => {
    if (!db || toUsername === username) return;
    const isFriend = await db.get(`SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [username, toUsername, toUsername, username]);
    if (isFriend) return;
    const exists = await db.get(`SELECT * FROM notifications WHERE user_to=? AND type='friend_request' AND content=?`, [toUsername, username]);
    if (exists) return;
    await sendNotification(toUsername, "friend_request", username);
  });

  socket.on("mark_notification_read", async ({ id }) => {
    if (db) await db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  });

  socket.on("delete_notification", async ({ id }) => {
    if (db) await db.run("DELETE FROM notifications WHERE id = ?", [id]);
  });

  socket.on("accept_friend_request", async ({ notifId, fromUsername }) => {
    if (!db || !fromUsername) return;
    const u1 = fromUsername;
    const u2 = username;
    await db.run("INSERT INTO friends (user_1, user_2) VALUES (?, ?)", [u1, u2]);
    if (notifId) await db.run("DELETE FROM notifications WHERE id=?", [notifId]);
    await pushUpdatesToUser(u1);
    await pushUpdatesToUser(u2);
    await sendNotification(u1, "info", `${u2} принял вашу заявку`);
  });

  socket.on("decline_friend_request", async ({ notifId }) => {
    if (db && notifId) await db.run("DELETE FROM notifications WHERE id=?", [notifId]);
  });

  socket.on("remove_friend", async (t) => {
    if (!db) return;
    await db.run(`DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [username, t, t, username]);
    await pushUpdatesToUser(username);
    await pushUpdatesToUser(t);
  });

  socket.on("block_user", async (t) => {
    if (!db) return;
    await db.run(`INSERT OR IGNORE INTO blocked_users (blocker, blocked) VALUES (?, ?)`, [username, t]);
    await db.run(`DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`, [username, t, t, username]);
    await pushUpdatesToUser(username);
    await pushUpdatesToUser(t);
  });

  socket.on("delete_message", async (id) => {
    if (!db) return;
    const msg = await db.get("SELECT * FROM messages WHERE id=?", [id]);
    if (!msg) return;
    
    let canDelete = false;
    // Автор
    if (msg.author === username) canDelete = true;
    
    // Глобальный Мод
    if (globalRole === 'mod') canDelete = true;

    // Владелец или Редактор Группы
    if (!canDelete && !msg.room.includes("_")) {
      const membership = await db.get("SELECT role FROM group_members WHERE room = ? AND username = ?", [msg.room, username]);
      if (membership && (membership.role === "owner" || membership.role === "editor")) {
        canDelete = true;
      }
    }

    if (canDelete) {
      await db.run("DELETE FROM messages WHERE id=?", [id]);
      io.to(msg.room).emit("message_deleted", id);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
  });
});

server.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));