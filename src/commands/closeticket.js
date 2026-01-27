const { SlashCommandBuilder } = require('discord.js');
const ticketManager = require('../utils/ticketManager');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('closeticket')
        .setDescription('Close the current ticket channel'),

    async execute(interaction) {
        // Check if this is a ticket channel
        if (!ticketManager.isTicketChannel(interaction.channel.id)) {
            return interaction.reply({
                content: '❌ This command can only be used in ticket channels.',
                ephemeral: true
            });
        }

        await ticketManager.closeTicket(interaction);
    },
};