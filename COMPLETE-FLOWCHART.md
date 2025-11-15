# Cetele - Complete Workflow Flowchart

## 🏠 START: Homepage (index.html)

```
┌─────────────────────────────────────────┐
│         Homepage (index.html)            │
│  ┌────────┐  ┌────────┐  ┌────────┐    │
│  │  View  │  │ Admin  │  │Student │    │
│  │  Demo  │  │ Portal │  │ Portal │    │
│  └───┬────┘  └───┬────┘  └───┬────┘    │
└──────┼───────────┼───────────┼──────────┘
       │           │           │
       ▼           ▼           ▼
```

---

## 📊 PATH 1: View Demo
```
index.html
    │
    ├─► Click "View Demo Dashboard"
    │
    ▼
demo.html
    │
    └─► Shows mock data (no login required)
```

---

## 👨‍💼 PATH 2: Admin Portal

```
index.html
    │
    ├─► Click "Admin Portal"
    │
    ▼
admin-portal.html (Smart Redirect)
    │
    ├─► Checks localStorage for 'cetele_user'
    │
    ├───[Session EXISTS + role = ed/coordinator/mentor]───► admin.html
    │
    └───[No session OR invalid role]───► login.html
                                            │
                                            ▼
                                    Enter email + password
                                            │
                                            ├───[SUCCESS]───► admin.html
                                            │
                                            └───[FAIL]───► Show error, stay on login.html
```

### Admin Portal Details:
```
login.html
    │
    ├─► On page load: CLEARS localStorage (forces re-login)
    │
    ├─► User enters:
    │   - Email
    │   - Password
    │
    ├─► System checks:
    │   1. Email exists in 'users' table
    │   2. Password matches (base64)
    │   3. Role is 'ed', 'coordinator', or 'mentor'
    │
    ├───[ALL CHECKS PASS]───► Store session in localStorage
    │                         │
    │                         └─► Redirect to admin.html
    │
    └───[ANY CHECK FAILS]───► Show error message
                              │
                              └─► User stays on login.html
```

---

## 🎓 PATH 3: Student Portal

```
index.html
    │
    ├─► Click "Student Portal"
    │
    ▼
student-login.html
    │
    ├─── TAB: Sign In ────────────────────┐
    │                                      │
    │   ┌─► Enter username + password     │
    │   │                                  │
    │   ├─► System checks:                │
    │   │   1. Username exists             │
    │   │   2. Role = 'student'            │
    │   │   3. Password matches            │
    │   │                                  │
    │   ├───[SUCCESS]───► student.html    │
    │   │                                  │
    │   └───[FAIL]───► Show error         │
    │                                      │
    └─── TAB: Create Account ─────────────┘
                │
                ├─► Enter:
                │   - Mentor Code (MTR-XXXX)
                │   - Full Name
                │   - Username
                │   - Password
                │   - Confirm Password
                │
                ├─► System validates:
                │   1. Mentor code exists
                │   2. Mentor code is active
                │   3. Username not taken
                │   4. Passwords match
                │   5. Password >= 6 chars
                │
                ├───[SUCCESS]────────────────────┐
                │                                 │
                │   Creates:                      │
                │   1. Student record             │
                │   2. User record (role=student) │
                │   3. Auto-login                 │
                │                                 │
                │   └─► student.html              │
                │                                 │
                └───[FAIL]───► Show error        │
                              Stay on page        │
```

---

## 🆕 PATH 4: Create New Group (Signup)

