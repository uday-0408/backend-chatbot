import express from "express";
import cors from "cors";
import chatRoutes from "./routes/chatRoutes.js";

const app = express();

// Enable CORS
app.use(cors());

// Parsing middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Health check route
app.get("/health", (req, res) => {
  res.json({ status: "ok" });
});

// API routes
app.use("/api", chatRoutes);

export default app;
