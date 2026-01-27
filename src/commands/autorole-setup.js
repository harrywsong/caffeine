const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');
const { cleanupEmptyColorRoles } = require('../utils/colorRoleCleanup');
const { cacheAutoRoleMessages } = require('../utils/autoRoleCache');

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

function saveAutoRoleSections(data) {
    try {
        const dir = path.dirname(autoRoleFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(autoRoleFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto role sections:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole-setup')
        .setDescription('Setup dedicated auto role sections')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-all')
                .setDescription('Create all auto role section messages'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-color')
                .setDescription('Create the color role section'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-timezone')
                .setDescription('Create the timezone role section'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-games')
                .setDescription('Create the games role section'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('create-activities')
                .setDescription('Create the activities role section'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-message')
                .setDescription('Edit an existing auto role section message')
                .addStringOption(option =>
                    option.setName('section')
                        .setDescription('Which section to edit')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Color', value: 'color' },
                            { name: 'Timezone', value: 'timezone' },
                            { name: 'Games', value: 'games' },
                            { name: 'Activities', value: 'activities' }
                        ))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('New title for the section')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New description for the section')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-activity-role')
                .setDescription('Add a new activity role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The activity role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this activity role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-activity-role')
                .setDescription('Remove an activity role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The activity role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-timezone-role')
                .setDescription('Add a new timezone role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The timezone role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this timezone role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-timezone-role')
                .setDescription('Remove a timezone role')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The timezone role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-role')
                .setDescription('Add a role to any auto role message')
                .addStringOption(option =>
                    option.setName('message-id')
                        .setDescription('The message ID of the auto role message')
                        .setRequired(true))
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove-role')
                .setDescription('Remove a role from any auto role message')
                .addStringOption(option =>
                    option.setName('message-id')
                        .setDescription('The message ID of the auto role message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('The emoji of the role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('edit-embed')
                .setDescription('Edit the embed of any auto role message')
                .addStringOption(option =>
                    option.setName('message-id')
                        .setDescription('The message ID of the auto role message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('New title for the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('New description for the embed')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('color')
                        .setDescription('New color for the embed (hex code like #FF69B4)')
                        .setRequired(false))
                .addStringOption(option =>
                    option.setName('footer')
                        .setDescription('New footer text for the embed')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('cleanup-colors')
                .setDescription('Remove all empty color roles (roles starting with "Color:" that have 0 members)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('recache-messages')
                .setDescription('Recache all auto role messages (fixes reaction issues after bot restart)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('update-color-buttons')
                .setDescription('Update existing color message to include the remove button'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('force-recache')
                .setDescription('Force recache all auto role messages and reactions (fixes reaction delays)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current auto role section status'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'create-all':
                await handleCreateAll(interaction, guildId);
                break;
            case 'create-color':
                await handleCreateColor(interaction, guildId);
                break;
            case 'create-timezone':
                await handleCreateTimezone(interaction, guildId);
                break;
            case 'create-games':
                await handleCreateGames(interaction, guildId);
                break;
            case 'create-activities':
                await handleCreateActivities(interaction, guildId);
                break;
            case 'edit-message':
                await handleEditMessage(interaction, guildId);
                break;
            case 'add-activity-role':
                await handleAddActivityRole(interaction, guildId);
                break;
            case 'remove-activity-role':
                await handleRemoveActivityRole(interaction, guildId);
                break;
            case 'add-timezone-role':
                await handleAddTimezoneRole(interaction, guildId);
                break;
            case 'remove-timezone-role':
                await handleRemoveTimezoneRole(interaction, guildId);
                break;
            case 'add-role':
                await handleAddRole(interaction, guildId);
                break;
            case 'remove-role':
                await handleRemoveRole(interaction, guildId);
                break;
            case 'edit-embed':
                await handleEditEmbed(interaction, guildId);
                break;
            case 'cleanup-colors':
                await handleCleanupColors(interaction, guildId);
                break;
            case 'recache-messages':
                await handleRecacheMessages(interaction, guildId);
                break;
            case 'update-color-buttons':
                await handleUpdateColorButtons(interaction, guildId);
                break;
            case 'force-recache':
                await handleForceRecache(interaction, guildId);
                break;
            case 'status':
                await handleStatus(interaction, guildId);
                break;
        }
    },

    // Export functions for button handling
    handleColorButton,
    loadAutoRoleSections,
    saveAutoRoleSections
};

async function handleCreateAll(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });
    
    try {
        // Send each section as a separate message to the channel
        await createColorSection(interaction.channel, guildId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await createTimezoneSection(interaction.channel, guildId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await createGamesSection(interaction.channel, guildId);
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        await createActivitiesSection(interaction.channel, guildId);
        
        await interaction.editReply({
            content: '✅ Auto role sections created!'
        });
    } catch (error) {
        console.error('Error creating all sections:', error);
        await interaction.editReply({
            content: '❌ There was an error creating some sections. Please check the logs.'
        });
    }
}

async function createColorSection(channel, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎨 Color Roles')
        .setDescription('Click the button below to request a custom color role!\n\n' +
                       '• You can have **one color role** at a time\n' +
                       '• Provide a **hex code** (e.g., #FF69B4)\n' +
                       '• Change your color anytime\n' +
                       '• Empty color roles are automatically deleted')
        .setFooter({ text: 'Custom colors make you stand out in the member list!' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('color_request')
                .setLabel('Request Custom Color')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎨'),
            new ButtonBuilder()
                .setCustomId('color_remove')
                .setLabel('Remove Color')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );

    const message = await channel.send({ embeds: [embed], components: [row] });

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].color = {
        channelId: channel.id,
        messageId: message.id
    };
    saveAutoRoleSections(sections);
}

async function createTimezoneSection(channel, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0x00CED1)
        .setTitle('🌍 Timezone Roles')
        .setDescription('React with the emoji that matches your timezone!\n\n' +
                       '🌊 **Pacific** - West Coast US/Canada\n' +
                       '🏔️ **Central** - Central US/Canada\n' +
                       '🌆 **Eastern** - East Coast US/Canada\n' +
                       '🌸 **KST** - Korean Standard Time\n\n' +
                       '💡 *You can select multiple timezones!*')
        .setFooter({ text: 'This helps others know when you\'re likely to be online!' })
        .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Add reactions
    const reactions = ['🌊', '🏔️', '🌆', '🌸'];
    for (const reaction of reactions) {
        await message.react(reaction);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].timezone = {
        channelId: channel.id,
        messageId: message.id,
        roles: {
            '🌊': '1415145706221469780', // Pacific
            '🏔️': '1415145846520938536', // Central
            '🌆': '1415145929622818816', // Eastern
            '🌸': '1465531525461446840'  // KST
        }
    };
    saveAutoRoleSections(sections);
}

async function createGamesSection(channel, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle('🎮 Game Roles')
        .setDescription('React to get notified about specific games!\n\n' +
                       '• React to get notified about specific games\n' +
                       '• Find others who play the same games\n' +
                       '• Get pinged for game events and tournaments\n\n' +
                       '💡 *You can select multiple games!*')
        .setFooter({ text: 'More game roles coming soon!' })
        .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].games = {
        channelId: channel.id,
        messageId: message.id,
        roles: {} // Will be populated when games are added
    };
    saveAutoRoleSections(sections);
}

async function createActivitiesSection(channel, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🎯 Activity Roles')
        .setDescription('React to show your favorite server activities!\n\n' +
                       '🎰 **Casino** - Love gambling and casino games\n' +
                       '🎤 **Voice** - Enjoy hanging out in voice channels\n\n' +
                       '💡 *You can select multiple activities!*')
        .setFooter({ text: 'Let others know what you enjoy doing!' })
        .setTimestamp();

    const message = await channel.send({ embeds: [embed] });

    // Add reactions
    const reactions = ['🎰', '🎤'];
    for (const reaction of reactions) {
        await message.react(reaction);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].activities = {
        channelId: channel.id,
        messageId: message.id,
        roles: {
            '🎰': '1465483149424332993', // Casino
            '🎤': '1465482411839324224'  // Voice
        }
    };
    saveAutoRoleSections(sections);
}

async function handleCreateColor(interaction, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0xFF69B4)
        .setTitle('🎨 Color Roles')
        .setDescription('Click the button below to request a custom color role!\n\n' +
                       '• You can have **one color role** at a time\n' +
                       '• Provide a **hex code** (e.g., #FF69B4)\n' +
                       '• Change your color anytime\n' +
                       '• Empty color roles are automatically deleted')
        .setFooter({ text: 'Custom colors make you stand out in the member list!' })
        .setTimestamp();

    const row = new ActionRowBuilder()
        .addComponents(
            new ButtonBuilder()
                .setCustomId('color_request')
                .setLabel('Request Custom Color')
                .setStyle(ButtonStyle.Primary)
                .setEmoji('🎨'),
            new ButtonBuilder()
                .setCustomId('color_remove')
                .setLabel('Remove Color')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('🗑️')
        );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].color = {
        channelId: interaction.channel.id,
        messageId: message.id
    };
    saveAutoRoleSections(sections);
}

async function handleCreateTimezone(interaction, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0x00CED1)
        .setTitle('🌍 Timezone Roles')
        .setDescription('React with the emoji that matches your timezone!\n\n' +
                       '🌊 **Pacific** - West Coast US/Canada\n' +
                       '🏔️ **Central** - Central US/Canada\n' +
                       '🌆 **Eastern** - East Coast US/Canada\n' +
                       '🌸 **KST** - Korean Standard Time\n\n' +
                       '💡 *You can select multiple timezones!*')
        .setFooter({ text: 'This helps others know when you\'re likely to be online!' })
        .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Add reactions
    const reactions = ['🌊', '🏔️', '🌆', '🌸'];
    for (const reaction of reactions) {
        await message.react(reaction);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].timezone = {
        channelId: interaction.channel.id,
        messageId: message.id,
        roles: {
            '🌊': '1415145706221469780', // Pacific
            '🏔️': '1415145846520938536', // Central
            '🌆': '1415145929622818816', // Eastern
            '🌸': '1465531525461446840'  // KST
        }
    };
    saveAutoRoleSections(sections);
}

async function handleCreateGames(interaction, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0x9932CC)
        .setTitle('🎮 Game Roles')
        .setDescription('React to get notified about specific games!\n\n' +
                       '• React to get notified about specific games\n' +
                       '• Find others who play the same games\n' +
                       '• Get pinged for game events and tournaments\n\n' +
                       '💡 *You can select multiple games!*')
        .setFooter({ text: 'More game roles coming soon!' })
        .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].games = {
        channelId: interaction.channel.id,
        messageId: message.id,
        roles: {} // Will be populated when games are added
    };
    saveAutoRoleSections(sections);
}

async function handleCreateActivities(interaction, guildId) {
    const embed = new EmbedBuilder()
        .setColor(0xFF4500)
        .setTitle('🎯 Activity Roles')
        .setDescription('React to show your favorite server activities!\n\n' +
                       '🎰 **Casino** - Love gambling and casino games\n' +
                       '🎤 **Voice** - Enjoy hanging out in voice channels\n\n' +
                       '💡 *You can select multiple activities!*')
        .setFooter({ text: 'Let others know what you enjoy doing!' })
        .setTimestamp();

    const message = await interaction.reply({ embeds: [embed], fetchReply: true });

    // Add reactions
    const reactions = ['🎰', '🎤'];
    for (const reaction of reactions) {
        await message.react(reaction);
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    // Save message info
    const sections = loadAutoRoleSections();
    if (!sections[guildId]) sections[guildId] = {};
    sections[guildId].activities = {
        channelId: interaction.channel.id,
        messageId: message.id,
        roles: {
            '🎰': '1465483149424332993', // Casino
            '🎤': '1465482411839324224'  // Voice
        }
    };
    saveAutoRoleSections(sections);
}

async function handleStatus(interaction, guildId) {
    const sections = loadAutoRoleSections();
    const guildData = sections[guildId];

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('📋 Auto Role Sections Status')
        .setTimestamp();

    if (!guildData) {
        embed.setDescription('No auto role sections configured for this server.');
        return interaction.reply({ embeds: [embed] });
    }

    let description = '';
    
    if (guildData.color) {
        description += `✅ **Color Section:** \`${guildData.color.messageId}\`\n`;
    } else {
        description += '❌ **Color Section:** Not configured\n';
    }

    if (guildData.timezone) {
        const roleCount = Object.keys(guildData.timezone.roles || {}).length;
        description += `✅ **Timezone Section:** \`${guildData.timezone.messageId}\` (${roleCount} roles)\n`;
    } else {
        description += '❌ **Timezone Section:** Not configured\n';
    }

    if (guildData.games) {
        const roleCount = Object.keys(guildData.games.roles || {}).length;
        description += `✅ **Games Section:** \`${guildData.games.messageId}\` (${roleCount} roles)\n`;
    } else {
        description += '❌ **Games Section:** Not configured\n';
    }

    if (guildData.activities) {
        const roleCount = Object.keys(guildData.activities.roles || {}).length;
        description += `✅ **Activities Section:** \`${guildData.activities.messageId}\` (${roleCount} roles)\n`;
    } else {
        description += '❌ **Activities Section:** Not configured\n';
    }

    description += '\n**Usage:**\n';
    description += '• `/autorole-setup add-role message-id:<ID> role:@Role emoji:🎮`\n';
    description += '• `/autorole-setup remove-role message-id:<ID> emoji:🎮`\n';
    description += '• `/autorole-setup edit-embed message-id:<ID> title:"New Title"`\n';
    description += '• `/autorole-setup cleanup-colors` - Remove empty color roles\n';
    description += '• `/autorole-setup recache-messages` - Fix reaction issues\n';
    description += '• `/autorole-setup force-recache` - Fix reaction delays (aggressive)\n';
    description += '• `/autorole-setup update-color-buttons` - Add remove button to existing color message';

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}

// Handle color button interactions
async function handleColorButton(interaction) {
    const { ModalBuilder, TextInputBuilder, TextInputStyle, ActionRowBuilder } = require('discord.js');
    
    const modal = new ModalBuilder()
        .setCustomId('color_modal')
        .setTitle('Request Custom Color Role');

    const colorInput = new TextInputBuilder()
        .setCustomId('hex_color')
        .setLabel('Hex Color Code')
        .setStyle(TextInputStyle.Short)
        .setPlaceholder('#FF69B4 (include the #)')
        .setRequired(true)
        .setMinLength(7)
        .setMaxLength(7);

    const row = new ActionRowBuilder().addComponents(colorInput);
    modal.addComponents(row);

    await interaction.showModal(modal);
}

async function handleEditMessage(interaction, guildId) {
    const section = interaction.options.getString('section');
    const newTitle = interaction.options.getString('title');
    const newDescription = interaction.options.getString('description');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId][section]) {
        return interaction.reply({
            content: `❌ ${section.charAt(0).toUpperCase() + section.slice(1)} section not found! Please create it first.`,
            ephemeral: true
        });
    }

    const sectionData = sections[guildId][section];

    try {
        const channel = await interaction.client.channels.fetch(sectionData.channelId);
        const message = await channel.messages.fetch(sectionData.messageId);

        const { EmbedBuilder } = require('discord.js');
        const currentEmbed = message.embeds[0];
        
        const embed = new EmbedBuilder()
            .setColor(currentEmbed.color)
            .setTitle(newTitle || currentEmbed.title)
            .setDescription(newDescription || currentEmbed.description)
            .setFooter(currentEmbed.footer)
            .setTimestamp();

        await message.edit({ embeds: [embed], components: message.components });

        await interaction.reply({
            content: `✅ Updated ${section} section message!`,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error editing message:', error);
        await interaction.reply({
            content: '❌ Failed to edit the message. Please check if it still exists.',
            ephemeral: true
        });
    }
}

async function handleAddActivityRole(interaction, guildId) {
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].activities) {
        return interaction.reply({
            content: '❌ Activities section not found! Please create it first using `/autorole-setup create-activities`',
            ephemeral: true
        });
    }

    // Check if bot can assign this role
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role because it\'s higher than or equal to my highest role!',
            ephemeral: true
        });
    }

    // Add the role to the activities section
    sections[guildId].activities.roles[emoji] = role.id;
    saveAutoRoleSections(sections);

    // Update the activities message
    await updateActivitiesMessage(interaction, guildId, sections[guildId].activities);

    await interaction.reply({
        content: `✅ Added **${role.name}** with ${emoji} to the activities section!`,
        ephemeral: true
    });
}

async function handleRemoveActivityRole(interaction, guildId) {
    const role = interaction.options.getRole('role');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].activities) {
        return interaction.reply({
            content: '❌ Activities section not found!',
            ephemeral: true
        });
    }

    // Find and remove the role
    let removedEmoji = null;
    for (const [emoji, roleId] of Object.entries(sections[guildId].activities.roles)) {
        if (roleId === role.id) {
            delete sections[guildId].activities.roles[emoji];
            removedEmoji = emoji;
            break;
        }
    }

    if (!removedEmoji) {
        return interaction.reply({
            content: '❌ This role is not in the activities section!',
            ephemeral: true
        });
    }

    saveAutoRoleSections(sections);

    // Update the activities message
    await updateActivitiesMessage(interaction, guildId, sections[guildId].activities);

    await interaction.reply({
        content: `✅ Removed **${role.name}** (${removedEmoji}) from the activities section!`,
        ephemeral: true
    });
}

