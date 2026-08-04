async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (error) {
    // ignore network errors, still clear local state and redirect
  }
  localStorage.removeItem('userEmail');
  window.location.href = '/login';
}

function initLogoutButton() {
  const topbarActions = document.querySelector('.topbar-actions');
  if (topbarActions) {
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Déconnexion';
    logoutBtn.style.cursor = 'pointer';
    logoutBtn.style.background = '#e74c3c';
    logoutBtn.style.color = 'white';
    logoutBtn.style.border = 'none';
    logoutBtn.style.padding = '8px 16px';
    logoutBtn.style.borderRadius = '6px';
    logoutBtn.style.fontSize = '14px';
    logoutBtn.style.marginLeft = '12px';
    logoutBtn.onclick = logout;

    topbarActions.appendChild(logoutBtn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLogoutButton();
});
