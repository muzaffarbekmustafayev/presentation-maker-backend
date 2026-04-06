
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
  Business:   { bg1: '0F172A', bg2: '1E293B', accent: '3B82F6', text: 'F1F5F9', bullet: '60A5FA' }, // Deep Slate
  Minimal:    { bg1: 'F8FAFC', bg2: 'F1F5F9', accent: '0F172A', text: '0F172A', bullet: '334155' }, // Ultra Clean
  Technology: { bg1: '020617', bg2: '0F172A', accent: '10B981', text: 'ECFDF5', bullet: '34D399' }, // Emerald Dark
  Education:  { bg1: 'ECFDF5', bg2: 'D1FAE5', accent: '065F46', text: '064E3B', bullet: '059669' }, // Soft Green
  Startup:    { bg1: 'FDF2F8', bg2: 'FCE7F3', accent: 'DB2777', text: '831843', bullet: 'BE185D' }, // Romantic Blush
  Creative:   { bg1: 'FAF5FF', bg2: 'F3E8FF', accent: '7E22CE', text: '581C87', bullet: '9333EA' }, // Purple Haze
  Dark:       { bg1: '000000', bg2: '09090B', accent: 'FACC15', text: 'FAFAFA', bullet: 'EAB308' }, // Luxury Yellow
  Corporate:  { bg1: '1E1B4B', bg2: '312E81', accent: '818CF8', text: 'EEF2FF', bullet: 'A5B4FC' }  // Royal Indigo
};