async function handleAddTimezoneRole(interaction, guildId) {
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].timezone) {
        return interaction.reply({
            content: '❌ Timezone section not found! Please create it first using `/autorole-setup create-timezone`',
            ephemeral: true
        });
    }

    // Check if bot can assign this role
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role because it\'s higher than or equal to my highest role!',
            ephemeral: true
        });
    }

    // Add the role to the timezone section
    sections[guildId].timezone.roles[emoji] = role.id;
    saveAutoRoleSections(sections);

    // Update the timezone message
    await updateTimezoneMessage(interaction, guildId, sections[guildId].timezone);

    await interaction.reply({
        content: `✅ Added **${role.name}** with ${emoji} to the timezone section!`,
        ephemeral: true
    });
}

async function handleRemoveTimezoneRole(interaction, guildId) {
    const role = interaction.options.getRole('role');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].timezone) {
        return interaction.reply({
            content: '❌ Timezone section not found!',
            ephemeral: true
        });
    }

    // Find and remove the role
    let removedEmoji = null;
    for (const [emoji, roleId] of Object.entries(sections[guildId].timezone.roles)) {
        if (roleId === role.id) {
            delete sections[guildId].timezone.roles[emoji];
            removedEmoji = emoji;
            break;
        }
    }

    if (!removedEmoji) {
        return interaction.reply({
            content: '❌ This role is not in the timezone section!',
            ephemeral: true
        });
    }

    saveAutoRoleSections(sections);

    // Update the timezone message
    await updateTimezoneMessage(interaction, guildId, sections[guildId].timezone);

    await interaction.reply({
        content: `✅ Removed **${role.name}** (${removedEmoji}) from the timezone section!`,
        ephemeral: true
    });
}

