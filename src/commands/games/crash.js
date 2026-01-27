const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

// Crash Game Class - Group Game Implementation
class CrashGame {
    constructor(guildId, crashPoint) {
        this.guildId = guildId;
        this.crashPoint = crashPoint;
        this.players = new Map(); // userId -> {bet, cashedOut, cashOutMultiplier}
        this.currentMultiplier = 1.00;
        this.gameStarted = false;
        this.gameOver = false;
        this.minCashoutMultiplier = 1.20;
        this.startTime = null;
    }
    
    addPlayer(userId, bet) {
        this.players.set(userId, {
            bet: bet,
            cashedOut: false,
            cashOutMultiplier: 0.0
        });
    }
    
    removePlayer(userId) {
        return this.players.delete(userId);
    }
    
    cashOutPlayer(userId) {
        if (!this.players.has(userId)) return false;
        if (this.players.get(userId).cashedOut) return false;
        if (this.gameOver || !this.gameStarted) return false;
        if (this.currentMultiplier < this.minCashoutMultiplier) return false;
        
        const player = this.players.get(userId);
        player.cashedOut = true;
        player.cashOutMultiplier = this.currentMultiplier;
        return true;
    }
    
    getActivePlayers() {
        return Array.from(this.players.entries()).filter(([userId, player]) => !player.cashedOut);
    }
    
    getActivePlayersCount() {
        return this.getActivePlayers().length;
    }
    
    updateMultiplier(newMultiplier) {
        this.currentMultiplier = newMultiplier;
    }
    
    generateCrashPoint() {
        // 50% chance to reach 2.0x as requested
        const random = Math.random();
        
        if (random < 0.50) {
            // 50% crash before 2.0x
            const subRandom = Math.random();
            if (subRandom < 0.10) return 1.00; // 5% instant crash
            if (subRandom < 0.30) return 1.00 + Math.random() * 0.25; // 10% between 1.00-1.25x
            if (subRandom < 0.60) return 1.25 + Math.random() * 0.35; // 15% between 1.25-1.60x
            return 1.60 + Math.random() * 0.40; // 20% between 1.60-2.00x
        }
        
        // 50% chance to reach 2.0x or higher
        if (random < 0.75) {
            return 2.00 + Math.random() * 3.00; // 25% between 2.0x-5.0x
        } else if (random < 0.90) {
            return 5.00 + Math.random() * 5.00; // 15% between 5.0x-10.0x
        } else if (random < 0.97) {
            return 10.00 + Math.random() * 15.00; // 7% between 10.0x-25.0x
        } else {
            return 25.00 + Math.random() * 75.00; // 3% between 25.0x-100.0x
        }
    }
    
