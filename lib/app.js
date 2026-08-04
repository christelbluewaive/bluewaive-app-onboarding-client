const https = require('https');
const http = require('http');
const fs = require('fs');
const path = require('path');
const { URL } = require('url');
const auth = require('./auth');

function loadEnvFile() {
  const envPath = path.join(__dirname, '..', '.env');
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

const ROOT_DIR = path.join(__dirname, '..');
const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appGBLLoeqkREDBh2';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const AIRTABLE_TABLE_AGENCES = process.env.AIRTABLE_TABLE_AGENCES || 'Agences';
const AIRTABLE_TABLE_DEVIS = process.env.AIRTABLE_TABLE_DEVIS || 'Devis';
const AIRTABLE_TABLE_FACTURES = process.env.AIRTABLE_TABLE_FACTURES || 'Factures';
const AIRTABLE_TABLE_CONTRATS = process.env.AIRTABLE_TABLE_CONTRATS || 'Contrats';
const AIRTABLE_TABLE_OFFRES = process.env.AIRTABLE_TABLE_OFFRES || 'Offres';
const VAPI_API_KEY = process.env.VAPI_API_KEY;
const SESSION_COOKIE_NAME = 'bw_session';

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

// ---- Cookies ----

function parseCookies(req) {
  const header = req.headers.cookie || '';
  const cookies = {};
  header.split(';').forEach((pair) => {
    const index = pair.indexOf('=');
    if (index === -1) return;
    const key = pair.slice(0, index).trim();
    const value = pair.slice(index + 1).trim();
    if (key) cookies[key] = decodeURIComponent(value);
  });
  return cookies;
}

function isSecureRequest(req) {
  const host = req.headers.host || '';
  return !host.startsWith('localhost') && !host.startsWith('127.0.0.1');
}

function setSessionCookie(res, req, token) {
  const attrs = [`${SESSION_COOKIE_NAME}=${encodeURIComponent(token)}`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=1209600'];
  if (isSecureRequest(req)) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function clearSessionCookie(res, req) {
  const attrs = [`${SESSION_COOKIE_NAME}=`, 'HttpOnly', 'Path=/', 'SameSite=Lax', 'Max-Age=0'];
  if (isSecureRequest(req)) attrs.push('Secure');
  res.setHeader('Set-Cookie', attrs.join('; '));
}

function getSession(req) {
  const cookies = parseCookies(req);
  return auth.verifySession(cookies[SESSION_COOKIE_NAME]);
}

// ---- Airtable ----

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

async function findAgencyByEmail(email) {
  if (!AIRTABLE_API_KEY || !email) return null;
  const safeEmail = String(email).replace(/"/g, '\\"');
  const formula = `LOWER({Email}) = LOWER("${safeEmail}")`;
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(AIRTABLE_TABLE_AGENCES)}?filterByFormula=${encodeURIComponent(formula)}&maxRecords=1`;
  const response = await getJsonFromUrl(url, {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    Accept: 'application/json'
  });
  const records = response.records || [];
  return records[0] || null;
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

function buildProjectSteps(auditFait, configVapiFaite, formationFaite, miseEnProduction, suiviActif) {
  const checkboxes = [
    { key: 'audit', label: 'Audit', completed: auditFait },
    { key: 'config', label: 'Configuration Vapi', completed: configVapiFaite },
    { key: 'formation', label: 'Formation', completed: formationFaite },
    { key: 'production', label: 'Mise en production', completed: miseEnProduction },
    { key: 'suivi', label: 'Suivi actif', completed: suiviActif }
  ];

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
      nomAgence: "Immo",
      prenom: "Joyce",
      email: "camille@bluewaive.fr",
      telephone: "+33 6 12 34 56 78",
      adresse: "Paris, Ile-de-France",
      statutCommercial: "Signe",
      dateSignature: "2026-06-10",
      dateActivationPrevue: "2026-08-15",
      offreSouscrite: {
        nom: "Bluewaive Genesis- Agent AI vocal",
        prixMensuel: 199,
        setup: 999,
        description: "Programme fondateur avec audit, configuration et formation inclus."
      },
      volumeAppels: 200,
      nbAgents: 1,
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
        lienDevis: 'https://drive.usercontent.google.com/download?id=1dtObV5muWLT-EKUhGWgC3fhJTT966rFO',
        contrats: ['CTR-2026-001']
      }
    ],
    factures: [
      {
        reference: 'FAC-2026-001',
        statut: 'Payée',
        dateEmission: '2026-06-20',
        dateEcheance: '2026-07-20',
        lienFacture: 'https://drive.google.com/file/d/1aLXlc7szNRfda5r4R2l4SAtI_7aBTgM9/view'
      }
    ],
    contrat: {
      reference: 'CTR-2026-001',
      statut: 'Signé',
      lienContrat: 'https://drive.google.com/file/d/1IMUZktVmnJkxrwprSkAIX00KNZnHT9Ol/view',
      dateEmission: '2026-06-20',
      dateSignature: '2026-06-28',
      montant: 3200
    },
    projectSteps: buildProjectSteps(true, true, false, false, false),
    vapiStats: {
      callCount: 12,
      averageDurationMinutes: 4.2,
      status: 'Actif',
      lastCalls: [
        { id: 'call-001', datetime: '2026-07-22 10:15', durationMinutes: 3.8, status: 'Terminé' },
        { id: 'call-002', datetime: '2026-07-22 09:20', durationMinutes: 5.1, status: 'Terminé' },
        { id: 'call-003', datetime: '2026-07-21 18:05', durationMinutes: 2.9, status: 'En attente' }
      ]
    },
    nextActions: [
      "Rendez-vous de formation — 15 août 2026 à 14h00",
      "Mise en production prévue — 20 août 2026",
      "Début du suivi — 21 août 2026"
    ],
    resources: [
      { title: "Guide de démarrage", url: "/Guide_Demarrage_Bluewaive.html", type: "PDF" },
      { title: "Vidéo formation Vapi", url: "/Video_Formation_Vapi.html", type: "Video" },
      { title: "FAQ Bluewaive", url: "/FAQ_Bluewaive.html", type: "Documentation" }
    ],
    calendar: [
      { title: "Audit technique", date: "2026-06-20", completed: true },
      { title: "Configuration Vapi", date: "2026-07-10", completed: true },
      { title: "Formation équipe", date: "2026-08-15", completed: false },
      { title: "Mise en production", date: "2026-08-20", completed: false }
    ],
    compte: {
      nomAgence: "Bluewaive Immo",
      nomContact: "Camille Martin",
      email: "camille@bluewaive.fr",
      telephone: "+33 6 12 34 56 78",
      adresse: "123 Rue de Paris",
      codePostal: "75001",
      ville: "Paris",
      pays: "France",
      siret: "12345678901234",
      typeActivite: "Agence immobilière",
      nombreEmployes: 8,
      dateCreation: "2020-03-15",
      abonnement: "Offre Premium",
      dateAbonnement: "2026-06-10",
      statut: "Actif"
    }
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
  const normalized = decodeURIComponent(requestPath.replace(/^\/+/, '').replace(/\/+$/, ''));
  if (!normalized) return path.join(ROOT_DIR, 'pages', 'client-home.html');

  if (normalized === 'styles.css') return path.join(ROOT_DIR, 'styles.css');
  if (normalized === 'scripts/auth.js') return path.join(ROOT_DIR, 'scripts', 'auth.js');
  if (normalized === 'scripts/client-portal.js') return path.join(ROOT_DIR, 'scripts', 'client-portal.js');
  if (normalized === 'scripts/donut.js') return path.join(ROOT_DIR, 'scripts', 'donut.js');
  if (normalized === 'index.html') return path.join(ROOT_DIR, 'index.html');

  const publicDir = path.join(ROOT_DIR, 'public');
  const publicCandidate = path.join(publicDir, normalized);
  if (!normalized.includes('..') && publicCandidate.startsWith(publicDir) && fs.existsSync(publicCandidate) && fs.statSync(publicCandidate).isFile()) {
    return publicCandidate;
  }

  const assetsDir = path.join(ROOT_DIR, 'assets');
  const assetsCandidate = path.join(assetsDir, normalized);
  if (!normalized.includes('..') && assetsCandidate.startsWith(assetsDir) && fs.existsSync(assetsCandidate) && fs.statSync(assetsCandidate).isFile()) {
    return assetsCandidate;
  }

  const pageMap = {
    'client-home.html': path.join(ROOT_DIR, 'pages', 'client-home.html'),
    'client-devis.html': path.join(ROOT_DIR, 'pages', 'client-devis.html'),
    'client-factures.html': path.join(ROOT_DIR, 'pages', 'client-factures.html'),
    'client-contrat.html': path.join(ROOT_DIR, 'pages', 'client-contrat.html'),
    'client-projet.html': path.join(ROOT_DIR, 'pages', 'client-projet.html'),
    'client-vapi.html': path.join(ROOT_DIR, 'pages', 'client-vapi.html'),
    'client-ressources.html': path.join(ROOT_DIR, 'pages', 'client-ressources.html'),
    'client-compte.html': path.join(ROOT_DIR, 'pages', 'client-compte.html')
  };

  if (pageMap[normalized]) return pageMap[normalized];

  return null;
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let body = '';
    req.on('data', (chunk) => { body += chunk; });
    req.on('end', () => resolve(body));
    req.on('error', reject);
  });
}

async function handleRequest(req, res) {
  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { Location: '/login' });
    res.end();
    return;
  }

  // Login page
  if (pathname === '/login') {
    const session = getSession(req);
    if (session) {
      res.writeHead(302, { Location: `/client/${session.agencyId}` });
      res.end();
      return;
    }
    const filePath = path.join(ROOT_DIR, 'pages', 'login.html');
    sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
    return;
  }

  // Login endpoint
  if (pathname === '/api/login' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { email, password } = JSON.parse(body || '{}');
      if (!email || !password) {
        sendJson(res, 400, { error: 'Email et mot de passe requis' });
        return;
      }
      const record = await findAgencyByEmail(email);
      const fields = record ? (record.fields || {}) : {};
      const storedHash = extractValue(fields, ['Portail Mot de passe (hash)'], '');
      const passwordOk = record ? auth.verifyPassword(password, storedHash) : false;
      if (!record || !passwordOk) {
        sendJson(res, 401, { error: 'Identifiants invalides' });
        return;
      }
      const token = auth.signSession({ agencyId: record.id, email });
      setSessionCookie(res, req, token);
      sendJson(res, 200, { ok: true, agencyId: record.id });
    } catch (error) {
      console.warn(`Login error: ${error.message}`);
      sendJson(res, 400, { error: 'Requête invalide' });
    }
    return;
  }

  if (pathname === '/api/logout' && req.method === 'POST') {
    clearSessionCookie(res, req);
    sendJson(res, 200, { ok: true });
    return;
  }

  const clientMatch = pathname.match(/^\/client\/([^/]+)(?:\/(.*))?$/);
  if (clientMatch) {
    const agencyId = clientMatch[1];
    const subpage = clientMatch[2] || '';
    const isApiSubrequest = pathname.startsWith(`/client/${agencyId}/api/`);
    const session = getSession(req);
    const authorized = session && session.agencyId === agencyId;

    if (!authorized) {
      if (isApiSubrequest) {
        sendJson(res, 401, { error: 'Non authentifié' });
      } else {
        res.writeHead(302, { Location: '/login' });
        res.end();
      }
      return;
    }

    if (isApiSubrequest) {
      const apiPath = pathname.replace(`/client/${agencyId}/api/`, '');
      const payload = await buildLiveData(agencyId);
      if (!payload) {
        sendJson(res, 404, { error: 'Agence introuvable' });
        return;
      }
      if (['devis', 'factures', 'contrat', 'vapi-stats', 'overview'].includes(apiPath)) {
        sendJson(res, 200, payload);
        return;
      }
    }

    const pageFiles = {
      '': 'client-home.html',
      devis: 'client-devis.html',
      factures: 'client-factures.html',
      contrat: 'client-contrat.html',
      projet: 'client-projet.html',
      compte: 'client-compte.html',
      vapi: 'client-vapi.html',
      ressources: 'client-ressources.html'
    };
    if (Object.prototype.hasOwnProperty.call(pageFiles, subpage)) {
      const filePath = path.join(ROOT_DIR, 'pages', pageFiles[subpage]);
      sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
      return;
    }
  }

  const apiMatch = pathname.match(/^\/api\/client\/([^/]+)\/(.+)$/);
  if (apiMatch) {
    const agencyId = apiMatch[1];
    const endpoint = apiMatch[2];
    const session = getSession(req);
    if (!session || session.agencyId !== agencyId) {
      sendJson(res, 401, { error: 'Non authentifié' });
      return;
    }
    let payload = await buildLiveData(agencyId);
    if (!payload) {
      payload = buildMockData(agencyId);
    }
    if (['devis', 'factures', 'contrat', 'vapi-stats', 'overview', 'compte'].includes(endpoint)) {
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
}

async function safeHandleRequest(req, res) {
  try {
    await handleRequest(req, res);
  } catch (error) {
    console.error(`Unhandled error: ${error.stack || error.message}`);
    if (!res.headersSent) {
      sendJson(res, 500, { error: 'Erreur serveur' });
    } else {
      res.end();
    }
  }
}

module.exports = { handleRequest: safeHandleRequest };
