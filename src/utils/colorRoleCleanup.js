const fs = require('fs');
const path = require('path');

// Auto role configuration file
const autoRoleFile = path.join(__dirname, '..', 'data', 'autorole-sections.json');

function loadAutoRoleSections() {
    try {
        if (fs.existsSync(autoRoleFile)) {
            return JSON.parse(fs.readFileSync(autoRoleFile, 'utf8'));
        }
    } catch (error) {
        console.error('Error loading auto role sections:', error);
    }
    return {};
}

async function cleanupEmptyColorRoles(client) {
    console.log('🧹 Starting automatic color role cleanup...');
    
    try {
        const sections = loadAutoRoleSections();
        let totalDeleted = 0;
        let totalChecked = 0;

        // Process each guild that has auto role sections
        for (const [guildId, guildData] of Object.entries(sections)) {
            try {
                const guild = client.guilds.cache.get(guildId);
                if (!guild) {
                    console.log(`⚠️ Guild ${guildId} not found, skipping...`);
                    continue;
                }

                // Ensure we have all roles cached
                await guild.roles.fetch();

                // Find all roles that start with "Color:" and have 0 members
                const colorRoles = guild.roles.cache.filter(role => 
                    role.name.startsWith('Color:') && role.members.size === 0
                );

                totalChecked += guild.roles.cache.filter(role => role.name.startsWith('Color:')).size;

                if (colorRoles.size === 0) {
                    console.log(`✅ ${guild.name}: No empty color roles found`);
                    continue;
                }

                // Check if bot can delete these roles
                const botMember = guild.members.me;
                if (!botMember) {
                    console.log(`⚠️ ${guild.name}: Bot member not found, skipping...`);
                    continue;
                }

                const deletableRoles = colorRoles.filter(role => 
                    role.position < botMember.roles.highest.position && 
                    role.id !== guild.id // Don't try to delete @everyone
                );

                let deletedCount = 0;
                const deletedRoles = [];

                // Delete the roles
                for (const role of deletableRoles.values()) {
                    try {
                        await role.delete('Automatic cleanup: Empty color role');
                        deletedRoles.push(role.name);
                        deletedCount++;
                        totalDeleted++;
                        
                        // Small delay to avoid rate limits
                        await new Promise(resolve => setTimeout(resolve, 500));
                    } catch (error) {
                        console.error(`❌ ${guild.name}: Failed to delete role ${role.name}:`, error.message);
                    }
                }

                if (deletedCount > 0) {
                    console.log(`🗑️ ${guild.name}: Deleted ${deletedCount} empty color roles: ${deletedRoles.join(', ')}`);
                } else {
                    console.log(`⚠️ ${guild.name}: Found ${colorRoles.size} empty color roles but couldn't delete them (permission issues)`);
                }

            } catch (error) {
                console.error(`❌ Error processing guild ${guildId}:`, error.message);
            }
        }

        console.log(`✅ Color role cleanup completed! Deleted ${totalDeleted} roles across all servers (checked ${totalChecked} total color roles)`);

    } catch (error) {
        console.error('❌ Error during automatic color cleanup:', error);
    }
}

function startColorRoleCleanupTimer(client) {
    // Run cleanup immediately on startup (after a short delay)
    setTimeout(() => {
        cleanupEmptyColorRoles(client);
    }, 30000); // 30 seconds after startup

    // Then run every 24 hours
    setInterval(() => {
        cleanupEmptyColorRoles(client);
    }, 24 * 60 * 60 * 1000); // 24 hours in milliseconds

    console.log('🕒 Color role cleanup timer started - will run every 24 hours');
}

module.exports = {
    cleanupEmptyColorRoles,
    startColorRoleCleanupTimer
};