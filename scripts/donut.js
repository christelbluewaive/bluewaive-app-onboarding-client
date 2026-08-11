function renderDonut(config) {
  const { svgId, legendId, detailId, data } = config;

  const svg = document.getElementById(svgId);
  if (!svg) return;

  // Vider le SVG
  while (svg.firstChild) {
    svg.removeChild(svg.firstChild);
  }

  const total = data.reduce((sum, item) => sum + item.value, 0);
  const cx = 60, cy = 60, r = 45;

  let currentAngle = -Math.PI / 2;

  data.forEach((item) => {
    const sliceAngle = (item.value / total) * 2 * Math.PI;

    // Cas particulier : une seule tranche couvre 100% du donut (ex. etape a
    // 0% ou 100%). Le trace en arc devient degenere (point de depart = point
    // d'arrivee) et SVG l'omet silencieusement -> cercle invisible. On dessine
    // alors un disque plein, seule difference visuelle avec le trace en arc.
    if (item.value === total) {
      const fullCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      fullCircle.setAttribute('cx', cx);
      fullCircle.setAttribute('cy', cy);
      fullCircle.setAttribute('r', r);
      fullCircle.setAttribute('fill', item.color);
      svg.appendChild(fullCircle);
      currentAngle += sliceAngle;
      return;
    }

    const startAngle = currentAngle;
    const endAngle = currentAngle + sliceAngle;

    const x1 = cx + r * Math.cos(startAngle);
    const y1 = cy + r * Math.sin(startAngle);
    const x2 = cx + r * Math.cos(endAngle);
    const y2 = cy + r * Math.sin(endAngle);

    const largeArc = sliceAngle > Math.PI ? 1 : 0;
    const pathData = [
      `M ${cx} ${cy}`,
      `L ${x1} ${y1}`,
      `A ${r} ${r} 0 ${largeArc} 1 ${x2} ${y2}`,
      'Z'
    ].join(' ');

    const path = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    path.setAttribute('d', pathData);
    path.setAttribute('fill', item.color);
    path.setAttribute('stroke', 'white');
    path.setAttribute('stroke-width', '1');
    svg.appendChild(path);

    currentAngle = endAngle;
  });

  // Cercle intérieur (pour l'effet donut)
  const innerCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  innerCircle.setAttribute('cx', cx);
  innerCircle.setAttribute('cy', cy);
  innerCircle.setAttribute('r', '25');
  innerCircle.setAttribute('fill', 'white');
  svg.appendChild(innerCircle);

  // Legende
  const legend = document.getElementById(legendId);
  if (legend) {
    legend.innerHTML = data.map(item => `
      <div class="legend-item">
        <span class="legend-color" style="background: ${item.color}"></span>
        <span>${item.label}: ${item.value}</span>
      </div>
    `).join('');
  }

  // Détail
  const detail = document.getElementById(detailId);
  if (detail && config.detailsByKey) {
    const details = [];
    data.forEach(item => {
      const itemDetails = config.detailsByKey[item.key] || [];
      itemDetails.forEach(d => details.push(d));
    });
    detail.innerHTML = details.length > 0
      ? `<ul>${details.map(d => `<li>${d}</li>`).join('')}</ul>`
      : '<p>Pas de details</p>';
  }
}
