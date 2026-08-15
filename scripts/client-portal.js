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
// Icones dediees aux cartes de la page "Ressources" (voir RESOURCE_CARDS) -
// meme convention (trait, 24x24, currentColor). Les 3 autres cartes reutilisent
// des icones deja definies ci-dessus (ICON_RESSOURCES, ICON_DEVIS, ICON_AGENT_VOCAL).
const ICON_TUTORIELS = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>';
const ICON_FAQ = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M9.09 9a3 3 0 0 1 5.83 1c0 2-3 2-3 4"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>';
const ICON_PROCEDURES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M9 6h11"/><path d="M9 12h11"/><path d="M9 18h11"/><path d="m3 6 1 1 2-2"/><path d="m3 12 1 1 2-2"/><path d="m3 18 1 1 2-2"/></svg>';
const ICON_FORMATION = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 10 12 5 2 10l10 5 10-5Z"/><path d="M6 12v5c0 1.5 3 3 6 3s6-1.5 6-3v-5"/></svg>';
// Icone dediee a la 8e ressource "Fonctionnement de l'agent vocal" (traitement
// d'un appel) - distincte du micro (ICON_AGENT_VOCAL, deja utilise par "Guide
// de l'agent vocal") pour rester reperable malgre le meme sujet.
const ICON_SOP_AGENT_VOCAL = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z"/></svg>';
// Icones dediees au regroupement "Documents" (accueil rapide + page hub) - meme
// convention. Devis/Factures/Contrat reutilisent leurs icones existantes.
const ICON_DOCUMENTS_FOLDER = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M4 6a2 2 0 0 1 2-2h4l2 2h6a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6Z"/></svg>';
const ICON_CAHIER_DES_CHARGES = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="8" y="2" width="8" height="4" rx="1"/><path d="M9 4H6a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V6a2 2 0 0 0-2-2h-3"/><path d="M9 12h6"/><path d="M9 16h6"/></svg>';

function statusClass(statut) {
  const value = (statut || '').toLowerCase();
  if (['accepté', 'accepte', 'payée', 'payee', 'signé', 'signe', 'actif', 'disponible'].some(s => value.includes(s))) return 'active';
  if (['refusé', 'refuse', 'annulé', 'annule', 'en retard', 'impayée', 'impayee'].some(s => value.includes(s))) return 'critical';
  return 'pending';
}

// Formate une date Airtable (ISO "AAAA-MM-JJ" ou toute chaine interpretable par Date)
// au format francais JJ/MM/AAAA pour l'affichage - ne modifie jamais la donnee stockee
// (uniquement l'affichage). Date absente ou invalide -> chaine vide, jamais "Invalid Date".
function formatDateFR(value) {
  if (!value) return '';
  const isoMatch = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value));
  const date = isoMatch
    ? new Date(Number(isoMatch[1]), Number(isoMatch[2]) - 1, Number(isoMatch[3]))
    : new Date(value);
  if (Number.isNaN(date.getTime())) return '';
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  return `${day}/${month}/${date.getFullYear()}`;
}

// Carte-document commune a Devis / Factures / Contrat / Cahier des charges : meme
// structure visuelle (en-tete kicker+reference+badge, figures cles, description
// optionnelle, pied avec bouton) pour les quatre types de documents du portail.
// `figures` : tableau de { label, value, emphasis? } - une figure sans valeur (date
// absente, montant non disponible sur ce type de document) n'est pas affichee.
function renderDocCard({ kicker, reference, statut, figures = [], description, footerNote, buttonLabel, buttonHref }) {
  const visibleFigures = figures.filter(f => f && f.value);
  const figuresMarkup = visibleFigures.length ? `
    <div class="doc-figures">
      ${visibleFigures.map(f => `<div class="doc-figure"><span class="label">${escapeHtml(f.label)}</span><span class="value${f.emphasis ? ' doc-amount' : ''}">${escapeHtml(f.value)}</span></div>`).join('')}
    </div>` : '';
  const buttonMarkup = buttonHref
    ? `<a class="btn-primary" href="${escapeHtml(buttonHref)}" target="_blank" rel="noreferrer">${escapeHtml(buttonLabel)}</a>`
    : `<span class="small muted">Document non disponible</span>`;
  return `
    <div class="doc-card">
      <div class="doc-head">
        <div>
          <div class="doc-kicker">${escapeHtml(kicker)}</div>
          <div class="doc-ref">${escapeHtml(reference || 'Sans référence')}</div>
        </div>
        ${statut ? `<span class="status-pill ${statusClass(statut)}">${escapeHtml(statut)}</span>` : ''}
      </div>
      ${figuresMarkup}
      ${description ? `<div class="meta">${escapeHtml(description)}</div>` : ''}
      <div class="doc-footer">
        <span class="small muted">${escapeHtml(footerNote || '')}</span>
        ${buttonMarkup}
      </div>
    </div>
  `;
}

