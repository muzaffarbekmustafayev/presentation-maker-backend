const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Presentation = require('../models/Presentation');
const { GoogleGenAI } = require('@google/genai');
const multer = require('multer');
const upload = multer({ dest: 'uploads/' });

const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

// @route   POST api/presentations/generate
// @desc    Generate a presentation using AI
router.post('/generate', auth, async (req, res) => {
  const { topic, slideCount, template, language } = req.body;

  try {
    const prompt = `Create a professional presentation outline for the topic: "${topic}". 
    The presentation should have ${slideCount} slides. 
    Language: ${language}.
    Format the response as a JSON object with a "slides" array. 
    Each slide object should have:
    - "title": a string (catchy and informative)
    - "content": an array of 3-5 concise bullet points
    - "layout": a string (one of: 'title-text', 'title-image-left', 'title-image-right', 'two-column')
    - "imagePrompt": a detailed prompt to generate a relevant image for this slide (in English)
    - "notes": a detailed string for speaker notes.
    Provide ONLY the JSON object.`;


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const generatedData = JSON.parse(text);

    const newPresentation = new Presentation({
      title: topic,
      userId: req.user.id,
      topic,
      slides: generatedData.slides,
      template,
      slideCount,
      language
    });

    await newPresentation.save();
    res.json(newPresentation);
  } catch (err) {
    console.error(err);
    res.status(500).send('AI Generation failed');
  }
});

// @route   POST api/presentations/upload
// @desc    Upload document and generate presentation
router.post('/upload', auth, upload.single('file'), async (req, res) => {
  try {
    const { slideCount, template, language } = req.body;
    const fs = require('fs');
    const fileContent = fs.readFileSync(req.file.path, 'utf-8');
    
    const prompt = `Based on this document content, create a professional presentation with ${slideCount} slides in ${language}.
    Document: ${fileContent.substring(0, 5000)}
    
    Format the response as a JSON object with a "slides" array. 
    Each slide object should have:
    - "title": a string
    - "content": an array of 3-5 bullet points
    - "layout": a string
    - "imagePrompt": a detailed prompt to generate a relevant image for this slide (in English)
    - "notes": a string for speaker notes.
    Provide ONLY the JSON object.`;


    const response = await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: prompt,
    });

    const text = response.text.replace(/```json\n?|\n?```/g, '').trim();
    const generatedData = JSON.parse(text);

    const newPresentation = new Presentation({
      title: req.file.originalname.replace(/\.[^/.]+$/, ""),
      userId: req.user.id,
      topic: req.file.originalname,
      slides: generatedData.slides,
      template,
      slideCount,
      language
    });

    await newPresentation.save();
    fs.unlinkSync(req.file.path);
    res.json(newPresentation);
  } catch (err) {
    console.error(err);
    res.status(500).send('Upload failed');
  }
});

// @route   GET api/presentations
// @desc    Get all user presentations
router.get('/', auth, async (req, res) => {
  try {
    const presentations = await Presentation.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(presentations);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/presentations/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }
    res.json(presentation);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   PUT api/presentations/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }

    const { slides, title } = req.body;
    if (slides) presentation.slides = slides;
    if (title) presentation.title = title;

    await presentation.save();
    res.json(presentation);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/presentations/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }
    await presentation.deleteOne();
    res.json({ msg: 'Presentation removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/presentations/:id/share
router.post('/:id/share', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }
    const shareLink = `${req.protocol}://${req.get('host')}/share/${presentation._id}`;
    res.json({ shareLink });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   POST api/presentations/generate-image
// @desc    Generate/Suggest an image using AI (Gemini + Unsplash fallback)
router.post('/generate-image', auth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ msg: 'Prompt is required' });

  try {
    // We'll use Gemini to refine the search query for Unsplash to get better results
    const refinementPrompt = `Based on this description: "${prompt}", give me 1-3 keywords for a professional stock photo search. Provide ONLY the keywords separated by spaces.`;
    const model = ai.getGenerativeModel({ model: "gemini-2.0-flash-exp" }); // Using current best gemini model
    const result = await model.generateContent(refinementPrompt);
    const keywords = result.response.text().trim();

    const axios = require('axios');
    const unsplashRes = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(keywords)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
    
    res.json({ imageUrl: unsplashRes.data.urls.regular });
  } catch (err) {
    console.error('Gemini/Unsplash error:', err);
    try {
      // Direct fallback to Unsplash with original prompt
      const axios = require('axios');
      const unsplashRes = await axios.get(`https://api.unsplash.com/photos/random?query=${encodeURIComponent(prompt)}&client_id=${process.env.UNSPLASH_ACCESS_KEY}`);
      res.json({ imageUrl: unsplashRes.data.urls.regular });
    } catch (uErr) {
      res.status(500).send('Image search failed');
    }
  }
});


