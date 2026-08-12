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
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const SESSION_COOKIE_NAME = 'bw_session';

// ---- Bluewaive Voice OS (V1) ----
// Base Airtable distincte du CRM ci-dessus (une base par écosystème Voice OS).
// Lecture serveur uniquement (jamais exposé au navigateur), filtrée par voice_os_agency_id.
const VOICE_OS_AIRTABLE_API_KEY = process.env.VOICE_OS_AIRTABLE_API_KEY;
const VOICE_OS_AIRTABLE_BASE_ID = process.env.VOICE_OS_AIRTABLE_BASE_ID || 'appcktXI17JInN9s1';
const VOICE_OS_AIRTABLE_TABLE_LEADS = process.env.VOICE_OS_AIRTABLE_TABLE_LEADS || 'Leads';
const VOICE_OS_AIRTABLE_TABLE_RELANCES = process.env.VOICE_OS_AIRTABLE_TABLE_RELANCES || 'Relances';

// V1 : mapping minimal entre l'identifiant technique stable côté CRM (voice_os_agency_id,
// sur la fiche Agences) et la valeur actuellement utilisée dans le champ Airtable "Agence"
// (singleSelect) côté base Voice OS. Ce champ existe déjà et est alimenté de façon fiable
// par les workflows PROD (confirmé : 19/19 leads réels portent la valeur "La Plage") - on
// ne le modifie donc pas. Un seul mapping existe pour l'instant (démo interne La Plage).
// À remplacer par un vrai champ technique côté Voice OS le jour où plusieurs agences
// coexisteront dans la même base (voir 12-architecture/ de bluewaive-voice-os).
const VOICE_OS_AGENCE_VALUE_BY_ID = {
  la_plage_demo: 'La Plage'
};

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

