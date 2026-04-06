const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const Document = require('../models/Document');
const multer = require('multer');
const upload = multer({ storage: multer.memoryStorage() });

const { generateDocPDF, generateDocDOCX } = require('../services/export.service');
const { generateDocument, generateDocumentFromDoc } = require('../services/ai.service');

// @route   POST api/documents/generate
router.post('/generate', auth, async (req, res) => {
  const { topic, pageCount, format, language } = req.body;

  try {
    const processedPages = await generateDocument(topic, pageCount, language);

    const newDocument = new Document({
      title: topic,
      userId: req.user.id,
      topic,
      pages: processedPages,
      format,
      language
    });

    await newDocument.save();
    res.json(newDocument);
  } catch (err) {
    console.error(err);
  }
});

// @route   POST api/documents/upload
router.post('/upload', auth, upload.single('file'), async (req, res) => {
    const { pageCount, format, language } = req.body;
    if (!req.file) return res.status(400).send('No file uploaded');

    try {
        const fileContent = req.file.buffer.toString('utf-8'); // Simplified for .txt, would need more for PDF/DOCX
        const processedPages = await generateDocumentFromDoc(fileContent, pageCount, language);

        const newDocument = new Document({
            title: req.file.originalname,
            userId: req.user.id,
            topic: `Generated from ${req.file.originalname}`,
            pages: processedPages,
            format,
            language
        });

        await newDocument.save();
        res.json(newDocument);
    } catch (err) {
        console.error(err);
        res.status(500).send('File processing failed');
    }
});

// @route   GET api/documents
router.get('/', auth, async (req, res) => {
  try {
    const documents = await Document.find({ userId: req.user.id }).sort({ createdAt: -1 });
    res.json(documents);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/documents/export-pdf/:id
router.get('/export-pdf/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const pdfBuffer = await generateDocPDF(document);
    res.set({
      'Content-Type': 'application/pdf',
      'Content-Disposition': `attachment; filename="${document.title.replace(/\s+/g, '_')}.pdf"`,
      'Content-Length': pdfBuffer.length
    });
    res.send(pdfBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
});

// @route   GET api/documents/export-docx/:id
router.get('/export-docx/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const docxBuffer = await generateDocDOCX(document);
    res.set({
      'Content-Type': 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      'Content-Disposition': `attachment; filename="${document.title.replace(/\s+/g, '_')}.docx"`,
      'Content-Length': docxBuffer.length
    });
    res.send(docxBuffer);
  } catch (err) {
    console.error(err);
    res.status(500).send('Export failed');
  }
});

// @route   PUT api/documents/:id
router.put('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Document not found' });
    }

    const { pages, title } = req.body;
    if (pages) document.pages = pages;
    if (title) document.title = title;

    await document.save();
    res.json(document);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   DELETE api/documents/:id
router.delete('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    await document.deleteOne();
    res.json({ msg: 'Document removed' });
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

// @route   GET api/documents/:id
router.get('/:id', auth, async (req, res) => {
  try {
    const document = await Document.findById(req.params.id);
    if (!document || document.userId.toString() !== req.user.id) {
      return res.status(404).json({ msg: 'Document not found' });
    }
    res.json(document);
  } catch (err) {
    res.status(500).send('Server Error');
  }
});

module.exports = router;
