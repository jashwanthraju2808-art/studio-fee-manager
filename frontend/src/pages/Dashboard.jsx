import { useEffect, useState } from "react";
import { getDashboard } from "../api/dashboardApi";
import { useAuth } from "../context/AuthContext";

export default function Dashboard() {
  const { isAdmin } = useAuth();

  const [data, setData] = useState(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    setError("");

    try {
      const res = await getDashboard();
      setData(res.data);
    } catch (err) {
      setError("Could not connect to the API. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }

  // Convert Indian phone number to WhatsApp format.
  // Example:
  // 9876543210     -> 919876543210
  // +919876543210 -> 919876543210
  function getWhatsAppNumber(phone) {
    if (!phone) return "";

    let number = String(phone)
      .trim()
      .replace(/\s+/g, "")
      .replace(/-/g, "")
      .replace(/[()]/g, "");

    if (number.startsWith("+")) {
      number = number.substring(1);
    }

    if (number.startsWith("91") && number.length === 12) {
      return number;
    }

    if (number.length === 10) {
      return `91${number}`;
    }

    return number;
  }

  function createReminderMessage(member) {
    const monthLabel = data.current_month;

    return `Hello ${member.first_name} 🙏

This is a friendly reminder from *Antar Yoga* that your monthly fee of *₹${member.fee}* for *${monthLabel}* is pending.

Please make the payment at your earliest convenience.

Thank you 😊
— Antar Yoga`;
  }

  function openWhatsApp(member) {
    const number = getWhatsAppNumber(member.phone_number);

    if (!number) {
      alert(`No valid phone number found for ${member.first_name}.`);
      return;
    }

    const message = createReminderMessage(member);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(message)}`;

    window.open(url, "_blank", "noopener,noreferrer");
  }

  function openAllWhatsApp() {
    if (!data?.unpaid_members?.length) return;

    alert(
      "WhatsApp will open for each unpaid member. " +
      "You must press Send in WhatsApp for each message."
    );

    data.unpaid_members.forEach((member, index) => {
      setTimeout(() => {
        openWhatsApp(member);
      }, index * 800);
    });
  }

  if (loading) {
    return <div className="loading">Loading dashboard…</div>;
  }

  if (error && !data) {
    return <div className="alert alert-error">{error}</div>;
  }

  if (!data) return null;

  const maxCollected = Math.max(
    ...data.monthly_summary.map((m) => m.collected),
    1
  );

  const ns = data.notification_stats;

  return (
    <>
      <div className="page-header">
        <h1>Dashboard</h1>

        <span style={{ color: "#888", fontSize: "0.85rem" }}>
          {new Date().toLocaleDateString("en-IN", {
            month: "long",
            year: "numeric",
          })}
        </span>
      </div>

      {error && <div className="alert alert-error">{error}</div>}

      {/* Main stat cards */}
      <div className="stat-grid">
        <div className="stat-card accent">
          <div className="stat-value">
            {data.total_active_members}
          </div>
          <div className="stat-label">Active Members</div>
        </div>

        <div className="stat-card success">
          <div className="stat-value">
            ₹{data.total_collected_this_month.toLocaleString()}
          </div>
          <div className="stat-label">Collected This Month</div>
        </div>

        <div className="stat-card">
          <div className="stat-value">
            ₹{data.total_expected_this_month.toLocaleString()}
          </div>
          <div className="stat-label">Expected This Month</div>
        </div>

        <div className="stat-card danger">
          <div className="stat-value">
            ₹{data.pending_this_month.toLocaleString()}
          </div>
          <div className="stat-label">Pending This Month</div>
        </div>
      </div>

      {/* Notification stats */}
      {ns && (
        <div
          style={{
            display: "flex",
            gap: 12,
            marginBottom: 20,
            flexWrap: "wrap",
          }}
        >
          {[
            {
              label: "Reminders Sent",
              value: ns.sent,
              color: "#16a34a",
              bg: "#f0fdf4",
            },
            {
              label: "Reminders Failed",
              value: ns.failed,
              color: "#dc2626",
              bg: "#fef2f2",
            },
            {
              label: "Reminders Skipped",
              value: ns.skipped,
              color: "#d97706",
              bg: "#fffbeb",
            },
          ].map(({ label, value, color, bg }) => (
            <div
              key={label}
              style={{
                flex: 1,
                minWidth: 140,
                padding: "12px 16px",
                background: bg,
                borderRadius: 10,
                border: `1px solid ${color}22`,
                display: "flex",
                flexDirection: "column",
                alignItems: "center",
              }}
            >
              <div
                style={{
                  fontSize: "1.5rem",
                  fontWeight: 700,
                  color,
                }}
              >
                {value}
              </div>

              <div
                style={{
                  fontSize: "0.78rem",
                  color: "#666",
                  marginTop: 2,
                }}
              >
                {label}
              </div>
            </div>
          ))}
        </div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Monthly collections */}
        <div className="card">
          <h2
            style={{
              fontSize: "1rem",
              fontWeight: 600,
              marginBottom: 16,
            }}
          >
            Monthly Collections (6 months)
          </h2>

          <div className="bar-chart">
            {data.monthly_summary.map((m) => (
              <div className="bar-col" key={m.month}>
                <div
                  className="bar"
                  title={`₹${m.collected.toLocaleString()}`}
                  style={{
                    height: `${(m.collected / maxCollected) * 90}%`,
                  }}
                />

                <div className="bar-label">
                  {m.month.slice(5)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Unpaid members */}
        <div className="card">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginBottom: 12,
              gap: 10,
            }}
          >
            <h2
              style={{
                fontSize: "1rem",
                fontWeight: 600,
                margin: 0,
              }}
            >
              Unpaid This Month

              <span
                className="badge badge-danger"
                style={{ marginLeft: 8 }}
              >
                {data.unpaid_members.length}
              </span>
            </h2>

            {data.unpaid_members.length > 0 && (
              <button
                className="btn btn-success btn-sm"
                onClick={openAllWhatsApp}
              >
                📲 WhatsApp All
              </button>
            )}
          </div>

          {data.unpaid_members.length === 0 ? (
            <p
              style={{
                color: "#16a34a",
                fontSize: "0.9rem",
              }}
            >
              ✅ Everyone has paid this month!
            </p>
          ) : (
            <ul
              style={{
                listStyle: "none",
                padding: 0,
                margin: 0,
              }}
            >
              {data.unpaid_members.map((m) => (
                <li
                  key={m.id}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "8px 0",
                    borderBottom: "1px solid #f0f0f0",
                    fontSize: "0.88rem",
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 600 }}>
                      {m.first_name} {m.last_name}
                    </div>

                    <div
                      style={{
                        fontSize: "0.75rem",
                        color: "#888",
                        marginTop: 2,
                      }}
                    >
                      ₹{m.fee} pending
                    </div>
                  </div>

                  <button
                    className="btn btn-outline btn-sm"
                    style={{
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                    }}
                    onClick={() => openWhatsApp(m)}
                  >
                    📲 WhatsApp
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      {/* Recent payments */}
      <div className="card">
        <h2
          style={{
            fontSize: "1rem",
            fontWeight: 600,
            marginBottom: 12,
          }}
        >
          Recent Payments
        </h2>

        {data.recent_payments.length === 0 ? (
          <div className="empty">
            No payments recorded yet.
          </div>
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

                    <td>
                      ₹{p.amount.toLocaleString()}
                    </td>

                    <td>{p.month}</td>

                    <td>{p.payment_date}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent audit activity */}
      {isAdmin &&
        data.recent_audit_logs &&
        data.recent_audit_logs.length > 0 && (
          <div className="card">
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                marginBottom: 12,
              }}
            >
              <h2
                style={{
                  fontSize: "1rem",
                  fontWeight: 600,
                  margin: 0,
                }}
              >
                🔐 Recent Activity
              </h2>

              <a
                href="/audit-logs"
                style={{
                  fontSize: 13,
                  color: "#6d28d9",
                }}
              >
                View all →
              </a>
            </div>

            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Time</th>
                    <th>User</th>
                    <th>Action</th>
                    <th>Module</th>
                    <th>Description</th>
                  </tr>
                </thead>

                <tbody>
                  {data.recent_audit_logs.map((log) => (
                    <tr key={log.id}>
                      <td
                        style={{
                          whiteSpace: "nowrap",
                          color: "#666",
                          fontSize: 12,
                        }}
                      >
                        {new Date(
                          log.created_at
                        ).toLocaleString("en-IN", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </td>

                      <td style={{ fontWeight: 600 }}>
                        {log.username || "—"}
                      </td>

                      <td>
                        <span
                          style={{
                            padding: "2px 8px",
                            borderRadius: 12,
                            fontSize: 11,
                            background: "#ede9fe",
                            color: "#5b21b6",
                            fontWeight: 700,
                          }}
                        >
                          {log.action}
                        </span>
                      </td>

                      <td style={{ color: "#666" }}>
                        {log.module}
                      </td>

                      <td
                        style={{
                          fontSize: 12,
                          color: "#444",
                          maxWidth: 300,
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {log.description}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
    </>
  );
}