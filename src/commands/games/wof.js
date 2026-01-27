const { SlashCommandBuilder, EmbedBuilder } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('wof')
        .setDescription('Spin the wheel of fortune!')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (10-2000)')
                .setRequired(true)
                .setMinValue(10)
                .setMaxValue(2000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'wof');
        if (!allowed) return;

        await handleWheel(interaction, userId, guildId);
    }
};

async function handleWheel(interaction, userId, guildId) {
    const amount = interaction.options.getInteger('amount');
    const userBalance = await database.getUserEconomy(userId, guildId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    await interaction.deferReply();

    // Deduct bet
    await database.updateUserEconomy(userId, guildId, {
        coins: userBalance.coins - amount,
        total_earned: userBalance.total_earned || 1000
    });

    // Wheel segments with different probabilities and payouts
    const wheelSegments = [
        { name: 'Bankrupt', multiplier: 0, probability: 15, emoji: '💸' },
        { name: 'Small Win', multiplier: 1.5, probability: 25, emoji: '🎯' },
        { name: 'Double', multiplier: 2, probability: 20, emoji: '⬆️' },
        { name: 'Triple', multiplier: 3, probability: 15, emoji: '🎊' },
        { name: 'Big Win', multiplier: 5, probability: 10, emoji: '💰' },
        { name: 'Jackpot', multiplier: 10, probability: 8, emoji: '🏆' },
        { name: 'MEGA', multiplier: 25, probability: 5, emoji: '💎' },
        { name: 'ULTRA', multiplier: 50, probability: 2, emoji: '👑' }
    ];

    // Create weighted array
    const weightedSegments = [];
    wheelSegments.forEach(segment => {
        for (let i = 0; i < segment.probability; i++) {
            weightedSegments.push(segment);
        }
    });

    // Spinning animation
    for (let i = 0; i < 5; i++) {
        const tempSegment = weightedSegments[getRandomInt(0, weightedSegments.length - 1)];
        
        const embed = new EmbedBuilder()
            .setTitle('🎡 Wheel of Fortune')
            .setColor(0x0099FF)
            .addFields(
                { name: '🎯 Spinning...', value: `🎡 **${tempSegment.emoji} ${tempSegment.name}** 🎡\n\n🔄 **The wheel is spinning...**`, inline: false },
                { name: '💳 Your Bet', value: `💰 **Amount:** ${amount.toLocaleString()} coins`, inline: false }
            )
            .setTimestamp();
        
        await interaction.editReply({ embeds: [embed] });
        await new Promise(resolve => setTimeout(resolve, 800));
    }

    // Final result
    const winningSegment = weightedSegments[getRandomInt(0, weightedSegments.length - 1)];
    const payout = Math.floor(amount * winningSegment.multiplier);
    
    let title = '🎡 Wheel of Fortune';
    let color = 0xFF0000;
    
    if (payout > amount) {
        title += ' - 🎉 You Win!';
        color = 0x00FF00;
    } else if (payout === amount) {
        title += ' - 🤝 Break Even!';
        color = 0xFFFF00;
    } else {
        title += ' - 😞 You Lose';
    }
    
    if (payout > 0) {
        const newBalance = userBalance.coins - amount + payout;
        await database.updateUserEconomy(userId, guildId, {
            coins: newBalance,
            total_earned: (userBalance.total_earned || 1000) + (payout > amount ? payout - amount : 0)
        });
    }
    
    const embed = new EmbedBuilder()
        .setTitle(title)
        .setColor(color)
        .addFields(
            { name: '🎯 Wheel Result', value: `🎡 **${winningSegment.emoji} ${winningSegment.name}** 🎡\n\n🎊 **Result Confirmed!**`, inline: false },
            { name: '💳 Your Bet', value: `💰 **Amount:** ${amount.toLocaleString()} coins\n🎯 **Multiplier:** ${winningSegment.multiplier}x`, inline: false }
        )
        .setTimestamp();
    
    // Result info
    let resultText = '';
    if (payout > amount) {
        const profit = payout - amount;
        resultText = `✅ **You Won!**\n\n💰 **Payout:** ${payout.toLocaleString()} coins\n📈 **Profit:** +${profit.toLocaleString()} coins`;
    } else if (payout === amount) {
        resultText = `🤝 **Break Even!**\n\n💰 **Payout:** ${payout.toLocaleString()} coins`;
    } else {
        resultText = `❌ **You Lost!**\n\n💸 **Loss:** ${amount.toLocaleString()} coins`;
    }
    
    embed.addFields({ name: '📊 Game Result', value: resultText, inline: false });
    
    // Show new balance
    const newBalance = await database.getUserEconomy(userId, guildId);
    embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
    
    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);
    
    await interaction.editReply({ embeds: [embed] });
}