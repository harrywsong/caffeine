const { ChannelType, PermissionFlagsBits, EmbedBuilder } = require('discord.js');
const { loadVoiceConfig, saveVoiceConfig } = require('../commands/voice');
const config = require('../utils/config');
const voiceTimeTracker = require('../utils/voiceTimeTracker');
const leaderboardUpdater = require('../utils/leaderboardUpdater');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
            // Handle voice time tracking first
            await handleVoiceTimeTracking(oldState, newState);

            const voiceConfig = loadVoiceConfig();
            const guildId = newState.guild.id;
            const guildData = voiceConfig[guildId];

            if (!guildData) return;

            // Handle user joining a trigger channel
            if (newState.channelId && guildData.triggerChannels?.includes(newState.channelId)) {
                await handleTriggerChannelJoin(newState, guildData, voiceConfig);
            }

            // Handle user leaving a temporary channel
            if (oldState.channelId && guildData.tempChannels?.includes(oldState.channelId)) {
                await handleTempChannelLeave(oldState, guildData, voiceConfig);
            }
        } catch (error) {
            console.error('Error in voiceStateUpdate event:', error);
        }
    },
};

async function handleTriggerChannelJoin(newState, guildData, voiceConfig) {
    const member = newState.member;
    const guild = newState.guild;
    
    // Use the specific category ID provided: 1465463739821330532 (mainCafe)
    const categoryId = '1465463739821330532';
    const category = guild.channels.cache.get(categoryId);

    if (!category) {
        console.error(`Voice category not found: ${categoryId}`);
        return;
    }

    try {
        // Create a new temporary voice channel
        const channelName = `┊🔊﹕${member.displayName}'s Room`;
        
        const tempChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: categoryId,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel]
                },
                {
                    id: member.id,
                    allow: [
                        PermissionFlagsBits.Connect,
                        PermissionFlagsBits.Speak,
                        PermissionFlagsBits.ViewChannel,
                        PermissionFlagsBits.ManageChannels,
                        PermissionFlagsBits.MoveMembers
                    ]
                }
            ]
        });

        // Move the user to the new channel
        try {
            await member.voice.setChannel(tempChannel);
            console.log(`✅ Moved ${member.displayName} to new channel: ${channelName}`);
        } catch (moveError) {
            console.error('Error moving user to new channel:', moveError);
            // If we can't move the user, still create the channel but log the issue
        }

        // Add to temporary channels list
        if (!guildData.tempChannels) {
            guildData.tempChannels = [];
        }
        guildData.tempChannels.push(tempChannel.id);
        
        // Store the owner of this channel
        if (!guildData.channelOwners) {
            guildData.channelOwners = {};
        }
        guildData.channelOwners[tempChannel.id] = member.id;

        saveVoiceConfig(voiceConfig);

        console.log(`✅ Created temporary voice channel ${channelName} for ${member.displayName} in category ${category.name}`);
        
        // Log to bot logs
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `🔊 **${member.user.tag}** created temporary voice channel: ${channelName}`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error creating temporary voice channel:', error);
    }
}

async function handleTempChannelLeave(oldState, guildData, voiceConfig) {
    const channel = oldState.channel;
    
    // Check if channel is empty
    if (channel.members.size === 0) {
        try {
            // Remove from temporary channels list
            guildData.tempChannels = guildData.tempChannels.filter(id => id !== channel.id);
            
            // Remove from channel owners
            if (guildData.channelOwners) {
                delete guildData.channelOwners[channel.id];
            }

            saveVoiceConfig(voiceConfig);

            // Delete the empty channel
            await channel.delete('Temporary voice channel empty');
            console.log(`🗑️ Deleted empty temporary voice channel: ${channel.name}`);
            
            // Log to bot logs
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const guild = oldState.guild;
                const botLogsChannel = guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🗑️ Deleted empty temporary voice channel: ${channel.name}`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
        } catch (error) {
            console.error('Error deleting temporary voice channel:', error);
        }
    }
}
async function handleVoiceTimeTracking(oldState, newState) {
    try {
        // Skip if user is a bot
        if (newState.member.user.bot) return;

        const userId = newState.member.user.id;
        const guildId = newState.guild.id;

        // User joined a voice channel
        if (!oldState.channelId && newState.channelId) {
            voiceTimeTracker.startSession(userId, newState.channelId, guildId);
            
            // Log to bot logs
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = newState.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🔊 **${newState.member.user.tag}** started voice session in <#${newState.channelId}>`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
        }
        // User left a voice channel
        else if (oldState.channelId && !newState.channelId) {
            const duration = voiceTimeTracker.endSession(userId, guildId);
            
            // Log to bot logs with duration
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = newState.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const formattedDuration = voiceTimeTracker.formatDuration(duration);
                    const logMessage = `🔇 **${newState.member.user.tag}** ended voice session (${formattedDuration}) from <#${oldState.channelId}>`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
        }
        // User moved between voice channels
        else if (oldState.channelId && newState.channelId && oldState.channelId !== newState.channelId) {
            voiceTimeTracker.updateSession(userId, newState.channelId, guildId);
            
            // Log to bot logs
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = newState.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `🔄 **${newState.member.user.tag}** moved voice session from <#${oldState.channelId}> to <#${newState.channelId}>`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
        }
    } catch (error) {
        console.error('Error handling voice time tracking:', error);
    }
}

async function logVoiceStateChange(oldState, newState) {
    // Voice state changes should only be logged to bot-logs, not chat history
    // Chat history is only for message edits, deletions, and file uploads/downloads
    return;
}