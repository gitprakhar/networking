const { google } = require('googleapis');
const { PubSub } = require('@google-cloud/pubsub');

class GmailPushService {
    constructor() {
        this.pubsub = new PubSub();
        this.topicName = 'gmail-push-notifications';
        this.subscriptionName = 'gmail-push-subscription';
    }

    // Set up Gmail push notifications for a user
    async setupPushNotifications(userId, accessToken, refreshToken) {
        try {
            console.log(`🔔 Setting up Gmail push notifications for user: ${userId}`);
            
            // Initialize Gmail API client
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
            
            // Create topic if it doesn't exist
            await this.createTopicIfNotExists();
            
            // Create subscription if it doesn't exist
            await this.createSubscriptionIfNotExists();
            
            // Set up Gmail push notification
            const watchRequest = {
                userId: 'me',
                requestBody: {
                    topicName: `projects/${process.env.GOOGLE_CLOUD_PROJECT_ID}/topics/${this.topicName}`,
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
            throw error;
        }
    }

    // Create Pub/Sub subscription if it doesn't exist
    async createSubscriptionIfNotExists() {
        try {
            const subscription = this.pubsub.subscription(this.subscriptionName);
            const [exists] = await subscription.exists();
            
            if (!exists) {
                console.log(`📝 Creating Pub/Sub subscription: ${this.subscriptionName}`);
                await subscription.create({
                    topic: this.topicName,
                    pushConfig: {
                        pushEndpoint: `${process.env.WEBHOOK_BASE_URL}/webhook/gmail-push`
                    }
                });
                console.log(`✅ Created subscription: ${this.subscriptionName}`);
            } else {
                console.log(`✅ Subscription already exists: ${this.subscriptionName}`);
            }
        } catch (error) {
            console.error('❌ Error creating subscription:', error);
            throw error;
        }
    }

    // Process incoming Gmail push notification
    async processPushNotification(message) {
        try {
            console.log('📬 Processing Gmail push notification:', message);
            
            // Decode the message data
            const data = JSON.parse(Buffer.from(message.data, 'base64').toString());
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
