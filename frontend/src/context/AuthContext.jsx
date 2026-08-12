/**
 * AuthContext — provides { user, setUser, isAdmin, loading } to the entire app.
 *
 * user shape: { id, username, role } | null
 *
 * Strategy:
 *   1. On mount, check localStorage for a persisted role so the nav renders
 *      correctly immediately — without waiting for the /auth/me round-trip.
 *   2. Then call /auth/me to confirm the token is still valid and refresh
 *      the role from the server (single source of truth).
 *   3. If /auth/me fails the token is cleared and user is set to null.
 *
 * Why persist role in localStorage?
 *   The JWT token is opaque to the frontend (HS256). Without a server call
 *   we cannot know the role. Persisting it means:
 *     - Nav renders instantly on refresh with the correct items
 *     - No "flash" of the wrong (staff) nav while /auth/me is loading
 *   The server still authorises every request — localStorage role is UI only.
 *
 * Role-based access control in the UI is driven by user.role === "admin".
 * Backend ALWAYS enforces its own authorization — this is supplementary UI only.
 */
import { createContext, useContext, useEffect, useState } from "react";
import API from "../api/axios";

const AuthContext = createContext(null);

/** Read a cached user object from localStorage (may be stale — always verify with /auth/me). */
function getCachedUser() {
  const token    = localStorage.getItem("token");
  const username = localStorage.getItem("username");
  const role     = localStorage.getItem("role");
  if (token && username && role) {
    return { id: null, username, role };   // id unknown until /auth/me responds
  }
  return null;
}

export function AuthProvider({ children }) {
  // Pre-populate from localStorage so nav renders correctly on page refresh
  const [user, setUserState] = useState(getCachedUser);
  // loading = true while /auth/me is in-flight; false once resolved
  const [loading, setLoading] = useState(!!localStorage.getItem("token"));

  /** Wrap setUser so we also persist username+role to localStorage. */
  const setUser = (newUser) => {
    setUserState(newUser);
    if (newUser) {
      localStorage.setItem("username", newUser.username);
      localStorage.setItem("role",     newUser.role);
    } else {
      localStorage.removeItem("username");
      localStorage.removeItem("role");
    }
  };

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token) {
      setLoading(false);
      return;
    }

    API.get("/auth/me")
      .then((res) => {
        const { id, username, role } = res.data;
        setUser({ id, username, role });
      })
      .catch(() => {
        // Token invalid / expired — clear everything
        localStorage.removeItem("token");
        localStorage.removeItem("username");
        localStorage.removeItem("role");
        setUserState(null);
      })
      .finally(() => setLoading(false));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const isAdmin = user?.role === "admin";

  return (
    <AuthContext.Provider value={{ user, setUser, isAdmin, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside <AuthProvider>");
  return ctx;
}
