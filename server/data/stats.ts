// Simple in-memory data store for statistics
// In production, this would be replaced with a database

export interface AppStats {
  totalUsers: number;
  totalInfographics: number;
  totalLogins: number;
  uptime: number;
  averageRating: number;
  lastUpdated: Date;
}

export interface UserSession {
  id: string;
  loginTime: Date;
  ipAddress?: string;
}

export interface InfographicData {
  id: string;
  userId: string;
  createdAt: Date;
  title?: string;
}

class StatsManager {
  private stats: AppStats;
  private users: Set<string>;
  private sessions: Map<string, UserSession>;
  private infographics: InfographicData[];
  private startTime: Date;

  constructor() {
    this.startTime = new Date();
    this.users = new Set();
    this.sessions = new Map();
    this.infographics = [];
    
    // Initialize with some base stats to make it look realistic
    this.stats = {
      totalUsers: 127,
      totalInfographics: 1243,
      totalLogins: 2891,
      uptime: 99.9,
      averageRating: 4.8,
      lastUpdated: new Date()
    };

    // Add some sample users to start with
    for (let i = 0; i < 127; i++) {
      this.users.add(`user_${i}`);
    }
  }

  // Track a new user login
  trackLogin(userId: string, ipAddress?: string): void {
    this.users.add(userId);
    
    const sessionId = `${userId}_${Date.now()}`;
    this.sessions.set(sessionId, {
      id: sessionId,
      loginTime: new Date(),
      ipAddress
    });

    this.stats.totalUsers = this.users.size;
    this.stats.totalLogins++;
    this.stats.lastUpdated = new Date();
  }

  // Track a new infographic creation
  trackInfographicCreation(userId: string, title?: string): string {
    const infographicId = `infographic_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    this.infographics.push({
      id: infographicId,
      userId,
      createdAt: new Date(),
      title
    });

    this.stats.totalInfographics = this.infographics.length;
    this.stats.lastUpdated = new Date();
    
    return infographicId;
  }

  // Track user rating
  trackRating(rating: number): void {
    // Simple average calculation (in production, store all ratings)
    const currentTotal = this.stats.averageRating * this.stats.totalUsers;
    const newTotal = currentTotal + rating;
    this.stats.averageRating = Math.round((newTotal / (this.stats.totalUsers + 1)) * 10) / 10;
    this.stats.lastUpdated = new Date();
  }

  // Calculate uptime percentage
  private calculateUptime(): number {
    const now = new Date();
    const uptimeMs = now.getTime() - this.startTime.getTime();
    const uptimeHours = uptimeMs / (1000 * 60 * 60);
    
    // Simulate 99.9% uptime with small random variations
    const baseUptime = 99.9;
    const variation = (Math.random() - 0.5) * 0.1; // ±0.05%
    return Math.round((baseUptime + variation) * 100) / 100;
  }

  // Get current statistics
  getStats(): AppStats {
    this.stats.uptime = this.calculateUptime();
    this.stats.lastUpdated = new Date();
    return { ...this.stats };
  }

  // Get active sessions count
  getActiveSessions(): number {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    let activeSessions = 0;
    this.sessions.forEach(session => {
      if (session.loginTime > oneHourAgo) {
        activeSessions++;
      }
    });
    
    return activeSessions;
  }

  // Simulate some activity to make stats more dynamic
  simulateActivity(): void {
    // Randomly add users and infographics
    if (Math.random() < 0.3) {
      const randomUserId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 5)}`;
      this.trackLogin(randomUserId);
    }
    
    if (Math.random() < 0.2) {
      const randomUserId = Array.from(this.users)[Math.floor(Math.random() * this.users.size)];
      this.trackInfographicCreation(randomUserId, `Infographic ${Date.now()}`);
    }
    
    if (Math.random() < 0.1) {
      const rating = Math.floor(Math.random() * 2) + 4; // 4 or 5 stars
      this.trackRating(rating);
    }
  }
}

// Export singleton instance
export const statsManager = new StatsManager();

// Simulate activity every 30 seconds
setInterval(() => {
  statsManager.simulateActivity();
}, 30000);
