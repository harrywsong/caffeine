const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const database = require('../../database/database');
const leaderboardUpdater = require('../../utils/leaderboardUpdater');

function getRandomInt(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Store cooldowns and active multiplayer games
const rpsCooldowns = new Map(); // userId -> timestamp
const activeMultiplayerGames = new Map(); // gameId -> game data
const pendingChallenges = new Map(); // challengeId -> challenge data

// Single Player RPS Class
class SinglePlayerRPS {
    constructor(userId) {
        this.userId = userId;
        this.playerChoice = null;
        this.botChoice = null;
        this.result = null;
        this.coins = 0;
    }
    
    play(playerChoice) {
        this.playerChoice = playerChoice;
        const choices = ['rock', 'paper', 'scissors'];
        this.botChoice = choices[getRandomInt(0, 2)];
        
        if (
            (playerChoice === 'rock' && this.botChoice === 'scissors') ||
            (playerChoice === 'paper' && this.botChoice === 'rock') ||
            (playerChoice === 'scissors' && this.botChoice === 'paper')
        ) {
            this.result = 'win';
            this.coins = 10;
        } else if (playerChoice === this.botChoice) {
            this.result = 'tie';
            this.coins = 5;
        } else {
            this.result = 'lose';
            this.coins = 0;
        }
        
        return { result: this.result, botChoice: this.botChoice, coins: this.coins };
    }
    
    createEmbed() {
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        
        let title = '✂️ Rock Paper Scissors';
        let color = 0x0099FF;
        
        if (this.result === 'win') {
            title = '✂️ RPS - 🏆 You Win!';
            color = 0x00FF00;
        } else if (this.result === 'tie') {
            title = '✂️ RPS - 🤝 It\'s a Tie!';
            color = 0xFFFF00;
        } else if (this.result === 'lose') {
            title = '✂️ RPS - 😞 You Lose!';
            color = 0xFF0000;
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        if (this.playerChoice && this.botChoice) {
            let gameDisplay = `**Your Choice:** ${emojis[this.playerChoice]} ${this.playerChoice}\n`;
            gameDisplay += `**Bot Choice:** ${emojis[this.botChoice]} ${this.botChoice}\n\n`;
            
            if (this.result === 'win') {
                gameDisplay += `🎉 **You won!** +${this.coins} coins`;
            } else if (this.result === 'tie') {
                gameDisplay += `🤝 **It's a tie!** +${this.coins} coins`;
            } else {
                gameDisplay += `😞 **You lost!** +${this.coins} coins`;
            }
            
            embed.addFields({ name: '🎯 Game Result', value: gameDisplay, inline: false });
        }
        
        return embed;
    }
}

// Multiplayer RPS Class
class MultiplayerRPS {
    constructor(challengerId, challengedId) {
        this.challengerId = challengerId;
        this.challengedId = challengedId;
        this.challengerChoice = null;
        this.challengedChoice = null;
        this.gameOver = false;
        this.result = null;
    }
    
    makeChoice(userId, choice) {
        if (userId === this.challengerId) {
            this.challengerChoice = choice;
        } else if (userId === this.challengedId) {
            this.challengedChoice = choice;
        }
        
        // Check if both players have made their choices
        if (this.challengerChoice && this.challengedChoice) {
            this.gameOver = true;
            this.calculateResult();
        }
    }
    
    calculateResult() {
        if (
            (this.challengerChoice === 'rock' && this.challengedChoice === 'scissors') ||
            (this.challengerChoice === 'paper' && this.challengedChoice === 'rock') ||
            (this.challengerChoice === 'scissors' && this.challengedChoice === 'paper')
        ) {
            this.result = 'challenger_wins';
        } else if (this.challengerChoice === this.challengedChoice) {
            this.result = 'tie';
        } else {
            this.result = 'challenged_wins';
        }
    }
    
    createEmbed(client) {
        const emojis = { rock: '🪨', paper: '📄', scissors: '✂️' };
        
        let title = '✂️ Multiplayer RPS';
        let color = 0x0099FF;
        
        if (this.gameOver) {
            if (this.result === 'tie') {
                title = '✂️ Multiplayer RPS - 🤝 It\'s a Tie!';
                color = 0xFFFF00;
            } else {
                title = '✂️ Multiplayer RPS - 🏆 We Have a Winner!';
                color = 0x00FF00;
            }
        }
        
        const embed = new EmbedBuilder()
            .setTitle(title)
            .setColor(color)
            .setTimestamp();
        
        const challenger = client.users.cache.get(this.challengerId);
        const challenged = client.users.cache.get(this.challengedId);
        
        if (this.gameOver) {
            let gameDisplay = `**${challenger?.displayName || 'Challenger'}:** ${emojis[this.challengerChoice]} ${this.challengerChoice}\n`;
            gameDisplay += `**${challenged?.displayName || 'Challenged'}:** ${emojis[this.challengedChoice]} ${this.challengedChoice}\n\n`;
            
            if (this.result === 'challenger_wins') {
                gameDisplay += `🎉 **${challenger?.displayName || 'Challenger'} wins!** +15 coins\n`;
                gameDisplay += `😞 **${challenged?.displayName || 'Challenged'} loses!** +0 coins`;
            } else if (this.result === 'challenged_wins') {
                gameDisplay += `🎉 **${challenged?.displayName || 'Challenged'} wins!** +15 coins\n`;
                gameDisplay += `😞 **${challenger?.displayName || 'Challenger'} loses!** +0 coins`;
            } else {
                gameDisplay += `🤝 **It's a tie!** Both players get +8 coins`;
            }
            
            embed.addFields({ name: '🎯 Game Result', value: gameDisplay, inline: false });
        } else {
            let gameDisplay = `**${challenger?.displayName || 'Challenger'}:** ${this.challengerChoice ? '✅ Ready' : '⏳ Choosing...'}\n`;
            gameDisplay += `**${challenged?.displayName || 'Challenged'}:** ${this.challengedChoice ? '✅ Ready' : '⏳ Choosing...'}`;
            
            embed.addFields({ name: '🎯 Game Status', value: gameDisplay, inline: false });
        }
        
        return embed;
    }
    
    createButtons() {
        if (this.gameOver) return [];
        
        const row = new ActionRowBuilder();
        
        const rockButton = new ButtonBuilder()
            .setCustomId('rps_mp_rock')
            .setLabel('Rock')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('🪨');
        
        const paperButton = new ButtonBuilder()
            .setCustomId('rps_mp_paper')
            .setLabel('Paper')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('📄');
        
        const scissorsButton = new ButtonBuilder()
            .setCustomId('rps_mp_scissors')
            .setLabel('Scissors')
            .setStyle(ButtonStyle.Secondary)
            .setEmoji('✂️');
        
        row.addComponents(rockButton, paperButton, scissorsButton);
        return [row];
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('rps')
        .setDescription('Free Rock Paper Scissors - Win: 10 coins, Tie: 5 coins, Lose: 0 coins')
        .addUserOption(option =>
            option.setName('opponent')
                .setDescription('Challenge another player to RPS (optional)')
                .setRequired(false)),

    async execute(interaction) {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        const opponent = interaction.options.getUser('opponent');

        // Check cooldown (1 minute)
        const now = Date.now();
        const cooldownTime = 60000; // 1 minute
        const lastPlayed = rpsCooldowns.get(userId) || 0;
        
        if (now - lastPlayed < cooldownTime) {
            const timeLeft = cooldownTime - (now - lastPlayed);
            const secondsLeft = Math.ceil(timeLeft / 1000);
            return interaction.reply({ 
                content: `⏰ You need to wait ${secondsLeft} seconds before playing RPS again!`, 
                ephemeral: true 
            });
        }

        if (opponent) {
            // Multiplayer mode
            if (opponent.id === userId) {
                return interaction.reply({ content: '❌ You cannot challenge yourself!', ephemeral: true });
            }
            
            if (opponent.bot) {
                return interaction.reply({ content: '❌ You cannot challenge a bot!', ephemeral: true });
            }
            
            await handleMultiplayerChallenge(interaction, userId, opponent, guildId);
        } else {
            // Single player mode
            await handleSinglePlayerRPS(interaction, userId, guildId);
        }
    },

    // Handle button interactions
    async handleButtonInteraction(interaction) {
        const customId = interaction.customId;
        
        if (customId.startsWith('rps_')) {
            if (customId.includes('_mp_')) {
                await handleMultiplayerButton(interaction, customId);
            } else if (customId.startsWith('rps_challenge_')) {
                await handleChallengeButton(interaction, customId);
            } else {
                await handleSinglePlayerButton(interaction, customId);
            }
        }
    }
};

async function handleSinglePlayerRPS(interaction, userId, guildId) {
    // Set cooldown
    rpsCooldowns.set(userId, Date.now());
    
    const game = new SinglePlayerRPS(userId);
    const embed = new EmbedBuilder()
        .setTitle('✂️ Rock Paper Scissors')
        .setDescription('Choose your move!')
        .setColor(0x0099FF)
        .addFields({ 
            name: '🎯 Rewards', 
            value: '🏆 Win: +10 coins\n🤝 Tie: +5 coins\n😞 Lose: +0 coins', 
            inline: false 
        });
    
    const row = new ActionRowBuilder();
    const gameId = `single_${userId}_${Date.now()}`;
    
    const rockButton = new ButtonBuilder()
        .setCustomId(`rps_rock_${gameId}`)
        .setLabel('Rock')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('🪨');
    
    const paperButton = new ButtonBuilder()
        .setCustomId(`rps_paper_${gameId}`)
        .setLabel('Paper')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('📄');
    
    const scissorsButton = new ButtonBuilder()
        .setCustomId(`rps_scissors_${gameId}`)
        .setLabel('Scissors')
        .setStyle(ButtonStyle.Secondary)
        .setEmoji('✂️');
    
    row.addComponents(rockButton, paperButton, scissorsButton);
    
    // Store game temporarily
    activeMultiplayerGames.set(gameId, { type: 'single', game, userId, guildId });
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
        activeMultiplayerGames.delete(gameId);
    }, 300000);
    
    await interaction.reply({ embeds: [embed], components: [row] });
}

async function handleMultiplayerChallenge(interaction, challengerId, opponent, guildId) {
    const challengeId = `challenge_${challengerId}_${opponent.id}_${Date.now()}`;
    
    // Store challenge
    pendingChallenges.set(challengeId, {
        challengerId,
        challengedId: opponent.id,
        guildId,
        timestamp: Date.now()
    });
    
    // Auto-cleanup after 2 minutes
    setTimeout(() => {
        pendingChallenges.delete(challengeId);
    }, 120000);
    
    const embed = new EmbedBuilder()
        .setTitle('✂️ RPS Challenge!')
        .setDescription(`${interaction.user.displayName} has challenged ${opponent.displayName} to Rock Paper Scissors!`)
        .setColor(0xFF9500)
        .addFields({ 
            name: '🎯 Multiplayer Rewards', 
            value: '🏆 Winner: +15 coins\n🤝 Tie: +8 coins each\n😞 Loser: +0 coins', 
            inline: false 
        });
    
    const row = new ActionRowBuilder();
    
    const acceptButton = new ButtonBuilder()
        .setCustomId(`rps_challenge_accept_${challengeId}`)
        .setLabel('Accept Challenge')
        .setStyle(ButtonStyle.Success)
        .setEmoji('✅');
    
    const declineButton = new ButtonBuilder()
        .setCustomId(`rps_challenge_decline_${challengeId}`)
        .setLabel('Decline')
        .setStyle(ButtonStyle.Danger)
        .setEmoji('❌');
    
    row.addComponents(acceptButton, declineButton);
    
    await interaction.reply({ content: `${opponent}, you've been challenged!`, embeds: [embed], components: [row] });
}

async function handleSinglePlayerButton(interaction, customIdWithGame) {
    const parts = customIdWithGame.split('_');
    const choice = parts[1]; // rock, paper, scissors
    const gameId = parts.slice(2).join('_');
    
    const gameData = activeMultiplayerGames.get(gameId);
    if (!gameData || gameData.type !== 'single') {
        return interaction.reply({ content: '❌ Game session expired!', ephemeral: true });
    }
    
    if (interaction.user.id !== gameData.userId) {
        return interaction.reply({ content: '❌ This is not your game!', ephemeral: true });
    }
    
    const result = gameData.game.play(choice);
    
    // Award coins
    if (result.coins > 0) {
        const userBalance = await database.getUserEconomy(gameData.userId, gameData.guildId);
        await database.updateUserEconomy(gameData.userId, gameData.guildId, {
            coins: userBalance.coins + result.coins,
            total_earned: (userBalance.total_earned || 1000) + result.coins
        });
    }
    
    const embed = gameData.game.createEmbed();
    
    // Show new balance
    const newBalance = await database.getUserEconomy(gameData.userId, gameData.guildId);
    embed.addFields({ name: '🏦 Current Balance', value: `${newBalance.coins.toLocaleString()} coins`, inline: false });
    
    await interaction.update({ embeds: [embed], components: [] });
    
    // Clean up
    activeMultiplayerGames.delete(gameId);
    
    // Update leaderboard
    leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);
}

