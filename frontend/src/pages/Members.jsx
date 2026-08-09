import { useEffect, useState, useCallback } from "react";
import {
  getMembers, searchMembers, createMember, updateMember, deleteMember,
} from "../api/memberApi";
import { getBatches } from "../api/studioApi";
import { sendSingleReminder, sendCustomMessage } from "../api/notificationApi";

const EMPTY_FORM = {
  first_name: "", last_name: "", age: "", phone_number: "",
  email: "", fee: "", batch_id: "",
};

export default function Members() {
  const [members, setMembers]     = useState([]);
  const [batches, setBatches]     = useState([]);
  const [search, setSearch]       = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [loading, setLoading]     = useState(true);
  const [error, setError]         = useState("");
  const [success, setSuccess]     = useState("");

  const [modalOpen, setModalOpen]     = useState(false);
  const [editTarget, setEditTarget]   = useState(null);
  const [form, setForm]               = useState(EMPTY_FORM);
  const [formError, setFormError]     = useState("");
  const [submitting, setSubmitting]   = useState(false);
  const [sendingId, setSendingId]     = useState(null);

  // Send message modal
  const [msgModal, setMsgModal]       = useState(false);
  const [msgTarget, setMsgTarget]     = useState(null);
  const [msgText, setMsgText]         = useState("");
  const [msgSending, setMsgSending]   = useState(false);

  const load = useCallback(async (batchId) => {
    setLoading(true);
    setError("");
    try {
      const params = batchId ? `?batch_id=${batchId}` : "";
      const res = await getMembers(params);
      setMembers(res.data);
    } catch {
      setError("Could not load members. Is the backend running?");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load(filterBatch);
    getBatches().then((r) => setBatches(r.data)).catch(() => {});
  }, [load, filterBatch]);

  async function handleSearch(val) {
    setSearch(val);
    if (!val.trim()) { load(filterBatch); return; }
    try {
      const res = await searchMembers(val.trim());
      setMembers(res.data);
    } catch { /* ignore */ }
  }

  // ── Modal ──────────────────────────────────────────────────
  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(m) {
    setEditTarget(m);
    setForm({
      first_name:   m.first_name,
      last_name:    m.last_name,
      age:          String(m.age),
      phone_number: m.phone_number,
      email:        m.email || "",
      fee:          String(m.fee),
      batch_id:     m.batch_id ? String(m.batch_id) : "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setFormError(""); }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");
    const payload = {
      first_name:   form.first_name.trim(),
      last_name:    form.last_name.trim(),
      age:          parseInt(form.age, 10),
      phone_number: form.phone_number.trim(),
      email:        form.email.trim() || null,
      fee:          parseInt(form.fee, 10),
      batch_id:     form.batch_id ? parseInt(form.batch_id, 10) : null,
    };
    if (!payload.first_name || !payload.last_name || !payload.phone_number ||
        isNaN(payload.age) || isNaN(payload.fee)) {
      setFormError("Please fill in all required fields correctly.");
      return;
    }
    setSubmitting(true);
    try {
      if (editTarget) {
        await updateMember(editTarget.id, payload);
        flash("Member updated successfully.", "success");
      } else {
        await createMember(payload);
        flash("Member added successfully.", "success");
      }
      closeModal();
      load(filterBatch);
    } catch (err) {
      setFormError(err.response?.data?.detail || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  async function handleDelete(m) {
    if (!window.confirm(`Deactivate ${m.first_name} ${m.last_name}?`)) return;
    try {
      await deleteMember(m.id);
      flash("Member deactivated.", "success");
      load(filterBatch);
    } catch (err) {
      flash(err.response?.data?.detail || "Could not deactivate member.", "error");
    }
  }

  async function handleReminder(m) {
    setSendingId(m.id);
    try {
      const res = await sendSingleReminder(m.id);
      const st = res.data.whatsapp?.status;
      if (st === "sent")    flash(`Reminder sent to ${m.first_name}!`, "success");
      else if (st === "skipped") flash("Meta WhatsApp not configured — add META_WA_TOKEN and META_WA_PHONE_ID to backend/.env.", "success");
      else flash(`Failed: ${res.data.whatsapp?.reason}`, "error");
    } catch {
      flash("Could not send reminder.", "error");
    } finally {
      setSendingId(null);
    }
  }

  function openMsgModal(m) {
    setMsgTarget(m);
    setMsgText(`Hello ${m.first_name} 🙏\n\n`);
    setMsgModal(true);
  }

  async function handleSendCustomMsg(e) {
    e.preventDefault();
    if (!msgText.trim()) return;
    setMsgSending(true);
    try {
      const res = await sendCustomMessage(msgTarget.id, msgText);
      const st = res.data.whatsapp?.status;
      if (st === "sent")    flash(`Message sent to ${msgTarget.first_name}!`, "success");
      else if (st === "skipped") flash("Meta WhatsApp not configured — add credentials to backend/.env.", "success");
      else flash(`Failed: ${res.data.whatsapp?.reason}`, "error");
      setMsgModal(false);
    } catch {
      flash("Could not send message.", "error");
    } finally {
      setMsgSending(false);
    }
  }  function flash(msg, type) {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else                    { setError(msg);   setTimeout(() => setError(""),   3500); }
  }

  const batchName = (id) => batches.find((b) => b.id === id)?.name || "—";

  return (
    <>
      <div className="page-header">
        <h1>Members</h1>
        <button className="btn btn-primary" onClick={openAdd}>+ Add Member</button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      <div className="card">
        <div style={{ display: "flex", gap: 10, marginBottom: 16, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            className="search-bar"
            style={{ flex: "1 1 200px", maxWidth: 300, padding: "8px 12px", border: "1px solid #d1d5db", borderRadius: 6, fontSize: "0.9rem" }}
            placeholder="🔍 Search by name or phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
          />
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            style={{ padding: "8px 12px", borderRadius: 6, border: "1px solid #d1d5db", fontSize: "0.88rem" }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => load(filterBatch)}>↺ Refresh</button>
        </div>

        {loading ? (
          <div className="loading">Loading members…</div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Name</th>
                  <th>Phone</th>
                  <th>Age</th>
                  <th>Batch</th>
                  <th>Fee / mo</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {members.length === 0 ? (
                  <tr><td colSpan="8" className="empty">No members found.</td></tr>
                ) : (
                  members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: "#aaa" }}>{m.id}</td>
                      <td><strong>{m.first_name} {m.last_name}</strong></td>
                      <td>{m.phone_number}</td>
                      <td>{m.age}</td>
                      <td>
                        {m.batch_name
                          ? <span className="badge badge-info">{m.batch_name}</span>
                          : <span style={{ color: "#ccc" }}>—</span>
                        }
                      </td>
                      <td>₹{m.fee.toLocaleString()}</td>
                      <td>
                        <span className={`badge ${m.is_active ? "badge-success" : "badge-danger"}`}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                        <button className="btn btn-warning btn-sm" onClick={() => openEdit(m)}>✏️ Edit</button>
                        <button
                          className="btn btn-outline btn-sm"
                          onClick={() => handleReminder(m)}
                          disabled={sendingId === m.id}
                          title="Send fee reminder"
                        >
                          {sendingId === m.id ? "…" : "📲"}
                        </button>
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => openMsgModal(m)}
                          title="Send custom WhatsApp message"
                        >
                          💬
                        </button>
                        <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>🗑</button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Add / Edit Modal ─────────────────────────────── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <h2>{editTarget ? "Edit Member" : "Add New Member"}</h2>
            {formError && <div className="alert alert-error">{formError}</div>}
            <form onSubmit={handleSubmit}>
              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input value={form.first_name} onChange={(e) => setForm({ ...form, first_name: e.target.value })} placeholder="Ananya" required />
                </div>
                <div className="form-group">
                  <label>Last Name *</label>
                  <input value={form.last_name} onChange={(e) => setForm({ ...form, last_name: e.target.value })} placeholder="Sharma" required />
                </div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Age *</label>
                  <input type="number" min="1" max="120" value={form.age} onChange={(e) => setForm({ ...form, age: e.target.value })} placeholder="28" required />
                </div>
                <div className="form-group">
                  <label>Monthly Fee (₹) *</label>
                  <input type="number" min="0" value={form.fee} onChange={(e) => setForm({ ...form, fee: e.target.value })} placeholder="1500" required />
                </div>
              </div>
              <div className="form-group">
                <label>Phone Number *</label>
                <input value={form.phone_number} onChange={(e) => setForm({ ...form, phone_number: e.target.value })} placeholder="9876543210" required />
              </div>
              <div className="form-group">
                <label>Email (optional)</label>
                <input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="ananya@example.com" />
              </div>
              <div className="form-group">
                <label>Batch</label>
                <select value={form.batch_id} onChange={(e) => setForm({ ...form, batch_id: e.target.value })}>
                  <option value="">— No batch assigned —</option>
                  {batches.map((b) => (
                    <option key={b.id} value={b.id}>{b.name}</option>
                  ))}
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving…" : editTarget ? "Update Member" : "Add Member"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* ── Send Custom Message Modal ─────────────────── */}
      {msgModal && msgTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setMsgModal(false)}>
          <div className="modal">
            <h2>💬 Send WhatsApp Message</h2>
            <p style={{ fontSize: "0.88rem", color: "#888", marginBottom: 16 }}>
              To: <strong>{msgTarget.first_name} {msgTarget.last_name}</strong> — {msgTarget.phone_number}
            </p>
            <form onSubmit={handleSendCustomMsg}>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  rows={6}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Type your message here…"
                  required
                  style={{
                    width: "100%", padding: "8px 12px", borderRadius: 6,
                    border: "1px solid #d1d5db", fontSize: "0.9rem",
                    resize: "vertical", outline: "none", fontFamily: "inherit",
                  }}
                />
                <div style={{ fontSize: "0.75rem", color: "#aaa", marginTop: 4, textAlign: "right" }}>
                  {msgText.length} characters
                </div>
              </div>

              {/* Quick message templates */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.78rem", color: "#888", marginBottom: 6 }}>Quick templates:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Fee Reminder", text: `Hello ${msgTarget.first_name} 🙏\n\nYour monthly fee of ₹${msgTarget.fee} is due. Please pay at the earliest.\n\nThank you!\n— Antar Yoga` },
                    { label: "Class Cancelled", text: `Hello ${msgTarget.first_name},\n\nToday's class has been cancelled. We'll resume tomorrow as usual.\n\nSorry for the inconvenience 🙏\n— Antar Yoga` },
                    { label: "Holiday Notice", text: `Hello ${msgTarget.first_name},\n\nThe studio will be closed tomorrow. Classes will resume as scheduled from the day after.\n\nThank you 🙏\n— Antar Yoga` },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="btn btn-outline btn-sm"
                      style={{ fontSize: "0.75rem" }}
                      onClick={() => setMsgText(t.text)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setMsgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={msgSending || !msgText.trim()}>
                  {msgSending ? "Sending…" : "📲 Send Message"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
