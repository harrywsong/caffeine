const { loadAutoRoles } = require('../commands/autorole');
const RestrictionMiddleware = require('../middleware/restrictions');
const config = require('../utils/config');
const ticketManager = require('../utils/ticketManager');
const leaderboardUpdater = require('../utils/leaderboardUpdater');

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

        // Handle verification button
        if (interaction.isButton() && interaction.customId === 'verify_user') {
            await handleVerification(interaction);
        }

        // Handle daily check-in button
        if (interaction.isButton() && interaction.customId === 'daily_checkin') {
            await handleDailyCheckin(interaction);
        }

        // Handle ticket creation button
        if (interaction.isButton() && interaction.customId === 'create_ticket') {
            await ticketManager.createTicket(interaction);
        }

        // Handle ticket closing button
        if (interaction.isButton() && interaction.customId === 'close_ticket') {
            await ticketManager.closeTicket(interaction);
        }

        // Handle color request button
        if (interaction.isButton() && interaction.customId === 'color_request') {
            const { handleColorButton } = require('../commands/autorole-setup');
            await handleColorButton(interaction);
            return;
        }

        // Handle color remove button
        if (interaction.isButton() && interaction.customId === 'color_remove') {
            await handleColorRemoveButton(interaction);
            return;
        }

        // Handle other button interactions
        if (interaction.isButton() && !['verify_user', 'daily_checkin', 'color_request', 'color_remove'].includes(interaction.customId)) {
            // Handle blackjack game buttons - route to dedicated blackjack handler
            if (interaction.customId.startsWith('blackjack_')) {
                const { handleBlackjackButton } = require('../commands/games/blackjack');
                await handleBlackjackButton(interaction);
                return;
            }
            
            // Handle crash game buttons
            if (interaction.customId.startsWith('crash_')) {
                const crashCommand = interaction.client.commands.get('crash');
                if (crashCommand && crashCommand.handleButtonInteraction) {
                    await crashCommand.handleButtonInteraction(interaction);
                    return;
                }
            }
            
            // Handle minesweeper game buttons
            if (interaction.customId.startsWith('mine_')) {
                const minesweeperCommand = interaction.client.commands.get('minesweeper');
                if (minesweeperCommand && minesweeperCommand.handleButtonInteraction) {
                    await minesweeperCommand.handleButtonInteraction(interaction);
                    return;
                }
            }
            
            // Handle hi-lo game buttons
            if (interaction.customId.startsWith('hilo_')) {
                const hiloCommand = interaction.client.commands.get('hilo');
                if (hiloCommand && hiloCommand.handleButtonInteraction) {
                    await hiloCommand.handleButtonInteraction(interaction);
                    return;
                }
            }
            
            // Handle RPS game buttons
            if (interaction.customId.startsWith('rps_')) {
                const rpsCommand = interaction.client.commands.get('rps');
                if (rpsCommand && rpsCommand.handleButtonInteraction) {
                    await rpsCommand.handleButtonInteraction(interaction);
                    return;
                }
            }
            
            await handleGenericButtonInteraction(interaction);
        }

        // Handle color modal submission
        if (interaction.isModalSubmit() && interaction.customId === 'color_modal') {
            await handleColorModal(interaction);
        }

        // Handle role selection dropdown
        if (interaction.isStringSelectMenu() && interaction.customId === 'role_select') {
            await handleRoleSelection(interaction);
        }

        // Handle other select menu interactions
        if (interaction.isStringSelectMenu() && interaction.customId !== 'role_select') {
            await handleGenericSelectMenuInteraction(interaction);
        }
    },
};