```
index.html
    │
    ├─► Click "Create New Group"
    │
    ▼
create-group.html
    │
    ├─► Enter Access Code
    │   │
    │   ├───[ED-XX-2025]───────────────────┐
    │   │   (e.g., ED-NC-2025)             │
    │   │                                   │
    │   │   ┌─► Shows: Education Director  │
    │   │   │         Role (auto-selected) │
    │   │   │                               │
    │   │   ├─► User fills:                │
    │   │   │   - Username                 │
    │   │   │   - Email (optional)         │
    │   │   │   - Password                 │
    │   │   │                               │
    │   │   ├─► System creates:            │
    │   │   │   - User (role='ed')         │
    │   │   │                               │
    │   │   └───► admin.html               │
    │   │                                   │
    │   └───[XX-HS-2025 or XX-MS-2025]─────┤
    │       (e.g., NC-HS-2025)              │
    │                                       │
    │       ┌─► Shows 3 role options:      │
    │       │   ┌──────────────┐           │
    │       │   │ Coordinator  │           │
    │       │   ├──────────────┤           │
    │       │   │   Mentor     │           │
    │       │   ├──────────────┤           │
    │       │   │    Both      │           │
    │       │   └──────────────┘           │
    │       │                               │
    │       ├─► User selects role          │
    │       │                               │
    │       ├───[Coordinator]───────────────┐
    │       │                                │
    │       │   ┌─► User fills:             │
    │       │   │   - Username              │
    │       │   │   - Email                 │
    │       │   │   - Password              │
    │       │   │                            │
    │       │   ├─► System creates:         │
    │       │   │   - User                  │
    │       │   │     role='coordinator'    │
    │       │   │     is_coordinator=true   │
    │       │   │                            │
    │       │   └───► admin.html            │
    │       │                                │
    │       ├───[Mentor]────────────────────┤
    │       │                                │
    │       │   ┌─► Group Name field shows  │
    │       │   │                            │
    │       │   ├─► User fills:             │
    │       │   │   - Username              │
    │       │   │   - Email                 │
    │       │   │   - Password              │
    │       │   │   - Group Name            │
    │       │   │                            │
    │       │   ├─► System creates:         │
    │       │   │   1. User                 │
    │       │   │      role='mentor'        │
    │       │   │      is_mentor=true       │
    │       │   │   2. Group record         │
    │       │   │   3. Auto-gen mentor code │
    │       │   │      (e.g., MTR-6323)     │
    │       │   │                            │
    │       │   └───► mentor-success.html   │
    │       │         │                      │
    │       │         ├─► Displays code     │
    │       │         │                      │
    │       │         └─► Click "Go to      │
    │       │             Dashboard"        │
    │       │             │                  │
    │       │             └───► admin.html  │
    │       │                                │
    │       └───[Both]──────────────────────┤
    │                                        │
    │           ┌─► User fills:             │
    │           │   - Username              │
    │           │   - Email                 │
    │           │   - Password              │
    │           │   - Group Name            │
    │           │                            │
    │           ├─► System creates:         │
    │           │   1. User                 │
    │           │      role='coordinator'   │
    │           │      is_coordinator=true  │
    │           │      is_mentor=true       │
    │           │   2. Group record         │
    │           │   3. Auto-gen mentor code │
    │           │                            │
    │           └───► mentor-success.html   │
    │                 │                      │
    │                 └───► admin.html      │
    │                                        │
    └───[Invalid Code]───► Show error       │
                           Stay on page      │
```

---

## 🔐 PROTECTED PAGES

### admin.html (Admin Dashboard)
```
User visits admin.html
    │
    ├─► Authentication Guard Runs:
    │   1. Check localStorage for 'cetele_user'
    │   2. Verify role is 'ed', 'coordinator', or 'mentor'
    │
    ├───[Session EXISTS + Correct Role]───► Load Dashboard
    │
    └───[No Session OR Wrong Role]───► Alert + Redirect to login.html
```

### student.html (Student Dashboard)
```
User visits student.html
    │
    ├─► Authentication Guard Runs:
    │   1. Check localStorage for 'cetele_user'
    │      OR sessionStorage for 'studentId'
    │   2. If user exists, verify role='student'
    │
    ├───[Session EXISTS + role=student]───► Load Student Portal
    │
    ├───[Wrong Role (admin trying to access)]───► Alert + Redirect to login.html
    │
    └───[No Session]───► Alert + Redirect to student-login.html
```

---

## 🔄 SESSION MANAGEMENT

### When Sessions Are CREATED:
```
✅ login.html (Admin login success)
    └─► localStorage.setItem('cetele_user', userData)

✅ student-login.html (Student login success)
    └─► localStorage.setItem('cetele_user', userData)
    └─► sessionStorage.setItem('studentId', studentId)

✅ student-login.html (Student signup success)
    └─► localStorage.setItem('cetele_user', newUserData)
    └─► sessionStorage.setItem('studentId', newStudentId)

✅ create-group.html (Account creation success)
    └─► localStorage.setItem('cetele_user', newUserData)
```

### When Sessions Are CLEARED:
```
❌ login.html (On page load)
    └─► localStorage.removeItem('cetele_user')
    └─► sessionStorage.clear()

❌ admin.html (Wrong role detected)
    └─► localStorage.removeItem('cetele_user')

❌ student.html (Wrong role detected)
    └─► localStorage.removeItem('cetele_user')
    └─► sessionStorage.clear()

❌ User clicks logout button
    └─► localStorage.removeItem('cetele_user')
    └─► sessionStorage.clear()
```

