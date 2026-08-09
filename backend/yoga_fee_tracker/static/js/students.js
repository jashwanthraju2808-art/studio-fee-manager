/* ============================================================
   students.js – add / edit / delete students
   ============================================================ */

// ── Set default join date to today ───────────────────────────
document.addEventListener('DOMContentLoaded', () => {
  const joinField = document.getElementById('sJoinDate');
  if (joinField && !joinField.value) {
    joinField.value = new Date().toISOString().slice(0, 10);
  }
});

// ── Live search ───────────────────────────────────────────────
document.getElementById('studentSearch').addEventListener('input', function () {
  const q = this.value.toLowerCase();
  document.querySelectorAll('#studentsTable tbody tr[data-name]').forEach(row => {
    row.style.display = row.dataset.name.includes(q) ? '' : 'none';
  });
});

// ── Open Add modal ────────────────────────────────────────────
function openAddModal() {
  document.getElementById('modalTitle').textContent = 'Add Student';
  document.getElementById('saveBtn').textContent    = 'Save Student';
  document.getElementById('studentForm').reset();
  document.getElementById('studentId').value = '';
  document.getElementById('sJoinDate').value = new Date().toISOString().slice(0, 10);
  document.getElementById('sActive').value   = '1';
  openModal('studentModal');
}

// ── Open Edit modal ───────────────────────────────────────────
async function openEditModal(id) {
  try {
    const res  = await fetch(`/api/students/${id}`);
    const data = await res.json();
    if (data.error) { showToast('❌ Could not load student data'); return; }

    document.getElementById('modalTitle').textContent = 'Edit Student';
    document.getElementById('saveBtn').textContent    = 'Update Student';
    document.getElementById('studentId').value   = data.id;
    document.getElementById('sName').value       = data.name       || '';
    document.getElementById('sPhone').value      = data.phone      || '';
    document.getElementById('sEmail').value      = data.email      || '';
    document.getElementById('sAddress').value    = data.address    || '';
    document.getElementById('sFee').value        = data.fee_amount || 0;
    document.getElementById('sJoinDate').value   = data.join_date  || '';
    document.getElementById('sActive').value     = data.active     ?? 1;
    openModal('studentModal');
  } catch (e) {
    showToast('❌ Network error');
  }
}

// ── Save (add or update) ──────────────────────────────────────
document.getElementById('studentForm').addEventListener('submit', async function (e) {
  e.preventDefault();
  const id = document.getElementById('studentId').value;

  const payload = {
    name:       document.getElementById('sName').value.trim(),
    phone:      document.getElementById('sPhone').value.trim(),
    email:      document.getElementById('sEmail').value.trim(),
    address:    document.getElementById('sAddress').value.trim(),
    fee_amount: parseFloat(document.getElementById('sFee').value) || 0,
    join_date:  document.getElementById('sJoinDate').value,
    active:     parseInt(document.getElementById('sActive').value)
  };

  if (!payload.name) { showToast('❌ Name is required'); return; }

  const saveBtn = document.getElementById('saveBtn');
  saveBtn.disabled    = true;
  saveBtn.textContent = 'Saving…';

  try {
    const url    = id ? `/api/students/${id}` : '/api/students';
    const method = id ? 'PUT' : 'POST';
    const res    = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    });
    const data = await res.json();

    if (data.success || data.id) {
      showToast(id ? '✅ Student updated!' : '✅ Student added!');
      setTimeout(() => location.reload(), 800);
    } else {
      showToast('❌ ' + (data.error || 'Something went wrong'));
      saveBtn.disabled    = false;
      saveBtn.textContent = id ? 'Update Student' : 'Save Student';
    }
  } catch (err) {
    showToast('❌ Network error');
    saveBtn.disabled    = false;
    saveBtn.textContent = id ? 'Update Student' : 'Save Student';
  }
});

// ── Delete student ────────────────────────────────────────────
async function deleteStudent(id, name) {
  if (!confirm(`Delete "${name}"? This will also remove their payment and attendance records.`)) return;

  try {
    const res  = await fetch(`/api/students/${id}`, { method: 'DELETE' });
    const data = await res.json();
    if (data.success) {
      showToast('🗑️ Student deleted');
      setTimeout(() => location.reload(), 600);
    } else {
      showToast('❌ Could not delete student');
    }
  } catch (e) {
    showToast('❌ Network error');
  }
}
