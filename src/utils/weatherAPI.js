const axios = require('axios');

class WeatherAPI {
    constructor() {
        // WeatherAPI.com - Free tier: 1M calls/month
        // Sign up at: https://www.weatherapi.com/signup.aspx
        this.apiKey = process.env.WEATHER_API_KEY || null;
        this.baseUrl = 'https://api.weatherapi.com/v1';
    }

    /**
     * Check if weather API is configured
     */
    isConfigured() {
        return this.apiKey !== null && this.apiKey !== '';
    }

    /**
     * Get current weather for a location
     */
    async getCurrentWeather(location) {
        if (!this.isConfigured()) {
            return null;
        }

        try {
            const response = await axios.get(`${this.baseUrl}/current.json`, {
                params: {
                    key: this.apiKey,
                    q: location,
                    aqi: 'no'
                },
                timeout: 5000
            });

            const data = response.data;
            
            return {
                location: `${data.location.name}, ${data.location.region}, ${data.location.country}`,
                temperature: {
                    celsius: data.current.temp_c,
                    fahrenheit: data.current.temp_f
                },
                condition: data.current.condition.text,
                humidity: data.current.humidity,
                windSpeed: {
                    kph: data.current.wind_kph,
                    mph: data.current.wind_mph
                },
                feelsLike: {
                    celsius: data.current.feelslike_c,
                    fahrenheit: data.current.feelslike_f
                },
                lastUpdated: data.current.last_updated
            };

        } catch (error) {
            console.error('Error fetching weather:', error.message);
            return null;
        }
    }

    /**
     * Format weather data for AI context
     */
    formatWeather(weatherData) {
        if (!weatherData) {
            return null;
        }

        return `Current Weather Information:
Location: ${weatherData.location}
Temperature: ${weatherData.temperature.celsius}°C (${weatherData.temperature.fahrenheit}°F)
Feels Like: ${weatherData.feelsLike.celsius}°C (${weatherData.feelsLike.fahrenheit}°F)
Condition: ${weatherData.condition}
Humidity: ${weatherData.humidity}%
Wind Speed: ${weatherData.windSpeed.kph} km/h (${weatherData.windSpeed.mph} mph)
Last Updated: ${weatherData.lastUpdated}`;
    }

    /**
     * Check if query is asking about weather
     */
    isWeatherQuery(query) {
        const weatherKeywords = [
            'weather', 'temperature', 'temp', 'forecast',
            'hot', 'cold', 'rain', 'snow', 'sunny', 'cloudy',
            'degrees', 'celsius', 'fahrenheit'
        ];

        const lowerQuery = query.toLowerCase();
        return weatherKeywords.some(keyword => lowerQuery.includes(keyword));
    }

    /**
     * Extract location from weather query
     */
    extractLocation(query) {
        // Simple location extraction
        const lowerQuery = query.toLowerCase();
        
        // Common patterns
        const patterns = [
            /weather in ([a-z\s]+)/i,
            /weather for ([a-z\s]+)/i,
            /weather at ([a-z\s]+)/i,
            /temperature in ([a-z\s]+)/i,
            /how'?s? (?:the )?weather in ([a-z\s]+)/i,
            /what'?s? (?:the )?weather (?:like )?in ([a-z\s]+)/i,
        ];

        for (const pattern of patterns) {
            const match = query.match(pattern);
            if (match && match[1]) {
                return match[1].trim();
            }
        }

        // If no pattern matches, try to find city names (basic approach)
        // This is a fallback and won't catch everything
        const words = query.split(' ');
        for (let i = 0; i < words.length; i++) {
            const word = words[i];
            // Check if word is capitalized (might be a city name)
            if (word.length > 2 && word[0] === word[0].toUpperCase()) {
                return word;
            }
        }

        return null;
    }
}

module.exports = new WeatherAPI();