// Structure commune des 7 cartes de la page "Ressources" : `key` correspond au
// champ du meme nom dans payload.ressources (voir lib/app.js normalizeRessources),
// jamais un nom de champ Airtable brut. Un seul tableau de config -> une seule
// fonction de rendu (renderResourceCard), pas 7 blocs HTML independants.
const RESOURCE_CARDS = [
  {
    key: 'guideDemarrage',
    title: 'Guide de prise en main',
    description: 'Découvrez les principales fonctionnalités de votre espace client Bluewaive.',
    buttonLabel: 'Consulter le guide',
    icon: ICON_RESSOURCES,
    accent: 'resource-accent-violet'
  },
  {
    key: 'tutoriels',
    title: 'Tutoriels',
    description: 'Retrouvez les étapes pour effectuer les actions courantes dans votre portail.',
    buttonLabel: 'Voir les tutoriels',
    icon: ICON_TUTORIELS,
    accent: 'resource-accent-violet'
  },
  {
    key: 'faq',
    title: 'FAQ',
    description: 'Les réponses aux questions les plus fréquentes sur Bluewaive Voice OS.',
    buttonLabel: 'Consulter la FAQ',
    icon: ICON_FAQ,
    accent: 'resource-accent-violet'
  },
  {
    key: 'documentation',
    title: 'Documentation d’utilisation',
    description: 'Comprenez le fonctionnement du portail et les principales fonctionnalités du service.',
    buttonLabel: 'Ouvrir la documentation',
    icon: ICON_DEVIS,
    accent: 'resource-accent-violet'
  },
  {
    key: 'guideAgentVocal',
    title: 'Guide de l’agent vocal',
    description: 'Comprenez le rôle de votre agent vocal et la manière d’exploiter les informations collectées.',
    buttonLabel: 'Consulter le guide',
    icon: ICON_AGENT_VOCAL,
    accent: 'resource-accent-violet'
  },
  {
    key: 'procedures',
    title: 'Procédures simples',
    description: 'Les bons réflexes opérationnels pour utiliser Bluewaive au quotidien.',
    buttonLabel: 'Voir les procédures',
    icon: ICON_PROCEDURES,
    accent: 'resource-accent-violet'
  },
  {
    key: 'formation',
    title: 'Support de formation',
    description: 'Support de formation destiné aux équipes pour la prise en main de Bluewaive.',
    buttonLabel: 'Ouvrir le support',
    icon: ICON_FORMATION,
    accent: 'resource-accent-violet'
  },
  {
    key: 'sopAgentVocal',
    title: 'Fonctionnement de l’agent vocal',
    description: 'Découvrez comment votre agent vocal prend en charge un appel, qualifie la demande et transmet les informations utiles à votre agence.',
    buttonLabel: 'Voir le fonctionnement',
    icon: ICON_SOP_AGENT_VOCAL,
    accent: 'resource-accent-violet'
  }
];

// Une ressource sans lien Drive (champ Airtable vide) n'affiche jamais un bouton
// casse ni une URL brute - uniquement un etat neutre.
function renderResourceCard(config, url) {
  // Univers Ressources = violet #7B2CBF (.btn-violet) : le bouton d'action
  // reprend la couleur de sa section plutot que le bleu generique .btn-primary,
  // reserve a l'univers Agent vocal. Les icones de carte (config.accent)
  // gardent leur variete existante, non concernee par cette tache.
  const buttonMarkup = url
    ? `<a class="btn-primary btn-violet" href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(config.buttonLabel)}</a>`
    : `<span class="small muted">Ressource indisponible pour le moment.</span>`;
  return `
    <div class="resource-card">
      <div class="resource-icon ${config.accent}">${config.icon}</div>
      <h3 class="resource-title">${escapeHtml(config.title)}</h3>
      <p class="resource-desc">${escapeHtml(config.description)}</p>
      <div class="resource-footer">${buttonMarkup}</div>
    </div>
  `;
}

// Page "Documents" : 4 cartes-resume (Devis/Factures/Contrat/Cahier des charges),
// meme logique de config commune que RESOURCE_CARDS ci-dessus. Chaque carte
// affiche les infos deja calculees par buildLiveData (reference/montant/date/
// statut du document le plus recent) et renvoie vers la page complete existante
// (route inchangee) - aucune nouvelle logique metier, aucune donnee inventee.
function buildDocumentHubCards(agencyId, payload) {
  const devis = (payload.devis || [])[0] || null;
  const facture = (payload.factures || [])[0] || null;
  const contrat = payload.contrat || null;
  const cdc = (payload.cahierDesCharges || [])[0] || null;

  return [
    {
      title: 'Devis',
      description: 'Consultez vos propositions commerciales, leur montant et leur statut.',
      icon: ICON_DEVIS,
      buttonLabel: 'Voir les devis',
      href: `/client/${agencyId}/devis`,
      statut: devis ? devis.statut : '',
      figures: devis ? [
        { label: 'Référence', value: devis.reference },
        { label: 'Montant', value: devis.montant ? `${devis.montant} €` : '' },
        { label: "Date d'envoi", value: formatDateFR(devis.dateEnvoi) }
      ] : []
    },
    {
      title: 'Factures',
      description: 'Retrouvez vos factures, leurs échéances et leur statut.',
      icon: ICON_FACTURES,
      buttonLabel: 'Voir les factures',
      href: `/client/${agencyId}/factures`,
      statut: facture ? facture.statut : '',
      figures: facture ? [
        { label: 'Référence', value: facture.reference },
        { label: 'Émise le', value: formatDateFR(facture.dateEmission) },
        { label: 'Échéance', value: formatDateFR(facture.dateEcheance) }
      ] : []
    },
    {
      title: 'Contrat',
      description: 'Consultez votre contrat et les informations liées à votre engagement Bluewaive.',
      icon: ICON_CONTRAT,
      buttonLabel: 'Voir le contrat',
      href: `/client/${agencyId}/contrat`,
      statut: contrat ? contrat.statut : '',
      figures: contrat ? [
        { label: 'Référence', value: contrat.reference },
        { label: 'Date', value: formatDateFR(contrat.dateSignature) || formatDateFR(contrat.dateEmission) }
      ] : []
    },
    {
      title: 'Cahier des charges',
      description: 'Consultez le périmètre fonctionnel et les modalités de mise en place de votre solution Bluewaive.',
      icon: ICON_CAHIER_DES_CHARGES,
      buttonLabel: 'Voir le cahier des charges',
      href: `/client/${agencyId}/cahier-des-charges`,
      statut: cdc ? cdc.statut : '',
      figures: cdc ? [
        { label: 'Référence', value: cdc.reference },
        { label: 'Date', value: formatDateFR(cdc.dateEmission) }
      ] : []
    }
  ];
}

