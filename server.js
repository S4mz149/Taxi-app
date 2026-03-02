const express = require("express");
const session = require("express-session");
const bcrypt = require("bcrypt");
const Database = require("better-sqlite3");
const path = require("path");

const app = express();
const PORT = process.env.PORT || 3000;

const db = new Database("./database/database.sqlite");

db.exec(`
CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'employee'
);

CREATE TABLE IF NOT EXISTS services (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    start_time TEXT,
    end_time TEXT
);

CREATE TABLE IF NOT EXISTS rides (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    date TEXT,
    client TEXT,
    price REAL
);
`);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: "super-secret",
    resave: false,
    saveUninitialized: false
}));

app.use(express.static("public"));

// 🔐 Middleware Auth
function requireAuth(req, res, next) {
    if (!req.session.user) return res.status(401).json({ error: "Non autorisé" });
    next();
}

// 👑 Middleware Admin
function requireAdmin(req, res, next) {
    if (!req.session.user || req.session.user.role !== "admin") {
        return res.status(403).json({ error: "Accès admin requis" });
    }
    next();
}

// ✅ REGISTER
app.post("/api/register", async (req, res) => {
    const { username, password } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
        db.prepare(`
        INSERT INTO users (username, password)
        VALUES (?,?)
        `).run(username, hash);

        res.json({ success: true });
    } catch {
        res.json({ error: "Utilisateur existe déjà" });
    }
});

// ✅ LOGIN
app.post("/api/login", async (req, res) => {
    const { username, password } = req.body;

    const user = db.prepare(`
        SELECT * FROM users WHERE username = ?
    `).get(username);

    if (!user) return res.json({ error: "Utilisateur introuvable" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.json({ error: "Mot de passe incorrect" });

    req.session.user = user;

    res.json({ success: true, role: user.role });
});

// ✅ LOGOUT
app.post("/api/logout", (req, res) => {
    req.session.destroy();
    res.json({ success: true });
});

// ✅ START SERVICE
app.post("/api/start", requireAuth, (req, res) => {
    db.prepare(`
    INSERT INTO services (user_id, start_time)
    VALUES (?,?)
    `).run(req.session.user.id, new Date().toISOString());

    res.json({ success: true });
});

// ✅ END SERVICE
app.post("/api/end", requireAuth, (req, res) => {
    db.prepare(`
    UPDATE services
    SET end_time = ?
    WHERE user_id = ? AND end_time IS NULL
    `).run(new Date().toISOString(), req.session.user.id);

    res.json({ success: true });
});

// ✅ ADD RIDE
app.post("/api/ride", requireAuth, (req, res) => {
    const { client, price } = req.body;

    db.prepare(`
    INSERT INTO rides (user_id, date, client, price)
    VALUES (?,?,?,?)
    `).run(
        req.session.user.id,
        new Date().toISOString(),
        client,
        price
    );

    res.json({ success: true });
});

// ✅ GET RIDES
app.get("/api/rides", requireAuth, (req, res) => {
    const rides = db.prepare(`
        SELECT * FROM rides
        WHERE user_id = ?
        ORDER BY date DESC
    `).all(req.session.user.id);

    res.json(rides);
});

// 👑 ADMIN → ADD EMPLOYEE
app.post("/api/admin/add", requireAuth, requireAdmin, async (req, res) => {
    const { username, password, role } = req.body;
    const hash = await bcrypt.hash(password, 10);

    try {
        db.prepare(`
        INSERT INTO users (username, password, role)
        VALUES (?,?,?)
        `).run(username, hash, role || "employee");

        res.json({ success: true });
    } catch {
        res.json({ error: "Erreur création" });
    }
});

// 👑 ADMIN → DELETE EMPLOYEE
app.post("/api/admin/delete", requireAuth, requireAdmin, (req, res) => {
    const { id } = req.body;

    db.prepare(`
    DELETE FROM users WHERE id = ?
    `).run(id);

    res.json({ success: true });
});

// 👑 ADMIN → LIST EMPLOYEES
app.get("/api/admin/users", requireAuth, requireAdmin, (req, res) => {
    const users = db.prepare(`
    SELECT id, username, role FROM users
    `).all();

    res.json(users);
});

app.listen(PORT, () => {
    console.log("Serveur lancé sur port " + PORT);
      }
