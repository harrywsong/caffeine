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

            // Try HTML search first (more reliable)
            let results = await this.searchHTML(query, maxResults);

            // If HTML search fails, try API
            if (results.length === 0) {
                results = await this.searchAPI(query, maxResults);
            }

            // Cache results
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
     * Search using DuckDuckGo API
     */
    async searchAPI(query, maxResults = 5) {
        try {
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

            return results;

        } catch (error) {
            console.error('Error in API search:', error.message);
            return [];
        }
    }

    /**
     * Alternative HTML-based search (more reliable)
     */
    async searchHTML(query, maxResults = 5) {
        try {
            // Use DuckDuckGo Lite (simpler HTML, easier to parse)
            const response = await axios.get('https://lite.duckduckgo.com/lite/', {
                params: { q: query },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
                },
                timeout: 10000
            });

            const results = [];
            const html = response.data;

            // Parse DuckDuckGo Lite results
            // Format: <a rel="nofollow" href="URL">TITLE</a>
            // Followed by: <td class="result-snippet">SNIPPET</td>
            
            const linkRegex = /<a rel="nofollow" href="([^"]+)">([^<]+)<\/a>/g;
            const snippetRegex = /<td class="result-snippet">([^<]+)<\/td>/g;
            
            const links = [];
            const snippets = [];
            
            let linkMatch;
            while ((linkMatch = linkRegex.exec(html)) !== null) {
                links.push({
                    url: this.decodeHTML(linkMatch[1]),
                    title: this.decodeHTML(linkMatch[2])
                });
            }
            
            let snippetMatch;
            while ((snippetMatch = snippetRegex.exec(html)) !== null) {
                snippets.push(this.decodeHTML(snippetMatch[1]));
            }

            // Combine links and snippets
            for (let i = 0; i < Math.min(links.length, snippets.length, maxResults); i++) {
                if (links[i] && snippets[i]) {
                    results.push({
                        title: links[i].title,
                        snippet: snippets[i],
                        url: links[i].url,
                        source: 'DuckDuckGo'
                    });
                }
            }

            // If still no results, try a simpler approach
            if (results.length === 0) {
                console.log('⚠️  HTML parsing failed, trying fallback method...');
                return await this.searchFallback(query, maxResults);
            }

            return results;

        } catch (error) {
            console.error('Error in HTML search:', error.message);
            return [];
        }
    }

    /**
     * Fallback search method using a different approach
     */
    async searchFallback(query, maxResults = 5) {
        try {
            // Use DuckDuckGo's JSON endpoint with different parameters
            const response = await axios.get('https://api.duckduckgo.com/', {
                params: {
                    q: query,
                    format: 'json',
                    pretty: 1,
                    no_redirect: 1,
                    no_html: 1,
                    skip_disambig: 1,
                    t: 'discord-bot'
                },
                headers: {
                    'User-Agent': 'Mozilla/5.0 (compatible; DiscordBot/1.0)'
                },
                timeout: 10000
            });

            const results = [];
            const data = response.data;

            // Try to get any available information
            if (data.Abstract) {
                results.push({
                    title: data.Heading || 'Information',
                    snippet: data.Abstract,
                    url: data.AbstractURL || '',
                    source: data.AbstractSource || 'DuckDuckGo'
                });
            }

            // Check Results array
            if (data.Results && data.Results.length > 0) {
                for (const result of data.Results.slice(0, maxResults - results.length)) {
                    if (result.Text && result.FirstURL) {
                        results.push({
                            title: result.Text.split(' - ')[0] || 'Result',
                            snippet: result.Text,
                            url: result.FirstURL,
                            source: 'DuckDuckGo'
                        });
                    }
                }
            }

            return results;

        } catch (error) {
            console.error('Error in fallback search:', error.message);
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