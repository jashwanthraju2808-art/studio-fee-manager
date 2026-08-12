import { useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";

const API_BASE = "https://antar-yoga-api.onrender.com";

export default function Login() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  async function handleSubmit(e) {
    e.preventDefault();

    setError("");
    setLoading(true);

    try {
      // FastAPI OAuth2 login requires form-urlencoded data
      const params = new URLSearchParams();
      params.append("username", username.trim());
      params.append("password", password);

      const response = await axios.post(
        `${API_BASE}/auth/login`,
        params,
        {
          headers: {
            "Content-Type": "application/x-www-form-urlencoded",
          },
          timeout: 30000,
        }
      );

      console.log("LOGIN RESPONSE:", response.data);

      const token = response.data.access_token;
      const loggedInUsername = response.data.username || username.trim();

      if (!token) {
        throw new Error("No access token returned by server.");
      }

      // Save token
      localStorage.setItem("token", token);
      localStorage.setItem("username", loggedInUsername);

      // Verify token directly
      const meResponse = await axios.get(
        `${API_BASE}/auth/me`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
          },
          timeout: 30000,
        }
      );

      console.log("AUTH ME RESPONSE:", meResponse.data);

      // Save user information
      localStorage.setItem(
        "user",
        JSON.stringify(meResponse.data)
      );

      // Login successful
      navigate("/", { replace: true });

    } catch (err) {
      console.error("LOGIN ERROR:", err);

      // Remove invalid token
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      localStorage.removeItem("user");

      if (err.response) {
        console.error("STATUS:", err.response.status);
        console.error("SERVER RESPONSE:", err.response.data);

        if (err.response.status === 401) {
          setError("Invalid username or password.");
        } else if (err.response.status === 422) {
          setError("Please enter a valid username and password.");
        } else {
          setError(
            err.response.data?.detail ||
              `Login failed (${err.response.status}).`
          );
        }
      } else if (err.code === "ECONNABORTED") {
        setError("Server is taking too long to respond. Please try again.");
      } else {
        setError(
          err.message || "Unable to connect to the server."
        );
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background:
          "linear-gradient(135deg, #1e1b2e 0%, #2d2645 100%)",
        padding: "20px",
      }}
    >
      <div
        style={{
          background: "#fff",
          borderRadius: "16px",
          padding: "40px 36px",
          width: "380px",
          maxWidth: "95vw",
          boxShadow: "0 24px 64px rgba(0,0,0,0.3)",
        }}
      >
        <div
          style={{
            textAlign: "center",
            marginBottom: "28px",
          }}
        >
          <div
            style={{
              fontSize: "40px",
              marginBottom: "8px",
            }}
          >
            🧘
          </div>

          <h1
            style={{
              margin: 0,
              fontSize: "1.4rem",
              fontWeight: 700,
              color: "#1e1b2e",
            }}
          >
            Antar Yoga
          </h1>

          <p
            style={{
              margin: "4px 0 0",
              fontSize: "0.85rem",
              color: "#888",
            }}
          >
            Studio Fee Manager
          </p>
        </div>

        {error && (
          <div
            style={{
              marginBottom: "16px",
              padding: "12px",
              borderRadius: "8px",
              background: "#fef2f2",
              color: "#991b1b",
              border: "1px solid #fecaca",
              fontSize: "14px",
            }}
          >
            ❌ {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Username
            </label>

            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="admin"
              autoComplete="username"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />
          </div>

          <div style={{ marginBottom: "16px" }}>
            <label
              style={{
                display: "block",
                marginBottom: "6px",
                fontWeight: 600,
                color: "#333",
              }}
            >
              Password
            </label>

            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Password"
              autoComplete="current-password"
              required
              style={{
                width: "100%",
                boxSizing: "border-box",
                padding: "11px",
                border: "1px solid #ccc",
                borderRadius: "8px",
                fontSize: "15px",
              }}
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            style={{
              width: "100%",
              padding: "12px",
              border: "none",
              borderRadius: "8px",
              background: loading ? "#999" : "#4f46e5",
              color: "#fff",
              fontSize: "15px",
              fontWeight: 600,
              cursor: loading ? "not-allowed" : "pointer",
            }}
          >
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
}