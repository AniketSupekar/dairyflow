require("dotenv").config();
const app = require("./app");
const connectDB = require("./config/db");

const PORT = process.env.PORT || 5000;

// Connect to MongoDB then start server
const startServer = async () => {
  await connectDB();

  // Only call app.listen() when running locally with `npm run dev`
  // On Vercel, it imports this file as a serverless function — listen() is not needed
  if (process.env.NODE_ENV !== "production") {
    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
      console.log(`Health check: http://localhost:${PORT}/health`);
    });
  }
};

startServer();

// Vercel needs the app exported from this file
module.exports = app;