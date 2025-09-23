const { google } = require('googleapis');

class GmailService {
    constructor() {
        this.oauth2Client = null;
    }

    // Set up OAuth2 client with access token
    setAuth(accessToken, refreshToken = null) {
        this.oauth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET,
            'postmessage' // For popup flow
        );
        
        this.oauth2Client.setCredentials({
            access_token: accessToken,
            refresh_token: refreshToken
        });
    }

    // Refresh access token using refresh token
    async refreshAccessToken() {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        try {
            const { credentials } = await this.oauth2Client.refreshAccessToken();
            this.oauth2Client.setCredentials(credentials);
            return credentials;
        } catch (error) {
            console.error('Error refreshing access token:', error);
            throw error;
        }
    }

    // Fetch emails from Gmail API
    async fetchEmails(days = 7) {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        
        // Get user's email address first
        const profile = await gmail.users.getProfile({ userId: 'me' });
        const userEmail = profile.data.emailAddress;
        
        // Calculate date range
        const endDate = new Date();
        const startDate = new Date();
        startDate.setDate(startDate.getDate() - days);
        
        // Format dates for Gmail query
        const startDateStr = startDate.toISOString().split('T')[0];
        const endDateStr = endDate.toISOString().split('T')[0];
        
        console.log(`📅 Fetching emails from ${startDateStr} to ${endDateStr} (last ${days} days)`);
        
        // Build Gmail query to include both sent and received emails, but exclude promotional emails
        // Remove the 'before' clause to get all emails after the start date
        const query = `after:${startDateStr} -category:promotions -category:updates -category:social -in:spam`;
        
        try {
            // Get list of messages (includes both sent and received by default)
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: days < 0.1 ? 50 : 500 // Limit to 50 emails for very recent queries (push notifications)
            });

            const messages = response.data.messages || [];
            console.log(`📬 Found ${messages.length} messages in Gmail query`);
            
            const emails = [];

            // Fetch detailed information for each message
            for (const message of messages) {
                try {
                    const email = await this.fetchEmailDetails(gmail, message.id, userEmail);
                    if (email) {
                        emails.push(email);
                    }
                } catch (error) {
                    if (error.message.includes('Quota exceeded') || error.message.includes('rateLimitExceeded')) {
                        console.log(`⚠️  Rate limit hit, stopping email fetch to avoid further quota issues`);
                        break; // Stop fetching more emails to avoid hitting rate limits
                    }
                    console.error(`Error fetching email ${message.id}:`, error.message);
                    // Continue with other emails even if one fails
                }
            }

            console.log(`✅ Successfully fetched ${emails.length} emails from the last ${days} days`);
            return emails;
        } catch (error) {
            console.error('Error fetching emails:', error);
            throw new Error(`Failed to fetch emails: ${error.message}`);
        }
    }

    // Fetch detailed information for a specific email
    async fetchEmailDetails(gmail, messageId, userEmail) {
        try {
            const response = await gmail.users.messages.get({
                userId: 'me',
                id: messageId,
                format: 'full'
            });

            const message = response.data;
            const headers = message.payload.headers;
            
            // Extract email details from headers
            const getHeader = (name) => {
                const header = headers.find(h => h.name.toLowerCase() === name.toLowerCase());
                return header ? header.value : '';
            };

            // Extract body content
            let body = '';
            let snippet = message.snippet || '';
            
            if (message.payload.body && message.payload.body.data) {
                body = Buffer.from(message.payload.body.data, 'base64').toString('utf-8');
            } else if (message.payload.parts) {
                // Handle multipart messages
                body = this.extractBodyFromParts(message.payload.parts);
            }

            // Extract labels
            const labels = message.labelIds || [];

            // Determine if this is a sent email or received email
            const fromEmail = this.extractEmail(getHeader('From'));
            const toEmail = this.extractEmail(getHeader('To'));
            const isSentEmail = fromEmail === userEmail;

            return {
                gmail_id: messageId,
                thread_id: message.threadId,
                subject: getHeader('Subject') || 'No Subject',
                sender: this.extractName(getHeader('From')),
                sender_email: fromEmail,
                recipient: this.extractName(getHeader('To')),
                recipient_email: toEmail,
                user_email: userEmail, // Add user's email for reference
                is_sent: isSentEmail, // Add flag to identify sent emails
                date_sent: new Date(parseInt(message.internalDate)).toISOString(),
                snippet: snippet,
                body: body,
                labels: labels,
                is_read: !labels.includes('UNREAD')
            };
        } catch (error) {
            console.error(`Error fetching email details for ${messageId}:`, error);
            return null;
        }
    }

    // Extract body content from multipart messages
    extractBodyFromParts(parts) {
        let body = '';
        
        for (const part of parts) {
            if (part.mimeType === 'text/plain' && part.body && part.body.data) {
                body += Buffer.from(part.body.data, 'base64').toString('utf-8');
            } else if (part.mimeType === 'text/html' && part.body && part.body.data) {
                // For HTML emails, we'll use the plain text version if available
                if (!body) {
                    body += Buffer.from(part.body.data, 'base64').toString('utf-8');
                }
            } else if (part.parts) {
                // Recursively extract from nested parts
                body += this.extractBodyFromParts(part.parts);
            }
        }
        
        return body;
    }

    // Extract name from "Name <email@domain.com>" format
    extractName(fromHeader) {
        if (!fromHeader) return '';
        
        const match = fromHeader.match(/^(.+?)\s*<.+>$/);
        return match ? match[1].trim().replace(/^["']|["']$/g, '') : fromHeader;
    }

    // Extract email from "Name <email@domain.com>" format
    extractEmail(fromHeader) {
        if (!fromHeader) return '';
        
        const match = fromHeader.match(/<(.+?)>$/);
        return match ? match[1].trim() : fromHeader;
    }

    // Test the connection
    async testConnection() {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        try {
            const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
            const response = await gmail.users.getProfile({ userId: 'me' });
            return {
                success: true,
                email: response.data.emailAddress,
                messagesTotal: response.data.messagesTotal
            };
        } catch (error) {
            throw new Error(`Gmail API connection failed: ${error.message}`);
        }
    }

    // Fetch emails since a specific date
    async fetchEmailsSince(sinceDate, days = 7) {
        if (!this.oauth2Client) {
            throw new Error('OAuth2 client not initialized');
        }

        const gmail = google.gmail({ version: 'v1', auth: this.oauth2Client });
        
        try {
            // Get user's email address first
            const profile = await gmail.users.getProfile({ userId: 'me' });
            const userEmail = profile.data.emailAddress;
            
            // Calculate date range
            const endDate = new Date();
            const startDate = sinceDate || new Date(Date.now() - days * 24 * 60 * 60 * 1000);
            
            // Format dates for Gmail query
            const startDateStr = startDate.toISOString().split('T')[0];
            const endDateStr = endDate.toISOString().split('T')[0];
            
            // Build query for emails since the specified date, excluding promotional emails
            // Use a more precise time-based query
            const query = `after:${startDateStr} -category:promotions -category:updates -category:social -in:spam`;
            
            console.log(`📧 Fetching emails since ${startDateStr} for user: ${userEmail}`);
            
            // Fetch message list
            const response = await gmail.users.messages.list({
                userId: 'me',
                q: query,
                maxResults: 50
            });
            
            const messages = response.data.messages || [];
            console.log(`📬 Found ${messages.length} messages since ${startDateStr}`);
            
            if (messages.length === 0) {
                console.log(`📭 No new messages found since ${startDateStr}`);
                return [];
            }
            
            // Fetch detailed information for each message
            const emails = [];
            for (const message of messages) {
                try {
                    const emailDetails = await this.fetchEmailDetails(gmail, message.id, userEmail);
                    emails.push(emailDetails);
                } catch (error) {
                    console.error(`Error fetching email ${message.id}:`, error);
                }
            }
            
            console.log(`✅ Successfully processed ${emails.length} emails`);
            return emails;
            
        } catch (error) {
            console.error('Error fetching emails since date:', error);
            throw new Error(`Gmail API connection failed: ${error.message}`);
        }
    }
}

module.exports = GmailService;
