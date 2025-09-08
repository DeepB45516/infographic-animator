// Google OAuth configuration and utilities

declare global {
  interface Window {
    google: any;
    gapi: any;
  }
}

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const IS_DEVELOPMENT = !GOOGLE_CLIENT_ID || GOOGLE_CLIENT_ID.includes('987654321') || GOOGLE_CLIENT_ID.includes('your-google-client-id');

export interface GoogleAuthConfig {
  client_id: string;
  callback: (response: any) => void;
  auto_select?: boolean;
  cancel_on_tap_outside?: boolean;
}

export class GoogleAuth {
  private static instance: GoogleAuth;
  private initialized = false;

  static getInstance(): GoogleAuth {
    if (!GoogleAuth.instance) {
      GoogleAuth.instance = new GoogleAuth();
    }
    return GoogleAuth.instance;
  }

  async initialize(): Promise<void> {
    if (this.initialized) return;

    // In development mode, skip Google script loading
    if (IS_DEVELOPMENT) {
      console.warn('Google OAuth is in development mode. Using mock authentication.');
      this.initialized = true;
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      // Load Google Identity Services script
      if (!document.querySelector('script[src*="accounts.google.com/gsi/client"]')) {
        const script = document.createElement('script');
        script.src = 'https://accounts.google.com/gsi/client';
        script.async = true;
        script.defer = true;
        script.onload = () => {
          this.initialized = true;
          resolve();
        };
        script.onerror = () => reject(new Error('Failed to load Google Identity Services'));
        document.head.appendChild(script);
      } else {
        this.initialized = true;
        resolve();
      }
    });
  }

  renderButton(elementId: string, config: GoogleAuthConfig): void {
    if (!this.initialized) {
      console.error('Google Auth not initialized. Call initialize() first.');
      return;
    }

    // In development mode, skip Google button rendering
    if (IS_DEVELOPMENT) {
      return;
    }

    if (window.google?.accounts?.id) {
      window.google.accounts.id.initialize({
        client_id: config.client_id,
        callback: config.callback,
        auto_select: config.auto_select || false,
        cancel_on_tap_outside: config.cancel_on_tap_outside || true,
      });

      window.google.accounts.id.renderButton(
        document.getElementById(elementId),
        {
          theme: 'outline',
          size: 'large',
          type: 'standard',
          width: '100%',
          text: 'continue_with',
        }
      );
    }
  }

  async signInWithPopup(): Promise<string> {
    if (!this.initialized) {
      throw new Error('Google Auth not initialized');
    }

    // In development mode, return a mock token
    if (IS_DEVELOPMENT) {
      return this.generateMockToken();
    }

    return new Promise((resolve, reject) => {
      if (window.google?.accounts?.id) {
        // Use the newer Google Identity Services
        window.google.accounts.id.initialize({
          client_id: GOOGLE_CLIENT_ID,
          callback: (response: any) => {
            if (response.credential) {
              resolve(response.credential);
            } else {
              reject(new Error('No credential received'));
            }
          },
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            // Fallback to renderButton approach
            reject(new Error('Google One Tap not displayed'));
          }
        });
      } else {
        reject(new Error('Google Identity Services not available'));
      }
    });
  }

  private generateMockToken(): string {
    // Generate a mock JWT-like token for development
    const header = btoa(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
    const payload = btoa(JSON.stringify({
      sub: `dev_user_${Date.now()}`,
      email: 'developer@example.com',
      name: 'Development User',
      picture: `https://api.dicebear.com/7.x/avataaars/svg?seed=${Date.now()}`,
      iat: Math.floor(Date.now() / 1000),
      exp: Math.floor(Date.now() / 1000) + 3600,
    }));
    const signature = btoa('mock_signature');
    return `${header}.${payload}.${signature}`;
  }

  getClientId(): string {
    return GOOGLE_CLIENT_ID;
  }

  isDevelopmentMode(): boolean {
    return IS_DEVELOPMENT;
  }
}

export const googleAuth = GoogleAuth.getInstance();
