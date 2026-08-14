// Echappement minimal pour toute valeur Airtable inseree dans un template innerHTML.
// Utilise pour les nouveaux champs texte libre (ex. Agent Vocal) affiches dynamiquement.
function escapeHtml(value) {
  return String(value || '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
}

// Icones SVG inline (trait, 24x24, currentColor) pour les cartes "Acces rapides" -
// aucune dependance externe, style coherent avec la fleche deja utilisee dans
// createNavigationBanner (stroke-width 2, linecap/linejoin round).
const ICON_DEVIS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>';
const ICON_FACTURES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2h12v20l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6"/><path d="M9 12h6"/></svg>';
const ICON_CONTRAT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6"/><path d="m9 15 2 2 4-4"/></svg>';
const ICON_AVANCEMENT = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 3v18h18"/><path d="m19 9-5 5-4-4-4 4"/></svg>';
const ICON_RESSOURCES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/></svg>';
const ICON_AGENT_VOCAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="2" width="6" height="11" rx="3"/><path d="M5 10a7 7 0 0 0 14 0"/><line x1="12" y1="19" x2="12" y2="22"/></svg>';
const ICON_CHEVRON = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6l6 6-6 6"/></svg>';

function statusClass(statut) {
  const value = (statut || '').toLowerCase();
  if (['accepté', 'accepte', 'payée', 'payee', 'signé', 'signe', 'actif'].some(s => value.includes(s))) return 'active';
  if (['refusé', 'refuse', 'annulé', 'annule', 'en retard', 'impayée', 'impayee'].some(s => value.includes(s))) return 'critical';
  return 'pending';
}

function createNavigationBanner(agencyId, title) {
  return `<div style="background: linear-gradient(135deg, #ffffff 0%, #faf6ec 100%); border: 1px solid #e6dcc5; border-radius: 24px; padding: 12px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
    <a href="/client/${agencyId}" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: #2682B4; font-weight: 600;">
      <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M19 12H5M5 12L12 19M5 12L12 5" stroke="#2682B4" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
      </svg>
      Retour
    </a>
    <div style="width: 1px; height: 24px; background: #e6dcc5;"></div>
    <span style="color: #2682B4; font-weight: 600;">${title}</span>
  </div>`;
}

function getAgencyIdFromUrl() {
  return window.location.pathname.split('/')[2] || 'agence-inconnue';
}

// Navigation persistante du portail client. Un seul composant pour desktop et
// mobile (voir .app-nav dans styles.css) - injecte dans <nav id="app-nav">
// s'il est present sur la page (absent volontairement sur les sous-pages comme
// Fiche prospect, et sur les pages hors portail comme login/roi-simulator).
// Ne liste que des routes reellement servies par lib/app.js (pageFiles) -
// jamais de destination inventee. Le WebCall n'y figure jamais : c'est un
// widget du Dashboard, pas une page de navigation.
const APP_NAV_ITEMS = [
  { key: '', label: 'Dashboard' },
  { key: 'devis', label: 'Devis' },
  { key: 'factures', label: 'Factures' },
  { key: 'contrat', label: 'Contrat' },
  { key: 'projet', label: 'Avancement' },
  { key: 'retell', label: 'Assistant vocal' },
  { key: 'ressources', label: 'Ressources' }
];

function renderPersistentNav() {
  const nav = document.querySelector('#app-nav');
  if (!nav) return;
  const agencyId = getAgencyIdFromUrl();
  // Sous-page courante = 3e segment de l'URL (/client/:agencyId/:subpage).
  const currentSubpage = window.location.pathname.split('/')[3] || '';
  nav.innerHTML = APP_NAV_ITEMS.map((item) => {
    const href = item.key ? `/client/${agencyId}/${item.key}` : `/client/${agencyId}`;
    const activeClass = item.key === currentSubpage ? ' active' : '';
    return `<a class="app-nav-item${activeClass}" href="${href}">${escapeHtml(item.label)}</a>`;
  }).join('');
  // Sur mobile, la barre defile horizontalement (voir .app-nav) : si l'onglet
  // actif tombe hors du champ visible au chargement (ex. arrivee directe sur
  // "Ressources"), on le ramene dans la zone visible sans scroll de la page.
  const activeItem = nav.querySelector('.app-nav-item.active');
  if (activeItem) activeItem.scrollIntoView({ block: 'nearest', inline: 'center' });
}

// Section "Sécurité du compte" (page Votre compte). Ne journalise jamais les
// mots de passe saisis, seulement les messages de retour utilisateur.
function initChangePasswordForm(agencyId) {
  const form = document.getElementById('changePasswordForm');
  if (!form) return;
  const messageEl = document.getElementById('passwordMessage');
  const submitBtn = document.getElementById('changePasswordBtn');

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const currentPassword = document.getElementById('currentPassword').value;
    const newPassword = document.getElementById('newPassword').value;
    const confirmPassword = document.getElementById('confirmNewPassword').value;

    messageEl.textContent = '';
    messageEl.className = 'security-message';

    if (newPassword !== confirmPassword) {
      messageEl.textContent = 'Les nouveaux mots de passe ne correspondent pas.';
      messageEl.classList.add('error');
      return;
    }

    submitBtn.disabled = true;
    submitBtn.textContent = 'Modification en cours...';

    try {
      const response = await fetch(`/client/${agencyId}/api/change-password`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword })
      });
      const data = await response.json();

      if (response.ok && data.ok) {
        messageEl.textContent = data.message || 'Votre mot de passe a été modifié avec succès.';
        messageEl.classList.add('success');
        form.reset();
      } else {
        messageEl.textContent = data.error || 'Une erreur est survenue.';
        messageEl.classList.add('error');
      }
    } catch (error) {
      messageEl.textContent = 'Erreur de connexion. Merci de réessayer.';
      messageEl.classList.add('error');
    } finally {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Modifier mon mot de passe';
    }
  });
}

