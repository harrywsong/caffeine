const { ChannelType, PermissionFlagsBits } = require('discord.js');
const { loadVoiceConfig, saveVoiceConfig } = require('../commands/voice');

module.exports = {
    name: 'voiceStateUpdate',
    async execute(oldState, newState) {
        try {
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
    const category = guild.channels.cache.get(guildData.categoryId);

    if (!category) {
        console.error('Voice category not found');
        return;
    }

    try {
        // Create a new temporary voice channel
        const channelName = guildData.nameTemplate.replace('{user}', member.displayName);
        
        const tempChannel = await guild.channels.create({
            name: channelName,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: guild.roles.everyone.id,
                    deny: [PermissionFlagsBits.Connect]
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
        await member.voice.setChannel(tempChannel);

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

        console.log(`✅ Created temporary voice channel ${channelName} for ${member.displayName}`);
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
        } catch (error) {
            console.error('Error deleting temporary voice channel:', error);
        }
    }
}