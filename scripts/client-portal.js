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
    root.innerHTML = `
      <section class="hero-banner" style="background-image: url('/estacade-saint-jean-de-monts.png')">
        <div class="hero-overlay"></div>
        <div class="hero-banner-content">
          <div class="hero-badge">Bienvenue ${agency.prenom || 'client'}</div>
          <p>Votre onboarding est deja en cours. Retrouvez ici vos documents, votre contrat et l'avancee de votre mise en place.</p>
          <span class="status-pill ${statusClass(agency.statutCommercial)}">${agency.statutCommercial}</span>
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
          <a class="tile" href="/client/${agency.id}/devis"><h3>Devis</h3><p>Consultez votre offre et le statut de votre proposition.</p></a>
          <a class="tile" href="/client/${agency.id}/factures"><h3>Factures</h3><p>Retrouvez vos factures emises et leurs echeances.</p></a>
          <a class="tile" href="/client/${agency.id}/contrat"><h3>Contrat</h3><p>Accedez a la version signee et aux dates cles.</p></a>
          <a class="tile" href="/client/${agency.id}/projet"><h3>Avancement du projet</h3><p>Suivez les etapes de votre onboarding.</p></a>
          <a class="tile" href="/client/${agency.id}/ressources"><h3>Ressources et documentation</h3><p>Accedez aux guides et materiels de formation.</p></a>
          <a class="tile" href="/client/${agency.id}/retell"><h3>Assistant vocal</h3><p>Consultez l'activite de votre assistant Retell.</p></a>
        </div>
      </section>
    `;
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
    `;
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
          ${activityItems.length ? activityItems.map(item => `
            <div class="doc-card">
              <div>
                <strong>${item.label}</strong>
                <div class="meta">${item.date || ''}</div>
              </div>
            </div>
          `).join('') : '<div class="meta">Aucune activité disponible pour le moment.</div>'}
        </div>
      </section>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const homeLink = document.querySelector('#home-link');
  if (homeLink) homeLink.href = `/client/${getAgencyIdFromUrl()}`;

  const compteLink = document.querySelector('#compte-link');
  if (compteLink) compteLink.href = `/client/${getAgencyIdFromUrl()}/compte`;

  const overview = document.querySelector('#overview-root');
  const devis = document.querySelector('#devis-root');
  const factures = document.querySelector('#factures-root');
  const contrat = document.querySelector('#contrat-root');
  const projet = document.querySelector('#projet-root');
  const compte = document.querySelector('#compte-root');
  const ressources = document.querySelector('#ressources-root');
  const retell = document.querySelector('#retell-root');

  if (overview) loadClientData('overview', '#overview-root').catch(() => { overview.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (devis) loadClientData('devis', '#devis-root').catch(() => { devis.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (factures) loadClientData('factures', '#factures-root').catch(() => { factures.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (contrat) loadClientData('contrat', '#contrat-root').catch(() => { contrat.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (projet) loadClientData('overview', '#projet-root').catch(() => { projet.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (compte) loadClientData('compte', '#compte-root').catch(() => { compte.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (ressources) loadClientData('overview', '#ressources-root').catch(() => { ressources.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
  if (retell) loadClientData('retell-stats', '#retell-root').catch(() => { retell.innerHTML = '<div class="section-block">Donnees indisponibles.</div>'; });
});
