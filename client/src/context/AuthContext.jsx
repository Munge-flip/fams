import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { getCurrentUser, loginUser, logoutUser, registerUser } from '../services/authService';

const AuthContext = createContext(null);

const getErrorMessage = (error, fallback) => error.response?.data?.message || fallback;

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  const refreshUser = useCallback(async () => {
    try {
      const response = await getCurrentUser();
      setUser(response.data);
      return response.data;
    } catch (error) {
      if (error.response?.status === 401) {
        setUser(null);
        return null;
      }

      setUser(null);
      throw new Error(getErrorMessage(error, 'Unable to restore your session.'));
    }
  }, []);

  useEffect(() => {
    const restoreSession = async () => {
      try {
        await refreshUser();
      } catch (error) {
        // A failed session restoration leaves the visitor signed out.
      } finally {
        setLoading(false);
      }
    };

    restoreSession();
  }, [refreshUser]);

  const login = useCallback(async (credentials) => {
    try {
      await loginUser(credentials);
      return await refreshUser();
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to sign in.'));
    }
  }, [refreshUser]);

  // Registration is also the first sign-in: the API returns the active account and sets the
  // session cookie in the same request.
  const register = useCallback(async (details) => {
    try {
      const response = await registerUser(details);
      setUser(response.data);
      return response.data;
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to create your account.'));
    }
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutUser();
      setUser(null);
    } catch (error) {
      throw new Error(getErrorMessage(error, 'Unable to sign out.'));
    }
  }, []);

  const value = useMemo(() => ({
    user,
    loading,
    isAuthenticated: Boolean(user),
    login,
    register,
    logout,
    refreshUser,
  }), [user, loading, login, register, logout, refreshUser]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider.');
  }

  return context;
}
