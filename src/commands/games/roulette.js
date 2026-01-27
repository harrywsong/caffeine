const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('roulette')
        .setDescription('Play roulette - bet on colors or numbers')
        .addStringOption(option =>
            option.setName('bet_type')
                .setDescription('Type of bet')
                .setRequired(true)
                .addChoices(
                    { name: 'Color (2x payout)', value: 'color' },
                    { name: 'Number (36x payout)', value: 'number' }
                ))
        .addStringOption(option =>
            option.setName('value')
                .setDescription('red/black for color, 0-36 for number')
                .setRequired(true))
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (10-1000)')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(1000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'roulette');
        if (!allowed) return;

        const betType = interaction.options.getString('bet_type');
        const value = interaction.options.getString('value');
        const amount = interaction.options.getInteger('amount');
        const userBalance = await database.getUserEconomy(userId, guildId);

        if (userBalance.coins < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        // Validate bet
        if (betType === 'color') {
            if (!['red', 'black'].includes(value.toLowerCase())) {
                return interaction.reply({ content: '❌ Color must be "red" or "black"!', ephemeral: true });
            }
        } else {
            const num = parseInt(value);
            if (isNaN(num) || num < 0 || num > 36) {
                return interaction.reply({ content: '❌ Number must be between 0-36!', ephemeral: true });
            }
        }

        await interaction.deferReply();

        // Deduct bet
        await database.updateUserEconomy(userId, guildId, {
            coins: userBalance.coins - amount,
            total_earned: userBalance.total_earned || 1000
        });

        // Spinning animation
        const redNumbers = new Set([1, 3, 5, 7, 9, 12, 14, 16, 18, 19, 21, 23, 25, 27, 30, 32, 34, 36]);
        
        for (let i = 0; i < 4; i++) {
            const tempNum = getRandomInt(0, 36);
            const tempColor = tempNum === 0 ? 'green' : (redNumbers.has(tempNum) ? 'red' : 'black');
            const colorEmoji = tempColor === 'red' ? '🔴' : tempColor === 'black' ? '⚫' : '🟢';
            
            const embed = new EmbedBuilder()
                .setTitle('🎡 Roulette')
                .setColor(0x0099FF)
                .addFields(
                    { name: '🎯 Roulette Result', value: `🎡 **${colorEmoji} ${tempNum}** 🎡\n\n🔄 **Spinning...**`, inline: false },
                    { name: '💳 Your Bet', value: `💰 **Amount:** ${amount.toLocaleString()} coins\n🎯 **Betting on:** ${betType === 'color' ? value.toUpperCase() : `Number ${value}`}`, inline: false }
                )
                .setTimestamp();
            
            await interaction.editReply({ embeds: [embed] });
            await new Promise(resolve => setTimeout(resolve, 600));
        }

        // Final result
        const winningNumber = getRandomInt(0, 36);
        const winningColor = winningNumber === 0 ? 'green' : (redNumbers.has(winningNumber) ? 'red' : 'black');
        const colorEmoji = winningColor === 'red' ? '🔴' : winningColor === 'black' ? '⚫' : '🟢';
        
        let won = false;
        let payout = 0;
        
        if (betType === 'color' && value.toLowerCase() === winningColor) {
            won = true;
            payout = amount * 2;
        } else if (betType === 'number' && parseInt(value) === winningNumber) {
            won = true;
            payout = amount * 36;
        }
        
        let title = '🎡 Roulette';
        let color = 0xFF0000;
        
        if (won) {
            title += ' - 🎉 You Win!';
            color = 0x00FF00;
            
            const newBalance = userBalance.coins - amount + payout;
            await database.updateUserEconomy(userId, guildId, {
                coins: newBalance,
                total_earned: (userBalance.total_earned || 1000) + (payout - amount)
            });
        } else {
            title += ' - 😞 You Lose';
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .addFields(
                { name: '🎯 Roulette Result', value: `🎡 **${colorEmoji} ${winningNumber}** 🎡\n\n🎊 **Result Confirmed!**`, inline: false },
                { name: '💳 Your Bet', value: `💰 **Amount:** ${amount.toLocaleString()} coins\n🎯 **You bet on:** ${betType === 'color' ? value.toUpperCase() : `Number ${value}`}`, inline: false }
            )
            .setTimestamp();
        
        // Result info
        let resultText = won ? '✅ **You Won!**' : '❌ **You Lost!**';
        if (won) {
            const profit = payout - amount;
            resultText += `\n\n💰 **Payout:** ${payout.toLocaleString()} coins`;
            resultText += `\n📈 **Profit:** +${profit.toLocaleString()} coins`;
        } else {
            resultText += `\n\n💸 **Loss:** ${amount.toLocaleString()} coins`;
        }
        
        embed.addFields({ name: '📊 Game Result', value: resultText, inline: false });
        
        // Show new balance
        const newBalance = await database.getUserEconomy(userId, guildId);
        embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
        
        // Update leaderboard
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);
        
        await interaction.editReply({ embeds: [embed] });
    }
};