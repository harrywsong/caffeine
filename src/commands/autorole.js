const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, StringSelectMenuBuilder, PermissionFlagsBits } = require('discord.js');
const fs = require('fs');
const path = require('path');

// Auto role configuration file
const autoRoleFile = path.join(__dirname, '..', 'data', 'autoroles.json');

function loadAutoRoles() {
    try {
        if (fs.existsSync(autoRoleFile)) {
            return JSON.parse(fs.readFileSync(autoRoleFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading auto roles:', error);
    }
    return {};
}

function saveAutoRoles(data) {
    try {
        const dir = path.dirname(autoRoleFile);
        if (!fs.existsSync(dir)) {
            fs.mkdirSync(dir, { recursive: true });
        }
        fs.writeFileSync(autoRoleFile, JSON.stringify(data, null, 2));
    } catch (error) {
        console.error('Error saving auto roles:', error);
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole')
        .setDescription('Auto role assignment system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('setup')
                .setDescription('Setup auto role assignment for new members')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to assign to new members')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove auto role assignment'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('reaction')
                .setDescription('Create a reaction role message')
                .addStringOption(option =>
                    option.setName('title')
                        .setDescription('Title for the role selection message')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for the role selection message')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('add-reaction-role')
                .setDescription('Add a role to the reaction role system')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('Role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this role')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Description for this role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('status')
                .setDescription('Show current auto role configuration'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'setup':
                await handleSetup(interaction, guildId);
                break;
            case 'remove':
                await handleRemove(interaction, guildId);
                break;
            case 'reaction':
                await handleReactionSetup(interaction, guildId);
                break;
            case 'add-reaction-role':
                await handleAddReactionRole(interaction, guildId);
                break;
            case 'status':
                await handleStatus(interaction, guildId);
                break;
        }
    },
};

async function handleSetup(interaction, guildId) {
    const role = interaction.options.getRole('role');
    
    // Check if bot can assign this role
    const botMember = interaction.guild.members.me;
    if (role.position >= botMember.roles.highest.position) {
        return interaction.reply({
            content: '❌ I cannot assign this role because it\'s higher than or equal to my highest role!',
            ephemeral: true
        });
    }

    const autoRoles = loadAutoRoles();
    if (!autoRoles[guildId]) {
        autoRoles[guildId] = {};
    }
    
    autoRoles[guildId].joinRole = role.id;
    saveAutoRoles(autoRoles);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Auto Role Setup Complete')
        .setDescription(`New members will automatically receive the **${role.name}** role when they join the server.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleRemove(interaction, guildId) {
    const autoRoles = loadAutoRoles();
    
    if (!autoRoles[guildId] || !autoRoles[guildId].joinRole) {
        return interaction.reply({
            content: '❌ No auto role is currently configured for this server!',
            ephemeral: true
        });
    }

    delete autoRoles[guildId].joinRole;
    if (Object.keys(autoRoles[guildId]).length === 0) {
        delete autoRoles[guildId];
    }
    saveAutoRoles(autoRoles);

    const embed = new EmbedBuilder()
        .setColor(0xFF0000)
        .setTitle('✅ Auto Role Removed')
        .setDescription('Auto role assignment for new members has been disabled.')
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function handleReactionSetup(interaction, guildId) {
    const title = interaction.options.getString('title');
    const description = interaction.options.getString('description');
    
    const autoRoles = loadAutoRoles();
    if (!autoRoles[guildId]) {
        autoRoles[guildId] = {};
    }
    
    if (!autoRoles[guildId].reactionRoles) {
        autoRoles[guildId].reactionRoles = [];
    }

    // Create the role selection embed
    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle(title)
        .setDescription(description)
        .setFooter({ text: 'Use the dropdown below to select your roles!' })
        .setTimestamp();

    // Create dropdown menu (will be populated when roles are added)
    const row = new ActionRowBuilder()
        .addComponents(
            new StringSelectMenuBuilder()
                .setCustomId('role_select')
                .setPlaceholder('Select your roles...')
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([
                    {
                        label: 'No roles configured yet',
                        description: 'Use /autorole add-reaction-role to add roles',
                        value: 'none'
                    }
                ])
        );

    const message = await interaction.reply({ embeds: [embed], components: [row], fetchReply: true });
    
    // Store message info for later updates
    autoRoles[guildId].reactionMessage = {
        channelId: interaction.channel.id,
        messageId: message.id,
        title: title,
        description: description
    };
    
    saveAutoRoles(autoRoles);
}

async function handleAddReactionRole(interaction, guildId) {
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');
    const description = interaction.options.getString('description');
    
    const autoRoles = loadAutoRoles();
    if (!autoRoles[guildId] || !autoRoles[guildId].reactionMessage) {
        return interaction.reply({
            content: '❌ You need to create a reaction role message first using `/autorole reaction`!',
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

    if (!autoRoles[guildId].reactionRoles) {
        autoRoles[guildId].reactionRoles = [];
    }

    // Add the role to the list
    autoRoles[guildId].reactionRoles.push({
        roleId: role.id,
        emoji: emoji,
        description: description
    });

    saveAutoRoles(autoRoles);

    // Update the reaction message
    await updateReactionMessage(interaction, guildId, autoRoles[guildId]);

    const embed = new EmbedBuilder()
        .setColor(0x00FF00)
        .setTitle('✅ Reaction Role Added')
        .setDescription(`Added **${role.name}** with ${emoji} to the reaction role system.`)
        .setTimestamp();

    await interaction.reply({ embeds: [embed] });
}

async function updateReactionMessage(interaction, guildId, guildData) {
    try {
        const channel = await interaction.client.channels.fetch(guildData.reactionMessage.channelId);
        const message = await channel.messages.fetch(guildData.reactionMessage.messageId);

        // Update embed
        const embed = new EmbedBuilder()
            .setColor(0x0099FF)
            .setTitle(guildData.reactionMessage.title)
            .setDescription(guildData.reactionMessage.description)
            .setFooter({ text: 'Use the dropdown below to select your roles!' })
            .setTimestamp();

        // Add role list to embed
        if (guildData.reactionRoles && guildData.reactionRoles.length > 0) {
            const roleList = guildData.reactionRoles
                .map(r => `${r.emoji} **${interaction.guild.roles.cache.get(r.roleId)?.name || 'Unknown Role'}** - ${r.description}`)
                .join('\n');
            embed.addFields({ name: 'Available Roles', value: roleList });
        }

        // Update dropdown
        const options = guildData.reactionRoles.map(r => ({
            label: interaction.guild.roles.cache.get(r.roleId)?.name || 'Unknown Role',
            description: r.description,
            value: r.roleId,
            emoji: r.emoji
        }));

        const row = new ActionRowBuilder()
            .addComponents(
                new StringSelectMenuBuilder()
                    .setCustomId('role_select')
                    .setPlaceholder('Select your roles...')
                    .setMinValues(0)
                    .setMaxValues(options.length)
                    .addOptions(options.length > 0 ? options : [{
                        label: 'No roles configured yet',
                        description: 'Use /autorole add-reaction-role to add roles',
                        value: 'none'
                    }])
            );

        await message.edit({ embeds: [embed], components: [row] });
    } catch (error) {
        console.error('Error updating reaction message:', error);
    }
}

async function handleStatus(interaction, guildId) {
    const autoRoles = loadAutoRoles();
    const guildData = autoRoles[guildId];

    const embed = new EmbedBuilder()
        .setColor(0x0099FF)
        .setTitle('🔧 Auto Role Configuration')
        .setTimestamp();

    if (!guildData) {
        embed.setDescription('No auto role configuration found for this server.');
        return interaction.reply({ embeds: [embed] });
    }

    let description = '';

    // Join role status
    if (guildData.joinRole) {
        const role = interaction.guild.roles.cache.get(guildData.joinRole);
        description += `**Join Role:** ${role ? role.name : 'Role not found'}\n`;
    } else {
        description += '**Join Role:** Not configured\n';
    }

    // Reaction roles status
    if (guildData.reactionRoles && guildData.reactionRoles.length > 0) {
        description += `**Reaction Roles:** ${guildData.reactionRoles.length} configured\n`;
        const roleList = guildData.reactionRoles
            .map(r => `${r.emoji} ${interaction.guild.roles.cache.get(r.roleId)?.name || 'Unknown Role'}`)
            .join(', ');
        description += `**Roles:** ${roleList}`;
    } else {
        description += '**Reaction Roles:** Not configured';
    }

    embed.setDescription(description);
    await interaction.reply({ embeds: [embed] });
}

// Export the auto role data loading function for use in events
module.exports.loadAutoRoles = loadAutoRoles;