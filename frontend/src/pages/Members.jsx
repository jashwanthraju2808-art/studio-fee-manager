import { useCallback, useEffect, useState } from "react";
import {
  getMembers, getInactiveMembers,
  searchMembers, createMember, updateMember,
  deleteMember, toggleMemberStatus, permanentlyDeleteMember,
} from "../api/memberApi";
import { getBatches } from "../api/studioApi";
import {
  openWhatsApp, normalizePhone,
  msgWelcome, msgFeeReminder, msgDiscontinued, msgReactivated,
} from "../utils/whatsapp";

/* ── Helpers ─────────────────────────────────────────────── */
const EMPTY_FORM = {
  first_name: "", last_name: "", date_of_birth: "", phone_number: "",
  email: "", height_cm: "", weight_kg: "", health_notes: "",
  join_date: "", fee: "", batch_id: "",
};

function calcAge(dob) {
  if (!dob) return null;
  const today = new Date(), d = new Date(dob);
  let age = today.getFullYear() - d.getFullYear();
  if (today.getMonth() < d.getMonth() ||
     (today.getMonth() === d.getMonth() && today.getDate() < d.getDate())) age--;
  return age >= 0 ? age : null;
}
function displayAge(m) {
  const a = m.date_of_birth ? calcAge(m.date_of_birth) : m.age;
  return a != null ? `${a} yrs` : "—";
}
function initials(m) {
  return ((m.first_name?.[0] || "") + (m.last_name?.[0] || "")).toUpperCase() || "?";
}
function sortMembers(list) {
  return [...list].sort((a, b) => {
    const fn = (a.first_name || "").localeCompare(b.first_name || "", "en", { sensitivity: "base" });
    if (fn !== 0) return fn;
    return (a.last_name || "").localeCompare(b.last_name || "", "en", { sensitivity: "base" });
  });
}
function groupByBatch(members, batches) {
  const batchMap = {};
  batches.forEach((b) => { batchMap[b.id] = b; });
  const groups = {};
  members.forEach((m) => {
    const key = m.batch_id ?? "none";
    if (!groups[key]) {
      const b = m.batch_id ? batchMap[m.batch_id] : null;
      // Use batch_name from the member directly as fallback if batchMap
      // hasn't loaded yet (avoids empty groups on first render)
      const batchName = (b ? b.name : null) || m.batch_name || "No Batch Assigned";
      const startTime = b ? b.start_time : "99:99";
      groups[key] = { batchId: key, batchName, startTime, members: [] };
    }
    groups[key].members.push(m);
  });
  return Object.values(groups)
    .sort((a, b) => a.startTime.localeCompare(b.startTime))
    .map((g) => ({ ...g, members: sortMembers(g.members) }));
}

