const User = require("../models/User");
const asyncHandler = require("../middleware/asyncHandler");

const safeUser = (u) => ({
  _id: u._id,
  name: u.name,
  username: u.username,
  role: u.role,
  active: u.active,
  createdAt: u.createdAt,
});

exports.getUsers = asyncHandler(async (req, res) => {
  const users = await User.find().sort({ role: 1, name: 1 });
  res.json(users.map(safeUser));
});

exports.createUser = asyncHandler(async (req, res) => {
  const { name, username, password, role } = req.body;
  const user = await User.create({ name, username, password, role });
  res.status(201).json(safeUser(user));
});

exports.updateUser = asyncHandler(async (req, res) => {
  const user = await User.findById(req.params.id);
  if (!user) {
    res.status(404);
    throw new Error("User not found");
  }

  const { name, role, active, password } = req.body;
  const isSelf = String(user._id) === String(req.user._id);

  // Stop the admin from locking themselves out
  if (isSelf && ((role && role !== "admin") || active === false)) {
    res.status(400);
    throw new Error("You can't remove your own admin access or disable your own account");
  }

  if (name !== undefined) user.name = name;
  if (role !== undefined) user.role = role;
  if (active !== undefined) user.active = Boolean(active);
  if (password) user.password = password; // hashed automatically on save

  await user.save();
  res.json(safeUser(user));
});