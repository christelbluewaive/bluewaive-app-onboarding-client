const crypto = require('crypto');

const SESSION_TTL_SECONDS = 60 * 60 * 24 * 14; // 14 jours
const PASSWORD_CHARSET = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';

function getSessionSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error('SESSION_SECRET is not configured');
  }
  return secret;
}

function generatePassword(length = 12) {
  const bytes = crypto.randomBytes(length);
  let password = '';
  for (let i = 0; i < length; i++) {
    password += PASSWORD_CHARSET[bytes[i] % PASSWORD_CHARSET.length];
  }
  return password;
}

const PBKDF2_ITERATIONS = 10000;

function hashPassword(password) {
  const salt = crypto.randomBytes(16);
  const hash = crypto.pbkdf2Sync(password, salt, PBKDF2_ITERATIONS, 64, 'sha256');
  return `pbkdf2$${PBKDF2_ITERATIONS}$${salt.toString('hex')}$${hash.toString('hex')}`;
}

function verifyPassword(password, stored) {
  if (!password || !stored || typeof stored !== 'string') return false;
  const parts = stored.split('$');
  if (parts.length !== 4 || parts[0] !== 'pbkdf2') return false;
  const [, iterationsStr, saltHex, hashHex] = parts;
  try {
    const iterations = Number(iterationsStr);
    const salt = Buffer.from(saltHex, 'hex');
    const expected = Buffer.from(hashHex, 'hex');
    const actual = crypto.pbkdf2Sync(password, salt, iterations, expected.length, 'sha256');
    return crypto.timingSafeEqual(actual, expected);
  } catch (error) {
    return false;
  }
}

function base64UrlEncode(input) {
  return Buffer.from(input).toString('base64url');
}

function base64UrlDecode(input) {
  return Buffer.from(input, 'base64url').toString('utf8');
}

// ---- Jeton signe generique (HMAC-SHA256 + expiration) ----
// Base commune reutilisee par les sessions ET par les jetons de reinitialisation
// de mot de passe : meme mecanisme deja en place, aucune nouvelle dependance.

function signPayload(payload, ttlSeconds) {
  const secret = getSessionSecret();
  const fullPayload = { ...payload, exp: Date.now() + ttlSeconds * 1000 };
  const payloadEncoded = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = crypto.createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
  return `${payloadEncoded}.${signature}`;
}

function verifyPayload(token) {
  const secret = getSessionSecret();
  if (!token || typeof token !== 'string' || !token.includes('.')) return null;
  const [payloadEncoded, signature] = token.split('.');
  const expectedSignature = crypto.createHmac('sha256', secret).update(payloadEncoded).digest('base64url');
  const sigBuffer = Buffer.from(signature || '');
  const expectedBuffer = Buffer.from(expectedSignature);
  if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
    return null;
  }
  try {
    const payload = JSON.parse(base64UrlDecode(payloadEncoded));
    if (!payload.exp || Date.now() > payload.exp) return null;
    return payload;
  } catch (error) {
    return null;
  }
}

function signSession({ agencyId, email }) {
  return signPayload({ agencyId, email, purpose: 'session' }, SESSION_TTL_SECONDS);
}

function verifySession(token) {
  const payload = verifyPayload(token);
  if (!payload || payload.purpose !== 'session') return null;
  return payload;
}

// ---- Jeton de reinitialisation de mot de passe ----
// Aucune persistance necessaire (pas de nouveau champ/table Airtable) : le jeton
// embarque une empreinte (SHA-256, non reversible) du hash de mot de passe actuel
// au moment de sa creation. Des que le mot de passe change (reset utilise, ou
// change autrement entre-temps), l'empreinte ne correspond plus au hash courant
// -> le jeton est automatiquement invalide. Ca donne l'expiration (exp du jeton
// signe) ET l'usage unique (empreinte perimee des la premiere utilisation) sans
// stocker le jeton nulle part.
const RESET_TOKEN_TTL_SECONDS = 30 * 60; // 30 minutes

function fingerprintHash(storedHash) {
  return crypto.createHash('sha256').update(String(storedHash || '')).digest('hex').slice(0, 16);
}

function signResetToken({ agencyId, currentHash }) {
  return signPayload({
    agencyId,
    hfp: fingerprintHash(currentHash),
    nonce: crypto.randomBytes(16).toString('hex'),
    purpose: 'pwreset'
  }, RESET_TOKEN_TTL_SECONDS);
}

// ---- Jeton de fiche prospect (Assistant vocal -> fiche detaillee) ----
// Meme principe de jeton signe generique : embarque l'agencyId (CRM) et l'id du lead
// Voice OS, jamais expose tel quel au client (le token est opaque, pas un ID Airtable
// lisible). Duree courte : simple lien de navigation interne, pas une session.
const PROSPECT_TOKEN_TTL_SECONDS = 24 * 60 * 60; // 24h

function signProspectToken({ agencyId, leadId }) {
  return signPayload({ agencyId, leadId, purpose: 'prospect' }, PROSPECT_TOKEN_TTL_SECONDS);
}

module.exports = {
  generatePassword,
  hashPassword,
  verifyPassword,
  signSession,
  verifySession,
  verifyPayload,
  signResetToken,
  fingerprintHash,
  signProspectToken
};
