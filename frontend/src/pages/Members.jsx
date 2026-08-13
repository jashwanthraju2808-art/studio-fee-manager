import { useCallback, useEffect, useState } from "react";
import {
  getMembers, searchMembers, createMember, updateMember, deleteMember,
} from "../api/memberApi";
import { getBatches } from "../api/studioApi";
import { sendSingleReminder, sendCustomMessage } from "../api/notificationApi";

/* ── Empty form matching updated Member schema ────────────── */
const EMPTY_FORM = {
  first_name:    "",
  last_name:     "",
  date_of_birth: "",   // YYYY-MM-DD — age is auto-calculated server-side
  phone_number:  "",
  email:         "",
  height_cm:     "",
  weight_kg:     "",
  health_notes:  "",
  join_date:     "",
  fee:           "",
  batch_id:      "",
};

/* ── Age helper (mirrors backend logic, client-only display) ─ */
function calcAge(dob) {
  if (!dob) return null;
  const today = new Date();
  const d     = new Date(dob);
  let age = today.getFullYear() - d.getFullYear();
  if (
    today.getMonth() < d.getMonth() ||
    (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())
  ) age--;
  return age >= 0 ? age : null;
}

/* ── Initials avatar ─────────────────────────────────────── */
function initials(m) {
  return `${(m.first_name?.[0] || "").toUpperCase()}${(m.last_name?.[0] || "").toUpperCase()}` || "?";
}

