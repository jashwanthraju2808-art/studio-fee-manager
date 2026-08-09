/* ============================================================
   payments.js – record / delete payments
   ============================================================ */

// ── Set defaults when page loads ─────────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const dateField = document.getElementById('pDate');
  if (dateField) dateField.value = new Date().toISOString().slice(0, 10);

  const monthField = document.getElementById('pMonth');
  if (monthField && !monthField.value) {
    monthField.value = SELECTED_MONTH;
  }
});

// ── Open blank payment modal ──────────────────────────────────
function openPayModal() {
  document.getElementById('payForm').reset();
  document.getElementById('pDate').value  = new Date().toISOString().slice(0, 10);
  document.getElementById('pMonth').value = SELECTED_MONTH;
  openModal('payModal');
}

// ── Quick-pay: pre-fill from unpaid row ───────────────────────
function quickPay(studentId, studentName, feeAmount) {
  document.getElementById('payForm').reset();

  // pre-select the student
  const sel = document.getElementById('pStudent');
  for (let i = 0; i < sel.options.length; i++) {
    if (parseInt(sel.options[i].value) === studentId) {
      sel.selectedIndex = i;
      break;
    }
  }

  document.getElementById('pAmount').value = feeAmount;
  document.getElementById('pMonth').value  = SELECTED_MONTH;
  document.getElementById('pDate').value   = new Date().toISOString().slice(0, 10);
  openModal('payModal');
}

// ── Submit payment form ───────────────────────────────────────
document.getElementById('payForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const studentId = document.getElementById('pStudent').value;
  const amount    = document.getElementById('pAmount').value;
  const month     = document.getElementById('pMonth').value;
  const paidDate  = document.getElementById('pDate').value;
  const note      = document.getElementById('pNote').value.trim();

  if (!studentId || !amount || !month || !paidDate) {
    showToast('❌ Please fill all required fields');
    return;
  }

  const submitBtn = this.querySelector('[type=submit]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  try {
    const res  = await fetch('/api/payments', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        student_id: parseInt(studentId),
        amount:     parseFloat(amount),
        month,
        paid_date: paidDate,
        note
      })
    });
    const data = await res.json();

    if (data.success || data.id) {
      showToast('✅ Payment recorded!');
      // Reload to the same month
      setTimeout(() => {
        location.href = `/payments?month=${month}`;
      }, 700);
    } else {
      showToast('❌ ' + (data.error || 'Something went wrong'));
      submitBtn.disabled    = false;
      submitBtn.textContent = 'Save Payment';
    }
  } catch (err) {
    showToast('❌ Network error');
    submitBtn.disabled    = false;
    submitBtn.textContent = 'Save Payment';
  }
});

// ── Delete a payment ──────────────────────────────────────────
async function deletePayment(id) {
  if (!confirm('Remove this payment record?')) return;

  try {
    const res  = await fetch(`/api/payments/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('🗑️ Payment removed');
      setTimeout(() => location.reload(), 600);
    } else {
      showToast('❌ Could not delete payment');
    }
  } catch (e) {
    showToast('❌ Network error');
  }
}
