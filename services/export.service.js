
const PptxGenJS = require('pptxgenjs');
const PDFDocument = require('pdfkit');
const axios = require('axios');
const docx = require('docx');
const { Document, Packer, Paragraph, TextRun, HeadingLevel, AlignmentType } = docx;

async function downloadImage(url) {
  try {
    console.log(`📸 [IMG] Downloading: ${url.substring(0, 50)}...`);
    const r = await axios.get(url, { responseType: 'arraybuffer', timeout: 15000 });
    console.log(`✅ [IMG] Downloaded: ${r.data.length} bytes`);
    return Buffer.from(r.data);
  } catch (e) {
    console.error(`❌ [IMG] Error: ${e.message} | URL: ${url.substring(0, 50)}`);
    return null;
  }
}

const THEME_DESIGNS = {
  Business:   { bg1: 'F8FAFC', bg2: 'F1F5F9', accent: '0F172A', secondary: '3B82F6', text: '0F172A', bullet: '3B82F6', isLight: true }, // Slate Blue
  Minimal:    { bg1: 'FFFFFF', bg2: 'FAFAFA', accent: '18181B', secondary: '71717A', text: '18181B', bullet: '27272A', isLight: true }, // Clean Mono
  Technology: { bg1: '020617', bg2: '0F172A', accent: '38BDF8', secondary: '1D4ED8', text: 'F0F9FF', bullet: '0EA5E9', isLight: false }, // Cyber Sky
  Education:  { bg1: 'F0F9FF', bg2: 'E0F2FE', accent: '0369A1', secondary: '0284C7', text: '0C4A6E', bullet: '0EA5E9', isLight: true }, // Academic Blue
  Startup:    { bg1: 'FAF5FF', bg2: 'F3E8FF', accent: '7E22CE', secondary: 'A855F7', text: '3B0764', bullet: '9333EA', isLight: true }, // Modern Purple
  Creative:   { bg1: 'FFF1F2', bg2: 'FFE4E6', accent: 'E11D48', secondary: 'FB7185', text: '4C0519', bullet: 'F43F5E', isLight: true }, // Vibrant Rose
  Dark:       { bg1: '09090B', bg2: '18181B', accent: 'FACC15', secondary: 'EAB308', text: 'FAFAFA', bullet: 'FDE047', isLight: false }, // Luxury Gold
  Corporate:  { bg1: '1E1B4B', bg2: '312E81', accent: '818CF8', secondary: 'C7D2FE', text: 'EEF2FF', bullet: '818CF8', isLight: false }  // Royal Indigo
};

