function statusClass(statut) {
  const value = (statut || '').toLowerCase();
  if (['accepté', 'accepte', 'payée', 'payee', 'signé', 'signe', 'actif'].some(s => value.includes(s))) return 'active';
  if (['refusé', 'refuse', 'annulé', 'annule', 'en retard', 'impayée', 'impayee'].some(s => value.includes(s))) return 'critical';
  return 'pending';
}

function getAgencyIdFromUrl() {
  return window.location.pathname.split('/')[2] || 'rec_demoAgency';
}

async function loadClientData(endpoint, rootSelector) {
  const agencyId = getAgencyIdFromUrl();
  const response = await fetch(`/api/client/${agencyId}/${endpoint}`);
  if (!response.ok) throw new Error('Impossible de charger les données client');
  const payload = await response.json();
  renderClientData(payload, rootSelector);
}

function renderClientData(payload, rootSelector) {
  const root = document.querySelector(rootSelector);
  if (!root) return;

  if (rootSelector === '#overview-root') {
    const agency = payload.agency;
    root.innerHTML = `
      <section class="hero-card">
        <div>
          <div class="hero-badge">Bienvenue ${agency.prenom || 'client'}</div>
          <h1>${agency.nomAgence}</h1>
          <p>Votre onboarding est déjà en cours. Retrouvez ici vos documents, votre contrat et l’avancée de votre mise en place.</p>
        </div>
        <div class="row">
          <span class="status-pill ${statusClass(agency.statutCommercial)}">${agency.statutCommercial}</span>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Votre interlocutrice Bluewaive</div>
        <div class="contact-card">
          <div class="contact-avatar">CH</div>
          <div>
            <h3>Christel</h3>
            <p>Votre accompagnante pour l’onboarding, les documents et les premières étapes de mise en service.</p>
            <div class="contact-actions">
              <a href="https://mail.google.com/mail/?view=cm&fs=1&to=christel.bluewaive@gmail.com" target="_blank" rel="noreferrer">Contacter par email</a>
            </div>
          </div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Vue d’ensemble</div>
        <div class="kpis">
          <div class="kpi"><strong>${agency.volumeAppels}</strong><span>appels enregistrés</span></div>
          <div class="kpi"><strong>${agency.nbAgents}</strong><span>agents</span></div>
          <div class="kpi"><strong>${agency.offreSouscrite.nom}</strong><span>offre souscrite</span></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Accès rapides</div>
        <div class="grid grid-2">
          <a class="tile" href="/client/${agency.id}/devis"><h3>Devis</h3><p>Consultez votre offre et le statut de votre proposition.</p></a>
          <a class="tile" href="/client/${agency.id}/factures"><h3>Factures</h3><p>Retrouvez vos factures émises et leurs échéances.</p></a>
          <a class="tile" href="/client/${agency.id}/contrat"><h3>Contrat</h3><p>Accédez à la version signée et aux dates clés.</p></a>
          <a class="tile" href="/client/${agency.id}/projet"><h3>Avancement du projet</h3><p>Suivez les étapes de votre onboarding.</p></a>
          <a class="tile" href="/client/${agency.id}/vapi"><h3>Assistant vocal</h3><p>Consultez l’activité de votre assistant Vapi.</p></a>
        </div>
      </section>
    `;
    return;
  }

  if (rootSelector === '#devis-root') {
    const data = payload.devis || [];
    root.innerHTML = `
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
                <div class="doc-figure"><span class="label">Montant</span><span class="value doc-amount">${item.montant} €</span></div>
                <div class="doc-figure"><span class="label">Date d’envoi</span><span class="value">${item.dateEnvoi}</span></div>
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
    root.innerHTML = `
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
                <div class="doc-figure"><span class="label">Émise le</span><span class="value">${item.dateEmission}</span></div>
                <div class="doc-figure"><span class="label">Échéance</span><span class="value">${item.dateEcheance}</span></div>
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
    root.innerHTML = `
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
            <div class="doc-figure"><span class="label">Montant</span><span class="value doc-amount">${contrat.montant} €</span></div>
            <div class="doc-figure"><span class="label">Émission</span><span class="value">${contrat.dateEmission}</span></div>
            <div class="doc-figure"><span class="label">Signature</span><span class="value">${contrat.dateSignature}</span></div>
          </div>
          <div class="doc-footer">
            <span class="small muted">Document contractuel signé</span>
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

    root.innerHTML = `
      <section class="section-block">
        <div class="section-title">Avancement du projet</div>
        <div class="timeline">
          ${steps.map(step => `
            <div class="timeline-step ${step.reached ? 'done' : ''} ${step.active ? 'current' : ''}">
              <strong>${step.label}</strong>
              <div class="small">${step.reached ? 'Terminé' : 'À venir'}</div>
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
    `;

    // Charger et exécuter le script donut
    if (typeof renderDonut === 'function') {
      renderDonut({
        svgId: 'donut-global',
        legendId: 'legend-global',
        detailId: 'detail-global',
        data: [
          { key: 'completed', label: 'Completé', value: completedCount, color: '#1e8e57' },
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

  if (rootSelector === '#vapi-root') {
    const vapi = payload.vapiStats || {};
    root.innerHTML = `
      <section class="section-block">
        <div class="section-title">Activité assistant vocal</div>
        <div class="kpis">
          <div class="kpi"><strong>${vapi.callCount}</strong><span>appels</span></div>
          <div class="kpi"><strong>${vapi.averageDurationMinutes}</strong><span>minutes moyennes</span></div>
          <div class="kpi"><strong>${vapi.status}</strong><span>statut</span></div>
        </div>
      </section>
      <section class="section-block">
        <div class="section-title">Derniers appels</div>
        <div class="grid">
          ${(vapi.lastCalls || []).map(call => `
            <div class="doc-card">
              <div>
                <strong>${call.datetime}</strong>
                <div class="meta">Durée : ${call.durationMinutes} min</div>
              </div>
              <span class="status-pill ${call.status === 'Terminé' ? 'active' : 'pending'}">${call.status}</span>
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
  const vapi = document.querySelector('#vapi-root');

  if (overview) loadClientData('overview', '#overview-root').catch(() => { overview.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
  if (devis) loadClientData('devis', '#devis-root').catch(() => { devis.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
  if (factures) loadClientData('factures', '#factures-root').catch(() => { factures.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
  if (contrat) loadClientData('contrat', '#contrat-root').catch(() => { contrat.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
  if (projet) loadClientData('overview', '#projet-root').catch(() => { projet.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
  if (vapi) loadClientData('vapi-stats', '#vapi-root').catch(() => { vapi.innerHTML = '<div class="section-block">Données indisponibles.</div>'; });
});
