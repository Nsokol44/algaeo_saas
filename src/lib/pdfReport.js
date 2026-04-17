'use client';

// Generates a one-page PDF field report using jsPDF (loaded dynamically)
// Call: generateFieldReport(reportData)

export async function generateFieldReport(data) {
  const { default: jsPDF } = await import('jspdf');

  const {
    farmName, farmerName, state, county, cropLabel, acres,
    soilType, usdaZone, plantedDate,
    kpis, treatmentSchedule, soilScore,
    preparedFor, // optional lender/co-op name
  } = data;

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const W = 210; const H = 297;
  const margin = 18;
  let y = 0;

  // ── Header band ──
  doc.setFillColor(10, 74, 58); // teal
  doc.rect(0, 0, W, 38, 'F');

  // Logo placeholder circle
  doc.setFillColor(255, 255, 255, 0.15);
  doc.setDrawColor(255, 255, 255);
  doc.setLineWidth(0.5);

  // Title
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(20);
  doc.text('Algaeo.io', margin, 16);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(180, 230, 210);
  doc.text('FIELD PROJECTION REPORT', margin, 22);
  doc.text('algaeo.com', margin, 28);

  // Date top right
  doc.setTextColor(180, 230, 210);
  doc.setFontSize(8);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}`, W - margin, 16, { align: 'right' });
  if (preparedFor) {
    doc.text(`Prepared for: ${preparedFor}`, W - margin, 22, { align: 'right' });
  }

  y = 46;

  // ── Farm info block ──
  doc.setFillColor(245, 250, 247);
  doc.rect(margin, y, W - margin * 2, 28, 'F');
  doc.setTextColor(30, 50, 40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(13);
  doc.text(farmName || 'My Farm', margin + 4, y + 8);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(80, 110, 90);

  const farmDetails = [
    farmerName && `Farmer: ${farmerName}`,
    (state || county) && `Location: ${[county, state].filter(Boolean).join(', ')}`,
    usdaZone && `USDA Zone: ${usdaZone}`,
    soilType && `Soil: ${soilType.replace('_', ' ')}`,
  ].filter(Boolean);

  farmDetails.forEach((d, i) => {
    const col = i % 2 === 0 ? margin + 4 : W / 2;
    const row = y + 14 + Math.floor(i / 2) * 6;
    doc.text(d, col, row);
  });

  y += 34;

  // ── Crop + season ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(10, 74, 58);
  doc.text(`${cropLabel} — ${acres || '—'} Acres`, margin, y);
  if (plantedDate) {
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(100, 130, 110);
    doc.text(`Planted: ${new Date(plantedDate).toLocaleDateString()}`, margin + 80, y);
  }
  y += 8;

  // Divider
  doc.setDrawColor(200, 230, 210);
  doc.setLineWidth(0.3);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── Soil Health Score ──
  if (soilScore) {
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 50, 40);
    doc.text('SOIL HEALTH SCORE', margin, y);
    y += 5;

    // Score circle (text representation)
    doc.setFillColor(soilScore.color === '#4ade80' ? '#dcfce7' : soilScore.color === '#fbbf24' ? '#fef9c3' : '#fee2e2');
    doc.setFillColor(220, 252, 231);
    doc.roundedRect(margin, y, 30, 14, 2, 2, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(16);
    doc.setTextColor(10, 74, 58);
    doc.text(`${soilScore.score}/10`, margin + 15, y + 10, { align: 'center' });

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(80, 110, 90);
    doc.text(soilScore.label, margin + 15, y + 14, { align: 'center' });

    doc.setFontSize(8.5);
    doc.setTextColor(60, 90, 70);
    const recLines = doc.splitTextToSize(soilScore.recommendation, W - margin * 2 - 36);
    doc.text(recLines, margin + 34, y + 5);
    y += Math.max(18, recLines.length * 4 + 4);
    y += 4;
  }

  // ── KPI Summary ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 50, 40);
  doc.text('PROJECTED SAVINGS WITH AGTTURBO™', margin, y);
  y += 5;

  const kpiBoxW = (W - margin * 2 - 6) / 2;
  kpis.forEach((k, i) => {
    const col = i % 2 === 0 ? margin : margin + kpiBoxW + 6;
    const row = y + Math.floor(i / 2) * 20;
    doc.setFillColor(245, 250, 247);
    doc.rect(col, row, kpiBoxW, 17, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(13);
    doc.setTextColor(10, 74, 58);
    doc.text(String(k.val), col + 4, row + 9);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.setTextColor(100, 130, 110);
    doc.text(k.label, col + 4, row + 14);
  });
  y += Math.ceil(kpis.length / 2) * 20 + 6;

  // Divider
  doc.setDrawColor(200, 230, 210);
  doc.line(margin, y, W - margin, y);
  y += 6;

  // ── Application Schedule ──
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(30, 50, 40);
  doc.text('AGTTURBO™ APPLICATION SCHEDULE', margin, y);
  y += 5;

  // Table header
  doc.setFillColor(10, 74, 58);
  doc.rect(margin, y, W - margin * 2, 7, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(7.5);
  doc.text('STAGE', margin + 2, y + 4.5);
  doc.text('METHOD', margin + 40, y + 4.5);
  doc.text('TIMING', margin + 80, y + 4.5);
  doc.text('RATE', margin + 125, y + 4.5);
  y += 7;

  treatmentSchedule.forEach((t, i) => {
    doc.setFillColor(i % 2 === 0 ? 245 : 255, i % 2 === 0 ? 250 : 255, i % 2 === 0 ? 247 : 255);
    doc.rect(margin, y, W - margin * 2, 7, 'F');
    doc.setTextColor(30, 50, 40);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(7.5);
    doc.text(t.stage || '—', margin + 2, y + 4.5);
    doc.text(t.method || '—', margin + 40, y + 4.5);
    doc.text(t.timing || '—', margin + 80, y + 4.5);
    doc.text(t.rate || '—', margin + 125, y + 4.5);
    y += 7;
  });

  y += 8;

  // ── Footer ──
  doc.setFillColor(10, 74, 58);
  doc.rect(0, H - 18, W, 18, 'F');
  doc.setTextColor(180, 230, 210);
  doc.setFont('helvetica', 'normal');
  doc.setFontSize(7.5);
  doc.text('Algaeo.io Crop Intelligence Platform  •  algaeo.com  •  Projections based on academic soil benchmarks and AgTurbo™ field data.', W / 2, H - 10, { align: 'center' });
  doc.text('Results may vary by field conditions. Contact Algaeo for a custom protocol.', W / 2, H - 5, { align: 'center' });

  // Save
  const filename = `Algaeo_Report_${(farmName || 'Farm').replace(/\s/g, '_')}_${cropLabel}_${new Date().getFullYear()}.pdf`;
  doc.save(filename);
}
