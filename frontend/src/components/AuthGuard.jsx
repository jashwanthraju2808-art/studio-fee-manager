/**
 * AuthGuard — redirects unauthenticated users to /login.
 *
 * Since AuthContext now pre-populates user from localStorage, we check
 * both the user object AND the token. If loading is still true (i.e.
 * /auth/me hasn't responded yet) but we have a cached user, we render
 * children immediately — the server will invalidate if the token is bad.
 */
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function AuthGuard({ children }) {
  const { user, loading } = useAuth();

  // If we have no token at all (not just loading), redirect immediately
  const hasToken = !!localStorage.getItem("token");

  if (!hasToken && !user) {
    return <Navigate to="/login" replace />;
  }

  // Still waiting for /auth/me but we have a cached user — render (axios
  // interceptor will catch 401 and redirect if the token is actually invalid)
  if (loading && !user) {
    return (
      <div style={{ padding: 40, textAlign: "center", color: "#888" }}>
        Loading…
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  return children;
}
