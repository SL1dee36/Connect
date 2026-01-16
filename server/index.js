const express = require("express");
const app = express();
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

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 минут
  max: 3, // макс 10 попыток с одного IP
  message: "Слишком много попыток входа"
});

const apiLimiter = rateLimit({
  windowMs: 2 * 60 * 1000,
  max: 400
});

app.use("/login", authLimiter);
app.use("/register", authLimiter);
app.use("/", apiLimiter);

const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

// --- НАСТРОЙКА БЕЗОПАСНОСТИ (CORS) ---
// Список доменов, которым разрешен доступ к бэкенду
const allowedOrigins = [
  "http://localhost:5173", // Локальная разработка
  "http://localhost:3000", // Альтернативный порт локалки
  "https://connect-apollo.vercel.app", // Ваш продакшн на Vercel
  // "https://www.connect-apollo.vercel.app",
];

const corsOptions = {
  origin: function (origin, callback) {
    // Разрешаем запросы без origin (например, мобильные приложения или curl)
    if (!origin) return callback(null, true);

    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      console.log("Blocked by CORS:", origin);
      callback(new Error("Not allowed by CORS"));
    }
  },
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  credentials: true, // Разрешаем куки и заголовки авторизации
  allowedHeaders: ["Content-Type", "Authorization"],
};

// Применяем настройки CORS к Express
app.use(cors(corsOptions));

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

app.use(express.json());
app.use("/uploads", express.static(uploadDir));
// app.use(helmet({
//   crossOriginResourcePolicy: { policy: "cross-origin" } // Разрешаем загрузку картинок
// }));

let db;

// --- DB INIT ---
async function initDB() {
  const dbPath = path.join(dataDir, "database.db");
  db = await open({ filename: dbPath, driver: sqlite3.Database });

  await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, author TEXT, message TEXT, type TEXT DEFAULT 'text', time TEXT);
        CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, user_1 TEXT, user_2 TEXT);
        CREATE TABLE IF NOT EXISTS group_members (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, username TEXT, role TEXT DEFAULT 'member', custom_title TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS user_profiles (username TEXT PRIMARY KEY, bio TEXT DEFAULT '', phone TEXT DEFAULT '', avatar_url TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY AUTOINCREMENT, blocker TEXT, blocked TEXT);
        CREATE TABLE IF NOT EXISTS user_avatars (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, avatar_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (username) REFERENCES user_profiles(username) ON DELETE CASCADE);
        CREATE TABLE IF NOT EXISTS notifications (id INTEGER PRIMARY KEY AUTOINCREMENT, user_to TEXT, type TEXT, content TEXT, data TEXT, is_read BOOLEAN DEFAULT 0, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS bug_reports (id INTEGER PRIMARY KEY AUTOINCREMENT, reporter TEXT, description TEXT, media_urls TEXT, status TEXT DEFAULT 'open', created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subscription TEXT); 
    `);

  const safeRun = async (query) => {
    try {
      await db.exec(query);
    } catch (e) {}
  };
  await safeRun(`ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_id INTEGER`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_author TEXT`);
  await safeRun(`ALTER TABLE messages ADD COLUMN reply_to_message TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN user_to TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN type TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN content TEXT`);
  await safeRun(`ALTER TABLE notifications ADD COLUMN data TEXT`);
  await safeRun(
    `ALTER TABLE notifications ADD COLUMN is_read BOOLEAN DEFAULT 0`
  );
  await safeRun(
    `ALTER TABLE notifications ADD COLUMN created_at DATETIME DEFAULT CURRENT_TIMESTAMP`
  );
  await safeRun(
    `ALTER TABLE user_profiles ADD COLUMN display_name TEXT DEFAULT ''`
  );
  await safeRun(
    `ALTER TABLE user_profiles ADD COLUMN notifications_enabled BOOLEAN DEFAULT 1`
  );
  await safeRun(
    `CREATE TABLE IF NOT EXISTS push_subscriptions (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, subscription TEXT)`
  );

  try {
    await db.run(
      `INSERT INTO group_members (room, username, role) SELECT 'General', username, 'member' FROM users WHERE username NOT IN (SELECT username FROM group_members WHERE room = 'General')`
    );
  } catch (e) {}
  try {
    await db.run(
      "UPDATE group_members SET role = 'owner' WHERE username = 'slide36' AND room = 'General'"
    );
  } catch (e) {}

  console.log("Database connected & Schema synced");
}
initDB();

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;

