import { useEffect, useState, useCallback } from "react";
import { getMembers } from "../api/memberApi";
import { getAttendance, markAttendance, getAttendanceReport } from "../api/attendanceApi";

const today = new Date();
const THIS_MONTH = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
const todayStr = today.toISOString().slice(0, 10);

function getDaysInMonth(yearMonth) {
  const [y, m] = yearMonth.split("-").map(Number);
  return new Date(y, m, 0).getDate();
}

function pad2(n) { return String(n).padStart(2, "0"); }

export default function Attendance() {
  const [members, setMembers]   = useState([]);
  const [month, setMonth]       = useState(THIS_MONTH);
  const [selDate, setSelDate]   = useState(todayStr);
  const [attendance, setAttendance] = useState([]); // for selected date
  const [report, setReport]     = useState([]);
  const [tab, setTab]           = useState("daily"); // "daily" | "report"
  const [loading, setLoading]   = useState(true);
  const [error, setError]       = useState("");
  const [success, setSuccess]   = useState("");

  const loadMembers = useCallback(async () => {
    const res = await getMembers();
    setMembers(res.data);
  }, []);

  const loadAttendance = useCallback(async (date) => {
    setLoading(true);
    setError("");
    try {
      const res = await getAttendance({ att_date: date });
      setAttendance(res.data);
    } catch {
      setError("Could not load attendance.");
    } finally {
      setLoading(false);
    }
  }, []);

  const loadReport = useCallback(async (m) => {
    setLoading(true);
    try {
      const res = await getAttendanceReport(m);
      setReport(res.data);
    } catch {
      setError("Could not load report.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadMembers();
  }, [loadMembers]);

  useEffect(() => {
    if (tab === "daily") loadAttendance(selDate);
    else loadReport(month);
  }, [tab, selDate, month, loadAttendance, loadReport]);

  // Build a lookup: member_id → attendance record for selected date
  const attMap = Object.fromEntries(attendance.map((a) => [a.member_id, a]));

  async function toggle(member, presentVal) {
    try {
      await markAttendance({ member_id: member.id, att_date: selDate, present: presentVal });
      flash(`${member.first_name} marked as ${presentVal ? "present" : "absent"}.`, "success");
      loadAttendance(selDate);
    } catch (err) {
      flash(err.response?.data?.detail || "Could not save attendance.", "error");
    }
  }

  async function markAllPresent() {
    const unmarked = members.filter((m) => !attMap[m.id]);
    await Promise.all(unmarked.map((m) => markAttendance({ member_id: m.id, att_date: selDate, present: true })));
    flash("All unmarked members marked as present.", "success");
    loadAttendance(selDate);
  }

  function flash(msg, type) {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3000); }
    else                    { setError(msg);   setTimeout(() => setError(""),   3000); }
  }

  const daysInMonth = getDaysInMonth(month);

  return (
    <>
      <div className="page-header">
        <h1>Attendance</h1>
        <div style={{ display: "flex", gap: 8 }}>
          <button
            className={`btn ${tab === "daily" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setTab("daily")}
          >
            Daily
          </button>
          <button
            className={`btn ${tab === "report" ? "btn-primary" : "btn-outline"} btn-sm`}
            onClick={() => setTab("report")}
          >
            Monthly Report
          </button>
        </div>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Daily View ───────────────────────────────────── */}
      {tab === "daily" && (
        <div className="card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20, flexWrap: "wrap" }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 500 }}>Date:</label>
            <input
              type="date"
              value={selDate}
              onChange={(e) => setSelDate(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.88rem" }}
            />
            <button className="btn btn-outline btn-sm" onClick={markAllPresent}>
              ✅ Mark All Present
            </button>
            <span style={{ marginLeft: "auto", fontSize: "0.85rem", color: "#888" }}>
              {attendance.filter((a) => a.present).length} present ·{" "}
              {attendance.filter((a) => !a.present).length} absent ·{" "}
              {members.length - attendance.length} unmarked
            </span>
          </div>

          {loading ? (
            <div className="loading">Loading…</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Member</th>
                    <th>Phone</th>
                    <th>Status</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan="5" className="empty">No active members.</td></tr>
                  ) : (
                    members.map((m) => {
                      const rec = attMap[m.id];
                      return (
                        <tr key={m.id}>
                          <td style={{ color: "#aaa" }}>{m.id}</td>
                          <td>{m.first_name} {m.last_name}</td>
                          <td style={{ color: "#888" }}>{m.phone_number}</td>
                          <td>
                            {!rec ? (
                              <span className="badge badge-info">Unmarked</span>
                            ) : rec.present ? (
                              <span className="badge badge-success">Present</span>
                            ) : (
                              <span className="badge badge-danger">Absent</span>
                            )}
                          </td>
                          <td style={{ display: "flex", gap: 6 }}>
                            <button
                              className="btn btn-success btn-sm"
                              onClick={() => toggle(m, true)}
                            >
                              ✓ Present
                            </button>
                            <button
                              className="btn btn-danger btn-sm"
                              onClick={() => toggle(m, false)}
                            >
                              ✗ Absent
                            </button>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── Monthly Report ───────────────────────────────── */}
      {tab === "report" && (
        <div className="card">
          <div style={{ display: "flex", gap: 12, alignItems: "center", marginBottom: 20 }}>
            <label style={{ fontSize: "0.85rem", fontWeight: 500 }}>Month:</label>
            <input
              type="month"
              value={month}
              onChange={(e) => setMonth(e.target.value)}
              style={{ padding: "6px 10px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.88rem" }}
            />
          </div>

          {loading ? (
            <div className="loading">Loading report…</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr>
                    <th>Member</th>
                    <th>Present</th>
                    <th>Absent</th>
                    <th>Total Marked</th>
                    <th>Attendance %</th>
                  </tr>
                </thead>
                <tbody>
                  {report.length === 0 ? (
                    <tr><td colSpan="5" className="empty">No attendance data for this month.</td></tr>
                  ) : (
                    report.map((r) => {
                      const pct = r.total_days > 0
                        ? Math.round((r.present_days / r.total_days) * 100)
                        : 0;
                      return (
                        <tr key={r.member_id}>
                          <td>{r.member_name}</td>
                          <td>
                            <span className="badge badge-success">{r.present_days}</span>
                          </td>
                          <td>
                            <span className="badge badge-danger">{r.absent_days}</span>
                          </td>
                          <td>{r.total_days}</td>
                          <td>
                            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                              <div style={{
                                flex: 1, height: 8, background: "#f0f0f0",
                                borderRadius: 4, overflow: "hidden", maxWidth: 120,
                              }}>
                                <div style={{
                                  width: `${pct}%`, height: "100%",
                                  background: pct >= 75 ? "#16a34a" : pct >= 50 ? "#d97706" : "#dc2626",
                                  borderRadius: 4,
                                }} />
                              </div>
                              <span style={{ fontSize: "0.82rem" }}>{pct}%</span>
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </>
  );
}
