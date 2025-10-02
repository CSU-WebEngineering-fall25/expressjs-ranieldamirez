const fetch = require('node-fetch');

class XKCDService {
  constructor() {
    this.baseUrl = 'https://xkcd.com';
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }

  async getLatest() {
    const cacheKey = 'latest';
    const cached = this.cache.get(cacheKey);
    
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      return cached.data;
    }

    try {
      const response = await fetch(`${this.baseUrl}/info.0.json`);
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
      
      const comic = await response.json();
      const processedComic = this.processComic(comic);
      
      this.cache.set(cacheKey, {
        data: processedComic,
        timestamp: Date.now()
      });
      
      return processedComic;
    } catch (error) {
      throw new Error(`Failed to fetch latest comic: ${error.message}`);
    }
  }

  // TODO: Implement getById method
  async getById(id) {
    // Validate that id is a positive integer
    // Check cache first using key `comic-${id}`
    // Fetch from https://xkcd.com/${id}/info.0.json
    // Handle 404 errors appropriately (throw 'Comic not found')
    // Handle other HTTP errors
    // Process and cache the result
    // Return processed comic
    throw new Error('getById method not implemented');
  }

  // TODO: Implement getRandom method
  async getRandom() {
    // Get the latest comic to know the maximum ID
    // Generate random number between 1 and latest.id
    // Use getById to fetch the random comic
    // Handle any errors appropriately
    throw new Error('getRandom method not implemented');
  }

  // TODO: Implement search method
  async search(query, page = 1, limit = 10) {
    // This is a simplified search implementation
    // Get latest comic to know the range
    // Calculate offset from page and limit
    // Search through recent comics (e.g., last 100) for title/transcript matches
    // Return object with: query, results array, total, pagination object
    throw new Error('search method not implemented');
  }

  processComic(comic) {
    return {
      id: comic.num,
      title: comic.title,
      img: comic.img,
      alt: comic.alt,
      transcript: comic.transcript || '',
      year: comic.year,
      month: comic.month,
      day: comic.day,
      safe_title: comic.safe_title
    };
  }
}

module.exports = new XKCDService();
