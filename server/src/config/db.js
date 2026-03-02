const mongoose = require("mongoose");

// ─── Cache connection across Vercel serverless invocations ────────────────────
// Without this, every warm lambda request reopens a connection and you hit
// Atlas M0's 500-connection limit fast under any real load.
let cached = global._mongooseConnection;
if (!cached) {
  cached = global._mongooseConnection = { conn: null, promise: null };
}

const connectDB = async () => {
  if (cached.conn) return cached.conn;

  if (!cached.promise) {
    cached.promise = mongoose
      .connect(process.env.MONGO_URI, {
        maxPoolSize: 10,
        serverSelectionTimeoutMS: 5000,
        socketTimeoutMS: 45000,
      })
      .then((m) => {
        console.log("MongoDB Connected");
        return m;
      });
  }

  try {
    cached.conn = await cached.promise;
  } catch (err) {
    cached.promise = null;
    console.error("Database connection failed:", err.message);
    process.exit(1);
  }

  return cached.conn;
};

module.exports = connectDB;