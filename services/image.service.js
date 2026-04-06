const axios = require('axios');

/**
 * Fetch a high-quality image from Unsplash based on keywords
 */
async function getUnsplashImage(query) {
  if (!process.env.UNSPLASH_ACCESS_KEY || !query) return null;
  
  const search = async (q) => {
    try {
      const response = await axios.get('https://api.unsplash.com/search/photos', {
        params: { query: q, per_page: 1, orientation: 'landscape' },
        headers: { Authorization: `Client-ID ${process.env.UNSPLASH_ACCESS_KEY}` }
      });
      return response.data.results?.[0]?.urls?.regular || null;
    } catch (e) { return null; }
  };

  // Try original query
  let url = await search(query);
  
  // If failed and multiple words, try just the first word
  if (!url && query.includes(' ')) {
    url = await search(query.split(' ')[0]);
  }
  
  return url;
}

module.exports = { getUnsplashImage };