async function generatePPTX(presentation) {
  const pptx = new PptxGenJS();
  pptx.author = 'AlphaSlides'; pptx.title = presentation.title; pptx.layout = 'LAYOUT_16x9';
  const theme = THEME_DESIGNS[presentation.template] || THEME_DESIGNS.Business;

  for (const [i, slide] of presentation.slides.entries()) {
    const s = pptx.addSlide();
    const isTitle = i === 0;
    const hasImage = slide.images?.length > 0;
    const imgRight = (slide.layout === 'title-image-right') || (i % 2 === 0);

    // Modern Background & Decorations
    s.background = { color: i % 2 === 0 ? theme.bg1 : theme.bg2 };
    
    // Abstract Geometric Accents (Modern & Professional)
    s.addShape(pptx.shapes.OVAL, { x: 8.5, y: -1.0, w: 3, h: 3, fill: { color: theme.accent, transparency: 85 } });
    s.addShape(pptx.shapes.OVAL, { x: -1.5, y: 4.5, w: 4, h: 4, fill: { color: theme.accent, transparency: 90 } });
    
    // Aesthetic Side Decoration
    s.addShape(pptx.shapes.RECTANGLE, { x: 0, y: 0, w: 0.1, h: '100%', fill: { color: theme.accent } });
    
    // Header for Non-Title Slides
    if (!isTitle) {
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.1, y: 0, w: '100%', h: 0.9, fill: { color: '000000', transparency: 15 } });
      s.addText(slide.title.toUpperCase() || '', { x: 0.5, y: 0.1, w: 9, h: 0.7, fontSize: 32, bold: true, color: theme.text, align: 'left', valign: 'middle', fontFace: 'Arial' });
      s.addShape(pptx.shapes.RECTANGLE, { x: 0.5, y: 0.8, w: 1.5, h: 0.04, fill: { color: theme.accent } });
    }

    // Modern Footer
    s.addText(`AlphaSlides AI | Professional Standard`, { x: 0.5, y: 5.3, w: 4, h: 0.3, fontSize: 9, color: theme.accent, align: 'left', italic: true });
    s.addText(`${i + 1}`, { x: 9.0, y: 5.3, w: 0.5, h: 0.3, fontSize: 10, color: theme.text, align: 'right', bold: true });

    if (isTitle) {
      // Split Screen Title Design
      const titleW = hasImage ? 5.5 : 9.0;
      s.addText(slide.title.toUpperCase() || '', { x: 0.6, y: 1.5, w: titleW, h: 1.5, fontSize: 44, bold: true, color: theme.text, align: 'left', valign: 'middle', fontFace: 'Arial' });
      if (slide.content?.length > 0) {
        s.addText(slide.content.join('  •  '), { x: 0.6, y: 3.2, w: titleW, h: 0.6, fontSize: 22, color: theme.accent, align: 'left', bold: true });
      }
      
      if (hasImage) {
        const imgBuf = await downloadImage(slide.images[0].url);
        if (imgBuf) try { 
          // Big rounded image on the right
          s.addImage({ data: `image/jpeg;base64,${imgBuf.toString('base64')}`, x: 6.2, y: 0.8, w: 3.3, h: 4.0, rounding: true, shadow: { type: 'outer', blur: 10, offset: 5, color: '000000', opacity: 0.5 } }); 
        } catch (e) {}
      }
    } else {
      // Content Slide Layout
      let textOpts = { x: 0.5, y: 1.3, w: 9, h: 3.8, fontSize: 20, color: theme.text, align: 'left', valign: 'top', lineSpacing: 30, fontFace: 'Arial' };
      
      if (hasImage) {
        const imgBuf = await downloadImage(slide.images[0].url);
        if (imgBuf) {
          // Asymmetric Layout (Text on one side, Large Image on other)
          textOpts.x = imgRight ? 0.5 : 4.4; textOpts.w = 5.0;
          try { 
             const imgX = imgRight ? 5.8 : 0.5;
             s.addImage({ data: `image/jpeg;base64,${imgBuf.toString('base64')}`, x: imgX, y: 1.3, w: 3.7, h: 3.6, rounding: true, shadow: { type: 'outer', blur: 10, color: '000000', opacity: 0.4 } }); 
             // Decorative border for image
             s.addShape(pptx.shapes.RECTANGLE, { x: imgX - 0.05, y: 1.25, w: 3.8, h: 3.7, fill: { color: theme.accent, transparency: 80 }, line: { color: theme.accent, width: 1 } });
          } catch (e) {}
        }
      }
      
      if (slide.content?.length > 0) {
        s.addText(slide.content.map(p => ({ text: p, options: { bullet: { color: theme.accent }, color: theme.text } })), textOpts);
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
      const isTitle = i === 0; const hasImage = imageBuffers[i] !== null; const imgRight = (slide.layout === 'title-image-right') || (i % 2 === 0);
      const bgHex = '#' + (i % 2 === 0 ? theme.bg1 : theme.bg2); const accHex = '#' + theme.accent; const textHex = '#' + theme.text;
      
      doc.rect(0, 0, 792, 612).fill(bgHex);
      
      // Decorative PDF Accents
      doc.circle(750, 50, 100).fillOpacity(0.05).fill('#FFFFFF');
      doc.circle(50, 550, 80).fillOpacity(0.03).fill('#FFFFFF'); doc.fillOpacity(1);
      
      doc.rect(0, 0, 10, 612).fill(accHex); // Subtle side accent
      
      doc.font('Helvetica-Bold').fontSize(10).fillColor(accHex).text(`AlphaSlides AI | Professional`, 60, 580);
      doc.fillColor(textHex).text(`${i + 1}`, 740, 580);

      if (isTitle) {
        let titleW = hasImage ? 450 : 692;
        doc.font('Helvetica-Bold').fontSize(50).fillColor(textHex).text(strip(slide.title).toUpperCase(), 60, 180, { width: titleW, align: 'left' });
        if (slide.content) doc.font('Helvetica').fontSize(22).fillColor(accHex).text(strip(slide.content.join('  •  ')), 60, 320, { width: titleW, align: 'left' });
        
        if (hasImage) {
          try { 
            doc.rect(530, 80, 220, 420).fillOpacity(0.1).fill('#FFFFFF'); doc.fillOpacity(1);
            doc.image(imageBuffers[i], 520, 70, { width: 220, height: 420 }); 
            doc.rect(520, 70, 220, 420).lineWidth(3).stroke(accHex);
          } catch(e){}
        }
      } else {
        doc.rect(10, 0, 782, 65).fillOpacity(0.15).fill('#000000'); doc.fillOpacity(1);
        doc.font('Helvetica-Bold').fontSize(36).fillColor(textHex).text(strip(slide.title).toUpperCase(), 60, 15, { width: 692, align: 'left' });
        doc.rect(60, 55, 120, 3).fill(accHex);

        let contentX = 60, contentW = 692;
        if (hasImage) {
          contentW = 340; const imgX = imgRight ? 420 : 60; contentX = imgRight ? 60 : 420;
          try { 
            doc.image(imageBuffers[i], imgX, 100, { width: 340, height: 380 }); 
            doc.rect(imgX, 100, 340, 380).lineWidth(2).stroke(accHex); 
            // Aesthetic offset box
            doc.rect(imgX + 10, 110, 340, 380).lineWidth(1).strokeOpacity(0.3).stroke(accHex); doc.strokeOpacity(1);
          } catch(e){}
        }
        let y = 120;
        (slide.content || []).forEach(point => {
          doc.font('Helvetica').fontSize(22).fillColor(textHex).text('• ' + strip(point), contentX, y, { width: contentW, lineGap: 12 });
          y += doc.heightOfString('• ' + strip(point), { width: contentW, lineGap: 12 }) + 20;
        });
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