// --- ROUTES ---
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Required fields missing" });
  try {
    if (!db) throw new Error("Database not ready");
    const existing = await db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (existing) return res.status(409).json({ message: "User exists" });
    const hash = await bcrypt.hash(password, 10);
    await db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
      username,
      hash,
    ]);
    await db.run(
      "INSERT INTO user_profiles (username, display_name) VALUES (?, ?)",
      [username, username]
    );
    const user = await db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({ token });
    await db.run(
      "INSERT INTO group_members (room, username, role) VALUES ('General', ?, 'member')",
      [username]
    );
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
    if (!db) throw new Error("Database not ready");
    const user = await db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (!user || !(await bcrypt.compare(password, user.password_hash)))
      return res.status(401).json({ message: "Invalid credentials" });
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.json({ token });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

const upload = multer({ storage: multer.memoryStorage() });
const processImage = async (buf) => {
  const name = Date.now() + "-" + Math.round(Math.random() * 1e9) + ".webp";
  await sharp(buf)
    .resize(1280, 1280, { fit: "inside" })
    .webp()
    .toFile(path.join(uploadDir, name));
  return `${BACKEND_URL}/uploads/${name}`;
};

app.post("/upload", upload.single("file"), async (req, res) => {
  if (!req.file) return res.status(400).json({ message: "No file" });
  try {
    const url = req.file.mimetype.startsWith("image/")
      ? await processImage(req.file.buffer)
      : `${BACKEND_URL}/uploads/${Date.now()}.webm`;
    if (!req.file.mimetype.startsWith("image/"))
      fs.writeFileSync(
        path.join(uploadDir, path.basename(url)),
        req.file.buffer
      );
    res.json({ url });
  } catch (e) {
    res.status(500).json({ message: "Upload failed" });
  }
});

app.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  if (!req.files) return res.status(400).json({ message: "No files" });
  try {
    const urls = await Promise.all(
      req.files.map((f) => processImage(f.buffer))
    );
    res.json({ urls });
  } catch (e) {
    res.status(500).json({ message: "Upload failed" });
  }
});

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
  try {
    if (!db) throw new Error("Database not ready");
    const url = await processImage(req.file.buffer);
    await db.run(
      "INSERT INTO user_avatars (username, avatar_url) VALUES (?, ?)",
      [req.body.username, url]
    );
    await db.run("UPDATE user_profiles SET avatar_url = ? WHERE username = ?", [
      url,
      req.body.username,
    ]);
    res.json({
      profile: await db.get("SELECT * FROM user_profiles WHERE username = ?", [
        req.body.username,
      ]),
    });
  } catch (e) {
    res.status(500).json({ message: "Avatar upload failed" });
  }
});

app.post("/report-bug", upload.array("files", 5), async (req, res) => {
  try {
    if (!db) throw new Error("Database not ready");
    const { description, reporter } = req.body;
    let mediaUrls = [];
    if (req.files && req.files.length > 0)
      mediaUrls = await Promise.all(
        req.files.map((f) => processImage(f.buffer))
      );
    await db.run(
      "INSERT INTO bug_reports (reporter, description, media_urls) VALUES (?, ?, ?)",
      [reporter, description, JSON.stringify(mediaUrls)]
    );
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

app.post("/resolve-bug", async (req, res) => {
  try {
    const { id } = req.body;
    await db.run("UPDATE bug_reports SET status = 'resolved' WHERE id = ?", [
      id,
    ]);
    res.json({ status: "ok" });
  } catch (e) {
    res.status(500).json({ error: "Error" });
  }
});

// --- PUSH ROUTES ---
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

    if (!db || !subscription || !subscription.endpoint)
      return res.status(400).json({ message: "Bad request" });

    const subStr = JSON.stringify(subscription);
    const existing = await db.get(
      "SELECT id FROM push_subscriptions WHERE username=? AND subscription=?",
      [username, subStr]
    );
    if (!existing) {
      await db.run(
        "INSERT INTO push_subscriptions (username, subscription) VALUES (?, ?)",
        [username, subStr]
      );
    }
    res.json({ status: "ok" });
  } catch (e) {
    console.error(e);
    res.status(401).json({ message: "Invalid token or error" });
  }
});

