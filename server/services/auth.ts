import { OAuth2Client } from 'google-auth-library';
import jwt from 'jsonwebtoken';

const GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'your-google-client-id';
const JWT_SECRET = process.env.JWT_SECRET || 'development-jwt-secret-key-change-in-production';

export interface User {
  id: string;
  email: string;
  name: string;
  picture: string;
  provider: 'google';
  createdAt: Date;
}

export interface AuthResult {
  user: User;
  token: string;
}

class AuthService {
  private googleClient: OAuth2Client;
  private users: Map<string, User> = new Map();

  constructor() {
    this.googleClient = new OAuth2Client(GOOGLE_CLIENT_ID);
  }

  async verifyGoogleToken(idToken: string): Promise<User | null> {
    try {
      // Check if this is a development mock token
      if (this.isDevelopmentToken(idToken)) {
        return this.handleDevelopmentToken(idToken);
      }

      const ticket = await this.googleClient.verifyIdToken({
        idToken,
        audience: GOOGLE_CLIENT_ID,
      });

      const payload = ticket.getPayload();
      if (!payload) {
        throw new Error('Invalid token payload');
      }

      const user: User = {
        id: payload.sub,
        email: payload.email || '',
        name: payload.name || '',
        picture: payload.picture || '',
        provider: 'google',
        createdAt: new Date(),
      };

      // Store user in memory (in production, use a database)
      this.users.set(user.id, user);

      return user;
    } catch (error) {
      console.error('Error verifying Google token:', error);
      return null;
    }
  }

  private isDevelopmentToken(token: string): boolean {
    // Check if it's a mock token (starts with base64 encoded header)
    try {
      const parts = token.split('.');
      if (parts.length !== 3) return false;

      const header = JSON.parse(atob(parts[0]));
      const payload = JSON.parse(atob(parts[1]));

      return header.alg === 'HS256' && payload.sub?.startsWith('dev_user_');
    } catch {
      return false;
    }
  }

  private handleDevelopmentToken(token: string): User {
    try {
      const parts = token.split('.');
      const payload = JSON.parse(atob(parts[1]));

      const user: User = {
        id: payload.sub,
        email: payload.email,
        name: payload.name,
        picture: payload.picture,
        provider: 'google',
        createdAt: new Date(),
      };

      // Store user in memory
      this.users.set(user.id, user);

      console.log('Development mode: Created mock user', user.email);

      return user;
    } catch (error) {
      throw new Error('Invalid development token');
    }
  }

  generateJWT(user: User): string {
    return jwt.sign(
      {
        userId: user.id,
        email: user.email,
        name: user.name,
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );
  }

  verifyJWT(token: string): any {
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      return decoded;
    } catch (error) {
      console.warn('JWT verification failed:', error instanceof Error ? error.message : error);
      return null;
    }
  }

  getUser(userId: string): User | undefined {
    return this.users.get(userId);
  }

  getAllUsers(): User[] {
    return Array.from(this.users.values());
  }
}

export const authService = new AuthService();
