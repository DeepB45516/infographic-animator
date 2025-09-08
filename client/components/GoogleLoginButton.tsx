import { useEffect, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { useAuth } from '@/contexts/AuthContext';
import { googleAuth } from '@/lib/google-auth';
import { AuthResponse, GoogleLoginRequest } from '@shared/auth';
import { Loader2 } from 'lucide-react';

interface GoogleLoginButtonProps {
  onSuccess?: () => void;
  onError?: (error: string) => void;
  disabled?: boolean;
}

export const GoogleLoginButton: React.FC<GoogleLoginButtonProps> = ({
  onSuccess,
  onError,
  disabled = false,
}) => {
  const { login } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [isGoogleLoaded, setIsGoogleLoaded] = useState(false);
  const [isDevelopmentMode, setIsDevelopmentMode] = useState(false);
  const buttonRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const initializeGoogle = async () => {
      try {
        await googleAuth.initialize();
        setIsGoogleLoaded(true);
        setIsDevelopmentMode(googleAuth.isDevelopmentMode());
      } catch (error) {
        console.error('Failed to initialize Google Auth:', error);
        onError?.('Failed to load Google authentication');
      }
    };

    initializeGoogle();
  }, [onError]);

  const handleGoogleResponse = async (response: any) => {
    if (!response.credential) {
      onError?.('No credential received from Google');
      return;
    }

    setIsLoading(true);

    try {
      const loginRequest: GoogleLoginRequest = {
        idToken: response.credential,
      };

      const apiResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginRequest),
      });

      const data: AuthResponse = await apiResponse.json();

      if (data.success && data.data) {
        login(data.data);
        onSuccess?.();
      } else {
        onError?.(data.error || 'Login failed');
      }
    } catch (error) {
      console.error('Login error:', error);
      onError?.('Network error during login');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevelopmentLogin = async () => {
    setIsLoading(true);

    try {
      const mockToken = await googleAuth.signInWithPopup();
      const loginRequest: GoogleLoginRequest = {
        idToken: mockToken,
      };

      const apiResponse = await fetch('/api/auth/google', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(loginRequest),
      });

      const data: AuthResponse = await apiResponse.json();

      if (data.success && data.data) {
        login(data.data);
        onSuccess?.();
      } else {
        onError?.(data.error || 'Development login failed');
      }
    } catch (error) {
      console.error('Development login error:', error);
      onError?.('Development login failed');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isGoogleLoaded && buttonRef.current && !isDevelopmentMode) {
      // Clear any existing button
      buttonRef.current.innerHTML = '';

      // Render Google button only in production mode
      if (window.google?.accounts?.id) {
        try {
          window.google.accounts.id.initialize({
            client_id: googleAuth.getClientId(),
            callback: handleGoogleResponse,
            auto_select: false,
            cancel_on_tap_outside: true,
          });

          window.google.accounts.id.renderButton(buttonRef.current, {
            theme: 'outline',
            size: 'large',
            type: 'standard',
            width: '100%',
            text: 'continue_with',
          });
        } catch (error) {
          console.error('Error rendering Google button:', error);
        }
      }
    }
  }, [isGoogleLoaded, isDevelopmentMode]);

  const handleManualLogin = async () => {
    if (!isGoogleLoaded) {
      onError?.('Google authentication not loaded');
      return;
    }

    setIsLoading(true);

    try {
      if (window.google?.accounts?.id) {
        window.google.accounts.id.initialize({
          client_id: googleAuth.getClientId(),
          callback: handleGoogleResponse,
        });

        window.google.accounts.id.prompt((notification: any) => {
          if (notification.isNotDisplayed() || notification.isSkippedMoment()) {
            setIsLoading(false);
            onError?.('Google sign-in was cancelled or unavailable');
          }
        });
      }
    } catch (error) {
      console.error('Manual login error:', error);
      onError?.('Failed to initiate Google sign-in');
      setIsLoading(false);
    }
  };

  if (!isGoogleLoaded) {
    return (
      <Button 
        className="w-full h-12 bg-white text-slate-700 border border-slate-300"
        variant="outline"
        disabled
      >
        <Loader2 className="w-5 h-5 mr-3 animate-spin" />
        Loading Google...
      </Button>
    );
  }

  if (isDevelopmentMode) {
    // Development mode - show custom button
    return (
      <div className="relative">
        <Button
          className="w-full h-12 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-300 shadow-sm hover:shadow-md"
          variant="outline"
          onClick={handleDevelopmentLogin}
          disabled={disabled || isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="w-5 h-5 mr-3 animate-spin" />
              Signing in...
            </>
          ) : (
            <>
              <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continue with Google (Dev Mode)
            </>
          )}
        </Button>

        <div className="text-xs text-amber-600 mt-2 text-center">
          ⚠️ Development mode: No real Google Client ID configured
        </div>
      </div>
    );
  }

  return (
    <div className="relative">
      {/* Google's rendered button */}
      <div
        ref={buttonRef}
        className={`${disabled || isLoading ? 'pointer-events-none opacity-50' : ''}`}
        style={{ minHeight: '48px' }}
      />

      {/* Fallback button if Google button doesn't render */}
      <Button
        className="w-full h-12 bg-white text-slate-700 border border-slate-300 hover:bg-slate-50 transition-all duration-300 shadow-sm hover:shadow-md absolute top-0 left-0 opacity-0 hover:opacity-100"
        variant="outline"
        onClick={handleManualLogin}
        disabled={disabled || isLoading}
      >
        {isLoading ? (
          <>
            <Loader2 className="w-5 h-5 mr-3 animate-spin" />
            Signing in...
          </>
        ) : (
          <>
            <svg className="w-5 h-5 mr-3" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
            </svg>
            Continue with Google
          </>
        )}
      </Button>
    </div>
  );
};
