const axios = require('axios');
const fs = require('fs');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { getUnsplashImage } = require('./image.service');

const API_KEY = process.env.GEMINI_API_KEY;
const BASE_URL = 'https://generativelanguage.googleapis.com/v1beta';
const MODEL = 'gemini-2.5-flash';

/**
 * Common AI parsing and processing logic
 */
async function processAIResponse(promptText) {
  try {
    console.log(`🤖 Requesting Gemini AI (${MODEL})...`);
    
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [{ text: promptText }]
      }]
    });

    if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
      throw new Error('Invalid response from Gemini AI');
    }

    let text = response.data.candidates[0].content.parts[0].text.trim();

    // Clean JSON formatting if present
    if (text.startsWith('```json')) {
      text = text.replace(/^```json/, '').replace(/```$/, '').trim();
    } else if (text.startsWith('```')) {
      text = text.replace(/^```/, '').replace(/```$/, '').trim();
    }
    
    try {
      const parsed = JSON.parse(text);
      
      // Sanitization: Ensure slides and their content are in correct format
      if (parsed.slides && Array.isArray(parsed.slides)) {
        parsed.slides = parsed.slides.map(slide => {
          if (slide.content && Array.isArray(slide.content)) {
            // Convert any objects/arrays inside content to simple strings
            slide.content = slide.content.map(item => {
              if (typeof item === 'object') {
                // If AI returns something like {label: '..', value: '..'}, flatten it
                return Object.values(item).filter(v => typeof v === 'string' || typeof v === 'number').join(': ');
              }
              return String(item);
            });
          } else if (slide.content && typeof slide.content === 'string') {
            slide.content = [slide.content];
          } else {
            slide.content = [];
          }
          return slide;
        });
      }
      
      return parsed;
    } catch (e) {
      return text;
    }
  } catch (error) {
    console.error(`❌ Gemini AI Error (${MODEL}):`, error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Analyze Voice (STT)
 */
async function analyzeVoice(buffer) {
  try {
    const url = `${BASE_URL}/models/${MODEL}:generateContent?key=${API_KEY}`;
    
    const response = await axios.post(url, {
      contents: [{
        parts: [
          { text: "Transcribe this voice message and refine it into a clear presentation topic/prompt. Output ONLY the refined text." },
          { inlineData: { data: buffer.toString('base64'), mimeType: 'audio/ogg' } }
        ]
      }]
    });

    if (!response.data || !response.data.candidates || !response.data.candidates[0]) {
      throw new Error('Invalid response from Gemini AI during voice analysis');
    }

    return response.data.candidates[0].content.parts[0].text.trim();
  } catch (error) {
    console.error(`❌ Voice Analysis failed:`, error.response ? error.response.data : error.message);
    throw error;
  }
}

/**
 * Parse Document Content
 */
async function parseDocument(filePath, ext) {
  let content = '';
  if (ext === '.pdf') {
    const dataBuffer = fs.readFileSync(filePath);
    const data = await pdf(dataBuffer);
    content = data.text;
  } else if (ext === '.docx' || ext === '.doc') {
    const data = await mammoth.extractRawText({ path: filePath });
    content = data.value;
  } else {
    content = fs.readFileSync(filePath, 'utf-8');
  }
  return content;
}

/**
 * Generate Presentation Slides
 */
async function generateSlides(topic, slideCount, template, language) {
  const prompt = `Create a professional and academic-standard presentation outline for: "${topic}". 
  Total slides: ${slideCount}. 
  Language: ${language}.
  
  MANDATORY STRUCTURE:
  1. Slide 1: Titul (Title, Subtitle/Organization, Author, Date).
  2. Slide 2: Mundarija (Table of Contents) with clear points.
  3. Body Slides: Professional analysis, data, and insights.
  4. Penultimate Slide: Xulosa (Conclusion) or Summary.
  5. Final Slide: Minnatdorchilik (Thank you / Q&A).

  LAYOUT OPTIONS (MANDATORY):
  - 'title-content': Standard text title and bullets. Use for regular info slides.
  - 'title-image-left': Image on the left, text/bullets on the right.
  - 'title-image-right': Image on the right, text/bullets on the left.
  - 'two-column': Two side-by-side bullet lists. Use for comparisons or dense info.
  - 'big-quote': A large impactful quote or key statement.
  - 'stats-grid': Key metrics or 3-4 short points in a grid/boxes. Use for data or summary.

  CONTENT RULES:
  - Be concise. Use professional terminology.
  - Prefer strong keywords over long sentences.
  - Language: ${language}.
  
  Format as JSON: {"slides": [{"title": "...", "content": ["..."], "layout": "title-content | title-image-left | title-image-right | two-column | big-quote | stats-grid", "imageKeyword": "...", "notes": "...", "charts": [{"type": "bar | pie | line", "title": "...", "data": [{"label": "...", "value": 100}]}]}]}`;

  const data = await processAIResponse(prompt);
  let slides = data.slides || (Array.isArray(data) ? data : [data]);

  const slidesWithImages = await Promise.all(slides.map(async (slide, idx) => {
    let imageUrl = null;
    if (slide.imageKeyword) {
      imageUrl = await getUnsplashImage(slide.imageKeyword);
    }
    
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 10000) + idx;
      const kw = slide.imageKeyword ? encodeURIComponent(slide.imageKeyword.replace(/\s+/g, '')) : 'professional';
      imageUrl = `https://loremflickr.com/800/600/${kw}?lock=${seed}`;
    }
    
    return {
      ...slide,
      theme: template,
      images: [{ url: imageUrl, x: 100, y: 150, width: 400, height: 300 }]
    };
  }));

  return slidesWithImages;
}

