const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: { type: String, required: [true, "Name is required"], trim: true },
    username: {
      type: String,
      required: [true, "Username is required"],
      unique: true,
      lowercase: true,
      trim: true,
      match: [
        /^[a-z0-9._-]{3,30}$/,
        "Username must be 3-30 characters: letters, numbers, dot, dash or underscore",
      ],
    },
    password: {
      type: String,
      required: [true, "Password is required"],
      minlength: [6, "Password must be at least 6 characters"],
      select: false, // never returned from the database unless asked for
    },
    role: { type: String, enum: ["admin", "cashier"], default: "cashier" },
    active: { type: Boolean, default: true },
  },
  { timestamps: true }
);

// Hash the password whenever it is created or changed
userSchema.pre("save", async function () {
  if (!this.isModified("password")) return;
  this.password = await bcrypt.hash(this.password, 10);
});

userSchema.methods.matchPassword = function (enteredPassword) {
  return bcrypt.compare(String(enteredPassword), this.password);
};

module.exports = mongoose.model("User", userSchema);