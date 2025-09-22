# Networking Hub

A powerful networking application that helps you manage professional relationships through intelligent email analysis and automated follow-up tracking. Built with modern web technologies and real-time email monitoring.

## 🚀 Features

### Core Networking Features
- 📧 **Gmail Integration** - Connect your Gmail account for seamless email access
- 👥 **Contact Management** - Automatically extract and organize your networking contacts
- 📬 **Real-Time Email Monitoring** - Get instant notifications when new emails arrive
- 🤖 **AI-Powered Analysis** - Identify networking opportunities using OpenAI
- 📋 **Follow-Up Tracking** - Never miss important networking follow-ups
- 🔄 **Automatic Sync** - No manual syncing required - emails update automatically

### Technical Features
- ✅ **Google OAuth 2.0** - Secure authentication with persistent login
- ✅ **Real-Time Updates** - WebSocket-powered instant notifications
- ✅ **SQLite Database** - Local data storage with automatic migrations
- ✅ **Modern UI** - Clean, responsive design with Plus Jakarta Sans typography
- ✅ **Smart Monitoring** - Efficient email checking every 2 minutes
- ✅ **Contact Intelligence** - Automatic contact extraction and organization

## 🎯 How It Works

1. **Sign In** - Connect your Google account with Gmail access
2. **Auto-Sync** - Your emails are automatically synced and monitored
3. **Smart Analysis** - AI identifies networking conversations and opportunities
4. **Follow-Up Tracking** - Never miss important networking follow-ups
5. **Real-Time Updates** - Get instant notifications for new emails

## 🛠️ Setup Instructions

### 1. Prerequisites
- Node.js (v14 or higher)
- Google Cloud Console account
- OpenAI API key (optional, for AI analysis)

### 2. Get Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Gmail API and Google Identity API
4. Go to "Credentials" → "Create Credentials" → "OAuth 2.0 Client IDs"
5. Choose "Web application"
6. Add authorized origins:
   - `http://localhost:8000` (for development)
   - `http://localhost:8000/oauth/callback` (for OAuth callback)
7. Copy your Client ID and Client Secret

### 3. Configure Environment Variables

Create a `.env` file in the project root:

```env
# Required
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Optional - for AI analysis
OPENAI_API_KEY=your_openai_api_key_here

# Optional - app configuration
APP_NAME=Networking Hub
APP_VERSION=1.0.0
PORT=8000
NODE_ENV=development
```

### 4. Install Dependencies

```bash
npm install
```

### 5. Run the Application

```bash
npm start
```

The server will start on `http://localhost:8000`

## 📱 Usage

### Getting Started
1. **Open the app** at `http://localhost:8000`
2. **Sign in** with your Google account
3. **Grant Gmail access** when prompted
4. **Sync your emails** - this starts real-time monitoring
5. **Explore your contacts** and networking opportunities

### Key Features

#### 📧 Email Management
- View all your emails in a clean, organized interface
- Automatic categorization of sent vs received emails
- Real-time updates when new emails arrive

#### 👥 Contact Management
- Automatically extracted from your email conversations
- View conversation history with each contact
- Track networking relationships

#### 📋 Follow-Up Tracking
- AI-powered identification of networking opportunities
- Automated follow-up suggestions
- Track follow-up status and progress

#### 🔄 Real-Time Monitoring
- Automatic email checking every 2 minutes
- Instant notifications for new emails
- No manual syncing required

## 🏗️ Architecture

### Backend
- **Node.js + Express** - Server framework
- **SQLite** - Local database with automatic migrations
- **Socket.IO** - Real-time WebSocket communication
- **Gmail API** - Email fetching and monitoring
- **OpenAI API** - AI-powered conversation analysis

### Frontend
- **Vanilla JavaScript** - No framework dependencies
- **WebSocket Client** - Real-time updates
- **Google OAuth** - Secure authentication
- **Responsive CSS** - Modern, mobile-friendly design

### Database Schema
- **Users** - User profiles and authentication
- **Emails** - Email storage with metadata
- **Contacts** - Extracted contact information
- **Follow-ups** - Networking opportunity tracking

