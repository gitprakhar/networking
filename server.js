const express = require('express');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const Database = require('./database');
const GmailService = require('./gmailService');
const OpenAIService = require('./openaiService');
const GmailPushService = require('./gmailPushService');
const { Server } = require('socket.io');
const http = require('http');
require('dotenv').config();

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: {
        origin: "*",
        methods: ["GET", "POST"]
    }
});
const PORT = process.env.PORT || 8000;

// Initialize database and services
const db = new Database();
const openaiService = new OpenAIService();
const gmailPushService = new GmailPushService();

// Wait for database initialization
db.init().then(() => {
    console.log('✅ Database ready');
}).catch((err) => {
    console.error('❌ Database initialization failed:', err);
    process.exit(1);
});

// Gmail Push Notifications with fallback polling
// Gmail will push notifications directly to our webhook when new emails arrive
// If push fails, we fall back to polling for real-time updates

// Push notifications only - no periodic polling
const activeUsers = new Map(); // Track users for WebSocket connections
const pushSetupCooldown = new Map(); // Track push notification setup cooldowns
const processedNotifications = new Set(); // Track processed notifications to prevent duplicates

// Disable all periodic polling
console.log('🚫 Periodic polling disabled - using push notifications only');

// Middleware
app.use(cors());
app.use(express.json());

// Route to serve the main HTML file with environment variables injected
app.get('/', (req, res) => {
  try {
    // Read the HTML file
    let html = fs.readFileSync(path.join(__dirname, 'index.html'), 'utf8');
    
    // Replace placeholders with environment variables
    html = html.replace(/YOUR_GOOGLE_CLIENT_ID/g, process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID');
    
    // Set content type and send the modified HTML
    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  } catch (error) {
    console.error('Error serving HTML:', error);
    res.status(500).send('Error loading page');
  }
});

// Serve static files (CSS, JS, etc.)
app.use(express.static('.'));

// API endpoint to get environment variables (for client-side use)
app.get('/api/config', (req, res) => {
  res.json({
    googleClientId: process.env.GOOGLE_CLIENT_ID || 'YOUR_GOOGLE_CLIENT_ID',
    appName: process.env.APP_NAME || 'Google Login Demo',
    appVersion: process.env.APP_VERSION || '1.0.0',
    nodeEnv: process.env.NODE_ENV || 'development'
  });
});

// OAuth callback endpoint for Gmail access
app.get('/oauth/callback', async (req, res) => {
  try {
    const { code } = req.query;
    
    console.log('🔄 OAuth callback received');
    console.log('📝 Authorization code:', code ? 'Present' : 'Missing');
    console.log('🌐 Full URL:', req.url);
    
    if (!code) {
      return res.status(400).send('Authorization code not provided');
    }
    
    // Exchange authorization code for access token
    console.log('🔄 Exchanging authorization code for access token...');
    
    const tokenResponse = await fetch('https://oauth2.googleapis.com/token', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        client_id: process.env.GOOGLE_CLIENT_ID,
        client_secret: process.env.GOOGLE_CLIENT_SECRET,
        code: code,
        grant_type: 'authorization_code',
        redirect_uri: `${req.protocol}://${req.get('host')}/oauth/callback`
      })
    });
    
    const tokenData = await tokenResponse.json();
    console.log('🔑 Token response:', tokenData);
    
    if (tokenData.error) {
      console.error('OAuth token error:', tokenData.error);
      return res.status(400).send(`OAuth error: ${tokenData.error}`);
    }
    
    console.log('✅ Access token received successfully');
    
    // Calculate token expiration time
    const expiresAt = new Date(Date.now() + (tokenData.expires_in * 1000));
    
    // Save Gmail tokens to database (we need to get the user info first)
    // For now, we'll let the frontend handle this after redirect
    console.log('💾 Gmail tokens will be saved by frontend after redirect');
    
    // Send the access token to the client
    res.send(`
      <html>
        <head>
          <title>Gmail Access Granted</title>
          <style>
            body { 
              font-family: Arial, sans-serif; 
              text-align: center; 
              padding: 50px; 
              background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
              color: white;
              margin: 0;
            }
            .container {
              background: rgba(255, 255, 255, 0.1);
              padding: 30px;
              border-radius: 10px;
              backdrop-filter: blur(10px);
              max-width: 400px;
              margin: 0 auto;
            }
            .success-icon {
              font-size: 48px;
              margin-bottom: 20px;
            }
            .message {
              font-size: 18px;
              margin-bottom: 20px;
            }
            .redirect-message {
              font-size: 14px;
              opacity: 0.8;
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="success-icon">✅</div>
            <div class="message">Gmail access granted!</div>
            <div class="redirect-message">Redirecting you back to the app...</div>
          </div>
          <script>
            // Store both access and refresh tokens in localStorage
            localStorage.setItem('gmailAccessToken', '${tokenData.access_token}');
            localStorage.setItem('gmailRefreshToken', '${tokenData.refresh_token}');
            localStorage.setItem('gmailTokenExpires', '${expiresAt.toISOString()}');
            console.log('✅ Gmail tokens stored:', {
              access_token: '${tokenData.access_token}',
              refresh_token: '${tokenData.refresh_token}',
              expires_at: '${expiresAt.toISOString()}'
            });
            
            // Redirect back to the main app immediately
            window.location.href = '/';
          </script>
        </body>
      </html>
    `);
    
  } catch (error) {
    console.error('OAuth callback error:', error);
    res.status(500).send('OAuth callback failed');
  }
});

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ 
    status: 'OK', 
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development'
  });
});

