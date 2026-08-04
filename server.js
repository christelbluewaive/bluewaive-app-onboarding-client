const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');

function loadEnvFile() {
  const envPath = path.join(__dirname, '.env');
  if (!fs.existsSync(envPath)) return;
  const content = fs.readFileSync(envPath, 'utf8');
  for (const line of content.split(/\r?\n/)) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex === -1) continue;
    const key = trimmed.slice(0, separatorIndex).trim();
    const value = trimmed.slice(separatorIndex + 1).trim();
    if (!process.env[key]) process.env[key] = value.replace(/^['"]|['"]$/g, '');
  }
}

loadEnvFile();

const PORT = process.env.PORT || 3000;
const ROOT_DIR = __dirname;
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appGBLLoeqkREDBh2';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE_AGENCES = process.env.AIRTABLE_TABLE_AGENCES || 'Agences';
const AIRTABLE_TABLE_DEVIS = process.env.AIRTABLE_TABLE_DEVIS || 'Devis';
const AIRTABLE_TABLE_FACTURES = process.env.AIRTABLE_TABLE_FACTURES || 'Factures';
const AIRTABLE_TABLE_CONTRATS = process.env.AIRTABLE_TABLE_CONTRATS || 'Contrats';
const AIRTABLE_TABLE_OFFRES = process.env.AIRTABLE_TABLE_OFFRES || 'Offres';
const VAPI_API_KEY = process.env.VAPI_API_KEY;

function sendJson(res, statusCode, payload) {
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, contentType, body) {
  res.writeHead(statusCode, { 'Content-Type': contentType });
  res.end(body);
}

function getMimeType(filePath) {
  const ext = path.extname(filePath).toLowerCase();
  switch (ext) {
    case '.html': return 'text/html; charset=utf-8';
    case '.css': return 'text/css; charset=utf-8';
    case '.js': return 'application/javascript; charset=utf-8';
    case '.json': return 'application/json; charset=utf-8';
    case '.png': return 'image/png';
    case '.jpg': return 'image/jpeg';
    case '.svg': return 'image/svg+xml';
    default: return 'application/octet-stream';
  }
}

function readStaticFile(filePath) {
  return fs.readFileSync(filePath);
}

function extractValue(fields, keys, fallback = '') {
  for (const key of keys) {
    if (fields[key] !== undefined && fields[key] !== null && fields[key] !== '') {
      return fields[key];
    }
  }
  return fallback;
}

function getRecordId(value) {
  if (!value) return null;
  if (typeof value === 'string') return value;
  if (typeof value === 'object') return value.id || value.recordId || null;
  return null;
}

function normalizeDate(value) {
  if (!value) return '';
  if (typeof value === 'string') return value;
  if (value instanceof Date) return value.toISOString().slice(0, 10);
  return '';
}