async function handleChallengeButton(interaction, customId) {
    const parts = customId.split('_');
    const action = parts[2]; // accept or decline
    const challengeId = parts.slice(3).join('_');
    
    const challenge = pendingChallenges.get(challengeId);
    if (!challenge) {
        return interaction.reply({ content: '❌ Challenge expired!', ephemeral: true });
    }
    
    if (interaction.user.id !== challenge.challengedId) {
        return interaction.reply({ content: '❌ This challenge is not for you!', ephemeral: true });
    }
    
    if (action === 'decline') {
        pendingChallenges.delete(challengeId);
        await interaction.update({ 
            content: `${interaction.user.displayName} declined the challenge.`, 
            embeds: [], 
            components: [] 
        });
        return;
    }
    
    // Accept challenge - start multiplayer game
    const gameId = `mp_${challenge.challengerId}_${challenge.challengedId}_${Date.now()}`;
    const game = new MultiplayerRPS(challenge.challengerId, challenge.challengedId);
    
    activeMultiplayerGames.set(gameId, {
        type: 'multiplayer',
        game,
        guildId: challenge.guildId
    });
    
    // Set cooldowns for both players
    rpsCooldowns.set(challenge.challengerId, Date.now());
    rpsCooldowns.set(challenge.challengedId, Date.now());
    
    // Auto-cleanup after 5 minutes
    setTimeout(() => {
        activeMultiplayerGames.delete(gameId);
    }, 300000);
    
    const embed = game.createEmbed(interaction.client);
    const buttons = game.createButtons();
    
    // Add game ID to buttons
    buttons.forEach(row => {
        row.components.forEach(button => {
            const originalId = button.data.custom_id;
            button.setCustomId(`${originalId}_${gameId}`);
        });
    });
    
    await interaction.update({ 
        content: 'Challenge accepted! Both players make your choices:', 
        embeds: [embed], 
        components: buttons 
    });
    
    pendingChallenges.delete(challengeId);
}

