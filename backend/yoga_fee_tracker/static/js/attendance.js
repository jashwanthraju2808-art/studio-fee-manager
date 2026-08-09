/* ============================================================
   attendance.js – mark / save daily attendance
   ============================================================ */

// ── Toggle card visual when checkbox changes ──────────────────
function toggleCard(checkbox) {
  const card   = checkbox.closest('.att-card');
  const status = card.querySelector('.att-status');

  if (checkbox.checked) {
    card.classList.add('present');
    status.textContent = '✅ Present';
  } else {
    card.classList.remove('present');
    status.textContent = '❌ Absent';
  }
  updateCount();
}

// ── Select all / none ─────────────────────────────────────────
function selectAll(present) {
  document.querySelectorAll('.att-card input[type=checkbox]').forEach(cb => {
    cb.checked = present;
    toggleCard(cb);
  });
}

// ── Update present count display ──────────────────────────────
function updateCount() {
  const total   = document.querySelectorAll('.att-card input').length;
  const present = document.querySelectorAll('.att-card input:checked').length;
  const countEl = document.getElementById('presentCount');
  if (countEl) countEl.textContent = `${present} Present`;
}

// ── Save attendance via API ───────────────────────────────────
document.getElementById('attForm').addEventListener('submit', async function (e) {
  e.preventDefault();

  const presentIds = Array.from(
    document.querySelectorAll('.att-card input:checked')
  ).map(cb => parseInt(cb.value));

  const submitBtn = this.querySelector('[type=submit]');
  submitBtn.disabled    = true;
  submitBtn.textContent = 'Saving…';

  try {
    const res  = await fetch('/api/attendance', {
      method:  'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        date:        ATT_DATE,
        present_ids: presentIds,
        student_ids: ALL_STUDENT_IDS
      })
    });
    const data = await res.json();

    if (data.success) {
      showToast('✅ Attendance saved for ' + ATT_DATE);
    } else {
      showToast('❌ Could not save attendance');
    }
  } catch (err) {
    showToast('❌ Network error');
  } finally {
    submitBtn.disabled    = false;
    submitBtn.textContent = '💾 Save Attendance';
  }
});

// Initialise count on load
document.addEventListener('DOMContentLoaded', updateCount);
