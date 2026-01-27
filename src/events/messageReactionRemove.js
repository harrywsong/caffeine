const { EmbedBuilder } = require('discord.js');
const config = require('../utils/config');
const { loadAutoRoleSections } = require('../commands/autorole-setup');

// Track ongoing role operations to prevent race conditions
const roleOperations = new Map();

module.exports = {
    name: 'messageReactionRemove',
    async execute(reaction, user) {
        try {
            // Skip if user is a bot
            if (user.bot) return;

            console.log(`🔍 REACTION REMOVE: ${user.tag} removed ${reaction.emoji.name} from message ${reaction.message.id}`);

            // Handle partials efficiently
            if (reaction.partial) {
                try {
                    await reaction.fetch();
                    console.log(`📥 Fetched partial reaction`);
                } catch (error) {
                    console.error('Error fetching partial reaction:', error);
                    return;
                }
            }

            if (user.partial) {
                try {
                    await user.fetch();
                    console.log(`📥 Fetched partial user`);
                } catch (error) {
                    console.error('Error fetching partial user:', error);
                    return;
                }
            }

            if (reaction.message.partial) {
                try {
                    await reaction.message.fetch();
                    console.log(`📥 Fetched partial message`);
                } catch (error) {
                    console.error('Error fetching partial message:', error);
                    return;
                }
            }

            // Handle auto role removal first (with immediate execution)
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
    
    console.log(`🔄 Processing role removal for ${user.tag}`);
    
    // Prevent concurrent operations for the same user/message/emoji
    if (roleOperations.has(operationKey)) {
        console.log(`⏳ Skipping concurrent operation for ${user.tag}`);
        return;
    }

    roleOperations.set(operationKey, 'removing');

    try {
        const guildId = reaction.message.guild.id;
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        console.log(`📊 Guild data exists: ${!!guildData}`);
        if (!guildData) {
            console.log(`❌ No guild data found for ${guildId}`);
            return;
        }

        const messageId = reaction.message.id;
        const emoji = reaction.emoji.name;
        
        console.log(`🔍 Looking for message ${messageId} with emoji ${emoji}`);
        
        // Fetch member once, efficiently
        let member;
        try {
            member = await reaction.message.guild.members.fetch(user.id);
            console.log(`👤 Fetched member: ${member.user.tag}`);
        } catch (error) {
            console.error(`Error fetching member ${user.id}:`, error);
            return;
        }

        if (!member) {
            console.log(`❌ Member not found`);
            return;
        }

        // Find which section this message belongs to and get the role
        let roleId = null;
        let sectionType = null;

        console.log(`🔍 Checking sections...`);
        console.log(`Timezone messageId: ${guildData.timezone?.messageId}`);
        console.log(`Activities messageId: ${guildData.activities?.messageId}`);
        console.log(`Games messageId: ${guildData.games?.messageId}`);

        if (guildData.timezone?.messageId === messageId) {
            roleId = guildData.timezone.roles[emoji];
            sectionType = 'timezone';
            console.log(`🌍 Found timezone section, roleId: ${roleId}`);
        } else if (guildData.activities?.messageId === messageId) {
            roleId = guildData.activities.roles[emoji];
            sectionType = 'activities';
            console.log(`🎯 Found activities section, roleId: ${roleId}`);
        } else if (guildData.games?.messageId === messageId) {
            roleId = guildData.games.roles[emoji];
            sectionType = 'games';
            console.log(`🎮 Found games section, roleId: ${roleId}`);
        } else {
            console.log(`❌ Message ${messageId} not found in any section`);
        }

        // If we found a role to remove, do it immediately
        if (roleId && sectionType) {
            const role = reaction.message.guild.roles.cache.get(roleId);
            console.log(`🎭 Role found: ${role?.name || 'NOT FOUND'}`);
            console.log(`🔍 User has role: ${member.roles.cache.has(roleId)}`);
            
            if (role && member.roles.cache.has(roleId)) {
                try {
                    console.log(`⏳ Removing role ${role.name} from ${user.tag}`);
                    await member.roles.remove(role, `Auto role removal: ${user.tag} unreacted ${emoji}`);
                    console.log(`✅ Successfully removed role ${role.name} from ${user.tag}`);
                    
                    // Log to bot logs (async, don't wait)
                    const botLogsChannelId = config.getSettingChannelId('logChannel');
                    if (botLogsChannelId) {
                        const botLogsChannel = reaction.message.guild.channels.cache.get(botLogsChannelId);
                        if (botLogsChannel) {
                            const sectionEmoji = sectionType === 'timezone' ? '🌍' : sectionType === 'activities' ? '🎯' : '🎮';
                            const logMessage = `${sectionEmoji} **${user.tag}** removed ${sectionType} role: ${role.name} (${emoji})`;
                            botLogsChannel.send(logMessage).catch(console.error);
                        }
                    }
                } catch (error) {
                    console.error(`❌ Error removing ${sectionType} role from ${user.tag}:`, error);
                }
            } else if (!role) {
                console.log(`❌ Role ${roleId} not found in guild`);
            } else {
                console.log(`⚠️ User doesn't have role ${role.name} to remove`);
            }
        } else {
            console.log(`❌ No role found for emoji ${emoji} in section ${sectionType}`);
        }
    } catch (error) {
        console.error('Error handling auto role removal:', error);
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