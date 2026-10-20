require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/User");

const users = [
  { name: "Store Admin", username: "admin", password: "admin123", role: "admin" },
  { name: "Ali Raza", username: "cashier", password: "cashier123", role: "cashier" },
];

async function main() {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  for (const u of users) {
    const exists = await User.findOne({ username: u.username });
    if (exists) {
      console.log(`${u.username}: already exists, skipped`);
      continue;
    }
    await User.create(u);
    console.log(`${u.username}: created (${u.role})`);
  }

  await mongoose.disconnect();
  console.log("Done");
}

main().catch((err) => {
  console.error("Failed:", err.message);
  process.exit(1);
});