// Carte non cliquable dans son ensemble (coherent avec renderResourceCard) :
// seul le bouton en pied de carte navigue, jamais toute la surface. Famille
// visuelle doree/ocre (voir .doc-hub-card / .btn-gold dans styles.css),
// distincte du bleu de la navigation active.
function renderDocumentHubCard(card) {
  const visibleFigures = (card.figures || []).filter(f => f && f.value);
  return `
    <div class="doc-hub-card">
      <div class="doc-hub-head">
        <span class="doc-hub-icon">${card.icon}</span>
        ${card.statut ? `<span class="status-pill ${statusClass(card.statut)}">${escapeHtml(card.statut)}</span>` : ''}
      </div>
      <h3 class="doc-hub-title">${escapeHtml(card.title)}</h3>
      <p class="doc-hub-desc">${escapeHtml(card.description)}</p>
      ${visibleFigures.length
        ? `<div class="doc-hub-figures">${visibleFigures.map(f => `<div class="doc-hub-figure"><span class="label">${escapeHtml(f.label)}</span><span class="value">${escapeHtml(f.value)}</span></div>`).join('')}</div>`
        : '<p class="small muted">Aucun document disponible pour le moment.</p>'}
      <div class="doc-hub-footer"><a class="btn-primary btn-gold" href="${escapeHtml(card.href)}">${escapeHtml(card.buttonLabel)}</a></div>
    </div>
  `;
}