async function generatePPTX(presentation) {
  const pptx = new PptxGenJS();
  pptx.author = 'AlphaSlides'; pptx.title = presentation.title; pptx.layout = 'LAYOUT_16x9';
  const theme = THEME_DESIGNS[presentation.template] || THEME_DESIGNS.Business;

  for (const [i, slide] of presentation.slides.entries()) {
    const s = pptx.addSlide();
    const isTitle = i === 0;
    const theme = THEME_DESIGNS[slide.theme] || THEME_DESIGNS[presentation.template] || THEME_DESIGNS.Business;
    const hasImage = slide.images?.length > 0;
    const layout = slide.layout || 'title-content';

    // Modern Background & Patterns
    s.background = { color: i % 2 === 0 ? theme.bg1 : theme.bg2 };
    
    // Abstract Geometric Patterns (Modern & Professional)
    if (theme.isLight) {
        s.addShape(pptx.shapes.OVAL, { x: 8.5, y: -1.0, w: 3, h: 3, fill: { color: theme.accent, transparency: 85 } });
        s.addShape(pptx.shapes.OVAL, { x: -1.0, y: 4.8, w: 2.5, h: 2.5, fill: { color: theme.secondary, transparency: 92 } });
        // Decorative Dots for Premium feel
        for (let r=0; r<4; r++) for (let c=0; c<4; c++) 
            s.addShape(pptx.shapes.OVAL, { x: 0.3 + (c*0.1), y: 0.3 + (r*0.1), w: 0.03, h: 0.03, fill: { color: theme.accent, transparency: 50 } });
    } else {
        s.addShape(pptx.shapes.RECTANGLE, { x: 7, y: 0, w: 3, h: '100%', fill: { color: theme.accent, transparency: 95 } });
        s.addShape(pptx.shapes.RIGHT_TRIANGLE, { x: 9, y: 4.5, w: 1, h: 1.1, fill: { color: theme.accent, transparency: 80 }, flipH: true });
    }
    
    // Aesthetic Left Sidebar Decoration
    s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.08, h: '100%', fill: { color: theme.accent } });
    
    // Footer Logic
    s.addText(`AlphaSlides AI | Professional Grade`, { x: 0.5, y: 5.35, w: 4, h: 0.25, fontSize: 8, color: theme.accent, align: 'left', italic: true, fontFace: 'Arial' });
    s.addText(`${i + 1}`, { x: 9.1, y: 5.35, w: 0.4, h: 0.25, fontSize: 9, color: theme.text, align: 'right', bold: true, fontFace: 'Arial' });

    if (isTitle) {
      // Premium Title Design
      const titleW = hasImage ? 5.8 : 9.0;
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 2.2, w: 0.8, h: 0.06, fill: { color: theme.accent } });
      s.addText(slide.title.toUpperCase() || '', { x: 0.5, y: 1.2, w: titleW, h: 1.8, fontSize: 48, bold: true, color: theme.text, align: 'left', valign: 'middle', fontFace: 'Arial' });
      
      if (slide.content?.length > 0) {
        s.addText(slide.content.join('  •  '), { x: 0.5, y: 3.2, w: titleW, h: 0.6, fontSize: 20, color: theme.accent, align: 'left', italic: true, fontFace: 'Arial' });
      }
      
      if (hasImage) {
        const imgBuf = await downloadImage(slide.images[0].url);
        if (imgBuf) try { 
          // Large Framed Image on the right
          const imgX = 6.4, imgY = 0.5, imgW = 3.2, imgH = 4.8;
          s.addShape(pptx.shapes.RECTANGLE, { x: imgX - 0.15, y: imgY + 0.15, w: imgW, h: imgH, fill: { color: theme.accent, transparency: 80 } });
          s.addImage({ data: `image/jpeg;base64,${imgBuf.toString('base64')}`, x: imgX, y: imgY, w: imgW, h: imgH, rounding: true, shadow: { type: 'outer', blur: 12, offset: 6, color: '000000', opacity: 0.4 } }); 
        } catch (e) {}
      }
    } else {
      // Premium Content Slide Layout
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.08, y: 0, w: '100%', h: 0.8, fill: { color: theme.isLight ? '000000' : 'FFFFFF', transparency: 95 } });
      s.addText(slide.title.toUpperCase() || '', { x: 0.5, y: 0.15, w: 9, h: 0.5, fontSize: 28, bold: true, color: theme.text, align: 'left', valign: 'middle', fontFace: 'Arial' });
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 0.65, w: 1.2, h: 0.03, fill: { color: theme.accent } });

      let textX = 0.5, textW = 9.0, textY = 1.3, textH = 3.8;
      
      if (layout === 'two-column') {
        const colW = 4.4;
        const half = Math.ceil((slide.content?.length || 0) / 2);
        const col1 = (slide.content || []).slice(0, half);
        const col2 = (slide.content || []).slice(half);
        
        s.addText(col1.map(p => ({ text: p, options: { bullet: true, color: theme.text } })), { x: 0.5, y: textY, w: colW, h: textH, fontSize: 18, lineSpacing: 28, fontFace: 'Arial' });
        s.addText(col2.map(p => ({ text: p, options: { bullet: true, color: theme.text } })), { x: 5.1, y: textY, w: colW, h: textH, fontSize: 18, lineSpacing: 28, fontFace: 'Arial' });
        s.addShape(pptx.shapes.LINE, { x: 4.95, y: 1.4, w: 0, h: 3.5, line: { color: theme.accent, width: 0.5, transparency: 70 } });
      } else if (layout === 'stats-grid') {
        const items = slide.content || [];
        const cols = items.length > 2 ? 2 : 1;
        const rows = Math.ceil(items.length / cols);
        const boxW = 4.2, boxH = 1.6;

        items.forEach((item, idx) => {
            const r = Math.floor(idx / cols);
            const c = idx % cols;
            const bX = 0.5 + (c * 4.6), bY = 1.3 + (r * 1.9);
            s.addShape(pptx.shapes.RECTANGLE, { x: bX, y: bY, w: boxW, h: boxH, fill: { color: theme.isLight ? theme.bg2 : theme.bg1 }, line: { color: theme.accent, width: 1.5 }, rounding: true });
            s.addText(item, { x: bX + 0.2, y: bY + 0.2, w: boxW - 0.4, h: boxH - 0.4, fontSize: 16, color: theme.text, align: 'center', valign: 'middle', fontFace: 'Arial' });
        });
      } else if (hasImage) {
        const isImageLeft = (layout === 'title-image-left');
        const isImageRight = (layout === 'title-image-right') || (!isImageLeft && i % 2 === 0);
        
        textX = isImageRight ? 0.5 : 5.0; 
        textW = 4.5;
        
        const imgBuf = await downloadImage(slide.images[0].url);
        if (imgBuf) try { 
           const imgX = isImageRight ? 5.8 : 0.5;
           const imgY = 1.2, imgW = 3.8, imgH = 4.0;
           // Decorative border behind image
           s.addShape(pptx.shapes.RECTANGLE, { x: imgX + 0.15, y: imgY + 0.15, w: imgW, h: imgH, fill: { color: theme.accent, transparency: 80 } });
           s.addImage({ data: `image/jpeg;base64,${imgBuf.toString('base64')}`, x: imgX, y: imgY, w: imgW, h: imgH, rounding: true, shadow: { type: 'outer', blur: 15, color: '000000', opacity: 0.3 } }); 
        } catch (e) {}
        
        if (slide.content?.length > 0) {
            s.addText(slide.content.map(p => ({ text: p, options: { bullet: true, color: theme.text } })), { x: textX, y: textY, w: textW, h: textH, fontSize: 18, lineSpacing: 28, fontFace: 'Arial' });
        }
      } else if (layout === 'big-quote') {
        const quote = slide.content?.[0] || slide.title;
        s.addText(`"`, { x: 0.5, y: 1.5, w: 1, h: 1, fontSize: 120, color: theme.accent, transparency: 80, fontFace: 'Georgia' });
        s.addText(quote, { x: 1.2, y: 1.8, w: 7.5, h: 2.5, fontSize: 32, italic: true, color: theme.text, align: 'center', valign: 'middle', fontFace: 'Arial' });
        s.addText(`"`, { x: 8.5, y: 3.5, w: 1, h: 1, fontSize: 120, color: theme.accent, transparency: 80, fontFace: 'Georgia' });
      } else {
        if (slide.content?.length > 0) {
            s.addText(slide.content.map(p => ({ text: p, options: { bullet: true, color: theme.text } })), { x: textX, y: textY, w: textW, h: textH, fontSize: 20, lineSpacing: 32, fontFace: 'Arial' });
        }
      }

      // Add Charts if available
      if (slide.charts?.length > 0) {
        slide.charts.forEach((chart, cIdx) => {
          const chartTypes = { 'bar': pptx.ChartType.bar, 'pie': pptx.ChartType.pie, 'line': pptx.ChartType.line };
          const type = chartTypes[chart.type] || pptx.ChartType.bar;
          const data = [{
            name: chart.title || 'Data',
            labels: chart.data.map(d => d.label),
            values: chart.data.map(d => d.value)
          }];
          
          // Position chart appropriately (usually bottom or side)
          const cW = 4.0, cH = 2.5;
          const cX = hasImage ? (textX === 0.5 ? 5.5 : 0.5) : 5.0;
          const cY = 2.5;
          
          s.addChart(type, data, { x: cX, y: cY, w: cW, h: cH, showTitle: true, title: chart.title, titleColor: theme.text, titleFontSize: 12 });
        });
      }
    }
  }
  return pptx.write({ outputType: 'nodebuffer' });
}