async function handleAddRole(interaction, guildId) {
    const messageId = interaction.options.getString('message-id');
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');

    const sections = loadAutoRoleSections();
    if (!sections[guildId]) {
        return interaction.reply({
            content: '❌ No auto role sections found for this server!',
            ephemeral: true
        });
    }

    // Find which section this message belongs to
    let sectionType = null;
    let sectionData = null;
    
    for (const [type, data] of Object.entries(sections[guildId])) {
        if (data.messageId === messageId) {
            sectionType = type;
            sectionData = data;
            break;
        }
    }

    if (!sectionData) {
        return interaction.reply({
            content: '❌ Message ID not found! Make sure you\'re using a valid auto role message ID.',
            ephemeral: true
        });
    }

    // Check if bot can assign this role
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role because it\'s higher than or equal to my highest role!',
            ephemeral: true
        });
    }

    // Add the role
    if (!sectionData.roles) sectionData.roles = {};
    sectionData.roles[emoji] = role.id;
    saveAutoRoleSections(sections);

    // Update the message
    await updateAutoRoleMessage(interaction, sectionType, sectionData);

    await interaction.reply({
        content: `✅ Added **${role.name}** with ${emoji} to the ${sectionType} section!`,
        ephemeral: true
    });
}

async function handleRemoveRole(interaction, guildId) {
    const messageId = interaction.options.getString('message-id');
    const emoji = interaction.options.getString('emoji');

    const sections = loadAutoRoleSections();
    if (!sections[guildId]) {
        return interaction.reply({
            content: '❌ No auto role sections found for this server!',
            ephemeral: true
        });
    }

    // Find which section this message belongs to
    let sectionType = null;
    let sectionData = null;
    
    for (const [type, data] of Object.entries(sections[guildId])) {
        if (data.messageId === messageId) {
            sectionType = type;
            sectionData = data;
            break;
        }
    }

    if (!sectionData) {
        return interaction.reply({
            content: '❌ Message ID not found! Make sure you\'re using a valid auto role message ID.',
            ephemeral: true
        });
    }

    if (!sectionData.roles || !sectionData.roles[emoji]) {
        return interaction.reply({
            content: '❌ This emoji is not assigned to any role in this message!',
            ephemeral: true
        });
    }

    // Get role name before removing
    const roleId = sectionData.roles[emoji];
    const role = interaction.guild.roles.cache.get(roleId);
    const roleName = role ? role.name : 'Unknown Role';

    // Remove the role
    delete sectionData.roles[emoji];
    saveAutoRoleSections(sections);

    // Update the message
    await updateAutoRoleMessage(interaction, sectionType, sectionData);

    await interaction.reply({
        content: `✅ Removed **${roleName}** (${emoji}) from the ${sectionType} section!`,
        ephemeral: true
    });
}

