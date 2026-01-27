const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { loadAutoRoleSections } = require('../commands/autorole-setup');

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        try {
            // Skip if user is a bot
            if (user.bot) return;

            // Skip if reaction is partial
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Error fetching reaction:', error);
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
    try {
        const guildId = reaction.message.guild.id;
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData) return;

        const messageId = reaction.message.id;
        const emoji = reaction.emoji.name;
        const member = reaction.message.guild.members.cache.get(user.id);

        if (!member) return;

        // Handle timezone reactions (remove role when reaction is removed)
        if (guildData.timezone && guildData.timezone.messageId === messageId) {
            const roleId = guildData.timezone.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    
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
                }
            }
        }

        // Handle activities reactions (remove role when reaction is removed)
        if (guildData.activities && guildData.activities.messageId === messageId) {
            const roleId = guildData.activities.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    
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
                }
            }
        }

        // Handle games reactions (remove role when reaction is removed)
        if (guildData.games && guildData.games.messageId === messageId) {
            const roleId = guildData.games.roles[emoji];
            if (roleId) {
                const role = reaction.message.guild.roles.cache.get(roleId);
                if (role && member.roles.cache.has(roleId)) {
                    await member.roles.remove(role);
                    
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
                }
            }
        }
    } catch (error) {
        console.error('Error handling auto role removal:', error);
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