async function sendWebPush(username, payload) {
  if (!db) return;
  const pref = await db.get(
    "SELECT notifications_enabled FROM user_profiles WHERE username = ?",
    [username]
  );
  if (pref && pref.notifications_enabled === 0) return;

  const subs = await db.all(
    "SELECT * FROM push_subscriptions WHERE username = ?",
    [username]
  );
  for (const subRecord of subs) {
    try {
      const sub = JSON.parse(subRecord.subscription);
      await webpush.sendNotification(sub, JSON.stringify(payload));
    } catch (error) {
      if (error.statusCode === 410 || error.statusCode === 404) {
        await db.run("DELETE FROM push_subscriptions WHERE id = ?", [
          subRecord.id,
        ]);
      } else {
        console.error(`Push Error for ${username}:`, error.message);
      }
    }
  }
}

// --- SOCKET.IO ---
const server = http.createServer(app);

// Применяем те же настройки CORS для Socket.io
const io = new Server(server, {
  cors: {
    origin: allowedOrigins,
    methods: ["GET", "POST"],
    credentials: true,
  },
});

let onlineUsers = [];

async function getListsData(username) {
  if (!db) return { friends: [], groups: [] };
  const friendsData = await db.all(
    `SELECT u.username, p.avatar_url FROM user_profiles p JOIN (SELECT user_2 as username FROM friends WHERE user_1 = ? UNION SELECT user_1 as username FROM friends WHERE user_2 = ?) u ON u.username = p.username`,
    [username, username]
  );
  const groups = await db.all(
    `SELECT room FROM group_members WHERE username = ?`,
    [username]
  );
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
  return !!(await db.get(
    `SELECT * FROM blocked_users WHERE blocker=? AND blocked=?`,
    [t, s]
  ));
}

async function sendNotification(toUser, type, content, dataStr = "") {
  if (!db) return;
  const pref = await db.get(
    "SELECT notifications_enabled FROM user_profiles WHERE username = ?",
    [toUser]
  );
  if (pref && pref.notifications_enabled === 0) return;

  const res = await db.run(
    "INSERT INTO notifications (user_to, type, content, data) VALUES (?, ?, ?, ?)",
    [toUser, type, content, dataStr]
  );
  const targetSocket = onlineUsers.find((u) => u.username === toUser);

  if (targetSocket) {
    io.to(targetSocket.socketId).emit("new_notification", {
      id: res.lastID,
      user_to: toUser,
      type,
      content,
      data: dataStr,
      is_read: 0,
      created_at: new Date(),
    });
  } else {
    let title = "Connect";
    if (type === "friend_request") title = "Заявка в друзья";
    if (type === "mention") title = "Вас упомянули";
    if (type === "dm") title = "Новое сообщение";

    let room = null;
    if (type === "mention") room = dataStr;

    await sendWebPush(toUser, {
      title: title,
      body: content,
      tag: type,
      room: room,
      data: { room: room },
    });
  }
}

io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) return next(new Error("Authentication error"));
  try {
    const user = jwt.verify(token, JWT_SECRET);
    socket.data.username = user.username;
    next();
  } catch (err) {
    next(new Error("Authentication error"));
  }
});