async function handleEditEmbed(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });

    const messageId = interaction.options.getString('message-id');
    const newTitle = interaction.options.getString('title');
    const newDescription = interaction.options.getString('description');
    const newColor = interaction.options.getString('color');
    const newFooter = interaction.options.getString('footer');

    const sections = loadAutoRoleSections();
    if (!sections[guildId]) {
        return interaction.editReply({
            content: '❌ No auto role sections found for this server!'
        });
    }

    // Find which section this message belongs to
    let sectionType = null;
    let sectionData = null;
    
    for (const [type, data] of Object.entries(sections[guildId])) {
        if (data.messageId === messageId) {
            sectionType = type;
            sectionData = data;
            break;
        }
    }

    if (!sectionData) {
        return interaction.editReply({
            content: '❌ Message ID not found! Make sure you\'re using a valid auto role message ID.'
        });
    }

    try {
        const channel = await interaction.client.channels.fetch(sectionData.channelId);
        const message = await channel.messages.fetch(sectionData.messageId);

        if (!message.embeds || message.embeds.length === 0) {
            return interaction.editReply({
                content: '❌ This message doesn\'t have an embed to edit!'
            });
        }

        const currentEmbed = message.embeds[0];
        const { EmbedBuilder } = require('discord.js');

        // Parse color if provided
        let embedColor = currentEmbed.color;
        if (newColor) {
            if (newColor.startsWith('#')) {
                embedColor = parseInt(newColor.slice(1), 16);
            } else {
                return interaction.editReply({
                    content: '❌ Color must be a hex code starting with # (e.g., #FF69B4)'
                });
            }
        }

        // Create new embed with updated values
        const embed = new EmbedBuilder()
            .setColor(embedColor)
            .setTitle(newTitle || currentEmbed.title)
            .setDescription((newDescription || currentEmbed.description).replace(/\\n/g, '\n'))
            .setTimestamp();

        // Set footer
        if (newFooter) {
            embed.setFooter({ text: newFooter.replace(/\\n/g, '\n') });
        } else if (currentEmbed.footer) {
            embed.setFooter({ text: currentEmbed.footer.text });
        }

        // Save custom embed data to preserve user changes
        if (!sectionData.customEmbed) sectionData.customEmbed = {};
        if (newTitle) sectionData.customEmbed.title = newTitle;
        if (newDescription) sectionData.customEmbed.description = newDescription.replace(/\\n/g, '\n');
        if (newColor) sectionData.customEmbed.color = embedColor;
        if (newFooter) sectionData.customEmbed.footer = newFooter.replace(/\\n/g, '\n');
        
        saveAutoRoleSections(sections);

        await message.edit({ embeds: [embed], components: message.components });

        const changes = [];
        if (newTitle) changes.push('title');
        if (newDescription) changes.push('description');
        if (newColor) changes.push('color');
        if (newFooter) changes.push('footer');

        await interaction.editReply({
            content: `✅ Updated ${changes.join(', ')} for the ${sectionType} section!`
        });

    } catch (error) {
        console.error('Error editing embed:', error);
        await interaction.editReply({
            content: '❌ Failed to edit the embed. Please check if the message still exists.'
        });
    }
}

