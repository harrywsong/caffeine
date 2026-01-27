const { AttachmentBuilder } = require('discord.js');

// Discord file size limits (in bytes)
const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB for regular servers
const MAX_TOTAL_SIZE = 100 * 1024 * 1024; // 100MB total per message

class FilePreservationService {
    static async preserveAttachments(attachments, authorTag = 'Unknown', prefix = '') {
        const preservedAttachments = [];
        const attachmentInfo = [];
        let totalSize = 0;

        for (const [id, attachment] of attachments) {
            try {
                // Check individual file size
                if (attachment.size > MAX_FILE_SIZE) {
                    attachmentInfo.push({
                        name: attachment.name,
                        size: (attachment.size / 1024 / 1024).toFixed(2) + ' MB',
                        type: attachment.contentType || 'Unknown',
                        status: '❌ Too large (>25MB)',
                        preserved: false
                    });
                    continue;
                }

                // Check total size limit
                if (totalSize + attachment.size > MAX_TOTAL_SIZE) {
                    attachmentInfo.push({
                        name: attachment.name,
                        size: (attachment.size / 1024).toFixed(2) + ' KB',
                        type: attachment.contentType || 'Unknown',
                        status: '❌ Total size limit exceeded',
                        preserved: false
                    });
                    continue;
                }

                // Download the attachment
                const response = await fetch(attachment.url);
                if (!response.ok) {
                    attachmentInfo.push({
                        name: attachment.name,
                        size: (attachment.size / 1024).toFixed(2) + ' KB',
                        type: attachment.contentType || 'Unknown',
                        status: '❌ Download failed',
                        preserved: false
                    });
                    continue;
                }

                const buffer = Buffer.from(await response.arrayBuffer());
                
                // Create new attachment for reposting
                const fileName = prefix ? `${prefix}_${attachment.name}` : attachment.name;
                const newAttachment = new AttachmentBuilder(buffer, { 
                    name: fileName,
                    description: `Preserved file from ${authorTag}`
                });
                
                preservedAttachments.push(newAttachment);
                totalSize += attachment.size;
                
                const sizeStr = attachment.size > 1024 * 1024 
                    ? (attachment.size / 1024 / 1024).toFixed(2) + ' MB'
                    : (attachment.size / 1024).toFixed(2) + ' KB';

                attachmentInfo.push({
                    name: attachment.name,
                    size: sizeStr,
                    type: attachment.contentType || 'Unknown',
                    status: '✅ Preserved',
                    preserved: true
                });

            } catch (error) {
                console.error(`Error preserving attachment ${attachment.name}:`, error);
                attachmentInfo.push({
                    name: attachment.name,
                    size: (attachment.size / 1024).toFixed(2) + ' KB',
                    type: attachment.contentType || 'Unknown',
                    status: '❌ Error occurred',
                    preserved: false
                });
            }
        }

        return {
            attachments: preservedAttachments,
            info: attachmentInfo,
            totalPreserved: attachmentInfo.filter(info => info.preserved).length,
            totalFailed: attachmentInfo.filter(info => !info.preserved).length
        };
    }

    static formatAttachmentInfo(attachmentInfo) {
        if (attachmentInfo.length === 0) return 'No attachments';

        return attachmentInfo.map(info => 
            `• **${info.name}** (${info.size})\n  Type: ${info.type}\n  Status: ${info.status}`
        ).join('\n\n');
    }

    static async preserveEmbeds(embeds) {
        const embedInfo = [];
        
        for (const embed of embeds) {
            const info = {
                title: embed.title || 'No title',
                description: embed.description ? embed.description.substring(0, 100) + '...' : 'No description',
                url: embed.url || 'No URL',
                color: embed.color || 'Default',
                fields: embed.fields?.length || 0,
                hasImage: !!embed.image,
                hasThumbnail: !!embed.thumbnail,
                hasVideo: !!embed.video
            };
            
            embedInfo.push(info);
        }

        return embedInfo;
    }

    static formatEmbedInfo(embedInfo) {
        if (embedInfo.length === 0) return 'No embeds';

        return embedInfo.map((info, index) => 
            `**Embed ${index + 1}:**\n` +
            `• Title: ${info.title}\n` +
            `• Description: ${info.description}\n` +
            `• Fields: ${info.fields}\n` +
            `• Media: ${[info.hasImage && 'Image', info.hasThumbnail && 'Thumbnail', info.hasVideo && 'Video'].filter(Boolean).join(', ') || 'None'}`
        ).join('\n\n');
    }
}

module.exports = FilePreservationService;