// Champ Airtable "multipleAttachments" : tableau d'objets {url, thumbnails, ...} ou
// vide/absent. Prend la miniature "large" si disponible (evite de charger l'image
// pleine resolution pour un affichage compact), sinon l'URL originale. Chaine vide
// si aucun fichier - jamais d'URL inventee.
function extractAttachmentUrl(attachments) {
  if (!Array.isArray(attachments) || attachments.length === 0) return '';
  const first = attachments[0];
  if (!first) return '';
  return (first.thumbnails && first.thumbnails.large && first.thumbnails.large.url) || first.url || '';
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

function postJsonToUrl(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const payload = JSON.stringify(body);
    const request = client.request(url, {
      method: 'POST',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (response) => {
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
    request.write(payload);
    request.end();
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

function patchJsonToUrl(url, body, headers = {}) {
  return new Promise((resolve, reject) => {
    const client = url.startsWith('https') ? https : http;
    const payload = JSON.stringify(body);
    const request = client.request(url, {
      method: 'PATCH',
      headers: { ...headers, 'Content-Type': 'application/json', 'Content-Length': Buffer.byteLength(payload) }
    }, (response) => {
      let raw = '';
      response.on('data', (chunk) => {
        raw += chunk;
      });
      response.on('end', () => {
        if (response.statusCode >= 400) {
          // Ne jamais inclure le corps de la reponse Airtable dans l'erreur : le
          // payload envoye (ex. hash de mot de passe) pourrait s'y retrouver echo.
          reject(new Error(`Airtable PATCH failed with status ${response.statusCode}`));
          return;
        }
        try {
          resolve(raw ? JSON.parse(raw) : {});
        } catch (error) {
          reject(error);
        }
      });
    });
    request.on('error', () => reject(new Error('Airtable PATCH request failed')));
    request.write(payload);
    request.end();
  });
}

// Ecriture Airtable (nouvelle capacite, utilisee uniquement pour le hash de mot de
// passe du portail - jamais pour Retell/Voice OS/n8n). Ne jamais logger `fields`.
async function updateAirtableFields(tableName, recordId, fields) {
  if (!AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY is not configured');
  const url = `https://api.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  return patchJsonToUrl(url, { fields }, {
    Authorization: `Bearer ${AIRTABLE_API_KEY}`,
    Accept: 'application/json'
  });
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

// Page "Votre compte" : construit un objet compte uniquement a partir de champs REELS
// deja presents sur la fiche Agences (aucun nouveau champ Airtable). `agency` est deja
// normalise juste avant l'appel (evite de relire deux fois les memes champs). Si un champ
// n'existe pas dans le schema actuel (ex. Ville/Pays/date de creation de l'agence - aucun
// champ dedie), fallback neutre (chaine vide) plutot que d'inventer une valeur.
function buildCompteInfo(fields, agency) {
  return {
    nomAgence: agency.nomAgence,
    nomContact: extractValue(fields, ['Contact Référent', 'Prénom', 'Prenom', 'prenom'], ''),
    email: agency.email,
    telephone: agency.telephone,
    adresse: agency.adresse,
    codePostal: extractValue(fields, ['Code Postal', 'codePostal'], ''),
    ville: '',
    pays: '',
    siret: extractValue(fields, ['SIRET', 'siret'], ''),
    typeActivite: extractValue(fields, ["Secteur d'activité ", "Secteur d'activité", 'typeActivite'], ''),
    nombreEmployes: agency.nbAgents,
    dateCreation: '',
    abonnement: agency.offreSouscrite.nom,
    dateAbonnement: agency.dateSignature,
    statut: agency.statutCommercial
  };
}

function buildProjectSteps(auditFait, configRetellFaite, formationFaite, miseEnProduction, suiviActif) {
  const checkboxes = [
    { key: 'audit', label: 'Audit', completed: auditFait },
    { key: 'config', label: 'Configuration Retell', completed: configRetellFaite },
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
      // Mode démo (Airtable non configuré) : pas de champ "Agent Vocal" réel à lire,
      // valeur neutre plutôt qu'un prénom inventé - cohérent avec le comportement réel.
      agentVocal: '',
      auditFait: true,
      configRetellFaite: true,
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
    retellStats: {
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
      { title: "Vidéo formation Retell", url: "/Video_Formation_Retell.html", type: "Video" },
      { title: "FAQ Bluewaive", url: "/FAQ_Bluewaive.html", type: "Documentation" }
    ],
    calendar: [
      { title: "Audit technique", date: "2026-06-20", completed: true },
      { title: "Configuration Retell", date: "2026-07-10", completed: true },
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

async function fetchRetellStats(agency) {
  const phoneNumber = agency.retellPhoneNumber || process.env.RETELL_PHONE_NUMBER;
  if (!RETELL_API_KEY || !phoneNumber) {
    return null;
  }

  try {
    const payload = await postJsonToUrl(
      'https://api.retellai.com/v3/list-calls',
      {
        filter_criteria: { to_number: { type: 'string', op: 'eq', value: phoneNumber } },
        limit: 50,
        sort_order: 'descending'
      },
      { Authorization: `Bearer ${RETELL_API_KEY}`, Accept: 'application/json' }
    );
    const calls = Array.isArray(payload.items) ? payload.items : [];
    const averageDurationMinutes = calls.length
      ? (calls.reduce((sum, call) => sum + Number(call.duration_ms || 0), 0) / calls.length / 60000).toFixed(1)
      : 0;

    return {
      callCount: calls.length,
      averageDurationMinutes: Number(averageDurationMinutes),
      status: calls.length ? (calls[0].call_status || 'Actif') : 'Aucun appel',
      lastCalls: calls.slice(0, 3).map((call, index) => ({
        id: call.call_id || `call-${index + 1}`,
        datetime: call.start_timestamp ? new Date(call.start_timestamp).toISOString().slice(0, 16).replace('T', ' ') : '',
        durationMinutes: Number((Number(call.duration_ms || 0) / 60000).toFixed(1)),
        status: call.call_status || 'Terminé'
      }))
    };
  } catch (error) {
    console.warn(`Unable to fetch Retell stats: ${error.message}`);
    return null;
  }
}

function normalizeCaseKey(value) {
  return String(value || '').trim().toLowerCase();
}

async function fetchAirtableList(baseId, apiKey, tableName, formula) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}&pageSize=100`;
  const response = await getJsonFromUrl(url, { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' });
  return response.records || [];
}

// Lecture d'un enregistrement unique dans la base Voice OS (distincte du CRM Immo).
// Utilisee uniquement pour la fiche prospect detaillee - jamais d'ecriture.
async function fetchVoiceOsRecordById(tableName, recordId) {
  if (!VOICE_OS_AIRTABLE_API_KEY) return null;
  const url = `https://api.airtable.com/v0/${VOICE_OS_AIRTABLE_BASE_ID}/${encodeURIComponent(tableName)}/${encodeURIComponent(recordId)}`;
  try {
    return await getJsonFromUrl(url, { Authorization: `Bearer ${VOICE_OS_AIRTABLE_API_KEY}`, Accept: 'application/json' });
  } catch (error) {
    return null;
  }
}

// Fiche prospect detaillee : uniquement des champs reellement presents sur la fiche
// Lead Voice OS (voir schema table Leads), jamais de record_id/ID Airtable expose.
// Telephone/email inclus (deja prevus pour l'usage client via les KPI existants) mais
// jamais places dans une URL ni loggues.
function normalizeProspect(leadRecord, relanceRecords) {
  const fields = leadRecord.fields || {};
  return {
    prenom: extractValue(fields, ['Prénom'], ''),
    nom: extractValue(fields, ['Nom'], ''),
    email: extractValue(fields, ['Email'], ''),
    telephone: extractValue(fields, ['Téléphone'], ''),
    profil: extractValue(fields, ['Profil'], ''),
    typeBien: extractValue(fields, ['Type de bien'], ''),
    communeZone: extractValue(fields, ['Commune ou Zone'], ''),
    codePostal: extractValue(fields, ['Code Postal'], ''),
    departement: extractValue(fields, ['Département'], ''),
    budget: extractValue(fields, ['Budget ou Prix'], ''),
    delai: extractValue(fields, ['Délai'], ''),
    motivation: extractValue(fields, ['Motivation'], ''),
    resume: extractValue(fields, ['Résumé'], ''),
    priorite: extractValue(fields, ['Priorité'], ''),
    statut: extractValue(fields, ['Statut'], ''),
    dateAppel: normalizeDate(extractValue(fields, ["Date de l'appel"], '')),
    momentDeRappel: extractValue(fields, ['Moment de rappel'], ''),
    dateRdv: normalizeDate(extractValue(fields, ['Date du rendez-vous'], '')),
    resumeRdv: extractValue(fields, ['Résumé retour RDV'], ''),
    relances: relanceRecords.map((record) => {
      const relanceFields = record.fields || {};
      return {
        action: extractValue(relanceFields, ['Action'], ''),
        date: extractValue(relanceFields, ['Date de relance lisible'], ''),
        statut: extractValue(relanceFields, ['Statut relance'], ''),
        resume: extractValue(relanceFields, ['Résumé source'], '')
      };
    })
  };
}

// KPI V1 disponibles depuis Airtable Voice OS : leads créés, RDV pris (uniquement si
// "Date du rendez-vous" est renseigné - jamais une simple préférence de rappel), profils
// acheteur/vendeur/location, priorité CHAUD/TIÈDE/FROID, relances créées, dernières activités.
// Volontairement NON calculés ici (non fiables avec les données actuelles, voir CLAUDE.md) :
// nombre d'appels réel, durée moyenne d'appel, taux appel -> RDV, statut agent.
async function fetchVoiceOsStats(voiceOsAgencyId, agencyId) {
  const agenceValue = VOICE_OS_AGENCE_VALUE_BY_ID[voiceOsAgencyId];
  if (!VOICE_OS_AIRTABLE_API_KEY || !agenceValue) return null;

  try {
    const safeAgence = agenceValue.replace(/"/g, '\\"');
    const leadRecords = await fetchAirtableList(
      VOICE_OS_AIRTABLE_BASE_ID,
      VOICE_OS_AIRTABLE_API_KEY,
      VOICE_OS_AIRTABLE_TABLE_LEADS,
      `{Agence} = "${safeAgence}"`
    );

    const leadIds = leadRecords.map((record) => record.id);
    let relanceRecords = [];
    if (leadIds.length) {
      // La table Relances n'a pas de champ Agence direct (seulement "Record Lead ID").
      // Pour éviter toute duplication de données ou nouveau champ Airtable, on récupère
      // les relances et on les rattache côté serveur aux leads déjà identifiés pour cette
      // agence. Volume actuel très faible (V1) : acceptable sans filtre serveur dédié.
      const allRelances = await fetchAirtableList(
        VOICE_OS_AIRTABLE_BASE_ID,
        VOICE_OS_AIRTABLE_API_KEY,
        VOICE_OS_AIRTABLE_TABLE_RELANCES,
        'TRUE()'
      );
      relanceRecords = allRelances.filter((record) => leadIds.includes((record.fields || {})['Record Lead ID']));
    }

    const profils = { acheteur: 0, vendeur: 0, location: 0 };
    const priorites = { chaud: 0, tiede: 0, froid: 0 };
    let rdvCount = 0;
    const activity = [];

    for (const record of leadRecords) {
      const leadFields = record.fields || {};
      const profil = normalizeCaseKey(leadFields['Profil']);
      if (profil.includes('achet')) profils.acheteur += 1;
      else if (profil.includes('vend')) profils.vendeur += 1;
      else if (profil.includes('locat')) profils.location += 1;

      const priorite = normalizeCaseKey(leadFields['Priorité']);
      if (priorite === 'chaud') priorites.chaud += 1;
      else if (priorite === 'tiède' || priorite === 'tiede') priorites.tiede += 1;
      else if (priorite === 'froid') priorites.froid += 1;

      const prenomNom = `${leadFields['Prénom'] || ''} ${leadFields['Nom'] || ''}`.trim();

      if (leadFields["Date de l'appel"]) {
        activity.push({ type: 'lead', label: `Lead créé - ${prenomNom}`, date: leadFields["Date de l'appel"], leadId: record.id });
      }
      // Un RDV n'est compté que si "Date du rendez-vous" (booking Cal.com confirmé) est
      // renseigné - jamais à partir de "Préférence de rappel", qui n'est qu'une intention.
      if (leadFields['Date du rendez-vous']) {
        rdvCount += 1;
        activity.push({ type: 'rdv', label: `RDV réservé - ${prenomNom}`, date: leadFields['Date du rendez-vous'], leadId: record.id });
      }
    }

    for (const record of relanceRecords) {
      const relanceFields = record.fields || {};
      const relanceDate = relanceFields['Date de relance'] ? String(relanceFields['Date de relance']).slice(0, 10) : '';
      activity.push({ type: 'relance', label: `Relance créée - ${relanceFields['Prospect'] || ''}`, date: relanceDate, leadId: relanceFields['Record Lead ID'] || null });
    }

    activity.sort((a, b) => String(b.date).localeCompare(String(a.date)));

    // Les prospects deviennent cliquables dans le portail : chaque entree recente recoit
    // un jeton signe opaque (jamais l'ID Airtable brut) pointant vers sa fiche detaillee.
    // Le jeton n'est genere QUE pour les entrees effectivement affichees (slice(0, 5)).
    const recentActivity = activity.slice(0, 5).map((item) => {
      const { leadId, ...publicItem } = item;
      if (!leadId) return publicItem;
      return { ...publicItem, prospectToken: auth.signProspectToken({ agencyId, leadId }) };
    });

    return {
      connected: true,
      leadsCount: leadRecords.length,
      rdvCount,
      profils,
      priorites,
      relancesCount: relanceRecords.length,
      recentActivity
    };
  } catch (error) {
    console.warn(`Unable to fetch Voice OS stats: ${error.message}`);
    return null;
  }
}

// ---- Mot de passe oublie : envoi du lien de reinitialisation ----
// Aucun fournisseur d'envoi d'email n'est configure dans ce projet a ce jour
// (pas de dependance npm, pas de cle API dediee dans .env.example). Conformement
// a la consigne, on n'invente pas de fournisseur et on ne stocke/logue jamais le
// lien ou le jeton. Point d'integration a brancher plus tard : un appel HTTPS
// direct vers un fournisseur transactionnel (ex. Resend/Postmark), meme pattern
// que postJsonToUrl deja utilise pour Airtable/Retell - pas de nouvelle dependance
// necessaire. En attendant, cette fonction ne fait qu'un log neutre (sans email ni
// jeton) : la demande est bien traitee cote serveur, seul l'envoi reste a brancher.
async function sendPasswordResetEmail() {
  console.log('Reset de mot de passe demande (envoi email non configure - voir CLAUDE.md)');
}

const RESET_PASSWORD_NEUTRAL_MESSAGE = 'Si un compte existe pour cette adresse, vous recevrez les instructions nécessaires.';
const RESET_PASSWORD_INVALID_MESSAGE = 'Ce lien de réinitialisation est invalide ou a expiré. Merci de refaire une demande.';

function isPasswordStrongEnough(password) {
  return typeof password === 'string' && password.length >= 8;
}

async function buildLiveData(agencyId) {
  // Mode démo explicite : Airtable non configuré (ex. dev local sans credentials).
  // C'est le SEUL cas où les données mock remplacent légitimement les données réelles.
  if (!AIRTABLE_API_KEY) {
    return buildMockData(agencyId);
  }
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
      retellPhoneNumber: extractValue(fields, ['Retell Phone Number', 'retellPhoneNumber'], ''),
      // Nom de l'agent vocal (champ Airtable "Agent Vocal", propre à chaque agence).
      // Absent ou vide -> chaîne vide, le frontend affiche un intitulé neutre, jamais
      // un prénom inventé.
      agentVocal: extractValue(fields, ['Agent Vocal', 'agentVocal'], ''),
      // Logo Agence (champ Airtable multipleAttachments existant). Aucun asset codé en
      // dur : absent ou vide -> chaîne vide, le frontend affiche un fallback neutre.
      logoUrl: extractAttachmentUrl(extractValue(fields, ['Logo Agence', 'logoAgence'], [])),
      // Optionnel : tous les clients Bluewaive n'ont pas forcément Voice OS. Absent
      // ou vide -> voiceOsStats reste non connecté, le reste du portail fonctionne normalement.
      voiceOsAgencyId: extractValue(fields, ['voice_os_agency_id'], ''),
      auditFait: Boolean(extractValue(fields, ['Audit fait', 'auditFait'], false)),
      configRetellFaite: Boolean(extractValue(fields, ['Config Retell faite', 'configRetellFaite'], false)),
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
    const compte = buildCompteInfo(fields, agency);
    const retellStats = await fetchRetellStats(agency);
    const voiceOsStats = agency.voiceOsAgencyId ? await fetchVoiceOsStats(agency.voiceOsAgencyId, agency.id) : null;
    const projectSteps = buildProjectSteps(
      agency.auditFait,
      agency.configRetellFaite,
      agency.formationFaite,
      agency.miseEnProduction,
      agency.suiviActif
    );

    return {
      agency,
      devis,
      factures,
      contrat,
      compte,
      projectSteps,
      // Uniquement des données réelles Retell (via RETELL_API_KEY + Retell Phone Number)
      // ou rien. On n'affiche plus de faux "24 appels / 3.6 min / Actif" comme si c'était
      // réel - voir voiceOsStats ci-dessous pour les KPI Voice OS réellement disponibles.
      retellStats: retellStats || null,
      // KPI V1 Bluewaive Voice OS (leads/RDV/relances), lus côté serveur depuis Airtable,
      // filtrés par voice_os_agency_id. null/connected:false si l'agence n'a pas Voice OS
      // ou si la lecture échoue - jamais remplacé par des chiffres inventés.
      voiceOsStats: voiceOsStats || { connected: false }
    };
  } catch (error) {
    // Airtable est configuré mais l'appel a réellement échoué (panne, clé invalide,
    // timeout...). On ne doit JAMAIS masquer ça derrière de fausses données Joyce/Immo -
    // on remonte une erreur contrôlée, gérée par les appelants (réponse 503).
    console.warn(`Airtable/Retell error while building live data for ${agencyId}: ${error.message}`);
    const upstreamError = new Error('Données temporairement indisponibles');
    upstreamError.code = 'UPSTREAM_UNAVAILABLE';
    throw upstreamError;
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
    'client-retell.html': path.join(ROOT_DIR, 'pages', 'client-retell.html'),
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

  // Mot de passe oublie - page de demande
  if (pathname === '/forgot-password') {
    const filePath = path.join(ROOT_DIR, 'pages', 'forgot-password.html');
    sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
    return;
  }

  // Mot de passe oublie - page de saisie du nouveau mot de passe (avec ?token=...)
  if (pathname === '/reset-password') {
    const filePath = path.join(ROOT_DIR, 'pages', 'reset-password.html');
    sendText(res, 200, getMimeType(filePath), readStaticFile(filePath));
    return;
  }

  // Mot de passe oublie - endpoint de demande. Reponse strictement identique que
  // l'email corresponde ou non a un compte (aucune fuite d'existence de compte).
  if (pathname === '/api/forgot-password' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { email } = JSON.parse(body || '{}');
      if (email) {
        const record = await findAgencyByEmail(email);
        if (record) {
          const fields = record.fields || {};
          const currentHash = extractValue(fields, ['Portail Mot de passe (hash)'], '');
          const token = auth.signResetToken({ agencyId: record.id, currentHash });
          await sendPasswordResetEmail(email, token, record.id);
        }
      }
    } catch (error) {
      console.warn('Forgot-password error'); // jamais error.message : pourrait contenir l'email soumis
    }
    sendJson(res, 200, { ok: true, message: RESET_PASSWORD_NEUTRAL_MESSAGE });
    return;
  }

  // Mot de passe oublie - endpoint de confirmation (jeton usage unique, voir lib/auth.js)
  if (pathname === '/api/reset-password' && req.method === 'POST') {
    try {
      const body = await readRequestBody(req);
      const { token, newPassword, confirmPassword } = JSON.parse(body || '{}');
      if (!token || !newPassword || !confirmPassword) {
        sendJson(res, 400, { error: 'Veuillez remplir tous les champs.' });
        return;
      }
      if (newPassword !== confirmPassword) {
        sendJson(res, 400, { error: 'Les nouveaux mots de passe ne correspondent pas.' });
        return;
      }
      if (!isPasswordStrongEnough(newPassword)) {
        sendJson(res, 400, { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
        return;
      }
      const payload = auth.verifyPayload(token);
      if (!payload || payload.purpose !== 'pwreset' || !payload.agencyId) {
        sendJson(res, 400, { error: RESET_PASSWORD_INVALID_MESSAGE });
        return;
      }
      const record = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, payload.agencyId);
      const fields = record ? (record.fields || {}) : {};
      const currentHash = extractValue(fields, ['Portail Mot de passe (hash)'], '');
      if (!record || auth.fingerprintHash(currentHash) !== payload.hfp) {
        sendJson(res, 400, { error: RESET_PASSWORD_INVALID_MESSAGE });
        return;
      }
      const newHash = auth.hashPassword(newPassword);
      await updateAirtableFields(AIRTABLE_TABLE_AGENCES, payload.agencyId, { 'Portail Mot de passe (hash)': newHash });
      sendJson(res, 200, { ok: true, message: 'Votre mot de passe a été mis à jour. Vous pouvez maintenant vous connecter.' });
    } catch (error) {
      console.warn('Reset-password error'); // jamais error.message : peut contenir des donnees Airtable
      sendJson(res, 400, { error: 'Une erreur est survenue. Merci de réessayer.' });
    }
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
      // Accès portail : champ dédié "Accès App Onboarding" (checkbox sur la fiche
      // Agences), distinct du Statut Commercial. Une agence signée n'a pas
      // automatiquement accès au portail - il faut que ce champ soit coché.
      const portalAccessGranted = Boolean(extractValue(fields, ['Accès App Onboarding'], false));
      if (!record || !passwordOk || !portalAccessGranted) {
        // Même réponse que des identifiants invalides : on ne révèle jamais si le
        // compte existe mais n'a pas (encore) accès au portail.
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

    // Changer mon mot de passe (page "Votre compte"). Isolation : opere strictement
    // sur `agencyId`, deja verifie ci-dessus (session.agencyId === agencyId) - un
    // compte ne peut jamais modifier le mot de passe d'un autre.
    if (isApiSubrequest && req.method === 'POST' && pathname === `/client/${agencyId}/api/change-password`) {
      try {
        const body = await readRequestBody(req);
        const { currentPassword, newPassword, confirmPassword } = JSON.parse(body || '{}');
        if (!currentPassword || !newPassword || !confirmPassword) {
          sendJson(res, 400, { error: 'Veuillez remplir tous les champs.' });
          return;
        }
        if (newPassword !== confirmPassword) {
          sendJson(res, 400, { error: 'Les nouveaux mots de passe ne correspondent pas.' });
          return;
        }
        if (!isPasswordStrongEnough(newPassword)) {
          sendJson(res, 400, { error: 'Le nouveau mot de passe doit contenir au moins 8 caractères.' });
          return;
        }
        const record = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, agencyId);
        const fields = record ? (record.fields || {}) : {};
        const currentHash = extractValue(fields, ['Portail Mot de passe (hash)'], '');
        if (!record || !auth.verifyPassword(currentPassword, currentHash)) {
          sendJson(res, 400, { error: 'Le mot de passe actuel est incorrect.' });
          return;
        }
        const newHash = auth.hashPassword(newPassword);
        await updateAirtableFields(AIRTABLE_TABLE_AGENCES, agencyId, { 'Portail Mot de passe (hash)': newHash });
        sendJson(res, 200, { ok: true, message: 'Votre mot de passe a été modifié avec succès.' });
      } catch (error) {
        console.warn('Change-password error'); // jamais error.message : peut contenir des donnees Airtable
        sendJson(res, 400, { error: 'Une erreur est survenue. Merci de réessayer.' });
      }
      return;
    }

    // Fiche prospect detaillee (Assistant vocal). Le token est signe serveur (jamais
    // l'ID Airtable brut), mais on ne lui fait pas confiance aveuglement : on revient
    // toujours a l'agence authentifiee (session.agencyId == agencyId deja verifie), on
    // exige que le token embarque ce meme agencyId, puis on revalide que le lead
    // recupere appartient bien au perimetre Voice OS de cette agence (meme controle que
    // fetchVoiceOsStats) avant de renvoyer quoi que ce soit.
    if (isApiSubrequest && req.method === 'GET' && pathname === `/client/${agencyId}/api/prospect`) {
      try {
        const token = reqUrl.searchParams.get('token');
        const payloadToken = auth.verifyPayload(token);
        if (!payloadToken || payloadToken.purpose !== 'prospect' || payloadToken.agencyId !== agencyId || !payloadToken.leadId) {
          sendJson(res, 404, { error: 'Prospect introuvable ou lien expiré.' });
          return;
        }
        const agencyRecord = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, agencyId);
        const voiceOsAgencyId = agencyRecord ? extractValue(agencyRecord.fields || {}, ['voice_os_agency_id'], '') : '';
        const agenceValue = VOICE_OS_AGENCE_VALUE_BY_ID[voiceOsAgencyId];
        if (!agenceValue || !VOICE_OS_AIRTABLE_API_KEY) {
          sendJson(res, 404, { error: 'Prospect introuvable ou lien expiré.' });
          return;
        }
        const leadRecord = await fetchVoiceOsRecordById(VOICE_OS_AIRTABLE_TABLE_LEADS, payloadToken.leadId);
        const leadAgence = leadRecord ? normalizeCaseKey((leadRecord.fields || {})['Agence']) : '';
        if (!leadRecord || leadAgence !== normalizeCaseKey(agenceValue)) {
          // Le lead n'appartient pas au perimetre Voice OS de l'agence authentifiee.
          sendJson(res, 404, { error: 'Prospect introuvable ou lien expiré.' });
          return;
        }
        const allRelances = await fetchAirtableList(
          VOICE_OS_AIRTABLE_BASE_ID,
          VOICE_OS_AIRTABLE_API_KEY,
          VOICE_OS_AIRTABLE_TABLE_RELANCES,
          'TRUE()'
        );
        const relanceRecords = allRelances.filter((record) => (record.fields || {})['Record Lead ID'] === payloadToken.leadId);
        sendJson(res, 200, { prospect: normalizeProspect(leadRecord, relanceRecords) });
      } catch (error) {
        console.warn('Prospect detail error'); // jamais error.message : peut contenir des donnees Airtable
        sendJson(res, 404, { error: 'Prospect introuvable ou lien expiré.' });
      }
      return;
    }

    if (isApiSubrequest) {
      const apiPath = pathname.replace(`/client/${agencyId}/api/`, '');
      let payload;
      try {
        payload = await buildLiveData(agencyId);
      } catch (error) {
        sendJson(res, 503, { error: 'Données temporairement indisponibles. Merci de réessayer.' });
        return;
      }
      if (!payload) {
        sendJson(res, 404, { error: 'Agence introuvable' });
        return;
      }
      if (['devis', 'factures', 'contrat', 'retell-stats', 'overview', 'compte'].includes(apiPath)) {
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
      retell: 'client-retell.html',
      ressources: 'client-ressources.html',
      prospect: 'client-prospect.html'
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
    let payload;
    try {
      payload = await buildLiveData(agencyId);
    } catch (error) {
      sendJson(res, 503, { error: 'Données temporairement indisponibles. Merci de réessayer.' });
      return;
    }
    if (!payload) {
      payload = buildMockData(agencyId);
    }
    if (['devis', 'factures', 'contrat', 'retell-stats', 'overview', 'compte'].includes(endpoint)) {
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