async function handleCleanupColors(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });

    try {
        // Get the specific guild
        const guild = interaction.guild;
        await guild.roles.fetch(); // Ensure we have all roles cached

        // Find all roles that start with "Color:"
        const colorRoles = guild.roles.cache.filter(role => 
            role.name.startsWith('Color:') && role.members.size === 0
        );

        if (colorRoles.size === 0) {
            return interaction.editReply({
                content: '✅ No empty color roles found! All color roles are being used.'
            });
        }

        // Check if bot can delete these roles
        const botMember = guild.members.me;
        const deletableRoles = colorRoles.filter(role => 
            role.position < botMember.roles.highest.position && 
            role.id !== guild.id // Don't try to delete @everyone
        );

        const undeletableRoles = colorRoles.filter(role => 
            role.position >= botMember.roles.highest.position
        );

        let deletedCount = 0;
        const deletedRoles = [];

        // Delete the roles
        for (const role of deletableRoles.values()) {
            try {
                await role.delete('Manual cleanup: Empty color role');
                deletedRoles.push(role.name);
                deletedCount++;
                
                // Small delay to avoid rate limits
                await new Promise(resolve => setTimeout(resolve, 500));
            } catch (error) {
                console.error(`Failed to delete role ${role.name}:`, error);
            }
        }

        // Prepare response message
        let responseMessage = '';
        
        if (deletedCount > 0) {
            responseMessage += `✅ **Deleted ${deletedCount} empty color role${deletedCount === 1 ? '' : 's'}:**\n`;
            responseMessage += deletedRoles.map(name => `• ${name}`).join('\n');
        }

        if (undeletableRoles.size > 0) {
            if (responseMessage) responseMessage += '\n\n';
            responseMessage += `⚠️ **Could not delete ${undeletableRoles.size} role${undeletableRoles.size === 1 ? '' : 's'} (higher than bot role):**\n`;
            responseMessage += undeletableRoles.map(role => `• ${role.name}`).join('\n');
        }

        if (!responseMessage) {
            responseMessage = '❌ No roles could be deleted. Check bot permissions.';
        }

        // Add info about automatic cleanup
        responseMessage += '\n\n💡 **Note:** This cleanup also runs automatically every 24 hours!';

        await interaction.editReply({
            content: responseMessage
        });

    } catch (error) {
        console.error('Error during color cleanup:', error);
        await interaction.editReply({
            content: '❌ An error occurred during cleanup. Please check the logs.'
        });
    }
}

