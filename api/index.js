const fs = require('fs');
const path = require('path');
const { URL } = require('url');

const AIRTABLE_BASE_ID = process.env.AIRTABLE_BASE_ID || 'appGBLLoeqkREDBh2';
const AIRTABLE_API_KEY = process.env.AIRTABLE_API_KEY;
const ROOT_DIR = path.join(__dirname, '..');

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
      nomAgence: "Bluewaive Immo",
      prenom: "Camille",
      volumeAppels: 42,
      nbAgents: 8,
      auditFait: true,
      configVapiFaite: true,
      formationFaite: false,
      miseEnProduction: false,
      suiviActif: false
    },
    projectSteps: buildProjectSteps(true, true, false, false, false)
  };
}

module.exports = async (req, res) => {
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  const reqUrl = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const pathname = reqUrl.pathname;

  // Root redirect
  if (pathname === '/' || pathname === '/index.html') {
    res.writeHead(302, { 'Location': '/client/rec_demoAgency' });
    res.end();
    return;
  }

  // API routes
  const clientMatch = pathname.match(/^\/client\/([^/]+)\/api\/(.+)$/);
  if (clientMatch) {
    const agencyId = clientMatch[1];
    const endpoint = clientMatch[2];
    const payload = buildMockData(agencyId);
    res.writeHead(200, { 'Content-Type': 'application/json; charset=utf-8' });
    res.end(JSON.stringify(payload));
    return;
  }

  // Static files
  const fileMap = {
    '/styles.css': path.join(ROOT_DIR, 'styles.css'),
    '/scripts/donut.js': path.join(ROOT_DIR, 'scripts', 'donut.js'),
    '/scripts/client-portal.js': path.join(ROOT_DIR, 'scripts', 'client-portal.js'),
    '/client/rec_demoAgency/projet': path.join(ROOT_DIR, 'pages', 'client-projet.html'),
    '/client/rec_demoAgency': path.join(ROOT_DIR, 'pages', 'client-home.html'),
  };

  // Regex match for /client/{id}/{page}
  const clientPageMatch = pathname.match(/^\/client\/([^/]+)(?:\/([^/]+))?$/);
  if (clientPageMatch) {
    const agencyId = clientPageMatch[1];
    const page = clientPageMatch[2] || 'home';
    const pages = {
      'projet': 'client-projet.html',
      'devis': 'client-devis.html',
      'factures': 'client-factures.html',
      'contrat': 'client-contrat.html',
      'vapi': 'client-vapi.html'
    };
    const pageFile = pages[page] || 'client-home.html';
    const filePath = path.join(ROOT_DIR, 'pages', pageFile);

    try {
      const content = fs.readFileSync(filePath);
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
      return;
    } catch (e) {
      // File not found
    }
  }

  // Try static files map
  if (fileMap[pathname]) {
    try {
      const content = fs.readFileSync(fileMap[pathname]);
      const ext = path.extname(fileMap[pathname]).toLowerCase();
      const contentTypes = {
        '.css': 'text/css; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.html': 'text/html; charset=utf-8'
      };
      const contentType = contentTypes[ext] || 'application/octet-stream';
      res.writeHead(200, { 'Content-Type': contentType });
      res.end(content);
      return;
    } catch (e) {
      // File not found
    }
  }

  res.writeHead(404, { 'Content-Type': 'text/plain; charset=utf-8' });
  res.end('Page not found');
};
