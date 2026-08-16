async function logout() {
  try {
    await fetch('/api/logout', { method: 'POST' });
  } catch (error) {
    // ignore network errors, still clear local state and redirect
  }
  localStorage.removeItem('userEmail');
  // Console Admin (etape 3) : efface le contexte "agence consultee" (sessionStorage,
  // cles definies dans scripts/client-portal.js) pour qu'un nouveau compte connecte
  // dans le meme onglet ne recupere jamais l'agence choisie par la session precedente.
  sessionStorage.removeItem('bw_admin_target_agency_id');
  sessionStorage.removeItem('bw_admin_target_agency_name');
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
