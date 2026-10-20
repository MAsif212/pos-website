const jwt = require("jsonwebtoken");
const User = require("../models/User");
const asyncHandler = require("./asyncHandler");

// Only logged-in, active users get past this
exports.protect = asyncHandler(async (req, res, next) => {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;

  if (!token) {
    res.status(401);
    throw new Error("Please log in");
  }

  let decoded;
  try {
    decoded = jwt.verify(token, process.env.JWT_SECRET);
  } catch {
    res.status(401);
    throw new Error("Your session expired. Please log in again");
  }

  const user = await User.findById(decoded.id);
  if (!user || !user.active) {
    res.status(401);
    throw new Error("Your account is disabled or no longer exists");
  }

  req.user = user;
  next();
});

// Only the listed roles get past this, e.g. authorize("admin")
exports.authorize = (...roles) => (req, res, next) => {
  if (!roles.includes(req.user.role)) {
    res.status(403);
    return next(new Error("You don't have permission to do this"));
  }
  next();
};