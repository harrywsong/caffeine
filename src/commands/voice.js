const { SlashCommandBuilder, EmbedBuilder, ChannelType, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Voice channel configuration file
const voiceConfigFile = path.join(__dirname, '..', 'data', 'voice.json');

function loadVoiceConfig() {
    try {
        if (fs.existsSync(voiceConfigFile)) {
            return JSON.parse(fs.readFileSync(voiceConfigFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading voice config:', error);
    }
    return {};
}

function saveVoiceConfig(data) {
    try {
        const dir = path.dirname(voiceConfigFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(voiceConfigFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving voice config:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('voice')
        .setDescription('Automatic voice channel creation system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup automatic voice channel creation')
                .addChannelOption(option =>
                    option.setName('category')
                        .setDescription('Category to create voice channels in')
                        .addChannelTypes(ChannelType.GuildCategory)
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Template name for created channels (use {user} for username)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-trigger')
                .setDescription('Create a trigger channel that creates new voice channels when joined')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Name for the trigger channel')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove automatic voice channel system'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current voice channel configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageChannels),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, guildId);
                break;
            case 'create-trigger':
                await handleCreateTrigger(interaction, guildId);
                break;
            case 'remove':
                await handleRemove(interaction, guildId);
                break;
            case 'status':
                await handleStatus(interaction, guildId);
                break;
        }
    },
};

async function handleSetup(interaction, guildId) {
    const category = interaction.options.getChannel('category');
    const nameTemplate = interaction.options.getString('name') || '{user}\'s Channel';

    // Check bot permissions
    const botPermissions = category.permissionsFor(interaction.guild.members.me);
    if (!botPermissions.has([PermissionFlagsBits.ManageChannels, PermissionFlagsBits.Connect])) {
        return interaction.reply({
            content: '❌ I need "Manage Channels" and "Connect" permissions in that category!',
            ephemeral: true
        });
    }

    const voiceConfig = loadVoiceConfig();
    if (!voiceConfig[guildId]) {
        voiceConfig[guildId] = {};
    }

    voiceConfig[guildId].categoryId = category.id;
    voiceConfig[guildId].nameTemplate = nameTemplate;
    voiceConfig[guildId].triggerChannels = voiceConfig[guildId].triggerChannels || [];
    voiceConfig[guildId].tempChannels = voiceConfig[guildId].tempChannels || [];

    saveVoiceConfig(voiceConfig);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Voice System Setup Complete')
        .setDescription(`Automatic voice channels will be created in **${category.name}** category.`)
        .addFields(
            { name: '📝 Name Template', value: nameTemplate, inline: true },
            { name: '📁 Category', value: category.name, inline: true }
        )
        .setFooter({ text: 'Use /voice create-trigger to add trigger channels' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCreateTrigger(interaction, guildId) {
    const name = interaction.options.getString('name');
    const voiceConfig = loadVoiceConfig();

    if (!voiceConfig[guildId] || !voiceConfig[guildId].categoryId) {
        return interaction.reply({
            content: '❌ You need to setup the voice system first using `/voice setup`!',
            ephemeral: true
        });
    }

    const category = interaction.guild.channels.cache.get(voiceConfig[guildId].categoryId);
    if (!category) {
        return interaction.reply({
            content: '❌ The configured category no longer exists! Please run `/voice setup` again.',
            ephemeral: true
        });
    }

    try {
        // Create the trigger channel
        const triggerChannel = await interaction.guild.channels.create({
            name: name,
            type: ChannelType.GuildVoice,
            parent: category.id,
            permissionOverwrites: [
                {
                    id: interaction.guild.roles.everyone.id,
                    allow: [PermissionFlagsBits.Connect, PermissionFlagsBits.Speak, PermissionFlagsBits.ViewChannel]
                }
            ]
        });

        // Add to trigger channels list
        voiceConfig[guildId].triggerChannels.push(triggerChannel.id);
        saveVoiceConfig(voiceConfig);

        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('✅ Trigger Channel Created')
            .setDescription(`Created trigger channel **${name}**. When users join this channel, a new private voice channel will be created for them.`)
            .addFields({ name: '🔗 Channel', value: `<#${triggerChannel.id}>`, inline: true })
            .setTimestamp();

        await interaction.reply({ embeds: [embed] });
    } catch (error) {
        console.error('Error creating trigger channel:', error);
        await interaction.reply({
            content: '❌ Failed to create trigger channel. Make sure I have the necessary permissions!',
            ephemeral: true
        });
    }
}

async function handleRemove(interaction, guildId) {
    const voiceConfig = loadVoiceConfig();

    if (!voiceConfig[guildId]) {
        return interaction.reply({
            content: '❌ No voice system configuration found for this server!',
            ephemeral: true
        });
    }

    // Clean up temporary channels
    if (voiceConfig[guildId].tempChannels) {
        for (const channelId of voiceConfig[guildId].tempChannels) {
            try {
                const channel = interaction.guild.channels.cache.get(channelId);
                if (channel) {
                    await channel.delete('Voice system removed');
                }
            } catch (error) {
                console.error('Error deleting temp channel:', error);
            }
        }
    }

    delete voiceConfig[guildId];
    saveVoiceConfig(voiceConfig);

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('✅ Voice System Removed')
        .setDescription('Automatic voice channel system has been disabled and temporary channels have been cleaned up.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleStatus(interaction, guildId) {
    const voiceConfig = loadVoiceConfig();
    const guildData = voiceConfig[guildId];

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔊 Voice System Status')
        .setTimestamp();

    if (!guildData) {
        embed.setDescription('Voice system is not configured for this server.');
        return interaction.reply({ embeds: [embed] });
    }

    const category = interaction.guild.channels.cache.get(guildData.categoryId);
    let description = `**Category:** ${category ? category.name : 'Not found'}\n`;
    description += `**Name Template:** ${guildData.nameTemplate}\n`;
    description += `**Trigger Channels:** ${guildData.triggerChannels?.length || 0}\n`;
    description += `**Active Temp Channels:** ${guildData.tempChannels?.length || 0}`;

    if (guildData.triggerChannels && guildData.triggerChannels.length > 0) {
        const triggerList = guildData.triggerChannels
            .map(id => {
                const channel = interaction.guild.channels.cache.get(id);
                return channel ? `<#${id}>` : 'Channel not found';
            })
            .join(', ');
        description += `\n**Trigger Channels:** ${triggerList}`;
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}

// Export the voice config loading function for use in events
module.exports.loadVoiceConfig = loadVoiceConfig;
module.exports.saveVoiceConfig = saveVoiceConfig;