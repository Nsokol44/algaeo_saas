'use client';
export async function generateFieldReport(data){
  const{default:jsPDF}=await import('jspdf');
  const{farmName,farmerName,state,county,cropLabel,acres,soilType,usdaZone,plantedDate,kpis,treatmentSchedule,soilScore,preparedFor}=data;
  const doc=new jsPDF({orientation:'portrait',unit:'mm',format:'a4'});
  const W=210,margin=18;let y=0;
  doc.setFillColor(10,74,58);doc.rect(0,0,W,38,'F');
  doc.setTextColor(255,255,255);doc.setFont('helvetica','bold');doc.setFontSize(20);doc.text('Algaeo.io',margin,16);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(180,230,210);doc.text('FIELD PROJECTION REPORT',margin,22);doc.text('algaeo.com',margin,28);
  doc.text(`Generated: ${new Date().toLocaleDateString('en-US',{year:'numeric',month:'long',day:'numeric'})}`,W-margin,16,{align:'right'});
  if(preparedFor)doc.text(`Prepared for: ${preparedFor}`,W-margin,22,{align:'right'});
  y=46;
  doc.setFillColor(245,250,247);doc.rect(margin,y,W-margin*2,28,'F');
  doc.setTextColor(30,50,40);doc.setFont('helvetica','bold');doc.setFontSize(13);doc.text(farmName||'My Farm',margin+4,y+8);
  doc.setFont('helvetica','normal');doc.setFontSize(9);doc.setTextColor(80,110,90);
  const fd=[farmerName&&`Farmer: ${farmerName}`,(state||county)&&`Location: ${[county,state].filter(Boolean).join(', ')}`,usdaZone&&`USDA Zone: ${usdaZone}`,soilType&&`Soil: ${soilType.replace('_',' ')}`].filter(Boolean);
  fd.forEach((d,i)=>{doc.text(d,i%2===0?margin+4:W/2,y+14+Math.floor(i/2)*6);});
  y+=34;
  doc.setFont('helvetica','bold');doc.setFontSize(11);doc.setTextColor(10,74,58);doc.text(`${cropLabel} — ${acres||'—'} Acres`,margin,y);y+=8;
  doc.setDrawColor(200,230,210);doc.setLineWidth(0.3);doc.line(margin,y,W-margin,y);y+=6;
  doc.setFont('helvetica','bold');doc.setFontSize(10);doc.setTextColor(30,50,40);doc.text('PROJECTED SAVINGS WITH AGTTURBO™',margin,y);y+=5;
  const kpiBoxW=(W-margin*2-6)/2;
  (kpis||[]).forEach((k,i)=>{const col=i%2===0?margin:margin+kpiBoxW+6,row=y+Math.floor(i/2)*20;doc.setFillColor(245,250,247);doc.rect(col,row,kpiBoxW,17,'F');doc.setFont('helvetica','bold');doc.setFontSize(13);doc.setTextColor(10,74,58);doc.text(String(k.val),col+4,row+9);doc.setFont('helvetica','normal');doc.setFontSize(7.5);doc.setTextColor(100,130,110);doc.text(k.label,col+4,row+14);});
  y+=Math.ceil((kpis||[]).length/2)*20+6;
  doc.setFillColor(10,74,58);doc.rect(0,277,W,20,'F');doc.setTextColor(180,230,210);doc.setFontSize(7.5);doc.text('Algaeo.io Crop Intelligence Platform  •  algaeo.com',W/2,285,{align:'center'});doc.text('Projections based on academic soil benchmarks and AgTurbo™ field data.',W/2,290,{align:'center'});
  const filename=`Algaeo_Report_${(farmName||'Farm').replace(/\s/g,'_')}_${cropLabel}_${new Date().getFullYear()}.pdf`;
  doc.save(filename);
}
