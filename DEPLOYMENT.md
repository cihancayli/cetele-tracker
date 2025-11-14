# 🚀 Deployment Guide

## Authentication & Security

### Default Admin Credentials
- **Email**: `admin@cetele.app`
- **Password**: `cetele2024`

⚠️ **IMPORTANT**: Change these credentials in production!

### Security Features Added
- ✅ Login page with authentication
- ✅ Session management (24-hour expiry)
- ✅ Role-based access control (Admin vs Student)
- ✅ Protected admin and student portals
- ✅ Secure headers in Vercel config
- ✅ Magic link authentication support

---

## Deploying to Vercel

### Option 1: Deploy from GitHub (Recommended)

1. **Create GitHub Repository**:
   ```bash
   cd ~/cetele-dashboard

   # Initialize git (already done)
   git add .
   git commit -m "Initial commit with authentication"

   # Create repo on GitHub and connect
   gh repo create cetele-tracker --public --source=. --remote=origin --push
   ```

2. **Connect to Vercel**:
   - Go to [vercel.com](https://vercel.com)
   - Click "Add New Project"
   - Import your GitHub repository
   - Configure:
     - **Framework Preset**: Other
     - **Build Command**: (leave empty)
     - **Output Directory**: (leave empty)
     - **Install Command**: (leave empty)
   - Click "Deploy"

3. **Set Custom Domain** (cetele.app):
   - In Vercel project settings → Domains
   - Add `cetele.app`
   - Add `www.cetele.app`
   - Follow DNS configuration instructions

### Option 2: Deploy with Vercel CLI

```bash
# Install Vercel CLI
npm i -g vercel

# Login
vercel login

# Deploy
cd ~/cetele-dashboard
vercel --prod
```

---

## DNS Configuration for cetele.app

In your Namecheap DNS settings, update:

### Remove Current Records:
- Remove: `CNAME www → parkingpage.namecheap.com`
- Remove: `URL Redirect @ → http://www.cetele.app/`

### Add Vercel Records:
```
Type: A
Host: @
Value: 76.76.21.21
TTL: Automatic

Type: CNAME
Host: www
Value: cname.vercel-dns.com.
TTL: Automatic
```

Vercel will provide exact DNS records in the dashboard.

---

## Environment Variables (Optional)

If you want to add additional security, set these in Vercel:

```
SUPABASE_URL=https://fkagbfrkowrhvchnqbqt.supabase.co
SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...
ADMIN_EMAIL=admin@cetele.app
ADMIN_PASSWORD=your-secure-password
```

**Note**: Currently credentials are in the code for simplicity. For production, move to environment variables.

---

## Post-Deployment Checklist

### 1. ✅ Test Authentication
- [ ] Visit https://cetele.app/login
- [ ] Test admin login
- [ ] Test student login
- [ ] Verify redirect to portals works

### 2. ✅ Set Up Database
- [ ] Run `setup-database.sql` in Supabase (if not already done)
- [ ] Verify tables are created
- [ ] Check activities are initialized

### 3. ✅ Create Initial Data
- [ ] Login as admin
- [ ] Create groups
- [ ] Add students
- [ ] Test student submission

### 4. ✅ Security
- [ ] Change default admin password
- [ ] Set up Supabase Auth (optional)
- [ ] Enable email verification (optional)
- [ ] Set up SSL certificate (automatic with Vercel)

### 5. ✅ Domain
- [ ] Update DNS records in Namecheap
- [ ] Wait for DNS propagation (5-60 minutes)
- [ ] Test https://cetele.app
- [ ] Test https://www.cetele.app

---

## Changing Admin Password

### Method 1: Edit Code (Quick)
1. Open `js/auth.js`
2. Find:
   ```javascript
   const DEFAULT_ADMIN_EMAIL = 'admin@cetele.app';
   const DEFAULT_ADMIN_PASSWORD = 'cetele2024';
   ```
3. Change the password
4. Commit and redeploy:
   ```bash
   git add js/auth.js
   git commit -m "Update admin password"
   git push
   ```

### Method 2: Use Supabase Auth (Recommended for Production)
1. In Supabase Dashboard:
   - Go to Authentication → Users
   - Add new user with admin email
   - Set password

2. In database, add user to `users` table:
   ```sql
   INSERT INTO users (email, role)
   VALUES ('admin@cetele.app', 'admin');
   ```

---

## Monitoring & Maintenance

### View Logs
- Vercel Dashboard → Your Project → Deployments → View Function Logs
- Check for errors in browser console

### Update Application
```bash
# Make changes
git add .
git commit -m "Description of changes"
git push

# Vercel auto-deploys on push
```

### Rollback
- Vercel Dashboard → Deployments
- Click on previous deployment
- Click "Promote to Production"

---

## Troubleshooting

### Issue: Can't access admin/student portals
**Solution**: Make sure you're logged in through `/login` page

### Issue: "Session expired"
**Solution**: Sessions last 24 hours. Login again.

### Issue: DNS not working
**Solution**:
- Verify DNS records in Namecheap
- Wait 5-60 minutes for propagation
- Check with: `nslookup cetele.app`

### Issue: Database connection errors
**Solution**:
- Verify Supabase URL and API key in `js/supabase-config.js`
- Check Supabase project is active
- Verify RLS policies allow access

---

## GitHub Repository URL

After creating the repo, you'll get:
```
https://github.com/YOUR_USERNAME/cetele-tracker
```

Share this URL with:
- Vercel for deployment
- Team members for collaboration
- Documentation purposes

---

## Production Checklist

Before going live:

- [ ] Database is set up and populated
- [ ] Admin password is changed
- [ ] Authentication is tested
- [ ] All features work correctly
- [ ] DNS is configured
- [ ] HTTPS is active (automatic with Vercel)
- [ ] Mobile responsiveness tested
- [ ] Error handling tested
- [ ] Backup plan in place

---

## Support & Updates

**Domain**: cetele.app (Namecheap)
**Hosting**: Vercel
**Database**: Supabase
**Repository**: GitHub

**Contact**: ghancayli@gmail.com

---

## Next Steps

1. Create GitHub repository
2. Push code
3. Connect to Vercel
4. Configure DNS
5. Test deployment
6. Share with users!

**Ready to deploy? Follow the steps above!** 🚀
