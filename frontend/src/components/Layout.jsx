import { useEffect, useState, useRef } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getLogoUrl, uploadLogo } from "../api/studioApi";
import API from "../api/axios";

const NAV = [
  { to: "/",           icon: "📊", label: "Dashboard" },
  { to: "/members",    icon: "👥", label: "Members" },
  { to: "/payments",   icon: "💰", label: "Payments" },
  { to: "/attendance", icon: "📅", label: "Attendance" },
  { to: "/users",      icon: "👤", label: "Users" },
];

export default function Layout() {
  const [logoUrl, setLogoUrl]     = useState(null);
  const [logoError, setLogoError] = useState(false);
  const fileRef = useRef();
  const navigate = useNavigate();
  const username = localStorage.getItem("username") || "admin";
const [userRole, setUserRole] = useState(null);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    navigate("/login", { replace: true });
  }

  // Try loading the logo on mount
  useEffect(() => {
    async function loadCurrentUser() {
      try {
        const response = await API.get("/auth/me");
        setUserRole(response.data.role);
      } catch {
        setUserRole(null);
      }
    }

    loadCurrentUser();
  }, []);

  // Auto logout after 30 minutes of inactivity
  useEffect(() => {
    const INACTIVITY_LIMIT = 30 * 60 * 1000; // 1 minute for testing
    let timer;

    const logoutForInactivity = () => {
      localStorage.removeItem("token");
      localStorage.removeItem("username");
      window.location.href = "/login";
    };

    const resetTimer = () => {
      clearTimeout(timer);

      // Only run timer when user is logged in
      if (localStorage.getItem("token")) {
        timer = setTimeout(logoutForInactivity, INACTIVITY_LIMIT);
      }
    };

    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click",
    ];

    activityEvents.forEach((event) => {
      window.addEventListener(event, resetTimer);
    });

    resetTimer();

    return () => {
      clearTimeout(timer);

      activityEvents.forEach((event) => {
        window.removeEventListener(event, resetTimer);
      });
    };
  }, []);

  
  async function handleLogoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;
    try {
      await uploadLogo(file);
      setLogoError(false);
      setLogoUrl(getLogoUrl() + "?t=" + Date.now());
    } catch {
      alert("Logo upload failed. Make sure the backend is running.");
    }
  }

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="sidebar-brand">
          {/* Logo area — click to upload */}
          <div
            style={{ marginBottom: 10, cursor: "pointer" }}
            title="Click to upload logo"
            onClick={() => fileRef.current.click()}
          >
            {!logoError && logoUrl ? (
              <img
                src={logoUrl}
                alt="Studio logo"
                onError={() => setLogoError(true)}
                style={{ width: 48, height: 48, borderRadius: 8, objectFit: "contain", background: "#fff" }}
              />
            ) : (
              <div style={{
                width: 48, height: 48, borderRadius: 8, background: "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, border: "1px dashed rgba(255,255,255,0.2)",
              }}>
                🧘
              </div>
            )}
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            style={{ display: "none" }}
            onChange={handleLogoUpload}
          />
          Antar Yoga
          <small>Studio Fee Manager</small>
        </div>

        <nav>
          {NAV
  .filter(({ to }) => true)
  .map(({ to, icon, label }) => (
            <NavLink
              key={to}
              to={to}
              end={to === "/"}
              className={({ isActive }) => isActive ? "active" : ""}
            >
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        {/* User + Logout */}
        <div style={{
          padding: "16px 20px",
          borderTop: "1px solid rgba(255,255,255,0.08)",
          marginTop: "auto",
        }}>
          <div style={{ fontSize: "0.78rem", color: "#9c8fc0", marginBottom: 8 }}>
            Signed in as <strong style={{ color: "#d4c8f0" }}>{username}</strong>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{
              width: "100%",
              color: "#f87171",
              borderColor: "rgba(248,113,113,0.3)",
              fontSize: "0.82rem",
            }}
          >
            🚪 Sign Out
          </button>
        </div>
      </aside>

      <main className="main-content">
        <Outlet />
      </main>
    </div>
  );
}
