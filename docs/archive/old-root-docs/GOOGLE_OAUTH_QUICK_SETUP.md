# 🔐 Quick Google OAuth Setup

Follow these steps to enable Google Sign-In:

## 📋 Step-by-Step Guide

### 1️⃣ Get Google Client ID (5 minutes)

1. Open: https://console.cloud.google.com/
2. Click "Select a project" → "New Project"
3. Name: "Lokifi" → Click "Create"
4. Wait for project creation (30 seconds)
5. Go to: "APIs & Services" → "Credentials"
6. Click "Configure Consent Screen"
   - User Type: External → Click "Create"
   - App name: Lokifi
   - User support email: Your email
   - Developer contact: Your email
   - Click "Save and Continue" (skip optional fields)
7. Click "Credentials" tab
8. Click "+ CREATE CREDENTIALS" → "OAuth 2.0 Client ID"
9. Application type: "Web application"
10. Name: "Lokifi Web Client"
11. Authorized JavaScript origins:
    - Click "+ ADD URI"
    - Enter: `http://localhost:3000`
    - Click "+ ADD URI"
    - Enter: `http://127.0.0.1:3000`
12. Authorized redirect URIs:
    - Click "+ ADD URI"
    - Enter: `http://localhost:3000`
13. Click "CREATE"
14. **COPY the Client ID** (looks like: `123456789-abc123.apps.googleusercontent.com`)

### 2️⃣ Configure Frontend

1. Open: `C:\Users\USER\Desktop\lokifi\frontend\.env.local`
2. Replace this line:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_GOOGLE_CLIENT_ID.apps.googleusercontent.com
   ```
   With your actual Client ID:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=123456789-abc123.apps.googleusercontent.com
   ```
3. Save the file

### 3️⃣ Restart Frontend

```powershell
# Stop current frontend
Get-Process | Where-Object {$_.ProcessName -eq "node"} | Stop-Process -Force

# Start with new config
cd C:\Users\USER\Desktop\lokifi\frontend
npm run dev
```

### 4️⃣ Test Google Sign-In

1. Open: http://localhost:3000/portfolio
2. Click "Login / Sign Up"
3. Click the **Google Sign In** button
4. Select your Google account
5. Click "Continue"
6. ✅ You're logged in!

## 🎯 Quick Test (Without Google Setup)

You can still test with email/password:
- Email: `hello@lokifi.com`
- Password: `?Apollwng113?`

## 📸 What You'll See

### Before Setup:
- Google button shows but may show error on click

### After Setup:
- Google button opens popup
- Shows your Google accounts
- One click → logged in!

## ⚡ Benefits of Google Sign-In

✅ No password to remember  
✅ Secure (uses Google's authentication)  
✅ Fast (one click)  
✅ Trusted (familiar Google UI)  
✅ Auto-profile (gets name and email from Google)  

## 🐛 Common Issues

### "Popup blocked"
**Fix**: Allow popups for localhost in browser settings

### "Redirect URI mismatch"
**Fix**: Make sure you added `http://localhost:3000` exactly (no trailing slash)

### "Invalid Client ID"
**Fix**: 
1. Check `.env.local` has correct Client ID
2. Restart frontend server
3. Clear browser cache

### "Backend error"
**Fix**: Ensure backend is running on port 8000

## 🚀 Production Deployment

When deploying to production:

1. Add production URLs to Google Console:
   - JavaScript origins: `https://yourdomain.com`
   - Redirect URIs: `https://yourdomain.com`

2. Update `.env.production`:
   ```
   NEXT_PUBLIC_GOOGLE_CLIENT_ID=YOUR_CLIENT_ID.apps.googleusercontent.com
   NEXT_PUBLIC_API_URL=https://api.yourdomain.com
   ```

3. Enable secure cookies in backend (set `secure=True`)

## 📞 Need Help?

Check `GOOGLE_OAUTH_IMPLEMENTATION.md` for detailed documentation.

---

**Total setup time**: ~5-7 minutes  
**Difficulty**: Easy  
**Result**: Professional Google Sign-In button! 🎉
