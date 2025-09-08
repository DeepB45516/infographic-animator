import { RequestHandler } from "express";
import { statsManager } from "../data/stats";

// Get current statistics
export const getStats: RequestHandler = (req, res) => {
  try {
    const stats = statsManager.getStats();
    const activeSessions = statsManager.getActiveSessions();
    
    res.json({
      success: true,
      data: {
        ...stats,
        activeSessions
      }
    });
  } catch (error) {
    console.error("Error fetching stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch statistics"
    });
  }
};

// Track user login
export const trackLogin: RequestHandler = (req, res) => {
  try {
    const { userId } = req.body;
    const ipAddress = req.ip || req.connection.remoteAddress;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }
    
    statsManager.trackLogin(userId, ipAddress);
    
    res.json({
      success: true,
      message: "Login tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking login:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track login"
    });
  }
};

// Track infographic creation
export const trackInfographicCreation: RequestHandler = (req, res) => {
  try {
    const { userId, title } = req.body;
    
    if (!userId) {
      return res.status(400).json({
        success: false,
        error: "User ID is required"
      });
    }
    
    const infographicId = statsManager.trackInfographicCreation(userId, title);
    
    res.json({
      success: true,
      data: {
        infographicId
      }
    });
  } catch (error) {
    console.error("Error tracking infographic creation:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track infographic creation"
    });
  }
};

// Track user rating
export const trackRating: RequestHandler = (req, res) => {
  try {
    const { rating } = req.body;
    
    if (!rating || rating < 1 || rating > 5) {
      return res.status(400).json({
        success: false,
        error: "Rating must be between 1 and 5"
      });
    }
    
    statsManager.trackRating(rating);
    
    res.json({
      success: true,
      message: "Rating tracked successfully"
    });
  } catch (error) {
    console.error("Error tracking rating:", error);
    res.status(500).json({
      success: false,
      error: "Failed to track rating"
    });
  }
};