async function handleMultiplayerButton(interaction, customIdWithGame) {
    const parts = customIdWithGame.split('_');
    const choice = parts[2]; // rock, paper, scissors
    const gameId = parts.slice(3).join('_');
    
    const gameData = activeMultiplayerGames.get(gameId);
    if (!gameData || gameData.type !== 'multiplayer') {
        return interaction.reply({ content: '❌ Game session expired!', ephemeral: true });
    }
    
    const game = gameData.game;
    if (interaction.user.id !== game.challengerId && interaction.user.id !== game.challengedId) {
        return interaction.reply({ content: '❌ You are not part of this game!', ephemeral: true });
    }
    
    // Check if player already made a choice
    if ((interaction.user.id === game.challengerId && game.challengerChoice) ||
        (interaction.user.id === game.challengedId && game.challengedChoice)) {
        return interaction.reply({ content: '❌ You already made your choice!', ephemeral: true });
    }
    
    game.makeChoice(interaction.user.id, choice);
    
    await interaction.deferUpdate();
    
    if (game.gameOver) {
        // Award coins based on result
        let challengerCoins = 0, challengedCoins = 0;
        
        if (game.result === 'challenger_wins') {
            challengerCoins = 15;
            challengedCoins = 0;
        } else if (game.result === 'challenged_wins') {
            challengerCoins = 0;
            challengedCoins = 15;
        } else {
            challengerCoins = 8;
            challengedCoins = 8;
        }
        
        // Update balances
        if (challengerCoins > 0) {
            const challengerBalance = await database.getUserEconomy(game.challengerId, gameData.guildId);
            await database.updateUserEconomy(game.challengerId, gameData.guildId, {
                coins: challengerBalance.coins + challengerCoins,
                total_earned: (challengerBalance.total_earned || 1000) + challengerCoins
            });
        }
        
        if (challengedCoins > 0) {
            const challengedBalance = await database.getUserEconomy(game.challengedId, gameData.guildId);
            await database.updateUserEconomy(game.challengedId, gameData.guildId, {
                coins: challengedBalance.coins + challengedCoins,
                total_earned: (challengedBalance.total_earned || 1000) + challengedCoins
            });
        }
        
        const embed = game.createEmbed(interaction.client);
        await interaction.editReply({ embeds: [embed], components: [] });
        
        // Clean up
        activeMultiplayerGames.delete(gameId);
        
        // Update leaderboard
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);
    } else {
        // Update display to show one player has chosen
        const embed = game.createEmbed(interaction.client);
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