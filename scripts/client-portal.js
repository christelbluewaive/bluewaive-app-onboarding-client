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
  return window.location.pathname.split('/')[2] || 'rec9eVu9T7XNrlIAf';
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
      <section class="hero-banner" style="background-image: url('/estacade-saint-jean-de-monts.jpg')">
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
          <img src="/christel%20bluewaive.png" alt="Christel" class="contact-photo">
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
    const agencyId = getAgencyIdFromUrl();

    root.innerHTML = createNavigationBanner(agencyId, 'Avancement du projet') + `
      <section class="section-block">
        <div class="section-title">Avancement du projet</div>
        <div class="timeline">
          ${steps.map(step => `
            <div class="timeline-step ${step.reached ? 'done' : ''} ${step.active ? 'current' : ''}">
              <strong>${step.label}</strong>
              <div class="small">${step.reached ? 'Termine' : 'A venir'}</div>
            </div>
          `).join('')}
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Progression globale</div>
        <div class="donut-grid">
          <div class="donut-panel">
            <div class="donut-body">
              <svg id="donut-global" class="donut-chart" viewBox="0 0 120 120"></svg>
              <div class="donut-legend" id="legend-global"></div>
            </div>
            <div class="donut-detail" id="detail-global"></div>
          </div>
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Prochaines actions</div>
        <div class="grid">
          ${(payload.nextActions || []).map((action, i) => `<div class="doc-card"><div><strong>Action ${i + 1}</strong><div class="meta">${action}</div></div></div>`).join("")}
        </div>
      </section>

      <section class="section-block">
        <div class="section-title">Calendrier d'onboarding</div>
        <div class="grid">
          ${(payload.calendar || []).map(event => `<div class="doc-card"><div><strong>${event.title}</strong><div class="meta">${event.date}</div></div><span class="status-pill ${event.completed ? "active" : "pending"}">${event.completed ? "Fait" : "A venir"}</span></div>`).join("")}
        </div>
      </section>
    `;

    if (typeof renderDonut === 'function') {
      renderDonut({
        svgId: 'donut-global',
        legendId: 'legend-global',
        detailId: 'detail-global',
        data: [
          { key: 'completed', label: 'Complete', value: completedCount, color: '#1e8e57' },
          { key: 'pending', label: 'En attente', value: totalCount - completedCount, color: '#e6dcc5' }
        ],
        detailsByKey: {
          completed: steps.filter(s => s.reached).map(s => s.label),
          pending: steps.filter(s => !s.reached).map(s => s.label)
        }
      });
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
    const retell = payload.retellStats || {};
    const agencyId = getAgencyIdFromUrl();
    root.innerHTML = createNavigationBanner(agencyId, 'Assistant vocal') + `
      <section class="section-block">
        <div class="section-title">Activite assistant vocal</div>
        <div class="kpis">
          <div class="kpi"><strong>${retell.callCount}</strong><span>appels</span></div>
          <div class="kpi"><strong>${retell.averageDurationMinutes}</strong><span>minutes moyennes</span></div>
          <div class="kpi"><strong>${retell.status}</strong><span>statut</span></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Derniers appels</div>
        <div class="grid">
          ${(retell.lastCalls || []).map(call => `
            <div class="doc-card">
              <div>
                <strong>${call.datetime}</strong>
                <div class="meta">Duree : ${call.durationMinutes} min</div>
              </div>
              <span class="status-pill ${call.status === 'Termine' ? 'active' : 'pending'}">${call.status}</span>
            </div>
          `).join('')}
        </div>
      </section>
    `;
  }
}

document.addEventListener('DOMContentLoaded', () => {
  const homeLink = document.querySelector('#home-link');
  if (homeLink) homeLink.href = `/client/${getAgencyIdFromUrl()}`;

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
