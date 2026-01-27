const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { loadAutoRoleSections } = require('../commands/autorole-setup');

// Track ongoing role operations to prevent race conditions (shared with messageReactionAdd)
const roleOperations = new Map();

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        try {
            // Skip if user is a bot
            if (user.bot) return;

            // Handle partial reactions more aggressively
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Error fetching partial reaction:', error);
                    return;
                }
            }

            // Also handle partial users
            if (user.partial) {
                try {
                    await user.fetch();
                } catch (error) {
                    console.error('Error fetching partial user:', error);
                    return;
                }
            }

            // Handle partial messages
            if (reaction.message.partial) {
                try {
                    await reaction.message.fetch();
                } catch (error) {
                    console.error('Error fetching partial message:', error);
                    return;
                }
            }

            // Handle auto role removal first
            await handleAutoRoleRemoval(reaction, user);

            // Then handle logging
            await handleReactionLogging(reaction, user);

        } catch (error) {
            console.error('Error in messageReactionRemove:', error);
        }
    },
};

async function handleAutoRoleRemoval(reaction, user) {
    const operationKey = `${user.id}-${reaction.message.id}-${reaction.emoji.name}`;
    
    // Prevent concurrent operations for the same user/message/emoji
    if (roleOperations.has(operationKey)) {
        console.log(`⏳ Skipping concurrent role remove operation for ${user.tag}`);
        return;
    }

    roleOperations.set(operationKey, 'removing');

    try {
        const guildId = reaction.message.guild.id;
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData) return;

        const messageId = reaction.message.id;
        const emoji = reaction.emoji.name;
        
        // Fetch member more reliably
        let member;
        try {
            member = await reaction.message.guild.members.fetch(user.id);
        } catch (error) {
            console.error(`Error fetching member ${user.id}:`, error);
            return;
        }

        if (!member) return;

        // Handle timezone reactions (remove role when reaction is removed)
        if (guildData.timezone && guildData.timezone.messageId === messageId) {
            const roleId = guildData.timezone.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(role, `Auto role removal: ${user.tag} unreacted ${emoji}`);
                        
                        // Log to bot logs
                        const botLogsChannelId = config.getSettingChannelId('logChannel');
                        if (botLogsChannelId) {
                            const botLogsChannel = reaction.message.guild.channels.cache.get(botLogsChannelId);
                            if (botLogsChannel) {
                                const logMessage = `🌍 **${user.tag}** removed timezone role: ${role.name} (${emoji})`;
                                botLogsChannel.send(logMessage).catch(console.error);
                            }
                        }

                        console.log(`🌍 ${user.tag} removed timezone role: ${role.name}`);
                    } catch (error) {
                        console.error(`Error removing timezone role from ${user.tag}:`, error);
                    }
                }
            }
        }

        // Handle activities reactions (remove role when reaction is removed)
        if (guildData.activities && guildData.activities.messageId === messageId) {
            const roleId = guildData.activities.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(role, `Auto role removal: ${user.tag} unreacted ${emoji}`);
                        
                        // Log to bot logs
                        const botLogsChannelId = config.getSettingChannelId('logChannel');
                        if (botLogsChannelId) {
                            const botLogsChannel = reaction.message.guild.channels.cache.get(botLogsChannelId);
                            if (botLogsChannel) {
                                const logMessage = `🎯 **${user.tag}** removed activity role: ${role.name} (${emoji})`;
                                botLogsChannel.send(logMessage).catch(console.error);
                            }
                        }

                        console.log(`🎯 ${user.tag} removed activity role: ${role.name}`);
                    } catch (error) {
                        console.error(`Error removing activity role from ${user.tag}:`, error);
                    }
                }
            }
        }

        // Handle games reactions (remove role when reaction is removed)
        if (guildData.games && guildData.games.messageId === messageId) {
            const roleId = guildData.games.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    try {
                        await member.roles.remove(role, `Auto role removal: ${user.tag} unreacted ${emoji}`);
                        
                        // Log to bot logs
                        const botLogsChannelId = config.getSettingChannelId('logChannel');
                        if (botLogsChannelId) {
                            const botLogsChannel = reaction.message.guild.channels.cache.get(botLogsChannelId);
                            if (botLogsChannel) {
                                const logMessage = `🎮 **${user.tag}** removed game role: ${role.name} (${emoji})`;
                                botLogsChannel.send(logMessage).catch(console.error);
                            }
                        }

                        console.log(`🎮 ${user.tag} removed game role: ${role.name}`);
                    } catch (error) {
                        console.error(`Error removing game role from ${user.tag}:`, error);
                    }
                }
            }
        }
    } catch (error) {
        console.error('Error handling auto role removal:', error);
    } finally {
        // Clean up operation tracking after a short delay
        setTimeout(() => {
            roleOperations.delete(operationKey);
        }, 1000);
    }
}

async function handleReactionLogging(reaction, user) {
    try {
        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (!chattingHistoryChannelId) return;

        const chattingHistoryChannel = reaction.message.guild.channels.cache.get(chattingHistoryChannelId);
        if (!chattingHistoryChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0xFF6B6B)
            .setTitle('👎 Reaction Removed')
            .setDescription(`**User:** ${user.tag}\n**Channel:** <#${reaction.message.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
            .addFields(
                { name: '😀 Reaction', value: reaction.emoji.toString(), inline: true },
                { name: '📝 Message Preview', value: reaction.message.content?.substring(0, 100) + (reaction.message.content?.length > 100 ? '...' : '') || '*No text content*', inline: false }
            )
            .setFooter({ text: `Message ID: ${reaction.message.id} | User ID: ${user.id}` })
            .setTimestamp();

        // Add link to original message
        embed.addFields({ name: '🔗 Jump to Message', value: `[Click here](${reaction.message.url})`, inline: true });

        await chattingHistoryChannel.send({ embeds: [embed] });
    } catch (error) {
        console.error('Error logging reaction remove:', error);
    }
}