/**
 * AI Copilot: Refine specific content
 */
async function refineContent(originalText, instruction, language = 'English') {
  const prompt = `Act as a professional editor. 
  Original text: "${originalText}"
  Instruction: "${instruction}"
  Language: ${language}
  
  Provide only the refined text. No extra explanations.`;
  
  return await processAIResponse(prompt);
}

/**
 * Translate Presentation
 */
async function translatePresentation(presentation, targetLang) {
  const prompt = `Translate the following presentation to ${targetLang}. 
  Content: ${JSON.stringify(presentation.slides)}
  Maintain the same JSON structure. Provide ONLY the JSON.`;
  
  const data = await processAIResponse(prompt);
  return data.slides || data;
}

/**
 * Generate Presentation from Document
 */
async function generateSlidesFromDoc(content, slideCount, template, language) {
  const prompt = `Based on this document, create a professional presentation with ${slideCount} slides in ${language}. 
  Document content: ${content.substring(0, 15000)}
  
  LAYOUT OPTIONS (MANDATORY):
  - 'title-content': Standard text title and bullets.
  - 'title-image-left': Image on the left, text/bullets on the right.
  - 'title-image-right': Image on the right, text/bullets on the left.
  - 'two-column': Two side-by-side bullet lists.
  - 'big-quote': A large impactful quote or key statement.
  - 'stats-grid': Key metrics or 3-4 short points in a grid.

  Format the response as a JSON object with a "slides" array.
  Each slide must have "title", "content" (array), "layout", "imageKeyword" (English keyword), and "notes".`;
  
  const data = await processAIResponse(prompt);
  let slides = data.slides || (Array.isArray(data) ? data : [data]);

  const slidesWithImages = await Promise.all(slides.map(async (slide, idx) => {
    let imageUrl = null;
    if (slide.imageKeyword) {
      imageUrl = await getUnsplashImage(slide.imageKeyword);
    }
    
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 10000) + idx;
      const kw = slide.imageKeyword ? encodeURIComponent(slide.imageKeyword.replace(/\s+/g, '')) : 'abstract';
      imageUrl = `https://loremflickr.com/800/600/${kw}?lock=${seed}`;
    }

    return {
      ...slide,
      theme: template,
      images: [{ url: imageUrl, x: 100, y: 150, width: 400, height: 300 }]
    };
  }));

  return slidesWithImages;
}

/**
 * Generate Document Pages
 */
async function generateDocument(topic, pageCount, language, docType = 'General') {
  const prompt = `Create a professional and academic ${docType} for: "${topic}". 
  Total pages: ${pageCount}.
  Language: ${language}.
  
  ACADEMIC STRUCTURE FOR ${docType}:
  - Follow standard Uzbek/International academic hierarchy.
  - Include: Titul (Placeholder), Mundarija (Table of Contents), Kirish (Introduction), Main Body (Chapters/Sections), Xulosa (Conclusion), and Adabiyotlar (References).
  - For "Diplom ishi": Ensure depth of research and clear chapters.
  - For "Referat": Focus on theoretical synthesis.
  - For "Laboratoriya": Include Goal, Tools, Steps, and Result placeholders.

  Format as JSON with a "pages" array. Each page object:
  - "title": A clear academic heading.
  - "content": Detailed content using Semantic HTML (<h2>, <h3>, <p>, <ul>, <li>).
  - "imageKeyword": English keywords for relevant academic/technical stock photo.`;

  const data = await processAIResponse(prompt);
  let pages = data.pages || (Array.isArray(data) ? data : [data]);

  const pagesWithImages = await Promise.all(pages.map(async (page, idx) => {
    let imageUrl = null;
    if (page.imageKeyword) {
      imageUrl = await getUnsplashImage(page.imageKeyword);
    }
    return {
      ...page,
      images: imageUrl ? [{ url: imageUrl }] : []
    };
  }));

  return pagesWithImages;
}

/**
 * Generate Document from Source Text
 */
async function generateDocumentFromDoc(content, pageCount, language, docType = 'General') {
  const prompt = `Based on this source text, create a professional academic ${docType} with ${pageCount} pages in ${language}.
  Source: ${content.substring(0, 15000)}
  
  MANDATORY STRUCTURE:
  - Transform the source into a formal ${docType} format.
  - Include academic sections: Titul, Reja, Kirish, Main Body, Xulosa, Adabiyotlar.
  
  Format as JSON with a "pages" array.
  Each page must have "title", "content" (HTML), and "imageKeyword" (English).`;

  const data = await processAIResponse(prompt);
  let pages = data.pages || (Array.isArray(data) ? data : [data]);

  const pagesWithImages = await Promise.all(pages.map(async (page, idx) => {
    let imageUrl = null;
    if (page.imageKeyword) {
      imageUrl = await getUnsplashImage(page.imageKeyword);
    }
    return {
      ...page,
      images: imageUrl ? [{ url: imageUrl }] : []
    };
  }));

  return pagesWithImages;
}

module.exports = {
  generateSlides,
  generateSlidesFromDoc,
  generateDocument,
  generateDocumentFromDoc,
  analyzeVoice,
  parseDocument,
  translatePresentation
};
