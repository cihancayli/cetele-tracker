# Cetele Complete Workflow Audit

## Date: November 14, 2025
## Testing All User Journeys

---

## 🏠 HOMEPAGE (index.html)

### Navigation Links:
1. **"View Demo Dashboard"** → `demo.html` ✓
2. **"Admin Portal"** → `login.html?role=admin` ⚠️ NEEDS TESTING
3. **"Student Portal"** → `student-login.html` ✓
4. **"Create New Group"** → `create-group.html` ✓

---

## 🔐 ADMIN LOGIN WORKFLOW

### Path: index.html → Admin Portal → login.html

**login.html** should show:
- Title: "Admin Portal"
- Subtitle: "Sign in to access your dashboard"
- Fields: Email + Password
- Button: "Sign In"

**Expected Flow:**
1. User enters email (from users table)
2. User enters password
3. System checks:
   - ✓ Email exists in `users` table
   - ✓ Password matches (base64 decoded)
   - ✓ Role is 'ed', 'coordinator', or 'mentor'
4. If success → redirect to `admin.html`
5. If fail → show error message

**Authentication on admin.html:**
- Checks localStorage for 'cetele_user'
- If not found → redirect to login.html with alert
- If found → check role is admin type
- If wrong role → deny access

---

## 🎓 STUDENT LOGIN WORKFLOW

### Path: index.html → Student Portal → student-login.html

**student-login.html** should show:
- Title: "Student Portal"
- Tabs: "Sign In" | "Create Account"
- Sign In fields: Username + Password
- Create Account fields: Mentor Code, Full Name, Username, Password, Confirm Password

**Expected Flow (Sign In):**
1. User enters username + password
2. System checks:
   - ✓ Username exists in `users` table
   - ✓ Role is 'student'
   - ✓ Password matches
3. If success → redirect to `student.html`
4. If fail → show error

**Expected Flow (Create Account):**
1. User enters mentor code (e.g., MTR-1234)
2. System verifies:
   - ✓ Mentor code exists in `mentor_codes` table
   - ✓ Mentor code is active
3. User fills remaining fields
4. System creates:
   - Student entry in `students` table
   - User entry in `users` table with role='student'
5. Redirect to `student.html`

---

## 👥 CREATE GROUP WORKFLOW

### Path: index.html → Create New Group → create-group.html

**create-group.html** should show:
- Title: "Create New Group"
- Field: Access Code (ED or region code)
- Dynamic role selection based on code
- Fields: Username, Email (optional), Password, Confirm Password
- Conditional: Group Name (if mentor)

**Expected Flow (ED Code):**
1. User enters `ED-NC-2025` (or VA, TX)
2. System verifies code exists in `ed_code` table
3. Shows "Education Director" role
4. User completes form
5. System creates user with role='ed', state='North Carolina'
6. Redirect to `admin.html`

**Expected Flow (Region Code):**
1. User enters `NC-HS-2025` or `NC-MS-2025`
2. System verifies code exists in `region_codes` table
3. Shows 3 role options: Coordinator | Mentor | Both
4. User selects role
5. If Mentor or Both → shows Group Name field
6. User completes form
7. System creates:
   - User with appropriate role + region + state
   - If mentor → creates group in `groups` table
   - If mentor → auto-generates mentor code in `mentor_codes` table
8. If mentor → redirect to `mentor-success.html` (shows mentor code)
9. If coordinator → redirect to `admin.html`

---

## 🔒 AUTHENTICATION GUARDS

### admin.html
```javascript
Before loading, checks:
1. localStorage has 'cetele_user'
2. User role is 'ed', 'coordinator', or 'mentor'
3. If fail → redirect to login.html
```

### student.html
```javascript
Before loading, checks:
1. localStorage has 'cetele_user' OR sessionStorage has 'studentId'
2. If user exists, role must be 'student'
3. If fail → redirect to student-login.html
```

### login.html
```javascript
On page load:
1. Clears localStorage 'cetele_user'
2. Clears all sessionStorage
3. Forces fresh authentication
```

---

## 🗄️ DATABASE STRUCTURE

### Tables Required:
- ✓ `users` (with state column)
- ✓ `students` (with state column)
- ✓ `groups` (with state, mentor_id, region columns)
- ✓ `activities`
- ✓ `weekly_submissions`
- ✓ `ed_code` (with state column)
- ✓ `region_codes` (with state column)
- ✓ `mentor_codes`

### Codes Available:
**North Carolina:**
- ED-NC-2025
- NC-HS-2025
- NC-MS-2025

**Virginia:**
- ED-VA-2025
- VA-HS-2025
- VA-MS-2025

**Texas:**
- ED-TX-2025
- TX-HS-2025
- TX-MS-2025

---

## ⚠️ KNOWN ISSUES TO CHECK

1. **Admin Portal Link Issue**
   - User reports clicking "Admin Portal" shows student portal
   - Need to verify: Does `login.html?role=admin` work correctly?
   - Need to check: Browser cache? Redirect logic?

2. **Password Security**
   - Currently using Base64 encoding (NOT secure)
   - Production needs: bcrypt or Supabase Auth

3. **Session Management**
   - Login clears sessions
   - Admin/Student pages check sessions
   - Need to verify no auto-login bypasses

---

## ✅ TEST CHECKLIST

### Test 1: Admin Login
- [ ] Click "Admin Portal" from homepage
- [ ] Verify lands on login.html with correct title
- [ ] Try login with no email/password → see error
- [ ] Try login with fake credentials → see error
- [ ] Create ED account first via create-group.html
- [ ] Login with valid ED credentials → success
- [ ] Verify redirects to admin.html
- [ ] Verify can see admin dashboard

### Test 2: Student Login
- [ ] Click "Student Portal" from homepage
- [ ] Verify lands on student-login.html
- [ ] Try to create account with fake mentor code → error
- [ ] Create mentor account first to get mentor code
- [ ] Create student account with valid mentor code → success
- [ ] Login as student → redirects to student.html
- [ ] Verify can submit cetele

### Test 3: Create Group (ED)
- [ ] Click "Create New Group" from homepage
- [ ] Enter ED-NC-2025 → shows ED role
- [ ] Complete form → success
- [ ] Verify redirects to admin.html
- [ ] Verify can access all features

### Test 4: Create Group (Mentor)
- [ ] Enter NC-HS-2025 → shows 3 roles
- [ ] Select "Mentor" → shows group name field
- [ ] Complete form → success
- [ ] Verify redirects to mentor-success.html
- [ ] Verify mentor code is displayed
- [ ] Copy mentor code for student signup

### Test 5: Security
- [ ] Try to access admin.html without login → blocked
- [ ] Try to access student.html without login → blocked
- [ ] Login as student, try admin.html → blocked
- [ ] Login as admin, try student.html → blocked
- [ ] Logout → verify session cleared

---

## 🐛 BUGS TO FIX

1. **Admin Portal redirect issue** - PRIORITY 1
2. **Password hashing** - PRIORITY 2 (production)
3. **create-group.html database queries** - verify uses new schema

---

## 📝 NOTES

- All authentication is currently client-side (localStorage)
- Production should use Supabase Auth or server-side sessions
- State isolation working via database constraints
- Multi-state system fully configured

