# Demo Account Setup Instructions

Follow these steps to create the demo account that recruiters/employers can use to instantly try your Slack clone.

## Step 1: Create Demo Account in Firebase

1. **Go to Firebase Console** > Your Project > **Authentication**
2. Click **"Add user"** button
3. Enter the following details:
   - **Email:** `demo@slackclone.com`
   - **Password:** `Demo123456!`
4. Click **"Add user"**

**Done!** The demo account is now created.

---

## Step 2: Set Up Demo Data (Workspaces & Channels)

To make the demo account useful, you should:

### Option A: Manual Setup (Quick)
1. Log in with the demo account
2. Create a workspace called "Demo Workspace"
3. Create channels: `#general`, `#random`, `#announcements`
4. Send a few sample messages

### Option B: Seed Script (Advanced - Optional)
Create a script to automatically populate demo data. This ensures every demo session has fresh, impressive data.

---

## Step 3: Test the Demo Button

1. Go to your app at `http://localhost:5173/login`
2. You should see a beautiful **gradient "Try Demo Account"** button at the top
3. Click it - you should be instantly logged in!
4. No need to enter email/password

---

## What Happens When Someone Clicks "Try Demo"?

1. Automatically logs in with `demo@slackclone.com`
2. Shows them your fully functional app
3. They can send messages, create channels, test features
4. No signup friction = more people actually try your app!

---

## Optional: Add Demo Banner

Want to show users they're in demo mode? Add a small banner at the top:

```tsx
{isDemoAccount && (
  <div className="bg-purple-100 dark:bg-purple-900/20 text-purple-800 dark:text-purple-200 px-4 py-2 text-sm text-center">
    You're using a demo account. <button>Sign up</button> to save your data.
  </div>
)}
```

---

## Security Note

**Demo Account Protection:**
- The demo account is public and anyone can use it
- Don't store sensitive data in the demo workspace
- Consider adding Firestore rules to prevent demo account from deleting data
- You can periodically reset demo data to keep it clean

**Optional: Protect Demo Data**

Add this to your Firestore rules to make demo account read-only for certain operations:

```javascript
match /messages/{messageId} {
  allow delete: if request.auth.uid != 'DEMO_USER_UID' && request.auth.uid == resource.data.userId;
}
```

---

## Why This Is Great for Your Portfolio

✅ **Zero friction** - Recruiters can try your app in 1 click
✅ **Professional** - Shows you understand UX and onboarding
✅ **More engagement** - People won't bounce if they can't test
✅ **Impressive touch** - Most portfolio projects don't have this

---

## Credentials Summary

**Demo Account:**
- Email: `demo@slackclone.com`
- Password: `Demo123456!`

These credentials are hardcoded in `src/pages/LoginPage.tsx` and automatically used when clicking "Try Demo Account".