// @route   GET api/presentations/:id/export/pdf
router.get('/:id/export/pdf', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }

    const PDFDocument = require('pdfkit');
    const doc = new PDFDocument({ size: [792, 612] });
    
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${presentation.title}.pdf"`);
    doc.pipe(res);

    presentation.slides.forEach((slide, i) => {
      if (i > 0) doc.addPage();
      
      // Draw background if solid color
      if (slide.backgroundMode === 'solid' && slide.backgroundColor) {
        doc.rect(0, 0, 792, 612).fill(slide.backgroundColor);
      }

      doc.fontSize(32).fillColor(slide.textColor || '#1e293b').text(slide.title, 50, 50, { width: 692, align: slide.textAlign || 'left' });
      doc.fontSize(16).fillColor(slide.textColor || '#475569');
      
      let y = 150;
      slide.content?.forEach(point => {
        doc.text(`• ${point}`, 70, y, { width: 672, align: slide.textAlign || 'left' });
        y += 35;
      });

      // Add images if any
      slide.images?.forEach(img => {
        // PDFKit image handling might need image downloading first, skipping for now to keep it simple or use axios to get buffer
      });
    });

    doc.end();
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
});

// @route   GET api/presentations/:id/export/pptx
router.get('/:id/export/pptx', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }

    const PptxGenJS = require('pptxgenjs');
    const pptx = new PptxGenJS();
    const axios = require('axios');
    
    pptx.author = 'AlphaSlides';
    pptx.title = presentation.title;
    pptx.layout = 'LAYOUT_16x9';

    const gradientColors = {
      'Business': ['0066CC', '003366'],
      'Minimal': ['F1F5F9', 'E2E8F0'],
      'Technology': ['0E7490', '1E40AF'],
      'Education': ['10B981', '065F46'],
      'Startup': ['F97316', 'DB2777'],
      'Creative': ['8B5CF6', 'DB2777'],
      'Dark': ['111827', '030712'],
      'Corporate': ['4F46E5', '3730A3']
    };

    for (const [index, slide] of presentation.slides.entries()) {
      const pptxSlide = pptx.addSlide();
      const theme = slide.theme || presentation.template;
      const colors = gradientColors[theme] || gradientColors['Minimal'];
      
      // Background
      if (slide.backgroundMode === 'solid') {
        pptxSlide.background = { color: slide.backgroundColor?.replace('#', '') || 'FFFFFF' };
      } else {
        pptxSlide.background = { color: colors[0] };
      }
      
      const textColor = slide.textColor?.replace('#', '') || (['Minimal', 'Education'].includes(theme) ? '1E293B' : 'FFFFFF');

      // Title
      pptxSlide.addText(slide.title, {
        x: 0.5,
        y: 0.5,
        w: 9,
        h: 1,
        fontSize: index === 0 ? 44 : 32,
        bold: true,
        color: textColor,
        align: slide.textAlign || 'left',
        valign: 'middle'
      });
      
      // Content bullets
      if (slide.content && slide.content.length > 0) {
        pptxSlide.addText(slide.content.map(point => ({ text: point, options: { bullet: true } })), {
          x: 0.5,
          y: index === 0 ? 2.5 : 1.8,
          w: slide.images?.length > 0 ? 5 : 9,
          h: 4,
          fontSize: 18,
          color: textColor,
          align: slide.textAlign || 'left',
          valign: 'top',
          lineSpacing: 28
        });
      }

      // Add Images
      if (slide.images && slide.images.length > 0) {
        for (const img of slide.images) {
          try {
             // In a real app, we should probably handle scaling better. 
             // PptxGenJS can take URLs directly in some environments, or data:base64
             pptxSlide.addImage({
                path: img.url,
                x: img.x / 100, // naive coordinate mapping
                y: img.y / 100,
                w: img.width / 100,
                h: img.height / 100,
                rounding: true
             });
          } catch (imgErr) {
             console.error('Error adding image to PPTX:', imgErr);
          }
        }
      }

      // Add shapes as simple boxes if possible
      slide.shapes?.forEach(shape => {
          if (shape.type === 'rectangle' || shape.type === 'circle') {
              pptxSlide.addShape(shape.type === 'circle' ? pptx.ShapeType.ellipse : pptx.ShapeType.rect, {
                  x: shape.x / 100,
                  y: shape.y / 100,
                  w: shape.width / 100,
                  h: shape.height / 100,
                  fill: { color: shape.color?.replace('#', '') || 'CCCCCC', alpha: shape.opacity * 100 }
              });
          }
      });
      
      // Speaker notes
      if (slide.notes) {
          pptxSlide.addNotes(slide.notes);
      }
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${presentation.title}.pptx"`);
    res.send(buffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
});

module.exports = router;

