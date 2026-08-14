import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { getDashboard } from "../api/dashboardApi";
import { sendBulkReminders, sendSingleReminder } from "../api/notificationApi";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { isAdmin } = useAuth();

  const [data, setData]        = useState(null);
  const [error, setError]      = useState("");
  const [success, setSuccess]  = useState("");
  const [loading, setLoading]  = useState(true);
  const [sending, setSending]  = useState(false);
  const [sendingId, setSendingId] = useState(null);

  const navigate   = useNavigate();

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    setError("");
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch {
      setError("Could not connect to the API. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  function getWhatsAppNumber(phone) {
    if (!phone) return "";
    let n = String(phone).trim().replace(/[\s\-()]/g, "");
    if (n.startsWith("+")) n = n.substring(1);
    if (n.length === 10)   n = "91" + n;
    return n;
  }

  function buildReminderMessage(member) {
    return `Hello ${member.first_name} 🙏\n\nThis is a friendly reminder from *ANTAR YOGA* that your monthly fee of *₹${member.fee}* for *${data.current_month}* is due.\n\nPlease make the payment at your earliest convenience.\n\nThank you 🙏\n— Antar Yoga`;
  }

  function openWhatsApp(member) {
    const number = getWhatsAppNumber(member.phone_number);
    if (!number) { alert(`No valid phone for ${member.first_name}.`); return; }
    window.open(`https://wa.me/${number}?text=${encodeURIComponent(buildReminderMessage(member))}`, "_blank", "noopener,noreferrer");
  }

  async function handleSendAllReminders() {
    if (!window.confirm(`Send WhatsApp reminders to all ${data.unpaid_members.length} unpaid members?`)) return;
    setSending(true);
    try {
      const res  = await sendBulkReminders(data.current_month);
      const sent    = res.data.results.filter((r) => r.whatsapp.status === "sent").length;
      const skipped = res.data.results.filter((r) => r.whatsapp.status === "skipped").length;
      const failed  = res.data.results.filter((r) => r.whatsapp.status === "failed").length;
      flash(`Reminders: ${sent} sent, ${skipped} skipped, ${failed} failed.`, "success");
      load();
    } catch {
      flash("Failed to send reminders.", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleSingleReminder(member) {
    setSendingId(member.id);
    try {
      const res = await sendSingleReminder(member.id);
      const st  = res.data.whatsapp?.status;
      if (st === "sent") flash(`Reminder sent to ${member.first_name}!`, "success");
      else openWhatsApp(member);
    } catch {
      openWhatsApp(member);
    } finally {
      setSendingId(null);
    }
  }

  function flash(msg, type) {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 5000); }
    else                    { setError(msg);   setTimeout(() => setError(""),   5000); }
  }

  if (loading) return (
    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", height: "60vh", flexDirection: "column", gap: 12, color: "var(--text-muted)" }}>
      <span style={{ fontSize: 32, color: "var(--gold)", opacity: 0.7 }}>✿</span>
      <span>Loading dashboard…</span>
    </div>
  );
  if (error && !data) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const maxCollected = Math.max(...data.monthly_summary.map((m) => m.collected), 1);

  return (
    <>
      {/* ── Header ─────────────────────────────────────────── */}
      <div className="page-header">
        <div>
          <h1>Dashboard</h1>
          <p style={{ color: "var(--text-muted)", fontSize: "0.85rem", marginTop: 2 }}>
            {new Date().toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long", year: "numeric" })}
          </p>
        </div>
        <button className="btn btn-outline btn-sm" onClick={load}>↺ Refresh</button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Stat cards ─────────────────────────────────────── */}
      <div className="stat-grid">
        <div
          className="stat-card accent"
          onClick={() => navigate("/members")}
          style={{ cursor: "pointer" }}
          title="View all members"
        >
          <div className="stat-value">{data.total_active_members}</div>
          <div className="stat-label">Active Members</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">₹{data.total_collected_this_month.toLocaleString("en-IN")}</div>
          <div className="stat-label">Collected This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{data.total_expected_this_month.toLocaleString("en-IN")}</div>
          <div className="stat-label">Expected This Month</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">₹{data.pending_this_month.toLocaleString("en-IN")}</div>
          <div className="stat-label">Pending This Month</div>
        </div>
      </div>

      {/* ── Notification mini-stats — hidden when all zero ── */}
      {data.notification_stats &&
       (data.notification_stats.sent > 0 ||
        data.notification_stats.failed > 0 ||
        data.notification_stats.skipped > 0) && (
        <div style={{ display: "flex", gap: 10, marginBottom: 22, flexWrap: "wrap" }}>
          {[
            { label: "Reminders Sent",    value: data.notification_stats.sent,    color: "var(--success)", bg: "var(--success-bg)" },
            { label: "Reminders Failed",  value: data.notification_stats.failed,  color: "var(--danger)",  bg: "var(--danger-bg)"  },
            { label: "Reminders Skipped", value: data.notification_stats.skipped, color: "var(--warning)", bg: "var(--warning-bg)" },
          ].map(({ label, value, color, bg }) => (
            <div key={label} style={{
              flex: "1 1 130px", padding: "12px 16px", background: bg,
              borderRadius: "var(--radius)", border: `1px solid ${color}22`,
              display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
            }}>
              <span style={{ fontFamily: "var(--font-serif)", fontSize: "1.4rem", fontWeight: 700, color }}>{value}</span>
              <span style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}</span>
            </div>
          ))}
        </div>
      )}

      {/* ── Two-column grid ────────────────────────────────── */}
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20, marginBottom: 22 }}>

        {/* Monthly collections bar chart */}
        <div className="card">
          <h2 style={{ marginBottom: 18, fontSize: "0.95rem", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
            Collections — 6 Months
          </h2>
          <div className="bar-chart">
            {data.monthly_summary.map((m) => (
              <div className="bar-col" key={m.month}>
                <div
                  className="bar"
                  title={`₹${m.collected.toLocaleString("en-IN")}`}
                  style={{ height: `${(m.collected / maxCollected) * 90}%` }}
                />
                <div className="bar-label">{m.month.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid members */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 14, gap: 8 }}>
            <h2 style={{ margin: 0, fontSize: "0.95rem", letterSpacing: "0.03em", textTransform: "uppercase", color: "var(--text-muted)", fontFamily: "var(--font-sans)", fontWeight: 600 }}>
              Unpaid This Month
              <span className="badge badge-danger" style={{ marginLeft: 8, verticalAlign: "middle" }}>
                {data.unpaid_members.length}
              </span>
            </h2>
            {data.unpaid_members.length > 0 && (
              <button
                className="btn btn-success btn-sm"
                onClick={handleSendAllReminders}
                disabled={sending}
              >
                {sending ? "Sending…" : "📲 Remind All"}
              </button>
            )}
          </div>

          {data.unpaid_members.length === 0 ? (
            <div style={{ color: "var(--success)", fontSize: "0.875rem", display: "flex", alignItems: "center", gap: 8 }}>
              {data.total_active_members === 0
                ? <><span style={{ fontSize: 18 }}>ℹ</span> No active members yet.</>
                : <><span style={{ fontSize: 18 }}>✓</span> Everyone has paid this month!</>
              }
            </div>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0, maxHeight: 260, overflowY: "auto" }}>
              {data.unpaid_members.map((m) => (
                <li key={m.id} style={{
                  display: "flex", justifyContent: "space-between", alignItems: "center",
                  padding: "8px 0", borderBottom: "1px solid var(--border-light)",
                }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: "0.875rem" }}>{m.first_name} {m.last_name}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 1 }}>₹{m.fee} pending</div>
                  </div>
                  <button
                    className="btn btn-outline btn-sm"
                    onClick={() => handleSingleReminder(m)}
                    disabled={sendingId === m.id}
                    style={{ flexShrink: 0 }}
                  >
                    {sendingId === m.id ? "…" : "📲"}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>

      </div>

      {/* ── Admin quick-link to Audit Logs ─────────────────── */}
      {/* NOTE: Audit detail removed from dashboard — lives at /audit-logs */}
      {isAdmin && (
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "14px 20px", background: "var(--gold-pale)",
          border: "1px solid var(--gold-light)", borderRadius: "var(--radius)",
          marginBottom: 8,
        }}>
          <div>
            <div style={{ fontWeight: 600, fontSize: "0.875rem", color: "var(--text)" }}>Audit Logs</div>
            <div style={{ fontSize: "0.78rem", color: "var(--text-muted)", marginTop: 2 }}>
              Full activity history is available in the Audit Logs section.
            </div>
          </div>
          <a href="/audit-logs" className="btn btn-gold btn-sm" style={{ textDecoration: "none" }}>
            View Logs →
          </a>
        </div>
      )}
    </>
  );
}