    createEmbed(client, final = false) {
        let title = '🚀 Crash Game';
        let color = 0x0099FF;
        
        if (this.gameOver && final) {
            title = `🚀 Crash Game - 💥 Crashed at ${this.crashPoint.toFixed(2)}x!`;
            color = 0xFF0000;
        } else if (this.gameStarted) {
            title = `🚀 Crash Game - ⚡ ${this.currentMultiplier.toFixed(2)}x`;
            color = 0xFF9500;
        } else {
            title = '🚀 Crash Game - 🔄 Waiting for Players';
            color = 0x0099FF;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        // Game Status
        let gameStatus = '';
        if (this.gameOver && final) {
            gameStatus = `🚀 **Final Result**\nRocket crashed at **${this.crashPoint.toFixed(2)}x**!\n\n💥 **Game Over**`;
        } else if (this.gameStarted) {
            gameStatus = `🚀 **Current Multiplier: ${this.currentMultiplier.toFixed(2)}x**\n\n⚡ **Rising...** (Min cashout: ${this.minCashoutMultiplier.toFixed(2)}x)`;
        } else {
            gameStatus = `🚀 **Waiting for Game Start**\n\n⏰ **30 seconds** or click 'Start Now'`;
        }
        
        embed.addFields({ name: '🎯 Game Status', value: gameStatus, inline: false });
        
        // Player Info
        const playerCount = this.players.size;
        const activeCount = this.getActivePlayersCount();
        
        let playerInfo = '';
        if (this.gameStarted) {
            playerInfo = `👥 **Total Players:** ${playerCount}\n⚡ **Active Players:** ${activeCount}\n📈 **Current Multiplier:** ${this.currentMultiplier.toFixed(2)}x`;
        } else {
            playerInfo = `👥 **Waiting Players:** ${playerCount}\n⏰ **Game starts in:** 30 seconds or less`;
        }
        
        embed.addFields({ name: '💳 Game Info', value: playerInfo, inline: false });
        
        // Player List (show up to 10 players)
        if (this.players.size > 0) {
            const playerList = [];
            let count = 0;
            
            for (const [userId, player] of this.players) {
                if (count >= 10) break;
                
                try {
                    const user = client.users.cache.get(userId);
                    const username = user ? user.displayName : `User ${userId}`;
                    
                    if (player.cashedOut) {
                        const payout = Math.floor(player.bet * player.cashOutMultiplier);
                        playerList.push(`${username}: ✅ ${player.cashOutMultiplier.toFixed(2)}x (+${payout.toLocaleString()})`);
                    } else if (this.gameOver) {
                        playerList.push(`${username}: 💥 Crashed (-${player.bet.toLocaleString()})`);
                    } else {
                        const canCashout = this.currentMultiplier >= this.minCashoutMultiplier;
                        const status = canCashout ? ' ✅ Can cashout' : ` ⏳ Wait for ${this.minCashoutMultiplier.toFixed(2)}x`;
                        const potentialPayout = Math.floor(player.bet * this.currentMultiplier);
                        playerList.push(`${username}: 🎲 ${player.bet.toLocaleString()} (${potentialPayout.toLocaleString()})${status}`);
                    }
                    count++;
                } catch (error) {
                    continue;
                }
            }
            
            if (playerList.length > 0) {
                embed.addFields({ name: '👥 Players', value: playerList.join('\n'), inline: false });
            }
        }
        
        if (!this.gameStarted && !final) {
            embed.addFields({
                name: '📋 Game Rules',
                value: `• Click 'Join Game' to place your bet\n• Rocket must reach **${this.minCashoutMultiplier.toFixed(2)}x** before you can cashout\n• 'Start Now' or auto-start in 30 seconds\n• Cashout before the rocket crashes!`,
                inline: false
            });
        }
        
        return embed;
    }
    
    createButtons() {
        const row1 = new ActionRowBuilder();
        const row2 = new ActionRowBuilder();
        
        const joinButton = new ButtonBuilder()
            .setCustomId('crash_join')
            .setLabel('Join Game')
            .setStyle(ButtonStyle.Success)
            .setEmoji('🎲')
            .setDisabled(this.gameStarted || this.gameOver);
        
        const leaveButton = new ButtonBuilder()
            .setCustomId('crash_leave')
            .setLabel('Leave Game')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('❌')
            .setDisabled(this.gameStarted || this.gameOver);
        
        const startButton = new ButtonBuilder()
            .setCustomId('crash_start')
            .setLabel('Start Now')
            .setStyle(ButtonStyle.Primary)
            .setEmoji('🚀')
            .setDisabled(this.gameStarted || this.gameOver || this.players.size === 0);
        
        const cashoutButton = new ButtonBuilder()
            .setCustomId('crash_cashout')
            .setLabel(`Cashout (${this.currentMultiplier.toFixed(2)}x)`)
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('💸')
            .setDisabled(!this.gameStarted || this.gameOver || this.currentMultiplier < this.minCashoutMultiplier);
        
        row1.addComponents(joinButton, leaveButton, startButton);
        row2.addComponents(cashoutButton);
        
        return [row1, row2];
    }
}

// Store active games per guild
const activeGuildGames = new Map();
const gameTimeouts = new Map();
const gameIntervals = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('crash')
        .setDescription('Multiplayer crash game - cash out before it crashes!')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (50-2000)')
                .setRequired(true)
                .setMinValue(50)
                .setMaxValue(2000)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const amount = interaction.options.getInteger('amount');

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'crash');
        if (!allowed) return;

        // Check if there's already a game in this guild
        if (activeGuildGames.has(guildId)) {
            return interaction.reply({ content: '⚠️ A crash game is already running in this server!', ephemeral: true });
        }

        // Check user balance
        const userBalance = await database.getUserEconomy(userId, guildId);
        if (userBalance.coins < amount) {
            return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
        }

        // Deduct bet amount
        await database.updateUserEconomy(userId, guildId, {
            coins: userBalance.coins - amount,
            total_earned: userBalance.total_earned || 1000
        });

        // Create new crash game
        const crashPoint = generateCrashPoint();
        const game = new CrashGame(guildId, crashPoint);
        game.addPlayer(userId, amount);
        
        activeGuildGames.set(guildId, game);

        const embed = game.createEmbed(interaction.client);
        const buttons = game.createButtons();

        await interaction.reply({ embeds: [embed], components: buttons });

        // Set up auto-start timer (30 seconds)
        const timeout = setTimeout(async () => {
            await startCrashGame(interaction, guildId);
        }, 30000);
        
        gameTimeouts.set(guildId, timeout);

        console.log(`🚀 Crash game created in guild ${guildId} with crash point ${crashPoint.toFixed(2)}x`);
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        
        const game = activeGuildGames.get(guildId);
        if (!game) {
            return interaction.reply({ content: '❌ No active crash game found!', ephemeral: true });
        }

        await interaction.deferUpdate();

        switch (customId.split('_')[1]) {
            case 'join':
                await handleJoinGame(interaction, game, userId, guildId);
                break;
            case 'leave':
                await handleLeaveGame(interaction, game, userId, guildId);
                break;
            case 'start':
                await handleStartGame(interaction, guildId);
                break;
            case 'cashout':
                await handleCashout(interaction, game, userId, guildId);
                break;
        }
    }
};

