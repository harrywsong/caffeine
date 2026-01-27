const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { loadAutoRoleSections } = require('../commands/autorole-setup');

// Track ongoing role operations to prevent race conditions
const roleOperations = new Map();

module.exports = {
    name: 'messageReactionAdd',
    async execute(reaction, user) {
        try {
            // Skip if user is a bot
            if (user.bot) return;

            // Handle partial reactions
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                } catch (error) {
                    console.error('Error fetching reaction:', error);
                    return;
                }
            }

            // Handle partial users
            if (user.partial) {
                try {
                    await user.fetch();
                } catch (error) {
                    console.error('Error fetching user:', error);
                    return;
                }
            }

            // Handle auto role addition first
            await handleAutoRoleAddition(reaction, user);

            // Then handle logging
            await handleReactionLogging(reaction, user);

        } catch (error) {
            console.error('Error in messageReactionAdd:', error);
        }
    },
};

async function handleAutoRoleAddition(reaction, user) {
    const operationKey = `${user.id}-${reaction.message.id}-${reaction.emoji.name}`;
    
    // Prevent concurrent operations for the same user/message/emoji
    if (roleOperations.has(operationKey)) {
        return;
    }

    roleOperations.set(operationKey, 'adding');

    try {
        const guildId = reaction.message.guild.id;
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData) return;

        const messageId = reaction.message.id;
        const emoji = reaction.emoji.name;
        
        // Fetch member once, efficiently
        let member;
        try {
            member = await reaction.message.guild.members.fetch(user.id);
        } catch (error) {
            console.error(`Error fetching member ${user.id}:`, error);
            return;
        }

        if (!member) return;

        // Find which section this message belongs to and get the role
        let roleId = null;
        let sectionType = null;

        if (guildData.timezone?.messageId === messageId) {
            roleId = guildData.timezone.roles[emoji];
            sectionType = 'timezone';
        } else if (guildData.activities?.messageId === messageId) {
            roleId = guildData.activities.roles[emoji];
            sectionType = 'activities';
        } else if (guildData.games?.messageId === messageId) {
            roleId = guildData.games.roles[emoji];
            sectionType = 'games';
        }

        // If we found a role to add, do it immediately
        if (roleId && sectionType) {
            const role = reaction.message.guild.roles.cache.get(roleId);
            if (role && !member.roles.cache.has(roleId)) {
                try {
                    await member.roles.add(role, `Auto role: ${user.tag} reacted ${emoji}`);
                    
                    // Log to bot logs (async, don't wait)
                    const botLogsChannelId = config.getSettingChannelId('logChannel');
                    if (botLogsChannelId) {
                        const botLogsChannel = reaction.message.guild.channels.cache.get(botLogsChannelId);
                        if (botLogsChannel) {
                            const sectionEmoji = sectionType === 'timezone' ? '🌍' : sectionType === 'activities' ? '🎯' : '🎮';
                            const logMessage = `${sectionEmoji} **${user.tag}** added ${sectionType} role: ${role.name} (${emoji})`;
                            botLogsChannel.send(logMessage).catch(console.error);
                        }
                    }
                } catch (error) {
                    console.error(`Error adding ${sectionType} role to ${user.tag}:`, error);
                }
            }
        }
    } catch (error) {
        console.error('Error handling auto role addition:', error);
    } finally {
        // Clean up operation tracking after a short delay
        setTimeout(() => {
            roleOperations.delete(operationKey);
        }, 500);
    }
}

async function handleReactionLogging(reaction, user) {
    try {
        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (!chattingHistoryChannelId) return;

        const chattingHistoryChannel = reaction.message.guild.channels.cache.get(chattingHistoryChannelId);
        if (!chattingHistoryChannel) return;

        const embed = new EmbedBuilder()
            .setColor(0x00FFFF)
            .setTitle('👍 Reaction Added')
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
        console.error('Error logging reaction add:', error);
    }
}