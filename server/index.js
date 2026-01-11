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

// --- Настройка переменных окружения ---
const PORT = process.env.PORT || 3001;
const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";
const BACKEND_URL = process.env.BACKEND_URL || `http://localhost:${PORT}`;
const JWT_SECRET =
  process.env.JWT_SECRET || "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";

// --- Настройка папок для данных ---
const dataDir = path.join(__dirname, "data");
if (!fs.existsSync(dataDir)) fs.mkdirSync(dataDir);
const uploadDir = path.join(dataDir, "uploads");
if (!fs.existsSync(uploadDir)) fs.mkdirSync(uploadDir);

app.use(cors());
app.use(express.json());
app.use("/uploads", express.static(uploadDir));

// --- DB INIT ---
let db;
async function initDB() {
  const dbPath = path.join(dataDir, "database.db");
  db = await open({ filename: dbPath, driver: sqlite3.Database });
  
  // Create tables
  await db.exec(`
        CREATE TABLE IF NOT EXISTS users (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP);
        CREATE TABLE IF NOT EXISTS messages (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, author TEXT, message TEXT, type TEXT DEFAULT 'text', time TEXT);
        CREATE TABLE IF NOT EXISTS friends (id INTEGER PRIMARY KEY AUTOINCREMENT, user_1 TEXT, user_2 TEXT);
        CREATE TABLE IF NOT EXISTS group_members (id INTEGER PRIMARY KEY AUTOINCREMENT, room TEXT, username TEXT, role TEXT DEFAULT 'member', custom_title TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS user_profiles (username TEXT PRIMARY KEY, bio TEXT DEFAULT '', phone TEXT DEFAULT '', avatar_url TEXT DEFAULT '');
        CREATE TABLE IF NOT EXISTS blocked_users (id INTEGER PRIMARY KEY AUTOINCREMENT, blocker TEXT, blocked TEXT);
        CREATE TABLE IF NOT EXISTS user_avatars (id INTEGER PRIMARY KEY AUTOINCREMENT, username TEXT, avatar_url TEXT, created_at DATETIME DEFAULT CURRENT_TIMESTAMP, FOREIGN KEY (username) REFERENCES user_profiles(username) ON DELETE CASCADE);
    `);

  // Migrations for new columns
  try { await db.exec(`ALTER TABLE messages ADD COLUMN type TEXT DEFAULT 'text'`); } catch (e) {}
  try { await db.exec(`ALTER TABLE messages ADD COLUMN reply_to_id INTEGER`); } catch (e) {}
  try { await db.exec(`ALTER TABLE messages ADD COLUMN reply_to_author TEXT`); } catch (e) {}
  try { await db.exec(`ALTER TABLE messages ADD COLUMN reply_to_message TEXT`); } catch (e) {}
  
  console.log("Database connected & Tables ready");
}
initDB();

// --- AUTH ROUTES ---
app.post("/register", async (req, res) => {
  const { username, password } = req.body;
  if (!username || !password)
    return res.status(400).json({ message: "Required fields missing" });
  try {
    const existing = await db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    if (existing) return res.status(409).json({ message: "User exists" });
    const hash = await bcrypt.hash(password, 10);
    await db.run("INSERT INTO users (username, password_hash) VALUES (?, ?)", [
      username,
      hash,
    ]);
    const user = await db.get("SELECT * FROM users WHERE username = ?", [
      username,
    ]);
    const token = jwt.sign(
      { id: user.id, username: user.username },
      JWT_SECRET,
      { expiresIn: "7d" }
    );
    res.status(201).json({ token });
  } catch (e) {
    res.status(500).json({ message: "Server error" });
  }
});

