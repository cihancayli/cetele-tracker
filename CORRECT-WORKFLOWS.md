# Cetele - Correct User Workflows

## ✅ WORKFLOW 1: Create Coordinator/Mentor Account (What You Just Did)

### Steps:
1. Go to: `https://www.cetele.app/create-group.html`
2. Enter Access Code: `NC-HS-2025`
3. Select Role: **Both** (Coordinator + Mentor)
4. Fill in form:
   - Username: `cihancayli`
   - Email: `ghancayli@gmail.com`
   - Password: (your password)
   - Group Name: (your group name)
5. Click "Create Account"

### Expected Result:
- ✅ Account created with role='coordinator', is_coordinator=true, is_mentor=true
- ✅ Group created in database
- ✅ Mentor code auto-generated: `MTR-6323`
- ✅ Redirected to: `mentor-success.html`
- ✅ User session stored in localStorage

### From mentor-success.html:
- Click **"Go to Dashboard"** → should go to `admin.html` ✅
- Click **"Back to Home"** → should go to `index.html` ✅

---

## ✅ WORKFLOW 2: Access Admin Dashboard (After Creating Account)

### From mentor-success.html:
1. Click "Go to Dashboard"
2. Browser navigates to: `https://www.cetele.app/admin.html`

### What admin.html Does:
1. Checks localStorage for 'cetele_user'
2. Verifies role is 'ed', 'coordinator', or 'mentor'
3. **YOUR ROLE**: 'coordinator' ✅
4. Should load admin dashboard successfully

### If You See "Please log in" Alert:
**This means localStorage was cleared somehow**

**Solution:**
1. Go to: `https://www.cetele.app/login.html`
2. Login with:
   - Email: `ghancayli@gmail.com`
   - Password: (your password)
3. Should redirect to admin.html

---

## ✅ WORKFLOW 3: Student Signup (Using Your Mentor Code)

### Steps:
1. Go to: `https://www.cetele.app/student-login.html`
2. Click **"Create Account"** tab
3. Fill in form:
   - Mentor Code: `MTR-6323`
   - Full Name: `Test Student`
   - Username: `student1`
   - Password: `test123`
   - Confirm Password: `test123`
4. Click "Create Account"

### Expected Result:
- ✅ Verifies mentor code exists
- ✅ Creates student in your group
- ✅ Creates user account with role='student'
- ✅ Auto-logs in student
- ✅ Redirects to: `student.html`
- ✅ Student can submit ceteles

---

## ✅ WORKFLOW 4: Student Login (After Account Created)

### Steps:
1. Go to: `https://www.cetele.app/student-login.html`
2. Enter:
   - Username: `student1`
   - Password: `test123`
3. Click "Sign In"

### Expected Result:
- ✅ Verifies credentials
- ✅ Checks role is 'student'
- ✅ Redirects to: `student.html`

---

## ❌ COMMON ISSUES & FIXES

### Issue 1: "Please log in" after clicking "Go to Dashboard"
**Cause**: login.html clears localStorage on page load
**Fix**: Don't go to login.html after creating account - go directly to admin.html
**Correct Flow**: mentor-success.html → admin.html (skip login.html)

### Issue 2: Student portal says "Please log in" after signup
**Cause**: student-login.html might not be setting session correctly
**Status**: FIXED in latest deployment
**Wait**: 60 seconds for Vercel to deploy, then test

### Issue 3: Admin dashboard redirects to login
**Cause**: No session in localStorage
**Fix**: Login again at login.html with your email/password

### Issue 4: Clicking "Admin Portal" from homepage shows student portal
**This Should NOT Happen** - if it does, it's a browser cache issue
**Fix**: Hard refresh (Cmd+Shift+R or Ctrl+Shift+R)

---

## 🔍 HOW TO CHECK YOUR CURRENT SESSION

### Open Browser Console (F12):
```javascript
// Check your session
console.log(JSON.parse(localStorage.getItem('cetele_user')));

// Should show:
{
  id: "...",
  username: "cihancayli",
  email: "ghancayli@gmail.com",
  role: "coordinator",
  is_coordinator: true,
  is_mentor: true,
  state: "North Carolina",
  region: "High School"
}
```

---

## 🎯 TESTING CHECKLIST

### Test 1: Mentor Can Access Dashboard
- [ ] Go to: https://www.cetele.app/admin.html (directly)
- [ ] Should see admin dashboard (not login page)
- [ ] Should see your groups
- [ ] Should see analytics

### Test 2: Student Signup Works
- [ ] Go to: https://www.cetele.app/student-login.html
- [ ] Create Account tab
- [ ] Use mentor code: MTR-6323
- [ ] Should successfully create account
- [ ] Should redirect to student.html (not show "please log in")

### Test 3: Student Can Access Portal
- [ ] After signup, should be on student.html
- [ ] Should see "Weekly Cetele" form
- [ ] Should be able to submit activities

---

## 📞 IF STILL HAVING ISSUES:

1. **Clear all browser data** for cetele.app
2. **Start fresh**: Go to create-group.html and create a NEW account with different username
3. **Check browser console** for any red error messages
4. **Tell me the exact error message** you see

---

## 🚀 CURRENT STATUS

- ✅ Database: Fully set up
- ✅ Multi-state system: Working
- ✅ Authentication guards: Active
- ✅ Student signup: Fixed (deploying now)
- ⏳ Vercel deployment: ~60 seconds

**Try again in 60 seconds after Vercel deploys the latest fixes!**