async function handleRecacheMessages(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData) {
            return interaction.editReply({
                content: '❌ No auto role sections found for this server!'
            });
        }

        let cachedCount = 0;
        let failedCount = 0;
        const results = [];

        // Cache each auto role message for this guild
        for (const [sectionType, sectionData] of Object.entries(guildData)) {
            if (!sectionData.channelId || !sectionData.messageId) continue;

            try {
                const channel = await interaction.guild.channels.fetch(sectionData.channelId);
                if (!channel) {
                    results.push(`⚠️ ${sectionType}: Channel not found`);
                    failedCount++;
                    continue;
                }

                const message = await channel.messages.fetch(sectionData.messageId);
                if (!message) {
                    results.push(`⚠️ ${sectionType}: Message not found`);
                    failedCount++;
                    continue;
                }

                // Fetch all reactions for this message to ensure they're cached
                let reactionCount = 0;
                if (message.reactions.cache.size > 0) {
                    for (const reaction of message.reactions.cache.values()) {
                        try {
                            await reaction.users.fetch();
                            reactionCount++;
                        } catch (error) {
                            console.error(`Error fetching users for reaction ${reaction.emoji.name}:`, error.message);
                        }
                    }
                }

                results.push(`✅ ${sectionType}: Cached (${reactionCount} reactions)`);
                cachedCount++;

            } catch (error) {
                results.push(`❌ ${sectionType}: ${error.message}`);
                failedCount++;
            }
        }

        const responseMessage = `🔄 **Message Recaching Results:**\n\n${results.join('\n')}\n\n📊 **Summary:** ${cachedCount} cached, ${failedCount} failed\n\n💡 **Note:** This happens automatically on bot startup!`;

        await interaction.editReply({
            content: responseMessage
        });

    } catch (error) {
        console.error('Error during message recaching:', error);
        await interaction.editReply({
            content: '❌ An error occurred during recaching. Please check the logs.'
        });
    }
}