app.post("/login", async (req, res) => {
  const { username, password } = req.body;
  try {
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

// --- UPLOAD ROUTES ---
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
  const url = req.file.mimetype.startsWith("image/")
    ? await processImage(req.file.buffer)
    : `${BACKEND_URL}/uploads/${Date.now()}.webm`;
  if (!req.file.mimetype.startsWith("image/"))
    fs.writeFileSync(path.join(uploadDir, path.basename(url)), req.file.buffer);
  res.json({ url });
});

app.post("/upload-multiple", upload.array("files", 10), async (req, res) => {
  if (!req.files) return res.status(400).json({ message: "No files" });
  const urls = await Promise.all(req.files.map((f) => processImage(f.buffer)));
  res.json({ urls });
});

app.post("/upload-avatar", upload.single("avatar"), async (req, res) => {
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
});

// --- SOCKET.IO ---
const server = http.createServer(app);
const io = new Server(server, { cors: { origin: FRONTEND_URL } });
let onlineUsers = [];

// Helper: Get Lists Data
async function getListsData(username) {
  const friends = await db.all(
    `SELECT user_2 as name FROM friends WHERE user_1 = ? UNION SELECT user_1 as name FROM friends WHERE user_2 = ?`,
    [username, username]
  );
  const groups = await db.all(
    `SELECT room FROM group_members WHERE username = ?`,
    [username]
  );
  let groupNames = groups.map((g) => g.room);
  if (!groupNames.includes("General")) groupNames.unshift("General");
  return { friends: friends.map((f) => f.name), groups: groupNames };
}

// Helper: Send updates to a specific user (by username)
async function pushUpdatesToUser(username) {
  const target = onlineUsers.find((u) => u.username === username);
  if (target) {
    const data = await getListsData(username);
    io.to(target.socketId).emit("friends_list", data.friends);
    io.to(target.socketId).emit("user_groups", data.groups);
  }
}

async function isBlocked(t, s) {
  return !!(await db.get(
    `SELECT * FROM blocked_users WHERE blocker=? AND blocked=?`,
    [t, s]
  ));
}

io.on("connection", (socket) => {
  console.log(`Connect: ${socket.id}`);

  socket.on("authenticate", async (data) => {
    try {
      const user = jwt.verify(data.token, JWT_SECRET);
      socket.data.username = user.username;
      onlineUsers = onlineUsers.filter((u) => u.username !== user.username);
      onlineUsers.push({ socketId: socket.id, username: user.username });
      await db.run(
        `INSERT OR IGNORE INTO user_profiles (username) VALUES (?)`,
        [user.username]
      );

      // Send initial data immediately upon auth
      const lists = await getListsData(user.username);
      socket.emit("friends_list", lists.friends);
      socket.emit("user_groups", lists.groups);
    } catch (e) {
      socket.disconnect();
    }
  });

  // NEW: Direct PULL request (Replies to SENDER directly)
  socket.on("get_initial_data", async () => {
    if (socket.data.username) {
      const lists = await getListsData(socket.data.username);
      socket.emit("friends_list", lists.friends);
      socket.emit("user_groups", lists.groups);
    }
  });

  socket.on("join_room", async ({ room }) => {
    socket.join(room);
    const msgs = await db.all(
      "SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30",
      [room]
    );
    socket.emit("chat_history", msgs.reverse());
  });

  socket.on("load_more_messages", async ({ room, offset }) => {
    const msgs = await db.all(
      "SELECT * FROM messages WHERE room = ? ORDER BY id DESC LIMIT 30 OFFSET ?",
      [room, offset]
    );
    socket.emit(
      msgs.length ? "more_messages_loaded" : "no_more_messages",
      msgs.reverse()
    );
  });

  // UPDATED: Now supports callback for acknowledgement AND replies
  socket.on("send_message", async (data, callback) => {
    const author = socket.data.username;
    if (data.room.includes("_")) {
      const target = data.room.split("_").find((u) => u !== author);
      if (target && (await isBlocked(target, author)))
        return socket.emit("error_message", { msg: "Blocked" });
    }
    
    // Insert with reply data if present
    const res = await db.run(
      "INSERT INTO messages (room, author, message, type, time, reply_to_id, reply_to_author, reply_to_message) VALUES (?,?,?,?,?,?,?,?)",
      [
          data.room, 
          author, 
          data.message, 
          data.type || "text", 
          data.time,
          data.replyTo?.id || null,
          data.replyTo?.author || null,
          data.replyTo?.message || null
      ]
    );
    
    // ---- THIS IS THE FIX ----
    // Create a new object for broadcasting that matches the database/history structure
    const broadcastMessage = {
        id: res.lastID,
        room: data.room,
        author: author,
        message: data.message,
        type: data.type || "text",
        time: data.time,
        // Add the flat reply properties that the client component expects
        reply_to_id: data.replyTo?.id || null,
        reply_to_author: data.replyTo?.author || null,
        reply_to_message: data.replyTo?.message || null,
        // Pass tempId back so the sender can reconcile their optimistic update
        tempId: data.tempId 
    };

    io.to(data.room).emit("receive_message", broadcastMessage);

    // Acknowledge to sender with real ID
    if (callback) {
        callback({ status: "ok", id: res.lastID });
    }
  });

  socket.on("create_group", async ({ room }) => {
    await db.run(
      `INSERT INTO group_members (room, username, role) VALUES (?, ?, 'owner')`,
      [room, socket.data.username]
    );
    socket.emit("group_created", { room });
    await pushUpdatesToUser(socket.data.username);
  });

  socket.on("join_existing_group", async ({ room }) => {
    const user = socket.data.username;
    if (
      !(await db.get(
        `SELECT * FROM group_members WHERE room=? AND username=?`,
        [room, user]
      ))
    ) {
      await db.run(
        `INSERT INTO group_members (room, username, role) VALUES (?, ?, 'member')`,
        [room, user]
      );
    }
    socket.emit("group_joined", { room });
    await pushUpdatesToUser(user);
  });

  socket.on("leave_group", async ({ room }) => {
    const user = socket.data.username;
    const role = (
      await db.get(
        `SELECT role FROM group_members WHERE room=? AND username=?`,
        [room, user]
      )
    )?.role;
    if (role === "owner") {
      await db.run(`DELETE FROM group_members WHERE room=?`, [room]);
      await db.run(`DELETE FROM messages WHERE room=?`, [room]);
      io.to(room).emit("group_deleted", { room });
    } else {
      await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [
        room,
        user,
      ]);
      io.to(room).emit("group_info_updated", {
        members: await db.all(`SELECT * FROM group_members WHERE room=?`, [
          room,
        ]),
      });
      socket.emit("left_group_success", { room });
      await pushUpdatesToUser(user);
    }
  });

  socket.on("add_group_member", async ({ room, username }) => {
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
      io.to(room).emit("group_info_updated", {
        members: await db.all(`SELECT * FROM group_members WHERE room=?`, [
          room,
        ]),
      });
      await pushUpdatesToUser(username);
    }
  });

  socket.on("remove_group_member", async ({ room, username }) => {
    await db.run(`DELETE FROM group_members WHERE room=? AND username=?`, [
      room,
      username,
    ]);
    io.to(room).emit("group_info_updated", {
      members: await db.all(`SELECT * FROM group_members WHERE room=?`, [room]),
    });
    await pushUpdatesToUser(username);
  });

  // Helper listeners
  socket.on("typing", (d) =>
    socket.to(d.room).emit("display_typing", { username: socket.data.username })
  );
  socket.on("search_groups", async (q) => {
    try {
      console.log(`[SERVER] Searching groups for: "${q}"`);
      const groups = await db.all(
        `SELECT DISTINCT room FROM group_members WHERE lower(room) LIKE lower(?) LIMIT 20`,
        [`%${q}%`]
      );
      socket.emit("search_groups_results", groups);
    } catch (e) {
      console.error("Group search error:", e);
      socket.emit("search_groups_results", []);
    }
  });
  socket.on("search_users", async (q) => {
    try {
      const dbUsers = await db.all(
        `SELECT username FROM users WHERE username LIKE ? LIMIT 20`,
        [`%${q}%`]
      );
      const results = dbUsers.map((user) => {
        const onlineUser = onlineUsers.find((u) => u.username === user.username);
        return {
          username: user.username,
          socketId: onlineUser ? onlineUser.socketId : null, 
          isOnline: !!onlineUser
        };
      });
      socket.emit("search_results", results);
    } catch (e) {
      console.error("Search error:", e);
      socket.emit("search_results", []);
    }
  });

  socket.on("get_group_info", async (room) => {
    const members = await db.all(`SELECT * FROM group_members WHERE room=?`, [
      room,
    ]);
    const myRole =
      members.find((m) => m.username === socket.data.username)?.role || "guest";
    socket.emit("group_info_data", { room, members, myRole });
  });

  // Profile & Friends
  socket.on("get_my_profile", async (u) =>
    socket.emit(
      "my_profile_data",
      await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u])
    )
  );
  socket.on("update_profile", async (d) => {
    await db.run(`UPDATE user_profiles SET bio=?, phone=? WHERE username=?`, [
      d.bio,
      d.phone,
      socket.data.username,
    ]);
    socket.emit(
      "my_profile_data",
      await db.get(`SELECT * FROM user_profiles WHERE username=?`, [
        socket.data.username,
      ])
    );
  });
  socket.on("get_user_profile", async (u) => {
    const p = await db.get(`SELECT * FROM user_profiles WHERE username=?`, [u]);
    const f = await db.get(
      `SELECT * FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [socket.data.username, u, u, socket.data.username]
    );
    socket.emit("user_profile_data", {
      ...(p || { username: u }),
      isFriend: !!f,
    });
  });
  socket.on("get_avatar_history", async (u) =>
    socket.emit(
      "avatar_history_data",
      await db.all(
        `SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`,
        [u]
      )
    )
  );

  socket.on("delete_avatar", async ({ avatarId }) => {
    await db.run("DELETE FROM user_avatars WHERE id=?", [avatarId]);
    const last = await db.get(
      "SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC LIMIT 1",
      [socket.data.username]
    );
    await db.run("UPDATE user_profiles SET avatar_url=? WHERE username=?", [
      last?.avatar_url || "",
      socket.data.username,
    ]);
    socket.emit(
      "my_profile_data",
      await db.get(`SELECT * FROM user_profiles WHERE username=?`, [
        socket.data.username,
      ])
    );
    socket.emit(
      "avatar_history_data",
      await db.all(
        `SELECT * FROM user_avatars WHERE username=? ORDER BY id DESC`,
        [socket.data.username]
      )
    );
  });

  socket.on("send_friend_request", ({ toUserSocketId }) =>
    io
      .to(toUserSocketId)
      .emit("incoming_friend_request", {
        from: socket.data.username,
        socketId: socket.id,
      })
  );
  socket.on("accept_friend_request", async ({ fromSocketId }) => {
    const u1 = onlineUsers.find((u) => u.socketId === fromSocketId)?.username;
    const u2 = socket.data.username;
    if (u1) {
      await db.run("INSERT INTO friends (user_1, user_2) VALUES (?, ?)", [
        u1,
        u2,
      ]);
      await pushUpdatesToUser(u1);
      await pushUpdatesToUser(u2);
    }
  });
  socket.on("remove_friend", async (t) => {
    await db.run(
      `DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [socket.data.username, t, t, socket.data.username]
    );
    await pushUpdatesToUser(socket.data.username);
    await pushUpdatesToUser(t);
  });
  socket.on("block_user", async (t) => {
    await db.run(
      `INSERT OR IGNORE INTO blocked_users (blocker, blocked) VALUES (?, ?)`,
      [socket.data.username, t]
    );
    await db.run(
      `DELETE FROM friends WHERE (user_1=? AND user_2=?) OR (user_1=? AND user_2=?)`,
      [socket.data.username, t, t, socket.data.username]
    );
    await pushUpdatesToUser(socket.data.username);
    await pushUpdatesToUser(t);
  });
  socket.on("delete_message", async (id) => {
    const msg = await db.get("SELECT * FROM messages WHERE id=?", [id]);
    if (msg && msg.author === socket.data.username) {
      await db.run("DELETE FROM messages WHERE id=?", [id]);
      io.to(msg.room).emit("message_deleted", id);
    }
  });

  socket.on("disconnect", () => {
    onlineUsers = onlineUsers.filter((u) => u.socketId !== socket.id);
  });
});

server.listen(PORT, () => console.log(`SERVER RUNNING ON PORT ${PORT}`));