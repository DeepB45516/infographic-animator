import "dotenv/config";
import express from "express";
import cors from "cors";
import { handleDemo } from "./routes/demo";
import { getStats, trackLogin, trackInfographicCreation, trackRating } from "./routes/stats";
import { googleLogin, verifyToken, getProfile, logout } from "./routes/auth";
import chartRoutes from "./routes/chart";

export function createServer() {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Example API routes
  app.get("/api/ping", (_req, res) => {
    const ping = process.env.PING_MESSAGE ?? "ping";
    res.json({ message: ping });
  });

  app.get("/api/demo", handleDemo);

  // Stats API routes
  app.get("/api/stats", getStats);
  app.post("/api/stats/login", trackLogin);
  app.post("/api/stats/infographic", trackInfographicCreation);
  app.post("/api/stats/rating", trackRating);

  // Auth API routes
  app.post("/api/auth/google", googleLogin);
  app.get("/api/auth/verify", verifyToken);
  app.get("/api/auth/profile", getProfile);
  app.post("/api/auth/logout", logout);

  // Chart API routes
  app.use("/api", chartRoutes);

  return app;
}
