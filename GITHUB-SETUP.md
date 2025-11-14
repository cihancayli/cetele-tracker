# 🐙 GitHub Setup & Deployment

## Quick Deploy to GitHub + Vercel

### Step 1: Create GitHub Repository

Choose one of these methods:

#### Method A: Using GitHub CLI (Fastest)
```bash
cd ~/cetele-dashboard

# Install GitHub CLI if needed
brew install gh

# Login to GitHub
gh auth login

# Create repository and push
gh repo create cetele-tracker --public --source=. --remote=origin --push

# Your repo URL will be:
# https://github.com/YOUR_USERNAME/cetele-tracker
```

#### Method B: Using GitHub Website
1. Go to https://github.com/new
2. Repository name: `cetele-tracker`
3. Description: "Cetele Performance Tracker - Student activity monitoring system"
4. Make it **Public**
5. **DO NOT** initialize with README (we already have one)
6. Click "Create repository"

7. Then run these commands:
```bash
cd ~/cetele-dashboard
git remote add origin https://github.com/YOUR_USERNAME/cetele-tracker.git
git branch -M main
git push -u origin main
```

---

## Step 2: Deploy to Vercel

### Option A: Vercel Website (Easiest)

1. **Go to Vercel**:
   - Visit: https://vercel.com
   - Sign up/Login with GitHub

2. **Import Project**:
   - Click "Add New..." → "Project"
   - Select your `cetele-tracker` repository
   - Click "Import"

3. **Configure Project**:
   - **Framework Preset**: Other
   - **Root Directory**: ./
   - **Build Command**: (leave empty)
   - **Output Directory**: (leave empty)
   - **Install Command**: (leave empty)

4. **Deploy**:
   - Click "Deploy"
   - Wait 1-2 minutes
   - You'll get a URL like: `https://cetele-tracker.vercel.app`

5. **Add Custom Domain**:
   - In project settings → Domains
   - Add domain: `cetele.app`
   - Add domain: `www.cetele.app`
   - Vercel will show you DNS records

### Option B: Vercel CLI

```bash
# Install Vercel CLI
npm install -g vercel

# Login
vercel login

# Deploy
cd ~/cetele-dashboard
vercel --prod

# Follow prompts to link to Vercel project
```

---

## Step 3: Configure DNS (Namecheap)

### Get DNS Records from Vercel:
After adding your domain in Vercel, you'll see something like:

```
Type: A
Name: @
Value: 76.76.21.21

Type: CNAME
Name: www
Value: cname.vercel-dns.com
```

### Update Namecheap DNS:

1. **Go to Namecheap**:
   - Login: https://www.namecheap.com
   - Dashboard → Domain List → cetele.app → Manage

2. **Go to Advanced DNS**:
   - Remove existing records:
     - Delete: `CNAME Record www → parkingpage.namecheap.com`
     - Delete: `URL Redirect @ → http://www.cetele.app/`

3. **Add New Records**:
   ```
   Type: A Record
   Host: @
   Value: 76.76.21.21
   TTL: Automatic
   ```

   ```
   Type: CNAME Record
   Host: www
   Value: cname.vercel-dns.com.
   TTL: Automatic
   ```

4. **Save All Changes**

5. **Wait for DNS Propagation**:
   - Usually 5-30 minutes
   - Can take up to 48 hours
   - Check with: `nslookup cetele.app`

---

## Step 4: Verify Deployment

### Test Your Live Site:

1. **Vercel URL** (immediate):
   ```
   https://cetele-tracker.vercel.app
   https://cetele-tracker.vercel.app/login
   https://cetele-tracker.vercel.app/admin
   https://cetele-tracker.vercel.app/student
   ```

2. **Custom Domain** (after DNS propagation):
   ```
   https://cetele.app
   https://www.cetele.app
   https://cetele.app/login
   https://cetele.app/admin
   https://cetele.app/student
   ```

### Test Checklist:
- [ ] Home page loads
- [ ] Login page works
- [ ] Admin login (admin@cetele.app / cetele2024)
- [ ] Student selection works
- [ ] Database connection works
- [ ] Can create groups
- [ ] Can add students
- [ ] Can submit activities
- [ ] Charts display correctly
- [ ] Mobile responsive

---

## Your Repository URL

After setup, your repo will be at:
```
https://github.com/YOUR_USERNAME/cetele-tracker
```

**Share this URL with**:
- Team members
- Vercel for deployment
- Documentation
- Version control

---

## Automatic Deployments

Once connected, every time you push to GitHub, Vercel automatically deploys!

```bash
# Make changes locally
cd ~/cetele-dashboard

# Edit files...

# Commit and push
git add .
git commit -m "Your update description"
git push

# Vercel automatically deploys!
# Check deployment status at vercel.com
```

---

## Quick Commands Reference

```bash
# Check git status
git status

# Add all changes
git add .

# Commit changes
git commit -m "Description of changes"

# Push to GitHub
git push

# View commit history
git log --oneline

# Create new branch for features
git checkout -b feature-name

# Switch back to main
git checkout main
```

---

## Troubleshooting

### "remote origin already exists"
```bash
git remote remove origin
git remote add origin https://github.com/YOUR_USERNAME/cetele-tracker.git
```

### "failed to push"
```bash
git pull origin main --rebase
git push origin main
```

### DNS not updating
- Clear browser cache
- Try incognito/private browsing
- Wait longer (up to 48h)
- Check DNS: `dig cetele.app`

---

## Security Notes for Production

### Before Going Live:

1. **Change Admin Password**:
   - Edit `js/auth.js`
   - Update `DEFAULT_ADMIN_PASSWORD`
   - Commit and push

2. **Set Environment Variables** (optional):
   - In Vercel Dashboard → Settings → Environment Variables
   - Add sensitive data there instead of code

3. **Enable Supabase Auth**:
   - Set up email authentication
   - Configure email templates
   - Enable email verification

4. **Review RLS Policies**:
   - Restrict anonymous access if needed
   - Add row-level security

---

## What Gets Deployed

✅ All HTML, CSS, JavaScript files
✅ Documentation (README, guides)
✅ Configuration (vercel.json)
✅ Database setup script

❌ node_modules (excluded by .gitignore)
❌ .env files (excluded by .gitignore)
❌ Temporary files

---

## Next Steps

1. ✅ Create GitHub repository (above)
2. ✅ Push code to GitHub
3. ✅ Deploy on Vercel
4. ✅ Configure DNS
5. ✅ Test live site
6. ✅ Share with students!

**Ready? Start with Step 1!** 🚀

---

**Questions?**
- GitHub Docs: https://docs.github.com
- Vercel Docs: https://vercel.com/docs
- Contact: ghancayli@gmail.com