async function generatePDF(presentation) {
  const doc = new PDFDocument({ size: [792, 612], margin: 0 });
  const theme = THEME_DESIGNS[presentation.template] || THEME_DESIGNS.Business;
  const strip = t => (t||'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/<[^>]+>/g,'');
  const imageBuffers = await Promise.all(presentation.slides.map(s => s.images?.length > 0 ? downloadImage(s.images[0].url) : null));

  return new Promise((resolve, reject) => {
    const chunks = []; doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);
    for (const [i, slide] of presentation.slides.entries()) {
      if (i > 0) doc.addPage();
      const isTitle = i === 0; 
      const slideTheme = THEME_DESIGNS[slide.theme] || theme;
      const hasImage = imageBuffers[i] !== null; 
      const layout = slide.layout || 'title-content';
      
      const bgHex = '#' + (i % 2 === 0 ? slideTheme.bg1 : slideTheme.bg2); 
      const accHex = '#' + slideTheme.accent; 
      const secHex = '#' + slideTheme.secondary;
      const textHex = '#' + slideTheme.text;
      
      doc.rect(0, 0, 792, 612).fill(bgHex);
      
      // Premium PDF Accents
      if (slideTheme.isLight) {
          doc.circle(750, -20, 150).fillOpacity(0.08).fill(accHex);
          doc.circle(40, 580, 100).fillOpacity(0.05).fill(secHex);
          doc.fillOpacity(1);
      } else {
          doc.rect(700, 0, 92, 612).fillOpacity(0.1).fill(accHex);
          doc.fillOpacity(1);
      }
      
      doc.rect(0, 0, 8, 612).fill(accHex); // Elegant side stripe
      
      doc.font('Helvetica-BoldOblique').fontSize(9).fillColor(accHex).text(`AlphaSlides AI | Professional Grade`, 60, 580);
      doc.font('Helvetica-Bold').fillColor(textHex).text(`${i + 1}`, 740, 580);

      if (isTitle) {
        let titleW = hasImage ? 460 : 692;
        doc.rect(60, 240, 60, 5).fill(accHex);
        doc.font('Helvetica-Bold').fontSize(54).fillColor(textHex).text(strip(slide.title).toUpperCase(), 60, 130, { width: titleW, align: 'left', lineGap: 10 });
        if (slide.content) doc.font('Helvetica-Oblique').fontSize(22).fillColor(accHex).text(strip(slide.content.join('  •  ')), 60, 330, { width: titleW, align: 'left' });
        
        if (hasImage) {
          try { 
            const imgX = 530, imgY = 60, imgW = 220, imgH = 460;
            doc.rect(imgX - 10, imgY + 10, imgW, imgH).fillOpacity(0.2).fill(accHex); doc.fillOpacity(1);
            doc.image(imageBuffers[i], imgX, imgY, { width: imgW, height: imgH }); 
            doc.rect(imgX, imgY, imgW, imgH).lineWidth(2).stroke(textHex);
          } catch(e){}
        }
      } else {
        doc.rect(8, 0, 784, 75).fillOpacity(0.1).fill(slideTheme.isLight ? '#000000' : '#FFFFFF'); doc.fillOpacity(1);
        doc.font('Helvetica-Bold').fontSize(32).fillColor(textHex).text(strip(slide.title).toUpperCase(), 60, 22, { width: 692, align: 'left' });
        doc.rect(60, 62, 100, 3).fill(accHex);

        let contentX = 60, contentW = 692, contentY = 130;
        
        if (layout === 'two-column') {
            const half = Math.ceil((slide.content?.length || 0) / 2);
            const col1 = (slide.content || []).slice(0, half);
            const col2 = (slide.content || []).slice(half);
            
            let y1 = contentY;
            col1.forEach(p => {
                doc.font('Helvetica').fontSize(18).fillColor(textHex).text('• ' + strip(p), 60, y1, { width: 330, lineGap: 8 });
                y1 += doc.heightOfString('• ' + strip(p), { width: 330, lineGap: 8 }) + 15;
            });
            
            let y2 = contentY;
            col2.forEach(p => {
                doc.font('Helvetica').fontSize(18).fillColor(textHex).text('• ' + strip(p), 410, y2, { width: 330, lineGap: 8 });
                y2 += doc.heightOfString('• ' + strip(p), { width: 330, lineGap: 8 }) + 15;
            });
            doc.moveTo(396, 140).lineTo(396, 500).lineWidth(0.5).strokeOpacity(0.3).stroke(accHex); doc.strokeOpacity(1);
        } else if (layout === 'stats-grid') {
          const items = slide.content || [];
          const cols = items.length > 2 ? 2 : 1;
          const boxW = 320, boxH = 120;
          items.forEach((item, idx) => {
              const r = Math.floor(idx / cols);
              const c = idx % cols;
              const bX = 60 + (c * 350), bY = 130 + (r * 150);
              doc.rect(bX, bY, boxW, boxH).fill(slideTheme.isLight ? '#' + slideTheme.bg2 : '#' + slideTheme.bg1);
              doc.rect(bX, bY, boxW, boxH).lineWidth(1.5).stroke(accHex);
              doc.font('Helvetica').fontSize(16).fillColor(textHex).text(strip(item), bX + 15, bY + 15, { width: boxW - 30, align: 'center', valign: 'center' });
          });
        } else if (hasImage) {
          const isImageLeft = (layout === 'title-image-left');
          const isImageRight = (layout === 'title-image-right') || (!isImageLeft && i % 2 === 0);
          
          contentW = 340; 
          const imgX = isImageRight ? 420 : 60; 
          contentX = isImageRight ? 60 : 420;
          
          try { 
            doc.image(imageBuffers[i], imgX, 110, { width: 340, height: 380 }); 
            doc.rect(imgX - 5, 115, 340, 380).fillOpacity(0.1).fill(accHex); doc.fillOpacity(1);
            doc.rect(imgX, 110, 340, 380).lineWidth(1.5).stroke(accHex); 
          } catch(e){}
          
          let y = contentY;
          (slide.content || []).forEach(point => {
            doc.font('Helvetica').fontSize(18).fillColor(textHex).text('• ' + strip(point), contentX, y, { width: contentW, lineGap: 8 });
            y += doc.heightOfString('• ' + strip(point), { width: contentW, lineGap: 8 }) + 15;
          });
        } else if (layout === 'big-quote') {
            const quote = slide.content?.[0] || slide.title;
            doc.font('Times-Italic').fontSize(120).fillColor(accHex).fillOpacity(0.2).text('"', 60, 180); doc.fillOpacity(1);
            doc.font('Helvetica-BoldOblique').fontSize(36).fillColor(textHex).text(strip(quote), 120, 240, { width: 550, align: 'center' });
            doc.font('Times-Italic').fontSize(120).fillColor(accHex).fillOpacity(0.2).text('"', 650, 400); doc.fillOpacity(1);
        } else {
          let y = contentY;
          (slide.content || []).forEach(point => {
            doc.font('Helvetica').fontSize(20).fillColor(textHex).text('• ' + strip(point), 60, y, { width: 692, lineGap: 10 });
            y += doc.heightOfString('• ' + strip(point), { width: 692, lineGap: 10 }) + 20;
          });
        }
      }
    }
    doc.end();
  });
}

