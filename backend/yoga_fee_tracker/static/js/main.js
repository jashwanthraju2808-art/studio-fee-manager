/* ============================================================
   main.js – shared utilities loaded on every page
   ============================================================ */

// ── Modal helpers ────────────────────────────────────────────
function openModal(id) {
  document.getElementById(id).classList.add('open');
  document.getElementById('modalBackdrop').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeModal(id) {
  document.getElementById(id).classList.remove('open');
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
}

// Close modal when backdrop is clicked
document.getElementById('modalBackdrop').addEventListener('click', () => {
  document.querySelectorAll('.modal.open').forEach(m => m.classList.remove('open'));
  document.getElementById('modalBackdrop').classList.remove('open');
  document.body.style.overflow = '';
});

// ── Toast ────────────────────────────────────────────────────
function showToast(msg, duration = 3000) {
  let toast = document.getElementById('toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.id = 'toast';
    toast.className = 'toast';
    document.body.appendChild(toast);
  }
  toast.textContent = msg;
  toast.style.display = 'block';
  clearTimeout(toast._timer);
  toast._timer = setTimeout(() => { toast.style.display = 'none'; }, duration);
}

// ── Sidebar toggle (mobile) ──────────────────────────────────
const toggleBtn = document.getElementById('sidebarToggle');
if (toggleBtn) {
  toggleBtn.addEventListener('click', () => {
    document.querySelector('.sidebar').classList.toggle('open');
  });
}

// ── Today's date in topbar ───────────────────────────────────
(function setTodayLabel() {
  const el = document.querySelector('.today-badge');
  if (!el) return;
  const d = new Date();
  el.textContent = '📆 ' + d.toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'short', year: 'numeric'
  });
})();