async function handleUpdateColorButtons(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData || !guildData.color) {
            return interaction.editReply({
                content: '❌ No color section found for this server! Please create one first using `/autorole-setup create-color`'
            });
        }

        const colorData = guildData.color;

        // Fetch the color message
        const channel = await interaction.guild.channels.fetch(colorData.channelId);
        if (!channel) {
            return interaction.editReply({
                content: '❌ Color section channel not found!'
            });
        }

        const message = await channel.messages.fetch(colorData.messageId);
        if (!message) {
            return interaction.editReply({
                content: '❌ Color section message not found!'
            });
        }

        // Create the updated button row with both buttons
        const row = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('color_request')
                    .setLabel('Request Custom Color')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🎨'),
                new ButtonBuilder()
                    .setCustomId('color_remove')
                    .setLabel('Remove Color')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🗑️')
            );

        // Update the message with the new buttons (keep existing embed)
        await message.edit({ 
            embeds: message.embeds, 
            components: [row] 
        });

        await interaction.editReply({
            content: '✅ Successfully updated the color section with the remove button!'
        });

        console.log(`🔄 Updated color section buttons for guild ${interaction.guild.name}`);

    } catch (error) {
        console.error('Error updating color buttons:', error);
        await interaction.editReply({
            content: '❌ An error occurred while updating the color buttons. Please check the logs.'
        });
    }
}

async function handleForceRecache(interaction, guildId) {
    await interaction.deferReply({ ephemeral: true });

    try {
        const sections = loadAutoRoleSections();
        const guildData = sections[guildId];

        if (!guildData) {
            return interaction.editReply({
                content: '❌ No auto role sections found for this server!'
            });
        }

        let cachedCount = 0;
        let failedCount = 0;
        const results = [];

        // Force recache each auto role message with aggressive fetching
        for (const [sectionType, sectionData] of Object.entries(guildData)) {
            if (!sectionData.channelId || !sectionData.messageId) continue;

            try {
                const channel = await interaction.guild.channels.fetch(sectionData.channelId);
                if (!channel) {
                    results.push(`⚠️ ${sectionType}: Channel not found`);
                    failedCount++;
                    continue;
                }

                const message = await channel.messages.fetch(sectionData.messageId, { force: true });
                if (!message) {
                    results.push(`⚠️ ${sectionType}: Message not found`);
                    failedCount++;
                    continue;
                }

                // Aggressively fetch all reactions and their users
                let reactionCount = 0;
                if (message.reactions.cache.size > 0) {
                    for (const reaction of message.reactions.cache.values()) {
                        try {
                            // Force fetch the reaction
                            await reaction.fetch();
                            // Force fetch all users who reacted
                            await reaction.users.fetch({ force: true });
                            reactionCount++;
                        } catch (error) {
                            console.error(`Error force-fetching reaction ${reaction.emoji.name}:`, error.message);
                        }
                    }
                }

                // Also fetch all guild members to ensure member cache is fresh
                await interaction.guild.members.fetch({ force: true });

                results.push(`✅ ${sectionType}: Force cached (${reactionCount} reactions, members refreshed)`);
                cachedCount++;

            } catch (error) {
                results.push(`❌ ${sectionType}: ${error.message}`);
                failedCount++;
            }
        }

        const responseMessage = `🔄 **Force Recache Results:**\n\n${results.join('\n')}\n\n📊 **Summary:** ${cachedCount} cached, ${failedCount} failed\n\n⚡ **Note:** This should fix reaction delay issues!`;

        await interaction.editReply({
            content: responseMessage
        });

        console.log(`🔄 Force recached auto role messages for guild ${interaction.guild.name}`);

    } catch (error) {
        console.error('Error during force recaching:', error);
        await interaction.editReply({
            content: '❌ An error occurred during force recaching. Please check the logs.'
        });
    }
}

