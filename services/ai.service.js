const { GoogleGenerativeAI } = require('@google/generative-ai');
const fs = require('fs');
const path = require('path');
const pdf = require('pdf-parse');
const mammoth = require('mammoth');
const { getUnsplashImage } = require('./image.service');

const ai = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// Prioritized list of models
const MODELS = [
  'gemini-2.5-flash'
];

/**
 * Common AI parsing and processing logic with Fallback
 */
async function processAIResponse(promptText, preferredModel = 'gemini-2.5-flash') {
  let lastError = null;
  // Try preferred model first, then the rest of the list
  const modelsToTry = [preferredModel, ...MODELS.filter(m => m !== preferredModel)];
  
  for (const modelName of modelsToTry) {
    try {
      console.log(`🤖 Attempting with model: ${modelName}`);
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent(promptText);
      const response = await result.response;
      let text = response.text().trim();

      if (text.startsWith('```json')) text = text.slice(7, -3).trim();
      else if (text.startsWith('```')) text = text.slice(3, -3).trim();
      
      try {
        return JSON.parse(text);
      } catch (e) {
        return text;
      }
    } catch (error) {
      console.error(`⚠️ Model ${modelName} failed:`, error.message);
      lastError = error;
      // If error is 429 (Rate limit) or 503 (Overloaded) or other transient error, try next
      if (error.status === 429 || error.status === 503 || error.message.includes('quota') || error.message.includes('limit')) {
        continue;
      }
      // If it's a fatal error (e.g. invalid auth), maybe stop? But usually fallback is safer.
      continue;
    }
  }
  throw lastError || new Error("All AI models failed or quota exceeded.");
}

/**
 * Analyze Voice (STT) with Fallback
 */
async function analyzeVoice(buffer) {
  const modelsToTry = ['gemini-1.5-flash', ...MODELS.filter(m => m !== 'gemini-1.5-flash')];
  let lastError = null;
  
  for (const modelName of modelsToTry) {
    try {
      const model = ai.getGenerativeModel({ model: modelName });
      const result = await model.generateContent([
        "Transcribe this voice message and refine it into a clear presentation topic/prompt. Output ONLY the refined text.",
        { inlineData: { data: buffer.toString('base64'), mimeType: 'audio/ogg' } }
      ]);
      return result.response.text().trim();
    } catch (error) {
      console.error(`⚠️ Voice Analysis failed with ${modelName}:`, error.message);
      lastError = error;
      continue;
    }
  }
  throw lastError || new Error("Voice analysis failed.");
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
  1. Slide 1: Titul (Title, University/Faculty Placeholder, Author Placeholder, Date).
  2. Slide 2: Reja (Outline) with 3-5 main points.
  3. Body Slides: Professional content related to "${topic}".
  4. Penultimate Slide: Xulosa (Conclusion) summarizing key results.
  5. Final Slide: "E'tiboringiz uchun rahmat!" (Thank you).

  CONTENT RULES:
  - Max 5 bullet points per slide.
  - No long paragraphs. Use clear, concise keywords and short sentences.
  - Sarlavha (Title) must be clear.
  
  Format the response as a JSON object with a "slides" array. 
  Each slide object should have:
  - "title": a string 
  - "content": an array of 3-5 concise bullet points
  - "layout": a string (one of: 'title-text', 'title-image-left', 'title-image-right', 'two-column')
  - "imageKeyword": specific English keywords for high-quality Unsplash image.
  - "notes": speaker notes.
  Format as JSON: {"slides": [...]}`;

  const data = await processAIResponse(prompt);
  let slides = data.slides || (Array.isArray(data) ? data : [data]);

  // Fetch images from Unsplash for each slide
  const slidesWithImages = await Promise.all(slides.map(async (slide, idx) => {
    let imageUrl = null;
    if (slide.imageKeyword) {
      imageUrl = await getUnsplashImage(slide.imageKeyword);
    }
    
    // Fallback if Unsplash fails or no keyword
    if (!imageUrl) {
      const seed = Math.floor(Math.random() * 10000) + idx;
      const kw = slide.imageKeyword ? encodeURIComponent(slide.imageKeyword.replace(/\s+/g, '')) : 'minimal';
      imageUrl = `https://loremflickr.com/800/600/${kw}?lock=${seed}`;
    }
    
    console.log(`🖼️ [IMAGE] Slide ${idx+1} keyword: "${slide.imageKeyword}" | URL: ${imageUrl.substring(0, 40)}...`);
    return {
      ...slide,
      theme: template,
      images: [{ url: imageUrl, x: 100, y: 150, width: 400, height: 300 }]
    };
  }));

  return slidesWithImages;
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

    console.log(`🖼️ [IMAGE] DocSlide ${idx+1} result: ${imageUrl ? 'SUCCESS' : 'FAILED'}`);
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
    console.log(`🖼️ [IMAGE] Page ${idx+1} result: ${imageUrl ? 'SUCCESS (Unsplash)' : 'FAILED (None)'}`);
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
