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
const AIRTABLE_TABLE_CAHIER_DES_CHARGES = process.env.AIRTABLE_TABLE_CAHIER_DES_CHARGES || 'Cahier-des-charges';
const AIRTABLE_TABLE_RESSOURCES = process.env.AIRTABLE_TABLE_RESSOURCES || 'Ressources';
const RETELL_API_KEY = process.env.RETELL_API_KEY;
const SESSION_COOKIE_NAME = 'bw_session';

// ---- Web Call Retell (bouton "Parler avec [Agent Vocal]") ----
// L'agent_id Retell n'est JAMAIS accepte depuis le navigateur : toujours resolu cote
// serveur depuis le champ Airtable "Retell Agent ID" de la fiche agence authentifiee
// (session.agencyId). Format reel observe : "agent_" suivi de caracteres alphanumeriques
// (ex. agent_e4c46469d3bf92a96511ff45e6) - validation stricte avant tout appel Retell.
const RETELL_AGENT_ID_PATTERN = /^agent_[A-Za-z0-9]+$/;

// Garde-fou simple V1 (process unique, memoire seulement - reinitialise a chaque
// redemarrage) contre les clics repetes sur le bouton "Parler avec [Agent Vocal]" : une seule
// tentative de creation de Web Call par agence toutes les WEB_CALL_COOLDOWN_MS. Ce n'est
// pas une protection anti-abus a l'echelle (pas de dependance ajoutee pour ca en V1),
// juste un anti spam-clic cote serveur.
const WEB_CALL_COOLDOWN_MS = 5000;
const webCallLastAttemptByAgency = new Map();

// ---- Compte : upload logo agence / photo contact referent (page "Votre compte") ----
// Correspondance exacte et fermee target -> nom de champ Airtable, jamais fournie par le
// navigateur : seule la cle `target` (logo|contact-photo) transite depuis le frontend,
// jamais un nom de champ Airtable brut - evite toute ecriture vers un champ arbitraire.
const ACCOUNT_MEDIA_FIELDS = {
  logo: 'Logo Agence',
  'contact-photo': 'Photo Contact Référent'
};
const ACCOUNT_MEDIA_ALLOWED_TYPES = new Set(['image/jpeg', 'image/jpg', 'image/png', 'image/webp']);
const ACCOUNT_MEDIA_MAX_BYTES = 5 * 1024 * 1024; // 5 Mo, fichier decode
// Marge appliquee a la taille du corps de requete brute (JSON + base64, ~33% de
// surcout par rapport au fichier decode) avant de couper la connexion.
const ACCOUNT_MEDIA_MAX_BODY_BYTES = Math.ceil(ACCOUNT_MEDIA_MAX_BYTES * 1.4) + 4096;

function isWebCallRateLimited(agencyId) {
  const now = Date.now();
  const last = webCallLastAttemptByAgency.get(agencyId);
  if (last && now - last < WEB_CALL_COOLDOWN_MS) return true;
  webCallLastAttemptByAgency.set(agencyId, now);
  return false;
}

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

// ---- Cache-busting des assets frontend (CSS/JS) ----
// Un mobile reel a garde un ancien styles.css/scripts/client-portal.js en cache meme
// avec Cache-Control: no-cache (le fichier avait deja ete mis en cache AVANT l'ajout de
// cet en-tete - un en-tete seul ne force pas la re-validation d'une entree deja en cache).
// Solution simple et fiable en dev comme en prod, sans build step ni manifeste a
// maintenir a la main : un numero de version calcule UNE FOIS au demarrage du process a
// partir de la date de derniere modification des fichiers CSS/JS concernes, ajoute en
// query string (?v=...) sur leurs references dans le HTML servi. Un fichier modifie ->
// mtime plus recente -> nouvelle version -> nouvelle URL -> jamais servie depuis un
// cache existant, quel que soit son etat anterieur. Un redemarrage (dev) ou un nouveau
// déploiement (prod, nouveau process) recalcule automatiquement la version.
const ASSET_VERSION = (() => {
  const files = [
    path.join(ROOT_DIR, 'styles.css'),
    path.join(ROOT_DIR, 'scripts', 'client-portal.js'),
    path.join(ROOT_DIR, 'scripts', 'auth.js'),
    path.join(ROOT_DIR, 'scripts', 'donut.js'),
    path.join(ROOT_DIR, 'scripts', 'roi-simulator.js')
  ];
  let latest = 0;
  for (const file of files) {
    try {
      latest = Math.max(latest, fs.statSync(file).mtimeMs);
    } catch (error) {
      // Fichier absent : ignore, la version globale retombe sur les autres fichiers.
    }
  }
  return Math.round(latest) || Date.now();
})();

