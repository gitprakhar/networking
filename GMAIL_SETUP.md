# Gmail Integration Setup Guide

## Overview
Your Google Login app now includes Gmail integration that fetches and stores the last 7 days of emails. Users can sync their emails and view them even when offline.

## Features Added
- ✅ **Gmail API Integration** - Fetches emails from Gmail
- ✅ **Database Storage** - SQLite database stores emails locally
- ✅ **Email Display** - Beautiful UI showing email list
- ✅ **Sync Button** - Manual refresh of emails
- ✅ **Persistent Storage** - Emails saved between sessions
- ✅ **Last 7 Days** - Only shows recent emails

## Setup Requirements

### 1. Google Cloud Console Configuration

#### Enable Gmail API
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Select your project
3. Go to "APIs & Services" → "Library"
4. Search for "Gmail API"
5. Click on it and press "Enable"

#### Update OAuth Consent Screen
1. Go to "APIs & Services" → "OAuth consent screen"
2. Add the Gmail scope: `https://www.googleapis.com/auth/gmail.readonly`
3. Update the app description to mention Gmail access
4. Add test users if in testing mode

#### Get Client Secret
1. Go to "APIs & Services" → "Credentials"
2. Click on your OAuth 2.0 Client ID
3. Copy the "Client secret"
4. Update your `.env` file:
   ```env
   GOOGLE_CLIENT_SECRET=your_actual_client_secret_here
   ```

### 2. Environment Variables
Update your `.env` file with the client secret:
```env
# Google OAuth Configuration
GOOGLE_CLIENT_ID=your_google_client_id_here
GOOGLE_CLIENT_SECRET=your_google_client_secret_here

# Application Configuration
APP_NAME=Networking App
APP_VERSION=1.0.0
APP_DESCRIPTION=A simple Google OAuth login implementation

# Development Settings
NODE_ENV=development
PORT=8000
```

## How It Works

### 1. User Authentication
- User signs in with Google (existing functionality)
- User data is saved to database
- Gmail OAuth is initialized

### 2. Email Syncing
- User clicks "Sync Emails" button
- Gmail OAuth popup requests Gmail access
- App fetches last 7 days of emails from Gmail API
- Emails are stored in SQLite database

### 3. Email Display
- Emails are loaded from database on page load
- Beautiful UI shows email list with:
  - Sender name and email
  - Subject line
  - Email snippet
  - Date sent
  - Read/unread status
  - Gmail labels

### 4. Persistence
- Emails are stored locally in SQLite database
- No need to re-sync unless user clicks "Sync Emails"
- Works offline after initial sync

## Database Schema

### Users Table
- `id` - Primary key
- `google_id` - Google user ID
- `email` - User's email address
- `name` - User's display name
- `picture` - Profile picture URL
- `created_at` - Account creation time
- `updated_at` - Last update time

### Emails Table
- `id` - Primary key
- `user_id` - Foreign key to users table
- `gmail_id` - Gmail message ID
- `thread_id` - Gmail thread ID
- `subject` - Email subject
- `sender` - Sender name
- `sender_email` - Sender email address
- `recipient` - Recipient name
- `recipient_email` - Recipient email address
- `date_sent` - When email was sent
- `snippet` - Email preview text
- `body` - Full email body
- `labels` - Gmail labels (JSON array)
- `is_read` - Read status
- `created_at` - When stored in database

## API Endpoints

### POST /api/save-user
Saves user information to database
```json
{
  "google_id": "user_google_id",
  "email": "user@example.com",
  "name": "User Name",
  "picture": "profile_picture_url"
}
```

### POST /api/sync-emails
Fetches and stores emails from Gmail
```json
{
  "google_id": "user_google_id",
  "access_token": "gmail_access_token"
}
```

### GET /api/emails/:google_id
Retrieves stored emails for a user
Returns: `{ "success": true, "emails": [...] }`

### DELETE /api/emails/:google_id
Deletes all emails for a user
Returns: `{ "success": true, "deletedCount": number }`

## Testing the Integration

### 1. Start the Server
```bash
npm start
```

### 2. Test the Flow
1. Open `http://localhost:8000`
2. Sign in with Google
3. Click "Sync Emails" button
4. Grant Gmail access when prompted
5. View your emails in the interface

### 3. Test Persistence
1. Refresh the page
2. Emails should still be visible (loaded from database)
3. Click "Sync Emails" to refresh with latest emails

## Troubleshooting

### Common Issues

#### "Gmail API not enabled"
- Enable Gmail API in Google Cloud Console
- Wait a few minutes for changes to propagate

#### "Invalid client secret"
- Check your `.env` file has the correct client secret
- Restart the server after updating `.env`

#### "Access denied" when syncing
- Check OAuth consent screen has Gmail scope
- Add your email to test users if in testing mode
- Clear browser data and try again

#### "No emails found"
- Check if you have emails in the last 7 days
- Verify Gmail API is working by checking browser console
- Try syncing again

#### Database errors
- Check if `emails.db` file is created
- Ensure write permissions in the project directory
- Check server logs for specific error messages

### Debug Mode
Enable debug logging by adding to your `.env`:
```env
DEBUG=true
NODE_ENV=development
```

## Security Considerations

### Data Privacy
- Emails are stored locally in SQLite database
- No emails are sent to external servers
- Gmail access is read-only
- Users can delete their data by signing out

### OAuth Scopes
- Only requests `gmail.readonly` scope
- No write access to Gmail
- No access to other Google services

### Database Security
- SQLite database is local to the application
- No external database connections
- Data is not transmitted over the network

## Production Deployment

### Environment Variables
Set these in your production environment:
```env
GOOGLE_CLIENT_ID=your_production_client_id
GOOGLE_CLIENT_SECRET=your_production_client_secret
NODE_ENV=production
PORT=8000
```

### Database
- SQLite database will be created automatically
- Consider backing up the database regularly
- Monitor database size for large email volumes

### Gmail API Quotas
- Gmail API has daily quotas
- Monitor usage in Google Cloud Console
- Consider implementing rate limiting for production

## Next Steps

### Potential Enhancements
1. **Email Search** - Add search functionality
2. **Email Filtering** - Filter by sender, date, labels
3. **Email Export** - Export emails to different formats
4. **Real-time Sync** - WebSocket-based real-time updates
5. **Email Analytics** - Statistics and insights
6. **Multiple Accounts** - Support for multiple Gmail accounts

### Performance Optimizations
1. **Pagination** - Load emails in batches
2. **Caching** - Implement Redis caching
3. **Background Sync** - Sync emails in background
4. **Database Indexing** - Optimize database queries

## Support

If you encounter issues:
1. Check the browser console for errors
2. Check server logs for detailed error messages
3. Verify all environment variables are set correctly
4. Ensure Gmail API is properly configured
5. Test with a fresh browser session
