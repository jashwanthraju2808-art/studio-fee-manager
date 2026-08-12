import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  // Determine synchronously whether we need to wait for /auth/me.
  // If there is no token there is nothing to wait for — start loading=false.
  const hasToken = !!localStorage.getItem("token");

  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(hasToken); // false immediately when no token

  useEffect(() => {
    if (!hasToken) {
      // No token — nothing to do, already loading=false
      return;
    }

    let cancelled = false;

    API.get("/auth/me")
      .then((res) => {
        if (!cancelled) {
          setUser({
            id:       res.data.id,
            username: res.data.username,
            role:     res.data.role,
          });
        }
      })
      .catch(() => {
        if (!cancelled) {
          // Token invalid or backend unreachable — clear and redirect to login
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          setUser(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const value = {
    user,
    setUser,
    isAdmin: user?.role === "admin",
    loading,
  };

  return (
    <AuthContext.Provider value={value}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  // If ctx is null it means useAuth was called outside AuthProvider.
  // Return a safe no-op default rather than throwing, so the app doesn't
  // crash with a blank screen.
  if (!ctx) {
    return { user: null, setUser: () => {}, isAdmin: false, loading: false };
  }
  return ctx;
}
