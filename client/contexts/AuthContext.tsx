import React, { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { User, AuthResult } from '@shared/auth';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isLoading: boolean;
  login: (authResult: AuthResult) => void;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

const TOKEN_KEY = 'auth_token';
const USER_KEY = 'auth_user';

export const AuthProvider: React.FC<AuthProviderProps> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initializeAuth = async () => {
      // Check for existing token on app start
      const savedToken = localStorage.getItem(TOKEN_KEY);
      const savedUser = localStorage.getItem(USER_KEY);

      if (savedToken && savedUser) {
        try {
          const parsedUser = JSON.parse(savedUser);
          setToken(savedToken);
          setUser(parsedUser);

          // Verify token with backend
          await verifyToken(savedToken);
        } catch (error) {
          console.error('Error parsing saved user data:', error);
          logout();
        }
      }

      setIsLoading(false);
    };

    initializeAuth();
  }, []);

  const verifyToken = async (tokenToVerify: string) => {
    try {
      const response = await fetch('/api/auth/verify', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${tokenToVerify}`,
          'Content-Type': 'application/json',
        },
        signal: AbortSignal.timeout(5000) // 5 second timeout
      });

      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          // Token is invalid or expired
          console.warn('Token verification failed - invalid token:', response.status);
          logout();
        } else {
          // Server error - keep existing state
          console.warn('Token verification failed - server error:', response.status);
        }
        return;
      }

      const data = await response.json();
      if (data.success && data.data?.user) {
        setUser(data.data.user);
      } else {
        console.warn('Token verification returned invalid data:', data);
        logout();
      }
    } catch (error) {
      console.warn('Token verification error (network/timeout):', error.message);
      // For network errors, don't logout - the server might be temporarily unavailable
      // Keep existing authentication state and let user continue
    }
  };

  const login = (authResult: AuthResult) => {
    setUser(authResult.user);
    setToken(authResult.token);
    
    // Save to localStorage
    localStorage.setItem(TOKEN_KEY, authResult.token);
    localStorage.setItem(USER_KEY, JSON.stringify(authResult.user));
  };

  const logout = () => {
    setUser(null);
    setToken(null);
    
    // Clear localStorage
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);

    // Call logout endpoint (fire and forget - don't block logout)
    if (token) {
      fetch('/api/auth/logout', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
        },
        signal: AbortSignal.timeout(3000) // 3 second timeout
      }).catch(error => {
        console.warn('Logout API call failed (non-blocking):', error.message);
        // Don't throw error - logout should always succeed locally
      });
    }
  };

  const value: AuthContextType = {
    user,
    token,
    isLoading,
    login,
    logout,
    isAuthenticated: !!user && !!token,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
