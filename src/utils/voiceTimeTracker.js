const fs = require('fs');
const path = require('path');

class VoiceTimeTracker {
    constructor() {
        this.dataFile = path.join(__dirname, '..', 'data', 'voiceTime.json');
        this.sessionsFile = path.join(__dirname, '..', 'data', 'voiceSessions.json');
        this.data = this.loadData();
        this.activeSessions = this.loadSessions();
    }

    loadData() {
        try {
            if (fs.existsSync(this.dataFile)) {
                return JSON.parse(fs.readFileSync(this.dataFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading voice time data:', error);
        }
        return {};
    }

    loadSessions() {
        try {
            if (fs.existsSync(this.sessionsFile)) {
                return JSON.parse(fs.readFileSync(this.sessionsFile, 'utf8'));
            }
        } catch (error) {
            console.error('Error loading voice sessions:', error);
        }
        return {};
    }

    saveData() {
        try {
            const dir = path.dirname(this.dataFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.dataFile, JSON.stringify(this.data, null, 2));
        } catch (error) {
            console.error('Error saving voice time data:', error);
        }
    }

    saveSessions() {
        try {
            const dir = path.dirname(this.sessionsFile);
            if (!fs.existsSync(dir)) {
                fs.mkdirSync(dir, { recursive: true });
            }
            fs.writeFileSync(this.sessionsFile, JSON.stringify(this.activeSessions, null, 2));
        } catch (error) {
            console.error('Error saving voice sessions:', error);
        }
    }

    // Start tracking a user's voice session
    startSession(userId, channelId, guildId) {
        const sessionKey = `${guildId}_${userId}`;
        const now = Date.now();
        
        // End any existing session first
        this.endSession(userId, guildId);
        
        this.activeSessions[sessionKey] = {
            userId,
            channelId,
            guildId,
            startTime: now,
            lastUpdate: now
        };
        
        this.saveSessions();
        console.log(`🔊 Started voice session for ${userId} in channel ${channelId}`);
    }

    // End a user's voice session and add time to their total
    endSession(userId, guildId) {
        const sessionKey = `${guildId}_${userId}`;
        const session = this.activeSessions[sessionKey];
        
        if (session) {
            const duration = Date.now() - session.startTime;
            this.addTime(userId, guildId, session.channelId, duration);
            
            delete this.activeSessions[sessionKey];
            this.saveSessions();
            
            console.log(`🔇 Ended voice session for ${userId}, duration: ${this.formatDuration(duration)}`);
            return duration;
        }
        
        return 0;
    }

    // Update session when user moves channels
    updateSession(userId, newChannelId, guildId) {
        const sessionKey = `${guildId}_${userId}`;
        const session = this.activeSessions[sessionKey];
        
        if (session) {
            // End current session and add time
            const duration = Date.now() - session.startTime;
            this.addTime(userId, guildId, session.channelId, duration);
            
            // Start new session in new channel
            session.channelId = newChannelId;
            session.startTime = Date.now();
            session.lastUpdate = Date.now();
            
            this.saveSessions();
            console.log(`🔄 Updated voice session for ${userId} to channel ${newChannelId}`);
        }
    }

    // Add time to user's total
    addTime(userId, guildId, channelId, duration) {
        const userKey = `${guildId}_${userId}`;
        
        if (!this.data[userKey]) {
            this.data[userKey] = {
                totalTime: 0,
                sessions: 0,
                channels: {},
                lastActive: Date.now()
            };
        }
        
        this.data[userKey].totalTime += duration;
        this.data[userKey].sessions += 1;
        this.data[userKey].lastActive = Date.now();
        
        // Track time per channel
        if (!this.data[userKey].channels[channelId]) {
            this.data[userKey].channels[channelId] = 0;
        }
        this.data[userKey].channels[channelId] += duration;
        
        this.saveData();
    }

    // Get user's voice time statistics
    getUserStats(userId, guildId) {
        const userKey = `${guildId}_${userId}`;
        const userData = this.data[userKey];
        
        if (!userData) {
            return {
                totalTime: 0,
                sessions: 0,
                averageSession: 0,
                channels: {},
                lastActive: null,
                currentSession: null
            };
        }
        
        const sessionKey = `${guildId}_${userId}`;
        const currentSession = this.activeSessions[sessionKey];
        let currentSessionTime = 0;
        
        if (currentSession) {
            currentSessionTime = Date.now() - currentSession.startTime;
        }
        
        return {
            totalTime: userData.totalTime + currentSessionTime,
            sessions: userData.sessions + (currentSession ? 1 : 0),
            averageSession: userData.sessions > 0 ? userData.totalTime / userData.sessions : 0,
            channels: userData.channels,
            lastActive: userData.lastActive,
            currentSession: currentSession ? {
                channelId: currentSession.channelId,
                duration: currentSessionTime,
                startTime: currentSession.startTime
            } : null
        };
    }

    // Get leaderboard for a guild
    getLeaderboard(guildId, limit = 10) {
        const guildUsers = Object.entries(this.data)
            .filter(([key]) => key.startsWith(`${guildId}_`))
            .map(([key, data]) => ({
                userId: key.split('_')[1],
                ...data,
                // Add current session time if active
                totalTime: data.totalTime + (this.activeSessions[key] ? 
                    Date.now() - this.activeSessions[key].startTime : 0)
            }))
            .sort((a, b) => b.totalTime - a.totalTime)
            .slice(0, limit);
        
        return guildUsers;
    }

    // Restore sessions after bot restart
    async restoreSessions(client) {
        console.log('🔄 Restoring voice sessions after restart...');
        let restored = 0;
        let cleaned = 0;
        
        for (const [sessionKey, session] of Object.entries(this.activeSessions)) {
            try {
                const guild = client.guilds.cache.get(session.guildId);
                if (!guild) {
                    delete this.activeSessions[sessionKey];
                    cleaned++;
                    continue;
                }
                
                const channel = guild.channels.cache.get(session.channelId);
                if (!channel) {
                    delete this.activeSessions[sessionKey];
                    cleaned++;
                    continue;
                }
                
                const member = guild.members.cache.get(session.userId);
                if (!member || !member.voice.channelId) {
                    // User is no longer in voice, end their session
                    const duration = Date.now() - session.startTime;
                    this.addTime(session.userId, session.guildId, session.channelId, duration);
                    delete this.activeSessions[sessionKey];
                    cleaned++;
                    console.log(`🧹 Cleaned up session for ${session.userId} (no longer in voice)`);
                    continue;
                }
                
                if (member.voice.channelId !== session.channelId) {
                    // User moved channels while bot was offline
                    const duration = Date.now() - session.startTime;
                    this.addTime(session.userId, session.guildId, session.channelId, duration);
                    
                    // Start new session in current channel
                    session.channelId = member.voice.channelId;
                    session.startTime = Date.now();
                    session.lastUpdate = Date.now();
                    
                    console.log(`🔄 Updated session for ${session.userId} to new channel ${member.voice.channelId}`);
                }
                
                restored++;
                console.log(`✅ Restored session for ${session.userId} in ${channel.name}`);
                
            } catch (error) {
                console.error(`Error restoring session ${sessionKey}:`, error);
                delete this.activeSessions[sessionKey];
                cleaned++;
            }
        }
        
        this.saveSessions();
        console.log(`🎉 Session restoration complete: ${restored} restored, ${cleaned} cleaned up`);
        
        return { restored, cleaned };
    }

    // Format duration in human readable format
    formatDuration(milliseconds) {
        const seconds = Math.floor(milliseconds / 1000);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        
        if (days > 0) {
            return `${days}d ${hours % 24}h ${minutes % 60}m`;
        } else if (hours > 0) {
            return `${hours}h ${minutes % 60}m`;
        } else if (minutes > 0) {
            return `${minutes}m ${seconds % 60}s`;
        } else {
            return `${seconds}s`;
        }
    }

    // Get all active sessions for a guild
    getActiveSessions(guildId) {
        return Object.entries(this.activeSessions)
            .filter(([key]) => key.startsWith(`${guildId}_`))
            .map(([key, session]) => ({
                ...session,
                currentDuration: Date.now() - session.startTime
            }));
    }

    // Clean up old inactive sessions (run periodically)
    cleanupInactiveSessions(maxInactiveTime = 24 * 60 * 60 * 1000) { // 24 hours
        const now = Date.now();
        let cleaned = 0;
        
        for (const [sessionKey, session] of Object.entries(this.activeSessions)) {
            if (now - session.lastUpdate > maxInactiveTime) {
                const duration = session.lastUpdate - session.startTime;
                this.addTime(session.userId, session.guildId, session.channelId, duration);
                delete this.activeSessions[sessionKey];
                cleaned++;
                console.log(`🧹 Cleaned up inactive session for ${session.userId}`);
            }
        }
        
        if (cleaned > 0) {
            this.saveSessions();
            console.log(`🧹 Cleaned up ${cleaned} inactive sessions`);
        }
        
        return cleaned;
    }
}

// Create singleton instance
const voiceTimeTracker = new VoiceTimeTracker();

module.exports = voiceTimeTracker;