/* ── Component ───────────────────────────────────────────── */
export default function Members() {
  const [members,         setMembers]        = useState([]);
  const [inactiveMembers, setInactiveMembers] = useState([]);
  const [batches,         setBatches]        = useState([]);
  const [search,          setSearch]         = useState("");
  const [loading,         setLoading]        = useState(true);
  const [error,           setError]          = useState("");
  const [success,         setSuccess]        = useState("");
  const [tab,             setTab]            = useState("active"); // "active" | "discontinued"
  const [collapsed,       setCollapsed]      = useState({});

  /* Add/Edit */
  const [modalOpen,  setModalOpen]  = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [formError,  setFormError]  = useState("");
  const [submitting, setSubmitting] = useState(false);

  /* Per-row state */
  const [sendingId,  setSendingId]  = useState(null);
  const [togglingId, setTogglingId] = useState(null);

  /* Selection */
  const [selected, setSelected] = useState(new Set());

  /* Bulk WA modal */
  const [bulkModal,   setBulkModal]  = useState(false);
  const [bulkMsg,     setBulkMsg]    = useState("");
  const [bulkSending, setBulkSending]= useState(false);

  /* Individual message modal */
  const [msgModal,   setMsgModal]  = useState(false);
  const [msgTarget,  setMsgTarget] = useState(null);
  const [msgText,    setMsgText]   = useState("");
  const [msgSending, setMsgSending]= useState(false);

  /* ── Load ──────────────────────────────────────────────── */
  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [mRes, iRes, bRes] = await Promise.all([
        getMembers(), getInactiveMembers(), getBatches(),
      ]);
      // Set all three together to avoid intermediate renders where
      // members are populated but batches are still empty
      setMembers(mRes.data);
      setBatches(bRes.data);
      setInactiveMembers(iRes.data);
    } catch { setError("Could not load members."); }
    finally  { setLoading(false); }
  }, []);

  useEffect(() => { load(); }, [load]);

  async function handleSearch(val) {
    setSearch(val);
    if (!val.trim()) { load(); return; }
    try { const res = await searchMembers(val.trim()); setMembers(res.data); }
    catch { /* ignore */ }
  }

  /* ── Derived ───────────────────────────────────────────── */
  const groups = groupByBatch(members, batches);
  const selectedMembers = members.filter((m) => selected.has(m.id));
  const withPhone    = selectedMembers.filter((m) => normalizePhone(m.phone_number));
  const withoutPhone = selectedMembers.filter((m) => !normalizePhone(m.phone_number));

  /* ── Selection ─────────────────────────────────────────── */
  function toggleOne(id)    { setSelected((p) => { const n = new Set(p); n.has(id) ? n.delete(id) : n.add(id); return n; }); }
  function toggleBatch(ms)  { const ids = ms.map((m) => m.id); const allOn = ids.every((id) => selected.has(id)); setSelected((p) => { const n = new Set(p); ids.forEach((id) => allOn ? n.delete(id) : n.add(id)); return n; }); }
  function toggleAll()      { const all = members.map((m) => m.id); setSelected(all.every((id) => selected.has(id)) ? new Set() : new Set(all)); }
  function clearSelection() { setSelected(new Set()); }

  function toggleCollapse(key) { setCollapsed((p) => ({ ...p, [key]: !p[key] })); }

  /* ── Modal helpers ─────────────────────────────────────── */
  function openAdd() {
    setEditTarget(null);
    setForm({ ...EMPTY_FORM, join_date: new Date().toISOString().slice(0, 10) });
    setFormError(""); setModalOpen(true);
  }
  function openEdit(m) {
    setEditTarget(m);
    setForm({
      first_name: m.first_name || "", last_name: m.last_name || "",
      date_of_birth: m.date_of_birth || "", phone_number: m.phone_number || "",
      email: m.email || "", height_cm: m.height_cm != null ? String(m.height_cm) : "",
      weight_kg: m.weight_kg != null ? String(m.weight_kg) : "",
      health_notes: m.health_notes || "", join_date: m.join_date || "",
      fee: String(m.fee), batch_id: m.batch_id ? String(m.batch_id) : "",
    });
    setFormError(""); setModalOpen(true);
  }
  function closeModal() { setModalOpen(false); setFormError(""); }
  function fld(f, v)    { setForm((p) => ({ ...p, [f]: v })); }

  /* ── Submit ────────────────────────────────────────────── */
  async function handleSubmit(e) {
    e.preventDefault(); setFormError("");
    if (!form.first_name.trim())   { setFormError("First name is required."); return; }
    if (!form.phone_number.trim()) { setFormError("Phone number is required."); return; }
    const fee = parseInt(form.fee, 10);
    if (isNaN(fee) || fee < 0)    { setFormError("Enter a valid monthly fee."); return; }
    const payload = {
      first_name: form.first_name.trim(), last_name: form.last_name.trim() || null,
      date_of_birth: form.date_of_birth || null, phone_number: form.phone_number.trim(),
      email: form.email.trim() || null,
      height_cm: form.height_cm ? parseFloat(form.height_cm) : null,
      weight_kg: form.weight_kg ? parseFloat(form.weight_kg) : null,
      health_notes: form.health_notes.trim() || null,
      join_date: form.join_date || null, fee,
      batch_id: form.batch_id ? parseInt(form.batch_id, 10) : null,
    };
    setSubmitting(true);
    try {
      if (editTarget) { await updateMember(editTarget.id, payload); flash("Member updated."); }
      else            { await createMember(payload);                flash("Member added. Payment auto-recorded."); }
      closeModal(); load();
    } catch (err) { setFormError(err.response?.data?.detail || "An error occurred."); }
    finally       { setSubmitting(false); }
  }

  /* ── Deactivate (single) ───────────────────────────────── */
  async function handleDelete(m) {
    if (!window.confirm(`Discontinue ${m.first_name} ${m.last_name || ""}? Historical records will be preserved.`)) return;
    try {
      await deleteMember(m.id);
      flash("Member discontinued. Historical records preserved.");
      setSelected((p) => { const n = new Set(p); n.delete(m.id); return n; });
      load();
    } catch (err) { flash(err.response?.data?.detail || "Could not discontinue.", "error"); }
  }

  /* ── Bulk deactivate ───────────────────────────────────── */
  async function handleBulkDeactivate() {
    const names = selectedMembers.map((m) => `${m.first_name} ${m.last_name || ""}`.trim()).join(", ");
    if (!window.confirm(`Discontinue ${selectedMembers.length} member(s)?\n\n${names}\n\nHistorical records will be preserved.`)) return;
    let done = 0;
    for (const m of selectedMembers) {
      try { await deleteMember(m.id); done++; } catch { /* continue */ }
    }
    flash(`${done} member(s) discontinued.`);
    clearSelection(); load();
  }

  /* ── Reactivate discontinued member ───────────────────── */
  async function handleReactivate(m) {
    if (!window.confirm(`Reactivate ${m.first_name} ${m.last_name || ""}?\n\nThey will appear in active attendance and member lists.`)) return;
    setTogglingId(m.id);
    try {
      await toggleMemberStatus(m.id);
      flash(`${m.first_name} reactivated successfully!`);
      load();
    } catch (err) { flash(err.response?.data?.detail || "Could not reactivate.", "error"); }
    finally       { setTogglingId(null); }
  }

  /* ── Permanently delete discontinued member ────────────── */
  async function handlePermanentDelete(m) {
    const name = `${m.first_name} ${m.last_name || ""}`.trim();
    if (!window.confirm(
      `⚠ PERMANENTLY DELETE ${name}?\n\n` +
      `This will remove the member and ALL their historical records (payments, attendance) forever.\n\n` +
      `This action CANNOT be undone. Are you sure?`
    )) return;
    try {
      await permanentlyDeleteMember(m.id);
      flash(`${name} permanently deleted.`);
      load();
    } catch (err) { flash(err.response?.data?.detail || "Could not delete.", "error"); }
  }

  /* ── WhatsApp handlers ─────────────────────────────────── */
  function handleWelcomeWA(m) {
    if (!normalizePhone(m.phone_number)) { alert(`No valid phone for ${m.first_name}.`); return; }
    openWhatsApp(m.phone_number, msgWelcome(m));
  }
  function handleReminderWA(m) {
    if (!normalizePhone(m.phone_number)) { alert(`No valid phone for ${m.first_name}.`); return; }
    const today = new Date();
    const month = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}`;
    openWhatsApp(m.phone_number, msgFeeReminder(m, month));
  }
  function handleDiscontinuedWA(m) {
    if (!normalizePhone(m.phone_number)) { alert(`No valid phone for ${m.first_name}.`); return; }
    openWhatsApp(m.phone_number, msgDiscontinued(m));
  }
  function handleReactivatedWA(m) {
    if (!normalizePhone(m.phone_number)) { alert(`No valid phone for ${m.first_name}.`); return; }
    openWhatsApp(m.phone_number, msgReactivated(m));
  }

  /* ── Custom message modal ──────────────────────────────── */
  function openMsgModal(m) { setMsgTarget(m); setMsgText(`Hello ${m.first_name} 🙏\n\n`); setMsgModal(true); }
  async function handleSendMsg(e) {
    e.preventDefault();
    if (!msgText.trim()) return;
    setMsgSending(true);
    const opened = openWhatsApp(msgTarget.phone_number, msgText);
    if (!opened) flash(`No valid phone for ${msgTarget.first_name}.`, "error");
    else { flash(`WhatsApp opened for ${msgTarget.first_name}.`); setMsgModal(false); }
    setMsgSending(false);
  }

  /* ── Bulk WA ───────────────────────────────────────────── */
  function openBulkModal() {
    setBulkMsg("Dear Member 🙏\n\nThis is a reminder from Antar Yoga.\n\nThank you,\n— Antar Yoga");
    setBulkModal(true);
  }
  async function handleBulkSend(e) {
    e.preventDefault();
    if (!bulkMsg.trim()) return;
    setBulkSending(true);
    let opened = 0;
    for (const m of withPhone) {
      openWhatsApp(m.phone_number, bulkMsg);
      opened++;
      await new Promise((r) => setTimeout(r, 300)); // small delay between tabs
    }
    flash(`WhatsApp opened for ${opened} member(s).`);
    setBulkModal(false); setBulkSending(false); clearSelection();
  }

  function flash(msg, type = "success") {
    if (type === "success") { setSuccess(msg); setTimeout(() => setSuccess(""), 3500); }
    else                    { setError(msg);   setTimeout(() => setError(""),   3500); }
  }

  /* ── Member row ────────────────────────────────────────── */
  function MemberRow({ m, rowNum }) {
    const hasPhone = !!normalizePhone(m.phone_number);
    return (
      <tr key={m.id}>
        <td style={{ width: 36, textAlign: "center" }}>
          <input type="checkbox" checked={selected.has(m.id)} onChange={() => toggleOne(m.id)}
            style={{ cursor: "pointer", width: 15, height: 15 }} />
        </td>
        <td style={{ color: "var(--text-light)", width: 40 }}>{rowNum}</td>
        <td>
          <div style={{ fontWeight: 600 }}>{m.first_name} {m.last_name || ""}</div>
          {m.email && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.email}</div>}
        </td>
        <td>{m.phone_number}</td>
        <td>{displayAge(m)}</td>
        <td>{m.batch_name ? <span className="badge badge-info">{m.batch_name}</span> : <span style={{ color: "var(--text-light)" }}>—</span>}</td>
        <td style={{ fontWeight: 700, color: "var(--sage)" }}>₹{m.fee.toLocaleString("en-IN")}</td>
        <td style={{ maxWidth: 160 }}>
          {m.health_notes
            ? <span title={m.health_notes} style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                {m.health_notes.length > 40 ? m.health_notes.slice(0, 40) + "…" : m.health_notes}
              </span>
            : <span style={{ color: "var(--text-light)" }}>—</span>}
        </td>
        <td><span className={`badge ${m.is_active ? "badge-success" : "badge-danger"}`}>{m.is_active ? "Active" : "Inactive"}</span></td>
        <td>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap" }}>
            <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
            {hasPhone ? (
              <>
                <button className="btn btn-outline btn-sm" onClick={() => handleReminderWA(m)} title="Send fee reminder">📱</button>
                <button className="btn btn-outline btn-sm" onClick={() => openMsgModal(m)} title="Custom message">💬</button>
              </>
            ) : (
              <button className="btn btn-outline btn-sm" disabled title="No WhatsApp number" style={{ opacity: 0.4 }}>📱</button>
            )}
            <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>✕</button>
          </div>
        </td>
      </tr>
    );
  }

  /* ── Batch section ─────────────────────────────────────── */
  function BatchSection({ group }) {
    const key        = group.batchId;
    const isCollapsed = !!collapsed[key];
    const bms        = group.members;
    const allChecked  = bms.length > 0 && bms.every((m) => selected.has(m.id));
    const someChecked = bms.some((m) => selected.has(m.id));
    return (
      <div className="card" style={{ padding: 0, marginBottom: 20, overflow: "hidden" }}>
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "12px 18px", background: "var(--cream-deep)",
          borderBottom: isCollapsed ? "none" : "1px solid var(--border)",
          cursor: "pointer", userSelect: "none",
        }} onClick={() => toggleCollapse(key)}>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <input type="checkbox" checked={allChecked}
              ref={(el) => { if (el) el.indeterminate = someChecked && !allChecked; }}
              onChange={(e) => { e.stopPropagation(); toggleBatch(bms); }}
              onClick={(e) => e.stopPropagation()}
              style={{ cursor: "pointer", width: 15, height: 15 }} />
            <span style={{ fontWeight: 700, fontSize: "0.95rem" }}>{group.batchName}</span>
            <span className="badge badge-muted" style={{ fontSize: "0.72rem" }}>{bms.length} member{bms.length !== 1 ? "s" : ""}</span>
          </div>
          <span style={{ color: "var(--text-muted)", fontSize: "0.8rem" }}>{isCollapsed ? "▶ expand" : "▼ collapse"}</span>
        </div>
        {!isCollapsed && (
          <div className="table-wrapper">
            <table>
              <thead><tr><th style={{ width: 36 }}></th><th style={{ width: 40 }}>#</th><th>Name</th><th>Phone</th><th>Age</th><th>Batch</th><th>Fee/mo</th><th>Health</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>
                {bms.length === 0
                  ? <tr><td colSpan="10" className="empty">No members.</td></tr>
                  : bms.map((m, idx) => <MemberRow key={m.id} m={m} rowNum={idx + 1} />)}
              </tbody>
            </table>
          </div>
        )}
      </div>
    );
  }

  /* ── RENDER ─────────────────────────────────────────────── */
  return (
    <>
      <div className="page-header">
        <h1>Members</h1>
        <button className="btn btn-primary desktop-only" onClick={openAdd}>+ Add Member</button>
      </div>
      {error   && <div className="alert alert-error">{error}</div>}
      {success && <div className="alert alert-success">{success}</div>}

      {/* Tab switcher */}
      <div style={{ display: "flex", gap: 6, marginBottom: 16, borderBottom: "2px solid var(--border)", paddingBottom: 8 }}>
        {[
          { key: "active",       label: `Active (${members.length})` },
          { key: "discontinued", label: `Discontinued (${inactiveMembers.length})` },
        ].map(({ key, label }) => (
          <button key={key} onClick={() => setTab(key)} style={{
            padding: "6px 16px", border: "none", borderRadius: "6px 6px 0 0",
            cursor: "pointer", fontWeight: tab === key ? 700 : 400, fontSize: "0.875rem",
            background: tab === key ? "var(--sidebar-bg)" : "transparent",
            color: tab === key ? "#fff" : "var(--text-muted)",
          }}>{label}</button>
        ))}
      </div>

      {/* ── ACTIVE TAB ──────────────────────────────────────── */}
      {tab === "active" && (
        <>
          {/* Toolbar */}
          <div className="card" style={{ padding: "12px 16px", marginBottom: 16 }}>
            <div style={{ display: "flex", gap: 10, flexWrap: "wrap", alignItems: "center" }}>
              <input type="text" placeholder="🔍  Search by name or phone…" value={search}
                onChange={(e) => handleSearch(e.target.value)} style={{ flex: "1 1 200px", minWidth: 140 }} />
              <button className="btn btn-outline btn-sm" onClick={toggleAll}>
                {members.length > 0 && members.every((m) => selected.has(m.id)) ? "☐ Deselect All" : "☑ Select All"}
              </button>
              {selected.size > 0 && (
                <>
                  <span style={{ fontSize: "0.85rem", color: "var(--sage)", fontWeight: 600 }}>
                    {selected.size} selected
                  </span>
                  <button className="btn btn-success btn-sm" onClick={openBulkModal}>📱 WhatsApp</button>
                  <button className="btn btn-danger btn-sm" onClick={handleBulkDeactivate}>🚫 Discontinue</button>
                  <button className="btn btn-outline btn-sm" onClick={clearSelection}>✕ Clear</button>
                </>
              )}
              <button className="btn btn-outline btn-sm" style={{ marginLeft: "auto" }} onClick={load}>↺</button>
            </div>
          </div>
          {loading ? <div className="loading">Loading…</div> :
           members.length === 0 ? <div className="card"><div className="empty">No active members.</div></div> :
           <div className="desktop-only">{groups.map((g) => <BatchSection key={g.batchId} group={g} />)}</div>
          }
          {/* Mobile */}
          {!loading && members.length > 0 && (
            <div className="mobile-only">
              {sortMembers(members).map((m, idx) => (
                <div key={m.id} className="member-card" style={{ marginBottom: 10, border: "1px solid var(--border)", borderRadius: "var(--radius)", padding: "12px 14px", display: "flex", gap: 12, alignItems: "center", background: "#fff" }}>
                  <div style={{ width: 42, height: 42, borderRadius: "50%", background: "var(--sage-pale)", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, color: "var(--sage)", fontSize: "1rem", flexShrink: 0 }}>{initials(m)}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontWeight: 600 }}><span style={{ color: "var(--text-muted)", fontSize: "0.72rem", marginRight: 6 }}>{idx + 1}.</span>{m.first_name} {m.last_name || ""}</div>
                    <div style={{ fontSize: "0.75rem", color: "var(--text-muted)" }}>{m.phone_number}{m.batch_name && <> · {m.batch_name}</>}</div>
                    <div style={{ display: "flex", gap: 5, marginTop: 6, flexWrap: "wrap" }}>
                      <button className="btn btn-outline btn-sm" onClick={() => openEdit(m)}>Edit</button>
                      {normalizePhone(m.phone_number) && <button className="btn btn-outline btn-sm" onClick={() => handleReminderWA(m)}>📱</button>}
                      <button className="btn btn-danger btn-sm" onClick={() => handleDelete(m)}>✕</button>
                    </div>
                  </div>
                  <div style={{ fontWeight: 700, color: "var(--sage)", flexShrink: 0 }}>₹{m.fee.toLocaleString("en-IN")}</div>
                </div>
              ))}
              <button className="fab" onClick={openAdd} aria-label="Add Member">+</button>
            </div>
          )}
        </>
      )}

      {/* ── DISCONTINUED TAB ────────────────────────────────── */}
      {tab === "discontinued" && (
        <div className="card" style={{ padding: 0, overflow: "hidden" }}>
          <div style={{ padding: "10px 18px", background: "var(--danger-bg)", borderBottom: "1px solid var(--border)", display: "flex", alignItems: "center", gap: 8 }}>
            <span style={{ fontWeight: 700, color: "var(--danger)" }}>Discontinued Members</span>
            <span className="badge badge-danger">{inactiveMembers.length}</span>
            <span style={{ marginLeft: "auto", fontSize: "0.78rem", color: "var(--text-muted)" }}>Historical records preserved</span>
          </div>
          {inactiveMembers.length === 0 ? (
            <div className="empty" style={{ padding: 32 }}>No discontinued members.</div>
          ) : (
            <div className="table-wrapper">
              <table>
                <thead>
                  <tr><th>#</th><th>Name</th><th>Phone</th><th>Batch</th><th>Fee/mo</th><th>Actions</th></tr>
                </thead>
                <tbody>
                  {sortMembers(inactiveMembers).map((m, idx) => (
                    <tr key={m.id}>
                      <td style={{ color: "var(--text-light)" }}>{idx + 1}</td>
                      <td style={{ fontWeight: 600 }}>{m.first_name} {m.last_name || ""}</td>
                      <td style={{ color: "var(--text-muted)" }}>{m.phone_number || "—"}</td>
                      <td>{m.batch_name ? <span className="badge badge-muted">{m.batch_name}</span> : <span style={{ color: "var(--text-light)" }}>—</span>}</td>
                      <td style={{ color: "var(--text-muted)" }}>₹{m.fee.toLocaleString("en-IN")}</td>
                      <td>
                        <div style={{ display: "flex", gap: 5, flexWrap: "wrap" }}>
                          <button
                            className="btn btn-success btn-sm"
                            onClick={() => handleReactivate(m)}
                            disabled={togglingId === m.id}
                            title="Reactivate this member — restores to active"
                          >
                            {togglingId === m.id ? "…" : "↺ Reactivate"}
                          </button>
                          {normalizePhone(m.phone_number) && (
                            <>
                              <button className="btn btn-outline btn-sm" onClick={() => handleDiscontinuedWA(m)} title="WhatsApp message">📱 WA</button>
                              <button className="btn btn-gold btn-sm" onClick={() => handleReactivatedWA(m)} title="Send welcome-back message">↩ Welcome</button>
                            </>
                          )}
                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handlePermanentDelete(m)}
                            title="Permanently delete this member and all records"
                          >
                            🗑 Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* ── ADD / EDIT MODAL ─────────────────────────────────── */}
      {modalOpen && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && closeModal()}>
          <div className="modal">
            <h2>{editTarget ? "Edit Member" : "Add Member"}</h2>
            {formError && <div className="alert alert-error">{formError}</div>}
            {!editTarget && <div className="alert alert-info" style={{ fontSize: "0.82rem" }}>A payment record will be auto-created for the current month when fee &gt; ₹0.</div>}
            <form onSubmit={handleSubmit}>
              <div className="modal-section-label">Identity</div>
              <div className="form-row">
                <div className="form-group"><label>First Name *</label><input value={form.first_name} onChange={(e) => fld("first_name", e.target.value)} required /></div>
                <div className="form-group"><label>Last Name</label><input value={form.last_name} onChange={(e) => fld("last_name", e.target.value)} /></div>
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>Date of Birth</label>
                  <input type="date" value={form.date_of_birth} onChange={(e) => fld("date_of_birth", e.target.value)} max={new Date().toISOString().slice(0, 10)} />
                  {form.date_of_birth && <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: 4 }}>Age: <strong>{calcAge(form.date_of_birth)} years</strong></div>}
                </div>
                <div className="form-group"><label>Join Date</label><input type="date" value={form.join_date} onChange={(e) => fld("join_date", e.target.value)} /></div>
              </div>
              <div className="modal-section-label">Contact</div>
              <div className="form-row">
                <div className="form-group"><label>Phone *</label><input value={form.phone_number} onChange={(e) => fld("phone_number", e.target.value)} required /></div>
                <div className="form-group"><label>Email</label><input type="email" value={form.email} onChange={(e) => fld("email", e.target.value)} /></div>
              </div>
              <div className="modal-section-label">Studio</div>
              <div className="form-row">
                <div className="form-group"><label>Monthly Fee (₹) *</label><input type="number" min="0" value={form.fee} onChange={(e) => fld("fee", e.target.value)} required /></div>
                <div className="form-group">
                  <label>Batch</label>
                  <select value={form.batch_id} onChange={(e) => fld("batch_id", e.target.value)}>
                    <option value="">— No batch —</option>
                    {batches.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
                  </select>
                </div>
              </div>
              <div className="modal-section-label">Health &amp; Physical</div>
              <div className="form-row">
                <div className="form-group"><label>Height (cm)</label><input type="number" min="50" max="250" step="0.1" value={form.height_cm} onChange={(e) => fld("height_cm", e.target.value)} /></div>
                <div className="form-group"><label>Weight (kg)</label><input type="number" min="10" max="300" step="0.1" value={form.weight_kg} onChange={(e) => fld("weight_kg", e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label>Medical Conditions / Health Notes</label>
                <textarea rows={3} value={form.health_notes} onChange={(e) => fld("health_notes", e.target.value)} style={{ resize: "vertical" }} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn-primary" disabled={submitting}>{submitting ? "Saving…" : editTarget ? "Update Member" : "Add Member"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── BULK WA MODAL ───────────────────────────────────── */}
      {bulkModal && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setBulkModal(false)}>
          <div className="modal">
            <h2>📱 Send WhatsApp Message</h2>
            <div style={{ marginBottom: 14, padding: "10px 14px", background: "var(--cream)", borderRadius: 8, border: "1px solid var(--border)", fontSize: "0.83rem" }}>
              <div style={{ fontWeight: 600, marginBottom: 6 }}>{withPhone.length} recipient(s)</div>
              {withPhone.map((m) => <div key={m.id} style={{ color: "var(--text-muted)" }}>✓ {m.first_name} {m.last_name || ""} — {m.phone_number}</div>)}
              {withoutPhone.length > 0 && (
                <div style={{ marginTop: 8, borderTop: "1px solid var(--border)", paddingTop: 8 }}>
                  <div style={{ color: "var(--danger)", fontWeight: 600, marginBottom: 4 }}>⚠ No valid phone — will be skipped:</div>
                  {withoutPhone.map((m) => <div key={m.id} style={{ color: "var(--danger)" }}>{m.first_name} {m.last_name || ""}</div>)}
                </div>
              )}
            </div>
            {withPhone.length === 0
              ? <div className="alert alert-error">None of the selected members have a valid phone number.</div>
              : <form onSubmit={handleBulkSend}>
                  <div className="alert alert-info" style={{ fontSize: "0.8rem", marginBottom: 10 }}>WhatsApp will open for each recipient. You must manually press Send in each chat.</div>
                  <div className="form-group"><label>Message *</label><textarea rows={6} value={bulkMsg} onChange={(e) => setBulkMsg(e.target.value)} required style={{ resize: "vertical" }} /></div>
                  <div className="modal-footer">
                    <button type="button" className="btn btn-outline" onClick={() => setBulkModal(false)}>Cancel</button>
                    <button type="submit" className="btn btn-success" disabled={bulkSending || !bulkMsg.trim()}>
                      {bulkSending ? "Opening…" : `📱 Open WhatsApp (${withPhone.length})`}
                    </button>
                  </div>
                </form>
            }
          </div>
        </div>
      )}

      {/* ── INDIVIDUAL MESSAGE MODAL ─────────────────────────── */}
      {msgModal && msgTarget && (
        <div className="modal-overlay" onClick={(e) => e.target === e.currentTarget && setMsgModal(false)}>
          <div className="modal">
            <h2>WhatsApp Message</h2>
            <p style={{ fontSize: "0.875rem", color: "var(--text-muted)", marginBottom: 16 }}>To: <strong>{msgTarget.first_name} {msgTarget.last_name || ""}</strong> · {msgTarget.phone_number}</p>
            <form onSubmit={handleSendMsg}>
              <div className="form-group">
                <label>Message *</label>
                <textarea rows={6} value={msgText} onChange={(e) => setMsgText(e.target.value)} required style={{ resize: "vertical" }} />
              </div>
              <div style={{ marginBottom: 14 }}>
                <div style={{ fontSize: "0.72rem", color: "var(--text-muted)", marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.06em", fontWeight: 600 }}>Quick templates</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {[
                    { label: "Welcome",         text: msgWelcome(msgTarget) },
                    { label: "Fee Reminder",    text: msgFeeReminder(msgTarget, new Date().toISOString().slice(0, 7)) },
                    { label: "Class Cancelled", text: `Hello ${msgTarget.first_name} 🙏\n\nToday's class has been cancelled. We'll resume tomorrow as usual.\n\nSorry for the inconvenience 🙏\n— Antar Yoga` },
                    { label: "Holiday Notice",  text: `Hello ${msgTarget.first_name} 🙏\n\nThe studio will be closed tomorrow. Classes resume the day after.\n\nThank you 🙏\n— Antar Yoga` },
                  ].map((t) => (
                    <button key={t.label} type="button" className="btn btn-outline btn-sm"
                      onClick={() => setMsgText(t.text)}>{t.label}</button>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-outline" onClick={() => setMsgModal(false)}>Cancel</button>
                <button type="submit" className="btn btn-success" disabled={msgSending || !msgText.trim()}>📱 Open WhatsApp</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}