// Ajoute ?v=<ASSET_VERSION> aux references vers /styles.css et /scripts/*.js dans une
// page HTML deja lue - la seule transformation appliquee au HTML servi, aucun template
// engine. Le routage (resolvePagePath) ignore deja la query string (URL.pathname ne
// la contient jamais), donc aucun changement cote serveur pour resoudre ces fichiers.
function injectAssetVersion(html) {
  return html
    .toString('utf8')
    .replace(/(href="\/styles\.css)(")/g, `$1?v=${ASSET_VERSION}$2`)
    .replace(/(src="\/scripts\/(?:client-portal|auth|donut|roi-simulator)\.js)(")/g, `$1?v=${ASSET_VERSION}$2`);
}

// Sert une page HTML de pages/ avec versionnement des assets + no-cache : le HTML
// lui-meme ne doit jamais rester en cache, sinon il continuerait a pointer vers une
// ancienne version de CSS/JS meme apres une mise a jour.
function sendHtmlPage(res, filePath, statusCode = 200) {
  const html = injectAssetVersion(readStaticFile(filePath));
  sendText(res, statusCode, getMimeType(filePath), html, { 'Cache-Control': 'no-cache' });
}

function sendJson(res, statusCode, payload) {
  // Toutes les reponses JSON de ce portail sont dynamiques et propres a une session
  // (login, donnees client) - jamais a mettre en cache navigateur, sous peine de
  // reafficher les donnees d'un ancien appel/session perimee.
  res.writeHead(statusCode, { 'Content-Type': 'application/json; charset=utf-8', 'Cache-Control': 'no-store' });
  res.end(JSON.stringify(payload));
}

