# Gmail Push Notifications Setup Guide

## 🚀 **Real-Time Email Updates with Gmail Push**

This guide will help you set up Gmail push notifications so your app receives instant email updates, just like professional email clients.

## **Why Gmail Push Notifications?**

- ✅ **Instant Updates** - Emails appear immediately when received
- ✅ **Efficient** - No polling, saves API quota
- ✅ **Real-time** - Same system used by Outlook, Thunderbird, etc.
- ✅ **Reliable** - Google's official push notification system

## **Setup Requirements**

### 1. **Google Cloud Project Setup**

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select existing one
3. Enable the following APIs:
   - Gmail API
   - Google Cloud Pub/Sub API

### 2. **Environment Variables**

Add these to your `.env` file:

```env
# Your Google Cloud Project ID
GOOGLE_CLOUD_PROJECT_ID=your-project-id-here

# Your webhook URL (for production)
WEBHOOK_BASE_URL=https://your-domain.com

# For local development
WEBHOOK_BASE_URL=https://your-ngrok-url.ngrok.io
```

### 3. **Service Account Setup**

1. Go to **IAM & Admin** > **Service Accounts**
2. Create a new service account
3. Download the JSON key file
4. Set environment variable:
   ```bash
   export GOOGLE_APPLICATION_CREDENTIALS="path/to/service-account-key.json"
   ```

### 4. **Pub/Sub Topic Setup**

The app will automatically create:
- **Topic**: `gmail-push-notifications`
- **Subscription**: `gmail-push-subscription`
- **Webhook**: `/webhook/gmail-push`

### 5. **Local Development with ngrok**

For local development, you need to expose your local server:

```bash
# Install ngrok
npm install -g ngrok

# Expose your local server
ngrok http 8000

# Use the ngrok URL in your .env
WEBHOOK_BASE_URL=https://abc123.ngrok.io
```

## **How It Works**

### **Traditional Polling (Old Way)**
```
App → Check Gmail API every 30s → New emails?
```

### **Gmail Push (New Way)**
```
Gmail → Push notification → Your app → Instant update
```

## **Flow Diagram**

```
1. User connects Gmail
   ↓
2. App sets up Gmail push subscription
   ↓
3. Gmail sends push notifications to your webhook
   ↓
4. App processes notification instantly
   ↓
5. Frontend updates in real-time
```

## **Testing**

1. **Start your server**:
   ```bash
   npm start
   ```

2. **Connect Gmail** in your app

3. **Send yourself a test email**

4. **Check server logs** for push notifications:
   ```
   📬 Received Gmail push notification
   📧 Processing new emails for user: John Doe
   ✅ Notified frontend of new emails
   ```

## **Production Deployment**

### **Webhook URL Requirements**
- Must be HTTPS
- Must be publicly accessible
- Must respond with 200 OK

### **Example Production Setup**
```env
WEBHOOK_BASE_URL=https://your-app.herokuapp.com
GOOGLE_CLOUD_PROJECT_ID=your-production-project
```

## **Troubleshooting**

### **Common Issues**

1. **"Topic not found"**
   - Check `GOOGLE_CLOUD_PROJECT_ID` is correct
   - Ensure Pub/Sub API is enabled

2. **"Webhook not receiving notifications"**
   - Check `WEBHOOK_BASE_URL` is accessible
   - Verify HTTPS is working
   - Check firewall settings

3. **"Permission denied"**
   - Verify service account has proper permissions
   - Check `GOOGLE_APPLICATION_CREDENTIALS` path

### **Debug Commands**

```bash
# Check if Pub/Sub is working
gcloud pubsub topics list

# Check subscriptions
gcloud pubsub subscriptions list

# Test webhook manually
curl -X POST https://your-domain.com/webhook/gmail-push \
  -H "Content-Type: application/json" \
  -d '{"test": "data"}'
```

## **Benefits**

- 🚀 **10x faster** than polling
- 💰 **Saves API quota** (no constant requests)
- ⚡ **Instant updates** (real-time)
- 🔒 **More secure** (Google's infrastructure)
- 📱 **Mobile-friendly** (works offline)

## **Next Steps**

1. Set up Google Cloud Project
2. Configure environment variables
3. Test with ngrok locally
4. Deploy to production
5. Enjoy real-time email updates! 🎉

---

**Need help?** Check the server logs for detailed error messages and debugging information.