async function updateActivitiesMessage(interaction, guildId, activitiesData) {
    try {
        const channel = await interaction.client.channels.fetch(activitiesData.channelId);
        const message = await channel.messages.fetch(activitiesData.messageId);

        const { EmbedBuilder } = require('discord.js');
        
        let description = 'React to show your favorite server activities!\n\n';
        
        for (const [emoji, roleId] of Object.entries(activitiesData.roles)) {
            const role = interaction.guild.roles.cache.get(roleId);
            description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0xFF4500)
            .setTitle('🎯 Activity Roles')
            .setDescription(description)
            .setFooter({ text: 'Let others know what you enjoy doing!' })
            .setTimestamp();

        await message.edit({ embeds: [embed] });

        // Add new reactions if needed
        for (const emoji of Object.keys(activitiesData.roles)) {
            if (!message.reactions.cache.has(emoji)) {
                await message.react(emoji);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

    } catch (error) {
        console.error('Error updating activities message:', error);
    }
}

async function updateTimezoneMessage(interaction, guildId, timezoneData) {
    try {
        const channel = await interaction.client.channels.fetch(timezoneData.channelId);
        const message = await channel.messages.fetch(timezoneData.messageId);

        const { EmbedBuilder } = require('discord.js');
        
        let description = 'React with the emoji that matches your timezone!\n\n';
        
        for (const [emoji, roleId] of Object.entries(timezoneData.roles)) {
            const role = interaction.guild.roles.cache.get(roleId);
            description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
        }

        const embed = new EmbedBuilder()
            .setColor(0x00CED1)
            .setTitle('🌍 Timezone Roles')
            .setDescription(description)
            .setFooter({ text: 'This helps others know when you\'re likely to be online!' })
            .setTimestamp();

        await message.edit({ embeds: [embed] });

        // Add new reactions if needed
        for (const emoji of Object.keys(timezoneData.roles)) {
            if (!message.reactions.cache.has(emoji)) {
                await message.react(emoji);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

    } catch (error) {
        console.error('Error updating timezone message:', error);
    }
}

async function updateAutoRoleMessage(interaction, sectionType, sectionData) {
    try {
        const channel = await interaction.client.channels.fetch(sectionData.channelId);
        const message = await channel.messages.fetch(sectionData.messageId);

        const { EmbedBuilder } = require('discord.js');
        
        let embed;
        
        switch (sectionType) {
            case 'color':
                // Color section doesn't use reactions, just return
                return;
                
            case 'timezone':
                embed = createTimezoneEmbed(interaction, sectionData);
                break;
                
            case 'games':
                embed = createGamesEmbed(interaction, sectionData);
                break;
                
            case 'activities':
                embed = createActivitiesEmbed(interaction, sectionData);
                break;
                
            default:
                console.error('Unknown section type:', sectionType);
                return;
        }

        await message.edit({ embeds: [embed] });

        // Add new reactions if needed
        if (sectionData.roles) {
            for (const emoji of Object.keys(sectionData.roles)) {
                if (!message.reactions.cache.has(emoji)) {
                    await message.react(emoji);
                    await new Promise(resolve => setTimeout(resolve, 500));
                }
            }
        }

    } catch (error) {
        console.error('Error updating auto role message:', error);
    }
}

function createTimezoneEmbed(interaction, timezoneData) {
    const { EmbedBuilder } = require('discord.js');
    
    // Use custom embed data if available, otherwise use defaults
    const customEmbed = timezoneData.customEmbed || {};
    
    let description = customEmbed.description;
    
    if (!description) {
        description = 'React with the emoji that matches your timezone!\n\n';
        
        for (const [emoji, roleId] of Object.entries(timezoneData.roles || {})) {
            const role = interaction.guild.roles.cache.get(roleId);
            description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
        }
        
        description += '\n💡 *You can select multiple timezones!*';
    }

    const embed = new EmbedBuilder()
        .setColor(customEmbed.color || 0x00CED1)
        .setTitle(customEmbed.title || '🌍 Timezone Roles')
        .setDescription(description)
        .setTimestamp();

    if (customEmbed.footer) {
        embed.setFooter({ text: customEmbed.footer });
    } else {
        embed.setFooter({ text: 'This helps others know when you\'re likely to be online!' });
    }

    return embed;
}

function createGamesEmbed(interaction, gamesData) {
    const { EmbedBuilder } = require('discord.js');
    
    // Use custom embed data if available, otherwise use defaults
    const customEmbed = gamesData.customEmbed || {};
    
    let description = customEmbed.description;
    
    if (!description) {
        description = 'React to get notified about specific games!\n\n';
        
        if (!gamesData.roles || Object.keys(gamesData.roles).length === 0) {
            description += '• React to get notified about specific games\n' +
                          '• Find others who play the same games\n' +
                          '• Get pinged for game events and tournaments\n\n' +
                          '💡 *You can select multiple games!*';
        } else {
            for (const [emoji, roleId] of Object.entries(gamesData.roles)) {
                const role = interaction.guild.roles.cache.get(roleId);
                description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
            }
            description += '\n💡 *You can select multiple games!*';
        }
    }

    const embed = new EmbedBuilder()
        .setColor(customEmbed.color || 0x9932CC)
        .setTitle(customEmbed.title || '🎮 Game Roles')
        .setDescription(description)
        .setTimestamp();

    if (customEmbed.footer) {
        embed.setFooter({ text: customEmbed.footer });
    } else {
        const defaultFooter = Object.keys(gamesData.roles || {}).length === 0 ? 'More game roles coming soon!' : 'React to get your game roles!';
        embed.setFooter({ text: defaultFooter });
    }

    return embed;
}

function createActivitiesEmbed(interaction, activitiesData) {
    const { EmbedBuilder } = require('discord.js');
    
    // Use custom embed data if available, otherwise use defaults
    const customEmbed = activitiesData.customEmbed || {};
    
    let description = customEmbed.description;
    
    if (!description) {
        description = 'React to show your favorite server activities!\n\n';
        
        for (const [emoji, roleId] of Object.entries(activitiesData.roles || {})) {
            const role = interaction.guild.roles.cache.get(roleId);
            description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
        }
        
        description += '\n💡 *You can select multiple activities!*';
    }

    const embed = new EmbedBuilder()
        .setColor(customEmbed.color || 0xFF4500)
        .setTitle(customEmbed.title || '🎯 Activity Roles')
        .setDescription(description)
        .setTimestamp();

    if (customEmbed.footer) {
        embed.setFooter({ text: customEmbed.footer });
    } else {
        embed.setFooter({ text: 'Let others know what you enjoy doing!' });
    }

    return embed;
}