## 🔧 Configuration

### Google OAuth Setup
1. Enable Gmail API in Google Cloud Console
2. Add authorized redirect URIs:
   - `http://localhost:8000/oauth/callback`
3. Configure OAuth consent screen
4. Add your domain to authorized origins

### OpenAI Integration (Optional)
- Get API key from [OpenAI Platform](https://platform.openai.com/)
- Add to `.env` file as `OPENAI_API_KEY`
- Enables AI-powered networking analysis

## 📊 Real-Time Features

### Email Monitoring
- **Smart Checking** - Only fetches emails since last sync
- **Efficient Updates** - Minimal API calls, maximum performance
- **Instant Notifications** - WebSocket-powered real-time updates
- **Auto-Save** - New emails automatically saved to database

### WebSocket Communication
- **User Rooms** - Targeted updates for each user
- **Live Notifications** - Instant email count updates
- **Auto-Refresh** - Current view updates automatically
- **Connection Management** - Automatic reconnection handling

## 🎨 UI/UX Features

### Modern Design
- **Plus Jakarta Sans** - Professional typography
- **Clean Interface** - Minimal, focused design
- **Responsive Layout** - Works on all devices
- **Intuitive Navigation** - Easy-to-use interface

### User Experience
- **Persistent Login** - Stay logged in across sessions
- **Smart Notifications** - Non-intrusive email alerts
- **Quick Access** - Fast navigation between features
- **Visual Feedback** - Clear status indicators

## 🔒 Security

### Data Protection
- **Local Storage** - All data stored locally in SQLite
- **OAuth Security** - Google's secure authentication
- **Token Management** - Secure access token handling
- **User Isolation** - Data separation between users

### Privacy
- **No Data Sharing** - Your emails stay on your device
- **Secure API Calls** - Encrypted communication
- **Token Expiration** - Automatic token refresh
- **User Control** - Full control over your data

## 🚀 Deployment

### Development
```bash
npm start
# Server runs on http://localhost:8000
```

### Production
1. **Update Google OAuth** - Add production domain to authorized origins
2. **Use HTTPS** - Required for Google OAuth in production
3. **Environment Variables** - Set production values
4. **Database** - Ensure SQLite file is accessible
5. **WebSocket** - Configure for production environment

## 🐛 Troubleshooting

### Common Issues

1. **"Gmail access not granted"**
   - Ensure Gmail API is enabled in Google Cloud Console
   - Check OAuth redirect URI configuration
   - Verify client ID and secret are correct

2. **"Real-time monitoring not working"**
   - Check WebSocket connection in browser console
   - Ensure server is running with Socket.IO
   - Verify user is properly authenticated

3. **"No emails syncing"**
   - Check Gmail API quota limits
   - Verify access token is valid
   - Check server logs for error messages

4. **"AI analysis not working"**
   - Verify OpenAI API key is set
   - Check API key has sufficient credits
   - Review OpenAI API usage limits

### Debug Mode
Enable detailed logging by checking browser console and server logs.

## 📈 Performance

### Optimization Features
- **Smart Email Fetching** - Only new emails are fetched
- **Efficient Database Queries** - Optimized SQL queries
- **WebSocket Efficiency** - Minimal data transfer
- **Caching** - Local data caching for speed

### Monitoring
- **Real-Time Logs** - Server-side activity tracking
- **User Activity** - WebSocket connection monitoring
- **API Usage** - Gmail API call tracking
- **Error Handling** - Comprehensive error management

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch
3. Make your changes
4. Test thoroughly
5. Submit a pull request

## 📄 License

MIT License - feel free to use this code in your projects!

## 🙏 Acknowledgments

- **Google** - For Gmail API and OAuth services
- **OpenAI** - For AI-powered conversation analysis
- **Socket.IO** - For real-time WebSocket communication
- **SQLite** - For reliable local data storage

---

**Networking Hub** - Transform your email into a powerful networking tool! 🚀