const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role }, process.env.JWT_SECRET, {
    expiresIn: "12h",
  });

const publicUser = (u) => ({
  _id: u._id,
  name: u.name,
  username: u.username,
  role: u.role,
});

exports.login = asyncHandler(async (req, res) => {
  // req.body is undefined when no body is sent, so fall back to an empty object
  const { username, password } = req.body || {};

  if (!username || !password) {
    res.status(400);
    throw new Error("Enter your username and password");
  }

  const user = await User.findOne({
    username: String(username).toLowerCase().trim(),
  }).select("+password");

  // Same message for wrong username and wrong password, so nobody can guess usernames
  if (!user || !(await user.matchPassword(password))) {
    res.status(401);
    throw new Error("Wrong username or password");
  }

  if (!user.active) {
    res.status(403);
    throw new Error("This account is disabled. Contact the admin.");
  }

  res.json({ token: signToken(user), user: publicUser(user) });
});

exports.me = (req, res) => {
  res.json(publicUser(req.user));
};