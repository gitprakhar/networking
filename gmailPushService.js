const { google } = require('googleapis');
const { PubSub } = require('@google-cloud/pubsub');
const path = require('path');

class GmailPushService {
    constructor() {
        // Initialize PubSub with service account credentials
        this.pubsub = new PubSub({
            keyFilename: path.join(__dirname, 'networking-app-472722-0a0273969c54.json'),
            projectId: 'networking-app-472722'
        });
        this.topicName = 'gmail-push-notifications';
        this.subscriptionName = 'gmail-push-subscription';
    }

    // Set up Gmail push notifications for a user
    async setupPushNotifications(userId, accessToken, refreshToken) {
        try {
            console.log(`🔔 Setting up Gmail push notifications for user: ${userId}`);
            
            // Initialize Gmail API client with user's OAuth token
            const oauth2Client = new google.auth.OAuth2(
                process.env.GOOGLE_CLIENT_ID,
                process.env.GOOGLE_CLIENT_SECRET,
                'postmessage'
            );
            
            oauth2Client.setCredentials({
                access_token: accessToken,
                refresh_token: refreshToken
            });
            
            const gmail = google.gmail({ version: 'v1', auth: oauth2Client });
            
            // Create topic if it doesn't exist (using service account)
            await this.createTopicIfNotExists();
            
            // Create subscription if it doesn't exist (using service account)
            await this.createSubscriptionIfNotExists();
            
            // Set up Gmail push notification (using user's OAuth token)
            const watchRequest = {
                userId: 'me',
                requestBody: {
                    topicName: `projects/networking-app-472722/topics/${this.topicName}`,
                    labelIds: ['INBOX'], // Watch for new emails in inbox
                    labelFilterAction: 'include'
                }
            };
            
            const response = await gmail.users.watch(watchRequest);
            console.log(`✅ Gmail push notifications set up for user ${userId}:`, response.data);
            
            return {
                success: true,
                historyId: response.data.historyId,
                expiration: response.data.expiration
            };
            
        } catch (error) {
            console.error(`❌ Error setting up Gmail push notifications for user ${userId}:`, error);
            throw error;
        }
    }

    // Create Pub/Sub topic if it doesn't exist
    async createTopicIfNotExists() {
        try {
            const topic = this.pubsub.topic(this.topicName);
            const [exists] = await topic.exists();
            
            if (!exists) {
                console.log(`📝 Creating Pub/Sub topic: ${this.topicName}`);
                await topic.create();
                console.log(`✅ Created topic: ${this.topicName}`);
            } else {
                console.log(`✅ Topic already exists: ${this.topicName}`);
            }
        } catch (error) {
            console.error('❌ Error creating topic:', error);
            // Don't throw error for topic creation - it might already exist
            console.log('⚠️  Topic creation failed, continuing...');
        }
    }

    // Create or update Pub/Sub subscription
    async createSubscriptionIfNotExists() {
        try {
            const topic = this.pubsub.topic(this.topicName);
            const subscription = topic.subscription(this.subscriptionName);
            const [exists] = await subscription.exists();
            
            if (!exists) {
                console.log(`📝 Creating Pub/Sub subscription: ${this.subscriptionName}`);
                await topic.createSubscription(this.subscriptionName, {
                    pushConfig: {
                        pushEndpoint: `${process.env.WEBHOOK_BASE_URL}/webhook/gmail-push`
                    }
                });
                console.log(`✅ Created subscription: ${this.subscriptionName}`);
            } else {
                console.log(`✅ Subscription already exists: ${this.subscriptionName}`);
                // Delete and recreate subscription to ensure new webhook URL
                console.log(`🔄 Deleting existing subscription to update webhook URL...`);
                try {
                    await subscription.delete();
                    console.log(`✅ Deleted existing subscription`);
                    
                    // Create new subscription with new webhook URL
                    console.log(`📝 Creating new subscription with webhook URL: ${process.env.WEBHOOK_BASE_URL}/webhook/gmail-push`);
                    await topic.createSubscription(this.subscriptionName, {
                        pushConfig: {
                            pushEndpoint: `${process.env.WEBHOOK_BASE_URL}/webhook/gmail-push`
                        }
                    });
                    console.log(`✅ Created new subscription with updated webhook URL`);
                } catch (updateError) {
                    console.error(`❌ Failed to update subscription:`, updateError.message);
                    console.log(`⚠️  Continuing with existing subscription...`);
                }
            }
        } catch (error) {
            console.error('❌ Error creating/updating subscription:', error);
            // Don't throw error for subscription creation - it might already exist
            console.log('⚠️  Subscription creation/update failed, continuing...');
        }
    }

    // Process incoming Gmail push notification
    async processPushNotification(message) {
        try {
            console.log('📬 Processing Gmail push notification:', message);
            
            // Handle different message formats
            let data;
            if (message.message && message.message.data && typeof message.message.data === 'string') {
                // Pub/Sub message format - decode base64 data
                data = JSON.parse(Buffer.from(message.message.data, 'base64').toString());
            } else if (message.data && typeof message.data === 'string') {
                // Direct base64 data
                data = JSON.parse(Buffer.from(message.data, 'base64').toString());
            } else if (message.emailAddress) {
                // Direct Gmail notification format
                data = message;
            } else if (message.test) {
                // Test message format
                console.log('📧 Test webhook message received');
                return {
                    userEmail: 'test@example.com',
                    historyId: 'test',
                    timestamp: new Date()
                };
            } else {
                // Fallback for unknown formats
                console.log('📧 Unknown webhook message format:', message);
                return {
                    userEmail: 'unknown@example.com',
                    historyId: 'unknown',
                    timestamp: new Date()
                };
            }
            
            console.log('📧 Gmail notification data:', data);
            
            // Extract user email and history ID
            const userEmail = data.emailAddress;
            const historyId = data.historyId;
            
            console.log(`📬 New email notification for ${userEmail}, history ID: ${historyId}`);
            
            return {
                userEmail,
                historyId,
                timestamp: new Date()
            };
            
        } catch (error) {
            console.error('❌ Error processing push notification:', error);
            throw error;
        }
    }
}

module.exports = GmailPushService;
