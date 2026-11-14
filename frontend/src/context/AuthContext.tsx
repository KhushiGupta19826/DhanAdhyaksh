import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import {
  loginApi,
  logoutApi,
  getMeApi,
  setAuthToken,
  clearAuthToken,
  getStoredToken,
  registerSessionExpiryHandler,
} from '../services/api';

// ── Types ──────────────────────────────────────────────────────────────────────

interface AuthState {
  isAuthenticated: boolean;
  isLoading: boolean;      // true while checking session on boot
  email: string | null;
  error: string | null;
}

interface AuthContextValue extends AuthState {
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

// ── Context ────────────────────────────────────────────────────────────────────

const AuthContext = createContext<AuthContextValue | null>(null);

// ── Provider ───────────────────────────────────────────────────────────────────

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [state, setState] = useState<AuthState>({
    isAuthenticated: false,
    isLoading: true,
    email: null,
    error: null,
  });

  // Triggered by apiFetch when any API call returns 401 (session expired mid-use)
  const handleSessionExpired = useCallback(() => {
    setState({
      isAuthenticated: false,
      isLoading: false,
      email: null,
      error: 'Your session has expired. Please log in again.',
    });
  }, []);

  // ── On mount: restore session from stored token ──────────────────────────────
  useEffect(() => {
    // Register our expiry handler with the API layer
    registerSessionExpiryHandler(handleSessionExpired);

    const storedToken = getStoredToken();

    if (!storedToken) {
      // No token stored — user is not authenticated
      setState({ isAuthenticated: false, isLoading: false, email: null, error: null });
      return;
    }

    // Verify the stored token is still valid via /api/auth/me
    getMeApi()
      .then((me) => {
        setState({
          isAuthenticated: true,
          isLoading: false,
          email: me.email,
          error: null,
        });
      })
      .catch(() => {
        // Token is expired or invalid
        clearAuthToken();
        setState({
          isAuthenticated: false,
          isLoading: false,
          email: null,
          error: null,
        });
      });
  }, [handleSessionExpired]);

  // ── Login ──────────────────────────────────────────────────────────────────────
  const login = useCallback(async (email: string, password: string): Promise<void> => {
    // NOTE: We do NOT set isLoading: true here — doing so would cause AppGate
    // to unmount LoginPage (flash spinner), wiping its local error state.
    // isLoading is only used for the initial boot session-restore check.
    setState((prev) => ({ ...prev, error: null }));

    try {
      const { token } = await loginApi(email, password);
      setAuthToken(token);

      // Confirm session is active and get email
      const me = await getMeApi();

      setState({
        isAuthenticated: true,
        isLoading: false,
        email: me.email,
        error: null,
      });
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Login failed';
      setState((prev) => ({
        ...prev,
        isAuthenticated: false,
        isLoading: false,
        email: null,
        error: message,
      }));
      throw err; // Let LoginPage handle UX
    }
  }, []);

  // ── Logout ─────────────────────────────────────────────────────────────────────
  const logout = useCallback(async (): Promise<void> => {
    try {
      await logoutApi();
    } catch {
      // Even if the server call fails, clear client-side state
    } finally {
      clearAuthToken();
      setState({
        isAuthenticated: false,
        isLoading: false,
        email: null,
        error: null,
      });
    }
  }, []);

  return (
    <AuthContext.Provider value={{ ...state, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// ── Hook ───────────────────────────────────────────────────────────────────────

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used inside <AuthProvider>');
  }
  return ctx;
}