export default function Members() {
  const [members,     setMembers]     = useState([]);
  const [batches,     setBatches]     = useState([]);
  const [search,      setSearch]      = useState("");
  const [filterBatch, setFilterBatch] = useState("");
  const [loading,     setLoading]     = useState(true);
  const [error,       setError]       = useState("");
  const [success,     setSuccess]     = useState("");

  /* Add/Edit modal */
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formError,  setFormError]  = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Message modal */
  const [msgModal,   setMsgModal]   = useState(false);
  const [msgTarget,  setMsgTarget]  = useState(null);
  const [msgText,    setMsgText]    = useState("");
  const [msgSending, setMsgSending] = useState(false);

  /* Sending state per row */
  const [sendingId, setSendingId]   = useState(null);

  /* ── Load ──────────────────────────────────────────────── */
  const load = useCallback(async (batchId) => {
    setLoading(true);
    setError("");
    try {
      const params = batchId ? `?batch_id=${batchId}` : "";
      const res    = await getMembers(params);
      setMembers(res.data);
    } catch {
      setError("Could not load members.");
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
    } catch { /* silently ignore */ }
  }

  /* ── Modal helpers ─────────────────────────────────────── */
  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, join_date: new Date().toISOString().slice(0, 10) });
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(m) {
    setEditTarget(m);
    setForm({
      first_name:    m.first_name || "",
      last_name:     m.last_name  || "",
      date_of_birth: m.date_of_birth || "",
      phone_number:  m.phone_number  || "",
      email:         m.email         || "",
      height_cm:     m.height_cm != null ? String(m.height_cm) : "",
      weight_kg:     m.weight_kg != null ? String(m.weight_kg) : "",
      health_notes:  m.health_notes   || "",
      join_date:     m.join_date       || "",
      fee:           String(m.fee),
      batch_id:      m.batch_id ? String(m.batch_id) : "",
    });
    setFormError("");
    setModalOpen(true);
  }

  function closeModal() { setModalOpen(false); setFormError(""); }

  function f(field, value) { setForm((prev) => ({ ...prev, [field]: value })); }

  /* ── Submit ────────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    if (!form.first_name.trim()) { setFormError("First name is required."); return; }
    if (!form.phone_number.trim()) { setFormError("Phone number is required."); return; }
    const fee = parseInt(form.fee, 10);
    if (isNaN(fee) || fee < 0)    { setFormError("Enter a valid monthly fee."); return; }

    const payload = {
      first_name:    form.first_name.trim(),
      last_name:     form.last_name.trim()     || null,
      date_of_birth: form.date_of_birth        || null,
      phone_number:  form.phone_number.trim(),
      email:         form.email.trim()         || null,
      height_cm:     form.height_cm            ? parseFloat(form.height_cm) : null,
      weight_kg:     form.weight_kg            ? parseFloat(form.weight_kg) : null,
      health_notes:  form.health_notes.trim()  || null,
      join_date:     form.join_date            || null,
      fee,
      batch_id:      form.batch_id             ? parseInt(form.batch_id, 10) : null,
    };

    setSubmitting(true);
    try {
      if (editTarget) {
        await updateMember(editTarget.id, payload);
        flash("Member updated.", "success");
      } else {
        await createMember(payload);
        flash("Member added.", "success");
      }
      closeModal();
      load(filterBatch);
    } catch (err) {
      setFormError(err.response?.data?.detail || "An error occurred.");
    } finally {
      setSubmitting(false);
    }
  }

  /* ── Delete ────────────────────────────────────────────── */
  async function handleDelete(m) {
    if (!window.confirm(`Deactivate ${m.first_name} ${m.last_name || ""}?`)) return;
    try {
      await deleteMember(m.id);
      flash("Member deactivated.", "success");
      load(filterBatch);
    } catch (err) {
      flash(err.response?.data?.detail || "Could not deactivate.", "error");
    }
  }

  /* ── Reminder ──────────────────────────────────────────── */
  async function handleReminder(m) {
    setSendingId(m.id);
    try {
      const res = await sendSingleReminder(m.id);
      const st  = res.data.whatsapp?.status;
      if (st === "sent") flash(`Reminder sent to ${m.first_name}!`, "success");
      else               flash("WhatsApp reminder sent or skipped.", "success");
    } catch {
      flash("Could not send reminder.", "error");
    } finally {
      setSendingId(null);
    }
  }

  /* ── Custom message ────────────────────────────────────── */
  function openMsgModal(m) {
    setMsgTarget(m);
    setMsgText(`Hello ${m.first_name} 🙏\n\n`);
    setMsgModal(true);
  }

  async function handleSendMsg(e) {
    e.preventDefault();
    if (!msgText.trim()) return;
    setMsgSending(true);
    try {
      await sendCustomMessage(msgTarget.id, msgText);
      flash(`Message sent to ${msgTarget.first_name}!`, "success");
      setMsgModal(false);
    } catch {
      flash("Could not send message.", "error");
    } finally {
      setMsgSending(false);
    }
  }

  function flash(msg, type) {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else                    { setError(msg);   setTimeout(() => setError(""),   3500); }
  }

  /* ── Age display ───────────────────────────────────────── */
  function displayAge(m) {
    const a = m.date_of_birth ? calcAge(m.date_of_birth) : m.age;
    return a != null ? `${a} yrs` : "—";
  }

  /* ═══════════════════════════════════════════════════════
     RENDER — DESKTOP TABLE + MOBILE CARDS
     ═══════════════════════════════════════════════════════ */
  return (
    <>
      <div className="page-header">
        <h1>Members</h1>
        {/* Desktop add button */}
        <button className="btn btn-primary desktop-only" onClick={openAdd}>+ Add Member</button>
      </div>

      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* ── Filters ──────────────────────────────────────── */}
      <div className="card" style={{ padding: "14px 18px", marginBottom: 16 }}>
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
          <input
            type="text"
            placeholder="🔍  Search by name or phone…"
            value={search}
            onChange={(e) => handleSearch(e.target.value)}
            style={{ flex: "1 1 200px", minWidth: 140 }}
          />
          <select
            value={filterBatch}
            onChange={(e) => setFilterBatch(e.target.value)}
            style={{ flex: "0 0 auto", minWidth: 160 }}
          >
            <option value="">All Batches</option>
            {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
          </select>
          <button className="btn btn-outline btn-sm" onClick={() => load(filterBatch)}>↺</button>
        </div>
      </div>

      {loading ? (
        <div className="loading">Loading members…</div>
      ) : (
        <>
          {/* ── DESKTOP TABLE ─────────────────────────────── */}
          <div className="card desktop-only" style={{ padding: 0, overflow: "hidden" }}>
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
                    <th>Health</th>
                    <th>Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {members.length === 0 ? (
                    <tr><td colSpan="9" className="empty">No members found.</td></tr>
                  ) : members.map((m) => (
                    <tr key={m.id}>
                      <td style={{ color: "var(--text-light)" }}>{m.id}</td>
                      <td>
                        <div style={{ fontWeight: 600 }}>{m.first_name} {m.last_name || ""}</div>
                        {m.email && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>}
                      </td>
                      <td>{m.phone_number}</td>
                      <td>{displayAge(m)}</td>
                      <td>
                        {m.batch_name
                          ? <span className="badge badge-info">{m.batch_name}</span>
                          : <span style={{ color: "var(--text-light)" }}>—</span>}
                      </td>
                      <td style={{ fontWeight: 600, color: "var(--sage)" }}>₹{m.fee.toLocaleString("en-IN")}</td>
                      <td>
                        {(m.height_cm || m.weight_kg || m.health_notes) ? (
                          <span className="badge badge-muted" title={[
                            m.height_cm  ? `Height: ${m.height_cm} cm`  : null,
                            m.weight_kg  ? `Weight: ${m.weight_kg} kg`  : null,
                            m.health_notes ? `Notes: ${m.health_notes}` : null,
                          ].filter(Boolean).join(" · ")}>
                            📋 On file
                          </span>
                        ) : <span style={{ color: "var(--text-light)" }}>—</span>}
                      </td>
                      <td>
                        <span className={`badge ${m.is_active ? "badge-success" : "badge-danger"}`}>
                          {m.is_active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => handleReminder(m)}
                            disabled={sendingId === m.id}
                            title="Send fee reminder"
                          >
                            {sendingId === m.id ? "…" : "📲"}
                          </button>
                          <button
                            className="btn btn-outline btn-sm"
                            onClick={() => openMsgModal(m)}
                            title="Send custom message"
                          >
                            💬
                          </button>
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(m)}
                          >
                            ✕
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* ── MOBILE CARDS ──────────────────────────────── */}
          <div className="mobile-only">
            <div className="member-cards">
              {members.length === 0 ? (
                <div className="empty">No members found.</div>
              ) : members.map((m) => (
                <div key={m.id} className="member-card">
                  <div className="member-card-avatar">{initials(m)}</div>
                  <div className="member-card-body">
                    <div className="member-card-name">{m.first_name} {m.last_name || ""}</div>
                    <div className="member-card-meta">
                      {m.phone_number}
                      {m.batch_name && <> · <span style={{ color: "var(--sage)" }}>{m.batch_name}</span></>}
                      {m.date_of_birth || m.age ? <> · {displayAge(m)}</> : null}
                    </div>
                    {(m.height_cm || m.weight_kg) && (
                      <div className="member-card-meta" style={{ marginTop: 2 }}>
                        {m.height_cm && <span>{m.height_cm} cm</span>}
                        {m.height_cm && m.weight_kg && <span> · </span>}
                        {m.weight_kg && <span>{m.weight_kg} kg</span>}
                      </div>
                    )}
                    <div style={{ display: "flex", gap: 6, marginTop: 8 }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                      <button
                        className="btn btn-outline btn-sm"
                        onClick={() => handleReminder(m)}
                        disabled={sendingId === m.id}
                      >
                        {sendingId === m.id ? "…" : "📲"}
                      </button>
                      <button className="btn btn-outline btn-sm" onClick={() => openMsgModal(m)}>💬</button>
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>✕</button>
                    </div>
                  </div>
                  <div className="member-card-fee">₹{m.fee.toLocaleString("en-IN")}</div>
                </div>
              ))}
            </div>

            {/* FAB — mobile add button */}
            <button className="fab" onClick={openAdd} aria-label="Add Member">+</button>
          </div>
        </>
      )}

      {/* ════════════════════════════════════════════════════
          ADD / EDIT MODAL
          ════════════════════════════════════════════════════ */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">

            <h2>{editTarget ? "Edit Member" : "Add Member"}</h2>

            {formError && <div className="alert alert-error">{formError}</div>}

            <form onSubmit={handleSubmit}>

              {/* ── IDENTITY ─────────────────────────────── */}
              <div className="modal-section-label">Identity</div>

              <div className="form-row">
                <div className="form-group">
                  <label>First Name *</label>
                  <input
                    value={form.first_name}
                    onChange={(e) => f("first_name", e.target.value)}
                    placeholder="Ananya"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    value={form.last_name}
                    onChange={(e) => f("last_name", e.target.value)}
                    placeholder="Sharma"
                  />
                </div>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input
                    type="date"
                    value={form.date_of_birth}
                    onChange={(e) => f("date_of_birth", e.target.value)}
                    max={new Date().toISOString().slice(0, 10)}
                  />
                  {form.date_of_birth && (
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>
                      Age: <strong>{calcAge(form.date_of_birth)} years</strong>
                    </div>
                  )}
                </div>
                <div className="form-group">
                  <label>Join Date</label>
                  <input
                    type="date"
                    value={form.join_date}
                    onChange={(e) => f("join_date", e.target.value)}
                  />
                </div>
              </div>

              {/* ── CONTACT ──────────────────────────────── */}
              <div className="modal-section-label">Contact</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Phone Number *</label>
                  <input
                    value={form.phone_number}
                    onChange={(e) => f("phone_number", e.target.value)}
                    placeholder="9876543210"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    type="email"
                    value={form.email}
                    onChange={(e) => f("email", e.target.value)}
                    placeholder="ananya@example.com"
                  />
                </div>
              </div>

              {/* ── STUDIO ───────────────────────────────── */}
              <div className="modal-section-label">Studio</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Monthly Fee (₹) *</label>
                  <input
                    type="number"
                    min="0"
                    value={form.fee}
                    onChange={(e) => f("fee", e.target.value)}
                    placeholder="1500"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Batch</label>
                  <select
                    value={form.batch_id}
                    onChange={(e) => f("batch_id", e.target.value)}
                  >
                    <option value="">— No batch —</option>
                    {batches.map((b) => (
                      <option key={b.id} value={b.id}>{b.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* ── HEALTH ───────────────────────────────── */}
              <div className="modal-section-label">Health & Physical</div>

              <div className="form-row">
                <div className="form-group">
                  <label>Height (cm)</label>
                  <input
                    type="number"
                    min="50"
                    max="250"
                    step="0.1"
                    value={form.height_cm}
                    onChange={(e) => f("height_cm", e.target.value)}
                    placeholder="165.0"
                  />
                </div>
                <div className="form-group">
                  <label>Weight (kg)</label>
                  <input
                    type="number"
                    min="10"
                    max="300"
                    step="0.1"
                    value={form.weight_kg}
                    onChange={(e) => f("weight_kg", e.target.value)}
                    placeholder="62.5"
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Medical Conditions / Health Notes</label>
                <textarea
                  rows={3}
                  value={form.health_notes}
                  onChange={(e) => f("health_notes", e.target.value)}
                  placeholder="e.g. Lower back pain, hypertension, knee injury…"
                  style={{ resize: "vertical" }}
                />
              </div>

              {/* ── Footer ───────────────────────────────── */}
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>
                  {submitting ? "Saving…" : editTarget ? "Update Member" : "Add Member"}
                </button>
              </div>

            </form>
          </div>
        </div>
      )}

      {/* ════════════════════════════════════════════════════
          CUSTOM MESSAGE MODAL
          ════════════════════════════════════════════════════ */}
      {msgModal && msgTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setMsgModal(false)}>
          <div className="modal">
            <h2>Send WhatsApp Message</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 16 }}>
              To: <strong>{msgTarget.first_name} {msgTarget.last_name || ""}</strong> · {msgTarget.phone_number}
            </p>

            <form onSubmit={handleSendMsg}>
              <div className="form-group">
                <label>Message *</label>
                <textarea
                  rows={6}
                  value={msgText}
                  onChange={(e) => setMsgText(e.target.value)}
                  placeholder="Type your message here…"
                  required
                  style={{ resize: "vertical" }}
                />
                <div style={{ fontSize: "0.72rem", color: "var(--text-light)", marginTop: 4, textAlign: "right" }}>
                  {msgText.length} characters
                </div>
              </div>

              {/* Quick templates */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em" }}>
                  Quick templates
                </div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Fee Reminder",    text: `Hello ${msgTarget.first_name} 🙏\n\nYour monthly fee of ₹${msgTarget.fee} is due. Please pay at your earliest convenience.\n\nThank you!\n— Antar Yoga` },
                    { label: "Class Cancelled", text: `Hello ${msgTarget.first_name},\n\nToday's class has been cancelled. We'll resume tomorrow as usual.\n\nSorry for the inconvenience 🙏\n— Antar Yoga` },
                    { label: "Holiday Notice",  text: `Hello ${msgTarget.first_name},\n\nThe studio will be closed tomorrow. Classes will resume as scheduled from the day after.\n\nThank you 🙏\n— Antar Yoga` },
                  ].map((t) => (
                    <button
                      key={t.label}
                      type="button"
                      className="btn btn-outline btn-sm"
                      onClick={() => setMsgText(t.text)}
                    >
                      {t.label}
                    </button>
                  ))}
                </div>
              </div>

              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setMsgModal(false)}>
                  Cancel
                </button>
                <button type="submit" className="btn btn-success" disabled={msgSending || !msgText.trim()}>
                  {msgSending ? "Sending…" : "📲 Send"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