---

## 📱 COMPLETE USER JOURNEYS

### Journey 1: New ED Creates Account
```
1. index.html
2. Click "Create New Group"
3. create-group.html
4. Enter ED-NC-2025
5. Fill form
6. Create account ✅
7. admin.html (redirected automatically)
8. Browse dashboard
```

### Journey 2: New Mentor Creates Account
```
1. index.html
2. Click "Create New Group"
3. create-group.html
4. Enter NC-HS-2025
5. Select "Mentor"
6. Fill form + group name
7. Create account ✅
8. mentor-success.html
9. Copy mentor code (MTR-6323)
10. Click "Go to Dashboard"
11. admin.html
12. Share mentor code with students
```

### Journey 3: Student Signs Up
```
1. index.html
2. Click "Student Portal"
3. student-login.html
4. Click "Create Account" tab
5. Enter mentor code (MTR-6323)
6. Fill form
7. Create account ✅
8. student.html (auto-login)
9. Submit weekly cetele
```

### Journey 4: Student Logs In (Returning)
```
1. index.html
2. Click "Student Portal"
3. student-login.html
4. Enter username + password
5. Click "Sign In"
6. student.html
7. Submit cetele
```

### Journey 5: Admin Logs In (Returning)
```
1. index.html
2. Click "Admin Portal"
3. admin-portal.html (smart redirect)
   ├─► If logged in ───► admin.html (skip login)
   └─► If not logged in ───► login.html
4. Enter email + password
5. admin.html
6. View analytics
```

---

## ⚠️ ERROR STATES

### Error 1: Invalid Credentials
```
login.html OR student-login.html
    │
    └─► User enters wrong email/username or password
        │
        └─► Show red error message
        └─► Stay on page (let user retry)
```

### Error 2: Invalid Access Code
```
create-group.html
    │
    └─► User enters code that doesn't exist
        │
        └─► Show error "Invalid access code"
        └─► Stay on page
```

### Error 3: Username Already Taken
```
create-group.html OR student-login.html (signup)
    │
    └─► Username exists in database
        │
        └─► Show error "Username already taken"
        └─► Stay on page
```

### Error 4: Unauthorized Access
```
User tries to access admin.html without proper role
    │
    └─► Show alert "Access denied"
    └─► Redirect to login.html
```

---

## 🗺️ FILE NAVIGATION MAP

```
index.html ────────┬─► demo.html
                   │
                   ├─► admin-portal.html ─┬─► admin.html (if logged in)
                   │                      └─► login.html (if not logged in)
                   │
                   ├─► student-login.html ─► student.html
                   │
                   └─► create-group.html ──┬─► admin.html (ED/Coordinator)
                                           └─► mentor-success.html (Mentor/Both)
                                                    │
                                                    └─► admin.html (click button)

login.html ────────► admin.html (after successful login)

student-login.html ─► student.html (after successful login/signup)

mentor-success.html ─► admin.html (click "Go to Dashboard")
                    └─► index.html (click "Back to Home")
```

---

## ✅ WHAT'S FIXED

1. ✅ admin-portal.html created as smart redirect
2. ✅ Homepage "Admin Portal" now goes to admin-portal.html (not login.html directly)
3. ✅ mentor-success.html has Supabase loaded in correct order
4. ✅ All authentication guards prevent wrong role access
5. ✅ Sessions properly managed across all pages

---

## 🧪 TEST SCENARIOS

### Test 1: Fresh User Clicks Admin Portal
```
EXPECTED:
index.html → Admin Portal → admin-portal.html → login.html
→ User logs in → admin.html

ACTUAL:
[TO BE TESTED AFTER DEPLOYMENT]
```

### Test 2: Logged In User Clicks Admin Portal
```
EXPECTED:
index.html → Admin Portal → admin-portal.html → admin.html (skip login)

ACTUAL:
[TO BE TESTED AFTER DEPLOYMENT]
```

### Test 3: Student Signup with Mentor Code
```
EXPECTED:
index.html → Student Portal → student-login.html (Create Account)
→ Enter MTR-6323 → student.html (auto-login)

ACTUAL:
[TO BE TESTED AFTER DEPLOYMENT]
```

---

**Deploy these fixes and test each scenario above!**
