class Dashboard {
    constructor() {
        this.guildId = window.location.pathname.split('/').pop();
        this.apiBase = '/api';
        this.init();
    }

    async init() {
        this.setupEventListeners();
        await this.loadGuildInfo();
        await this.loadChannels();
        await this.loadStats();
        await this.loadRestrictions();
        await this.loadCasinoChannels();
        await this.loadActivityLogs();
    }

    setupEventListeners() {
        // Tab navigation
        document.querySelectorAll('[data-tab]').forEach(tab => {
            tab.addEventListener('click', (e) => {
                e.preventDefault();
                this.switchTab(e.target.dataset.tab);
            });
        });

        // Forms
        document.getElementById('settingsForm').addEventListener('submit', (e) => this.handleSettingsSubmit(e));
        document.getElementById('restrictionForm').addEventListener('submit', (e) => this.handleRestrictionSubmit(e));
        document.getElementById('casinoForm').addEventListener('submit', (e) => this.handleCasinoSubmit(e));
        document.getElementById('announcementForm').addEventListener('submit', (e) => this.handleAnnouncementSubmit(e));
    }

    switchTab(tabName) {
        // Update nav
        document.querySelectorAll('.nav-link').forEach(link => link.classList.remove('active'));
        document.querySelector(`[data-tab="${tabName}"]`).classList.add('active');

        // Update content
        document.querySelectorAll('.tab-content').forEach(content => content.classList.remove('active'));
        document.getElementById(tabName).classList.add('active');
    }

