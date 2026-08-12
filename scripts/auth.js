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
    // Style entierement dans styles.css (classe .logout-btn) - coherent avec le
    // reste des actions du bandeau, pas d'inline style ici.
    const logoutBtn = document.createElement('button');
    logoutBtn.className = 'logout-btn';
    logoutBtn.textContent = 'Déconnexion';
    logoutBtn.onclick = logout;

    topbarActions.appendChild(logoutBtn);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  initLogoutButton();
});
