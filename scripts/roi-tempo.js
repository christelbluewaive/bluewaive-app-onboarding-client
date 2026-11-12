// Simulateur Bluewaive Tempo - outil commercial interne, utilisé en direct pendant les
// rendez-vous, pour le pilote distributeurs B2B hygiène/entretien (voir CLAUDE.md racine).
// Perimetre mesure : du compte rendu deja disponible jusqu'a l'envoi de la proposition et
// du devis (recherche, saisie, verification, correction) - jamais la duree du RDV,
// l'attente de reponse ou les relances apres envoi. Meme perimetre compare avant/avec
// Tempo ; si le commercial cree encore le devis dans son ERP, ce temps ERP reste compte
// dans "avec Tempo".
//
// Deux onglets partagent un seul moteur de calcul : "simple" (temps manuel/Tempo saisis
// directement, pour un prospect) et "detail" (5 etapes sommees pour obtenir les memes
// deux totaux, plus le business case financier interne). Voir computeTimeTotals().

(function () {
  'use strict';

  const STEP_IDS = ['step1', 'step2', 'step3', 'step4', 'step5'];
  const SEMAINES_PAR_MOIS = 52 / 12; // convention explicite, affichee a cote des resultats financiers

  // Echelle de couleur de la barre "temps total avant / semaine" : 35 h = une semaine
  // legale de travail française entierement absorbee par la seule redaction de
  // propositions - plafond choisi comme repere de charge "maximale", pas une moyenne.
  // Lecture volontairement simple (hauteur absolue en heures d'equipe), elle ne tient
  // pas compte du nombre de commerciaux qui se repartissent ce temps.
  const HEURES_AVANT_ECHELLE_ROUGE = 35;

  // Interpolation de teinte verte (120°) -> jaune (60°) -> rouge (0°) : une simple
  // interpolation lineaire de 120 a 0 traverse naturellement 60 (jaune) a mi-echelle,
  // sans avoir a definir de paliers explicites.
  function couleurProgression(value, maxValue) {
    const fraction = maxValue > 0 ? Math.max(0, Math.min(1, value / maxValue)) : 0;
    const hue = 120 - 120 * fraction;
    return 'hsl(' + Math.round(hue) + ', 72%, 45%)';
  }

  let currentMode = 'simple';
  let exampleActive = false;

  function el(id) {
    return document.getElementById(id);
  }

  // ---- Lecture defensive des champs ----
  // Un champ vide est une donnee manquante (missing: true), jamais assimile a 0. Une
  // valeur negative saisie est clampee a 0 (defense contre une saisie absurde, jamais une
  // erreur bloquante) - distinct d'un ecart CALCULE qui, lui, peut legitimement etre
  // negatif (Tempo plus lent que le manuel, voir renderTimeResults).
  function readField(id) {
    const raw = el(id).value;
    if (raw === '' || raw === null) return { missing: true, value: 0 };
    const n = Number(raw);
    if (!Number.isFinite(n)) return { missing: true, value: 0 };
    return { missing: false, value: Math.max(0, n) };
  }

  function formatNumber(n, decimals) {
    const safe = Number.isFinite(n) ? n : 0;
    return safe.toLocaleString('fr-FR', { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  }

  // Formate une duree en heures en retirant les decimales inutiles (10 -> "10 h", mais
  // 1.1667 -> "1,17 h") - les cas de verification (1 h, 10 h, 40 h, 5 h) doivent rester
  // des entiers exacts, un arrondi fixe a 1 ou 2 decimales les aurait affiches "1,0 h".
  function formatHeures(n) {
    const safe = Number.isFinite(n) ? n : 0;
    const rounded = Math.round(safe * 100) / 100;
    const decimals = Number.isInteger(rounded) ? 0 : 2;
    return formatNumber(rounded, decimals) + ' h';
  }

  function formatEUR(n) {
    return formatNumber(Number.isFinite(n) ? n : 0, 2) + ' €';
  }

  function formatPercent(n) {
    return formatNumber(Number.isFinite(n) ? n : 0, 1) + ' %';
  }

  // ---- Totaux temps (manuel / Tempo), source commune aux deux onglets ----

  function computeTimeTotals() {
    if (currentMode === 'detail') {
      let manuelTotal = 0;
      let tempoTotal = 0;
      let missing = false;
      STEP_IDS.forEach((prefix) => {
        const manuel = readField(prefix + 'Manuel');
        const tempo = readField(prefix + 'Tempo');
        if (manuel.missing || tempo.missing) missing = true;
        manuelTotal += manuel.value;
        tempoTotal += tempo.value;
      });
      return { missing, tempsManuel: manuelTotal, tempsTempo: tempoTotal };
    }
    const manuel = readField('tempsManuelSimple');
    const tempo = readField('tempsTempoSimple');
    return { missing: manuel.missing || tempo.missing, tempsManuel: manuel.value, tempsTempo: tempo.value };
  }

  // ---- Rendu : diagnostic temps (commun aux deux onglets) ----

  function renderTimeResults() {
    const nbCommerciaux = readField('nbCommerciaux');
    const volumeEquipe = readField('volumeEquipe');
    const totals = computeTimeTotals();

    const incomplete = totals.missing || nbCommerciaux.missing || volumeEquipe.missing;
    el('time-empty').hidden = !incomplete;
    el('time-results').hidden = incomplete;
    if (incomplete) return { incomplete: true };

    const ecartMinutes = totals.tempsManuel - totals.tempsTempo; // peut etre negatif : Tempo plus lent
    const ecartHeures = ecartMinutes / 60;
    const heuresEquipeParSemaine = (ecartMinutes * volumeEquipe.value) / 60;
    const projection4Semaines = heuresEquipeParSemaine * 4;
    const totalAvantSemaine = (totals.tempsManuel * volumeEquipe.value) / 60;
    const totalTempoSemaine = (totals.tempsTempo * volumeEquipe.value) / 60;

    const hero = el('hero-ecart');
    hero.classList.remove('positive', 'negative');
    if (ecartMinutes < 0) {
      hero.classList.add('negative');
      el('label-ecart').textContent = 'Temps supplémentaire par offre (Tempo plus long)';
      el('label-heuresEquipe').textContent = "Temps supplémentaire pour l'équipe / semaine";
      el('label-projection4').textContent = 'Projection sur 4 semaines (temps supplémentaire)';
    } else {
      if (ecartMinutes > 0) hero.classList.add('positive');
      el('label-ecart').textContent = 'Temps récupéré par offre';
      el('label-heuresEquipe').textContent = "Temps récupéré pour l'équipe / semaine";
      el('label-projection4').textContent = 'Projection sur 4 semaines';
    }
    el('v-ecartOffre').textContent = formatHeures(Math.abs(ecartHeures));
    el('v-ecartOffreMin').textContent = formatNumber(Math.abs(ecartMinutes), 0) + ' min';
    el('v-heuresEquipe').textContent = formatHeures(Math.abs(heuresEquipeParSemaine));
    el('v-projection4').textContent = formatHeures(Math.abs(projection4Semaines));
    el('v-totalAvant').textContent = formatHeures(totalAvantSemaine);
    el('v-totalTempo').textContent = formatHeures(totalTempoSemaine);

    // Barres de progression - pure lecture visuelle des nombres deja affiches ci-dessus
    // (aucun nouveau calcul). Le % de gain est le meme a l'offre, a la semaine et sur 4
    // semaines (ecartMinutes/tempsManuel) puisque volume et duree ne sont que des
    // multiplicateurs lineaires - une seule barre suffit a le representer.
    const gainPercent = totals.tempsManuel > 0 ? (ecartMinutes / totals.tempsManuel) * 100 : 0;
    const gainFill = el('bar-gain-fill');
    if (gainPercent < 0) {
      gainFill.classList.remove('success');
      gainFill.classList.add('danger');
      gainFill.style.width = '100%';
      el('bar-gain-label').textContent = 'Temps supplémentaire par offre (Tempo plus long)';
      el('bar-gain-value').textContent = '+' + formatNumber(Math.abs(gainPercent), 0) + ' %';
    } else {
      gainFill.classList.remove('danger');
      gainFill.classList.add('success');
      gainFill.style.width = Math.min(100, gainPercent) + '%';
      el('bar-gain-label').textContent = 'Part du temps gagnée par offre';
      el('bar-gain-value').textContent = formatNumber(gainPercent, 0) + ' %';
    }

    const maxSemaine = Math.max(totalAvantSemaine, totalTempoSemaine, 0.0001);
    const avantFill = el('bar-avant-fill');
    avantFill.style.width = (totalAvantSemaine / maxSemaine) * 100 + '%';
    avantFill.style.background = couleurProgression(totalAvantSemaine, HEURES_AVANT_ECHELLE_ROUGE);
    el('bar-avant-value').textContent = formatHeures(totalAvantSemaine);
    el('bar-tempo-fill').style.width = (totalTempoSemaine / maxSemaine) * 100 + '%';
    el('bar-tempo-value').textContent = formatHeures(totalTempoSemaine);

    if (nbCommerciaux.value > 0) {
      el('v-moyenneCommercial').textContent = formatHeures(Math.abs(heuresEquipeParSemaine) / nbCommerciaux.value);
    } else {
      el('v-moyenneCommercial').textContent = '-';
    }

    const origineSelect = el('origineTempo');
    const badge = el('v-origineBadge');
    const mesure = origineSelect.value === 'mesure';
    badge.textContent = mesure ? 'Mesuré en pilote' : 'Hypothèse';
    badge.classList.toggle('mesure', mesure);

    // Valeur monetaire - affichee dans les DEUX onglets (pas seulement le detail), a la
    // demande explicite de l'utilisatrice : un gain de temps seul ne suffit pas, il faut
    // aussi l'economie chiffree. Le cout horaire vit dans "Votre equipe" (partage), avec
    // un defaut de 35 €/h deja renseigne - donc "manquant" seulement si l'utilisatrice
    // vide le champ elle-meme.
    const coutHoraire = readField('coutHoraire');
    syncChipState(coutHoraire.value, '[data-preset-cout]', 'data-preset-cout');
    let valeurMensuelle = null;
    if (!coutHoraire.missing) {
      // heuresEquipeParSemaine peut etre negatif (Tempo plus lent) : la valeur du temps
      // "libere" suit alors le meme signe (une charge supplementaire, pas une economie).
      valeurMensuelle = heuresEquipeParSemaine * SEMAINES_PAR_MOIS * coutHoraire.value;
      el('valeur-empty').hidden = true;
      el('hero-valeur').hidden = false;
      el('hero-valeur').classList.toggle('negative', valeurMensuelle < 0);
      el('v-valeurMensuelleSimple').textContent = (valeurMensuelle >= 0 ? '' : '- ') + formatEUR(Math.abs(valeurMensuelle));
      el('v-valeurAnnuelleSimple').textContent = (valeurMensuelle >= 0 ? '' : '- ') + formatEUR(Math.abs(valeurMensuelle * 12)) + ' / an';
      el('valeur-hint').textContent = 'Sur la base de ' + formatNumber(coutHoraire.value, 0) + ' €/h chargé (modifiable ci-contre).';
    } else {
      el('valeur-empty').hidden = false;
      el('hero-valeur').hidden = true;
    }

    return { incomplete: false, heuresEquipeParSemaine, nbCommerciauxValue: nbCommerciaux.value, valeurMensuelle };
  }

  function syncChipState(currentValue, selector, attr) {
    document.querySelectorAll(selector).forEach((chip) => {
      const chipValue = Number(chip.getAttribute(attr));
      chip.classList.toggle('active', chipValue === currentValue);
    });
  }

  // ---- Rendu : business case financier (onglet detail uniquement) ----

  function renderFinancialResults(timeState) {
    const financialPanel = el('panel-financial-results');
    const isDetail = currentMode === 'detail';
    financialPanel.hidden = !isDetail;
    if (!isDetail) return;

    const coutMensuel = readField('coutMensuel');
    const fraisMiseEnPlace = readField('fraisMiseEnPlace');

    const canValeurMensuelle = !timeState.incomplete && timeState.valeurMensuelle !== null;
    el('financial-empty').hidden = canValeurMensuelle;
    el('financial-results').hidden = !canValeurMensuelle;
    if (!canValeurMensuelle) return;

    // Reprend telle quelle la valeur deja calculee/affichee par renderTimeResults -
    // jamais recalculee ici, pour ne jamais pouvoir diverger entre les deux onglets.
    const valeurMensuelle = timeState.valeurMensuelle;
    el('v-valeurMensuelle').textContent = (valeurMensuelle >= 0 ? '' : '- ') + formatEUR(Math.abs(valeurMensuelle));

    const canRoi = !coutMensuel.missing && !fraisMiseEnPlace.missing;
    el('roi-empty').hidden = canRoi;
    el('roi-results').hidden = !canRoi;
    if (!canRoi) return;

    const coutTotalAnnee1 = 12 * coutMensuel.value + fraisMiseEnPlace.value;
    const soldeEstimeAnnee1 = 12 * valeurMensuelle - coutTotalAnnee1;

    el('v-coutTotalAnnee1').textContent = formatEUR(coutTotalAnnee1);
    el('v-soldeAnnee1').textContent = (soldeEstimeAnnee1 >= 0 ? '+ ' : '- ') + formatEUR(Math.abs(soldeEstimeAnnee1));

    const hero = el('hero-roi');
    hero.classList.remove('positive', 'negative');
    el('roi-nul').hidden = coutTotalAnnee1 > 0;

    const roiFill = el('bar-roi-fill');
    if (coutTotalAnnee1 > 0) {
      const roiEstimeAnnee1 = (soldeEstimeAnnee1 / coutTotalAnnee1) * 100;
      hero.classList.add(roiEstimeAnnee1 >= 0 ? 'positive' : 'negative');
      el('v-roi').textContent = formatPercent(roiEstimeAnnee1);
      el('v-roi-hint').textContent = 'Solde estimé année 1 rapporté au coût total année 1.';
      // Barre bornee a l'echelle affichee (0 a 300 % et plus) - purement visuelle, la
      // valeur exacte reste dans le texte ci-dessus, jamais tronquee.
      roiFill.classList.toggle('danger', roiEstimeAnnee1 < 0);
      roiFill.classList.toggle('success', roiEstimeAnnee1 >= 0);
      const roiScalePercent = Math.max(0, Math.min(100, (roiEstimeAnnee1 / 300) * 100));
      roiFill.style.width = roiScalePercent + '%';
    } else {
      hero.classList.remove('positive', 'negative');
      el('v-roi').textContent = '-';
      el('v-roi-hint').textContent = '';
      roiFill.classList.remove('success', 'danger');
      roiFill.style.width = '0%';
    }
  }

  function calc() {
    const timeState = renderTimeResults();
    renderFinancialResults(timeState.incomplete ? { incomplete: true } : timeState);
  }

  // ---- Actions utilisateur ----

  function setMode(mode) {
    currentMode = mode === 'detail' ? 'detail' : 'simple';
    el('tab-simple').classList.toggle('active', currentMode === 'simple');
    el('tab-detail').classList.toggle('active', currentMode === 'detail');
    el('panel-simple-inputs').hidden = currentMode !== 'simple';
    el('panel-detail-inputs').hidden = currentMode !== 'detail';
    el('panel-financial').hidden = currentMode !== 'detail';
    calc();
  }

  function applyCoutHorairePreset(value) {
    el('coutHoraire').value = value;
    calc();
  }

  function loadExample() {
    el('nbCommerciaux').value = 1;
    el('volumeEquipe').value = 10;
    el('tempsManuelSimple').value = 90;
    el('tempsTempoSimple').value = 30;
    exampleActive = true;
    el('example-note').hidden = false;
    setMode('simple');
  }

  function reset() {
    ['nbCommerciaux', 'volumeEquipe', 'tempsManuelSimple', 'tempsTempoSimple', 'coutMensuel', 'fraisMiseEnPlace'].forEach((id) => {
      el(id).value = '';
    });
    STEP_IDS.forEach((prefix) => {
      el(prefix + 'Manuel').value = '';
      el(prefix + 'Tempo').value = '';
    });
    el('origineTempo').value = 'hypothese';
    // Le cout horaire revient a son hypothese par defaut (35 €/h, "Confirmé") plutot que
    // d'etre vide : c'est une hypothese de depart raisonnable, pas une donnee du dossier
    // en cours - contrairement a coutMensuel/fraisMiseEnPlace (prix Bluewaive reel pour CE
    // client, jamais presuppose).
    el('coutHoraire').value = 35;
    exampleActive = false;
    el('example-note').hidden = true;
    setMode('simple');
  }

  window.TEMPO = { calc, setMode, loadExample, reset, applyCoutHorairePreset };

  document.addEventListener('DOMContentLoaded', () => {
    calc();
  });
})();
