import { useEffect, useRef, useState } from "react";
import { NavLink, Outlet, useNavigate } from "react-router-dom";
import { getLogoUrl, uploadLogo } from "../api/studioApi";
import { useAuth } from "../context/AuthContext";

const ALL_NAV = [
  { to: "/",                icon: "📊", label: "Dashboard",      adminOnly: false },
  { to: "/members",         icon: "👥", label: "Members",         adminOnly: false },
  { to: "/payments",        icon: "💰", label: "Payments",        adminOnly: false },
  { to: "/attendance",      icon: "📅", label: "Attendance",      adminOnly: false },
  { to: "/notifications",   icon: "🔔", label: "Notifications",   adminOnly: false },
  { to: "/users",           icon: "👤", label: "Users",           adminOnly: true  },
  { to: "/audit-logs",      icon: "📋", label: "Audit Logs",      adminOnly: true  },
  { to: "/data-management", icon: "📂", label: "Data Management", adminOnly: true  },
];

export default function Layout() {
  const { user, setUser, isAdmin } = useAuth();
  const [logoUrl, setLogoUrl]      = useState(null);
  const [logoError, setLogoError]  = useState(false);
  const fileRef  = useRef();
  const navigate = useNavigate();

  const username = user?.username || localStorage.getItem("username") || "user";
  const NAV      = ALL_NAV.filter((item) => !item.adminOnly || isAdmin);

  function handleLogout() {
    localStorage.removeItem("token");
    localStorage.removeItem("username");
    setUser(null);
    navigate("/login", { replace: true });
  }

  // Load studio logo
  useEffect(() => {
    const url = getLogoUrl();
    fetch(url)
      .then((r) => { if (r.ok) setLogoUrl(url + "?t=" + Date.now()); })
      .catch(() => {});
  }, []);

  // Auto-logout after 30 minutes of inactivity
  useEffect(() => {
    const LIMIT = 30 * 60 * 1000;
    let timer;

    function reset() {
      clearTimeout(timer);
      if (localStorage.getItem("token")) {
        timer = setTimeout(() => {
          localStorage.removeItem("token");
          localStorage.removeItem("username");
          window.location.href = "/login";
        }, LIMIT);
      }
    }

    const EVENTS = ["mousedown", "mousemove", "keydown", "scroll", "touchstart", "click"];
    EVENTS.forEach((e) => window.addEventListener(e, reset));
    reset();

    return () => {
      clearTimeout(timer);
      EVENTS.forEach((e) => window.removeEventListener(e, reset));
    };
  }, []); // empty deps — intentional, reset closure captures localStorage directly

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
                width: 48, height: 48, borderRadius: 8,
                background: "rgba(255,255,255,0.1)",
                display: "flex", alignItems: "center", justifyContent: "center",
                fontSize: 22, border: "1px dashed rgba(255,255,255,0.2)",
              }}>
                🧘
              </div>
            )}
          </div>
          <input ref={fileRef} type="file" accept="image/*" style={{ display: "none" }} onChange={handleLogoUpload} />
          Antar Yoga
          <small>Studio Fee Manager</small>
        </div>

        <nav>
          {NAV.map(({ to, icon, label }) => (
            <NavLink key={to} to={to} end={to === "/"} className={({ isActive }) => (isActive ? "active" : "")}>
              <span>{icon}</span>
              <span>{label}</span>
            </NavLink>
          ))}
        </nav>

        <div style={{ padding: "16px 20px", borderTop: "1px solid rgba(255,255,255,0.08)", marginTop: "auto" }}>
          {user?.role && (
            <div style={{
              display: "inline-block", padding: "2px 10px", borderRadius: 20, marginBottom: 6,
              background: isAdmin ? "rgba(139,92,246,0.2)" : "rgba(14,165,233,0.15)",
              color: isAdmin ? "#c4b5fd" : "#7dd3fc",
              fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em",
            }}>
              {user.role}
            </div>
          )}
          <div style={{ fontSize: "0.78rem", color: "#9c8fc0", marginBottom: 8 }}>
            Signed in as <strong style={{ color: "#d4c8f0" }}>{username}</strong>
          </div>
          <button
            onClick={handleLogout}
            className="btn btn-outline btn-sm"
            style={{ width: "100%", color: "#f87171", borderColor: "rgba(248,113,113,0.3)", fontSize: "0.82rem" }}
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
