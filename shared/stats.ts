export interface StatsResponse {
  success: boolean;
  data?: {
    totalUsers: number;
    totalInfographics: number;
    totalLogins: number;
    uptime: number;
    averageRating: number;
    activeSessions: number;
    lastUpdated: Date;
  };
  error?: string;
}

export interface TrackLoginRequest {
  userId: string;
}

export interface TrackInfographicRequest {
  userId: string;
  title?: string;
}

export interface TrackRatingRequest {
  rating: number;
}

export interface ApiResponse {
  success: boolean;
  message?: string;
  data?: any;
  error?: string;
}
