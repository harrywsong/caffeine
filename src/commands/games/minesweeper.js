const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../../database/database');
const RestrictionMiddleware = require('../../middleware/restrictions');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Minesweeper Game Class
class MinesweeperGame {
    constructor(userId, bet, mines = 3) {
        this.userId = userId;
        this.bet = bet;
        this.mines = mines;
        this.gridSize = 24; // 4x6 grid (24 positions) + cashout button = 25 total buttons
        this.revealed = new Set();
        this.gameOver = false;
        this.won = false;
        this.minePositions = this.placeMines();
        this.multipliers = this.calculateMultipliers();
    }
    
    placeMines() {
        const positions = new Set();
        while (positions.size < this.mines) {
            positions.add(getRandomInt(0, this.gridSize - 1));
        }
        return positions;
    }
    
    calculateMultipliers() {
        const safeSpots = this.gridSize - this.mines;
        const multipliers = [];
        
        // Risk-based multiplier system that scales with number of mines
        // More mines = higher risk = higher multipliers
        
        // Base multiplier increases with mine count
        const baseMultiplierByMines = {
            1: 1.1,   // Very low risk
            2: 1.2,   // Low risk  
            3: 1.3,   // Medium risk (default)
            4: 1.5,   // High risk
            5: 1.8    // Very high risk
        };
        
        const baseMultiplier = baseMultiplierByMines[this.mines] || 1.3;
        
        // Progressive multiplier that increases more aggressively with more mines
        for (let i = 1; i <= safeSpots; i++) {
            // Calculate risk factor based on remaining safe spots vs total safe spots
            const progressRatio = i / safeSpots;
            
            // Mine risk factor - more mines = exponentially higher multipliers
            const mineRiskFactor = Math.pow(1.2 + (this.mines * 0.15), progressRatio);
            
            // Progressive risk - gets harder as you reveal more tiles
            const progressiveRisk = 1 + (progressRatio * progressRatio * (this.mines * 0.3));
            
            // Combine all factors
            const multiplier = baseMultiplier * mineRiskFactor * progressiveRisk;
            
            multipliers.push(Math.max(multiplier, 1.0)); // Ensure minimum 1.0x
        }
        
        return multipliers;
    }
    
    revealTile(position) {
        if (this.gameOver || this.revealed.has(position)) {
            return { valid: false };
        }
        
        this.revealed.add(position);
        
        if (this.minePositions.has(position)) {
            this.gameOver = true;
            return { valid: true, mine: true, gameOver: true };
        }
        
        const revealedCount = this.revealed.size;
        const safeSpots = this.gridSize - this.mines;
        
        if (revealedCount === safeSpots) {
            this.gameOver = true;
            this.won = true;
            return { valid: true, mine: false, gameOver: true, won: true };
        }
        
        return { valid: true, mine: false, gameOver: false };
    }
    
    getCurrentMultiplier() {
        const revealedCount = this.revealed.size;
        if (revealedCount === 0) return 1;
        return this.multipliers[revealedCount - 1] || 1;
    }
    
    getRiskLevel() {
        const riskLevels = {
            1: '🟢 (Very Low Risk)',
            2: '🟡 (Low Risk)',
            3: '🟠 (Medium Risk)',
            4: '🔴 (High Risk)',
            5: '🟣 (Very High Risk)'
        };
        return riskLevels[this.mines] || '⚪ (Unknown Risk)';
    }
    
    getPayout() {
        if (this.gameOver && !this.won) return 0;
        return Math.floor(this.bet * this.getCurrentMultiplier());
    }
    
