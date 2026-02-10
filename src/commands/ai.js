const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits } = require('discord.js');
const axios = require('axios');
const webSearch = require('../utils/webSearch');

const OLLAMA_URL = process.env.OLLAMA_URL || 'http://localhost:11434';
const OLLAMA_MODEL = process.env.OLLAMA_MODEL || 'llama3.2:3b';

module.exports = {
    data: new SlashCommandBuilder()
        .setName('ai')
        .setDescription('AI assistant commands')
        .addSubcommand(subcommand =>
            subcommand
                .setName('ask')
                .setDescription('Ask the AI a question')
                .addStringOption(option =>
                    option.setName('prompt')
                        .setDescription('Your question or prompt')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Check AI service status'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('models')
                .setDescription('List available AI models'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('set-model')
                .setDescription('Change the AI model (Admin only)')
                .addStringOption(option =>
                    option.setName('model')
                        .setDescription('Model name (e.g., llama3.2:3b)')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('search')
                .setDescription('Search the web and get AI analysis')
                .addStringOption(option =>
                    option.setName('query')
                        .setDescription('What to search for')
                        .setRequired(true))),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        // Check admin permission for set-model command
        if (subcommand === 'set-model') {
            if (!interaction.member.permissions.has(PermissionFlagsBits.Administrator)) {
                return interaction.reply({
                    content: '❌ This command requires Administrator permissions.',
                    ephemeral: true
                });
            }
        }

        try {
            if (subcommand === 'ask') {
                await handleAsk(interaction);
            } else if (subcommand === 'status') {
                await handleStatus(interaction);
            } else if (subcommand === 'models') {
                await handleModels(interaction);
            } else if (subcommand === 'set-model') {
                await handleSetModel(interaction);
            } else if (subcommand === 'search') {
                await handleSearch(interaction);
            }
        } catch (error) {
            console.error('Error in AI command:', error);
            
            const errorMessage = error.code === 'ECONNREFUSED' 
                ? '❌ AI service is not running. Please contact an administrator.'
                : '❌ An error occurred while processing your request.';
            
            if (interaction.deferred) {
                await interaction.editReply({ content: errorMessage });
            } else {
                await interaction.reply({ content: errorMessage, ephemeral: true });
            }
        }
    },
};

async function handleAsk(interaction) {
    const prompt = interaction.options.getString('prompt');
    
    await interaction.deferReply();

    try {
        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt: prompt,
                stream: false,
                system: `You are a helpful AI assistant in a Discord server. Keep responses concise and friendly. The user's name is ${interaction.user.username}.`
            },
            { timeout: 60000 }
        );

        if (response.data && response.data.response) {
            const aiResponse = response.data.response.trim();
            
            // Split if too long
            if (aiResponse.length > 2000) {
                await interaction.editReply(aiResponse.substring(0, 1997) + '...');
                
                // Send remaining in follow-up
                const remaining = aiResponse.substring(1997);
                if (remaining.length > 0) {
                    await interaction.followUp(remaining.substring(0, 2000));
                }
            } else {
                await interaction.editReply(aiResponse);
            }
        } else {
            await interaction.editReply('❌ Received invalid response from AI service.');
        }

    } catch (error) {
        console.error('Error generating AI response:', error);
        
        let errorMessage = '❌ Failed to generate response.';
        if (error.code === 'ECONNREFUSED') {
            errorMessage = '❌ AI service is not running.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = '⏱️ Request timed out. Try a simpler question.';
        }
        
        await interaction.editReply(errorMessage);
    }
}

async function handleStatus(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🤖 AI Service Status')
            .addFields(
                { name: '✅ Status', value: 'Online and operational', inline: true },
                { name: '🔧 Current Model', value: OLLAMA_MODEL, inline: true },
                { name: '📊 Available Models', value: response.data.models?.length.toString() || '0', inline: true },
                { name: '🌐 Service URL', value: OLLAMA_URL, inline: false }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        const embed = new EmbedBuilder()
            .setColor(0xFF0000)
            .setTitle('🤖 AI Service Status')
            .addFields(
                { name: '❌ Status', value: 'Offline or unreachable', inline: true },
                { name: '🔧 Expected Model', value: OLLAMA_MODEL, inline: true },
                { name: '🌐 Service URL', value: OLLAMA_URL, inline: false }
            )
            .setDescription('The AI service is not responding. Please contact an administrator.')
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    }
}

