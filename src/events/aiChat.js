const axios = require('axios');

// Configuration
const AI_CHANNEL_ID = '1470922509762298120'; // Hardcoded AI channel
const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';
const MAX_RESPONSE_TIME = 60000; // 60 seconds
const RATE_LIMIT_SECONDS = 30; // 30 seconds between requests per user
const CONTEXT_MESSAGES = 10; // Number of previous messages to include as context

// Rate limiting
const userLastRequest = new Map();

module.exports = {
    name: 'messageCreate',
    async execute(message) {
        // Ignore bots
        if (message.author.bot) return;

        // Only respond in the designated AI channel
        if (message.channel.id !== AI_CHANNEL_ID) return;

        // Check rate limit
        const userId = message.author.id;
        const now = Date.now();
        const lastRequest = userLastRequest.get(userId);
        
        if (lastRequest && (now - lastRequest) < RATE_LIMIT_SECONDS * 1000) {
            const remainingTime = Math.ceil((RATE_LIMIT_SECONDS * 1000 - (now - lastRequest)) / 1000);
            return message.reply(`⏳ Please wait ${remainingTime} seconds before sending another message.`);
        }

        // Ignore empty messages or messages with only attachments
        if (!message.content || message.content.trim().length === 0) return;

        // Ignore commands (messages starting with /)
        if (message.content.startsWith('/')) return;

        try {
            // Show typing indicator
            await message.channel.sendTyping();

            // Update rate limit
            userLastRequest.set(userId, now);

            // Fetch recent messages for context
            const contextMessages = await fetchContextMessages(message.channel, message.id);

            // Send to Ollama with context
            const response = await generateAIResponse(
                message.content, 
                message.author.username,
                contextMessages
            );

            // Split long responses into multiple messages (Discord limit: 2000 chars)
            if (response.length > 2000) {
                const chunks = splitMessage(response, 2000);
                for (const chunk of chunks) {
                    await message.reply(chunk);
                }
            } else {
                await message.reply(response);
            }

            console.log(`🤖 AI response sent to ${message.author.tag} in AI channel`);

        } catch (error) {
            console.error('Error generating AI response:', error);
            
            let errorMessage = '❌ Sorry, I encountered an error generating a response.';
            
            if (error.code === 'ECONNREFUSED') {
                errorMessage = '❌ AI service is not running. Please contact an administrator.';
            } else if (error.message.includes('timeout')) {
                errorMessage = '⏱️ Response took too long. Please try a simpler question.';
            }
            
            await message.reply(errorMessage);
        }
    },
};

async function fetchContextMessages(channel, currentMessageId) {
    try {
        // Fetch recent messages before the current one
        const messages = await channel.messages.fetch({ 
            limit: CONTEXT_MESSAGES,
            before: currentMessageId 
        });

        // Convert to array and reverse to get chronological order
        const messageArray = Array.from(messages.values()).reverse();

        // Format messages for context
        const context = messageArray
            .filter(msg => !msg.author.bot || msg.author.id === channel.client.user.id) // Include user messages and bot's own responses
            .map(msg => {
                const author = msg.author.bot ? 'Assistant' : msg.author.username;
                return `${author}: ${msg.content}`;
            });

        return context;

    } catch (error) {
        console.error('Error fetching context messages:', error);
        return [];
    }
}

async function generateAIResponse(prompt, username, contextMessages = []) {
    try {
        const controller = new AbortController();
        const timeout = setTimeout(() => controller.abort(), MAX_RESPONSE_TIME);

        // Build conversation context
        let conversationContext = '';
        if (contextMessages.length > 0) {
            conversationContext = '\n\nRecent conversation:\n' + contextMessages.join('\n');
        }

        const fullPrompt = conversationContext + `\n\n${username}: ${prompt}`;

        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt: fullPrompt,
                stream: false,
                system: `You are a helpful AI assistant in a Discord server. Keep responses concise and friendly. You are having a conversation with users, so maintain context from previous messages when relevant. The current user's name is ${username}.`
            },
            {
                signal: controller.signal,
                timeout: MAX_RESPONSE_TIME
            }
        );

        clearTimeout(timeout);

        if (response.data && response.data.response) {
            return response.data.response.trim();
        } else {
            throw new Error('Invalid response from Ollama');
        }

    } catch (error) {
        if (error.name === 'AbortError' || error.code === 'ECONNABORTED') {
            throw new Error('Request timeout');
        }
        throw error;
    }
}

function splitMessage(text, maxLength) {
    const chunks = [];
    let currentChunk = '';

    const lines = text.split('\n');
    
    for (const line of lines) {
        if ((currentChunk + line + '\n').length > maxLength) {
            if (currentChunk) {
                chunks.push(currentChunk.trim());
                currentChunk = '';
            }
            
            // If a single line is too long, split it by words
            if (line.length > maxLength) {
                const words = line.split(' ');
                for (const word of words) {
                    if ((currentChunk + word + ' ').length > maxLength) {
                        chunks.push(currentChunk.trim());
                        currentChunk = word + ' ';
                    } else {
                        currentChunk += word + ' ';
                    }
                }
            } else {
                currentChunk = line + '\n';
            }
        } else {
            currentChunk += line + '\n';
        }
    }
    
    if (currentChunk) {
        chunks.push(currentChunk.trim());
    }
    
    return chunks;
}