function generateCrashPoint() {
    const random = Math.random();
    
    if (random < 0.50) {
        const subRandom = Math.random();
        if (subRandom < 0.10) return 1.00;
        if (subRandom < 0.30) return 1.00 + Math.random() * 0.25;
        if (subRandom < 0.60) return 1.25 + Math.random() * 0.35;
        return 1.60 + Math.random() * 0.40;
    }
    
    if (random < 0.75) {
        return 2.00 + Math.random() * 3.00;
    } else if (random < 0.90) {
        return 5.00 + Math.random() * 5.00;
    } else if (random < 0.97) {
        return 10.00 + Math.random() * 15.00;
    } else {
        return 25.00 + Math.random() * 75.00;
    }
}

async function handleJoinGame(interaction, game, userId, guildId) {
    if (game.gameStarted) {
        return interaction.followUp({ content: '❌ Game has already started!', ephemeral: true });
    }
    
    if (game.players.has(userId)) {
        return interaction.followUp({ content: '❌ You are already in this game!', ephemeral: true });
    }

    // Ask for bet amount via followup
    const followUp = await interaction.followUp({ 
        content: '💰 How much would you like to bet? (50-2000 coins)', 
        ephemeral: true 
    });

    // Create a message collector for the bet amount
    const filter = (msg) => msg.author.id === userId;
    const collector = interaction.channel.createMessageCollector({ filter, time: 30000, max: 1 });

    collector.on('collect', async (msg) => {
        const amount = parseInt(msg.content);
        
        if (isNaN(amount) || amount < 50 || amount > 2000) {
            await msg.reply({ content: '❌ Please enter a valid amount between 50 and 2000 coins!', ephemeral: true });
            return;
        }

        const userBalance = await database.getUserEconomy(userId, guildId);
        if (userBalance.coins < amount) {
            await msg.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
            return;
        }

        // Deduct bet amount
        await database.updateUserEconomy(userId, guildId, {
            coins: userBalance.coins - amount,
            total_earned: userBalance.total_earned || 1000
        });

        game.addPlayer(userId, amount);
        
        // Update the game message
        const embed = game.createEmbed(interaction.client);
        const buttons = game.createButtons();
        await interaction.editReply({ embeds: [embed], components: buttons });
        
        await msg.reply({ content: `✅ Joined the crash game with ${amount.toLocaleString()} coins!`, ephemeral: true });
        
        // Delete the bet amount message
        try {
            await msg.delete();
        } catch (error) {
            // Ignore if we can't delete
        }
    });

    collector.on('end', (collected) => {
        if (collected.size === 0) {
            interaction.followUp({ content: '⏰ Bet entry timed out!', ephemeral: true });
        }
    });
}

async function handleLeaveGame(interaction, game, userId, guildId) {
    if (game.gameStarted) {
        return interaction.followUp({ content: '❌ Cannot leave after game has started!', ephemeral: true });
    }
    
    const player = game.players.get(userId);
    if (!player) {
        return interaction.followUp({ content: '❌ You are not in this game!', ephemeral: true });
    }

    // Refund the bet
    const userBalance = await database.getUserEconomy(userId, guildId);
    await database.updateUserEconomy(userId, guildId, {
        coins: userBalance.coins + player.bet,
        total_earned: userBalance.total_earned || 1000
    });

    game.removePlayer(userId);
    
    // Update the game message
    const embed = game.createEmbed(interaction.client);
    const buttons = game.createButtons();
    await interaction.editReply({ embeds: [embed], components: buttons });
    
    await interaction.followUp({ content: `✅ Left the game and received ${player.bet.toLocaleString()} coins refund!`, ephemeral: true });
}

async function handleStartGame(interaction, guildId) {
    const game = activeGuildGames.get(guildId);
    if (!game || game.gameStarted) return;
    
    if (game.players.size === 0) {
        return interaction.followUp({ content: '❌ No players to start the game!', ephemeral: true });
    }

    // Clear the auto-start timeout
    const timeout = gameTimeouts.get(guildId);
    if (timeout) {
        clearTimeout(timeout);
        gameTimeouts.delete(guildId);
    }

    await startCrashGame(interaction, guildId);
}

