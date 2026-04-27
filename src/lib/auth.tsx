import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import {
  apiSignUp,
  apiSignIn,
  apiGetProfile,
  apiUpdateProfile,
  setToken,
  clearToken,
  getToken,
  type ApiUser,
} from "./api";

export type User = ApiUser;

type AuthContextType = {
  user: User | null;
  loading: boolean;
  signUp: (name: string, email: string, password: string) => Promise<{ error?: string }>;
  signIn: (email: string, password: string) => Promise<{ error?: string }>;
  signOut: () => void;
  updateProfile: (updates: Partial<Pick<User, "name" | "email">>) => Promise<{ error?: string }>;
};

const AuthContext = createContext<AuthContextType | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // On mount: restore session from stored JWT
  useEffect(() => {
    const token = getToken();
    if (!token) {
      setLoading(false);
      return;
    }

    // Timeout after 5s so a slow/offline backend doesn't block the UI forever
    const timeout = setTimeout(() => {
      setLoading(false);
    }, 5000);

    apiGetProfile()
      .then((profile) => setUser(profile))
      .catch(() => {
        // Token expired or invalid — clear it
        clearToken();
      })
      .finally(() => {
        clearTimeout(timeout);
        setLoading(false);
      });

    return () => clearTimeout(timeout);
  }, []);

  const signUp: AuthContextType["signUp"] = async (name, email, password) => {
    try {
      const { token, user: newUser } = await apiSignUp(name, email, password);
      setToken(token);
      setUser(newUser);
      return {};
    } catch (err: any) {
      return { error: err.message || "Sign up failed. Please try again." };
    }
  };

  const signIn: AuthContextType["signIn"] = async (email, password) => {
    try {
      const { token, user: loggedIn } = await apiSignIn(email, password);
      setToken(token);
      setUser(loggedIn);
      return {};
    } catch (err: any) {
      return { error: err.message || "Sign in failed. Please try again." };
    }
  };

  const signOut = () => {
    clearToken();
    setUser(null);
  };

  const updateProfile: AuthContextType["updateProfile"] = async (updates) => {
    try {
      const updated = await apiUpdateProfile(updates);
      setUser(updated);
      return {};
    } catch (err: any) {
      return { error: err.message || "Failed to update profile." };
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut, updateProfile }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
