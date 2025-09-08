import { RequestHandler } from "express";
import { authService, AuthResult } from "../services/auth";
import { statsManager } from "../data/stats";

// Google OAuth login endpoint
export const googleLogin: RequestHandler = async (req, res) => {
  try {
    const { idToken } = req.body;

    if (!idToken) {
      return res.status(400).json({
        success: false,
        error: "Google ID token is required"
      });
    }

    const user = await authService.verifyGoogleToken(idToken);
    
    if (!user) {
      return res.status(401).json({
        success: false,
        error: "Invalid Google token"
      });
    }

    const token = authService.generateJWT(user);

    // Track the login in stats
    statsManager.trackLogin(user.id, req.ip || req.connection.remoteAddress);

    const result: AuthResult = {
      user,
      token
    };

    res.json({
      success: true,
      data: result
    });
  } catch (error) {
    console.error("Error in Google login:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Verify JWT token endpoint
export const verifyToken: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1]; // Bearer TOKEN

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided"
      });
    }

    const decoded = authService.verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Invalid token"
      });
    }

    const user = authService.getUser(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Get current user profile
export const getProfile: RequestHandler = (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) {
      return res.status(401).json({
        success: false,
        error: "No token provided"
      });
    }

    const decoded = authService.verifyJWT(token);
    
    if (!decoded) {
      return res.status(401).json({
        success: false,
        error: "Invalid token"
      });
    }

    const user = authService.getUser(decoded.userId);
    
    if (!user) {
      return res.status(404).json({
        success: false,
        error: "User not found"
      });
    }

    res.json({
      success: true,
      data: { user }
    });
  } catch (error) {
    console.error("Error getting profile:", error);
    res.status(500).json({
      success: false,
      error: "Internal server error"
    });
  }
};

// Logout endpoint
export const logout: RequestHandler = (req, res) => {
  // In a real implementation, you might want to blacklist the token
  // For now, we just return success since JWT tokens are stateless
  res.json({
    success: true,
    message: "Logged out successfully"
  });
};