async function generateDocPDF(docData) {
  const formats = { 'A4': [595.28, 841.89], 'Letter': [612, 792], 'Legal': [612, 1008] };
  const size = formats[docData.format] || formats.A4;
  // Margins in pt (1cm = 28.35pt): 3cm left = 85pt, 1.5cm right = 42.5pt, 2cm Top/Bottom = 56.7pt
  const margins = { top: 56.7, bottom: 56.7, left: 85.05, right: 42.52 }; 
  const doc = new PDFDocument({ size, margin: 0 });
  const strip = t => (t||'').replace(/\*\*(.*?)\*\*/g,'$1').replace(/<[^>]+>/g,'');
  
  const imageBuffers = await Promise.all((docData.pages || []).map(p => 
    (p.images && p.images.length > 0) ? downloadImage(p.images[0].url) : null
  ));
  
  return new Promise((resolve, reject) => {
    const chunks = []; doc.on('data', c => chunks.push(c)); doc.on('end', () => resolve(Buffer.concat(chunks))); doc.on('error', reject);

    docData.pages.forEach((page, i) => {
      if (i > 0) doc.addPage();

      doc.rect(0, 0, size[0], 5).fill('#1e293b');
      doc.font('Times-Bold').fontSize(24).fillColor('#1e293b').text(strip(page.title).toUpperCase(), margins.left, margins.top, { width: size[0] - margins.left - margins.right, align: 'center' });
      doc.moveDown(1);

      const imgBuf = imageBuffers[i];
      if (imgBuf) {
        try { 
          doc.image(imgBuf, margins.left, doc.y, { width: size[0] - margins.left - margins.right, height: 250 }); 
          doc.y += 270;
        } catch(e) {}
      }

      const html = page.content || '';
      const tokens = html.split(/(<[^>]+>)/g);
      doc.font('Times-Roman').fontSize(14).fillColor('#000000');
      
      let currentTag = '';
      tokens.forEach(token => {
        if (!token) return;
        if (token.startsWith('<')) {
          currentTag = token.toLowerCase();
          if (currentTag.startsWith('</')) { doc.font('Times-Roman').fontSize(14); return; }
          if (currentTag === '<h1>' || currentTag === '<h2>') doc.font('Times-Bold').fontSize(18).moveDown(1);
          if (currentTag === '<h3>') doc.font('Times-Bold').fontSize(15).moveDown(0.5);
          if (currentTag === '<li>') doc.text('• ', { continued: true });
          return;
        }
        const cleanText = strip(token).replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
        if (cleanText) doc.text(cleanText, { 
          width: size[0] - margins.left - margins.right, 
          align: 'justify', 
          lineGap: 6, // Approx 1.5 spacing
          indent: currentTag === '<p>' ? 35.4 : 0 // 1.25cm indent
        });
      });

      doc.font('Times-Italic').fontSize(9).fillColor('#94a3b8').text(`Page ${i + 1} | AlphaSlides Intelligence`, margins.left, size[1] - 40, { align: 'right', width: size[0] - margins.left - margins.right });
    });
    doc.end();
  });
}