    createEmbed(showMines = false) {
        let title = '💣 Minesweeper';
        let color = 0x0099FF;
        
        if (this.gameOver) {
            if (this.won) {
                title = '💣 Minesweeper - 🏆 You Won!';
                color = 0x00FF00;
            } else {
                title = '💣 Minesweeper - 💥 BOOM!';
                color = 0xFF0000;
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        // Create grid display (4 rows of 6, then 1 row of 4)
        let gridDisplay = '';
        for (let i = 0; i < this.gridSize; i++) {
            // New line every 5 positions for the first 4 rows, then every 4 for the last row
            if (i > 0 && (i % 5 === 0)) gridDisplay += '\n';
            
            if (this.revealed.has(i)) {
                if (this.minePositions.has(i)) {
                    gridDisplay += '💥 ';
                } else {
                    gridDisplay += '✅ ';
                }
            } else if (showMines && this.minePositions.has(i)) {
                gridDisplay += '💣 ';
            } else {
                gridDisplay += '⬜ ';
            }
        }
        
        embed.addFields({ name: '🎯 Minefield', value: gridDisplay, inline: false });
        
        let gameInfo = `💣 **Mines:** ${this.mines} ${this.getRiskLevel()}\n`;
        gameInfo += `✅ **Revealed:** ${this.revealed.size}/${this.gridSize - this.mines}\n`;
        gameInfo += `📊 **Current Multiplier:** ${this.getCurrentMultiplier().toFixed(2)}x`;
        
        // Show next multiplier if not at the end
        if (this.revealed.size < this.gridSize - this.mines && !this.gameOver) {
            const nextMultiplier = this.multipliers[this.revealed.size] || this.getCurrentMultiplier();
            gameInfo += `\n🎯 **Next Multiplier:** ${nextMultiplier.toFixed(2)}x`;
        }
        
        embed.addFields({ name: '📊 Game Info', value: gameInfo, inline: false });
        
        let betInfo = `💰 **Bet Amount:** ${this.bet.toLocaleString()} coins\n`;
        if (this.gameOver) {
            const payout = this.getPayout();
            if (payout > 0) {
                const profit = payout - this.bet;
                betInfo += `💵 **Payout:** ${payout.toLocaleString()} coins\n`;
                betInfo += `📈 **Profit:** +${profit.toLocaleString()} coins`;
            } else {
                betInfo += `💸 **Loss:** ${this.bet.toLocaleString()} coins`;
            }
        } else {
            const potentialPayout = this.getPayout();
            betInfo += `🎯 **Potential Payout:** ${potentialPayout.toLocaleString()} coins`;
        }
        
        embed.addFields({ name: '💳 Betting Info', value: betInfo, inline: false });
        
        return embed;
    }
    
    createButtons() {
        const rows = [];
        
        // Create 24-position grid in 5 action rows:
        // Row 1-4: 5 buttons each (positions 0-19)
        // Row 5: 4 buttons (positions 20-23) + cashout button
        
        // First 4 rows: 5 buttons each (positions 0-19)
        for (let row = 0; row < 4; row++) {
            const actionRow = new ActionRowBuilder();
            
            for (let col = 0; col < 5; col++) {
                const position = row * 5 + col;
                const button = this.createGridButton(position);
                actionRow.addComponents(button);
            }
            
            rows.push(actionRow);
        }
        
        // Last row: 4 grid buttons (positions 20-23) + cashout button
        const lastRow = new ActionRowBuilder();
        
        // Add 4 grid buttons (positions 20-23)
        for (let col = 0; col < 4; col++) {
            const position = 20 + col;
            const button = this.createGridButton(position);
            lastRow.addComponents(button);
        }
        
        // Always add cashout button in the 5th position of the last row
        if (!this.gameOver && this.revealed.size > 0) {
            const cashOutButton = new ButtonBuilder()
                .setCustomId('mine_cashout')
                .setLabel(`💰 ${this.getCurrentMultiplier().toFixed(2)}x`)
                .setStyle(ButtonStyle.Success)
                .setEmoji('💰');
            lastRow.addComponents(cashOutButton);
        } else {
            // Add a disabled placeholder button to maintain layout
            const placeholderButton = new ButtonBuilder()
                .setCustomId('mine_placeholder')
                .setLabel('Cash Out')
                .setStyle(ButtonStyle.Secondary)
                .setEmoji('💰')
                .setDisabled(true);
            lastRow.addComponents(placeholderButton);
        }
        
        rows.push(lastRow);
        
        return rows;
    }
    
    createGridButton(position) {
        const button = new ButtonBuilder()
            .setCustomId(`mine_${position}`)
            .setLabel('?')
            .setStyle(ButtonStyle.Secondary)
            .setDisabled(this.gameOver || this.revealed.has(position));
        
        if (this.revealed.has(position)) {
            if (this.minePositions.has(position)) {
                button.setEmoji('💥').setStyle(ButtonStyle.Danger);
            } else {
                button.setEmoji('✅').setStyle(ButtonStyle.Success);
            }
        }
        
        return button;
    }
}

// Store active games
const activeMinesweeperGames = new Map();

module.exports = {
    data: new SlashCommandBuilder()
        .setName('minesweeper')
        .setDescription('Minesweeper casino game - higher mines = higher risk & rewards!')
        .addIntegerOption(option =>
            option.setName('amount')
                .setDescription('Amount to bet (25-1000)')
                .setRequired(true)
                .setMinValue(25)
                .setMaxValue(1000))
        .addIntegerOption(option =>
            option.setName('mines')
                .setDescription('Number of mines: 1=Low Risk, 3=Medium, 5=High Risk (1-5)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(5)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;

        // Check casino game restrictions
        const allowed = await RestrictionMiddleware.checkCasinoGameRestriction(interaction, 'minesweeper');
        if (!allowed) return;

        await handleMinesweeper(interaction, userId, guildId);
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('mine_')) {
            await handleMinesweeperButton(interaction, customId);
        }
    }
};

async function handleMinesweeper(interaction, userId, guildId) {
    const amount = interaction.options.getInteger('amount');
    const mines = interaction.options.getInteger('mines') || 3;
    const userBalance = await database.getUserEconomy(userId, guildId);

    if (userBalance.coins < amount) {
        return interaction.reply({ content: '❌ You don\'t have enough coins!', ephemeral: true });
    }

    // Deduct bet amount
    await database.updateUserEconomy(userId, guildId, {
        coins: userBalance.coins - amount,
        total_earned: userBalance.total_earned || 1000
    });

    // Create new minesweeper game
    const game = new MinesweeperGame(userId, amount, mines);
    const gameId = `minesweeper_${userId}_${Date.now()}`;
    
    // Store game with extended timeout and activity tracking
    const gameData = {
        game: game,
        lastActivity: Date.now(),
        timeoutId: null
    };
    
    // Set up auto-cleanup - 24 HOURS timeout
    const setupTimeout = () => {
        if (gameData.timeoutId) {
            clearTimeout(gameData.timeoutId);
        }
        gameData.timeoutId = setTimeout(() => {
            activeMinesweeperGames.delete(gameId);
            console.log(`💣 Minesweeper game ${gameId} expired after 24 hours of inactivity`);
        }, 86400000); // 24 hours
    };
    
    setupTimeout();
    activeMinesweeperGames.set(gameId, gameData);

    const embed = game.createEmbed();
    const buttons = game.createButtons();

    // Store game ID in buttons
    buttons.forEach(row => {
        row.components.forEach(button => {
            const originalId = button.data.custom_id;
            button.setCustomId(`${originalId}_${gameId}`);
        });
    });

    await interaction.reply({ embeds: [embed], components: buttons });
}

async function handleMinesweeperButton(interaction, customIdWithGame) {
    console.log(`💣 Full customId: "${customIdWithGame}"`);
    
    // Parse button ID: mine_position_minesweeper_userId_timestamp or mine_cashout_minesweeper_userId_timestamp
    const parts = customIdWithGame.split('_');
    
    let action, gameId;
    if (parts[1] === 'cashout') {
        // Format: mine_cashout_minesweeper_userId_timestamp
        action = 'cashout';
        gameId = parts.slice(2).join('_'); // minesweeper_userId_timestamp
    } else if (parts[1] === 'placeholder') {
        // Ignore placeholder button clicks
        return interaction.reply({ content: '❌ You need to reveal at least one tile before you can cash out!', ephemeral: true });
    } else {
        // Format: mine_position_minesweeper_userId_timestamp
        action = parts[1]; // position number
        gameId = parts.slice(2).join('_'); // minesweeper_userId_timestamp
    }
    
    console.log(`💣 Parsed action: "${action}", gameId: "${gameId}"`);
    
    const gameData = activeMinesweeperGames.get(gameId);
    if (!gameData) {
        console.log(`💣 Game ${gameId} not found in active games`);
        console.log(`💣 Available game IDs:`, Array.from(activeMinesweeperGames.keys()));
        return interaction.reply({ content: '❌ Game session expired! Please start a new game with `/minesweeper`.', ephemeral: true });
    }

    const game = gameData.game;
    if (interaction.user.id !== game.userId) {
        return interaction.reply({ content: '❌ This is not your game!', ephemeral: true });
    }

    // Refresh timeout on activity - 24 HOURS
    gameData.lastActivity = Date.now();
    if (gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
        gameData.timeoutId = setTimeout(() => {
            activeMinesweeperGames.delete(gameId);
            console.log(`💣 Minesweeper game ${gameId} expired after 24 hours of inactivity`);
        }, 86400000); // 24 hours
    }
    
    console.log(`💣 Game ${gameId} activity refreshed - timeout reset to 24 hours`);

    await interaction.deferUpdate();

    if (action === 'cashout') {
        // Cash out - this should be a win!
        game.gameOver = true;
        game.won = true; // Mark as won when cashing out
        console.log(`💣 Game ${gameId} cashed out at ${game.getCurrentMultiplier().toFixed(2)}x`);
        await endMinesweeperGame(interaction, game, gameId);
    } else {
        // Reveal tile
        const position = parseInt(action);
        const result = game.revealTile(position);
        
        if (!result.valid) return;
        
        if (result.gameOver) {
            console.log(`💣 Game ${gameId} ended - ${result.mine ? 'hit mine' : 'won'}`);
            await endMinesweeperGame(interaction, game, gameId);
        } else {
            // Update display
            const embed = game.createEmbed();
            const buttons = game.createButtons();
            
            buttons.forEach(row => {
                row.components.forEach(button => {
                    const originalId = button.data.custom_id;
                    if (!originalId.includes('_' + gameId)) {
                        button.setCustomId(`${originalId}_${gameId}`);
                    }
                });
            });
            
            await interaction.editReply({ embeds: [embed], components: buttons });
        }
    }
}

async function endMinesweeperGame(interaction, game, gameId) {
    const payout = game.getPayout();
    
    // Update user balance with payout
    if (payout > 0) {
        const userBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
        await database.updateUserEconomy(game.userId, interaction.guild.id, {
            coins: userBalance.coins + payout,
            total_earned: (userBalance.total_earned || 1000) + (payout > game.bet ? payout - game.bet : 0)
        });
    }

    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

    const embed = game.createEmbed(true); // Show mines
    
    // Show new balance
    const newBalance = await database.getUserEconomy(game.userId, interaction.guild.id);
    embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
    
    // Disable all buttons
    const buttons = game.createButtons();
    buttons.forEach(row => {
        row.components.forEach(button => button.setDisabled(true));
    });
    
    await interaction.editReply({ embeds: [embed], components: buttons });
    
    // Clean up game and clear timeout
    const gameData = activeMinesweeperGames.get(gameId);
    if (gameData && gameData.timeoutId) {
        clearTimeout(gameData.timeoutId);
    }
    activeMinesweeperGames.delete(gameId);
}

function getActiveMinesweeperGames() {
    return activeMinesweeperGames;
}

module.exports.getActiveMinesweeperGames = getActiveMinesweeperGames;