function sendText(res, statusCode, contentType, body, extraHeaders = {}) {
  res.writeHead(statusCode, { 'Content-Type': contentType, ...extraHeaders });
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

// Upload d'un fichier vers un champ attachment Airtable, via l'API de contenu dediee
// (hote distinct : content.airtable.com, jamais api.airtable.com). Contrairement a
// updateAirtableFields (PATCH classique, qui ne sait remplacer un attachment qu'a partir
// d'une URL publique deja existante), cet endpoint accepte directement le contenu du
// fichier encode en base64 - necessaire ici puisque le portail ne dispose d'aucun
// hebergement d'image intermediaire. `fieldName` peut etre le nom du champ (accepte par
// cet endpoint, contrairement au PATCH classique qui exige un ID de champ pour ecrire).
async function uploadAirtableAttachment(recordId, fieldName, base64Content, contentType, filename) {
  if (!AIRTABLE_API_KEY) throw new Error('AIRTABLE_API_KEY is not configured');
  const url = `https://content.airtable.com/v0/${AIRTABLE_BASE_ID}/${encodeURIComponent(recordId)}/${encodeURIComponent(fieldName)}/uploadAttachment`;
  return postJsonToUrl(url, { contentType, file: base64Content, filename }, {
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

const EMPTY_RESSOURCES = {
  guideDemarrage: '',
  tutoriels: '',
  faq: '',
  documentation: '',
  guideAgentVocal: '',
  procedures: '',
  formation: '',
  sopAgentVocal: ''
};

// Page "Ressources" : une seule ligne de la table Airtable "Ressources" par
// agence (liee via le champ "Ressources" sur la fiche Agences, meme pattern
// que normalizeOffer ci-dessus). Chaque colonne est un lien Drive (type url)
// vers un PDF - jamais code en dur. Champ absent ou agence sans ligne liee ->
// EMPTY_RESSOURCES (le frontend affiche "Ressource indisponible" par carte,
// jamais un lien casse).
function normalizeRessources(record) {
  const fields = record.fields || record;
  return {
    guideDemarrage: extractValue(fields, ['Guide de prise en main'], ''),
    tutoriels: extractValue(fields, ['tutoriels'], ''),
    faq: extractValue(fields, ['FAQ'], ''),
    documentation: extractValue(fields, ['Documentation d’utilisation'], ''),
    guideAgentVocal: extractValue(fields, ['Guide agent vocal'], ''),
    procedures: extractValue(fields, ['Procédures simples'], ''),
    formation: extractValue(fields, ['Supports de formation'], ''),
    // Champ Airtable reellement nomme "SOP agent vocal.png" (verifie via schema
    // le 15/08/2026) et non "SOP Agent vocal" comme attendu - ecart signale au
    // demandeur, jamais corrige silencieusement ni renomme cote Airtable. Les
    // deux graphies sont tentees pour rester fonctionnel si le champ est
    // renomme plus tard vers le nom exact demande.
    sopAgentVocal: extractValue(fields, ['SOP agent vocal.png', 'SOP Agent vocal'], '')
  };
}

async function fetchRessources(linkValue) {
  if (!linkValue) return EMPTY_RESSOURCES;
  const ids = Array.isArray(linkValue) ? linkValue : [linkValue];
  const id = getRecordId(ids[0]);
  if (!id) return EMPTY_RESSOURCES;
  try {
    const record = await fetchAirtableRecord(AIRTABLE_TABLE_RESSOURCES, id);
    return normalizeRessources(record);
  } catch (error) {
    console.warn(`Unable to load resources ${id}: ${error.message}`);
    return EMPTY_RESSOURCES;
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

function normalizeCahierDesCharges(record) {
  const fields = record.fields || record;
  return {
    reference: extractValue(fields, ['Référence Cahiers charges', 'reference'], ''),
    statut: extractValue(fields, ['Statut', 'status'], ''),
    dateEmission: normalizeDate(extractValue(fields, ['Date Émission', 'Date Emission', 'dateEmission'], '')),
    dateSignature: normalizeDate(extractValue(fields, ['Date Signature', 'dateSignature'], '')),
    lienCdc: extractValue(fields, ['Lien CDC', 'lienCdc', 'link'], ''),
    notes: extractValue(fields, ['Notes', 'notes'], '')
  };
}

// Cahier des charges (table Airtable dediee "Cahier-des-charges") : contrairement a
// Devis/Factures (lies directement depuis la fiche Agences via un champ de lien), aucun
// champ de lien reciproque n'existe sur Agences vers cette table - le lien n'existe que
// dans l'autre sens (champ "Agences" sur Cahier-des-charges). Meme pattern deja utilise
// pour les Relances Voice OS (voir fetchVoiceOsStats) : volume tres faible, on recupere
// tous les enregistrements et on filtre cote serveur sur l'agence authentifiee.
async function fetchCahierDesCharges(agencyId) {
  const records = await fetchAirtableList(AIRTABLE_BASE_ID, AIRTABLE_API_KEY, AIRTABLE_TABLE_CAHIER_DES_CHARGES, 'TRUE()');
  return records
    .filter((record) => {
      const linked = (record.fields || {})['Agences'];
      return Array.isArray(linked) && linked.map(getRecordId).includes(agencyId);
    })
    .map(normalizeCahierDesCharges);
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
    logoUrl: agency.logoUrl,
    contactPhotoUrl: agency.contactPhotoUrl,
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
    cahierDesCharges: [
      {
        reference: 'CDC-2026-001',
        statut: 'Disponible',
        dateEmission: '2026-06-15',
        dateSignature: '',
        lienCdc: 'https://drive.google.com/file/d/1grUyINtdnljLKWmh_XUkpC4dzaJfy6hm/view',
        notes: "Document de cadrage du projet, remis en debut de mission."
      }
    ],
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
    // Mode démo (Airtable non configuré) : mêmes 7 ressources que la table Airtable
    // réelle, un champ volontairement vide (formation) pour exercer aussi l'état
    // "Ressource indisponible pour le moment" en local sans credentials.
    ressources: {
      guideDemarrage: "/Guide_Demarrage_Bluewaive.html",
      tutoriels: "/Video_Formation_Retell.html",
      faq: "/FAQ_Bluewaive.html",
      documentation: "/Guide_Demarrage_Bluewaive.html",
      guideAgentVocal: "/Video_Formation_Retell.html",
      procedures: "/Guide_Demarrage_Bluewaive.html",
      formation: "",
      sopAgentVocal: "/Video_Formation_Retell.html"
    },
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
      // Mode démo (Airtable non configuré) : pas de pièce jointe réelle à lire, chaîne
      // vide plutôt qu'une image inventée - le frontend affiche l'avatar de repli.
      logoUrl: "",
      contactPhotoUrl: "",
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

// Cree une session Web Call Retell pour l'agent resolu cote serveur (jamais fourni par
// le navigateur). On ne suppose pas le format complet de la reponse Retell : seul
// `access_token` (chaine non vide) est verifie, car c'est le seul champ strictement
// necessaire au SDK Web Call cote frontend pour demarrer l'appel. `call_id` est repris
// s'il est present, uniquement a des fins de tracabilite cote logs serveur (jamais loggue
// avec l'access_token, jamais renvoye avec d'autres champs non valides).
//
// `dynamicVariables` (optionnel) : objet de paires cle/valeur en string, transmis a
// Retell via `retell_llm_dynamic_variables`. Necessaire car le Global Prompt / Welcome
// Node de l'agent Retell utilisent des placeholders `{{agency_name}}` / `{{assistant_name}}`
// (voir 20-integrations-library/RETELL_INTEGRATION.md section 3) : sur un appel telephonique
// entrant ces variables sont fournies par ailleurs, mais un Web Call cree sans elles fait
// prononcer a l'agent le nom technique du placeholder au lieu de la vraie valeur.
async function createRetellWebCall(agentId, dynamicVariables) {
  if (!RETELL_API_KEY) {
    throw new Error('RETELL_API_KEY is not configured');
  }
  const requestBody = { agent_id: agentId };
  if (dynamicVariables && Object.keys(dynamicVariables).length) {
    requestBody.retell_llm_dynamic_variables = dynamicVariables;
  }
  const response = await postJsonToUrl(
    'https://api.retellai.com/v2/create-web-call',
    requestBody,
    { Authorization: `Bearer ${RETELL_API_KEY}`, Accept: 'application/json' }
  );
  const accessToken = response && typeof response.access_token === 'string' ? response.access_token : '';
  if (!accessToken) {
    throw new Error('Retell create-web-call response missing access_token');
  }
  const callId = response && typeof response.call_id === 'string' ? response.call_id : null;
  return { accessToken, callId };
}

function normalizeCaseKey(value) {
  return String(value || '').trim().toLowerCase();
}

// Role du compte portail (admin Bluewaive | client standard), lu depuis le
// champ Airtable "Rôle Portail" (singleSelect "Admin"/"Client") sur la fiche
// Agences authentifiee au moment du login. Toute valeur absente, vide ou
// inattendue retombe sur 'client' - un compte n'est JAMAIS eleve en admin par
// defaut, seule la valeur exacte "Admin" y donne droit.
function normalizePortalRole(fields) {
  const raw = normalizeCaseKey(extractValue(fields, ['Rôle Portail', 'role'], ''));
  return raw === 'admin' ? 'admin' : 'client';
}

async function fetchAirtableList(baseId, apiKey, tableName, formula) {
  const url = `https://api.airtable.com/v0/${baseId}/${encodeURIComponent(tableName)}?filterByFormula=${encodeURIComponent(formula)}&pageSize=100`;
  const response = await getJsonFromUrl(url, { Authorization: `Bearer ${apiKey}`, Accept: 'application/json' });
  return response.records || [];
}

// Widget WebCall admin (OPTION A/C, voir CLAUDE.md) : le compte Bluewaive n'a jamais
// son propre agent Retell - l'admin choisit explicitement quelle agence CLIENTE deja
// configuree tester. Cette liste alimente uniquement le selecteur "Agence à tester" :
// jamais l'agent_id dans la reponse (uniquement l'identifiant d'agence, meme nature que
// l'`agencyId` deja public partout ailleurs dans l'app, et un libelle d'affichage).
// Volume tres faible (quelques agences) - meme pattern "fetch tout, filtre cote serveur"
// deja utilise pour Cahier-des-charges/Relances Voice OS, pas de nouvelle requete formule.
// La fiche admin elle-meme (Rôle Portail = Admin) est toujours exclue, meme si elle
// venait un jour a avoir un Retell Agent ID par erreur.
async function fetchAdminTestableAgencies() {
  if (!AIRTABLE_API_KEY) return [];
  const records = await fetchAirtableList(AIRTABLE_BASE_ID, AIRTABLE_API_KEY, AIRTABLE_TABLE_AGENCES, 'TRUE()');
  return records
    .map((record) => ({ id: record.id, fields: record.fields || {} }))
    .filter((entry) => {
      const retellAgentId = extractValue(entry.fields, ['Retell Agent ID', 'retellAgentId'], '');
      return RETELL_AGENT_ID_PATTERN.test(retellAgentId) && normalizePortalRole(entry.fields) !== 'admin';
    })
    .map((entry) => {
      const nomAgence = extractValue(entry.fields, ['Nom Agence', 'NomAgence', 'name'], '');
      const agentVocal = extractValue(entry.fields, ['Agent Vocal', 'agentVocal'], '');
      return {
        agencyId: entry.id,
        agentVocal,
        label: agentVocal ? `${nomAgence} - ${agentVocal}` : nomAgence
      };
    });
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
      // Nom public/vocal (champ Airtable optionnel "Nom Public Agence") : ce que l'agent
      // vocal prononce et ce qui est affiche cote client, potentiellement different du nom
      // CRM interne ci-dessus (qui peut contenir une mention technique, ex. "— DEMO").
      // Absent -> retombe sur le nom CRM interne, jamais de valeur codee en dur.
      nomAgencePublic: extractValue(fields, ['Nom Public Agence', 'nomPublicAgence'], '')
        || extractValue(fields, ['Nom Agence', 'NomAgence', 'name'], ''),
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
      // Photo du contact référent (champ Airtable multipleAttachments existant, page
      // "Votre compte" uniquement). Même comportement que Logo Agence ci-dessus : aucun
      // asset codé en dur, absent ou vide -> chaîne vide, le frontend affiche un avatar
      // de repli avec l'initiale du contact.
      contactPhotoUrl: extractAttachmentUrl(extractValue(fields, ['Photo Contact Référent', 'photoContactReferent'], [])),
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
    const cahierDesCharges = await fetchCahierDesCharges(agency.id);
    // Page "Ressources" : lien direct depuis la fiche Agences (champ "Ressources",
    // meme pattern que "Offre Souscrite" ci-dessus) - jamais depuis un recordId
    // fourni par le navigateur.
    const ressources = await fetchRessources(extractValue(fields, ['Ressources', 'ressources'], null));
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
      cahierDesCharges,
      ressources,
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
  if (normalized === 'scripts/roi-simulator.js') return path.join(ROOT_DIR, 'scripts', 'roi-simulator.js');
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
    'client-documents.html': path.join(ROOT_DIR, 'pages', 'client-documents.html'),
    'client-devis.html': path.join(ROOT_DIR, 'pages', 'client-devis.html'),
    'client-factures.html': path.join(ROOT_DIR, 'pages', 'client-factures.html'),
    'client-contrat.html': path.join(ROOT_DIR, 'pages', 'client-contrat.html'),
    'client-cahier-des-charges.html': path.join(ROOT_DIR, 'pages', 'client-cahier-des-charges.html'),
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

// Variante bornee de readRequestBody, utilisee uniquement pour l'upload logo/photo
// (page "Votre compte") : le corps contient une image encodee en base64, potentiellement
// volumineuse. Des que la taille brute recue depasse maxBytes, on arrete d'accumuler en
// memoire et on resout immediatement avec null (jamais une erreur), pour laisser
// l'appelant repondre 413 tout de suite. Important : on NE detruit PAS la requete
// (req.destroy() couperait le socket partage avec la reponse et empecherait le 413
// d'etre envoye, cote client la connexion serait juste reinitialisee) - le reste du
// corps continue d'etre draine et ignore en arriere-plan, sans etre stocke.
function readRequestBodyWithLimit(req, maxBytes) {
  return new Promise((resolve, reject) => {
    let body = '';
    let receivedBytes = 0;
    let exceeded = false;
    req.on('data', (chunk) => {
      if (exceeded) return;
      receivedBytes += chunk.length;
      if (receivedBytes > maxBytes) {
        exceeded = true;
        resolve(null);
        return;
      }
      body += chunk;
    });
    req.on('end', () => {
      if (!exceeded) resolve(body);
    });
    req.on('error', (error) => {
      if (!exceeded) reject(error);
    });
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
    sendHtmlPage(res, filePath);
    return;
  }

  // Mot de passe oublie - page de demande
  if (pathname === '/forgot-password') {
    const filePath = path.join(ROOT_DIR, 'pages', 'forgot-password.html');
    sendHtmlPage(res, filePath);
    return;
  }

  // Mot de passe oublie - page de saisie du nouveau mot de passe (avec ?token=...)
  if (pathname === '/reset-password') {
    const filePath = path.join(ROOT_DIR, 'pages', 'reset-password.html');
    sendHtmlPage(res, filePath);
    return;
  }

  // Simulateur ROI (R1/R2) - outil commercial interne pour les rendez-vous Christel.
  // Volontairement hors du portail client : pas de session requise, jamais linke
  // depuis la navigation/le menu client (voir CLAUDE.md).
  if (pathname === '/roi-simulator') {
    const filePath = path.join(ROOT_DIR, 'pages', 'roi-simulator.html');
    sendHtmlPage(res, filePath);
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
      const role = normalizePortalRole(fields);
      const token = auth.signSession({ agencyId: record.id, email, role });
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

    // Modifier le logo agence / la photo du contact référent (page "Votre compte").
    // Isolation : opere strictement sur `agencyId`, deja verifie ci-dessus
    // (session.agencyId === agencyId) - un compte ne peut jamais modifier la fiche
    // Airtable d'une autre agence. `target` (logo|contact-photo) est la seule valeur
    // fournie par le navigateur pour choisir le champ - jamais un nom de champ Airtable
    // brut (voir ACCOUNT_MEDIA_FIELDS, mapping ferme cote serveur).
    if (isApiSubrequest && req.method === 'POST' && pathname === `/client/${agencyId}/api/account-media`) {
      try {
        const body = await readRequestBodyWithLimit(req, ACCOUNT_MEDIA_MAX_BODY_BYTES);
        if (body === null) {
          sendJson(res, 413, { error: 'Fichier trop volumineux (5 Mo maximum).' });
          return;
        }
        const { target, contentType, filename, dataBase64 } = JSON.parse(body || '{}');
        const fieldName = ACCOUNT_MEDIA_FIELDS[target];
        if (!fieldName) {
          sendJson(res, 400, { error: 'Cible de modification invalide.' });
          return;
        }
        if (!contentType || !ACCOUNT_MEDIA_ALLOWED_TYPES.has(String(contentType).toLowerCase())) {
          sendJson(res, 400, { error: 'Format non accepté. Utilisez un fichier JPG, PNG ou WebP.' });
          return;
        }
        if (!dataBase64 || typeof dataBase64 !== 'string') {
          sendJson(res, 400, { error: 'Fichier manquant.' });
          return;
        }
        // Estimation de la taille decodee a partir de la longueur base64 (approximation
        // suffisante pour rejeter tot un fichier trop gros, sans decoder inutilement un
        // gros payload deja invalide).
        const approxDecodedBytes = Math.floor((dataBase64.length * 3) / 4);
        if (approxDecodedBytes > ACCOUNT_MEDIA_MAX_BYTES) {
          sendJson(res, 413, { error: 'Fichier trop volumineux (5 Mo maximum).' });
          return;
        }
        const safeFilename = String(filename || 'upload').replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 100) || 'upload';

        const existingRecord = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, agencyId);
        if (!existingRecord) {
          sendJson(res, 404, { error: 'Agence introuvable.' });
          return;
        }
        const existingFields = existingRecord.fields || {};
        const existingAttachments = Array.isArray(existingFields[fieldName]) ? existingFields[fieldName] : [];
        const existingIds = new Set(existingAttachments.map((attachment) => attachment && attachment.id));

        const uploadResponse = await uploadAirtableAttachment(agencyId, fieldName, dataBase64, contentType, safeFilename);
        // Particularite de l'API de contenu Airtable : la reponse renvoie `fields` avec
        // le champ modifie indexe par son ID technique (ex. "fldXXXXXXXXXXXXXX"), jamais
        // par le nom de champ envoye dans l'URL - meme quand l'URL accepte ce nom. Comme
        // un seul champ est jamais touche par cet appel, on prend la seule valeur presente
        // plutot que de chercher par nom (qui ne correspondrait jamais).
        const responseFieldKeys = Object.keys((uploadResponse && uploadResponse.fields) || {});
        const updatedAttachments = responseFieldKeys.length && Array.isArray(uploadResponse.fields[responseFieldKeys[0]])
          ? uploadResponse.fields[responseFieldKeys[0]]
          : [];
        const newAttachment = updatedAttachments.find((attachment) => attachment && !existingIds.has(attachment.id));

        // L'API de contenu Airtable AJOUTE le nouveau fichier au champ (comportement
        // multi-attachments) : pour un vrai "remplacement" cote client, on repasse par le
        // PATCH classique pour ne garder que le fichier fraichement uploade des qu'un
        // ancien fichier existait.
        if (newAttachment && existingAttachments.length) {
          await updateAirtableFields(AIRTABLE_TABLE_AGENCES, agencyId, { [fieldName]: [{ id: newAttachment.id }] });
        }

        const finalUrl = extractAttachmentUrl(newAttachment ? [newAttachment] : updatedAttachments);
        sendJson(res, 200, { ok: true, url: finalUrl });
      } catch (error) {
        console.warn('Account media upload error'); // jamais error.message : peut contenir des donnees Airtable
        sendJson(res, 502, { error: "Impossible d'enregistrer l'image pour le moment. Merci de réessayer." });
      }
      return;
    }

    // Liste des agences "testables" pour le selecteur admin du widget WebCall
    // (OPTION A/C). Reservee au role admin - jamais de fuite de la liste des
    // agences a un client (403, meme regle que create-web-call ci-dessous).
    if (isApiSubrequest && req.method === 'GET' && pathname === `/client/${agencyId}/api/admin-testable-agencies`) {
      if (session.role !== 'admin') {
        sendJson(res, 403, { error: "Action réservée à l'équipe Bluewaive." });
        return;
      }
      try {
        const agencies = await fetchAdminTestableAgencies();
        sendJson(res, 200, { agencies });
      } catch (error) {
        console.warn(`admin-testable-agencies error: ${error.message}`);
        sendJson(res, 503, { error: 'Impossible de récupérer la liste des agences pour le moment.' });
      }
      return;
    }

    // Creation d'une session Web Call Retell (bouton "Parler avec [Agent Vocal]"). Isolation :
    // opere strictement sur `agencyId`, deja verifie ci-dessus (session.agencyId ===
    // agencyId) - c'est l'agence DE LA SESSION admin, jamais l'agence testee.
    // L'agent_id n'est JAMAIS fourni par le navigateur ni par le corps de la requete -
    // toujours resolu cote serveur depuis le champ Airtable "Retell Agent ID". La cle
    // RETELL_API_KEY reste strictement cote serveur (postJsonToUrl/createRetellWebCall) -
    // jamais transmise au frontend.
    if (isApiSubrequest && req.method === 'POST' && pathname === `/client/${agencyId}/api/create-web-call`) {
      // Reserve aux comptes "Rôle Portail" = Admin (equipe Bluewaive). Le role
      // vient exclusivement du jeton de session deja verifie/signe cote serveur
      // (jamais d'un champ envoye par le navigateur) - un client standard,
      // meme authentifie sur sa propre agence, recoit 403 ici.
      if (session.role !== 'admin') {
        console.warn(`create-web-call: acces refuse (role non-admin) pour l'agence ${agencyId}`);
        sendJson(res, 403, { error: "Action réservée à l'équipe Bluewaive." });
        return;
      }
      try {
        // OPTION A/C : le compte Bluewaive n'a pas son propre agent Retell - l'admin
        // choisit explicitement quelle agence CLIENTE deja configuree tester. Le
        // frontend n'envoie qu'un `targetAgencyId` (identifiant d'agence, meme nature
        // que `agencyId` deja public partout dans l'app - jamais un agent_id, jamais
        // aucune donnee Retell brute). Le serveur revalide tout depuis Airtable :
        // aucune confiance dans une valeur fournie par le navigateur au-dela de ce
        // simple pointeur d'enregistrement.
        const body = await readRequestBody(req);
        let targetAgencyId = '';
        try {
          targetAgencyId = String(JSON.parse(body || '{}').targetAgencyId || '').trim();
        } catch (parseError) {
          targetAgencyId = '';
        }
        if (!targetAgencyId) {
          sendJson(res, 400, { error: 'Veuillez sélectionner une agence à tester.' });
          return;
        }
        if (isWebCallRateLimited(targetAgencyId)) {
          sendJson(res, 429, { error: 'Veuillez patienter quelques secondes avant de relancer un appel test.' });
          return;
        }
        let targetRecord;
        try {
          targetRecord = await fetchAirtableRecord(AIRTABLE_TABLE_AGENCES, targetAgencyId);
        } catch (fetchError) {
          targetRecord = null;
        }
        if (!targetRecord) {
          console.warn(`create-web-call: agence cible introuvable (${targetAgencyId})`);
          sendJson(res, 404, { error: 'Agence introuvable.' });
          return;
        }
        const fields = targetRecord.fields || {};
        const retellAgentId = extractValue(fields, ['Retell Agent ID', 'retellAgentId'], '');
        if (!retellAgentId || !RETELL_AGENT_ID_PATTERN.test(retellAgentId)) {
          // Jamais le nom du champ Airtable ni la valeur lue dans la reponse client -
          // uniquement un message neutre. Le detail utile reste dans le log serveur.
          console.warn(`create-web-call: Retell Agent ID manquant ou invalide pour l'agence cible ${targetAgencyId}`);
          sendJson(res, 409, { error: 'Assistant vocal non configuré pour cette agence. Merci de contacter Bluewaive.' });
          return;
        }
        // Variables dynamiques attendues par le Global Prompt / Welcome Node Retell
        // ({{agency_name}}, {{assistant_name}}) - sans elles, un Web Call fait prononcer
        // a l'agent le nom technique du placeholder. Fallback neutre (jamais le nom de
        // variable) si le champ Airtable correspondant est vide. Construites depuis la
        // fiche CIBLE (`fields`), jamais depuis la fiche admin authentifiee.
        // "Nom Public Agence" (optionnel) est le nom prononce par l'agent vocal - distinct
        // du nom CRM interne "Nom Agence" qui peut contenir une mention technique (ex.
        // "La Plage — DEMO"). Sans ce champ rempli, fallback sur le nom CRM interne : le
        // systeme reste fonctionnel pour toute agence n'ayant pas encore ce champ renseigne.
        const agencyNameForCall = extractValue(fields, ['Nom Public Agence', 'nomPublicAgence'], '')
          || extractValue(fields, ['Nom Agence', 'NomAgence', 'name'], '')
          || 'votre agence';
        const assistantNameForCall = extractValue(fields, ['Agent Vocal', 'agentVocal'], '') || 'votre assistante vocale';
        const dynamicVariables = { agency_name: agencyNameForCall, assistant_name: assistantNameForCall };
        const { accessToken, callId } = await createRetellWebCall(retellAgentId, dynamicVariables);
        console.log(`create-web-call (admin ${agencyId}): session créée pour l'agence testée ${targetAgencyId}${callId ? ` (call_id ${callId})` : ''}`);
        sendJson(res, 200, { accessToken, callId });
      } catch (error) {
        // error.message peut contenir le corps brut renvoye par Retell en cas d'echec
        // (ex. agent_id refuse) - jamais l'access_token, jamais la cle API (jamais echoes
        // par Retell). Log serveur uniquement, jamais transmis au frontend.
        console.warn(`create-web-call error for admin ${agencyId}: ${error.message}`);
        sendJson(res, 502, { error: "Impossible de démarrer l'appel test pour le moment. Merci de réessayer." });
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
      if (['devis', 'factures', 'contrat', 'cahier-des-charges', 'retell-stats', 'overview', 'compte', 'ressources', 'documents'].includes(apiPath)) {
        // `role` vient exclusivement de la session deja verifiee (jamais d'un
        // champ Airtable renvoye tel quel sans passer par normalizePortalRole,
        // jamais d'une valeur fournie par le navigateur) - seul signal que le
        // frontend utilise pour decider de rendre ou non le widget WebCall.
        sendJson(res, 200, { ...payload, role: session.role });
        return;
      }
    }

    const pageFiles = {
      '': 'client-home.html',
      documents: 'client-documents.html',
      devis: 'client-devis.html',
      factures: 'client-factures.html',
      contrat: 'client-contrat.html',
      'cahier-des-charges': 'client-cahier-des-charges.html',
      projet: 'client-projet.html',
      compte: 'client-compte.html',
      retell: 'client-retell.html',
      ressources: 'client-ressources.html',
      prospect: 'client-prospect.html'
    };
    if (Object.prototype.hasOwnProperty.call(pageFiles, subpage)) {
      const filePath = path.join(ROOT_DIR, 'pages', pageFiles[subpage]);
      sendHtmlPage(res, filePath);
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
    if (['devis', 'factures', 'contrat', 'cahier-des-charges', 'retell-stats', 'overview', 'compte', 'ressources', 'documents'].includes(endpoint)) {
      sendJson(res, 200, { ...payload, role: session.role });
      return;
    }
  }

  const resolvedPath = resolvePagePath(pathname);
  if (resolvedPath && fs.existsSync(resolvedPath)) {
    // CSS/JS du portail deja servis perimes sur un vrai mobile (aucun en-tete de cache
    // avant ce correctif) - on force la revalidation systematique pour ces deux types de
    // fichiers, combine au versionnement (?v=...) injecte dans le HTML - voir
    // injectAssetVersion. Les autres assets statiques (images, logos) ne sont pas
    // concernes, leur mise en cache normale reste inchangee.
    const ext = path.extname(resolvedPath);
    const cacheHeaders = (ext === '.css' || ext === '.js') ? { 'Cache-Control': 'no-cache' } : {};
    sendText(res, 200, getMimeType(resolvedPath), readStaticFile(resolvedPath), cacheHeaders);
    return;
  }

  if (clientMatch) {
    const notFoundPath = path.join(ROOT_DIR, 'pages', 'client-not-found.html');
    if (fs.existsSync(notFoundPath)) {
      sendHtmlPage(res, notFoundPath, 404);
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
