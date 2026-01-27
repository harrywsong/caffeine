const fs = require('fs');
const path = require('path');

// Auto role configuration file
const autoRoleFile = path.join(__dirname, '..', 'data', 'autorole-sections.json');

function loadAutoRoleSections() {
    try {
        if (fs.existsSync(autoRoleFile)) {
            return JSON.parse(fs.readFileSync(autoRoleFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading auto role sections:', error);
    }
    return {};
}

async function cacheAutoRoleMessages(client) {
    console.log('🔄 Caching auto role messages for reaction handling...');
    
    try {
        const sections = loadAutoRoleSections();
        let totalCached = 0;
        let totalFailed = 0;

        for (const [guildId, guildData] of Object.entries(sections)) {
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    console.log(`⚠️ Guild ${guildId} not found, skipping...`);
                    continue;
                }

                console.log(`📋 Processing guild: ${guild.name}`);

                // Cache each auto role message
                for (const [sectionType, sectionData] of Object.entries(guildData)) {
                    if (!sectionData.channelId || !sectionData.messageId) continue;

                    try {
                        const channel = await guild.channels.fetch(sectionData.channelId);
                        if (!channel) {
                            console.log(`⚠️ Channel ${sectionData.channelId} not found for ${sectionType} section`);
                            continue;
                        }

                        const message = await channel.messages.fetch(sectionData.messageId);
                        if (!message) {
                            console.log(`⚠️ Message ${sectionData.messageId} not found for ${sectionType} section`);
                            continue;
                        }

                        // Fetch all reactions for this message to ensure they're cached
                        if (message.reactions.cache.size > 0) {
                            for (const reaction of message.reactions.cache.values()) {
                                try {
                                    await reaction.users.fetch();
                                } catch (error) {
                                    console.error(`Error fetching users for reaction ${reaction.emoji.name}:`, error.message);
                                }
                            }
                        }

                        totalCached++;
                        console.log(`✅ Cached ${sectionType} message in #${channel.name} (${message.reactions.cache.size} reactions)`);

                    } catch (error) {
                        totalFailed++;
                        console.error(`❌ Failed to cache ${sectionType} message:`, error.message);
                    }
                }

            } catch (error) {
                console.error(`❌ Error processing guild ${guildId}:`, error.message);
            }
        }

        console.log(`✅ Auto role message caching completed! Cached ${totalCached} messages, ${totalFailed} failed`);

    } catch (error) {
        console.error('❌ Error during auto role message caching:', error);
    }
}

async function startAutoRoleCaching(client) {
    // Wait a bit for the bot to be fully ready
    setTimeout(async () => {
        await cacheAutoRoleMessages(client);
    }, 5000); // 5 seconds after startup

    console.log('🕒 Auto role message caching scheduled for 5 seconds after startup');
}

module.exports = {
    cacheAutoRoleMessages,
    startAutoRoleCaching,
    loadAutoRoleSections
};