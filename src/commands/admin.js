const { SlashCommandBuilder, EmbedBuilder, PermissionFlagsBits, ChannelType } = require('discord.js');
const database = require('../database/database');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('admin')
        .setDescription('Server administration commands')
        .addSubcommandGroup(group =>
            group
                .setName('setup')
                .setDescription('Setup server features')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('channels')
                        .setDescription('Setup important server channels')
                        .addChannelOption(option =>
                            option.setName('logs')
                                .setDescription('Channel for activity logs')
                                .addChannelTypes(ChannelType.GuildText))
                        .addChannelOption(option =>
                            option.setName('announcements')
                                .setDescription('Channel for announcements')
                                .addChannelTypes(ChannelType.GuildText))
                        .addChannelOption(option =>
                            option.setName('welcome')
                                .setDescription('Channel for welcome messages')
                                .addChannelTypes(ChannelType.GuildText))
                        .addChannelOption(option =>
                            option.setName('music')
                                .setDescription('Channel for music commands')
                                .addChannelTypes(ChannelType.GuildText))
                        .addChannelOption(option =>
                            option.setName('roles')
                                .setDescription('Channel for role selection')
                                .addChannelTypes(ChannelType.GuildText)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('voice')
                        .setDescription('Setup voice channel system')
                        .addChannelOption(option =>
                            option.setName('category')
                                .setDescription('Category for voice channels')
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(true))
                        .addChannelOption(option =>
                            option.setName('trigger')
                                .setDescription('Trigger channel for creating voice channels')
                                .addChannelTypes(ChannelType.GuildVoice)
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('template')
                                .setDescription('Name template for created channels')
                                .setRequired(false)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('casino')
                        .setDescription('Setup casino channels')
                        .addChannelOption(option =>
                            option.setName('category')
                                .setDescription('Category for casino channels')
                                .addChannelTypes(ChannelType.GuildCategory)
                                .setRequired(true))))
        .addSubcommandGroup(group =>
            group
                .setName('restrictions')
                .setDescription('Manage channel restrictions')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('set')
                        .setDescription('Set command restrictions for a channel')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel to restrict')
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('command')
                                .setDescription('Command to restrict')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Music Commands', value: 'music' },
                                    { name: 'Casino Commands', value: 'casino' },
                                    { name: 'Voice Commands', value: 'voice' },
                                    { name: 'All Commands', value: 'all' }
                                ))
                        .addBooleanOption(option =>
                            option.setName('allowed')
                                .setDescription('Whether the command is allowed')
                                .setRequired(true)))
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('list')
                        .setDescription('List all channel restrictions')))
        .addSubcommandGroup(group =>
            group
                .setName('casino')
                .setDescription('Casino management')
                .addSubcommand(subcommand =>
                    subcommand
                        .setName('assign-game')
                        .setDescription('Assign a casino game to a channel')
                        .addChannelOption(option =>
                            option.setName('channel')
                                .setDescription('Channel for the game')
                                .addChannelTypes(ChannelType.GuildText)
                                .setRequired(true))
                        .addStringOption(option =>
                            option.setName('game')
                                .setDescription('Game type')
                                .setRequired(true)
                                .addChoices(
                                    { name: 'Coinflip', value: 'coinflip' },
                                    { name: 'Slots', value: 'slots' },
                                    { name: 'Dice', value: 'dice' },
                                    { name: 'Blackjack', value: 'blackjack' },
                                    { name: 'All Games', value: 'all' }
                                ))))
        .addSubcommand(subcommand =>
            subcommand
                .setName('dashboard')
                .setDescription('Get dashboard access link'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show server configuration status'))
        .setDefaultMemberPermissions(PermissionFlagsBits.Administrator),

    async execute(interaction) {
        const group = interaction.options.getSubcommandGroup();
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        try {
            if (group === 'setup') {
                if (subcommand === 'channels') {
                    await handleChannelSetup(interaction, guildId);
                } else if (subcommand === 'voice') {
                    await handleVoiceSetup(interaction, guildId);
                } else if (subcommand === 'casino') {
                    await handleCasinoSetup(interaction, guildId);
                }
            } else if (group === 'restrictions') {
                if (subcommand === 'set') {
                    await handleSetRestriction(interaction, guildId);
                } else if (subcommand === 'list') {
                    await handleListRestrictions(interaction, guildId);
                }
            } else if (group === 'casino') {
                if (subcommand === 'assign-game') {
                    await handleAssignGame(interaction, guildId);
                }
            } else if (subcommand === 'dashboard') {
                await handleDashboard(interaction, guildId);
            } else if (subcommand === 'status') {
                await handleStatus(interaction, guildId);
            }

            // Log admin activity
            await database.logActivity(
                guildId,
                interaction.user.id,
                interaction.channel.id,
                'admin_command',
                `${group ? group + '/' : ''}${subcommand}`
            );

        } catch (error) {
            console.error('Error in admin command:', error);
            await interaction.reply({
                content: '❌ An error occurred while executing the admin command.',
                ephemeral: true
            });
        }
    },
};

async function handleChannelSetup(interaction, guildId) {
    const settings = {};
    
    const logs = interaction.options.getChannel('logs');
    const announcements = interaction.options.getChannel('announcements');
    const welcome = interaction.options.getChannel('welcome');
    const music = interaction.options.getChannel('music');
    const roles = interaction.options.getChannel('roles');

    if (logs) settings.log_channel_id = logs.id;
    if (announcements) settings.announcement_channel_id = announcements.id;
    if (welcome) settings.welcome_channel_id = welcome.id;
    if (music) settings.music_channel_id = music.id;
    if (roles) settings.role_selection_channel_id = roles.id;

    await database.updateGuildSettings(guildId, settings);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Channel Setup Complete')
        .setDescription('Server channels have been configured successfully!')
        .setTimestamp();

    if (logs) embed.addFields({ name: '📋 Logs', value: `<#${logs.id}>`, inline: true });
    if (announcements) embed.addFields({ name: '📢 Announcements', value: `<#${announcements.id}>`, inline: true });
    if (welcome) embed.addFields({ name: '👋 Welcome', value: `<#${welcome.id}>`, inline: true });
    if (music) embed.addFields({ name: '🎵 Music', value: `<#${music.id}>`, inline: true });
    if (roles) embed.addFields({ name: '🎭 Roles', value: `<#${roles.id}>`, inline: true });

    await interaction.reply({ embeds: [embed] });
}

async function handleVoiceSetup(interaction, guildId) {
    const category = interaction.options.getChannel('category');
    const trigger = interaction.options.getChannel('trigger');
    const template = interaction.options.getString('template') || '{user}\'s Channel';

    const settings = {
        voice_category_id: category.id,
        voice_trigger_channel_id: trigger.id,
        voice_name_template: template
    };

    await database.updateGuildSettings(guildId, settings);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Voice System Setup Complete')
        .setDescription('Automatic voice channel creation has been configured!')
        .addFields(
            { name: '📁 Category', value: category.name, inline: true },
            { name: '🔗 Trigger Channel', value: `<#${trigger.id}>`, inline: true },
            { name: '📝 Name Template', value: template, inline: true }
        )
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleCasinoSetup(interaction, guildId) {
    const category = interaction.options.getChannel('category');

    const settings = {
        casino_category_id: category.id
    };

    await database.updateGuildSettings(guildId, settings);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Casino Setup Complete')
        .setDescription('Casino system has been configured!')
        .addFields({ name: '📁 Casino Category', value: category.name, inline: true })
        .setFooter({ text: 'Use /admin casino assign-game to assign games to specific channels' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleSetRestriction(interaction, guildId) {
    const channel = interaction.options.getChannel('channel');
    const command = interaction.options.getString('command');
    const allowed = interaction.options.getBoolean('allowed');

    await database.setChannelRestriction(guildId, channel.id, command, allowed);

    const embed = new EmbedBuilder()
        .setColor(allowed ? 0x00FF00 : 0xFF0000)
        .setTitle('✅ Channel Restriction Updated')
        .setDescription(`${command} commands are now ${allowed ? 'allowed' : 'blocked'} in <#${channel.id}>`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleListRestrictions(interaction, guildId) {
    const restrictions = await database.getChannelRestrictions(guildId);

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔒 Channel Restrictions')
        .setTimestamp();

    if (restrictions.length === 0) {
        embed.setDescription('No channel restrictions configured.');
    } else {
        const restrictionText = restrictions
            .map(r => `<#${r.channel_id}>: **${r.command_name}** - ${r.allowed ? '✅ Allowed' : '❌ Blocked'}`)
            .join('\n');
        embed.setDescription(restrictionText);
    }

    await interaction.reply({ embeds: [embed] });
}

async function handleAssignGame(interaction, guildId) {
    const channel = interaction.options.getChannel('channel');
    const game = interaction.options.getString('game');

    await database.setCasinoChannel(guildId, channel.id, game);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Casino Game Assigned')
        .setDescription(`**${game}** can now be played in <#${channel.id}>`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleDashboard(interaction, guildId) {
    const dashboardUrl = process.env.DASHBOARD_URL || 'http://localhost:3000';
    
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🖥️ Admin Dashboard')
        .setDescription(`Access the web dashboard to manage your server settings:\n\n[**Open Dashboard**](${dashboardUrl}/dashboard/${guildId})`)
        .addFields(
            { name: '🔧 Features', value: '• Server Settings\n• Channel Management\n• Activity Logs\n• User Management\n• Casino Statistics', inline: true },
            { name: '📊 Analytics', value: '• Command Usage\n• User Activity\n• Economy Stats\n• Voice Channel Usage', inline: true }
        )
        .setFooter({ text: 'Dashboard requires admin permissions' })
        .setTimestamp();

    await interaction.reply({ embeds: [embed], ephemeral: true });
}

async function handleStatus(interaction, guildId) {
    const settings = await database.getGuildSettings(guildId);
    const restrictions = await database.getChannelRestrictions(guildId);
    const casinoChannels = await database.getCasinoChannels(guildId);

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('⚙️ Server Configuration Status')
        .setTimestamp();

    let description = '**📋 Configured Channels:**\n';
    description += settings.log_channel_id ? `• Logs: <#${settings.log_channel_id}>\n` : '• Logs: Not set\n';
    description += settings.announcement_channel_id ? `• Announcements: <#${settings.announcement_channel_id}>\n` : '• Announcements: Not set\n';
    description += settings.welcome_channel_id ? `• Welcome: <#${settings.welcome_channel_id}>\n` : '• Welcome: Not set\n';
    description += settings.music_channel_id ? `• Music: <#${settings.music_channel_id}>\n` : '• Music: Not set\n';
    description += settings.role_selection_channel_id ? `• Roles: <#${settings.role_selection_channel_id}>\n` : '• Roles: Not set\n';

    description += '\n**🔊 Voice System:**\n';
    description += settings.voice_category_id ? `• Category: <#${settings.voice_category_id}>\n` : '• Category: Not set\n';
    description += settings.voice_trigger_channel_id ? `• Trigger: <#${settings.voice_trigger_channel_id}>\n` : '• Trigger: Not set\n';

    description += '\n**🎰 Casino System:**\n';
    description += settings.casino_category_id ? `• Category: <#${settings.casino_category_id}>\n` : '• Category: Not set\n';
    description += `• Game Channels: ${casinoChannels.length} configured\n`;

    description += `\n**🔒 Restrictions:** ${restrictions.length} active`;

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}