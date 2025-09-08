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

export interface GoogleLoginRequest {
  idToken: string;
}

export interface AuthResponse {
  success: boolean;
  data?: AuthResult;
  error?: string;
}

export interface ProfileResponse {
  success: boolean;
  data?: { user: User };
  error?: string;
}

export interface LogoutResponse {
  success: boolean;
  message?: string;
  error?: string;
}
