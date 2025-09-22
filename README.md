# Google Login Demo

A simple and elegant Google OAuth login implementation with persistent authentication that keeps users logged in even after page refresh.

## Features

- ✅ Google OAuth 2.0 integration
- ✅ Persistent login state using localStorage
- ✅ Modern, responsive UI design
- ✅ Automatic login check on page load
- ✅ Secure logout functionality
- ✅ Mobile-friendly design
- ✅ Environment variable configuration
- ✅ Secure credential management

## Setup Instructions

### 1. Get Google OAuth Credentials

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API (or Google Identity API)
4. Go to "Credentials" in the left sidebar
5. Click "Create Credentials" → "OAuth 2.0 Client IDs"
6. Choose "Web application" as the application type
7. Add your domain to "Authorized JavaScript origins":
   - For local development: `http://localhost:8000`
   - For production: your actual domain
8. Copy the Client ID

### 2. Configure Environment Variables

1. **Copy the environment template:**
   ```bash
   cp .env.example .env
   ```

2. **Edit the `.env` file:**
   ```bash
   nano .env
   # or use your preferred editor
   ```

3. **Replace the placeholder with your actual Google Client ID:**
   ```env
   GOOGLE_CLIENT_ID=your_actual_google_client_id_here
   ```

4. **Optional: Customize other settings:**
   ```env
   APP_NAME=Your App Name
   APP_VERSION=1.0.0
   PORT=8000
   NODE_ENV=development
   ```

### 3. Install Dependencies

```bash
npm install
```

### 4. Run the Application

#### Option 1: Using Node.js with Environment Variables (Recommended)
```bash
# Start the server with environment variable support
npm start
# or
npm run dev
```

#### Option 2: Using Python (Fallback)
```bash
# Start a simple HTTP server (without environment variable support)
npm run python
# or directly
python3 -m http.server 8000
```

#### Option 3: Using Other Servers
```bash
# Using http-server (without environment variable support)
npm install -g http-server
http-server -p 8000

# Using PHP
php -S localhost:8000
```

### 4. Access the Application

Open your browser and go to: `http://localhost:8000`

## Environment Variables

The application uses environment variables for secure configuration management:

### Required Variables
- `GOOGLE_CLIENT_ID` - Your Google OAuth Client ID from Google Cloud Console

### Optional Variables
- `APP_NAME` - Application name (default: "Google Login Demo")
- `APP_VERSION` - Application version (default: "1.0.0")
- `NODE_ENV` - Environment mode (default: "development")
- `PORT` - Server port (default: 8000)

### Security Notes
- ✅ Never commit `.env` files to version control
- ✅ The `.env` file is already added to `.gitignore`
- ✅ Use `.env.example` as a template for other developers
- ✅ Environment variables are loaded server-side and injected into the client

## How It Works

### Authentication Flow

1. **Initial Load**: The app checks localStorage for existing user data
2. **Login**: User clicks Google sign-in button → Google OAuth popup → User grants permission
3. **Token Processing**: JWT token is decoded to extract user information
4. **Persistence**: User data is stored in localStorage
5. **UI Update**: Login form is hidden, user profile is shown

### Persistent Login

The app uses `localStorage` to maintain login state:
- User data is stored when login is successful
- On page refresh, the app checks localStorage first
- If user data exists, the user is automatically logged in
- Logout clears the localStorage data

### Security Features

- JWT token validation
- Secure logout that clears all stored data
- Google's built-in security measures
- No sensitive data stored in plain text

## File Structure

```
networking/
├── index.html          # Main HTML file
├── script.js           # JavaScript logic
├── styles.css          # CSS styling
├── package.json        # Project configuration
└── README.md          # This file
```

## Customization

### Styling
Edit `styles.css` to customize the appearance:
- Colors and gradients
- Fonts and typography
- Layout and spacing
- Animations and transitions

### Functionality
Modify `script.js` to add features:
- Additional user data fields
- Custom login/logout behavior
- Integration with backend APIs
- Error handling improvements

## Browser Support

- Chrome 60+
- Firefox 55+
- Safari 12+
- Edge 79+

## Troubleshooting

### Common Issues

1. **"Invalid client ID" error**
   - Make sure you've replaced `YOUR_GOOGLE_CLIENT_ID` with your actual client ID
   - Verify the client ID is correct in Google Cloud Console

2. **"This app isn't verified" warning**
   - This is normal for development. Click "Advanced" → "Go to [app name] (unsafe)"
   - For production, you'll need to verify your app with Google

3. **CORS errors**
   - Make sure you're running the app on a local server (not opening the HTML file directly)
   - Add your domain to authorized origins in Google Cloud Console

4. **Login not persisting**
   - Check browser console for errors
   - Ensure localStorage is enabled in your browser
   - Verify the JWT token is being decoded correctly

### Debug Mode

To enable debug logging, add this to `script.js`:
```javascript
// Add at the top of the file
const DEBUG = true;

// Add logging throughout the code
if (DEBUG) console.log('Debug info:', data);
```

## Production Deployment

1. **Update authorized origins** in Google Cloud Console with your production domain
2. **Use HTTPS** - Google OAuth requires HTTPS in production
3. **Test thoroughly** on different devices and browsers
4. **Consider implementing** server-side token validation for enhanced security

## License

MIT License - feel free to use this code in your projects!