async function handleVerification(interaction) {
    try {
        const member = interaction.member;
        const unverifiedRoleId = config.getSetting('unverifiedRole');
        
        if (!unverifiedRoleId) {
            return interaction.reply({
                content: '❌ Verification system is not configured!',
                ephemeral: true
            });
        }

        const unverifiedRole = interaction.guild.roles.cache.get(unverifiedRoleId);
        if (!unverifiedRole) {
            return interaction.reply({
                content: '❌ Unverified role not found!',
                ephemeral: true
            });
        }

        // Check if user has the unverified role
        if (!member.roles.cache.has(unverifiedRoleId)) {
            // Log attempted verification by already verified user
            const botLogsChannelId = config.getSettingChannelId('logChannel');
            if (botLogsChannelId) {
                const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
                if (botLogsChannel) {
                    const logMessage = `⚠️ **${member.user.tag}** attempted verification but is already verified`;
                    botLogsChannel.send(logMessage).catch(console.error);
                }
            }
            
            return interaction.reply({
                content: '✅ You are already verified!',
                ephemeral: true
            });
        }

        // Remove ONLY the unverified role (keep all other roles)
        await member.roles.remove(unverifiedRole);
        
        // Log verification
        console.log(`✅ ${member.user.tag} completed verification (kept ${member.roles.cache.size - 1} other roles)`);
        
        // Log to bot logs channel
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `✅ **${member.user.tag}** clicked verification button and gained full server access`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        // Log to chat history channel for interaction tracking
        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (chattingHistoryChannelId) {
            const chattingHistoryChannel = interaction.guild.channels.cache.get(chattingHistoryChannelId);
            if (chattingHistoryChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('✅ Verification Button Clicked')
                    .setDescription(`**User:** ${member.user.tag}\n**Channel:** <#${interaction.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    .addFields(
                        { name: '🎯 Action', value: 'User completed server verification', inline: false },
                        { name: '🔓 Result', value: 'Unverified role removed, full access granted', inline: false }
                    )
                    .setFooter({ text: `User ID: ${member.user.id}` })
                    .setTimestamp();
                
                chattingHistoryChannel.send({ embeds: [embed] }).catch(console.error);
            }
        }

        await interaction.reply({
            content: '🎉 **Verification Complete!**\n\nWelcome to the cafe! You now have full access to all channels and features. Your existing roles have been preserved. Feel free to explore and enjoy your stay! ☕',
            ephemeral: true
        });

    } catch (error) {
        console.error('Error handling verification:', error);
        
        // Log error to bot logs
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `❌ **Verification Error** for ${interaction.user.tag}: ${error.message}`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }
        
        await interaction.reply({
            content: '❌ There was an error during verification. Please contact an administrator.',
            ephemeral: true
        });
    }
}

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
        let addedRoles = [];
        if (selectedRoles.length > 0) {
            const rolesToAdd = selectedRoles.map(roleId => interaction.guild.roles.cache.get(roleId)).filter(role => role);
            if (rolesToAdd.length > 0) {
                await member.roles.add(rolesToAdd);
                addedRoles = rolesToAdd;
            }
        }

        // Log to bot logs channel
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const roleNames = addedRoles.map(role => role.name).join(', ');
                const logMessage = selectedRoles.length > 0 
                    ? `🎭 **${member.user.tag}** selected roles: ${roleNames}`
                    : `🎭 **${member.user.tag}** removed all reaction roles`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        // Log to chat history channel for interaction tracking
        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (chattingHistoryChannelId) {
            const chattingHistoryChannel = interaction.guild.channels.cache.get(chattingHistoryChannelId);
            if (chattingHistoryChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(selectedRoles.length > 0 ? 0x00FF00 : 0xFF6B6B)
                    .setTitle('🎭 Role Selection')
                    .setDescription(`**User:** ${member.user.tag}\n**Channel:** <#${interaction.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    .addFields(
                        { name: '🎯 Action', value: 'Role selection dropdown used', inline: false },
                        { name: '🎭 Selected Roles', value: selectedRoles.length > 0 ? addedRoles.map(role => role.name).join(', ') : 'None (removed all)', inline: false }
                    )
                    .setFooter({ text: `User ID: ${member.user.id}` })
                    .setTimestamp();
                
                chattingHistoryChannel.send({ embeds: [embed] }).catch(console.error);
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
        
        // Log error to bot logs
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `❌ **Role Selection Error** for ${interaction.user.tag}: ${error.message}`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }
        
        await interaction.reply({
            content: '❌ There was an error updating your roles. Please try again later.',
            ephemeral: true
        });
    }
}
async function handleGenericButtonInteraction(interaction) {
    try {
        // Log button interaction to both channels
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `🔘 **${interaction.user.tag}** clicked button: \`${interaction.customId}\` in <#${interaction.channel.id}>`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (chattingHistoryChannelId) {
            const chattingHistoryChannel = interaction.guild.channels.cache.get(chattingHistoryChannelId);
            if (chattingHistoryChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x0099FF)
                    .setTitle('🔘 Button Interaction')
                    .setDescription(`**User:** ${interaction.user.tag}\n**Channel:** <#${interaction.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    .addFields(
                        { name: '🎯 Button ID', value: `\`${interaction.customId}\``, inline: true },
                        { name: '📝 Message Preview', value: interaction.message.content?.substring(0, 100) + (interaction.message.content?.length > 100 ? '...' : '') || '*No text content*', inline: false }
                    )
                    .setFooter({ text: `User ID: ${interaction.user.id} | Message ID: ${interaction.message.id}` })
                    .setTimestamp();
                
                chattingHistoryChannel.send({ embeds: [embed] }).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error logging button interaction:', error);
    }
}

async function handleGenericSelectMenuInteraction(interaction) {
    try {
        // Log select menu interaction to both channels
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const selectedValues = interaction.values.join(', ');
                const logMessage = `📋 **${interaction.user.tag}** used select menu: \`${interaction.customId}\` with values: \`${selectedValues}\` in <#${interaction.channel.id}>`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (chattingHistoryChannelId) {
            const chattingHistoryChannel = interaction.guild.channels.cache.get(chattingHistoryChannelId);
            if (chattingHistoryChannel) {
                const { EmbedBuilder } = require('discord.js');
                const embed = new EmbedBuilder()
                    .setColor(0x9B59B6)
                    .setTitle('📋 Select Menu Interaction')
                    .setDescription(`**User:** ${interaction.user.tag}\n**Channel:** <#${interaction.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    .addFields(
                        { name: '🎯 Menu ID', value: `\`${interaction.customId}\``, inline: true },
                        { name: '📝 Selected Values', value: interaction.values.join(', ') || 'None', inline: false },
                        { name: '📝 Message Preview', value: interaction.message.content?.substring(0, 100) + (interaction.message.content?.length > 100 ? '...' : '') || '*No text content*', inline: false }
                    )
                    .setFooter({ text: `User ID: ${interaction.user.id} | Message ID: ${interaction.message.id}` })
                    .setTimestamp();
                
                chattingHistoryChannel.send({ embeds: [embed] }).catch(console.error);
            }
        }
    } catch (error) {
        console.error('Error logging select menu interaction:', error);
    }
}
async function handleDailyCheckin(interaction) {
    try {
        const userId = interaction.user.id;
        const guildId = interaction.guild.id;
        
        // Load economy data
        const fs = require('fs');
        const path = require('path');
        const economyFile = path.join(__dirname, '..', 'data', 'economy.json');
        
        let economy = {};
        try {
            if (fs.existsSync(economyFile)) {
                economy = JSON.parse(fs.readFileSync(economyFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading economy:', error);
        }

        // Get user data
        const userData = economy[userId] || { 
            coins: 1000, 
            lastDaily: 0, 
            checkinStreak: 0, 
            totalCheckins: 0 
        };

        // Check if user can claim daily reward
        const now = Date.now();
        const oneDay = 24 * 60 * 60 * 1000;
        const timeSinceLastDaily = now - userData.lastDaily;

        if (timeSinceLastDaily < oneDay) {
            const timeLeft = oneDay - timeSinceLastDaily;
            const hoursLeft = Math.floor(timeLeft / (60 * 60 * 1000));
            const minutesLeft = Math.floor((timeLeft % (60 * 60 * 1000)) / (60 * 1000));

            return interaction.reply({
                content: `⏰ You already claimed your daily reward! Come back in **${hoursLeft}h ${minutesLeft}m**`,
                ephemeral: true
            });
        }

        // Calculate streak
        const twoDays = 2 * 24 * 60 * 60 * 1000;
        let newStreak = 1;
        
        if (timeSinceLastDaily <= twoDays) {
            // Maintained streak
            newStreak = (userData.checkinStreak || 0) + 1;
        }

        // Calculate reward based on streak
        let baseReward = 100;
        let streakBonus = 0;
        
        if (newStreak >= 7) {
            streakBonus = 50; // Weekly bonus
        } else if (newStreak >= 3) {
            streakBonus = 25; // 3+ day bonus
        }

        const totalReward = baseReward + streakBonus;

        // Update user data
        userData.coins += totalReward;
        userData.lastDaily = now;
        userData.checkinStreak = newStreak;
        userData.totalCheckins = (userData.totalCheckins || 0) + 1;
        userData.total_earned = (userData.total_earned || 1000) + totalReward;

        // Save economy data
        economy[userId] = userData;
        try {
            const dir = path.dirname(economyFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(economyFile, JSON.stringify(economy, null, 2));
        } catch (error) {
            console.error('Error saving economy:', error);
        }

        // Create response embed
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor(0x00FF00)
            .setTitle('🎁 Daily Check-In Claimed!')
            .setDescription(`Welcome back, ${interaction.user.username}!`)
            .addFields(
                { name: '💰 Base Reward', value: `${baseReward} coins`, inline: true },
                { name: '🔥 Streak Bonus', value: `${streakBonus} coins`, inline: true },
                { name: '🎯 Total Earned', value: `**${totalReward} coins**`, inline: true },
                { name: '📊 Your Stats', value: `**Balance:** ${userData.coins.toLocaleString()} coins\n**Streak:** ${newStreak} day${newStreak !== 1 ? 's' : ''}\n**Total Check-ins:** ${userData.totalCheckins}`, inline: false }
            )
            .setFooter({ text: 'Come back tomorrow for another reward!' })
            .setTimestamp();

        // Add streak milestone messages
        if (newStreak === 7) {
            embed.addFields({ name: '🏆 Milestone!', value: 'You\'ve reached a 7-day streak! Keep it up!', inline: false });
        } else if (newStreak === 30) {
            embed.addFields({ name: '👑 Amazing!', value: 'You\'ve reached a 30-day streak! You\'re dedicated!', inline: false });
        }

        // Log to bot logs
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `🎁 **${interaction.user.tag}** claimed daily check-in: ${totalReward} coins (${newStreak} day streak)`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        // Log to chat history
        const chattingHistoryChannelId = config.getChannelId('chattingHistory');
        if (chattingHistoryChannelId) {
            const chattingHistoryChannel = interaction.guild.channels.cache.get(chattingHistoryChannelId);
            if (chattingHistoryChannel) {
                const historyEmbed = new EmbedBuilder()
                    .setColor(0x00FF00)
                    .setTitle('🎁 Daily Check-In Button Clicked')
                    .setDescription(`**User:** ${interaction.user.tag}\n**Channel:** <#${interaction.channel.id}>\n**Time:** <t:${Math.floor(Date.now() / 1000)}:F>`)
                    .addFields(
                        { name: '🎯 Action', value: 'Daily check-in reward claimed', inline: false },
                        { name: '💰 Reward', value: `${totalReward} coins (${baseReward} base + ${streakBonus} streak bonus)`, inline: false },
                        { name: '🔥 Streak', value: `${newStreak} day${newStreak !== 1 ? 's' : ''}`, inline: true },
                        { name: '💳 New Balance', value: `${userData.coins.toLocaleString()} coins`, inline: true }
                    )
                    .setFooter({ text: `User ID: ${interaction.user.id}` })
                    .setTimestamp();
                
                chattingHistoryChannel.send({ embeds: [historyEmbed] }).catch(console.error);
            }
        }

        await interaction.reply({ embeds: [embed], ephemeral: true });

        // Update casino leaderboard immediately after daily check-in
        leaderboardUpdater.updateCasinoLeaderboardNow(interaction.client);

    } catch (error) {
        console.error('Error handling daily check-in:', error);
        
        // Log error to bot logs
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `❌ **Daily Check-in Error** for ${interaction.user.tag}: ${error.message}`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }
        
        await interaction.reply({
            content: '❌ There was an error processing your daily check-in. Please try again later.',
            ephemeral: true
        });
    }
}

async function handleColorModal(interaction) {
    try {
        const hexColor = interaction.fields.getTextInputValue('hex_color');
        
        // Validate hex color format
        const hexRegex = /^#[0-9A-Fa-f]{6}$/;
        if (!hexRegex.test(hexColor)) {
            return interaction.reply({
                content: '❌ Invalid hex color format! Please use format: #FF69B4',
                ephemeral: true
            });
        }

        const { loadAutoRoleSections, saveAutoRoleSections } = require('../commands/autorole-setup');
        const guildId = interaction.guild.id;
        const userId = interaction.user.id;
        const member = interaction.member;

        // Convert hex to integer for Discord
        const colorInt = parseInt(hexColor.slice(1), 16);
        
        // Check if color already exists
        const existingRole = interaction.guild.roles.cache.find(role => 
            role.color === colorInt && role.name.startsWith('Color:')
        );

        // Find the reference role (1212624793178738749) to position new roles below it
        const referenceRole = interaction.guild.roles.cache.get('1212624793178738749');
        if (!referenceRole) {
            return interaction.reply({
                content: '❌ Reference role not found! Please contact an administrator.',
                ephemeral: true
            });
        }

        // Remove user's existing color roles
        const userColorRoles = member.roles.cache.filter(role => role.name.startsWith('Color:'));
        if (userColorRoles.size > 0) {
            await member.roles.remove(userColorRoles);
            
            // Check if any of the removed roles are now empty and delete them
            for (const [roleId, role] of userColorRoles) {
                const roleMembers = role.members.size;
                if (roleMembers === 0) {
                    try {
                        await role.delete('Color role is empty');
                        console.log(`🗑️ Deleted empty color role: ${role.name}`);
                    } catch (error) {
                        console.error('Error deleting empty color role:', error);
                    }
                }
            }
        }

        let targetRole;
        
        if (existingRole) {
            // Use existing role
            targetRole = existingRole;
            await member.roles.add(targetRole);
            
            await interaction.reply({
                content: `✅ You've been given the existing color role: **${targetRole.name}**!`,
                ephemeral: true
            });
        } else {
            // Create new role
            try {
                targetRole = await interaction.guild.roles.create({
                    name: `Color: ${hexColor.toUpperCase()}`,
                    color: colorInt,
                    position: referenceRole.position - 1,
                    mentionable: false,
                    reason: `Custom color role requested by ${interaction.user.tag}`
                });

                await member.roles.add(targetRole);
                
                await interaction.reply({
                    content: `✅ Created and assigned new color role: **${targetRole.name}**!`,
                    ephemeral: true
                });
                
                console.log(`🎨 Created new color role: ${targetRole.name} for ${interaction.user.tag}`);
            } catch (error) {
                console.error('Error creating color role:', error);
                await interaction.reply({
                    content: '❌ Failed to create color role. Please contact an administrator.',
                    ephemeral: true
                });
            }
        }

        // Log to bot logs
        const config = require('../utils/config');
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `🎨 **${interaction.user.tag}** requested color role: ${hexColor.toUpperCase()} (${existingRole ? 'existing' : 'new'} role)`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

    } catch (error) {
        console.error('Error handling color modal:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ There was an error processing your color request. Please try again.',
                ephemeral: true
            });
        }
    }
}

async function handleColorRemoveButton(interaction) {
    try {
        const member = interaction.member;
        
        // Find user's current color roles
        const userColorRoles = member.roles.cache.filter(role => role.name.startsWith('Color:'));
        
        if (userColorRoles.size === 0) {
            return interaction.reply({
                content: '❌ You don\'t have any color roles to remove!',
                ephemeral: true
            });
        }

        // Remove all color roles from the user
        await member.roles.remove(userColorRoles);
        
        // Check if any of the removed roles are now empty and delete them
        const deletedRoles = [];
        for (const [roleId, role] of userColorRoles) {
            const roleMembers = role.members.size;
            if (roleMembers === 0) {
                try {
                    await role.delete('Color role is empty after user removal');
                    deletedRoles.push(role.name);
                    console.log(`🗑️ Deleted empty color role: ${role.name}`);
                } catch (error) {
                    console.error('Error deleting empty color role:', error);
                }
            }
        }

        // Create response message
        const removedRoleNames = Array.from(userColorRoles.values()).map(role => role.name);
        let responseMessage = `✅ Removed your color role${removedRoleNames.length > 1 ? 's' : ''}: **${removedRoleNames.join(', ')}**!`;
        
        if (deletedRoles.length > 0) {
            responseMessage += `\n🗑️ Cleaned up ${deletedRoles.length} empty color role${deletedRoles.length > 1 ? 's' : ''}.`;
        }

        await interaction.reply({
            content: responseMessage,
            ephemeral: true
        });

        // Log to bot logs
        const config = require('../utils/config');
        const botLogsChannelId = config.getSettingChannelId('logChannel');
        if (botLogsChannelId) {
            const botLogsChannel = interaction.guild.channels.cache.get(botLogsChannelId);
            if (botLogsChannel) {
                const logMessage = `🗑️ **${interaction.user.tag}** removed color role${removedRoleNames.length > 1 ? 's' : ''}: ${removedRoleNames.join(', ')}`;
                botLogsChannel.send(logMessage).catch(console.error);
            }
        }

        console.log(`🗑️ ${interaction.user.tag} removed color role${removedRoleNames.length > 1 ? 's' : ''}: ${removedRoleNames.join(', ')}`);

    } catch (error) {
        console.error('Error handling color remove button:', error);
        
        if (!interaction.replied) {
            await interaction.reply({
                content: '❌ There was an error removing your color role. Please try again.',
                ephemeral: true
            });
        }
    }
}