const axios = require('axios');
const cheerio = require('cheerio');

class WebSearch {
    constructor() {
        this.searchCache = new Map();
        this.cacheTimeout = 3600000; // 1 hour cache
    }

    /**
     * Search the web using multiple methods
     * @param {string} query - Search query
     * @param {number} maxResults - Maximum number of results to return
     * @returns {Promise<Array>} Search results
     */
    async search(query, maxResults = 5) {
        try {
            // Check cache first
            const cacheKey = `${query}-${maxResults}`;
            const cached = this.searchCache.get(cacheKey);
            
            if (cached && (Date.now() - cached.timestamp) < this.cacheTimeout) {
                console.log(`📦 Using cached search results for: ${query}`);
                return cached.results;
            }

            console.log(`🔍 Searching web for: ${query}`);

            // Try multiple search methods in order
            let results = [];
            
            // Method 1: DuckDuckGo HTML scraping (most reliable)
            results = await this.searchDuckDuckGoHTML(query, maxResults);
            
            // Method 2: If DDG fails, try Brave Search (no API key needed)
            if (results.length === 0) {
                console.log('⚠️  DDG failed, trying Brave Search...');
                results = await this.searchBrave(query, maxResults);
            }

            // Method 3: If both fail, try DuckDuckGo Lite
            if (results.length === 0) {
                console.log('⚠️  Brave failed, trying DDG Lite...');
                results = await this.searchDuckDuckGoLite(query, maxResults);
            }

            // Cache results if we got any
            if (results.length > 0) {
                this.searchCache.set(cacheKey, {
                    results,
                    timestamp: Date.now()
                });
            }

            // Clean old cache entries
            this.cleanCache();

            console.log(`✅ Found ${results.length} search results`);
            return results;

        } catch (error) {
            console.error('Error performing web search:', error.message);
            return [];
        }
    }

    /**
     * Search using DuckDuckGo HTML scraping
     */
    async searchDuckDuckGoHTML(query, maxResults = 5) {
        try {
            const response = await axios.get('https://html.duckduckgo.com/html/', {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5',
                    'Accept-Encoding': 'gzip, deflate',
                    'DNT': '1',
                    'Connection': 'keep-alive',
                    'Upgrade-Insecure-Requests': '1'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            // Parse search results
            $('.result').each((i, element) => {
                if (results.length >= maxResults) return false;

                const $result = $(element);
                const $link = $result.find('.result__a');
                const $snippet = $result.find('.result__snippet');
                
                const title = $link.text().trim();
                const url = $link.attr('href');
                const snippet = $snippet.text().trim();

                if (title && url && snippet) {
                    // Clean up the URL (DDG sometimes wraps it)
                    let cleanUrl = url;
                    if (url.includes('uddg=')) {
                        const match = url.match(/uddg=([^&]+)/);
                        if (match) {
                            cleanUrl = decodeURIComponent(match[1]);
                        }
                    }

                    results.push({
                        title: this.cleanText(title),
                        snippet: this.cleanText(snippet),
                        url: cleanUrl,
                        source: 'DuckDuckGo'
                    });
                }
            });

            return results;

        } catch (error) {
            console.error('Error in DuckDuckGo HTML search:', error.message);
            return [];
        }
    }

    /**
     * Search using Brave Search (no API key needed for basic search)
     */
    async searchBrave(query, maxResults = 5) {
        try {
            const response = await axios.get('https://search.brave.com/search', {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                    'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
                    'Accept-Language': 'en-US,en;q=0.5'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            // Parse Brave search results
            $('.snippet').each((i, element) => {
                if (results.length >= maxResults) return false;

                const $result = $(element);
                const $title = $result.find('.snippet-title');
                const $url = $result.find('.snippet-url');
                const $description = $result.find('.snippet-description');

                const title = $title.text().trim();
                const url = $url.attr('href') || $url.text().trim();
                const snippet = $description.text().trim();

                if (title && url && snippet) {
                    results.push({
                        title: this.cleanText(title),
                        snippet: this.cleanText(snippet),
                        url: url,
                        source: 'Brave Search'
                    });
                }
            });

            return results;

        } catch (error) {
            console.error('Error in Brave search:', error.message);
            return [];
        }
    }

    /**
     * Search using DuckDuckGo Lite (simpler HTML)
     */
    async searchDuckDuckGoLite(query, maxResults = 5) {
        try {
            const response = await axios.get('https://lite.duckduckgo.com/lite/', {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const $ = cheerio.load(response.data);
            const results = [];

            // Parse DDG Lite results
            $('tr').each((i, element) => {
                if (results.length >= maxResults) return false;

                const $row = $(element);
                const $link = $row.find('a[rel="nofollow"]').first();
                const $snippet = $row.find('.result-snippet');

                if ($link.length && $snippet.length) {
                    const title = $link.text().trim();
                    const url = $link.attr('href');
                    const snippet = $snippet.text().trim();

                    if (title && url && snippet) {
                        results.push({
                            title: this.cleanText(title),
                            snippet: this.cleanText(snippet),
                            url: url,
                            source: 'DuckDuckGo'
                        });
                    }
                }
            });

            return results;

        } catch (error) {
            console.error('Error in DDG Lite search:', error.message);
            return [];
        }
    }

    /**
     * Format search results for AI context
     */
    formatResults(results) {
        if (results.length === 0) {
            return 'No search results found.';
        }

        let formatted = 'Web Search Results:\n\n';
        
        results.forEach((result, index) => {
            formatted += `${index + 1}. ${result.title}\n`;
            formatted += `   ${result.snippet}\n`;
            if (result.url) {
                formatted += `   Source: ${result.url}\n`;
            }
            formatted += '\n';
        });

        return formatted;
    }

    /**
     * Clean text by removing extra whitespace and HTML entities
     */
    cleanText(text) {
        return text
            .replace(/\s+/g, ' ')
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ')
            .trim();
    }

    /**
     * Clean old cache entries
     */
    cleanCache() {
        const now = Date.now();
        for (const [key, value] of this.searchCache.entries()) {
            if (now - value.timestamp > this.cacheTimeout) {
                this.searchCache.delete(key);
            }
        }
    }

    /**
     * Check if a query needs web search
     */
    needsWebSearch(query) {
        const searchIndicators = [
            'current', 'today', 'now', 'latest', 'recent',
            'weather', 'news', 'price', 'stock',
            'what is', 'who is', 'when did', 'where is',
            'how to', 'search for', 'find', 'look up',
            '2024', '2025', '2026', // Current years
        ];

        const lowerQuery = query.toLowerCase();
        return searchIndicators.some(indicator => lowerQuery.includes(indicator));
    }
}

module.exports = new WebSearch();