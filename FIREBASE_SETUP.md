# Firebase Setup Instructions

Follow these steps to set up Firebase for your Slack Clone application.

## Part 1: Create Firebase Project

1. Go to [Firebase Console](https://console.firebase.google.com/)
2. Click **"Add project"** or **"Create a project"**
3. Enter your project name (e.g., "slack-clone")
4. **Disable** Google Analytics (optional for this project)
5. Click **"Create project"**

---

## Part 2: Set Up Web App

1. In your Firebase project dashboard, click the **web icon** `</>` to add a web app
2. Register your app:
   - App nickname: `slack-clone-web` (or any name you prefer)
   - **Check** "Also set up Firebase Hosting" (optional but recommended)
   - Click **"Register app"**
3. You'll see your Firebase configuration object. **Keep this window open** - you'll need these values in the next step.

---

## Part 3: Configure Environment Variables

1. Open the `.env` file in your project root (`/Users/quintonnistico/Documents/Code/slack-clone/.env`)
2. Replace the placeholder values with your Firebase config values:

```env
VITE_FIREBASE_API_KEY=your_actual_api_key_here
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.appspot.com
VITE_FIREBASE_MESSAGING_SENDER_ID=your_actual_sender_id
VITE_FIREBASE_APP_ID=your_actual_app_id
VITE_FIREBASE_DATABASE_URL=https://your-project-id-default-rtdb.firebaseio.com
```

**Where to find these values:**
- They're displayed in the Firebase console after registering your web app
- Or go to: Project Settings (gear icon) > General > Your apps > SDK setup and configuration

---

## Part 4: Enable Authentication

1. In Firebase Console, go to **"Authentication"** in the left sidebar
2. Click **"Get started"**
3. Go to **"Sign-in method"** tab
4. Enable these sign-in providers:

### Email/Password:
- Click **"Email/Password"**
- Toggle **"Enable"** to ON
- Click **"Save"**

### Google:
- Click **"Google"**
- Toggle **"Enable"** to ON
- Select a **Project support email** from the dropdown
- Click **"Save"**

---

## Part 5: Set Up Cloud Firestore

1. In Firebase Console, go to **"Firestore Database"** in the left sidebar
2. Click **"Create database"**
3. Choose **"Start in production mode"** (we'll set up rules next)
4. Select your **Cloud Firestore location** (choose one close to your users)
   - Example: `us-east1` (for USA East Coast)
5. Click **"Enable"**

### Set Up Firestore Security Rules:

1. Go to the **"Rules"** tab in Firestore Database
2. Replace the default rules with these:

```javascript
rules_version = '2';

service cloud.firestore {
  match /databases/{database}/documents {
    // Users collection - users can read all, but only write their own
    match /users/{userId} {
      allow read: if request.auth != null;
      allow write: if request.auth != null && request.auth.uid == userId;
    }

    // Workspaces - authenticated users can read/write
    match /workspaces/{workspaceId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null &&
        (resource.data.ownerId == request.auth.uid ||
         request.auth.uid in resource.data.members);
    }

    // Channels - authenticated users can read/write
    match /channels/{channelId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update, delete: if request.auth != null;
    }

    // Messages - authenticated users can read/write
    match /messages/{messageId} {
      allow read: if request.auth != null;
      allow create: if request.auth != null;
      allow update: if request.auth != null && resource.data.userId == request.auth.uid;
      allow delete: if request.auth != null && resource.data.userId == request.auth.uid;
    }
  }
}
```

3. Click **"Publish"**

---

## Part 6: Set Up Realtime Database (for Presence & Typing)

1. In Firebase Console, go to **"Realtime Database"** in the left sidebar
2. Click **"Create Database"**
3. Choose your **Realtime Database location** (ideally same as Firestore)
4. Start in **"locked mode"** (we'll set up rules next)
5. Click **"Enable"**

### Set Up Realtime Database Security Rules:

1. Go to the **"Rules"** tab in Realtime Database
2. Replace the default rules with these:

```json
{
  "rules": {
    "status": {
      "$userId": {
        ".read": true,
        ".write": "$userId === auth.uid"
      }
    },
    "typing": {
      "$channelId": {
        ".read": true,
        "$userId": {
          ".write": "$userId === auth.uid"
        }
      }
    }
  }
}
```

3. Click **"Publish"**

**IMPORTANT:** Copy the Realtime Database URL from the top of the page (looks like `https://your-project-default-rtdb.firebaseio.com`) and add it to your `.env` file as `VITE_FIREBASE_DATABASE_URL`.

---

## Part 7: Set Up Firebase Storage (for File Uploads - Optional for now)

1. In Firebase Console, go to **"Storage"** in the left sidebar
2. Click **"Get started"**
3. Start in **"production mode"**
4. Select your **Storage location** (same as Firestore)
5. Click **"Done"**

### Set Up Storage Security Rules:

```javascript
rules_version = '2';
service firebase.storage {
  match /b/{bucket}/o {
    match /avatars/{userId}/{fileName} {
      allow read: if true;
      allow write: if request.auth != null && request.auth.uid == userId
                  && request.resource.size < 5 * 1024 * 1024; // 5MB limit
    }

    match /attachments/{channelId}/{fileName} {
      allow read: if request.auth != null;
      allow write: if request.auth != null
                  && request.resource.size < 10 * 1024 * 1024; // 10MB limit
    }
  }
}
```

---

## Part 8: Verify Configuration

1. Make sure your `.env` file has all the correct values
2. **Restart your development server** if it's running:
   ```bash
   # Stop the server (Ctrl+C) then restart:
   npm run dev
   ```

---

## Part 9: Test Your Setup

1. Open your app in the browser (usually `http://localhost:5173`)
2. You should be redirected to `/login`
3. Try these tests:

### Test Email/Password Signup:
- Click "Sign up"
- Enter name, email, password
- Should create account and log you in

### Test Google Sign-In:
- Click "Sign in with Google"
- Choose your Google account
- Should log you in

### Test Protected Routes:
- After logging in, you should see the home page
- Log out and try to access `/` - should redirect to `/login`

### Test Firestore:
- Once logged in, try creating a workspace or channel
- Open Firebase Console > Firestore Database
- You should see new documents appearing in real-time!

### Test Presence:
- Open your app in two browser windows (or one normal + one incognito)
- Log in with different accounts in each
- You should see online/offline status indicators

### Test Typing Indicators:
- In a channel, start typing in one window
- The other window should show "[Your Name] is typing..."

---

## Common Issues & Solutions

### Issue: "Missing or insufficient permissions"
**Solution:** Check your Firestore and Realtime Database security rules are published correctly.

### Issue: "Firebase: Error (auth/configuration-not-found)"
**Solution:** Make sure you've enabled Email/Password and Google sign-in methods in Authentication settings.

### Issue: "Firebase: Error (auth/unauthorized-domain)"
**Solution:**
1. Go to Firebase Console > Authentication > Settings > Authorized domains
2. Add `localhost` if testing locally

### Issue: Environment variables not loading
**Solution:**
1. Make sure `.env` file is in the project root
2. Restart your dev server completely
3. Variables must start with `VITE_` for Vite to load them

### Issue: Realtime Database URL missing
**Solution:**
1. Go to Realtime Database in Firebase Console
2. Copy the database URL from the top (includes `-default-rtdb`)
3. Add it to `.env` as `VITE_FIREBASE_DATABASE_URL`

---

## Next Steps

Once everything is working:

1. **Create your first workspace:**
   - After logging in, create a workspace
   - Add some channels

2. **Test with multiple users:**
   - Invite friends or create test accounts
   - Test real-time messaging, reactions, threads

3. **Explore Firebase Console:**
   - Watch documents appear in Firestore in real-time
   - Check Authentication users list
   - Monitor Realtime Database for presence/typing data

4. **Deploy to production:**
   - Update authorized domains in Firebase
   - Set up Firebase Hosting
   - Deploy your app!

---

## Congratulations! 🎉

Your Slack clone now has:
- ✅ Firebase Authentication (Email + Google)
- ✅ Real-time messaging with Firestore
- ✅ Online/offline presence detection
- ✅ Typing indicators
- ✅ Protected routes
- ✅ Persistent authentication

You're ready to build more features on top of this solid foundation!
