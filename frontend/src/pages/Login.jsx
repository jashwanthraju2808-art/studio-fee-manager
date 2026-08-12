import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../context/AuthContext";

const API_BASE = "https://antar-yoga-api.onrender.com";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError]       = useState("");
  const [loading, setLoading]   = useState(false);

  const navigate    = useNavigate();
  const { setUser } = useAuth();

  async function handleSubmit(e) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const params = new URLSearchParams();
      params.append("username", username.trim());
      params.append("password", password);

      const response = await axios.post(
        `${API_BASE}/auth/login`,
        params,
        { headers: { "Content-Type": "application/x-www-form-urlencoded" } }
      );

      const { access_token, username: uname, role } = response.data;

      localStorage.setItem("token",    access_token);
      localStorage.setItem("username", uname);

      setUser({ id: null, username: uname, role });
      navigate("/", { replace: true });
    } catch (err) {
      setError(err.response?.data?.detail || "Login failed. Check your credentials.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg, #1e1b2e 0%, #2d2645 100%)" }}>
      <div style={{ background: "#fff", borderRadius: 16, padding: "40px 36px", width: 380, maxWidth: "95vw", boxShadow: "0 24px 64px rgba(0,0,0,0.3)" }}>
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 40, marginBottom: 8 }}>🧘</div>
          <h1 style={{ margin: 0, fontSize: "1.4rem", fontWeight: 700, color: "#1e1b2e" }}>Antar Yoga</h1>
          <p style={{ margin: "4px 0 0", fontSize: "0.85rem", color: "#888" }}>Studio Fee Manager</p>
        </div>

        {error && (
          <div className="alert alert-error" style={{ marginBottom: 16 }}>{error}</div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              required
              autoFocus
            />
          </div>
          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••"
              required
            />
          </div>
          <button
            type="submit"
            className="btn btn-primary"
            disabled={loading}
            style={{ width: "100%", padding: "10px", fontSize: "0.95rem", marginTop: 8 }}
          >
            {loading ? "Signing in…" : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}
