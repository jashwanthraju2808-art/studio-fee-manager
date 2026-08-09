import { useEffect, useState } from "react";
import { getDashboard } from "../api/dashboardApi";
import { sendBulkReminders, sendSingleReminder } from "../api/notificationApi";

export default function Dashboard() {
  const [data, setData]         = useState(null);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");
  const [loading, setLoading]   = useState(true);
  const [sending, setSending]   = useState(false);
  const [sendingId, setSendingId] = useState(null);

  useEffect(() => { load(); }, []);

  async function load() {
    setLoading(true);
    try {
      const res = await getDashboard();
      setData(res.data);
    } catch {
      setError("Could not connect to the API. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  async function handleSendAllReminders() {
    if (!window.confirm(`Send WhatsApp reminders to all ${data.unpaid_members.length} unpaid members?`)) return;
    setSending(true);
    try {
      const res = await sendBulkReminders(data.current_month);
      const sent    = res.data.results.filter((r) => r.whatsapp.status === "sent").length;
      const skipped = res.data.results.filter((r) => r.whatsapp.status === "skipped").length;
      const failed  = res.data.results.filter((r) => r.whatsapp.status === "failed").length;
      flash(`Reminders: ${sent} sent, ${skipped} skipped (no Twilio config), ${failed} failed.`, "success");
    } catch {
      flash("Failed to send reminders. Check Twilio config in .env", "error");
    } finally {
      setSending(false);
    }
  }

  async function handleSingleReminder(member) {
    setSendingId(member.id);
    try {
      const res = await sendSingleReminder(member.id);
      const st = res.data.whatsapp?.status;
      if (st === "sent")    flash(`Reminder sent to ${member.first_name}!`, "success");
      else if (st === "skipped") flash(`Skipped — add META_WA_TOKEN and META_WA_PHONE_ID to backend/.env to send real messages.`, "success");
      else flash(`Failed to send to ${member.first_name}: ${res.data.whatsapp?.reason}`, "error");
    } catch {
      flash("Failed to send reminder.", "error");
    } finally {
      setSendingId(null);
    }
  }

  function flash(msg, type) {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 5000); }
    else                    { setError(msg);   setTimeout(() => setError(""),   5000); }
  }

  if (loading) return <div className="loading">Loading dashboard…</div>;
  if (error && !data) return <div className="alert alert-error">{error}</div>;
  if (!data) return null;

  const maxCollected = Math.max(...data.monthly_summary.map((m) => m.collected), 1);

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>
        <span style={{ color: "#888", fontSize: "0.85rem" }}>
          {new Date().toLocaleDateString("en-IN", { month: "long", year: "numeric" })}
        </span>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Stat cards */}
      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-value">{data.total_active_members}</div>
          <div className="stat-label">Active Members</div>
        </div>
        <div className="stat-card success">
          <div className="stat-value">₹{data.total_collected_this_month.toLocaleString()}</div>
          <div className="stat-label">Collected This Month</div>
        </div>
        <div className="stat-card">
          <div className="stat-value">₹{data.total_expected_this_month.toLocaleString()}</div>
          <div className="stat-label">Expected This Month</div>
        </div>
        <div className="stat-card danger">
          <div className="stat-value">₹{data.pending_this_month.toLocaleString()}</div>
          <div className="stat-label">Pending This Month</div>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 20 }}>
        {/* 6-month bar chart */}
        <div className="card">
          <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 16 }}>
            Monthly Collections (6 months)
          </h2>
          <div className="bar-chart">
            {data.monthly_summary.map((m) => (
              <div className="bar-col" key={m.month}>
                <div
                  className="bar"
                  title={`₹${m.collected.toLocaleString()}`}
                  style={{ height: `${(m.collected / maxCollected) * 90}%` }}
                />
                <div className="bar-label">{m.month.slice(5)}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid members */}
        <div className="card">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 12 }}>
            <h2 style={{ fontSize: "1rem", fontWeight: 600, margin: 0 }}>
              Unpaid This Month
              <span className="badge badge-danger" style={{ marginLeft: 8 }}>
                {data.unpaid_members.length}
              </span>
            </h2>
            {data.unpaid_members.length > 0 && (
              <button
                className="btn btn-success btn-sm"
                onClick={handleSendAllReminders}
                disabled={sending}
                title="Send WhatsApp reminder to all unpaid members"
              >
                {sending ? "Sending…" : "📲 Send All Reminders"}
              </button>
            )}
          </div>

          {data.unpaid_members.length === 0 ? (
            <p style={{ color: "#16a34a", fontSize: "0.9rem" }}>
              ✅ Everyone has paid this month!
            </p>
          ) : (
            <ul style={{ listStyle: "none", padding: 0, margin: 0 }}>
              {data.unpaid_members.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "6px 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.88rem",
                  }}
                >
                  <span>{m.first_name} {m.last_name}</span>
                  <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                    <span style={{ color: "#888" }}>₹{m.fee}</span>
                    <button
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.75rem", padding: "2px 8px" }}
                      onClick={() => handleSingleReminder(m)}
                      disabled={sendingId === m.id}
                      title="Send WhatsApp reminder"
                    >
                      {sendingId === m.id ? "…" : "📲"}
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="card">
        <h2 style={{ fontSize: "1rem", fontWeight: 600, marginBottom: 12 }}>
          Recent Payments
        </h2>
        {data.recent_payments.length === 0 ? (
          <div className="empty">No payments recorded yet.</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Month</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {data.recent_payments.map((p) => (
                  <tr key={p.id}>
                    <td>{p.member_name}</td>
                    <td>₹{p.amount.toLocaleString()}</td>
                    <td>{p.month}</td>
                    <td>{p.payment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </>
  );
}
