# Firebase Domain Setup Guide

## Adding Your Custom Domain to Firebase

### Option 1: Firebase Authentication (OAuth Redirects)

1. **Add Authorized Domain in Firebase Console:**
   - Go to [Firebase Console](https://console.firebase.google.com)
   - Select your project
   - Navigate to **Authentication** > **Settings** > **Authorized domains**
   - Click **Add domain**
   - Enter your custom domain (e.g., `yourdomain.com`)
   - Click **Add**

2. **Update Environment Variables:**
   Update your `.env.local` file:
   ```env
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourdomain.com
   ```

### Option 2: Firebase Hosting (Full Site Hosting)

1. **Install Firebase CLI (if not already installed):**
   ```bash
   npm install -g firebase-tools
   ```

2. **Login to Firebase:**
   ```bash
   firebase login
   ```

3. **Initialize Firebase Hosting:**
   ```bash
   firebase init hosting
   ```
   
   Select:
   - Use an existing project (select your Firebase project)
   - Public directory: `out` (for Next.js static export) OR `.next` (for SSR)
   - Configure as single-page app: No
   - Set up automatic builds: Yes (optional)

4. **Build Your Next.js App:**
   For static export (recommended for Firebase Hosting):
   ```bash
   npm run build
   npm run export  # If you add export script
   ```
   
   OR update `next.config.mjs` for Firebase Hosting:
   ```javascript
   const nextConfig = {
     output: 'export', // For static export
     // OR keep SSR and use Firebase Functions
   }
   ```

5. **Add Custom Domain in Firebase Console:**
   - Go to **Hosting** in Firebase Console
   - Click **Add custom domain**
   - Enter your domain (e.g., `yourdomain.com` or `www.yourdomain.com`)
   - Click **Continue**

6. **Verify Domain Ownership:**
   - Firebase will provide DNS records to add
   - Add these records to your domain's DNS settings:
     - **TXT record** for verification
     - **A records** or **CNAME** for hosting

7. **Update DNS Records:**
   In your domain registrar's DNS settings, add:
   ```
   Type: A
   Name: @
   Value: (IP addresses provided by Firebase)
   
   Type: CNAME
   Name: www
   Value: your-project.web.app
   ```

8. **Deploy to Firebase Hosting:**
   ```bash
   firebase deploy --only hosting
   ```

### Option 3: Using with Vercel/Other Hosting

If you're deploying to Vercel but want Firebase Auth to work with your domain:

1. **Add Domain to Authorized Domains** (as in Option 1)

2. **Update AUTH_DOMAIN:**
   ```env
   NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=yourdomain.com
   ```

3. **Configure OAuth Redirect URIs:**
   - Go to **Authentication** > **Sign-in method** > **Google**
   - Add authorized redirect URIs:
     - `https://yourdomain.com`
     - `https://yourdomain.com/auth/callback` (if needed)

### Important Notes:

- **DNS Propagation:** DNS changes can take 24-48 hours to propagate
- **SSL Certificate:** Firebase automatically provides SSL certificates
- **Subdomains:** You can add both `yourdomain.com` and `www.yourdomain.com`
- **Testing:** Use Firebase's default domain first (`your-project.web.app`) to test before switching DNS

### Quick Checklist:

- [ ] Added domain to Firebase Console > Authentication > Authorized domains
- [ ] Updated `NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN` in `.env.local`
- [ ] Added DNS records (if using Firebase Hosting)
- [ ] Verified domain ownership
- [ ] Tested OAuth login with custom domain
- [ ] Deployed application

### Troubleshooting:

- **OAuth not working:** Make sure domain is in Authorized domains list
- **DNS not resolving:** Wait 24-48 hours or check DNS settings
- **SSL certificate issues:** Firebase usually handles this automatically, wait a few minutes
