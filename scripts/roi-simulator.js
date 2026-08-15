// Simulateur ROI (R1/R2) - outil commercial interne, utilisé en direct pendant les
// rendez-vous R1/R2 de Christel. Aucune dépendance a Airtable/Voice OS/Retell/n8n :
// tout est manuel en V1 (voir CLAUDE.md, section "Simulateur ROI"). Le moteur de calcul
// reprend tel quel la logique du calculateur ROI existant (support-presentation/Cahier
// des Charges Client), reorganisee en 2 etapes R1 (diagnostic neutre) / R2 (business
// case Bluewaive) au lieu d'un seul ecran.
//
// Architecture future (non implementee en V1) : getManualInputs() ci-dessous est le
// point d'entree unique qui lit les valeurs saisies a la main. Le jour ou certaines de
// ces valeurs pourront etre alimentees automatiquement (appels recus, appels qualifies,
// rendez-vous, opportunites, conversions - typiquement depuis Voice OS/Retell), il
// suffira de faire pointer cette fonction vers ces sources la ou elles existent, sans
// toucher au reste du moteur (computeR1/computeR2/render restent inchanges).

(function () {
  'use strict';

  const DEFAULTS_R1 = {
    appels: 80,
    appelsManques: 16, // 20 % de 80 - meme scenario par defaut qu'avant, exprime en volume
    tauxOpportunite: 30,
    tauxConv: 15,
    valeurTransaction: 7500
  };

  const DEFAULTS_R2 = {
    tauxRecuperation: 40,
    coutMensuel: '' // vide par defaut - jamais de tarif Bluewaive presuppose
  };

  let currentMode = 'r1';

  // ---- Utilitaires ----

  function clamp(value, min, max) {
    if (!Number.isFinite(value)) return min;
    return Math.min(max, Math.max(min, value));
  }

  // Parse une valeur de champ en nombre fini >= 0, jamais NaN/Infinity - toute entree
  // invalide ou vide retombe silencieusement sur 0 (voir contraintes section 9).
  function toSafeNumber(rawValue, min = 0, max = Infinity) {
    const parsed = Number(rawValue);
    if (!Number.isFinite(parsed)) return min;
    return clamp(parsed, min, max);
  }

  function formatEUR(n) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('fr-FR', { maximumFractionDigits: 0 }) + ' €';
  }

  function formatNumber(n, decimals) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // ROI affiche sous forme commerciale simple : "x4,2". Jamais calcule si coutMensuel
  // est vide/nul - voir computeR2.
  function formatROI(n) {
    return 'x' + formatNumber(n, 1);
  }

  function el(id) {
    return document.getElementById(id);
  }

  // ---- Appels manqués : champ hybride volume <-> pourcentage ----
  // "appelsManques" (nombre, champ principal) et "tauxManque" (slider, pourcentage) se
  // synchronisent en permanence autour d'un seul invariant : pourcentage = manques /
  // entrants x 100. Une seule des trois fonctions ci-dessous s'execute par evenement,
  // selon le champ que l'utilisateur vient de modifier (voir bindings dans le HTML).

  function getAppelsEntrantsValue() {
    return toSafeNumber(el('appels').value, 0, 300);
  }

  function updateDerivedPercentLabel(percent) {
    const safePercent = clamp(percent, 0, 100);
    const decimals = Math.abs(safePercent - Math.round(safePercent)) < 0.05 ? 0 : 1;
    el('v-tauxManquePercent').textContent = 'Soit ' + formatNumber(safePercent, decimals) + ' % des appels entrants';
  }

  // L'utilisateur modifie "Appels entrants / mois" : l'invariant "appels_manques ne
  // peut jamais depasser appels_entrants" doit rester vrai, quitte a plafonner le volume
  // deja saisi puis recalculer le pourcentage affiche/le slider (regle metier explicite).
  function reconcileFromEntrants() {
    const entrants = getAppelsEntrantsValue();
    const manques = clamp(toSafeNumber(el('appelsManques').value, 0), 0, entrants);
    el('appelsManques').value = manques;
    const percent = entrants > 0 ? (manques / entrants) * 100 : 0;
    el('tauxManque').value = Math.round(clamp(percent, 0, 100));
    updateDerivedPercentLabel(percent);
  }

  // L'utilisateur saisit directement le volume d'appels manques : pourcentage = manques
  // / entrants x 100 (formule 1), avec plafonnage au nombre d'appels entrants.
  function reconcileFromVolume() {
    const entrants = getAppelsEntrantsValue();
    const manques = clamp(toSafeNumber(el('appelsManques').value, 0), 0, entrants);
    el('appelsManques').value = manques;
    const percent = entrants > 0 ? (manques / entrants) * 100 : 0;
    el('tauxManque').value = Math.round(clamp(percent, 0, 100));
    updateDerivedPercentLabel(percent);
  }

  // L'utilisateur bouge le slider (pourcentage) : appels_manques = arrondi(pourcentage
  // / 100 x entrants) (formule 2). Le slider est deja borne 0-100 cote HTML.
  function reconcileFromPercentSlider() {
    const entrants = getAppelsEntrantsValue();
    const percent = toSafeNumber(el('tauxManque').value, 0, 100);
    const manques = Math.round((percent / 100) * entrants);
    el('appelsManques').value = manques;
    updateDerivedPercentLabel(percent);
  }

  // ---- Lecture des entrees (point d'entree unique, voir commentaire d'architecture) ----

  function getManualInputs() {
    const appels = toSafeNumber(el('appels').value, 0, 300);
    return {
      appels,
      // Deja reconcilie/plafonne par reconcileFrom*() avant chaque calc() - reclampe ici
      // par securite (aucune hypothese sur l'ordre d'appel externe).
      appelsManques: clamp(toSafeNumber(el('appelsManques').value, 0), 0, appels),
      tauxOpportunite: toSafeNumber(el('tauxOpportunite').value, 0, 100),
      tauxConv: toSafeNumber(el('tauxConv').value, 0, 100),
      valeurTransaction: toSafeNumber(el('valeurTransaction').value, 0),
      // Le taux de recuperation ne doit jamais atteindre 100 % (mode par defaut
      // volontairement prudent) - le slider est deja borne a 95 cote HTML, on
      // reclampe ici par securite si jamais la borne HTML est contournee.
      tauxRecuperation: toSafeNumber(el('tauxRecuperation').value, 0, 95),
      coutMensuelRaw: el('coutMensuel').value
    };
  }

  // ---- Moteur de calcul (repris du calculateur ROI existant) ----

  function computeR1(inputs) {
    // Le volume d'appels manques est desormais saisi directement (champ hybride) plutot
    // que derive d'un pourcentage - deja plafonne a inputs.appels dans getManualInputs().
    const appelsPerdus = inputs.appelsManques;
    const opportunites = appelsPerdus * (inputs.tauxOpportunite / 100);
    const transactions = opportunites * (inputs.tauxConv / 100);
    const valeurMensuelle = transactions * inputs.valeurTransaction;
    const valeurAnnuelle = valeurMensuelle * 12;
    return { appelsPerdus, opportunites, transactions, valeurMensuelle, valeurAnnuelle };
  }

  function computeR2(r1, inputs) {
    const coutMensuel = inputs.coutMensuelRaw === '' ? 0 : toSafeNumber(inputs.coutMensuelRaw, 0);
    const hasCost = coutMensuel > 0;

    const opportunitesRecuperables = r1.opportunites * (inputs.tauxRecuperation / 100);
    const valeurRecuperable = r1.valeurMensuelle * (inputs.tauxRecuperation / 100);

    if (!hasCost) {
      return { hasCost: false, opportunitesRecuperables, valeurRecuperable };
    }

    const gainNet = valeurRecuperable - coutMensuel;
    const gainAnnuel = gainNet * 12;
    // ROI indicatif : jamais calcule avec un cout a 0 (deja garanti par hasCost).
    const roi = gainNet / coutMensuel;
    const roiPercent = roi * 100;

    return {
      hasCost: true,
      opportunitesRecuperables,
      valeurRecuperable,
      gainNet,
      gainAnnuel,
      roi,
      roiPercent
    };
  }

  // ---- Rendu ----

  function renderInputsLabels(inputs) {
    el('v-appels').textContent = formatNumber(inputs.appels, 0);
    el('v-tauxOpportunite').textContent = formatNumber(inputs.tauxOpportunite, 0) + ' %';
    el('v-tauxConv').textContent = formatNumber(inputs.tauxConv, 0) + ' %';
    el('v-tauxRecuperation').textContent = formatNumber(inputs.tauxRecuperation, 0) + ' %';
  }

  function renderR1(r1) {
    el('r1-appelsPerdus').textContent = formatNumber(r1.appelsPerdus, r1.appelsPerdus % 1 === 0 ? 0 : 1);
    el('r1-opportunites').textContent = formatNumber(r1.opportunites, 1);
    el('r1-transactions').textContent = formatNumber(r1.transactions, 2);
    el('r1-valeurMensuelle').textContent = formatEUR(r1.valeurMensuelle);
    el('r1-valeurAnnuelle').textContent = formatEUR(r1.valeurAnnuelle) + ' / an';

    const hero = el('hero-r1');
    hero.classList.remove('positive', 'negative');
    if (r1.valeurMensuelle > 0) hero.classList.add('negative'); // valeur "perdue" -> code couleur alerte

    el('recap-valeur').textContent = formatEUR(r1.valeurMensuelle) + ' / mois';
  }

  function renderR2(r2) {
    const emptyBlock = el('r2-empty');
    const resultsBlock = el('r2-results');

    if (!r2.hasCost) {
      emptyBlock.hidden = false;
      resultsBlock.hidden = true;
      return;
    }

    emptyBlock.hidden = true;
    resultsBlock.hidden = false;

    el('r2-opportunitesRecuperables').textContent = formatNumber(r2.opportunitesRecuperables, 1);
    el('r2-valeurRecuperable').textContent = formatEUR(r2.valeurRecuperable);
    el('r2-gainNet').textContent = (r2.gainNet >= 0 ? '+ ' : '- ') + formatEUR(Math.abs(r2.gainNet));
    el('r2-gainAnnuel').textContent = (r2.gainAnnuel >= 0 ? '+ ' : '- ') + formatEUR(Math.abs(r2.gainAnnuel));
    el('r2-roi').textContent = formatROI(r2.roi);
    // Formulation prudente : jamais presente comme garantie (voir consigne produit).
    el('r2-roiPercent').textContent = 'Chaque euro investi pourrait générer environ ' + formatNumber(r2.roi, 1) + ' € de valeur nette estimée selon les hypothèses saisies.';

    const hero = el('hero-r2');
    hero.classList.remove('positive', 'negative');
    hero.classList.add(r2.gainNet >= 0 ? 'positive' : 'negative');
  }

  function calc() {
    const inputs = getManualInputs();
    renderInputsLabels(inputs);

    const r1 = computeR1(inputs);
    renderR1(r1);

    const r2 = computeR2(r1, inputs);
    renderR2(r2);

    syncChipState(inputs.valeurTransaction, '[data-preset-valeur]', 'data-preset-valeur');
    syncChipState(inputs.tauxRecuperation, '[data-preset-recup]', 'data-preset-recup');
  }

  function syncChipState(currentValue, selector, attr) {
    document.querySelectorAll(selector).forEach((chip) => {
      const chipValue = Number(chip.getAttribute(attr));
      chip.classList.toggle('active', chipValue === currentValue);
    });
  }

  // ---- Actions utilisateur ----

  function applyValeurPreset(value) {
    el('valeurTransaction').value = value;
    calc();
  }

  function applyRecupPreset(value) {
    el('tauxRecuperation').value = value;
    calc();
  }

  function onEntrantsChange() {
    reconcileFromEntrants();
    calc();
  }

  function onAppelsManquesChange() {
    reconcileFromVolume();
    calc();
  }

  function onTauxManqueSliderChange() {
    reconcileFromPercentSlider();
    calc();
  }

  function setMode(mode) {
    currentMode = mode === 'r2' ? 'r2' : 'r1';
    el('tab-r1').classList.toggle('active', currentMode === 'r1');
    el('tab-r2').classList.toggle('active', currentMode === 'r2');
    el('panel-r1').hidden = currentMode !== 'r1';
    el('panel-r2').hidden = currentMode !== 'r2';
    el('panel-r2-inputs').hidden = currentMode !== 'r2';
    calc();
  }

  function reset() {
    el('appels').value = DEFAULTS_R1.appels;
    el('appelsManques').value = DEFAULTS_R1.appelsManques;
    el('tauxOpportunite').value = DEFAULTS_R1.tauxOpportunite;
    el('tauxConv').value = DEFAULTS_R1.tauxConv;
    el('valeurTransaction').value = DEFAULTS_R1.valeurTransaction;
    el('tauxRecuperation').value = DEFAULTS_R2.tauxRecuperation;
    el('coutMensuel').value = DEFAULTS_R2.coutMensuel;
    reconcileFromVolume(); // recalcule le slider/pourcentage derive a partir du volume par defaut
    calc();
  }

  window.ROI = {
    calc,
    setMode,
    applyValeurPreset,
    applyRecupPreset,
    onEntrantsChange,
    onAppelsManquesChange,
    onTauxManqueSliderChange,
    reset
  };

  document.addEventListener('DOMContentLoaded', () => {
    reconcileFromVolume(); // initialise le pourcentage derive au chargement
    calc();
  });
})();
