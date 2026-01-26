const { loadAutoRoles } = require('../commands/autorole');
const RestrictionMiddleware = require('../middleware/restrictions');

module.exports = {
    name: 'interactionCreate',
    async execute(interaction) {
        // Handle slash commands
        if (interaction.isChatInputCommand()) {
            const command = interaction.client.commands.get(interaction.commandName);

            if (!command) {
                console.error(`No command matching ${interaction.commandName} was found.`);
                return;
            }

            try {
                // Check command restrictions
                const allowed = await RestrictionMiddleware.checkCommandRestriction(interaction);
                if (!allowed) return;

                // Log command usage
                await RestrictionMiddleware.logCommandUsage(interaction);

                await command.execute(interaction);
            } catch (error) {
                console.error(`Error executing ${interaction.commandName}:`, error);
                
                const errorMessage = {
                    content: 'There was an error while executing this command!',
                    ephemeral: true
                };

                if (interaction.replied || interaction.deferred) {
                    await interaction.followUp(errorMessage);
                } else {
                    await interaction.reply(errorMessage);
                }
            }
        }

        // Handle role selection dropdown
        if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
            await handleRoleSelection(interaction);
        }
    },
};

async function handleRoleSelection(interaction) {
    try {
        const autoRoles = loadAutoRoles();
        const guildData = autoRoles[interaction.guild.id];
        
        if (!guildData || !guildData.reactionRoles) {
            return interaction.reply({
                content: '❌ Role selection is not configured for this server!',
                ephemeral: true
            });
        }

        const selectedRoles = interaction.values.filter(value => value !== 'none');
        const member = interaction.member;
        
        // Get all reaction roles for this server
        const allReactionRoles = guildData.reactionRoles.map(r => r.roleId);
        
        // Remove all reaction roles first
        const rolesToRemove = member.roles.cache.filter(role => allReactionRoles.includes(role.id));
        if (rolesToRemove.size > 0) {
            await member.roles.remove(rolesToRemove);
        }

        // Add selected roles
        if (selectedRoles.length > 0) {
            const rolesToAdd = selectedRoles.map(roleId => interaction.guild.roles.cache.get(roleId)).filter(role => role);
            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
            }
        }

        const responseMessage = selectedRoles.length > 0 
            ? `✅ Updated your roles! You now have: ${selectedRoles.map(id => `<@&${id}>`).join(', ')}`
            : '✅ Removed all reaction roles from your account!';

        await interaction.reply({
            content: responseMessage,
            ephemeral: true
        });

    } catch (error) {
        console.error('Error handling role selection:', error);
        await interaction.reply({
            content: '❌ There was an error updating your roles. Please try again later.',
            ephemeral: true
        });
    }
}