async function handleCashout(interaction, game, userId, guildId) {
    if (!game.gameStarted || game.gameOver) {
        return interaction.followUp({ content: '❌ Game is not active!', ephemeral: true });
    }
    
    const player = game.players.get(userId);
    if (!player) {
        return interaction.followUp({ content: '❌ You are not in this game!', ephemeral: true });
    }
    
    if (player.cashedOut) {
        return interaction.followUp({ content: '❌ You have already cashed out!', ephemeral: true });
    }
    
    if (game.currentMultiplier < game.minCashoutMultiplier) {
        return interaction.followUp({ 
            content: `❌ Must wait for ${game.minCashoutMultiplier.toFixed(2)}x to cashout! Current: ${game.currentMultiplier.toFixed(2)}x`, 
            ephemeral: true 
        });
    }

    const success = game.cashOutPlayer(userId);
    if (success) {
        const payout = Math.floor(player.bet * player.cashOutMultiplier);
        const profit = payout - player.bet;
        
        // Add payout to user balance
        const userBalance = await database.getUserEconomy(userId, guildId);
        await database.updateUserEconomy(userId, guildId, {
            coins: userBalance.coins + payout,
            total_earned: (userBalance.total_earned || 1000) + (profit > 0 ? profit : 0)
        });

        // Update the game message
        const embed = game.createEmbed(interaction.client);
        const buttons = game.createButtons();
        await interaction.editReply({ embeds: [embed], components: buttons });
        
        await interaction.followUp({ 
            content: `🎉 ${interaction.user.mention} cashed out at **${player.cashOutMultiplier.toFixed(2)}x**!\n💰 Payout: ${payout.toLocaleString()} coins\n📈 Profit: +${profit.toLocaleString()} coins`, 
            ephemeral: false 
        });
    } else {
        await interaction.followUp({ content: '❌ Cashout failed!', ephemeral: true });
    }
}

async function startCrashGame(interaction, guildId) {
    const game = activeGuildGames.get(guildId);
    if (!game || game.gameStarted) return;
    
    if (game.players.size === 0) {
        // No players, clean up
        activeGuildGames.delete(guildId);
        const timeout = gameTimeouts.get(guildId);
        if (timeout) {
            clearTimeout(timeout);
            gameTimeouts.delete(guildId);
        }
        
        try {
            await interaction.editReply({ 
                content: '❌ Game cancelled - no players joined.', 
                embeds: [], 
                components: [] 
            });
        } catch (error) {
            // Ignore if we can't edit
        }
        return;
    }

    game.gameStarted = true;
    console.log(`🚀 Crash game started in guild ${guildId} with crash point ${game.crashPoint.toFixed(2)}x`);

    // Start the game loop
    const interval = setInterval(async () => {
        if (game.currentMultiplier >= game.crashPoint || game.getActivePlayersCount() === 0) {
            clearInterval(interval);
            gameIntervals.delete(guildId);
            await endCrashGame(interaction, guildId);
            return;
        }

        // Update multiplier
        const increment = 0.01 + (game.currentMultiplier / 100);
        game.updateMultiplier(Math.min(game.currentMultiplier + increment, game.crashPoint));

        // Update the display
        try {
            const embed = game.createEmbed(interaction.client);
            const buttons = game.createButtons();
            await interaction.editReply({ embeds: [embed], components: buttons });
        } catch (error) {
            console.error('Error updating crash game:', error);
        }
    }, 100);

    gameIntervals.set(guildId, interval);
}

async function endCrashGame(interaction, guildId) {
    const game = activeGuildGames.get(guildId);
    if (!game) return;

    game.gameOver = true;
    
    // Process losing players (those who didn't cash out)
    for (const [userId, player] of game.players) {
        if (!player.cashedOut) {
            console.log(`Player ${userId} lost ${player.bet} coins in crash game`);
        }
    }

    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

    // Show final results
    const embed = game.createEmbed(interaction.client, true);
    const disabledButtons = game.createButtons();
    disabledButtons.forEach(row => {
        row.components.forEach(button => button.setDisabled(true));
    });

    try {
        await interaction.editReply({ embeds: [embed], components: disabledButtons });
    } catch (error) {
        console.error('Error showing final crash game results:', error);
    }

    // Clean up
    activeGuildGames.delete(guildId);
    const timeout = gameTimeouts.get(guildId);
    if (timeout) {
        clearTimeout(timeout);
        gameTimeouts.delete(guildId);
    }
    const interval = gameIntervals.get(guildId);
    if (interval) {
        clearInterval(interval);
        gameIntervals.delete(guildId);
    }

    console.log(`🚀 Crash game ended in guild ${guildId}`);
}