    async apiCall(endpoint, options = {}) {
        try {
            const response = await fetch(`${this.apiBase}${endpoint}`, {
                headers: {
                    'Content-Type': 'application/json',
                    ...options.headers
                },
                ...options
            });

            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }

            return await response.json();
        } catch (error) {
            console.error('API call failed:', error);
            this.showAlert('Error', 'Failed to communicate with server', 'danger');
            throw error;
        }
    }

    async loadGuildInfo() {
        try {
            const data = await this.apiCall(`/guilds/${this.guildId}/settings`);
            
            if (data.guildInfo) {
                const guildInfoEl = document.getElementById('guildInfo');
                guildInfoEl.innerHTML = `
                    <img src="${data.guildInfo.icon || '/default-guild.png'}" alt="Guild Icon" class="rounded-circle mb-2" width="50" height="50">
                    <h6>${data.guildInfo.name}</h6>
                    <small>${data.guildInfo.memberCount} members</small>
                `;
                
                document.getElementById('memberCount').textContent = data.guildInfo.memberCount;
            }

            // Populate settings form
            if (data.settings) {
                Object.keys(data.settings).forEach(key => {
                    const input = document.querySelector(`[name="${key}"]`);
                    if (input) {
                        input.value = data.settings[key] || '';
                    }
                });
            }
        } catch (error) {
            console.error('Failed to load guild info:', error);
        }
    }

    async loadChannels() {
        try {
            const channels = await this.apiCall(`/guilds/${this.guildId}/channels`);
            
            // Populate channel dropdowns
            const textChannels = channels.filter(c => c.type === 0);
            const voiceChannels = channels.filter(c => c.type === 2);
            const categories = channels.filter(c => c.type === 4);

            this.populateChannelDropdown('logChannel', textChannels);
            this.populateChannelDropdown('announcementChannel', textChannels);
            this.populateChannelDropdown('welcomeChannel', textChannels);
            this.populateChannelDropdown('musicChannel', textChannels);
            this.populateChannelDropdown('voiceCategory', categories);

            // Populate form dropdowns
            this.populateChannelDropdown('restrictionForm [name="channelId"]', textChannels);
            this.populateChannelDropdown('casinoForm [name="channelId"]', textChannels);
            this.populateChannelDropdown('announcementForm [name="channelId"]', textChannels);

            // Display channels list
            this.displayChannelsList(channels);
        } catch (error) {
            console.error('Failed to load channels:', error);
        }
    }

    populateChannelDropdown(selector, channels) {
        const dropdown = document.querySelector(`#${selector}`) || document.querySelector(selector);
        if (!dropdown) return;

        // Keep the first option (placeholder)
        const firstOption = dropdown.querySelector('option');
        dropdown.innerHTML = '';
        if (firstOption) dropdown.appendChild(firstOption);

        channels.forEach(channel => {
            const option = document.createElement('option');
            option.value = channel.id;
            option.textContent = `#${channel.name}`;
            dropdown.appendChild(option);
        });
    }

    displayChannelsList(channels) {
        const container = document.getElementById('channelsList');
        const categories = channels.filter(c => c.type === 4);
        const textChannels = channels.filter(c => c.type === 0);
        const voiceChannels = channels.filter(c => c.type === 2);

        let html = '';
        
        if (categories.length > 0) {
            html += '<h6>Categories</h6>';
            categories.forEach(channel => {
                html += `<div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                    <span><i class="bi bi-folder me-2"></i>${channel.name}</span>
                    <span class="badge bg-secondary">Category</span>
                </div>`;
            });
        }

        if (textChannels.length > 0) {
            html += '<h6 class="mt-3">Text Channels</h6>';
            textChannels.forEach(channel => {
                html += `<div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                    <span><i class="bi bi-hash me-2"></i>${channel.name}</span>
                    <span class="badge bg-primary">Text</span>
                </div>`;
            });
        }

        if (voiceChannels.length > 0) {
            html += '<h6 class="mt-3">Voice Channels</h6>';
            voiceChannels.forEach(channel => {
                html += `<div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                    <span><i class="bi bi-mic me-2"></i>${channel.name}</span>
                    <span class="badge bg-success">Voice</span>
                </div>`;
            });
        }

        container.innerHTML = html;
    }

    async loadStats() {
        try {
            const stats = await this.apiCall(`/guilds/${this.guildId}/stats`);
            
            document.getElementById('totalCommands').textContent = stats.totalCommands || 0;
            document.getElementById('totalActivities').textContent = stats.totalActivities || 0;
            document.getElementById('activeTempChannels').textContent = stats.activeTempChannels || 0;

            // Display recent activity
            const recentActivityEl = document.getElementById('recentActivity');
            if (stats.recentActivity && stats.recentActivity.length > 0) {
                let html = '';
                stats.recentActivity.forEach(activity => {
                    const date = new Date(activity.timestamp).toLocaleString();
                    html += `<div class="log-entry">
                        <strong>${activity.action_type}</strong>: ${activity.action_details || 'N/A'}
                        <br><small class="text-muted">${date}</small>
                    </div>`;
                });
                recentActivityEl.innerHTML = html;
            } else {
                recentActivityEl.innerHTML = '<p class="text-muted">No recent activity</p>';
            }
        } catch (error) {
            console.error('Failed to load stats:', error);
        }
    }

    async loadRestrictions() {
        try {
            const restrictions = await this.apiCall(`/guilds/${this.guildId}/restrictions`);
            const container = document.getElementById('restrictionsList');

            if (restrictions.length === 0) {
                container.innerHTML = '<p class="text-muted">No restrictions configured</p>';
                return;
            }

            let html = '';
            restrictions.forEach(restriction => {
                const statusBadge = restriction.allowed 
                    ? '<span class="badge bg-success">Allowed</span>'
                    : '<span class="badge bg-danger">Blocked</span>';
                
                html += `<div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                    <div>
                        <strong>#${restriction.channel_id}</strong> - ${restriction.command_name}
                    </div>
                    ${statusBadge}
                </div>`;
            });

            container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load restrictions:', error);
        }
    }

    async loadCasinoChannels() {
        try {
            const casinoChannels = await this.apiCall(`/guilds/${this.guildId}/casino-channels`);
            const container = document.getElementById('casinoChannelsList');

            if (casinoChannels.length === 0) {
                container.innerHTML = '<p class="text-muted">No casino channels configured</p>';
                return;
            }

            let html = '';
            casinoChannels.forEach(channel => {
                html += `<div class="d-flex justify-content-between align-items-center p-2 border-bottom">
                    <div>
                        <strong>#${channel.channel_id}</strong>
                    </div>
                    <span class="badge bg-warning">${channel.game_type}</span>
                </div>`;
            });

            container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load casino channels:', error);
        }
    }

    async loadActivityLogs() {
        try {
            const logs = await this.apiCall(`/guilds/${this.guildId}/logs?limit=50`);
            const container = document.getElementById('activityLogs');

            if (logs.length === 0) {
                container.innerHTML = '<p class="text-muted">No activity logs</p>';
                return;
            }

            let html = '';
            logs.forEach(log => {
                const date = new Date(log.timestamp).toLocaleString();
                html += `<div class="log-entry">
                    <div class="d-flex justify-content-between">
                        <strong>${log.action_type}</strong>
                        <small class="text-muted">${date}</small>
                    </div>
                    <div>${log.action_details || 'N/A'}</div>
                    ${log.user_id ? `<small>User: ${log.user_id}</small>` : ''}
                </div>`;
            });

            container.innerHTML = html;
        } catch (error) {
            console.error('Failed to load activity logs:', error);
        }
    }

    async handleSettingsSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const settings = Object.fromEntries(formData.entries());

        try {
            await this.apiCall(`/guilds/${this.guildId}/settings`, {
                method: 'PUT',
                body: JSON.stringify(settings)
            });

            this.showAlert('Success', 'Settings updated successfully!', 'success');
        } catch (error) {
            this.showAlert('Error', 'Failed to update settings', 'danger');
        }
    }

    async handleRestrictionSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());
        data.allowed = data.allowed === 'true';

        try {
            await this.apiCall(`/guilds/${this.guildId}/restrictions`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showAlert('Success', 'Restriction added successfully!', 'success');
            e.target.reset();
            await this.loadRestrictions();
        } catch (error) {
            this.showAlert('Error', 'Failed to add restriction', 'danger');
        }
    }

    async handleCasinoSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            await this.apiCall(`/guilds/${this.guildId}/casino-channels`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showAlert('Success', 'Casino channel assigned successfully!', 'success');
            e.target.reset();
            await this.loadCasinoChannels();
        } catch (error) {
            this.showAlert('Error', 'Failed to assign casino channel', 'danger');
        }
    }

    async handleAnnouncementSubmit(e) {
        e.preventDefault();
        
        const formData = new FormData(e.target);
        const data = Object.fromEntries(formData.entries());

        try {
            await this.apiCall(`/guilds/${this.guildId}/announcement`, {
                method: 'POST',
                body: JSON.stringify(data)
            });

            this.showAlert('Success', 'Announcement sent successfully!', 'success');
            e.target.reset();
        } catch (error) {
            this.showAlert('Error', 'Failed to send announcement', 'danger');
        }
    }

    showAlert(title, message, type) {
        // Create and show bootstrap alert
        const alertDiv = document.createElement('div');
        alertDiv.className = `alert alert-${type} alert-dismissible fade show position-fixed`;
        alertDiv.style.cssText = 'top: 20px; right: 20px; z-index: 9999; min-width: 300px;';
        alertDiv.innerHTML = `
            <strong>${title}:</strong> ${message}
            <button type="button" class="btn-close" data-bs-dismiss="alert"></button>
        `;
        
        document.body.appendChild(alertDiv);
        
        // Auto remove after 5 seconds
        setTimeout(() => {
            if (alertDiv.parentNode) {
                alertDiv.remove();
            }
        }, 5000);
    }
}

// Initialize dashboard when page loads
document.addEventListener('DOMContentLoaded', () => {
    new Dashboard();
});