import { useEffect, useState, useCallback } from "react";
import { getMembers } from "../api/memberApi";
import {
  getPayments,
  getPaymentsByMonth,
  createPayment,
  updatePayment,
  deletePayment,
} from "../api/paymentApi";

const today = new Date();

const THIS_MONTH = `${today.getFullYear()}-${String(
  today.getMonth() + 1
).padStart(2, "0")}`;

const EMPTY_FORM = {
  member_id: "",
  amount: "",
  month: THIS_MONTH,
  payment_date: today.toISOString().slice(0, 10),
  note: "",
};

export default function Payments() {
  const [payments, setPayments] = useState([]);
  const [members, setMembers] = useState([]);
  const [filterMonth, setFilterMonth] = useState(THIS_MONTH);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const [modalOpen, setModalOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [formError, setFormError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const loadPayments = useCallback(async (month) => {
    setLoading(true);
    setError("");

    try {
      const res = month
        ? await getPaymentsByMonth(month)
        : await getPayments();

      setPayments(res.data);
    } catch {
      setError("Could not load payments.");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadPayments(filterMonth);

    getMembers()
      .then((r) => setMembers(r.data))
      .catch(() => {});
  }, [loadPayments, filterMonth]);

  // ── Modal helpers ──────────────────────────────────────────

  function openAdd() {
    setEditTarget(null);
    setForm(EMPTY_FORM);
    setFormError("");
    setModalOpen(true);
  }

  function openEdit(p) {
    setEditTarget(p);

    setForm({
      member_id: String(p.member_id),
      amount: String(p.amount),
      month: p.month,
      payment_date: p.payment_date,
      note: p.note || "",
    });

    setFormError("");
    setModalOpen(true);
  }

  function closeModal() {
    setModalOpen(false);
    setEditTarget(null);
    setFormError("");
  }

  // ── Submit ─────────────────────────────────────────────────

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError("");

    const payload = {
      member_id: parseInt(form.member_id, 10),
      amount: parseInt(form.amount, 10),
      month: form.month,
      payment_date: form.payment_date,
      note: form.note.trim() || null,
    };

    if (
      !payload.member_id ||
      isNaN(payload.amount) ||
      !payload.month ||
      !payload.payment_date
    ) {
      setFormError("Please fill in all required fields.");
      return;
    }

    setSubmitting(true);

    try {
      if (editTarget) {
        await updatePayment(editTarget.id, payload);
        flash("Payment updated.", "success");
      } else {
        await createPayment(payload);
        flash("Payment recorded.", "success");
      }

      closeModal();
      loadPayments(filterMonth);
    } catch (err) {
      setFormError(
        err.response?.data?.detail || "Could not save payment."
      );
    } finally {
      setSubmitting(false);
    }
  }

  // ── Delete ─────────────────────────────────────────────────

  async function handleDelete(p) {
    if (
      !window.confirm(
        `Delete ₹${p.amount} payment for ${p.month}?`
      )
    ) {
      return;
    }

    try {
      await deletePayment(p.id);
      flash("Payment deleted.", "success");
      loadPayments(filterMonth);
    } catch (err) {
      flash(
        err.response?.data?.detail || "Could not delete payment.",
        "error"
      );
    }
  }

  // ── Flash message ──────────────────────────────────────────

  function flash(msg, type) {
    if (type === "success") {
      setSuccess(msg);
      setTimeout(() => setSuccess(""), 3000);
    } else {
      setError(msg);
      setTimeout(() => setError(""), 3000);
    }
  }

  // ── Member name ────────────────────────────────────────────

  const memberName = (id) => {
    const m = members.find((m) => m.id === id);

    return m
      ? `${m.first_name} ${m.last_name}`
      : `Member #${id}`;
  };

  // ── WhatsApp ───────────────────────────────────────────────

  function sendWhatsApp(member) {
    if (!member || !member.phone_number) {
      alert("This member does not have a phone number.");
      return;
    }

    // Remove spaces, +, -, brackets etc.
    let phone = String(member.phone_number).replace(/\D/g, "");

    // Automatically add India country code for 10-digit numbers.
    if (phone.length === 10) {
      phone = "91" + phone;
    }

    const message = `Hi ${member.first_name},

Your Antar Yoga monthly fee of ₹${member.fee} is due.

Please make the payment at your convenience.

Thank you,
Antar Yoga`;

    const whatsappUrl =
      `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;

    window.open(whatsappUrl, "_blank", "noopener,noreferrer");
  }

  // ── Get member for payment ─────────────────────────────────

  const getMemberForPayment = (payment) => {
    return members.find((m) => m.id === payment.member_id);
  };

  const totalCollected = payments.reduce(
    (s, p) => s + p.amount,
    0
  );

  return (
    <>
      <div className="page-header">
        <div>
          <h1>Payments</h1>
          <p>Track and manage member payments.</p>
        </div>

        <button className="btn btn-primary" onClick={openAdd}>
          + Record Payment
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          {error}
        </div>
      )}

      {success && (
        <div className="alert alert-success">
          {success}
        </div>
      )}

      <div className="card">
        {/* Filters */}

        <div
          style={{
            display: "flex",
            gap: 12,
            alignItems: "center",
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <label
            style={{
              fontSize: "0.85rem",
              fontWeight: 500,
            }}
          >
            Filter by month:
          </label>

          <input
            type="month"
            value={filterMonth}
            onChange={(e) => setFilterMonth(e.target.value)}
            style={{
              padding: "6px 10px",
              borderRadius: 6,
              border: "1px solid #d1d5db",
              fontSize: "0.88rem",
            }}
          />

          <button
            className="btn btn-outline btn-sm"
            onClick={() => setFilterMonth("")}
          >
            Show All
          </button>

          <span
            style={{
              marginLeft: "auto",
              fontWeight: 600,
              color: "#16a34a",
            }}
          >
            Total: ₹{totalCollected.toLocaleString()}
          </span>
        </div>

        {loading ? (
          <div className="loading">
            Loading payments…
          </div>
        ) : (
          <div className="table-wrapper">
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>Member</th>
                  <th>Amount</th>
                  <th>Month</th>
                  <th>Date</th>
                  <th>Note</th>
                  <th>Actions</th>
                </tr>
              </thead>

              <tbody>
                {payments.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="empty">
                      No payments found.
                    </td>
                  </tr>
                ) : (
                  payments.map((p) => {
                    const member = getMemberForPayment(p);

                    return (
                      <tr key={p.id}>
                        <td style={{ color: "#aaa" }}>
                          {p.id}
                        </td>

                        <td>
                          {memberName(p.member_id)}
                        </td>

                        <td>
                          <strong>
                            ₹{p.amount.toLocaleString()}
                          </strong>
                        </td>

                        <td>{p.month}</td>

                        <td>{p.payment_date}</td>

                        <td
                          style={{
                            color: "#888",
                            fontSize: "0.85rem",
                          }}
                        >
                          {p.note || "—"}
                        </td>

                        <td
                          style={{
                            display: "flex",
                            gap: 6,
                            flexWrap: "wrap",
                          }}
                        >
                          {/* WhatsApp */}

                          <button
                            className="btn btn-success btn-sm"
                            onClick={() =>
                              sendWhatsApp(member)
                            }
                            title="Open WhatsApp with a pre-filled fee message"
                          >
                            📱 WhatsApp
                          </button>

                          {/* Edit */}

                          <button
                            className="btn btn-warning btn-sm"
                            onClick={() => openEdit(p)}
                          >
                            ✏️ Edit
                          </button>

                          {/* Delete */}

                          <button
                            className="btn btn-danger btn-sm"
                            onClick={() => handleDelete(p)}
                          >
                            🗑 Delete
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

      {/* ── Add / Edit Modal ──────────────────────────────── */}

      {modalOpen && (
        <div
          className="modal-overlay"
          onClick={(e) =>
            e.target === e.currentTarget &&
            closeModal()
          }
        >
          <div className="modal">
            <h2>
              {editTarget
                ? "Edit Payment"
                : "Record Payment"}
            </h2>

            {formError && (
              <div className="alert alert-error">
                {formError}
              </div>
            )}

            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Member *</label>

                <select
                  value={form.member_id}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      member_id: e.target.value,
                    })
                  }
                  required
                >
                  <option value="">
                    — Select member —
                  </option>

                  {members.map((m) => (
                    <option key={m.id} value={m.id}>
                      {m.first_name} {m.last_name} (₹
                      {m.fee}/mo)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-row">
                <div className="form-group">
                  <label>Amount (₹) *</label>

                  <input
                    type="number"
                    min="1"
                    value={form.amount}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        amount: e.target.value,
                      })
                    }
                    placeholder="1500"
                    required
                  />
                </div>

                <div className="form-group">
                  <label>Month *</label>

                  <input
                    type="month"
                    value={form.month}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        month: e.target.value,
                      })
                    }
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label>Payment Date *</label>

                <input
                  type="date"
                  value={form.payment_date}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      payment_date: e.target.value,
                    })
                  }
                  required
                />
              </div>

              <div className="form-group">
                <label>Note (optional)</label>

                <input
                  value={form.note}
                  onChange={(e) =>
                    setForm({
                      ...form,
                      note: e.target.value,
                    })
                  }
                  placeholder="e.g. Paid in advance"
                />
              </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-outline"
                  onClick={closeModal}
                >
                  Cancel
                </button>

                <button
                  type="submit"
                  className="btn btn-success"
                  disabled={submitting}
                >
                  {submitting
                    ? "Saving…"
                    : editTarget
                    ? "Update Payment"
                    : "Record Payment"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}