// Email endpoints
app.post('/api/save-user', async (req, res) => {
  try {
    const { google_id, email, name, picture, gmail_access_token, gmail_refresh_token, token_expires_at } = req.body;
    console.log(`👤 Saving user: ${name} (${email})`);
    const userId = await db.createOrUpdateUser({ 
      google_id, 
      email, 
      name, 
      picture,
      gmail_access_token,
      gmail_refresh_token,
      token_expires_at
    });
    console.log(`✅ User saved with ID: ${userId}`);
    res.json({ success: true, userId });
  } catch (error) {
    console.error('❌ Error saving user:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/sync-emails', async (req, res) => {
  try {
    const { google_id, access_token, refresh_token } = req.body;
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Initialize Gmail service
    const gmailService = new GmailService();
    gmailService.setAuth(access_token);

    // Test connection first
    await gmailService.testConnection();

        // Fetch emails from last 15 minutes (reduced to minimize API calls)
        const emails = await gmailService.fetchEmails(0.01);
    
    // Save emails to database
    await db.saveEmails(user.id, emails);
    
    // Update contacts from emails
    await db.updateContactsFromEmails(user.id, emails);

        // Set up Gmail push notifications (with cooldown to prevent multiple setups)
        const cooldownKey = `push_${google_id}`;
        const lastSetup = pushSetupCooldown.get(cooldownKey);
        const now = Date.now();
        
        if (!lastSetup || (now - lastSetup) > 3600000) { // 60 minute cooldown
            try {
                console.log(`🔔 Setting up Gmail push notifications for user: ${google_id}`);
                await gmailPushService.setupPushNotifications(google_id, access_token, refresh_token);
                console.log(`✅ Gmail push notifications set up successfully for user: ${google_id}`);
                pushSetupCooldown.set(cooldownKey, now);
            } catch (error) {
                console.error(`❌ Failed to set up Gmail push notifications for user ${google_id}:`, error);
            }
        } else {
            console.log(`⏳ Push notifications setup on cooldown for user: ${google_id}`);
        }

    res.json({ 
      success: true, 
      count: emails.length,
      message: `Synced ${emails.length} emails and started real-time monitoring`
    });
  } catch (error) {
    console.error('Error syncing emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/emails/:google_id', async (req, res) => {
  try {
    const { google_id } = req.params;
    console.log(`📧 Fetching emails for user: ${google_id}`);
    
    // Security: Validate google_id format
    if (!google_id || typeof google_id !== 'string' || google_id.length < 10) {
      console.log(`❌ Invalid google_id format: ${google_id}`);
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      console.log(`❌ User not found: ${google_id}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    // Get emails from last 7 days
    const emails = await db.getEmailsByUserIdAndDateRange(user.id, 7);
    console.log(`📬 Found ${emails.length} emails for user ${user.name}`);
    
    res.json({ success: true, emails });
  } catch (error) {
    console.error('❌ Error fetching emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.delete('/api/emails/:google_id', async (req, res) => {
  try {
    const { google_id } = req.params;
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Delete all user emails
    const deletedCount = await db.deleteUserEmails(user.id);
    
    res.json({ 
      success: true, 
      message: `Deleted ${deletedCount} emails`,
      deletedCount 
    });
  } catch (error) {
    console.error('Error deleting emails:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Contacts endpoints
app.get('/api/contacts/:google_id', async (req, res) => {
  try {
    const { google_id } = req.params;
    console.log(`👥 Fetching contacts for user: ${google_id}`);
    
    // Security: Validate google_id format
    if (!google_id || typeof google_id !== 'string' || google_id.length < 10) {
      console.log(`❌ Invalid google_id format: ${google_id}`);
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      console.log(`❌ User not found: ${google_id}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    console.log(`✅ User found: ${user.name} (ID: ${user.id})`);

    // Get contacts
    const contacts = await db.getContactsByUserId(user.id);
    console.log(`👥 Found ${contacts.length} contacts for user ${user.name}`);
    
    res.json({ success: true, contacts });
  } catch (error) {
    console.error('❌ Error fetching contacts:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

app.get('/api/conversation/:google_id/:contact_email', async (req, res) => {
  try {
    const { google_id, contact_email } = req.params;
    console.log(`💬 Fetching conversation for user: ${google_id} with: ${contact_email}`);
    
    // Security: Validate google_id format
    if (!google_id || typeof google_id !== 'string' || google_id.length < 10) {
      console.log(`❌ Invalid google_id format: ${google_id}`);
      return res.status(400).json({ success: false, error: 'Invalid user ID' });
    }
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      console.log(`❌ User not found: ${google_id}`);
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    // Get contact info
    const contact = await db.getContactByEmail(user.id, contact_email);
    if (!contact) {
      console.log(`❌ Contact not found: ${contact_email}`);
      return res.status(404).json({ success: false, error: 'Contact not found' });
    }

    // Get conversation history
    const conversation = await db.getConversationHistory(user.id, contact_email);
    console.log(`💬 Found ${conversation.length} messages in conversation with ${contact.contact_name}`);
    
    res.json({ 
      success: true, 
      contact: contact,
      conversation: conversation 
    });
  } catch (error) {
    console.error('❌ Error fetching conversation:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

// Analyze conversations and generate follow-ups
app.post('/api/analyze-conversations/:google_id', async (req, res) => {
  try {
    const { google_id } = req.params;
    
    // Validate google_id format
    if (!/^\d+$/.test(google_id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }
    
    console.log(`🤖 Analyzing conversations for user: ${google_id}`);
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get all contacts
    const contacts = await db.getContactsByUserId(user.id);
    if (contacts.length === 0) {
      return res.json({ success: true, message: 'No contacts found to analyze' });
    }
    
    // Get conversations for each contact
    const conversations = [];
    for (const contact of contacts) {
      const conversation = await db.getConversationHistory(user.id, contact.contact_email);
      if (conversation.length > 0) {
        conversations.push(conversation);
      }
    }
    
    if (conversations.length === 0) {
      return res.json({ success: true, message: 'No conversations found to analyze' });
    }
    
    console.log(`🤖 Analyzing ${conversations.length} conversations with OpenAI`);
    
    // Analyze conversations with OpenAI
    const analyses = await openaiService.analyzeMultipleConversations(conversations);
    
    // Save networking conversations to database
    const followUps = [];
    for (const analysis of analyses) {
      if (analysis.is_networking) {
        const followUpData = {
          contact_email: analysis.contact_email,
          contact_name: analysis.contact_name,
          conversation_summary: analysis.conversation_summary,
          networking_score: analysis.networking_score,
          needs_followup: true,
          followup_reason: `Networking conversation: ${analysis.networking_type}`,
          suggested_action: `Follow up on this ${analysis.networking_type} conversation`,
          priority: analysis.networking_score >= 7 ? 'high' : analysis.networking_score >= 4 ? 'medium' : 'low',
          status: 'pending'
        };
        
        await db.saveFollowUp(user.id, followUpData);
        followUps.push(followUpData);
      }
    }
    
    console.log(`✅ Generated ${followUps.length} follow-ups`);
    
    res.json({ 
      success: true, 
      message: `Analyzed ${conversations.length} conversations and found ${followUps.length} networking conversations`,
      followUps 
    });
  } catch (error) {
    console.error('❌ Error analyzing conversations:', error);
    res.status(500).json({ success: false, error: 'Failed to analyze conversations' });
  }
});

// Get follow-ups for a user
app.get('/api/follow-ups/:google_id', async (req, res) => {
  try {
    const { google_id } = req.params;
    
    // Validate google_id format
    if (!/^\d+$/.test(google_id)) {
      return res.status(400).json({ success: false, error: 'Invalid user ID format' });
    }
    
    console.log(`📋 Fetching follow-ups for user: ${google_id}`);
    
    // Get user from database
    const user = await db.getUserByGoogleId(google_id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }
    
    // Get follow-ups
    const followUps = await db.getFollowUpsByUserId(user.id);
    
    console.log(`📋 Found ${followUps.length} follow-ups for user ${user.name}`);
    
    res.json({ success: true, followUps });
  } catch (error) {
    console.error('❌ Error fetching follow-ups:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch follow-ups' });
  }
});

// Update follow-up status
app.put('/api/follow-up/:followUpId/status', async (req, res) => {
  try {
    const { followUpId } = req.params;
    const { status } = req.body;
    
    console.log(`📝 Updating follow-up ${followUpId} status to: ${status}`);
    
    const result = await db.updateFollowUpStatus(followUpId, status);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }
    
    console.log(`✅ Updated follow-up ${followUpId} status`);
    
    res.json({ success: true, message: 'Follow-up status updated' });
  } catch (error) {
    console.error('❌ Error updating follow-up status:', error);
    res.status(500).json({ success: false, error: 'Failed to update follow-up status' });
  }
});

// Delete follow-up
app.delete('/api/follow-up/:followUpId', async (req, res) => {
  try {
    const { followUpId } = req.params;
    
    console.log(`🗑️ Deleting follow-up ${followUpId}`);
    
    const result = await db.deleteFollowUp(followUpId);
    
    if (result.changes === 0) {
      return res.status(404).json({ success: false, error: 'Follow-up not found' });
    }
    
    console.log(`✅ Deleted follow-up ${followUpId}`);
    
    res.json({ success: true, message: 'Follow-up deleted' });
  } catch (error) {
    console.error('❌ Error deleting follow-up:', error);
    res.status(500).json({ success: false, error: 'Failed to delete follow-up' });
  }
});

// WebSocket connection handling
io.on('connection', (socket) => {
    console.log('🔌 User connected:', socket.id);
    
        socket.on('join_user', (userId) => {
            socket.join(`user_${userId}`);
            console.log(`👤 User ${userId} joined their room`);
            
            // Add user to active users for WebSocket connections
            activeUsers.set(userId, {
                socketId: socket.id,
                lastSeen: new Date()
            });
            console.log(`👥 Added user ${userId} to active users (total: ${activeUsers.size})`);
        });
    
    socket.on('disconnect', () => {
        console.log('🔌 User disconnected:', socket.id);
        
        // Remove user from active users
        for (const [googleId, userData] of activeUsers) {
            if (userData.socketId === socket.id) {
                activeUsers.delete(googleId);
                console.log(`👥 Removed user ${googleId} from active users (total: ${activeUsers.size})`);
                break;
            }
        }
    });
});

// Gmail Push Notification Webhook
app.post('/webhook/gmail-push', async (req, res) => {
    try {
        console.log('📬 Received Gmail push notification');
        
        // Create a unique key for this notification to prevent duplicates
        const notificationKey = JSON.stringify(req.body);
        if (processedNotifications.has(notificationKey)) {
            console.log('⏭️  Duplicate notification, skipping...');
            return res.status(200).send('OK');
        }
        processedNotifications.add(notificationKey);
        
        // Clean up old notifications (keep only last 100)
        if (processedNotifications.size > 100) {
            const firstKey = processedNotifications.values().next().value;
            processedNotifications.delete(firstKey);
        }
        
        // Process the push notification
        const notification = await gmailPushService.processPushNotification(req.body);
        
        if (notification && notification.userEmail) {
            // Find user by email
            const user = await db.getUserByEmail(notification.userEmail);
            
            if (user) {
                console.log(`📧 Processing new emails for user: ${user.name} (${user.email})`);
                
                // Get user's stored access token from database
                try {
                    const gmailService = new GmailService();
                    
                    // Set the user's access token
                    if (user.gmail_access_token) {
                        gmailService.setAuth(user.gmail_access_token);
                        
                        // Fetch recent emails using the stored access token (only last 1 minute to minimize API calls)
                        const emails = await gmailService.fetchEmails(0.0007); // Last 1 minute
                        
                        // Save new emails to database
                        await db.saveEmails(user.id, emails);
                        
                        // Update contacts from emails
                        await db.updateContactsFromEmails(user.id, emails);
                        
                        console.log(`📬 Fetched and saved ${emails.length} emails for user: ${user.name}`);
                        
                        // Notify frontend via WebSocket
                        io.to(`user_${user.google_id}`).emit('new_emails', {
                            userId: user.google_id,
                            count: emails.length,
                            message: `New emails received! Found ${emails.length} emails.`
                        });
                        
                        console.log(`✅ Notified frontend of new emails for user: ${user.google_id}`);
                    } else {
                        console.log(`⚠️  No Gmail access token found for user: ${user.name}`);
                    }
                    
                } catch (error) {
                    console.error(`❌ Error fetching emails for user ${user.name}:`, error);
                }
            }
        }
        
        res.status(200).send('OK');
    } catch (error) {
        console.error('❌ Error processing Gmail push notification:', error);
        res.status(500).send('Error processing notification');
    }
});

// Start server
server.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
  console.log(`📁 Serving files from: ${__dirname}`);
  console.log(`🔧 Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`🔌 WebSocket server ready`);
  
  // Check if Google Client ID is configured
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_ID !== 'YOUR_GOOGLE_CLIENT_ID_HERE') {
    console.log(`✅ Google Client ID configured`);
  } else {
    console.log(`⚠️  Google Client ID not configured. Please set GOOGLE_CLIENT_ID in your .env file`);
  }
});
