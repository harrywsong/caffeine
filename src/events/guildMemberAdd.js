const { loadAutoRoles } = require('../commands/autorole');

module.exports = {
    name: 'guildMemberAdd',
    async execute(member) {
        try {
            const autoRoles = loadAutoRoles();
            const guildData = autoRoles[member.guild.id];

            if (guildData && guildData.joinRole) {
                const role = member.guild.roles.cache.get(guildData.joinRole);
                
                if (role) {
                    await member.roles.add(role);
                    console.log(`✅ Assigned role ${role.name} to ${member.user.tag}`);
                } else {
                    console.log(`⚠️ Auto role not found for guild ${member.guild.id}`);
                }
            }
        } catch (error) {
            console.error('Error in guildMemberAdd event:', error);
        }
    },
};