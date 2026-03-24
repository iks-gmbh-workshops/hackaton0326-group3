"use client";

import { createContext, useContext, useState, type ReactNode } from "react";
import type { User } from "./types";
import { currentUser as mockUser } from "./mock-data";

interface AuthContextValue {
  user: User | null;
  isLoggedIn: boolean;
  login: () => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextValue>({
  user: null,
  isLoggedIn: false,
  login: () => {},
  logout: () => {},
});

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(mockUser);

  const login = () => {
    // TODO: redirect to backend Keycloak login endpoint
    setUser(mockUser);
  };

  const logout = () => {
    // TODO: call backend logout + clear session
    setUser(null);
  };

  return (
    <AuthContext value={{ user, isLoggedIn: !!user, login, logout }}>
      {children}
    </AuthContext>
  );
}

export function useAuth() {
  return useContext(AuthContext);
}