async function handleModels(interaction) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle('🤖 Available AI Models')
            .setDescription('Models installed on this server:')
            .setTimestamp();

        if (response.data.models && response.data.models.length > 0) {
            for (const model of response.data.models) {
                const size = (model.size / (1024 * 1024 * 1024)).toFixed(2);
                const isCurrent = model.name === OLLAMA_MODEL ? '✅ ' : '';
                embed.addFields({
                    name: `${isCurrent}${model.name}`,
                    value: `Size: ${size} GB\nModified: ${new Date(model.modified_at).toLocaleDateString()}`,
                    inline: true
                });
            }
        } else {
            embed.setDescription('No models installed.');
        }

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        await interaction.editReply({
            content: '❌ Failed to fetch model list. AI service may be offline.'
        });
    }
}

async function handleSetModel(interaction) {
    const modelName = interaction.options.getString('model');
    
    await interaction.deferReply({ ephemeral: true });

    try {
        // Check if model exists
        const response = await axios.get(`${OLLAMA_URL}/api/tags`, { timeout: 5000 });
        const modelExists = response.data.models?.some(m => m.name === modelName);

        if (!modelExists) {
            return interaction.editReply({
                content: `❌ Model "${modelName}" not found. Use \`/ai models\` to see available models.`
            });
        }

        // Update environment variable (note: this only affects current session)
        process.env.OLLAMA_MODEL = modelName;

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Model Updated')
            .setDescription(`AI model changed to: **${modelName}**`)
            .addFields({
                name: '⚠️ Note',
                value: 'This change is temporary. To make it permanent, update your .env file and restart the bot.',
                inline: false
            })
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });

    } catch (error) {
        await interaction.editReply({
            content: '❌ Failed to change model. AI service may be offline.'
        });
    }
}


async function handleSearch(interaction) {
    const query = interaction.options.getString('query');
    
    await interaction.deferReply();

    try {
        // Perform web search
        const results = await webSearch.search(query, 5);
        
        if (results.length === 0) {
            return interaction.editReply('❌ No search results found for that query.');
        }

        // Format search results
        const searchContext = webSearch.formatResults(results);

        // Get AI analysis of search results
        const response = await axios.post(
            `${OLLAMA_URL}/api/generate`,
            {
                model: OLLAMA_MODEL,
                prompt: `Based on these web search results, provide a concise summary and answer:\n\n${searchContext}\n\nUser's question: ${query}`,
                stream: false,
                system: `You are a helpful AI assistant. Analyze the provided web search results and give a clear, accurate answer to the user's question. Always cite your sources from the search results. Keep your response concise and informative.`
            },
            { timeout: 60000 }
        );

        if (response.data && response.data.response) {
            const aiResponse = response.data.response.trim();
            
            // Create embed with search results
            const embed = new EmbedBuilder()
                .setColor(0x0099FF)
                .setTitle(`🔍 Search: ${query}`)
                .setDescription(aiResponse.substring(0, 4096)) // Discord embed limit
                .setTimestamp();

            // Add top 3 sources
            if (results.length > 0) {
                let sources = '';
                results.slice(0, 3).forEach((result, index) => {
                    sources += `${index + 1}. [${result.title}](${result.url})\n`;
                });
                embed.addFields({ name: '📚 Sources', value: sources, inline: false });
            }

            await interaction.editReply({ embeds: [embed] });

            // If response is too long, send remainder as text
            if (aiResponse.length > 4096) {
                const remaining = aiResponse.substring(4096);
                await interaction.followUp(remaining.substring(0, 2000));
            }
        } else {
            await interaction.editReply('❌ Failed to analyze search results.');
        }

    } catch (error) {
        console.error('Error in search command:', error);
        
        let errorMessage = '❌ Failed to perform search.';
        if (error.code === 'ECONNREFUSED') {
            errorMessage = '❌ AI service is not running.';
        } else if (error.code === 'ECONNABORTED') {
            errorMessage = '⏱️ Request timed out.';
        }
        
        await interaction.editReply(errorMessage);
    }
}