io.on("connection", async (socket) => {
  const username = socket.data.username;
  console.log(`Connect: ${socket.id} (${username})`);

  socket.join(username);

  onlineUsers = onlineUsers.filter((u) => u.username !== username);
  onlineUsers.push({ socketId: socket.id, username: username });

  if (db) {
    await db.run(
      `INSERT OR IGNORE INTO user_profiles (username, display_name) VALUES (?, ?)`,
      [username, username]
    );
    const lists = await getListsData(username);
    socket.emit("friends_list", lists.friends);
    socket.emit("user_groups", lists.groups);
    socket.emit("total_users", await getTotalUsers());
    try {
      socket.emit(
        "notification_history",
        await db.all(
          "SELECT * FROM notifications WHERE user_to = ? ORDER BY id DESC LIMIT 50",
          [username]
        )
      );
    } catch (e) {}
  }

  socket.on("get_initial_data", async () => {
    if (username && db) {
      const lists = await getListsData(username);
      socket.emit("friends_list", lists.friends);
      socket.emit("user_groups", lists.groups);
      socket.emit("total_users", await getTotalUsers());
    }
  });

  socket.on("join_room", async ({ room }) => {
    if (!db) return;

    // 1. Проверка прав доступа к приватным чатам (user1_user2)
    if (room.includes("_")) {
        const users = room.split("_");
        // Если имя текущего пользователя не входит в название комнаты — блокируем
        if (!users.includes(username)) {
            socket.emit("error_message", { msg: "Доступ запрещен" });
            return;
        }
    } 
    // 2. Проверка прав доступа к группам
    else if (room !== "General") {
        const member = await db.get(
            "SELECT * FROM group_members WHERE room = ? AND username = ?",
            [room, username]
        );
        if (!member) {
             socket.emit("error_message", { msg: "Вы не состоите в этой группе" });
             return;
        }
    }

    // Очистка старых комнат и вход в новую
    Array.from(socket.rooms).forEach((r) => {
      if (r !== socket.id && r !== username) socket.leave(r);
    });
    socket.join(room);
    const msgs = await db.all(
      "SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30",
      [room]
    );
    socket.emit("chat_history", msgs.reverse());
  });

  socket.on("load_more_messages", async ({ room, offset }) => {
    if (!db) return;
    const msgs = await db.all(
      "SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30 OFFSET ?",
      [room, offset]
    );
    socket.emit(
      msgs.length ? "more_messages_loaded" : "no_more_messages",
      msgs.reverse()
    );
  });

  socket.on("send_message", async (data, callback) => {
    if (!db) return;
    const author = socket.data.username;
    if (!author) return;
    if (data.room.includes("_")) {
      const target = data.room.split("_").find((u) => u !== author);
      if (target && (await isBlocked(target, author)))
        return socket.emit("error_message", { msg: "Blocked" });
    }
    const res = await db.run(
      "INSERT INTO messages (room, author, message, type, time, reply_to_id, reply_to_author, reply_to_message) VALUES (?,?,?,?,?,?,?,?)",
      [
        data.room,
        author,
        data.message,
        data.type || "text",
        data.time,
        data.replyTo?.id,
        data.replyTo?.author,
        data.replyTo?.message,
      ]
    );
    const broadcastMessage = {
      id: res.lastID,
      room: data.room,
      author: author,
      message: data.message,
      type: data.type || "text",
      time: data.time,
      reply_to_id: data.replyTo?.id || null,
      reply_to_author: data.replyTo?.author || null,
      reply_to_message: data.replyTo?.message || null,
      tempId: data.tempId,
    };

    io.to(data.room).emit("receive_message", broadcastMessage);
    if (callback) callback({ status: "ok", id: res.lastID });

    if (data.room.includes("_")) {
      const parts = data.room.split("_");
      const recipient = parts.find((u) => u !== author);
      if (recipient) {
        const authorProfile = await db.get(
          "SELECT avatar_url FROM user_profiles WHERE username=?",
          [author]
        );
        const recipientSocket = onlineUsers.find(
          (u) => u.username === recipient
        );
        const bodyText = data.type === "text" ? data.message : "📎 Вложение";

        if (recipientSocket) {
          io.to(recipientSocket.socketId).emit("dm_notification", {
            author: author,
            message: bodyText,
            room: data.room,
            avatar: authorProfile?.avatar_url,
          });
        } else {
          await sendWebPush(recipient, {
            title: author,
            body: bodyText,
            tag: `dm-${data.room}`,
            room: data.room,
            data: { room: data.room },
          });
        }
      }
    }

    const mentionRegex = /@(\w+)/g;
    let match;
    const uniqueMentions = new Set();
    while ((match = mentionRegex.exec(data.message)) !== null)
      uniqueMentions.add(match[1]);
    for (const mentionedUser of uniqueMentions) {
      const userExists = await db.get(
        "SELECT id FROM users WHERE username = ?",
        [mentionedUser]
      );
      if (userExists && mentionedUser !== author) {
        let isInRoom = data.room === "General";
        if (
          !isInRoom &&
          data.room.includes("_") &&
          data.room.includes(mentionedUser)
        )
          isInRoom = true;
        else if (!isInRoom) {
          const member = await db.get(
            "SELECT * FROM group_members WHERE room = ? AND username = ?",
            [data.room, mentionedUser]
          );
          if (member) isInRoom = true;
        }
        if (isInRoom)
          await sendNotification(
            mentionedUser,
            "mention",
            `${author} упомянул вас в ${data.room}`,
            data.room
          );
      }
    }
  });

  socket.on("create_group", async ({ room }) => {
    if (!db) return;
    await db.run(
      `INSERT INTO group_members (room, username, role) VALUES (?, ?, 'owner')`,
      [room, username]
    );
    socket.emit("group_created", { room });
    await pushUpdatesToUser(username);
  });
  socket.on("join_existing_group", async ({ room }) => {
    if (!db) return;
    if (
      !(await db.get(
        `SELECT * FROM group_members WHERE room=? AND username=?`,
        [room, username]
      ))
    ) {
      await db.run(
        `INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`,
        [room, username]
      );
    }
    socket.emit("group_joined", { room });
    await pushUpdatesToUser(username);
  });
  socket.on("leave_group", async ({ room }) => {
    if (!db) return;
    const role = (
      await db.get(
        `SELECT role FROM group_members WHERE room=? AND username=?`,
        [room, username]
      )
    )?.role;
    if (role === "owner" && room !== "General") {
      await db.run(`DELETE FROM group_members WHERE room=?`, [room]);
      await db.run(`DELETE FROM messages WHERE room=?`, [room]);
      io.to(room).emit("group_deleted", { room });
    } else {
      await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [
        room,
        username,
      ]);
      io.to(room).emit("group_info_updated", {
        members: await db.all(`SELECT * FROM group_members WHERE room=?`, [
          room,
        ]),
      });
      socket.emit("left_group_success", { room });
      await pushUpdatesToUser(username);
    }
  });
  socket.on("add_group_member", async ({ room, username: targetUser }) => {
    if (!db) return;
    if (
      !(await db.get(
        `SELECT * FROM group_members WHERE room=? AND username=?`,
        [room, targetUser]
      ))
    ) {
      await db.run(
        `INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`,
        [room, targetUser]
      );
      io.to(room).emit("group_info_updated", {
        members: await db.all(`SELECT * FROM group_members WHERE room=?`, [
          room,
        ]),
      });
      await pushUpdatesToUser(targetUser);
    }
  });
  socket.on("remove_group_member", async ({ room, username: targetUser }) => {
    if (!db) return;
    await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [
      room,
      targetUser,
    ]);
    io.to(room).emit("group_info_updated", {
      members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]),
    });
    await pushUpdatesToUser(targetUser);
  });
  socket.on("typing", (d) =>
    socket
      .to(d.room)
      .emit("display_typing", { username: username, room: d.room })
  );
  socket.on("search_groups", async (q) => {
    try {
      if (!db) return socket.emit("search_groups_results", []);
      const groups = await db.all(
        `SELECT DISTINCT room FROM group_members WHERE lower(room) LIKE lower(?) LIMIT 20`,
        [`%${q}%`]
      );
      socket.emit("search_groups_results", groups);
    } catch (e) {
      socket.emit("search_groups_results", []);
    }
  });
  socket.on("search_users", async (q) => {
    try {
      if (!db) return socket.emit("search_results", []);
      const dbUsers = await db.all(
        `SELECT u.username, p.display_name, p.avatar_url FROM users u LEFT JOIN user_profiles p ON u.username = p.username WHERE u.username LIKE ? OR p.display_name LIKE ? LIMIT 20`,
        [`%${q}%`, `%${q}%`]
      );
      const results = dbUsers.map((user) => {
        const onlineUser = onlineUsers.find(
          (u) => u.username === user.username
        );
        return {
          username: user.username,
          display_name: user.display_name || user.username,
          avatar_url: user.avatar_url,
          socketId: onlineUser ? onlineUser.socketId : null,
          isOnline: !!onlineUser,
        };
      });
      socket.emit("search_results", results);
    } catch (e) {
      socket.emit("search_results", []);
    }
  });
  socket.on("get_group_info", async (room) => {
    if (!db) return;
    const members = await db.all(
      `SELECT gm.*, up.avatar_url, up.display_name FROM group_members gm LEFT JOIN user_profiles up ON gm.username = up.username WHERE gm.room=?`,
      [room]
    );
    const myRole =
      members.find((m) => m.username === username)?.role || "guest";
    socket.emit("group_info_data", { room, members, myRole });
  });
  socket.on("get_my_profile", async (u) => {
    if (db) {
      let data = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [
        u,
      ]);
      if (!data) {
        data = {
          username: u,
          display_name: u,
          bio: "",
          phone: "",
          avatar_url: "",
          notifications_enabled: 1,
        };
        await db.run(
          `INSERT OR IGNORE INTO user_profiles (username, display_name) VALUES (?, ?)`,
          [u, u]
        );
      }
      if (!data.display_name) data.display_name = u;
      socket.emit("my_profile_data", data);
    }
  });
  socket.on("update_profile", async (d) => {
    if (!db) return;
    if (d.newUsername && d.newUsername !== username) {
      const usernameRegex = /^[a-zA-Z0-9]{3,}$/;
      if (!usernameRegex.test(d.newUsername))
        return socket.emit("error_message", {
          msg: "Nametag может содержать только латинские буквы (a-Z) и цифры (0-9), минимум 3 символа.",
        });
      try {
        const exists = await db.get("SELECT id FROM users WHERE username = ?", [
          d.newUsername,
        ]);
        if (exists)
          return socket.emit("error_message", {
            msg: "Это имя пользователя (@nametag) уже занято.",
          });
        await db.run("BEGIN TRANSACTION");
        await db.run("UPDATE users SET username = ? WHERE username = ?", [
          d.newUsername,
          username,
        ]);
        await db.run("UPDATE messages SET author = ? WHERE author = ?", [
          d.newUsername,
          username,
        ]);
        await db.run(
          "UPDATE messages SET reply_to_author = ? WHERE reply_to_author = ?",
          [d.newUsername, username]
        );
        await db.run("UPDATE friends SET user_1 = ? WHERE user_1 = ?", [
          d.newUsername,
          username,
        ]);
        await db.run("UPDATE friends SET user_2 = ? WHERE user_2 = ?", [
          d.newUsername,
          username,
        ]);
        await db.run(
          "UPDATE group_members SET username = ? WHERE username = ?",
          [d.newUsername, username]
        );
        await db.run(
          "UPDATE user_profiles SET username = ? WHERE username = ?",
          [d.newUsername, username]
        );
        await db.run("UPDATE blocked_users SET blocker = ? WHERE blocker = ?", [
          d.newUsername,
          username,
        ]);
        await db.run("UPDATE blocked_users SET blocked = ? WHERE blocked = ?", [
          d.newUsername,
          username,
        ]);
        await db.run(
          "UPDATE user_avatars SET username = ? WHERE username = ?",
          [d.newUsername, username]
        );
        await db.run("UPDATE notifications SET user_to = ? WHERE user_to = ?", [
          d.newUsername,
          username,
        ]);
        const involvedRooms = await db.all(
          "SELECT DISTINCT room FROM messages WHERE room LIKE ? OR room LIKE ?",
          [`${username}_%`, `%_${username}`]
        );
        for (const row of involvedRooms) {
          const parts = row.room.split("_");
          if (
            parts.length === 2 &&
            (parts[0] === username || parts[1] === username)
          ) {
            const otherUser = parts[0] === username ? parts[1] : parts[0];
            const newRoomName = [d.newUsername, otherUser].sort().join("_");
            await db.run("UPDATE messages SET room = ? WHERE room = ?", [
              newRoomName,
              row.room,
            ]);
          }
        }
        await db.run("COMMIT");
        socket.emit("force_logout", {
          msg: "Ваш @nametag изменен. Пожалуйста, войдите снова.",
        });
        return;
      } catch (err) {
        await db.run("ROLLBACK");
        console.error(err);
        return socket.emit("error_message", {
          msg: "Ошибка при смене @nametag.",
        });
      }
    }
    await db.run(
      `UPDATE user_profiles SET bio=?, phone=?, display_name=?, notifications_enabled=? WHERE username=?`,
      [
        d.bio,
        d.phone,
        d.display_name,
        d.notifications_enabled ? 1 : 0,
        username,
      ]
    );
    socket.emit(
      "my_profile_data",
      await db.get(`SELECT * FROM user_profiles WHERE username=?`, [username])
    );
  });
  socket.on("get_user_profile", async (u) => {
    if (!db) return;
    const p = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]);
    const f = await db.get(
      `SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [username, u, u, username]
    );
    socket.emit("user_profile_data", {
      ...(p || { username: u, display_name: u }),
      isFriend: !!f,
    });
  });
  socket.on("get_avatar_history", async (u) => {
    if (db)
      socket.emit(
        "avatar_history_data",
        await db.all(
          `SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`,
          [u]
        )
      );
  });
  socket.on("delete_avatar", async ({ avatarId }) => {
    if (!db) return;
    await db.run("DELETE FROM user_avatars WHERE id=?", [avatarId]);
    const last = await db.get(
      "SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC LIMIT 1",
      [username]
    );
    await db.run("UPDATE user_profiles SET avatar_url=? WHERE username=?", [
      last?.avatar_url || "",
      username,
    ]);
    socket.emit(
      "my_profile_data",
      await db.get(`SELECT * FROM user_profiles WHERE username=?`, [username])
    );
    socket.emit(
      "avatar_history_data",
      await db.all(
        `SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`,
        [username]
      )
    );
  });
  socket.on("send_friend_request_by_name", async ({ toUsername }) => {
    if (!db || toUsername === username) return;
    const isFriend = await db.get(
      `SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [username, toUsername, toUsername, username]
    );
    if (isFriend) return;
    const exists = await db.get(
      `SELECT * FROM notifications WHERE user_to=? AND type='friend_request' AND content=?`,
      [toUsername, username]
    );
    if (exists) return;
    await sendNotification(toUsername, "friend_request", username);
  });
  socket.on("mark_notification_read", async ({ id }) => {
    if (db)
      await db.run("UPDATE notifications SET is_read = 1 WHERE id = ?", [id]);
  });
  socket.on("delete_notification", async ({ id }) => {
    if (db) await db.run("DELETE FROM notifications WHERE id = ?", [id]);
  });
  socket.on("accept_friend_request", async ({ notifId, fromUsername }) => {
    if (!db || !fromUsername) return;
    const u1 = fromUsername;
    const u2 = username;
    await db.run("INSERT INTO friends (user_1, user_2) VALUES (?, ?)", [
      u1,
      u2,
    ]);
    if (notifId)
      await db.run("DELETE FROM notifications WHERE id=?", [notifId]);
    await pushUpdatesToUser(u1);
    await pushUpdatesToUser(u2);
    await sendNotification(u1, "info", `${u2} принял вашу заявку`);
  });
  socket.on("decline_friend_request", async ({ notifId }) => {
    if (db && notifId)
      await db.run("DELETE FROM notifications WHERE id=?", [notifId]);
  });
  socket.on("remove_friend", async (t) => {
    if (!db) return;
    await db.run(
      `DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [username, t, t, username]
    );
    await pushUpdatesToUser(username);
    await pushUpdatesToUser(t);
  });
  socket.on("block_user", async (t) => {
    if (!db) return;
    await db.run(
      `INSERT OR IGNORE INTO blocked_users (blocker, blocked) VALUES (?, ?)`,
      [username, t]
    );
    await db.run(
      `DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [username, t, t, username]
    );
    await pushUpdatesToUser(username);
    await pushUpdatesToUser(t);
  });
  socket.on("delete_message", async (id) => {
    if (!db) return;
    const msg = await db.get("SELECT * FROM messages WHERE id=?", [id]);
    if (!msg) return;
    let isOwner = false;
    if (!msg.room.includes("_")) {
      const membership = await db.get(
        "SELECT role FROM group_members WHERE room = ? AND username = ?",
        [msg.room, username]
      );
      if (membership && membership.role === "owner") {
        isOwner = true;
      }
    }
    if (msg.author === username || isOwner) {
      await db.run("DELETE FROM messages WHERE id=?", [id]);
      io.to(msg.room).emit("message_deleted", id);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
  });
});

server.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));
