'use client';

import React, { createContext, useContext, useState, useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { 
  UserProfile, loginUser, signUpUser, googleAuthUser, devLogin, 
  getCurrentUser, AuthTokenResponse 
} from '@/lib/api';

interface AuthContextType {
  user: UserProfile | null;
  token: string | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  signup: (fullName: string, email: string, password: string) => Promise<void>;
  googleLogin: (idToken: string, email: string, fullName?: string, avatarUrl?: string) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const PUBLIC_ROUTES = ['/login', '/signup', '/forgot-password', '/reset-password'];

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    initAuth();
  }, []);

  useEffect(() => {
    if (!loading) {
      const isPublic = PUBLIC_ROUTES.some(r => pathname === r || pathname.startsWith('/reset-password'));
      if (!user && !isPublic) {
        router.push('/login');
      } else if (user && isPublic) {
        router.push('/');
      }
    }
  }, [user, loading, pathname]);

  const initAuth = async () => {
    setLoading(true);
    const storedToken = typeof window !== 'undefined' ? localStorage.getItem('skillproof_token') : null;
    if (storedToken) {
      setToken(storedToken);
      try {
        const currentUser = await getCurrentUser();
        setUser(currentUser);
      } catch (err) {
        console.error('Session expired or invalid:', err);
        localStorage.removeItem('skillproof_token');
        setToken(null);
        setUser(null);
      }
    } else {
      // Automatic developer auto-login fallback if no token exists
      try {
        const devUser = await devLogin();
        setUser(devUser);
      } catch (e) {
        console.warn('Dev login failed:', e);
      }
    }
    setLoading(false);
  };

  const handleAuthSuccess = (data: AuthTokenResponse) => {
    localStorage.setItem('skillproof_token', data.access_token);
    setToken(data.access_token);
    setUser(data.user);
    router.push('/');
  };

  const login = async (email: string, password: string) => {
    const res = await loginUser({ email, password });
    handleAuthSuccess(res);
  };

  const signup = async (fullName: string, email: string, password: string) => {
    const res = await signUpUser({ full_name: fullName, email, password });
    handleAuthSuccess(res);
  };

  const googleLogin = async (idToken: string, email: string, fullName?: string, avatarUrl?: string) => {
    const res = await googleAuthUser({ id_token: idToken, email, full_name: fullName, avatar_url: avatarUrl });
    handleAuthSuccess(res);
  };

  const logout = () => {
    localStorage.removeItem('skillproof_token');
    setToken(null);
    setUser(null);
    router.push('/login');
  };

  const refreshUser = async () => {
    try {
      const u = await getCurrentUser();
      setUser(u);
    } catch (e) {
      console.error('Failed to refresh user profile:', e);
    }
  };

  return (
    <AuthContext.Provider value={{ user, token, loading, login, signup, googleLogin, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
