const { loadAutoRoles } = require('../commands/autorole');
const config = require('../utils/config');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            // Get join roles from config
            const joinRoles = config.getSetting('joinRoles') || [];
            
            if (joinRoles.length > 0) {
                const rolesToAdd = [];
                
                for (const roleId of joinRoles) {
                    const role = member.guild.roles.cache.get(roleId);
                    if (role) {
                        rolesToAdd.push(role);
                    }
                }
                
                if (rolesToAdd.length > 0) {
                    await member.roles.add(rolesToAdd);
                    console.log(`🔐 Assigned ${rolesToAdd.length} join roles to ${member.user.tag}:`);
                    rolesToAdd.forEach(role => {
                        const isUnverified = role.id === config.getSetting('unverifiedRole');
                        console.log(`  • ${role.name}${isUnverified ? ' (unverified)' : ''}`);
                    });
                    
                    // Log to bot logs channel
                    const botLogsChannelId = config.getSettingChannelId('logChannel');
                    if (botLogsChannelId) {
                        const botLogsChannel = member.guild.channels.cache.get(botLogsChannelId);
                        if (botLogsChannel) {
                            const roleNames = rolesToAdd.map(role => role.name).join(', ');
                            const logMessage = `👋 **${member.user.tag}** joined and received ${rolesToAdd.length} roles: ${roleNames}`;
                            botLogsChannel.send(logMessage).catch(console.error);
                        }
                    }
                    
                    // Send welcome message to verification channel
                    const verificationChannelId = config.getSettingChannelId('verificationChannel');
                    if (verificationChannelId) {
                        const verificationChannel = member.guild.channels.cache.get(verificationChannelId);
                        if (verificationChannel) {
                            const welcomeMessage = `👋 Welcome ${member}! Please click the ✅ button above to verify your account and gain full access to the server.`;
                            await verificationChannel.send(welcomeMessage);
                        }
                    }
                }
            }

            // Handle legacy auto roles system (if still configured)
            const autoRoles = loadAutoRoles();
            const guildData = autoRoles[member.guild.id];

            if (guildData && guildData.joinRole) {
                const legacyRole = member.guild.roles.cache.get(guildData.joinRole);
                
                // Only add if it's not already in the join roles list
                if (legacyRole && !joinRoles.includes(legacyRole.id)) {
                    await member.roles.add(legacyRole);
                    console.log(`✅ Assigned legacy role ${legacyRole.name} to ${member.user.tag}`);
                }
            }
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};