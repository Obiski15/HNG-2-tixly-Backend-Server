const jsonServer = require("json-server");
const cookieParser = require("cookie-parser");
const cors = require("cors");
const fs = require("fs");
const path = require("path");

const {
  login,
  signup,
  logout,
  authenticate,
  protect,
} = require("./controller/auth.controller.js");

require("dotenv").config({ path: "./.env" });

const server = jsonServer.create();
const middlewares = jsonServer.defaults();

const allowedOrigins = process.env.ALLOWED_ORIGINS
  ? process.env.ALLOWED_ORIGINS.split(",")
  : [];

const corsOptions = {
  origin: (origin, cb) => {
    if (!origin) return cb(null, true);

    if (allowedOrigins.includes(origin)) {
      cb(null, true);
    } else {
      cb(new Error("Origin not allowed by CORS"));
    }
  },
  credentials: true,
};

server.use(cors(corsOptions));
server.use(cookieParser());
server.use(jsonServer.bodyParser);
server.use(middlewares);

// Ensure db.json exists and contains required top-level collections.
const DB_PATH = path.resolve(__dirname, "./db.json");

if (!fs.existsSync(DB_PATH)) {
  const initial = { users: [], tickets: [] };
  try {
    fs.writeFileSync(DB_PATH, JSON.stringify(initial, null, 2), {
      encoding: "utf8",
    });
    console.log("Created default db.json with users and tickets collections.");
  } catch (err) {
    console.error("Failed to create db.json:", err.message);
    // If we cannot create the file, fall back to an in-memory router so server still runs
  }
} else {
  // Validate that db.json contains the required keys; if not, merge defaults
  try {
    const raw = fs.readFileSync(DB_PATH, { encoding: "utf8" });
    let parsed = {};
    try {
      parsed = raw ? JSON.parse(raw) : {};
    } catch (err) {
      console.warn(
        "db.json is invalid JSON, recreating with default structure."
      );
      parsed = {};
    }

    let changed = false;
    if (!Array.isArray(parsed.users)) {
      parsed.users = [];
      changed = true;
    }
    if (!Array.isArray(parsed.tickets)) {
      parsed.tickets = [];
      changed = true;
    }

    if (changed) {
      fs.writeFileSync(DB_PATH, JSON.stringify(parsed, null, 2), {
        encoding: "utf8",
      });
      console.log(
        "Patched db.json to include required collections: users, tickets."
      );
    }
  } catch (err) {
    console.error("Error reading db.json:", err.message);
  }
}

let DBRouter;
if (fs.existsSync(DB_PATH)) {
  DBRouter = jsonServer.router(DB_PATH);
} else {
  // Fallback to an in-memory router if db.json could not be created/read
  DBRouter = jsonServer.router({ users: [], tickets: [] });
  console.warn("Using in-memory DB router (db.json not available).");
}

// auth routes
server.post("/authenticate", protect, authenticate);
server.post("/signup", signup);
server.post("/login", login);
server.post("/logout", logout);

server.use(protect, DBRouter);

server.use((_, res) => {
  res.status(404).json({
    status: "error",
    message: "Not Found",
  });
});

server.use((err, _, res, __) => {
  const env = process.env.NODE_ENV || "development";
  res.status(500).json({
    status: "error",
    message: env === "production" ? "Something went wrong" : err.message,
  });
});

const PORT = process.env.PORT || 4000;
server.listen(PORT, () => {
  console.log(`JSON Server running on PORT ${PORT}`);
});

exports.server = server;