async function generateDocDOCX(docData) {
  const imageBuffers = await Promise.all((docData.pages || []).map(p => 
    (p.images && p.images.length > 0) ? downloadImage(p.images[0].url) : null
  ));

  // Academic Formatting Constants (in twips: 1cm = 567 twips)
  const MARGIN_LEFT = 1701;   // 3cm
  const MARGIN_RIGHT = 851;   // 1.5cm
  const MARGIN_TOP = 1134;    // 2cm
  const MARGIN_BOTTOM = 1134; // 2cm
  const SPACING_1_5 = 360;    // 1.5 line spacing
  const INDENT_1_25 = 709;    // 1.25cm indent

  const sections = docData.pages.map((page, i) => {
    const children = [];
    
    children.push(new Paragraph({
      text: page.title.toUpperCase(),
      heading: HeadingLevel.HEADING_1,
      alignment: AlignmentType.CENTER,
      spacing: { after: 400, line: SPACING_1_5 }
    }));

    const imgBuf = imageBuffers[i];
    if (imgBuf) {
      try {
        children.push(new Paragraph({
          children: [new docx.ImageRun({ data: imgBuf, transformation: { width: 500, height: 300 } })],
          alignment: AlignmentType.CENTER,
          spacing: { before: 200, after: 400 }
        }));
      } catch(e) {}
    }

    const tokens = (page.content || '').split(/(<[^>]+>)/g);
    let currentBullet = false;
    let isHeading = false;

    tokens.forEach(token => {
      if (!token) return;
      if (token.startsWith('<')) {
        const tag = token.toLowerCase();
        if (tag === '<li>') currentBullet = true;
        if (tag === '</li>') currentBullet = false;
        if (tag.startsWith('<h')) isHeading = true;
        if (tag.startsWith('</h')) isHeading = false;
        return;
      }
      const cleanText = token.replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').trim();
      if (cleanText) {
        children.push(new Paragraph({
          children: [new TextRun({ text: cleanText, size: 28, font: 'Times New Roman', bold: isHeading })],
          bullet: currentBullet ? { level: 0 } : undefined,
          indent: (!currentBullet && !isHeading) ? { firstLine: INDENT_1_25 } : undefined,
          spacing: { line: SPACING_1_5, before: 120, after: 120 },
          alignment: isHeading ? AlignmentType.CENTER : AlignmentType.JUSTIFY
        }));
      }
    });

    return {
      properties: { 
        page: { 
          margin: { top: MARGIN_TOP, bottom: MARGIN_BOTTOM, left: MARGIN_LEFT, right: MARGIN_RIGHT },
          size: { width: 11906, height: 16838 } // A4
        } 
      },
      children: children
    };
  });

  return Packer.toBuffer(new Document({ 
    title: docData.title, 
    sections: sections,
    styles: {
      default: {
        document: {
          run: { size: 28, font: 'Times New Roman' },
          paragraph: { alignment: AlignmentType.JUSTIFY, spacing: { line: SPACING_1_5 } }
        }
      }
    }
  }));
}

module.exports = { generatePPTX, generatePDF, generateDocPDF, generateDocDOCX, THEME_DESIGNS };