async function loadClientData(endpoint, rootSelector) {
  const agencyId = getAgencyIdFromUrl();
  const response = await fetch(`/client/${agencyId}/api/${endpoint}`);
  if (!response.ok) throw new Error('Impossible de charger les donnees client');
  const payload = await response.json();
  renderClientData(payload, rootSelector);
}

function renderClientData(payload, rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  if (rootSelector === '#overview-root') {
    const agency = payload.agency;
    const agencyInitial = (agency.nomAgence || 'A').trim().charAt(0).toUpperCase() || 'A';
    root.innerHTML = `
      <section class="hero-banner" style="background-image: url('/estacade-saint-jean-de-monts.jpg')">
        <div class="hero-overlay"></div>
        <div class="hero-banner-content">
          <div class="hero-badge">Bienvenue ${agency.prenom || 'client'}</div>
          <p>Votre onboarding est deja en cours. Retrouvez ici vos documents, votre contrat et l'avancee de votre mise en place.</p>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Votre assistante vocale</div>
        <div class="contact-card">
          ${agency.logoUrl
            ? `<img src="${agency.logoUrl}" alt="Logo ${agency.nomAgence || 'agence'}" class="agency-logo">`
            : `<div class="contact-avatar">${agencyInitial}</div>`}
          <div>
            <h3>${agency.agentVocal ? escapeHtml(agency.agentVocal) : 'Assistante vocale'}</h3>
            <p>Assistante vocale de ${agency.nomAgencePublic || agency.nomAgence || 'votre agence'}</p>
          </div>
        </div>
        <div class="webcall-widget" id="webcall-widget">
          <button type="button" class="webcall-btn" id="webcall-btn" aria-label="${escapeHtml(agency.agentVocal ? `Parler avec ${agency.agentVocal}` : "Parler avec l'assistant vocal")}">
            <img src="/icone-web-call.png" alt="" class="webcall-btn-icon-img">
          </button>
          <div class="webcall-status" id="webcall-status" aria-live="polite"></div>
          <button type="button" class="webcall-unmute-btn" id="webcall-unmute-btn" hidden>Activer le son</button>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Votre interlocutrice Bluewaive</div>
        <div class="contact-card">
          <img src="/christel-bluewaive.png" alt="Christel" class="contact-photo">
          <div>
            <h3>Christel</h3>
            <p>Votre accompagnante pour l'onboarding, les documents et les premieres etapes de mise en service.</p>
            <div class="contact-actions">
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=christel@bluewaive.fr" target="_blank" rel="noreferrer">Contacter par email</a>
            </div>
          </div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Vue d'ensemble</div>
        <div class="kpis">
          <div class="kpi"><strong>${agency.volumeAppels}</strong><span>appels enregistres</span></div>
          <div class="kpi"><strong>${agency.nbAgents}</strong><span>agents</span></div>
          <div class="kpi"><strong>${agency.offreSouscrite.nom}</strong><span>offre souscrite</span></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Acces rapides</div>
        <div class="grid grid-2">
          <a class="tile" href="/client/${agency.id}/devis">
            <span class="tile-icon">${ICON_DEVIS}</span>
            <span class="tile-body"><h3>Devis</h3><p>Consultez votre offre et son statut.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile" href="/client/${agency.id}/factures">
            <span class="tile-icon">${ICON_FACTURES}</span>
            <span class="tile-body"><h3>Factures</h3><p>Retrouvez vos factures et leurs echeances.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile" href="/client/${agency.id}/contrat">
            <span class="tile-icon">${ICON_CONTRAT}</span>
            <span class="tile-body"><h3>Contrat</h3><p>Consultez votre contrat signe et les dates cles.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-accent" href="/client/${agency.id}/projet">
            <span class="tile-icon">${ICON_AVANCEMENT}</span>
            <span class="tile-body"><h3>Avancement</h3><p>Suivez les etapes de votre onboarding.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-accent" href="/client/${agency.id}/ressources">
            <span class="tile-icon">${ICON_RESSOURCES}</span>
            <span class="tile-body"><h3>Ressources</h3><p>Accedez aux guides et supports utiles.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-accent" href="/client/${agency.id}/retell">
            <span class="tile-icon">${ICON_AGENT_VOCAL}</span>
            <span class="tile-body"><h3>Agent vocal</h3><p>Consultez l'activite de votre agent vocal.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
        </div>
      </section>
    `;
    initWebCallWidget(agency.id, agency.agentVocal || '');
    return;
  }

  if (rootSelector === '#devis-root') {
    const data = payload.devis || [];
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Devis') + `
      <section class="section-block">
        <div class="section-title">Vos devis</div>
        <div class="grid">
          ${data.map(item => `
            <div class="doc-card">
              <div class="doc-head">
                <div>
                  <div class="doc-kicker">Devis</div>
                  <div class="doc-ref">${item.reference}</div>
                </div>
                <span class="status-pill ${statusClass(item.statut)}">${item.statut}</span>
              </div>
              <div class="doc-figures">
                <div class="doc-figure"><span class="label">Montant</span><span class="value doc-amount">${item.montant} EUR</span></div>
                <div class="doc-figure"><span class="label">Date d'envoi</span><span class="value">${item.dateEnvoi}</span></div>
              </div>
              ${item.commentaires ? `<div class="meta">${item.commentaires}</div>` : ''}
              <div class="doc-footer">
                <span class="small muted">Document commercial</span>
                <a class="btn-primary" href="${item.lienDevis}" target="_blank" rel="noreferrer">Voir le devis</a>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#factures-root') {
    const data = payload.factures || [];
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Factures') + `
      <section class="section-block">
        <div class="section-title">Vos factures</div>
        <div class="grid">
          ${data.map(item => `
            <div class="doc-card">
              <div class="doc-head">
                <div>
                  <div class="doc-kicker">Facture</div>
                  <div class="doc-ref">${item.reference}</div>
                </div>
                <span class="status-pill ${statusClass(item.statut)}">${item.statut}</span>
              </div>
              <div class="doc-figures">
                <div class="doc-figure"><span class="label">Emise le</span><span class="value">${item.dateEmission}</span></div>
                <div class="doc-figure"><span class="label">Echeance</span><span class="value">${item.dateEcheance}</span></div>
              </div>
              <div class="doc-footer">
                <span class="small muted">Document financier</span>
                <a class="btn-primary" href="${item.lienFacture}" target="_blank" rel="noreferrer">Voir la facture</a>
              </div>
            </div>
          `).join('')}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#contrat-root') {
    const contrat = payload.contrat;
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Contrat') + `
      <section class="section-block">
        <div class="section-title">Votre contrat</div>
        <div class="doc-card">
          <div class="doc-head">
            <div>
              <div class="doc-kicker">Contrat</div>
              <div class="doc-ref">${contrat.reference}</div>
            </div>
            <span class="status-pill ${statusClass(contrat.statut)}">${contrat.statut}</span>
          </div>
          <div class="doc-figures">
            <div class="doc-figure"><span class="label">Montant</span><span class="value doc-amount">${contrat.montant} EUR</span></div>
            <div class="doc-figure"><span class="label">Emission</span><span class="value">${contrat.dateEmission}</span></div>
            <div class="doc-figure"><span class="label">Signature</span><span class="value">${contrat.dateSignature}</span></div>
          </div>
          <div class="doc-footer">
            <span class="small muted">Document contractuel signe</span>
            <a class="btn-primary" href="${contrat.lienContrat}" target="_blank" rel="noreferrer">Ouvrir le PDF</a>
          </div>
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#projet-root') {
    const steps = payload.projectSteps || [];
    const completedCount = steps.filter(s => s.reached).length;
    const totalCount = steps.length;
    const globalPercent = totalCount ? Math.round((completedCount / totalCount) * 100) : 0;
    const agencyId = getAgencyIdFromUrl();

    // Statut + % par etape bases uniquement sur la donnee reelle disponible aujourd'hui :
    // 1 case a cocher Airtable = 1 critere reel par etape (Audit fait, Config Retell
    // faite, etc.). Pas de sous-taches granulaires stockees actuellement -> le detail
    // "x/1 tache" reflete ce seul critere reel, jamais un pourcentage intermediaire invente.
    // Evolution possible plus tard : plusieurs criteres reels par etape si Airtable en stocke.
    const stepsWithStatus = steps.map(step => ({
      ...step,
      percent: step.reached ? 100 : 0,
      statut: step.reached ? 'Terminé' : (step.active ? 'En cours' : 'Non commencé'),
      tasksDone: step.reached ? 1 : 0,
      tasksTotal: 1
    }));

    root.innerHTML = createNavigationBanner(agencyId, 'Avancement du projet') + `
      <section class="section-block">
        <div class="section-title">Avancement du projet</div>
        <div class="donut-grid">
          ${stepsWithStatus.map(step => `
            <div class="donut-panel donut-step-panel">
              <strong>${step.label}</strong>
              <div class="donut-body">
                <div class="donut-percent-wrap">
                  <svg id="donut-step-${step.key}" class="donut-chart" viewBox="0 0 120 120"></svg>
                  <div class="donut-percent">${step.percent}%</div>
                </div>
                <div>
                  <span class="status-pill ${step.reached ? 'active' : 'pending'}">${step.statut}</span>
                  <div class="meta">${step.tasksDone} / ${step.tasksTotal} tâche complétée</div>
                </div>
              </div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Progression globale</div>
        <div class="donut-grid">
          <div class="donut-panel">
            <div class="progress-global">
              <div class="progress-global-donut">
                <div class="donut-percent-wrap">
                  <svg id="donut-global" class="donut-chart donut-chart-lg" viewBox="0 0 120 120"></svg>
                  <div class="donut-percent donut-percent-lg">${globalPercent}%</div>
                </div>
              </div>
              <div class="progress-global-summary">
                <div class="progress-global-headline">${completedCount} étape${completedCount > 1 ? 's' : ''} terminée${completedCount > 1 ? 's' : ''} sur ${totalCount}</div>
                <div class="progress-global-stats">
                  <div class="progress-stat">
                    <span class="progress-stat-dot" style="background:#1e8e57"></span>
                    <span class="progress-stat-label">Complétées</span>
                    <span class="progress-stat-value">${completedCount}</span>
                  </div>
                  <div class="progress-stat">
                    <span class="progress-stat-dot" style="background:#e6dcc5"></span>
                    <span class="progress-stat-label">En attente</span>
                    <span class="progress-stat-value">${totalCount - completedCount}</span>
                  </div>
                </div>
              </div>
              <div class="progress-global-steps">
                ${stepsWithStatus.map(step => `
                  <div class="progress-global-step">
                    <span class="status-pill ${step.reached ? 'active' : 'pending'}">${step.statut}</span>
                    <span>${step.label}</span>
                  </div>
                `).join('')}
              </div>
            </div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Prochaines actions</div>
        <div class="grid">
          ${(payload.nextActions || []).length
            ? payload.nextActions.map((action, i) => `<div class="doc-card"><div><strong>Action ${i + 1}</strong><div class="meta">${action}</div></div></div>`).join('')
            : '<div class="meta">Aucune prochaine action pour le moment.</div>'}
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Calendrier d'onboarding</div>
        <div class="grid">
          ${(payload.calendar || []).length
            ? payload.calendar.map(event => `<div class="doc-card"><div><strong>${event.title}</strong><div class="meta">${event.date}</div></div><span class="status-pill ${event.completed ? "active" : "pending"}">${event.completed ? "Fait" : "A venir"}</span></div>`).join('')
            : '<div class="meta">Aucun événement planifié pour le moment.</div>'}
        </div>
      </section>
    `;

    if (typeof renderDonut === 'function') {
      stepsWithStatus.forEach(step => {
        renderDonut({
          svgId: `donut-step-${step.key}`,
          data: [
            { key: 'done', label: 'Fait', value: step.reached ? 1 : 0, color: '#1e8e57' },
            { key: 'pending', label: 'A faire', value: step.reached ? 0 : 1, color: '#e6dcc5' }
          ]
        });
      });
      if (totalCount > 0) {
        renderDonut({
          svgId: 'donut-global',
          data: [
            { key: 'completed', label: 'Complete', value: completedCount, color: '#1e8e57' },
            { key: 'pending', label: 'En attente', value: totalCount - completedCount, color: '#e6dcc5' }
          ]
        });
      }
    } else {
      console.error('renderDonut is not defined');
    }
    return;
  }

  if (rootSelector === '#compte-root') {
    const compte = payload.compte || {};
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Votre compte') + `
      <section class="section-block">
        <div class="section-title">Informations de l'agence</div>
        <div class="info-grid">
          <div class="info-field"><label>Nom de l'agence</label><p>${compte.nomAgence}</p></div>
          <div class="info-field"><label>Contact principal</label><p>${compte.nomContact}</p></div>
          <div class="info-field"><label>Email</label><p>${compte.email}</p></div>
          <div class="info-field"><label>Telephone</label><p>${compte.telephone}</p></div>
          <div class="info-field"><label>Adresse</label><p>${compte.adresse}, ${compte.codePostal} ${compte.ville}</p></div>
          <div class="info-field"><label>Pays</label><p>${compte.pays}</p></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Informations professionnelles</div>
        <div class="info-grid">
          <div class="info-field"><label>SIRET</label><p>${compte.siret}</p></div>
          <div class="info-field"><label>Type d'activite</label><p>${compte.typeActivite}</p></div>
          <div class="info-field"><label>Nombre d'employes</label><p>${compte.nombreEmployes}</p></div>
          <div class="info-field"><label>Date de creation</label><p>${compte.dateCreation}</p></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Abonnement</div>
        <div class="info-grid">
          <div class="info-field"><label>Plan actuel</label><p><strong>${compte.abonnement}</strong></p></div>
          <div class="info-field"><label>Date d'abonnement</label><p>${compte.dateAbonnement}</p></div>
          <div class="info-field"><label>Statut</label><p><span class="status-pill active">${compte.statut}</span></p></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Sécurité du compte</div>
        <form id="changePasswordForm" class="security-form">
          <div class="security-field">
            <label for="currentPassword">Mot de passe actuel</label>
            <input type="password" id="currentPassword" name="currentPassword" required />
          </div>
          <div class="security-field">
            <label for="newPassword">Nouveau mot de passe</label>
            <input type="password" id="newPassword" name="newPassword" minlength="8" required />
          </div>
          <div class="security-field">
            <label for="confirmNewPassword">Confirmer le nouveau mot de passe</label>
            <input type="password" id="confirmNewPassword" name="confirmNewPassword" minlength="8" required />
          </div>
          <div id="passwordMessage" class="security-message"></div>
          <button type="submit" class="btn-primary" id="changePasswordBtn">Modifier mon mot de passe</button>
        </form>
      </section>
    `;
    initChangePasswordForm(agencyId);
  }

  if (rootSelector === '#ressources-root') {
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Ressources et documentation') + `
      <section class="section-block">
        <div class="section-title">Ressources et documentation</div>
        <div class="grid">
          ${(payload.resources || []).map(resource => `<div class="doc-card"><div><strong>${resource.title}</strong><div class="meta">${resource.type}</div></div><a class="btn-primary" href="${resource.url}" target="_blank">Acceder</a></div>`).join("")}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#retell-root') {
    const retell = payload.retellStats || null;
    const voiceOs = payload.voiceOsStats || { connected: false };
    const agencyId = getAgencyIdFromUrl();

    // Le backend Retell renvoie un statut technique de call_status (ex. "ended").
    // On ne l'affiche jamais tel quel au client : traduction en libelle client-friendly.
    // Pas de notion de statut "assistant actif/inactif" disponible en V1 - la carte
    // presente donc le dernier appel, pas un statut de disponibilite de l'assistant.
    const CALL_STATUS_LABELS = {
      ended: 'Terminé',
      error: 'Erreur',
      ongoing: 'En cours',
      registered: 'En attente'
    };
    const dernierAppelLabel = (retell && retell.status)
      ? (CALL_STATUS_LABELS[retell.status] || retell.status)
      : 'Non disponible';

    // Bloc 1 : Performance de l'agent vocal (appels reels Retell + volumes Voice OS)
    const performanceCards = [
      `<div class="kpi"><strong>${retell ? retell.callCount : 'Non disponible'}</strong><span>Appels</span></div>`,
      `<div class="kpi"><strong>${retell ? retell.averageDurationMinutes : 'Non disponible'}</strong><span>Durée moyenne (min)</span></div>`,
      `<div class="kpi"><strong>${dernierAppelLabel}</strong><span>Dernier appel</span></div>`,
      `<div class="kpi"><strong>${voiceOs.connected ? voiceOs.leadsCount : 'Non disponible'}</strong><span>Leads créés</span></div>`,
      `<div class="kpi"><strong>${voiceOs.connected ? voiceOs.rdvCount : 'Non disponible'}</strong><span>RDV pris</span></div>`,
      `<div class="kpi"><strong>${voiceOs.connected ? voiceOs.relancesCount : 'Non disponible'}</strong><span>Relances créées</span></div>`
    ];

    // Bloc 2 : Qualification commerciale (uniquement si Voice OS connecte)
    const qualificationCards = voiceOs.connected ? [
      `<div class="kpi"><strong>${voiceOs.profils.acheteur}</strong><span>Acheteurs</span></div>`,
      `<div class="kpi"><strong>${voiceOs.profils.vendeur}</strong><span>Vendeurs</span></div>`,
      `<div class="kpi"><strong>${voiceOs.priorites.chaud}</strong><span>Leads CHAUD</span></div>`,
      `<div class="kpi"><strong>${voiceOs.priorites.tiede}</strong><span>Leads TIÈDE</span></div>`,
      `<div class="kpi"><strong>${voiceOs.priorites.froid}</strong><span>Leads FROID</span></div>`
    ] : [];

    // Bloc 3 : Dernières activités prospects (donnees inchangees, section renommee)
    const activityItems = voiceOs.connected ? (voiceOs.recentActivity || []) : [];

    root.innerHTML = createNavigationBanner(agencyId, 'Assistant vocal') + `
      <section class="section-block">
        <div class="section-title">Performance de l'agent vocal</div>
        ${(!retell && !voiceOs.connected) ? '<div class="meta">Données indisponibles pour le moment.</div>' : ''}
        <div class="kpis">
          ${performanceCards.join('')}
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Qualification commerciale</div>
        ${voiceOs.connected ? '' : '<div class="meta">Données indisponibles pour le moment.</div>'}
        <div class="kpis">
          ${qualificationCards.join('')}
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Dernières activités prospects</div>
        <div class="grid">
          ${activityItems.length ? activityItems.map(item => {
            // item.type ('rdv'/'lead'/'relance') est deja fourni par le serveur
            // (voir buildLiveData) - reutilise ici uniquement pour le style, sans
            // toucher aux donnees. Meme systeme de badge que la fiche prospect.
            const ACTIVITY_STYLE = { rdv: 'active', lead: 'info', relance: 'pending' };
            const pillClass = ACTIVITY_STYLE[item.type] || 'info';
            const separatorIndex = item.label.indexOf(' - ');
            const action = separatorIndex === -1 ? item.label : item.label.slice(0, separatorIndex);
            const name = separatorIndex === -1 ? '' : item.label.slice(separatorIndex + 3);
            return `
            <div class="doc-card${item.prospectToken ? ' doc-card-clickable' : ''}"${item.prospectToken ? ` data-prospect-token="${item.prospectToken}"` : ''}>
              <div>
                <div class="activity-line">
                  <span class="status-pill ${pillClass}">${action}</span>
                  ${name ? `<span class="activity-name">${name}</span>` : ''}
                </div>
                <div class="meta activity-date">${item.date || ''}</div>
              </div>
            </div>
          `;
          }).join('') : '<div class="meta">Aucune activité disponible pour le moment.</div>'}
        </div>
      </section>
    `;
    initProspectLinks(agencyId);
  }

  if (rootSelector === '#prospect-root') {
    const p = payload.prospect;
    const agencyId = getAgencyIdFromUrl();
    const fieldRows = [
      ['Profil', p.profil],
      ['Type de bien', p.typeBien],
      ['Commune / zone', p.communeZone],
      ['Code postal', p.codePostal],
      ['Département', p.departement],
      ['Budget / prix', p.budget],
      ['Délai', p.delai],
      ['Moment de rappel', p.momentDeRappel],
      ['Priorité', p.priorite],
      ['Statut', p.statut],
      ['Date de l\'appel', p.dateAppel],
      ['Rendez-vous', p.dateRdv],
      ['Téléphone', p.telephone],
      ['Email', p.email]
    ].filter(([, value]) => value);
    // Priorite/Statut/Profil : badge visuel plutot que texte brut. Seule "Priorite"
    // a un enum reellement documente (CHAUD/TIEDE/FROID, voir CLAUDE.md) -> couleur
    // semantique ; Statut/Profil recoivent un badge neutre (pas de mapping invente
    // faute d'enum confirme cote Airtable Voice OS).
    const BADGE_FIELDS = new Set(['Profil', 'Priorité', 'Statut']);
    const priorityPillClass = (value) => {
      const v = (value || '').toLowerCase();
      if (v.includes('chaud')) return 'critical';
      if (v.includes('tiède') || v.includes('tiede')) return 'pending';
      return 'info'; // froid, ou toute autre valeur non reconnue
    };

    root.innerHTML = createNavigationBanner(agencyId, 'Fiche prospect') + `
      <section class="section-block">
        <div class="section-title">${[p.prenom, p.nom].filter(Boolean).join(' ') || 'Prospect'}</div>
        <div class="prospect-info-grid">
          ${fieldRows.map(([label, value]) => {
            const isBadge = BADGE_FIELDS.has(label);
            const pillClass = label === 'Priorité' ? priorityPillClass(value) : 'info';
            const valueMarkup = isBadge ? `<span class="status-pill ${pillClass}">${value}</span>` : `<p>${value}</p>`;
            return `<div class="prospect-info-field${isBadge ? ' prospect-badge-field' : ''}"><label>${label}</label>${valueMarkup}</div>`;
          }).join('')}
        </div>
      </section>
      ${p.motivation ? `<section class="section-block"><div class="section-title">🎯 Motivation</div><p class="meta">${p.motivation}</p></section>` : ''}
      ${p.resume ? `<section class="section-block resume-ia-block"><div class="section-title">✨ Résumé IA</div><p class="meta">${p.resume}</p></section>` : ''}
      ${p.resumeRdv ? `<section class="section-block"><div class="section-title">Résumé retour RDV</div><p class="meta">${p.resumeRdv}</p></section>` : ''}
      ${p.relances && p.relances.length ? `
        <section class="section-block">
          <div class="section-title">Relances</div>
          <div class="grid">
            ${p.relances.map(r => `
              <div class="doc-card">
                <div>
                  <strong>${r.action || 'Relance'}</strong>
                  <div class="meta">${r.date || ''}${r.statut ? ` · ${r.statut}` : ''}</div>
                  ${r.resume ? `<div class="meta">${r.resume}</div>` : ''}
                </div>
              </div>
            `).join('')}
          </div>
        </section>
      ` : ''}
    `;
    return;
  }
}

// ---- Web Call Retell (bouton "Parler avec [Agent Vocal]", carte "Votre assistante vocale") ----
// SDK charge en lazy (uniquement au premier clic, jamais au chargement de la page) depuis
// un CDN ESM (esm.sh), version figee. Ce SDK (retell-client-js-sdk) depend de
// livekit-client et son build UMD utilise require(...) - incompatible avec une simple
// balise <script> sans bundler (ce portail n'en a pas). import() dynamique fonctionne en
// script classique (pas besoin de type="module") dans tous les navigateurs modernes.
// Aucune cle Retell ni agent_id ici : seul un accessToken de courte duree (recu du
// serveur via /api/create-web-call) est utilise, gardé en mémoire locale uniquement -
// jamais stocke (localStorage/sessionStorage), jamais loggue, jamais affiche.
const RETELL_WEB_SDK_URL = 'https://esm.sh/retell-client-js-sdk@2.0.8';
let retellWebClientInstance = null;
let retellWebClientClassPromise = null;

function loadRetellWebClientClass() {
  if (!retellWebClientClassPromise) {
    retellWebClientClassPromise = import(RETELL_WEB_SDK_URL).then((mod) => {
      if (!mod || typeof mod.RetellWebClient !== 'function') {
        throw new Error('RetellWebClient introuvable dans le module charge');
      }
      return mod.RetellWebClient;
    });
  }
  return retellWebClientClassPromise;
}

// `agentName` est affiche uniquement via textContent (jamais reinjecte en innerHTML) -
// aucun echappement HTML necessaire ici, contrairement au rendu initial du bouton.
function initWebCallWidget(agencyId, agentName) {
  const widget = document.querySelector('#webcall-widget');
  if (!widget) return;
  const button = widget.querySelector('#webcall-btn');
  const statusEl = widget.querySelector('#webcall-status');
  const unmuteBtn = widget.querySelector('#webcall-unmute-btn');
  // Bouton icone seule (pas de texte visible) : le nom de l'action vit uniquement dans
  // l'aria-label, mis a jour a chaque changement d'etat pour rester correct au clavier/lecteur
  // d'ecran (le contexte "qui" est deja donne visuellement par la carte au-dessus du bouton).
  const readyLabel = agentName ? `Parler avec ${agentName}` : "Parler avec l'assistant vocal";
  const connectingLabel = 'Connexion en cours';
  const hangupLabel = agentName ? `Raccrocher l'appel avec ${agentName}` : "Raccrocher l'appel";

  let state = 'idle'; // idle | connecting | active | ended | error
  // Efface automatiquement la confirmation "Appel terminé." apres un court delai pour
  // revenir a l'etat initial propre (le libelle du bouton, lui, revient deja immediatement
  // a `readyLabel` dans setEnded ci-dessous - seul le texte de statut a cote persistait).
  let endedStatusTimer = null;

  function clearEndedStatusTimer() {
    if (endedStatusTimer) {
      clearTimeout(endedStatusTimer);
      endedStatusTimer = null;
    }
  }

  function setStatus(text, tone) {
    statusEl.textContent = text || '';
    statusEl.className = 'webcall-status' + (tone ? ` ${tone}` : '');
  }

  // Contrôle "Activer le son" : masqué par défaut, affiché uniquement si la lecture
  // audio du Web Call échoue à démarrer automatiquement (politique autoplay du
  // navigateur mobile). `isRetryFailure` distingue le tout premier blocage (texte neutre
  // "Activer le son") d'un nouvel échec après un clic explicite (texte "Réessayer le
  // son") - l'appel reste actif dans les deux cas, jamais recréé.
  function showUnmuteControl(isRetryFailure) {
    unmuteBtn.hidden = false;
    unmuteBtn.textContent = isRetryFailure ? 'Réessayer le son' : 'Activer le son';
    if (state === 'active') {
      setStatus(isRetryFailure ? "Le son n'a pas pu démarrer. Réessayez." : 'Son bloqué — appuyez sur « Activer le son »', 'error');
    }
  }

  function hideUnmuteControl() {
    unmuteBtn.hidden = true;
    unmuteBtn.textContent = 'Activer le son';
  }

  // Tente de démarrer/reprendre la lecture audio du Web Call. Appelée une première fois
  // automatiquement a `call_started` (peut échouer sur mobile si le navigateur bloque la
  // lecture hors d'un geste utilisateur direct - plusieurs étapes async la séparent du
  // clic initial), puis à nouveau au clic sur "Activer le son"/"Réessayer le son" (ce
  // clic est lui-même un geste utilisateur direct, ce qui débloque la lecture). Ne
  // recrée jamais d'appel : uniquement (re)lance la lecture audio de l'appel en cours.
  function attemptAudioPlayback(isRetry) {
    if (!retellWebClientInstance || typeof retellWebClientInstance.startAudioPlayback !== 'function') {
      return;
    }
    let playbackResult;
    try {
      playbackResult = retellWebClientInstance.startAudioPlayback();
    } catch (syncAudioError) {
      // Jamais l'accessToken ni aucune donnee sensible - uniquement le type d'erreur.
      console.warn('Web Call audio: startAudioPlayback a échoué (synchrone)', syncAudioError && syncAudioError.name ? syncAudioError.name : 'unknown');
      showUnmuteControl(Boolean(isRetry));
      return;
    }
    Promise.resolve(playbackResult).then(() => {
      hideUnmuteControl();
      if (state === 'active') setStatus('Appel en cours', 'active');
    }).catch((audioError) => {
      console.warn('Web Call audio: lecture bloquée', audioError && audioError.name ? audioError.name : 'unknown');
      showUnmuteControl(Boolean(isRetry));
    });
  }

  function setIdle() {
    clearEndedStatusTimer();
    hideUnmuteControl();
    state = 'idle';
    button.disabled = false;
    button.setAttribute('aria-label', readyLabel);
    button.classList.remove('webcall-btn-hangup', 'webcall-btn-connecting');
    setStatus('', '');
  }

  function setConnecting() {
    clearEndedStatusTimer();
    hideUnmuteControl();
    state = 'connecting';
    button.disabled = true;
    button.setAttribute('aria-label', connectingLabel);
    button.classList.remove('webcall-btn-hangup');
    button.classList.add('webcall-btn-connecting');
    setStatus('', '');
  }

  function setActive() {
    clearEndedStatusTimer();
    hideUnmuteControl();
    state = 'active';
    button.disabled = false;
    button.setAttribute('aria-label', hangupLabel);
    button.classList.remove('webcall-btn-connecting');
    button.classList.add('webcall-btn-hangup');
    setStatus('Appel en cours', 'active');
  }

  function setEnded() {
    clearEndedStatusTimer();
    hideUnmuteControl();
    state = 'ended';
    button.disabled = false;
    button.setAttribute('aria-label', readyLabel);
    button.classList.remove('webcall-btn-hangup', 'webcall-btn-connecting');
    setStatus('Appel terminé.', 'ended');
    // Confirmation transitoire uniquement : revient a l'etat idle (bouton + statut vides)
    // une fois affichee, sans rester figee indefiniment a cote du bouton.
    endedStatusTimer = setTimeout(() => {
      endedStatusTimer = null;
      if (state === 'ended') setIdle();
    }, 4000);
  }

  function setError(message) {
    clearEndedStatusTimer();
    hideUnmuteControl();
    state = 'error';
    button.disabled = false;
    button.setAttribute('aria-label', readyLabel);
    button.classList.remove('webcall-btn-hangup', 'webcall-btn-connecting');
    setStatus(message, 'error');
  }

  async function startFlow() {
    setConnecting();

    let response;
    try {
      response = await fetch(`/client/${agencyId}/api/create-web-call`, { method: 'POST' });
    } catch (networkError) {
      setError('Erreur réseau. Vérifiez votre connexion et réessayez.');
      return;
    }

    let data = {};
    try {
      data = await response.json();
    } catch (parseError) {
      data = {};
    }

    if (!response.ok || typeof data.accessToken !== 'string' || !data.accessToken) {
      // Les messages renvoyes par le serveur sont deja neutres et destines a l'affichage
      // client (409 champ manquant, 429 rate-limit, 502 echec Retell, 401 session).
      setError(data.error || "Impossible de démarrer l'appel test pour le moment. Merci de réessayer.");
      return;
    }

    const accessToken = data.accessToken; // memoire locale uniquement, jamais loggue

    // Verification micro AVANT de demarrer l'appel Retell, pour distinguer clairement un
    // refus/absence de micro d'une erreur reseau ou d'un echec Retell. Simple sonde de
    // permission : les pistes obtenues sont immediatement arretees, le flux Web Call gere
    // sa propre capture audio ensuite.
    try {
      const probeStream = await navigator.mediaDevices.getUserMedia({ audio: true });
      probeStream.getTracks().forEach((track) => track.stop());
    } catch (micError) {
      setError("Microphone refusé ou indisponible. Autorisez l'accès au micro pour tester l'assistant vocal.");
      return;
    }

    let RetellWebClient;
    try {
      RetellWebClient = await loadRetellWebClientClass();
    } catch (sdkError) {
      setError("Le service d'appel vocal est momentanément indisponible. Merci de réessayer plus tard.");
      return;
    }

    if (!retellWebClientInstance) {
      retellWebClientInstance = new RetellWebClient();
      retellWebClientInstance.on('call_started', () => {
        setActive();
        attemptAudioPlayback(false);
      });
      retellWebClientInstance.on('call_ended', () => {
        setEnded();
      });
      retellWebClientInstance.on('error', () => {
        setError('La connexion à l\'assistant vocal a été interrompue. Merci de réessayer.');
        try { retellWebClientInstance.stopCall(); } catch (stopError) { /* deja arrete */ }
      });
    }

    try {
      await retellWebClientInstance.startCall({ accessToken });
    } catch (startError) {
      setError("Impossible de démarrer l'appel. Merci de réessayer.");
    }
  }

  function stopFlow() {
    if (retellWebClientInstance) {
      try { retellWebClientInstance.stopCall(); } catch (stopError) { /* deja arrete */ }
    }
  }

  button.addEventListener('click', () => {
    if (state === 'active') {
      stopFlow();
      return;
    }
    if (state === 'connecting') return; // deja en cours, ignore le double-clic
    startFlow();
  });

  // Geste utilisateur direct requis par les navigateurs mobiles (Safari/iOS en
  // particulier) pour autoriser la lecture audio : ce clic seul (contrairement a la
  // tentative automatique post-connexion, elle-meme trop eloignee du clic initial sur le
  // bouton d'appel) suffit a debloquer la lecture. Ne recree jamais d'appel, ne relance
  // que la lecture audio de l'appel deja en cours.
  unmuteBtn.addEventListener('click', () => {
    if (state !== 'active') return;
    attemptAudioPlayback(true);
  });

  setIdle();
}

// Rend cliquables les cartes de "Dernières activités prospects" qui portent un jeton
// (jamais un ID Airtable brut). Le jeton transite par sessionStorage, jamais par l'URL
// visible du navigateur.
function initProspectLinks(agencyId) {
  document.querySelectorAll('[data-prospect-token]').forEach((el) => {
    el.addEventListener('click', () => {
      sessionStorage.setItem('bw_prospect_token', el.dataset.prospectToken);
      window.location.href = `/client/${agencyId}/prospect`;
    });
  });
}

document.addEventListener('DOMContentLoaded', () => {
  const homeLink = document.querySelector('#home-link');
  if (homeLink) homeLink.href = `/client/${getAgencyIdFromUrl()}`;

  const compteLink = document.querySelector('#compte-link');
  if (compteLink) compteLink.href = `/client/${getAgencyIdFromUrl()}/compte`;

  renderPersistentNav();

  const overview = document.querySelector('#overview-root');
  const devis = document.querySelector('#devis-root');
  const factures = document.querySelector('#factures-root');
  const contrat = document.querySelector('#contrat-root');
  const projet = document.querySelector('#projet-root');
  const compte = document.querySelector('#compte-root');
  const ressources = document.querySelector('#ressources-root');
  const retell = document.querySelector('#retell-root');
  const prospect = document.querySelector('#prospect-root');

  if (overview) loadClientData('overview', '#overview-root').catch(() => { overview.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (devis) loadClientData('devis', '#devis-root').catch(() => { devis.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (factures) loadClientData('factures', '#factures-root').catch(() => { factures.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (contrat) loadClientData('contrat', '#contrat-root').catch(() => { contrat.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (projet) loadClientData('overview', '#projet-root').catch(() => { projet.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (compte) loadClientData('compte', '#compte-root').catch(() => { compte.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (ressources) loadClientData('overview', '#ressources-root').catch(() => { ressources.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (retell) loadClientData('retell-stats', '#retell-root').catch(() => { retell.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });

  // Fiche prospect : le jeton vient de sessionStorage (jamais de l'URL visible),
  // depose par initProspectLinks() au clic depuis Assistant vocal.
  if (prospect) {
    const agencyId = getAgencyIdFromUrl();
    const token = sessionStorage.getItem('bw_prospect_token');
    if (!token) {
      prospect.innerHTML = createNavigationBanner(agencyId, 'Fiche prospect') + '<section class="section-block"><div class="meta">Aucun prospect sélectionné. Retournez à Assistant vocal et cliquez sur un prospect.</div></section>';
    } else {
      fetch(`/client/${agencyId}/api/prospect?token=${encodeURIComponent(token)}`)
        .then((response) => (response.ok ? response.json() : Promise.reject(new Error('not ok'))))
        .then((data) => renderClientData(data, '#prospect-root'))
        .catch(() => {
          prospect.innerHTML = createNavigationBanner(agencyId, 'Fiche prospect') + '<section class="section-block"><div class="meta">Prospect introuvable ou lien expiré. Retournez à Assistant vocal.</div></section>';
        });
    }
  }
});
