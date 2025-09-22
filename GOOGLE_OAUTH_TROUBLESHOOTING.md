# Google OAuth Re-authorization Troubleshooting

## Why You're Being Asked to Authorize Again

### Common Causes:

1. **App in Testing Mode** (Most Common)
   - Your Google OAuth app is in "Testing" mode
   - Google requires re-authorization for testing apps
   - Solution: Publish your app or add users to test users list

2. **Missing OAuth Parameters**
   - Missing `prompt` parameter in OAuth flow
   - Missing proper session management
   - Solution: Use the updated code with proper parameters

3. **App Verification Status**
   - Unverified apps require more frequent re-authorization
   - Google's security policies
   - Solution: Verify your app with Google

## Quick Fixes

### 1. Add Test Users (Immediate Fix)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "OAuth consent screen"
3. Add your email to "Test users" section
4. This will prevent re-authorization for test users

### 2. Publish Your App (Permanent Fix)
1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Navigate to "OAuth consent screen"
3. Click "Publish app"
4. This will make it available to all users without re-authorization

### 3. Use Proper OAuth Parameters
The updated code now includes:
- `auto_select: false` - Prevents automatic selection
- `ux_mode: 'popup'` - Uses popup instead of redirect
- `itp_support: true` - Better cookie handling
- `context: 'signin'` - Proper context

## Google Cloud Console Settings

### OAuth Consent Screen
1. **App Status**: Should be "Published" for production
2. **Test Users**: Add your email for testing
3. **Scopes**: Only request necessary scopes
4. **App Domain**: Must match your domain

### OAuth 2.0 Client IDs
1. **Authorized JavaScript origins**: 
   - `http://localhost:8000` (development)
   - `https://yourdomain.com` (production)
2. **Authorized redirect URIs**: Not needed for popup mode

## Testing Your Fix

1. **Clear browser data**:
   - Clear cookies and localStorage
   - Or use incognito mode

2. **Test the flow**:
   - Sign in → Should work without re-authorization
   - Sign out → Should clear session properly
   - Sign in again → Should work without re-authorization

3. **Check browser console**:
   - Look for any OAuth errors
   - Check if tokens are being stored/cleared properly

## Advanced Configuration

### For Production Apps
```javascript
// Add these parameters for production
google.accounts.id.initialize({
    client_id: GOOGLE_CLIENT_ID,
    callback: handleCredentialResponse,
    auto_select: false,
    cancel_on_tap_outside: false,
    context: 'signin',
    ux_mode: 'popup',
    itp_support: true,
    // Add these for production
    hosted_domain: 'yourdomain.com', // If using Google Workspace
    prompt: 'select_account' // Force account selection
});
```

### For Better Session Management
```javascript
// Store additional session data
const userData = {
    name: responsePayload.name,
    email: responsePayload.email,
    picture: responsePayload.picture,
    sub: responsePayload.sub,
    // Add session timestamp
    loginTime: new Date().toISOString(),
    // Add token expiration if available
    expiresAt: responsePayload.exp * 1000
};

localStorage.setItem('googleUser', JSON.stringify(userData));
```

## Common Error Messages

### "This app isn't verified"
- **Cause**: App is not verified by Google
- **Solution**: Add to test users or verify the app

### "Access blocked: This app's request is invalid"
- **Cause**: Wrong client ID or domain mismatch
- **Solution**: Check client ID and authorized origins

### "Error 400: invalid_request"
- **Cause**: Missing or incorrect OAuth parameters
- **Solution**: Use the updated code with proper parameters

## Still Having Issues?

1. **Check Google Cloud Console logs**
2. **Use browser developer tools** to inspect OAuth flow
3. **Test with different browsers**
4. **Check if your domain is properly configured**
5. **Verify your client ID is correct**

## Best Practices

1. **Always use HTTPS in production**
2. **Keep your client ID secure** (use environment variables)
3. **Only request necessary scopes**
4. **Implement proper error handling**
5. **Test with multiple user accounts**
6. **Monitor OAuth usage in Google Cloud Console**
