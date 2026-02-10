const axios = require('axios');

class WebSearch {
    constructor() {
        this.searchCache = new Map();
        this.cacheTimeout = 3600000; // 1 hour cache
    }

    /**
     * Search the web using DuckDuckGo
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

            // Use DuckDuckGo Instant Answer API
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: query,
                    format: 'json',
                    no_html: 1,
                    skip_disambig: 1
                },
                timeout: 10000
            });

            const results = [];

            // Get instant answer if available
            if (response.data.AbstractText) {
                results.push({
                    title: response.data.Heading || 'Instant Answer',
                    snippet: response.data.AbstractText,
                    url: response.data.AbstractURL || '',
                    source: response.data.AbstractSource || 'DuckDuckGo'
                });
            }

            // Get related topics
            if (response.data.RelatedTopics && response.data.RelatedTopics.length > 0) {
                for (const topic of response.data.RelatedTopics.slice(0, maxResults - results.length)) {
                    if (topic.Text && topic.FirstURL) {
                        results.push({
                            title: topic.Text.split(' - ')[0] || 'Related',
                            snippet: topic.Text,
                            url: topic.FirstURL,
                            source: 'DuckDuckGo'
                        });
                    }
                }
            }

            // If no results from DuckDuckGo API, try alternative method
            if (results.length === 0) {
                const htmlResults = await this.searchHTML(query, maxResults);
                results.push(...htmlResults);
            }

            // Cache results
            this.searchCache.set(cacheKey, {
                results,
                timestamp: Date.now()
            });

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
     * Alternative HTML-based search (fallback)
     */
    async searchHTML(query, maxResults = 5) {
        try {
            const response = await axios.get('https://html.duckduckgo.com/html/', {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
                },
                timeout: 10000
            });

            const results = [];
            const html = response.data;

            // Simple regex parsing (not ideal but works for basic results)
            const resultRegex = /<a class="result__a" href="([^"]+)">([^<]+)<\/a>[\s\S]*?<a class="result__snippet"[^>]*>([^<]+)<\/a>/g;
            let match;
            let count = 0;

            while ((match = resultRegex.exec(html)) !== null && count < maxResults) {
                results.push({
                    title: this.decodeHTML(match[2]),
                    snippet: this.decodeHTML(match[3]),
                    url: this.decodeHTML(match[1]),
                    source: 'DuckDuckGo'
                });
                count++;
            }

            return results;

        } catch (error) {
            console.error('Error in HTML search:', error.message);
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
     * Decode HTML entities
     */
    decodeHTML(text) {
        return text
            .replace(/&amp;/g, '&')
            .replace(/&lt;/g, '<')
            .replace(/&gt;/g, '>')
            .replace(/&quot;/g, '"')
            .replace(/&#39;/g, "'")
            .replace(/&nbsp;/g, ' ');
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