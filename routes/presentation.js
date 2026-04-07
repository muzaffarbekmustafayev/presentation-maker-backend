const express = require('express');
const router = express.Router();

const path = require('path');
const auth = require('../middleware/auth');
const Presentation = require('../models/Presentation');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });



const { generateSlides, generateSlidesFromDoc, refineContent } = require('../services/ai.service');
const { generatePPTX, generatePDF } = require('../services/export.service');

// @route   POST api/presentations/refine-content
// @desc    Refine slide content using AI (Copilot)
router.post('/refine-content', auth, async (req, res) => {
  const { originalText, instruction, language } = req.body;
  try {
    const refinedText = await refineContent(originalText, instruction, language);
    res.json({ refinedText });
  } catch (err) {
    console.error(err);
    res.status(500).send('Refinement failed');
  }
});

// @route   POST api/presentations/generate
// @desc    Generate a presentation using AI
router.post('/generate', auth, async (req, res) => {
  const { topic, slideCount, template, language } = req.body;

  try {
    const processedSlides = await generateSlides(topic, slideCount, template, language);

    const newPresentation = new Presentation({
      title: topic,
      userId: req.user.id,
      topic,
      slides: processedSlides,
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
    const ext = path.extname(req.file.originalname).toLowerCase();
    
    const { parseDocument, generateSlidesFromDoc } = require('../services/ai.service');
    const fileContent = await parseDocument(req.file.buffer, ext);

    const processedSlides = await generateSlidesFromDoc(fileContent, slideCount, template, language);

    const newPresentation = new Presentation({
      title: req.file.originalname.replace(/\.[^/.]+$/, ""),
      userId: req.user.id,
      topic: req.file.originalname,
      slides: processedSlides,
      template,
      slideCount,
      language
    });

    await newPresentation.save();
    res.json(newPresentation);
  } catch (err) {
    console.error('Upload error:', err);
    res.status(500).send('Upload/Generation failed');
  } finally {
    if (req.file && req.file.path && fs.existsSync(req.file.path)) {
      fs.unlinkSync(req.file.path);
    }
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
// @desc    Suggest an image keyword and fetch a stock photo using LoremFlickr API
router.post('/generate-image', auth, async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ msg: 'Prompt is required' });

  try {
    const keywords = await refineImageKeywords(prompt);
    const seed = Math.floor(Math.random() * 1000);
    const imageUrl = `https://loremflickr.com/800/600/${encodeURIComponent(keywords.replace(/\s+/g, ''))}?lock=${seed}`;
    
    res.json({ imageUrl });
  } catch (err) {
    console.error('Image search error:', err);
    res.status(500).send('Image search failed');
  }
});


// @route   GET api/presentations/:id/export/pdf
router.get('/:id/export/pdf', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }

    const pdfBuffer = await generatePDF(presentation);
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename="${presentation.title.replace(/\s+/g, '_')}.pdf"`);
    res.send(pdfBuffer);
  } catch (err) {
    console.error('PDF Export Error:', err);
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

    const buffer = await generatePPTX(presentation);
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.presentationml.presentation');
    res.setHeader('Content-Disposition', `attachment; filename="${presentation.title.replace(/\s+/g, '_')}.pptx"`);
    res.send(buffer);
  } catch (err) {
    console.error('PPTX Export Error:', err);
    res.status(500).send('Export failed');
  }
});

// @route   GET api/presentations/:id/export/html
router.get('/:id/export/html', auth, async (req, res) => {
  try {
    const presentation = await Presentation.findById(req.params.id);
    if (!presentation || presentation.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Presentation not found' });
    }

    const html = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>${presentation.title}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        body, html { margin: 0; padding: 0; overflow-x: hidden; scroll-snap-type: y mandatory; font-family: 'Inter', sans-serif; }
        .slide { height: 100vh; width: 100vw; display: flex; flex-direction: column; justify-content: center; align-items: center; scroll-snap-align: start; position: relative; overflow: hidden; padding: 2rem; }
      </style>
    </head>
    <body class="bg-slate-900 text-white font-sans">
      ${presentation.slides.map((s, i) => `
        <div class="slide" style="background-color: ${s.backgroundColor || '#0f172a'}; color: ${s.textColor || 'white'}; text-align: ${s.textAlign || 'left'};">
          <h1 class="text-5xl font-extrabold mb-8 max-w-5xl w-full">${s.title}</h1>
          <ul class="text-2xl space-y-4 max-w-5xl w-full">
            ${s.content && s.content.length ? s.content.map(c => `<li>• ${c}</li>`).join('') : ''}
          </ul>
          ${s.images ? s.images.map(img => `<img src="${img.url}" style="position: absolute; left: ${img.x}px; top: ${img.y}px; width: ${img.width}px; height: ${img.height}px; border-radius: 8px; box-shadow: 0 10px 15px rgba(0,0,0,0.1);" />`).join('') : ''}
          <div style="position: absolute; bottom: 20px; left: 0; width: 100%; text-align: center; opacity: 0.5; font-size: 14px; font-weight: bold;">
            ${i + 1} / ${presentation.slides.length}
          </div>
        </div>
      `).join('')}
    </body>
    </html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.setHeader('Content-Disposition', `attachment; filename="${presentation.title.replace(/\s+/g, '_')}.html"`);
    res.send(html);
  } catch (err) {
    console.error('HTML Export Error:', err);
    res.status(500).send('Export failed');
  }
});

module.exports = router;
