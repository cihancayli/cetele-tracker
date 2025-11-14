# 🚀 Deploy in 3 Steps

## Step 1: Push to GitHub (2 minutes)

```bash
cd ~/cetele-dashboard

# If you have GitHub CLI:
gh auth login
gh repo create cetele-tracker --public --source=. --remote=origin --push
```

**OR without GitHub CLI:**
1. Go to https://github.com/new
2. Name: `cetele-tracker`
3. Public repository
4. Don't add README
5. Click "Create repository"
6. Then:
```bash
cd ~/cetele-dashboard
git remote add origin https://github.com/YOUR_USERNAME/cetele-tracker.git
git branch -M main
git push -u origin main
```

**✅ Done!** Your code is on GitHub.

---

## Step 2: Deploy to Vercel (3 minutes)

1. Go to **https://vercel.com**
2. Sign in with GitHub
3. Click "**Add New Project**"
4. Find and select "**cetele-tracker**"
5. Click "**Deploy**"
6. Wait 1-2 minutes

**✅ Done!** Your site is live at: `https://cetele-tracker.vercel.app`

---

## Step 3: Connect Domain (5-30 minutes)

### In Vercel:
1. Project → Settings → **Domains**
2. Add domain: `cetele.app`
3. Add domain: `www.cetele.app`
4. Copy the DNS records shown

### In Namecheap:
1. Go to https://namecheap.com
2. Dashboard → Domain List → **cetele.app** → Manage
3. Click "**Advanced DNS**"
4. **Delete** these:
   - CNAME: www → parkingpage.namecheap.com
   - URL Redirect: @ → http://www.cetele.app/

5. **Add** these (use Vercel's values):
   ```
   Type: A Record
   Host: @
   Value: 76.76.21.21
   TTL: Automatic
   ```

   ```
   Type: CNAME
   Host: www
   Value: cname.vercel-dns.com.
   TTL: Automatic
   ```

6. Click "**Save All Changes**"

**✅ Done!** Wait 5-30 minutes, then visit: **https://cetele.app**

---

## Before First Use

### Set up the database (one-time):

1. Go to: https://supabase.com/dashboard/project/fkagbfrkowrhvchnqbqt/editor
2. Open file: `setup-database.sql`
3. Copy ALL contents
4. Paste in Supabase SQL Editor
5. Click "**Run**"

**✅ Done!** Database is ready.

---

## Login & Test

### Admin:
- URL: https://cetele.app/login
- Email: `admin@cetele.app`
- Password: `cetele2024`

### Student:
- URL: https://cetele.app/login
- Click "Student" tab
- Select your name

---

## Troubleshooting

**"Can't access admin/student"**
→ You must login first via `/login` page

**"DNS not working"**
→ Wait 5-30 minutes for DNS propagation

**"Database error"**
→ Run `setup-database.sql` in Supabase

**"Session expired"**
→ Login again (sessions last 24 hours)

---

## Security Note

⚠️ **Change admin password in production:**

1. Edit `js/auth.js`
2. Line 5: `const DEFAULT_ADMIN_PASSWORD = 'your-new-password';`
3. Commit and push:
   ```bash
   git add js/auth.js
   git commit -m "Update admin password"
   git push
   ```

Vercel auto-deploys on push!

---

## That's It!

Your site will be live at:
- ✅ https://cetele.app
- ✅ https://www.cetele.app
- ✅ https://cetele-tracker.vercel.app

**Questions?** Check GITHUB-SETUP.md or DEPLOYMENT.md

---

**Total time: ~10 minutes + DNS wait**

Let's go! 🚀
