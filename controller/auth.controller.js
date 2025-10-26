const crypto = require("crypto");
const { readFile, writeFile } = require("fs/promises");
const path = require("path");

const setCookie = (res, key, value) => {
  res.cookie(key, value, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: process.env.NODE_ENV === "production" ? "none" : "lax",
    maxAge: 10 * 24 * 60 * 60 * 1000, // 5 days
  });
};

const genHash = (value) =>
  crypto.createHash("sha256").update(value).digest("hex");

const errorHandler = (res, statusCode, message) =>
  res.status(statusCode).json({
    status: `${statusCode}`.startsWith("4") ? "fail" : "error",
    error: { statusCode, message },
  });

exports.login = async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return errorHandler(res, 400, "Missing Email or Password");
  }

  const data = await readFile(path.join(__dirname, "../db.json"), "utf-8");
  const user = JSON.parse(data)["users"].find(
    (user) =>
      user.email === email &&
      user.password ===
        crypto.createHash("sha256").update(password).digest("hex")
  );

  if (!user) {
    return errorHandler(res, 401, "Invalid email or password");
  }

  // If login is successful

  // set cookies
  setCookie(
    res,
    "sessionId",
    genHash(`${user.id}${process.env.SESSION_SECRET}`)
  );
  setCookie(res, "userId", user.id);

  // send response
  res.status(200).json({
    message: "Login successful",
    user: { name: user.name, email: user.email },
  });
};

exports.signup = async (req, res) => {
  const { email, password, confirmPassword, name } = req.body;

  if (!email) {
    return errorHandler(res, 400, "Email Address is required");
  }

  if (!password) {
    return errorHandler(res, 400, "Password is required");
  }

  if (!confirmPassword) {
    return errorHandler(res, 400, "Confirm Password is required");
  }

  if (!name) {
    return errorHandler(res, 400, "Name is required");
  }

  if (password !== confirmPassword) {
    return errorHandler(res, 400, "Passwords do not match");
  }

  // Hash the password
  const hashedPassword = crypto
    .createHash("sha256")
    .update(password)
    .digest("hex");

  const data = JSON.parse(
    await readFile(path.join(__dirname, "../db.json"), "utf-8")
  );

  const users = data["users"];

  // Check if user already exists
  const userExists = users.find((user) => user.email === email);

  if (userExists) {
    return errorHandler(res, 400, "User already exists");
  }

  // Create new user
  const newUser = {
    email,
    name,
    password: hashedPassword,
    id: crypto.randomUUID(),
  };
  users.push(newUser);

  // Save users to file
  await writeFile(
    path.join(__dirname, "../db.json"),
    JSON.stringify({ ...data, users }, null, 2)
  );

  // set cookies
  setCookie(
    res,
    "sessionId",
    genHash(`${newUser.id}${process.env.SESSION_SECRET}`)
  );
  setCookie(res, "userId", newUser.id);

  res
    .status(201)
    .json({ message: "User registered successfully", user: newUser });
};

exports.logout = async (_, res) => {
  res.clearCookie("sessionId");
  res.clearCookie("userId");

  res.status(200).json({ status: "success" });
};

exports.protect = async (req, res, next) => {
  // retrieve cookies
  const sessionId = req.cookies?.["sessionId"];
  const userId = req.cookies?.["userId"];

  if (!sessionId || !userId)
    return errorHandler(res, 401, "User not authenticated");

  // find user
  const data = JSON.parse(
    await readFile(path.join(__dirname, "../db.json"), "utf-8")
  );

  const users = data["users"];

  const user = users.find((u) => u.id === userId);

  if (!user) return errorHandler(res, 404, "User not found");

  res.locals.user = user;
  (res.locals.isAuthenticated =
    sessionId === genHash(`${user.id}${process.env.SESSION_SECRET}`)),
    next();
};

exports.authenticate = async (req, res) => {
  const isAuthenticated = res.locals.isAuthenticated;
  const user = res.locals.user;
  const updatedUser = {};

  Object.entries(user).forEach(([key, value]) => {
    if (key !== "password") {
      updatedUser[key] = value;
    }

    return;
  });

  res.status(200).json({
    isAuthenticated,
    user: { ...updatedUser },
  });
};
