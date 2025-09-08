# Google OAuth Setup Instructions

The application is currently running in **development mode** with mock Google authentication. To enable real Google OAuth, follow these steps:

## 🚨 Current Status
- ⚠️ **Development Mode Active**: Using mock authentication
- 🔧 **Action Required**: Set up real Google OAuth credentials

## Step 1: Create Google Cloud Project

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the **Google+ API** (or Google Identity API)

## Step 2: Create OAuth 2.0 Credentials

1. Navigate to **APIs & Services** > **Credentials**
2. Click **+ CREATE CREDENTIALS** > **OAuth client ID**
3. Select **Web application** as the application type
4. Configure the OAuth consent screen if prompted:
   - Add your app name: "Infographic Animator"
   - Add your email as a developer contact
   - Set user type to "External" for testing

## Step 3: Configure Authorized Origins

Add these authorized JavaScript origins:
- `http://localhost:8080` (for local development)
- `https://your-production-domain.com` (for production)

Add these authorized redirect URIs:
- `http://localhost:8080` (for local development)
- `https://your-production-domain.com` (for production)

## Step 4: Get Your Client ID

1. After creating the OAuth client, copy the **Client ID**
2. It will look like: `123456789-abcdefghijklmnopqrstuvwxyz123456.apps.googleusercontent.com`

## Step 5: Update Environment Variables

### Option A: Using Environment Variables (Recommended)
Update your environment variables with the real Client ID:

```bash
# Backend environment variable
GOOGLE_CLIENT_ID=your-real-client-id-here.apps.googleusercontent.com

# Frontend environment variable  
VITE_GOOGLE_CLIENT_ID=your-real-client-id-here.apps.googleusercontent.com
```

### Option B: Using the DevServerControl Tool
In the Builder.io interface, use the DevServerControl tool to set:
- `GOOGLE_CLIENT_ID`: Your Google Client ID
- `VITE_GOOGLE_CLIENT_ID`: Same Google Client ID

## Step 6: Restart the Development Server

After updating the environment variables, restart the development server for changes to take effect.

## ✅ Verification

Once configured correctly:
- The warning "⚠️ Development mode: No real Google Client ID configured" will disappear
- The Google login button will use the official Google Sign-In interface
- Users will see the real Google OAuth popup/redirect flow
- Authentication will be handled by Google's servers

## 🔧 Troubleshooting

### Common Issues:

1. **"The given client ID is not found"**
   - Verify your Client ID is correct
   - Make sure the Google+ API is enabled
   - Check that your domain is in authorized origins

2. **"redirect_uri_mismatch"**
   - Add your current domain to authorized redirect URIs
   - Ensure HTTP/HTTPS matches exactly

3. **OAuth consent screen required**
   - Configure the OAuth consent screen in Google Cloud Console
   - Add your email as a test user during development

### Development vs Production

- **Development**: Uses `http://localhost:8080`
- **Production**: Use your actual domain with HTTPS

## 📚 Additional Resources

- [Google Identity Documentation](https://developers.google.com/identity/gsi/web/guides/overview)
- [OAuth 2.0 Setup Guide](https://developers.google.com/identity/protocols/oauth2)
- [Google Cloud Console](https://console.cloud.google.com/)

---

**Note**: The current development mode allows you to test the authentication flow without setting up Google OAuth. It creates mock users for testing purposes.
