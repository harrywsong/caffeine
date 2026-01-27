const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { loadAutoRoleSections, saveAutoRoleSections } = require('./autorole-setup');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('autorole-games')
        .setDescription('Manage game roles for the auto role system')
        .addSubcommand(subcommand =>
            subcommand
                .setName('add')
                .setDescription('Add a game role to the games section')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The game role to add')
                        .setRequired(true))
                .addStringOption(option =>
                    option.setName('emoji')
                        .setDescription('Emoji for this game role')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove a game role from the games section')
                .addRoleOption(option =>
                    option.setName('role')
                        .setDescription('The game role to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all game roles'))
        .setDefaultMemberPermissions(PermissionFlagsBits.ManageRoles),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const guildId = interaction.guild.id;

        switch (subcommand) {
            case 'add':
                await handleAddGameRole(interaction, guildId);
                break;
            case 'remove':
                await handleRemoveGameRole(interaction, guildId);
                break;
            case 'list':
                await handleListGameRoles(interaction, guildId);
                break;
        }
    },
};

async function handleAddGameRole(interaction, guildId) {
    const role = interaction.options.getRole('role');
    const emoji = interaction.options.getString('emoji');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].games) {
        return interaction.reply({
            content: '❌ Games section not found! Please create it first using `/autorole-setup create-games`',
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

    // Add the role to the games section
    sections[guildId].games.roles[emoji] = role.id;
    saveAutoRoleSections(sections);

    // Update the games message
    await updateGamesMessage(interaction, guildId, sections[guildId].games);

    await interaction.reply({
        content: `✅ Added **${role.name}** with ${emoji} to the games section!`,
        ephemeral: true
    });
}

async function handleRemoveGameRole(interaction, guildId) {
    const role = interaction.options.getRole('role');

    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].games) {
        return interaction.reply({
            content: '❌ Games section not found!',
            ephemeral: true
        });
    }

    // Find and remove the role
    let removedEmoji = null;
    for (const [emoji, roleId] of Object.entries(sections[guildId].games.roles)) {
        if (roleId === role.id) {
            delete sections[guildId].games.roles[emoji];
            removedEmoji = emoji;
            break;
        }
    }

    if (!removedEmoji) {
        return interaction.reply({
            content: '❌ This role is not in the games section!',
            ephemeral: true
        });
    }

    saveAutoRoleSections(sections);

    // Update the games message
    await updateGamesMessage(interaction, guildId, sections[guildId].games);

    await interaction.reply({
        content: `✅ Removed **${role.name}** (${removedEmoji}) from the games section!`,
        ephemeral: true
    });
}

async function handleListGameRoles(interaction, guildId) {
    const sections = loadAutoRoleSections();
    if (!sections[guildId] || !sections[guildId].games) {
        return interaction.reply({
            content: '❌ Games section not found!',
            ephemeral: true
        });
    }

    const gameRoles = sections[guildId].games.roles;
    if (Object.keys(gameRoles).length === 0) {
        return interaction.reply({
            content: '📝 No game roles configured yet.',
            ephemeral: true
        });
    }

    let roleList = '🎮 **Game Roles:**\n\n';
    for (const [emoji, roleId] of Object.entries(gameRoles)) {
        const role = interaction.guild.roles.cache.get(roleId);
        roleList += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
    }

    await interaction.reply({
        content: roleList,
        ephemeral: true
    });
}

async function updateGamesMessage(interaction, guildId, gamesData) {
    try {
        const channel = await interaction.client.channels.fetch(gamesData.channelId);
        const message = await channel.messages.fetch(gamesData.messageId);

        const { EmbedBuilder } = require('discord.js');
        
        let description = 'React with the emoji for games you play!\n\n';
        
        if (Object.keys(gamesData.roles).length > 0) {
            for (const [emoji, roleId] of Object.entries(gamesData.roles)) {
                const role = interaction.guild.roles.cache.get(roleId);
                description += `${emoji} **${role ? role.name : 'Unknown Role'}**\n`;
            }
        } else {
            description += '• Game roles will be added here soon!\n';
            description += '• React to get notified about specific games\n';
            description += '• Find others who play the same games\n';
            description += '• Get pinged for game events and tournaments';
        }

        const embed = new EmbedBuilder()
            .setColor(0x9932CC)
            .setTitle('🎮 Game Roles')
            .setDescription(description)
            .setFooter({ text: Object.keys(gamesData.roles).length > 0 ? 'React to get your game roles!' : 'More game roles coming soon!' })
            .setTimestamp();

        await message.edit({ embeds: [embed] });

        // Add new reactions if needed
        for (const emoji of Object.keys(gamesData.roles)) {
            if (!message.reactions.cache.has(emoji)) {
                await message.react(emoji);
                await new Promise(resolve => setTimeout(resolve, 500));
            }
        }

    } catch (error) {
        console.error('Error updating games message:', error);
    }
}