// `backHref` optionnel : par defaut le bouton Retour ramene au Dashboard. Les
// pages Devis/Factures/Contrat/Cahier des charges (regroupees sous Documents,
// voir APP_NAV_ITEMS) le font pointer vers /client/:id/documents a la place -
// la route elle-meme reste inchangee, seul le fil d'Ariane change.
function createNavigationBanner(agencyId, title, backHref) {
  const href = backHref || `/client/${agencyId}`;
  return `<div style="background: linear-gradient(135deg, #ffffff 0%, #faf6ec 100%); border: 1px solid #e6dcc5; border-radius: 24px; padding: 12px 20px; margin-bottom: 24px; display: flex; align-items: center; gap: 16px;">
    <a href="${href}" style="display: flex; align-items: center; gap: 8px; text-decoration: none; color: #2682B4; font-weight: 600;">
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
// Devis/Factures/Contrat/Cahier des charges ne sont plus des entrees de nav
// directes : elles sont regroupees sous "Documents" (voir page-hub #documents-root).
// Leurs routes existent toujours (voir pageFiles dans lib/app.js) - `matchKeys`
// permet seulement de garder l'onglet "Documents" visuellement actif quand on
// est sur l'une de ces anciennes sous-pages.
// `colorClass` : identite couleur exacte par univers (voir .nav-color-* dans
// styles.css) - Dashboard n'a volontairement aucune couleur assignee (garde le
// bleu par defaut de .app-nav-item.active).
const APP_NAV_ITEMS = [
  { key: '', label: 'Dashboard' },
  { key: 'documents', label: 'Documents', matchKeys: ['devis', 'factures', 'contrat', 'cahier-des-charges'], colorClass: 'nav-color-documents' },
  { key: 'projet', label: 'Avancement', colorClass: 'nav-color-avancement' },
  { key: 'retell', label: 'Assistant vocal', colorClass: 'nav-color-agent-vocal' },
  { key: 'ressources', label: 'Ressources', colorClass: 'nav-color-ressources' }
];

function renderPersistentNav() {
  const nav = document.querySelector('#app-nav');
  if (!nav) return;
  const agencyId = getAgencyIdFromUrl();
  // Sous-page courante = 3e segment de l'URL (/client/:agencyId/:subpage).
  const currentSubpage = window.location.pathname.split('/')[3] || '';
  const itemsMarkup = APP_NAV_ITEMS.map((item) => {
    const href = item.key ? `/client/${agencyId}/${item.key}` : `/client/${agencyId}`;
    const isActive = item.key === currentSubpage || (item.matchKeys || []).includes(currentSubpage);
    const activeClass = isActive ? ' active' : '';
    const colorClass = item.colorClass ? ` ${item.colorClass}` : '';
    return `<a class="app-nav-item${activeClass}${colorClass}" href="${href}">${escapeHtml(item.label)}</a>`;
  }).join('');
  // .app-nav-scroll = rangee qui defile ; deux boutons flèche cliquables (en
  // plus du swipe/scroll tactile deja fonctionnel) pour une navigation
  // exploitable meme a la souris, ou l'on ne peut pas "glisser" un contenu.
  nav.innerHTML = `
    <button type="button" class="app-nav-chevron app-nav-chevron-prev" aria-label="Onglets precedents" hidden>‹</button>
    <div class="app-nav-scroll">${itemsMarkup}</div>
    <button type="button" class="app-nav-chevron app-nav-chevron-next" aria-label="Onglets suivants" hidden>›</button>
  `;

  const scroller = nav.querySelector('.app-nav-scroll');
  const prevBtn = nav.querySelector('.app-nav-chevron-prev');
  const nextBtn = nav.querySelector('.app-nav-chevron-next');

  const updateChevrons = () => {
    const hasOverflow = scroller.scrollWidth > scroller.clientWidth + 1;
    scroller.classList.toggle('has-overflow', hasOverflow);
    prevBtn.hidden = !hasOverflow || scroller.scrollLeft <= 0;
    nextBtn.hidden = !hasOverflow || scroller.scrollLeft >= scroller.scrollWidth - scroller.clientWidth - 1;
  };

  // Deplacement instantane (pas d'animation dependante de requestAnimationFrame,
  // deliberement) : priorite donnee a la fiabilite du clic plutot qu'a l'effet
  // visuel - le defilement tactile/trackpad natif, lui, reste fluide (gere par
  // le navigateur, pas par ce code).
  prevBtn.addEventListener('click', () => { scroller.scrollLeft -= 140; });
  nextBtn.addEventListener('click', () => { scroller.scrollLeft += 140; });
  scroller.addEventListener('scroll', updateChevrons, { passive: true });
  window.addEventListener('resize', updateChevrons);

  // Sur mobile, la barre defile horizontalement : si l'onglet actif tombe
  // hors du champ visible au chargement (ex. arrivee directe sur
  // "Ressources"), on le ramene dans la zone visible sans scroll de la page.
  const activeItem = scroller.querySelector('.app-nav-item.active');
  if (activeItem) activeItem.scrollIntoView({ block: 'nearest', inline: 'center' });
  updateChevrons();
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

// Upload logo agence / photo contact référent (page "Votre compte"). Formats acceptés :
// JPG/JPEG, PNG, WebP - taille max 5 Mo (mêmes limites côté serveur, voir lib/app.js).
// La validation client n'est qu'un confort (retour immédiat) : la validation qui
// compte reste côté serveur, jamais contournable depuis le navigateur.
const ACCOUNT_MEDIA_ALLOWED_TYPES = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
const ACCOUNT_MEDIA_MAX_BYTES = 5 * 1024 * 1024;

function readFileAsBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = String(reader.result || '');
      const commaIndex = result.indexOf(',');
      resolve({ dataUrl: result, base64: commaIndex === -1 ? '' : result.slice(commaIndex + 1) });
    };
    reader.onerror = () => reject(reader.error || new Error('Lecture du fichier impossible'));
    reader.readAsDataURL(file);
  });
}

// `target` : 'logo' | 'contact-photo' (jamais un nom de champ Airtable - voir
// ACCOUNT_MEDIA_FIELDS côté serveur, seule source de vérité pour cette correspondance).
function initAccountMediaUpload(agencyId, { target, fileInputId, buttonId, previewId, messageId }) {
  const fileInput = document.getElementById(fileInputId);
  const button = document.getElementById(buttonId);
  const preview = document.getElementById(previewId);
  const messageEl = document.getElementById(messageId);
  if (!fileInput || !button || !preview || !messageEl) return;

  const imgClass = preview.dataset.imgClass || '';

  button.addEventListener('click', () => fileInput.click());

  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0];
    fileInput.value = '';
    if (!file) return;

    messageEl.textContent = '';
    messageEl.className = 'security-message';

    if (!ACCOUNT_MEDIA_ALLOWED_TYPES.includes(file.type)) {
      messageEl.textContent = 'Format non accepté. Utilisez un fichier JPG, PNG ou WebP.';
      messageEl.classList.add('error');
      return;
    }
    if (file.size > ACCOUNT_MEDIA_MAX_BYTES) {
      messageEl.textContent = 'Fichier trop volumineux (5 Mo maximum).';
      messageEl.classList.add('error');
      return;
    }

    let base64;
    let dataUrl;
    try {
      const read = await readFileAsBase64(file);
      base64 = read.base64;
      dataUrl = read.dataUrl;
    } catch (error) {
      messageEl.textContent = 'Impossible de lire ce fichier. Merci de réessayer.';
      messageEl.classList.add('error');
      return;
    }
    if (!base64) {
      messageEl.textContent = 'Impossible de lire ce fichier. Merci de réessayer.';
      messageEl.classList.add('error');
      return;
    }

    // Aperçu optimiste immédiat (avant confirmation serveur) - conservé si l'upload
    // réussit, restauré à l'état précédent sinon.
    const previousPreviewHtml = preview.innerHTML;
    preview.innerHTML = `<img src="${dataUrl}" alt="" class="${imgClass}">`;

    const originalLabel = button.textContent;
    button.disabled = true;
    button.textContent = 'Envoi en cours...';

    try {
      const response = await fetch(`/client/${agencyId}/api/account-media`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ target, contentType: file.type, filename: file.name, dataBase64: base64 })
      });
      const data = await response.json();
      if (response.ok && data.ok) {
        if (data.url) {
          preview.innerHTML = `<img src="${data.url}" alt="" class="${imgClass}">`;
        }
        messageEl.textContent = 'Image mise à jour avec succès.';
        messageEl.classList.add('success');
      } else {
        preview.innerHTML = previousPreviewHtml;
        messageEl.textContent = data.error || 'Une erreur est survenue.';
        messageEl.classList.add('error');
      }
    } catch (error) {
      preview.innerHTML = previousPreviewHtml;
      messageEl.textContent = 'Erreur de connexion. Merci de réessayer.';
      messageEl.classList.add('error');
    } finally {
      button.disabled = false;
      button.textContent = originalLabel;
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
    // Widget WebCall (declenchement d'un vrai appel test) reserve aux comptes
    // "Role Portail" = Admin - `payload.role` vient exclusivement de la session
    // signee cote serveur (voir lib/app.js), jamais d'une valeur du navigateur.
    // Pour un client standard, le composant n'est pas construit dans le DOM
    // (pas juste masque en CSS), et initWebCallWidget() n'est jamais appele.
    const isAdmin = payload.role === 'admin';
    const agencyInitial = (agency.nomAgence || 'A').trim().charAt(0).toUpperCase() || 'A';
    root.innerHTML = `
      <section class="hero-banner" style="background-image: url('/estacade-saint-jean-de-monts.jpg')">
        <div class="hero-overlay"></div>
        <div class="hero-banner-content">
          <div class="hero-badge">Bienvenue ${agency.prenom || 'client'}</div>
          <p>Votre onboarding est déjà en cours. Retrouvez ici vos documents, votre contrat et l'avancée de votre mise en place.</p>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Votre assistante vocale</div>
        <div class="contact-card contact-card-assistant">
          ${agency.logoUrl
            ? `<img src="${agency.logoUrl}" alt="Logo ${agency.nomAgence || 'agence'}" class="agency-logo">`
            : `<div class="contact-avatar">${agencyInitial}</div>`}
          <div>
            <h3>${agency.agentVocal ? escapeHtml(agency.agentVocal) : 'Assistante vocale'}</h3>
            <p>Assistante vocale de ${agency.nomAgencePublic || agency.nomAgence || 'votre agence'}</p>
          </div>
          ${isAdmin ? `
          <div class="webcall-widget" id="webcall-widget">
            <div class="webcall-admin-target">
              <label for="webcallTargetSelect" class="webcall-admin-label">Agence à tester</label>
              <select id="webcallTargetSelect" class="webcall-admin-select" disabled>
                <option value="">Chargement…</option>
              </select>
              <p class="webcall-admin-note">Test interne Bluewaive - configuration de l'agence sélectionnée</p>
            </div>
            <button type="button" class="webcall-btn" id="webcall-btn" disabled aria-label="Parler avec l'assistant vocal">
              <img src="/icone-web-call.png" alt="" class="webcall-btn-icon-img">
            </button>
            <div class="webcall-status" id="webcall-status" aria-live="polite"></div>
            <button type="button" class="webcall-unmute-btn" id="webcall-unmute-btn" hidden>Activer le son</button>
          </div>` : ''}
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Votre interlocutrice Bluewaive</div>
        <div class="contact-card">
          <img src="/christel-bluewaive.png" alt="Christel" class="contact-photo">
          <div>
            <h3>Christel</h3>
            <p>Votre interlocutrice dédiée pour l’onboarding, les documents et les premières étapes de mise en service.</p>
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
        <div class="section-title">Accès rapides</div>
        <div class="grid grid-2">
          <a class="tile tile-gold" href="/client/${agency.id}/documents">
            <span class="tile-icon">${ICON_DOCUMENTS_FOLDER}</span>
            <span class="tile-body"><h3>Documents</h3><p>Retrouvez vos devis, factures, contrat et cahier des charges.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-green" href="/client/${agency.id}/projet">
            <span class="tile-icon">${ICON_AVANCEMENT}</span>
            <span class="tile-body"><h3>Avancement</h3><p>Suivez les étapes de votre onboarding.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-violet" href="/client/${agency.id}/ressources">
            <span class="tile-icon">${ICON_RESSOURCES}</span>
            <span class="tile-body"><h3>Ressources</h3><p>Accédez aux guides et supports utiles.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
          <a class="tile tile-blue" href="/client/${agency.id}/retell">
            <span class="tile-icon">${ICON_AGENT_VOCAL}</span>
            <span class="tile-body"><h3>Agent vocal</h3><p>Consultez l'activité de votre agent vocal.</p></span>
            <span class="tile-chevron">${ICON_CHEVRON}</span>
          </a>
        </div>
      </section>
    `;
    if (isAdmin) initWebCallWidget(agency.id);
    return;
  }

  if (rootSelector === '#documents-root') {
    const agencyId = getAgencyIdFromUrl();
    const cards = buildDocumentHubCards(agencyId, payload);
    root.innerHTML = createNavigationBanner(agencyId, 'Documents') + `
      <section class="section-block">
        <div class="section-title">Documents</div>
        <p class="small">Retrouvez ici les documents administratifs et contractuels liés à votre accompagnement Bluewaive.</p>
        <div class="grid grid-2">
          ${cards.map(renderDocumentHubCard).join('')}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#devis-root') {
    const data = payload.devis || [];
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Devis', `/client/${agencyId}/documents`) + `
      <section class="section-block">
        <div class="section-title">Vos devis</div>
        <div class="grid">
          ${data.length ? data.map(item => renderDocCard({
            kicker: 'Devis',
            reference: item.reference,
            statut: item.statut,
            figures: [
              { label: 'Montant', value: `${item.montant} EUR`, emphasis: true },
              { label: "Date d'envoi", value: formatDateFR(item.dateEnvoi) }
            ],
            description: item.commentaires,
            footerNote: 'Document commercial',
            buttonLabel: 'Voir le devis',
            buttonHref: item.lienDevis
          })).join('') : '<div class="meta">Aucun devis disponible pour le moment.</div>'}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#factures-root') {
    const data = payload.factures || [];
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Factures', `/client/${agencyId}/documents`) + `
      <section class="section-block">
        <div class="section-title">Vos factures</div>
        <div class="grid">
          ${data.length ? data.map(item => renderDocCard({
            kicker: 'Facture',
            reference: item.reference,
            statut: item.statut,
            figures: [
              { label: 'Emise le', value: formatDateFR(item.dateEmission) },
              { label: 'Echeance', value: formatDateFR(item.dateEcheance) }
            ],
            footerNote: 'Document financier',
            buttonLabel: 'Voir la facture',
            buttonHref: item.lienFacture
          })).join('') : '<div class="meta">Aucune facture disponible pour le moment.</div>'}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#contrat-root') {
    const contrat = payload.contrat;
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Contrat', `/client/${agencyId}/documents`) + `
      <section class="section-block">
        <div class="section-title">Votre contrat</div>
        <div class="grid">
          ${contrat ? renderDocCard({
            kicker: 'Contrat',
            reference: contrat.reference,
            statut: contrat.statut,
            figures: [
              { label: 'Montant', value: `${contrat.montant} EUR`, emphasis: true },
              { label: 'Emission', value: formatDateFR(contrat.dateEmission) },
              { label: 'Signature', value: formatDateFR(contrat.dateSignature) }
            ],
            footerNote: 'Document contractuel signé',
            buttonLabel: 'Voir le contrat',
            buttonHref: contrat.lienContrat
          }) : '<div class="meta">Aucun contrat disponible pour le moment.</div>'}
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#cdc-root') {
    const data = payload.cahierDesCharges || [];
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Cahier des charges', `/client/${agencyId}/documents`) + `
      <section class="section-block">
        <div class="section-title">Votre cahier des charges</div>
        <div class="grid">
          ${data.length ? data.map(item => renderDocCard({
            kicker: 'Cahier des charges',
            reference: item.reference,
            statut: item.statut,
            figures: [
              { label: "Date d'émission", value: formatDateFR(item.dateEmission) },
              { label: 'Signature', value: formatDateFR(item.dateSignature) }
            ],
            description: item.notes,
            footerNote: 'Document de cadrage projet',
            buttonLabel: 'Voir le cahier des charges',
            buttonHref: item.lienCdc
          })).join('') : '<div class="meta">Aucun cahier des charges disponible pour le moment.</div>'}
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
              <div class="progress-bar-block">
                <div class="progress-bar-header">
                  <span class="progress-bar-label">Progression</span>
                  <span class="progress-bar-value">${globalPercent}%</span>
                </div>
                <div class="progress-bar-track">
                  <div class="progress-bar-fill" style="width: ${globalPercent}%"></div>
                </div>
              </div>
              <div class="progress-global-summary">
                <div class="progress-global-headline">${completedCount} étape${completedCount > 1 ? 's' : ''} terminée${completedCount > 1 ? 's' : ''} sur ${totalCount}</div>
                <div class="progress-global-stats">
                  <div class="progress-stat">
                    <span class="progress-stat-dot" style="background:#2E7D32"></span>
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

    // Le donut global a ete remplace par une barre de progression (CSS pure,
    // largeur = ${globalPercent}%, deja posee dans le innerHTML ci-dessus) -
    // seul l'appel renderDonut('donut-global', ...) est retire ici. Les mini-
    // donuts par etape restent inchanges, ils utilisent encore renderDonut.
    if (typeof renderDonut === 'function') {
      stepsWithStatus.forEach(step => {
        renderDonut({
          svgId: `donut-step-${step.key}`,
          data: [
            { key: 'done', label: 'Fait', value: step.reached ? 1 : 0, color: '#2E7D32' },
            { key: 'pending', label: 'A faire', value: step.reached ? 0 : 1, color: '#e6dcc5' }
          ]
        });
      });
    } else {
      console.error('renderDonut is not defined');
    }
    return;
  }

  if (rootSelector === '#compte-root') {
    const compte = payload.compte || {};
    const agencyId = getAgencyIdFromUrl();
    const agencyInitial = (compte.nomAgence || 'A').trim().charAt(0).toUpperCase() || 'A';
    const contactInitial = (compte.nomContact || 'C').trim().charAt(0).toUpperCase() || 'C';
    root.innerHTML = createNavigationBanner(agencyId, 'Votre compte') + `
      <div class="grid grid-2">
        <section class="section-block account-media-section">
          <div class="section-title">Identité de l'agence</div>
          <div class="contact-card account-media-card">
            <div class="account-media-thumb" id="logoPreview" data-img-class="agency-logo">
              ${compte.logoUrl
                ? `<img src="${escapeHtml(compte.logoUrl)}" alt="Logo ${escapeHtml(compte.nomAgence)}" class="agency-logo">`
                : `<div class="contact-avatar">${agencyInitial}</div>`}
            </div>
            <div class="account-media-info">
              <h3>${escapeHtml(compte.nomAgence) || 'Agence'}</h3>
              <button type="button" class="btn-outline" id="editLogoBtn">Modifier le logo</button>
              <input type="file" id="logoFileInput" accept="image/jpeg,image/jpg,image/png,image/webp" hidden />
            </div>
          </div>
          <div id="logoMessage" class="security-message"></div>
        </section>
        <section class="section-block account-media-section">
          <div class="section-title">Contact principal</div>
          <div class="contact-card account-media-card">
            <div class="account-media-thumb" id="contactPhotoPreview" data-img-class="contact-photo">
              ${compte.contactPhotoUrl
                ? `<img src="${escapeHtml(compte.contactPhotoUrl)}" alt="Photo de ${escapeHtml(compte.nomContact)}" class="contact-photo">`
                : `<div class="contact-avatar">${contactInitial}</div>`}
            </div>
            <div class="account-media-info">
              <h3>${escapeHtml(compte.nomContact) || 'Contact référent'}</h3>
              <p>${escapeHtml(compte.email)}</p>
              <p>${escapeHtml(compte.telephone)}</p>
              <button type="button" class="btn-outline" id="editPhotoBtn">Modifier la photo</button>
              <input type="file" id="photoFileInput" accept="image/jpeg,image/jpg,image/png,image/webp" hidden />
            </div>
          </div>
          <div id="contactPhotoMessage" class="security-message"></div>
        </section>
      </div>
      <section class="section-block">
        <div class="section-title">Informations de l'agence</div>
        <div class="info-grid">
          <div class="info-field"><label>Nom de l'agence</label><p>${compte.nomAgence}</p></div>
          <div class="info-field"><label>Contact principal</label><p>${compte.nomContact}</p></div>
          <div class="info-field"><label>Email</label><p>${compte.email}</p></div>
          <div class="info-field"><label>Téléphone</label><p>${compte.telephone}</p></div>
          <div class="info-field"><label>Adresse</label><p>${compte.adresse}, ${compte.codePostal} ${compte.ville}</p></div>
          <div class="info-field"><label>Pays</label><p>${compte.pays}</p></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Informations professionnelles</div>
        <div class="info-grid">
          <div class="info-field"><label>SIRET</label><p>${compte.siret}</p></div>
          <div class="info-field"><label>Type d'activité</label><p>${compte.typeActivite}</p></div>
          <div class="info-field"><label>Nombre d'employés</label><p>${compte.nombreEmployes}</p></div>
          <div class="info-field"><label>Date de création</label><p>${compte.dateCreation}</p></div>
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
    initAccountMediaUpload(agencyId, {
      target: 'logo',
      fileInputId: 'logoFileInput',
      buttonId: 'editLogoBtn',
      previewId: 'logoPreview',
      messageId: 'logoMessage'
    });
    initAccountMediaUpload(agencyId, {
      target: 'contact-photo',
      fileInputId: 'photoFileInput',
      buttonId: 'editPhotoBtn',
      previewId: 'contactPhotoPreview',
      messageId: 'contactPhotoMessage'
    });
  }

  if (rootSelector === '#ressources-root') {
    const agencyId = getAgencyIdFromUrl();
    const ressources = payload.ressources || {};
    root.innerHTML = createNavigationBanner(agencyId, 'Ressources') + `
      <section class="section-block">
        <div class="section-title">Ressources</div>
        <p class="small">Guides, tutoriels et supports pour utiliser Bluewaive au quotidien.</p>
        <div class="grid resource-grid">
          ${RESOURCE_CARDS.map(config => renderResourceCard(config, ressources[config.key])).join('')}
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
    // Deux familles de couleur, memes que les Acces rapides : "call" (activite
    // d'appel, bleu) vs "result" (resultat commercial, or).
    const performanceCards = [
      `<div class="kpi kpi-call"><strong>${retell ? retell.callCount : 'Non disponible'}</strong><span>Appels</span></div>`,
      `<div class="kpi kpi-call"><strong>${retell ? retell.averageDurationMinutes : 'Non disponible'}</strong><span>Durée moyenne (min)</span></div>`,
      `<div class="kpi kpi-call"><strong>${dernierAppelLabel}</strong><span>Dernier appel</span></div>`,
      `<div class="kpi kpi-result"><strong>${voiceOs.connected ? voiceOs.leadsCount : 'Non disponible'}</strong><span>Leads créés</span></div>`,
      `<div class="kpi kpi-result"><strong>${voiceOs.connected ? voiceOs.rdvCount : 'Non disponible'}</strong><span>RDV pris</span></div>`,
      `<div class="kpi kpi-result"><strong>${voiceOs.connected ? voiceOs.relancesCount : 'Non disponible'}</strong><span>Relances créées</span></div>`
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

// Widget reserve au role admin (voir renderClientData #overview-root) : `agencyId`
// est l'agence de la session (equipe Bluewaive), jamais l'agence testee. L'admin
// choisit explicitement, via le selecteur "Agence à tester" rempli ci-dessous,
// quelle agence CLIENTE deja configuree tester (OPTION A/C) - aucun agent_id n'est
// jamais manipule cote frontend, uniquement un `targetAgencyId` (identifiant
// d'agence, meme nature que l'`agencyId` deja public partout ailleurs dans l'app).
function initWebCallWidget(agencyId) {
  const widget = document.querySelector('#webcall-widget');
  if (!widget) return;
  const button = widget.querySelector('#webcall-btn');
  const statusEl = widget.querySelector('#webcall-status');
  const unmuteBtn = widget.querySelector('#webcall-unmute-btn');
  const targetSelect = widget.querySelector('#webcallTargetSelect');
  // Bouton icone seule (pas de texte visible) : le nom de l'action vit uniquement dans
  // l'aria-label, mis a jour a chaque changement d'etat pour rester correct au clavier/lecteur
  // d'ecran (le contexte "qui" est deja donne visuellement par la carte au-dessus du bouton).
  // Recalcules a chaque selection (voir updateLabelsForSelection) - pas d'agence fixe.
  let readyLabel = "Parler avec l'assistant vocal";
  const connectingLabel = 'Connexion en cours';
  let hangupLabel = "Raccrocher l'appel";

  function hasValidTarget() {
    return Boolean(targetSelect && targetSelect.value);
  }

  function updateLabelsForSelection() {
    const option = targetSelect.options[targetSelect.selectedIndex];
    const agentName = option ? option.dataset.agentName || '' : '';
    readyLabel = agentName ? `Parler avec ${agentName}` : "Parler avec l'assistant vocal";
    hangupLabel = agentName ? `Raccrocher l'appel avec ${agentName}` : "Raccrocher l'appel";
    if (state === 'idle' || state === 'ended' || state === 'error') {
      button.setAttribute('aria-label', readyLabel);
    }
  }

  // Liste des agences deja configurees avec un Retell Agent ID valide (jamais
  // l'agent_id lui-meme dans la reponse - voir lib/app.js fetchAdminTestableAgencies).
  // Le bouton d'appel reste desactive tant qu'aucune selection valide n'est faite,
  // en miroir du refus controle applique cote serveur sans `targetAgencyId`.
  fetch(`/client/${agencyId}/api/admin-testable-agencies`)
    .then((response) => (response.ok ? response.json() : Promise.reject(new Error('load failed'))))
    .then((data) => {
      const agencies = Array.isArray(data.agencies) ? data.agencies : [];
      if (!agencies.length) {
        targetSelect.innerHTML = '<option value="">Aucune agence disponible</option>';
        return;
      }
      targetSelect.innerHTML = '<option value="">Choisir une agence…</option>' + agencies.map((entry) =>
        `<option value="${escapeHtml(entry.agencyId)}" data-agent-name="${escapeHtml(entry.agentVocal || '')}">${escapeHtml(entry.label)}</option>`
      ).join('');
      targetSelect.disabled = false;
    })
    .catch(() => {
      targetSelect.innerHTML = '<option value="">Liste indisponible</option>';
    });

  targetSelect.addEventListener('change', () => {
    updateLabelsForSelection();
    if (state === 'idle' || state === 'ended' || state === 'error') {
      button.disabled = !hasValidTarget();
    }
  });

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
      setStatus(isRetryFailure ? "Le son n'a pas pu démarrer. Réessayez." : 'Son bloqué - appuyez sur « Activer le son »', 'error');
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
    button.disabled = !hasValidTarget();
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
    button.disabled = !hasValidTarget();
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
    button.disabled = !hasValidTarget();
    button.setAttribute('aria-label', readyLabel);
    button.classList.remove('webcall-btn-hangup', 'webcall-btn-connecting');
    setStatus(message, 'error');
  }

  async function startFlow() {
    // Garde cote client (aucun appel reseau si aucune agence n'est selectionnee) -
    // en miroir du refus controle (400) que le serveur appliquerait de toute facon
    // si `targetAgencyId` etait absent du corps de la requete.
    if (!hasValidTarget()) {
      setError('Veuillez sélectionner une agence à tester.');
      return;
    }
    const targetAgencyId = targetSelect.value;
    setConnecting();

    let response;
    try {
      response = await fetch(`/client/${agencyId}/api/create-web-call`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ targetAgencyId })
      });
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
  const documents = document.querySelector('#documents-root');
  const devis = document.querySelector('#devis-root');
  const factures = document.querySelector('#factures-root');
  const contrat = document.querySelector('#contrat-root');
  const cdc = document.querySelector('#cdc-root');
  const projet = document.querySelector('#projet-root');
  const compte = document.querySelector('#compte-root');
  const ressources = document.querySelector('#ressources-root');
  const retell = document.querySelector('#retell-root');
  const prospect = document.querySelector('#prospect-root');

  if (overview) loadClientData('overview', '#overview-root').catch(() => { overview.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (documents) loadClientData('documents', '#documents-root').catch(() => { documents.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (devis) loadClientData('devis', '#devis-root').catch(() => { devis.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (factures) loadClientData('factures', '#factures-root').catch(() => { factures.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (contrat) loadClientData('contrat', '#contrat-root').catch(() => { contrat.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (cdc) loadClientData('cahier-des-charges', '#cdc-root').catch(() => { cdc.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (projet) loadClientData('overview', '#projet-root').catch(() => { projet.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (compte) loadClientData('compte', '#compte-root').catch(() => { compte.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (ressources) loadClientData('ressources', '#ressources-root').catch(() => { ressources.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
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