function normalizeCurrency(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function buildProjectSteps(auditFait, configVapiFaite, formationFaite, miseEnProduction, suiviActif) {
  const checkboxes = [
    { key: 'audit', label: 'Audit', completed: auditFait },
    { key: 'config', label: 'Configuration Vapi', completed: configVapiFaite },
    { key: 'formation', label: 'Formation', completed: formationFaite },
    { key: 'production', label: 'Mise en production', completed: miseEnProduction },
    { key: 'suivi', label: 'Suivi actif', completed: suiviActif }
  ];

  // Calculer quelle étape est active (première non-complétée ou la dernière si toutes complétées)
  const firstIncomplete = checkboxes.findIndex((step) => !step.completed);
  const activeIndex = firstIncomplete === -1 ? checkboxes.length - 1 : firstIncomplete;

  return checkboxes.map((step, idx) => ({
    key: step.key,
    label: step.label,
    reached: step.completed,
    active: idx === activeIndex,
    completed: step.completed
  }));
}

function buildMockData(agencyId) {
  return {
    agency: {
      id: agencyId,
      nomAgence: "Bluewaive Immo",
      prenom: "Camille",
      email: "camille@bluewaive.fr",
      telephone: "+33 6 12 34 56 78",
      adresse: "Paris, Ile-de-France",
      statutCommercial: "Signe",
      dateSignature: "2026-06-10",
      offreSouscrite: {
        nom: "Offre Premium",
        prixMensuel: 180,
        setup: 2000,
        description: "Accompagnement complet d onboarding et automatisation locale."
      },
      volumeAppels: 42,
      nbAgents: 8,
      auditFait: true,
      configVapiFaite: true,
      formationFaite: false,
      miseEnProduction: false,
      suiviActif: false
    },
    devis: [
      {
        reference: 'DEV-2026-001',
        statut: 'Envoyé',
        montant: 3200,
        dateEnvoi: '2026-06-12',
        commentaires: "Adapte au volume de 8 agents et au besoin d automatisation.",
        lienDevis: 'https://example.com/devis/DEV-2026-001',
        contrats: ['CTR-2026-001']
      }
    ],
    factures: [
      {
        reference: 'FAC-2026-001',
        statut: 'Payée',
        dateEmission: '2026-06-20',
        dateEcheance: '2026-07-20',
        lienFacture: 'https://example.com/factures/FAC-2026-001.pdf'
      }
    ],
    contrat: {
      reference: 'CTR-2026-001',
      statut: 'Signé',
      lienContrat: 'https://example.com/contrats/CTR-2026-001.pdf',
      dateEmission: '2026-06-20',
      dateSignature: '2026-06-28',
      montant: 3200
    },
    projectSteps: [
      { key: 'signature', label: 'Signature', reached: true, active: false },
      { key: 'configuration', label: 'Configuration', reached: true, active: true },
      { key: 'formation', label: 'Formation', reached: false, active: false },
      { key: 'actif', label: 'Actif', reached: false, active: false }
    ],
    vapiStats: {
      callCount: 12,
      averageDurationMinutes: 4.2,
      status: 'Actif',
      lastCalls: [
        { id: 'call-001', datetime: '2026-07-22 10:15', durationMinutes: 3.8, status: 'Terminé' },
        { id: 'call-002', datetime: '2026-07-22 09:20', durationMinutes: 5.1, status: 'Terminé' },
        { id: 'call-003', datetime: '2026-07-21 18:05', durationMinutes: 2.9, status: 'En attente' }
      ]
    }
  };
}

function getJsonFromUrl(url, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const request = client.get(url, { headers }, (response) => {
      let raw = '';
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        if (response.statusCode >= 400) {
          reject(new Error(`HTTP ${response.statusCode}: ${raw}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', reject);
  });
}

async function fetchAirtableRecord(tableName, recordId) {
  if (!AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY is not configured');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  const response = await getJsonFromUrl(url, {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    Accept: 'application/json'
  });
  return response.record || response;
}

async function fetchAirtableRecords(tableName, recordIds) {
  const results = [];
  for (const recordId of recordIds) {
    const id = getRecordId(recordId);
    if (!id) continue;
    try {
      const record = await fetchAirtableRecord(tableName, id);
      if (record) results.push(record);
    } catch (error) {
      console.warn(`Unable to load Airtable record ${id} from ${tableName}: ${error.message}`);
    }
  }
  return results;
}

const EMPTY_OFFER = { nom: '', prixMensuel: 0, setup: 0, description: '' };

async function normalizeOffer(linkValue) {
  if (!linkValue) return EMPTY_OFFER;
  const ids = Array.isArray(linkValue) ? linkValue : [linkValue];
  const id = getRecordId(ids[0]);
  if (!id) return EMPTY_OFFER;
  try {
    const record = await fetchAirtableRecord(AIRTABLE_TABLE_OFFRES, id);
    const fields = record.fields || record;
    return {
      nom: extractValue(fields, ['Nom Offre', 'name', 'Nom'], ''),
      prixMensuel: normalizeCurrency(extractValue(fields, ['Prix mensuel (€)', 'Price', 'prixMensuel'], 0)),
      setup: normalizeCurrency(extractValue(fields, ['Setup', 'setup'], 0)),
      description: extractValue(fields, ['Description', 'description'], '')
    };
  } catch (error) {
    console.warn(`Unable to load offer ${id}: ${error.message}`);
    return EMPTY_OFFER;
  }
}

function normalizeDevis(record) {
  const fields = record.fields || record;
  return {
    reference: extractValue(fields, ['Référence Devis', 'Reference', 'reference'], ''),
    statut: extractValue(fields, ['Statut', 'status'], ''),
    montant: normalizeCurrency(extractValue(fields, ['Montant', 'amount'], 0)),
    dateEnvoi: normalizeDate(extractValue(fields, ['Date Envoi', 'dateEnvoi'], '')),
    commentaires: extractValue(fields, ['Commentaires', 'comments', 'commentaires'], ''),
    lienDevis: extractValue(fields, ['Lien Devis', 'lienDevis', 'link'], ''),
    contrats: Array.isArray(fields['Contrats']) ? fields['Contrats'].map(getRecordId).filter(Boolean) : []
  };
}

function normalizeFacture(record) {
  const fields = record.fields || record;
  return {
    reference: extractValue(fields, ['Référence Facture', 'Reference', 'reference'], ''),
    statut: extractValue(fields, ['Statut', 'status'], ''),
    dateEmission: normalizeDate(extractValue(fields, ['Date Émission', 'Date Emission', 'dateEmission'], '')),
    dateEcheance: normalizeDate(extractValue(fields, ['Date Échéance', 'Date Echeance', 'dateEcheance'], '')),
    lienFacture: extractValue(fields, ['Lien facture drive', 'Lien facture', 'lienFacture'], '')
  };
}

function normalizeContrat(record) {
  const fields = record.fields || record;
  return {
    reference: extractValue(fields, ['Référence Contrat', 'Reference', 'reference'], ''),
    statut: extractValue(fields, ['Statut', 'status'], ''),
    lienContrat: extractValue(fields, ['Lien Contrat', 'lienContrat', 'link'], ''),
    dateEmission: normalizeDate(extractValue(fields, ['Date Émission', 'Date Emission', 'dateEmission'], '')),
    dateSignature: normalizeDate(extractValue(fields, ['Date Signature', 'dateSignature'], '')),
    montant: normalizeCurrency(extractValue(fields, ['Montant', 'amount'], 0))
  };
}

async function fetchVapiStats(agency) {
  const phoneNumberId = agency.vapiPhoneNumberId || process.env.VAPI_PHONE_NUMBER_ID;
  if (!VAPI_API_KEY || !phoneNumberId) {
    return null;
  }

  try {
    const payload = await getJsonFromUrl(`https://api.vapi.ai/call?phoneNumberId=${encodeURIComponent(phoneNumberId)}`, {
      Authorization: `Bearer ${VAPI_API_KEY}`,
      Accept: 'application/json'
    });
    const calls = Array.isArray(payload) ? payload : payload.calls || payload.data || payload.results || [];
    const safeCalls = calls.filter(Boolean);
    const averageDurationMinutes = safeCalls.length
      ? (safeCalls.reduce((sum, call) => sum + Number(call.durationSeconds || call.duration || 0), 0) / safeCalls.length / 60).toFixed(1)
      : 0;

    return {
      callCount: safeCalls.length,
      averageDurationMinutes: Number(averageDurationMinutes),
      status: safeCalls.length ? (safeCalls[0].status || 'Actif') : 'Aucun appel',
      lastCalls: safeCalls.slice(0, 3).map((call, index) => ({
        id: call.id || `call-${index + 1}`,
        datetime: call.startedAt || call.createdAt || call.timestamp || '',
        durationMinutes: Number((Number(call.durationSeconds || call.duration || 0) / 60).toFixed(1)),
        status: call.status || 'Terminé'
      }))
    };
  } catch (error) {
    console.warn(`Unable to fetch Vapi stats: ${error.message}`);
    return null;
  }
}

async function buildLiveData(agencyId) {
  try {
    const agencyRecord = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, agencyId);
    if (!agencyRecord) {
      return null;
    }
    const fields = agencyRecord.fields || agencyRecord;
    const agency = {
      id: agencyRecord.id || agencyId,
      nomAgence: extractValue(fields, ['Nom Agence', 'NomAgence', 'name'], ''),
      prenom: extractValue(fields, ['Prénom', 'Prenom', 'prenom'], ''),
      email: extractValue(fields, ['Email', 'email'], ''),
      telephone: extractValue(fields, ['telephone_client', 'Telephone', 'telephone'], ''),
      adresse: extractValue(fields, ['Adresse/ville', 'Adresse', 'adresse'], ''),
      statutCommercial: extractValue(fields, ['Statut Commercial', 'statutCommercial'], ''),
      dateSignature: normalizeDate(extractValue(fields, ['Date Signature', 'dateSignature'], '')),
      offreSouscrite: await normalizeOffer(extractValue(fields, ['Offre Souscrite', 'offreSouscrite'], null)),
      volumeAppels: Number(extractValue(fields, ['volume_appels', 'volumeAppels'], 0)),
      nbAgents: Number(extractValue(fields, ['nb_agents', 'nbAgents'], 0)),
      vapiPhoneNumberId: extractValue(fields, ['Vapi Phone Number ID', 'vapiPhoneNumberId'], ''),
      // 5 checkboxes pour les étapes du projet
      auditFait: Boolean(extractValue(fields, ['Audit fait', 'auditFait'], false)),
      configVapiFaite: Boolean(extractValue(fields, ['Config Vapi faite', 'configVapiFaite'], false)),
      formationFaite: Boolean(extractValue(fields, ['Formation faite', 'formationFaite'], false)),
      miseEnProduction: Boolean(extractValue(fields, ['Mise en production', 'miseEnProduction'], false)),
      suiviActif: Boolean(extractValue(fields, ['Suivi actif', 'suiviActif'], false))
    };

    const devisLinks = extractValue(fields, ['Devis', 'devis'], []);
    const devisRecords = await fetchAirtableRecords(AIRTABLE_TABLE_DEVIS, Array.isArray(devisLinks) ? devisLinks : [devisLinks]);
    const devis = devisRecords.map(normalizeDevis);

    const factureLinks = extractValue(fields, ['Factures', 'factures'], []);
    const factureRecords = await fetchAirtableRecords(AIRTABLE_TABLE_FACTURES, Array.isArray(factureLinks) ? factureLinks : [factureLinks]);
    const factures = factureRecords.map(normalizeFacture);

    const allContracts = [];
    for (const devisItem of devis) {
      if (!devisItem.contrats.length) continue;
      const contractRecords = await fetchAirtableRecords(AIRTABLE_TABLE_CONTRATS, devisItem.contrats);
      allContracts.push(...contractRecords.map(normalizeContrat));
    }

    const contrat = allContracts[0] || null;
    const vapiStats = await fetchVapiStats(agency);
    const projectSteps = buildProjectSteps(
      agency.auditFait,
      agency.configVapiFaite,
      agency.formationFaite,
      agency.miseEnProduction,
      agency.suiviActif
    );

    return {
      agency,
      devis,
      factures,
      contrat,
      projectSteps,
      vapiStats: vapiStats || {
        callCount: 0,
        averageDurationMinutes: 0,
        status: 'Aucun appel',
        lastCalls: []
      }
    };
  } catch (error) {
    console.warn(`Falling back to mock data because Airtable/Vapi integration failed: ${error.message}`);
    return buildMockData(agencyId);
  }
}

function resolvePagePath(requestPath) {
  const normalized = requestPath.replace(/^\/+/, '').replace(/\/+$/, '');
  if (!normalized) return path.join(ROOT_DIR, 'pages', 'client-home.html');

  if (normalized === 'styles.css') return path.join(ROOT_DIR, 'styles.css');
  if (normalized === 'scripts/client-portal.js') return path.join(ROOT_DIR, 'scripts', 'client-portal.js');
  if (normalized === 'scripts/donut.js') return path.join(ROOT_DIR, 'scripts', 'donut.js');
  if (normalized === 'index.html') return path.join(ROOT_DIR, 'index.html');

  const publicDir = path.join(ROOT_DIR, 'public');
  const publicCandidate = path.join(publicDir, normalized);
  if (!normalized.includes('..') && publicCandidate.startsWith(publicDir) && fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
    return publicCandidate;
  }

  const pageMap = {
    'client-home.html': path.join(ROOT_DIR, 'pages', 'client-home.html'),
    'client-devis.html': path.join(ROOT_DIR, 'pages', 'client-devis.html'),
    'client-factures.html': path.join(ROOT_DIR, 'pages', 'client-factures.html'),
    'client-contrat.html': path.join(ROOT_DIR, 'pages', 'client-contrat.html'),
    'client-projet.html': path.join(ROOT_DIR, 'pages', 'client-projet.html'),
    'client-vapi.html': path.join(ROOT_DIR, 'pages', 'client-vapi.html')
  };

  if (pageMap[normalized]) return pageMap[normalized];

  return null;
}

const server = http.createServer(async (req, res) => {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { Location: '/client/rec_demoAgency' });
    res.end();
    return;
  }

  const clientMatch = pathname.match(/^\/client\/([^/]+)(?:\/(.*))?$/);
  if (clientMatch) {
    const agencyId = clientMatch[1];
    const subpage = clientMatch[2] || '';

    if (pathname.startsWith(`/client/${agencyId}/api/`)) {
      const apiPath = pathname.replace(`/client/${agencyId}/api/`, '');
      const payload = await buildLiveData(agencyId);
      if (!payload) {
        sendJson(res, 404, { error: 'Agence introuvable' });
        return;
      }
      if (apiPath === 'devis') {
        sendJson(res, 200, payload);
        return;
      }
      if (apiPath === 'factures') {
        sendJson(res, 200, payload);
        return;
      }
      if (apiPath === 'contrat') {
        sendJson(res, 200, payload);
        return;
      }
      if (apiPath === 'vapi-stats') {
        sendJson(res, 200, payload);
        return;
      }
      if (apiPath === 'overview') {
        sendJson(res, 200, payload);
        return;
      }
    }

    if (pathname === `/client/${agencyId}`) {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-home.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }

    if (subpage === 'devis') {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-devis.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
    if (subpage === 'factures') {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-factures.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
    if (subpage === 'contrat') {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-contrat.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
    if (subpage === 'projet') {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-projet.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
    if (subpage === 'vapi') {
      const filePath = path.join(ROOT_DIR, 'pages', 'client-vapi.html');
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
  }

  const apiMatch = pathname.match(/^\/api\/client\/([^/]+)\/(.+)$/);
  if (apiMatch) {
    const agencyId = apiMatch[1];
    const endpoint = apiMatch[2];
    const payload = await buildLiveData(agencyId);
    if (!payload) {
      sendJson(res, 404, { error: 'Agence introuvable' });
      return;
    }
    if (endpoint === 'devis') {
      sendJson(res, 200, payload);
      return;
    }
    if (endpoint === 'factures') {
      sendJson(res, 200, payload);
      return;
    }
    if (endpoint === 'contrat') {
      sendJson(res, 200, payload);
      return;
    }
    if (endpoint === 'vapi-stats') {
      sendJson(res, 200, payload);
      return;
    }
    if (endpoint === 'overview') {
      sendJson(res, 200, payload);
      return;
    }
  }

  const resolvedPath = resolvePagePath(pathname);
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    sendText(res, 200, getMimeType(resolvedPath), readStaticFile(resolvedPath));
    return;
  }

  if (clientMatch) {
    const notFoundPath = path.join(ROOT_DIR, 'pages', 'client-not-found.html');
    if (fs.existsSync(notFoundPath)) {
      sendText(res, 404, getMimeType(notFoundPath), readStaticFile(notFoundPath));
      return;
    }
  }

  sendText(res, 404, 'text/plain; charset=utf-8', 'Page introuvable');
});

server.listen(PORT, () => {
  console.log(`Portail client lancé sur http://localhost:${PORT}`);
});
