const mongoose = require("mongoose");

// Reuse one connection across requests (needed for serverless hosting)
let connecting = null;

const connectDB = async () => {
  if (mongoose.connection.readyState === 1) return mongoose.connection;

  if (!connecting) {
    connecting = mongoose
      .connect(process.env.MONGO_URI, { serverSelectionTimeoutMS: 10000 })
      .then((m) => {
        console.log(`MongoDB connected: ${m.connection.host}`);
        return m.connection;
      })
      .catch((err) => {
        connecting = null;
        throw err;
      });
  }

  return connecting;
};

module.exports = connectDB;