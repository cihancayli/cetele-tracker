# Cetele Onboarding Guide

## System Hierarchy

The Cetele system has a four-tier hierarchy:

```
┌─────────────────────────────────────┐
│   Education Director (ED)           │
│   - Full access to all regions      │
│   - Views all groups (HS + MS)      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Coordinators (HS & MS)            │
│   - View all groups in region       │
│   - Optional: Own mentor group      │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Mentors                           │
│   - Manage own group only           │
│   - Receive auto-generated code     │
└─────────────────────────────────────┘
              ↓
┌─────────────────────────────────────┐
│   Students                          │
│   - Submit weekly ceteles           │
│   - View personal progress          │
└─────────────────────────────────────┘
```

---

## 1. Initial Setup (Website Admin Only)

### Database Setup

1. Run `setup-database.sql` in Supabase SQL Editor
2. Run `setup-auth-system.sql` in Supabase SQL Editor

### Default Codes Created

After running the SQL scripts, these codes are automatically created:

- **ED Code**: `ED-MASTER-2025` (Education Director)
- **High School Region**: `HS-REGION-2025`
- **Middle School Region**: `MS-REGION-2025`

**⚠️ Important:** Change these codes for production use!

---

## 2. Creating Accounts

### 2.1 Education Director (ED)

**Step 1:** Go to [cetele.app](https://cetele.app)

**Step 2:** Click "Get Started" → "Create New Group"

**Step 3:** Enter credentials:
- Region Code: `ED-MASTER-2025`
- Role: *Automatically set as ED*
- Username: Choose a username
- Email: (optional)
- Password: Create a secure password

**Step 4:** Click "Create Account"

**Result:** Full access to all dashboards across all regions

---

### 2.2 Coordinators (HS or MS)

Coordinators oversee all groups in their region (High School or Middle School).

**Step 1:** Website admin provides region code:
- High School: `HS-REGION-2025`
- Middle School: `MS-REGION-2025`

**Step 2:** Coordinator goes to [cetele.app](https://cetele.app)

**Step 3:** Click "Get Started" → "Create New Group"

**Step 4:** Enter credentials:
- Region Code: `HS-REGION-2025` or `MS-REGION-2025`
- Role: Select one:
  - **Coordinator**: View all groups, no personal group
  - **Both**: View all groups + have own mentor group

**Step 5:** If "Both" selected:
- Enter Group Name (e.g., "10th Grade Leadership")

**Step 6:** Complete signup:
- Username
- Email (optional)
- Password

**Result:**
- Coordinator-only: Access to region-wide dashboard
- Both: Access to dashboard + receives mentor code

---

### 2.3 Mentors

Mentors manage their own group and receive a unique code for their students.

**Step 1:** Website admin provides region code:
- High School: `HS-REGION-2025`
- Middle School: `MS-REGION-2025`

**Step 2:** Mentor goes to [cetele.app](https://cetele.app)

**Step 3:** Click "Get Started" → "Create New Group"

**Step 4:** Enter credentials:
- Region Code: `HS-REGION-2025` or `MS-REGION-2025`
- Role: **Mentor**
- Group Name: (e.g., "11th Grade Group A")
- Username
- Email (optional)
- Password

**Step 5:** Click "Create Account"

**Result:**
- Redirected to success page
- **Mentor Code displayed** (e.g., `MTR-2847`)
- Copy and share this code with students

---

### 2.4 Students

Students join using their mentor's code.

**Step 1:** Receive mentor code from mentor (e.g., `MTR-2847`)

**Step 2:** Go to [cetele.app](https://cetele.app)

**Step 3:** Click "Get Started" → "Student Portal"

**Step 4:** Click "Create Account" tab

**Step 5:** Enter credentials:
- Mentor Code: `MTR-2847`
- Full Name
- Username
- Password (min 6 characters)
- Confirm Password

**Step 6:** Click "Create Account"

**Result:**
- Automatically joined to mentor's group
- Access to student dashboard
- Can submit weekly ceteles

---

## 3. Login Procedures

### Student Login

1. Go to [cetele.app](https://cetele.app)
2. Click "Get Started" → "Student Portal"
3. Enter username and password
4. Click "Sign In"

### Admin/Coordinator/Mentor Login

1. Go to [cetele.app](https://cetele.app)
2. Click "Get Started" → "Admin Portal"
3. Enter username and password
4. System automatically detects role and redirects:
   - **ED** → Full dashboard (all regions)
   - **Coordinator** → Region dashboard
   - **Mentor** → Group dashboard

---

## 4. Code Management

### Viewing Mentor Code

Mentors can find their code in:
- Account Settings
- Group Management page

### Generating New Region Codes

Website admin can create new region codes:

```sql
INSERT INTO region_codes (code, region_name)
VALUES ('NEW-CODE-2025', 'High School');
```

### Generating New ED Code

Website admin can create new ED code:

```sql
INSERT INTO ed_code (code)
VALUES ('NEW-ED-CODE-2025');
```

### Deactivating Mentor Code

If a mentor leaves, deactivate their code:

```sql
UPDATE mentor_codes
SET is_active = false
WHERE code = 'MTR-1234';
```

---

## 5. Dashboard Access Levels

### Education Director Dashboard

- **Access**: All groups across all regions
- **Features**:
  - View all High School groups
  - View all Middle School groups
  - Analytics across entire organization
  - Manage coordinators and mentors

### Coordinator Dashboard

- **Access**: All groups in assigned region only
- **Features**:
  - View all groups in region
  - Regional analytics
  - Mentor performance overview
  - If "Both" role: Toggle to own group view

### Mentor Dashboard

- **Access**: Own group only
- **Features**:
  - View group cetele table
  - Track individual student progress
  - Group leaderboard
  - Share mentor code with students

### Student Dashboard

- **Access**: Personal data only
- **Features**:
  - Submit weekly ceteles
  - View personal progress charts
  - See group leaderboard position
  - Track streaks and achievements

---

## 6. Common Workflows

### Adding a New Mentor

1. Admin provides region code to mentor
2. Mentor signs up at create-group.html
3. Mentor receives auto-generated code (e.g., `MTR-5829`)
4. Mentor shares code with students
5. Students sign up using mentor code

### Student Joins Group

1. Mentor shares code (e.g., `MTR-5829`)
2. Student goes to student-login.html
3. Clicks "Create Account"
4. Enters mentor code + credentials
5. Automatically added to mentor's group
6. Can immediately submit ceteles

### Coordinator Views Regional Data

1. Coordinator logs in
2. System detects coordinator role
3. Dashboard shows all groups in region
4. Can filter by:
   - Grade level
   - Mentor
   - Performance metrics

### ED Views Organization-Wide Data

1. ED logs in
2. System detects ED role
3. Dashboard shows:
   - High School tab
   - Middle School tab
   - Combined analytics
   - Regional comparisons

---

## 7. Security Notes

### Password Storage

**Current Implementation** (Development):
- Passwords stored as Base64 encoded strings
- **⚠️ NOT SECURE for production**

**Production Requirements**:
- Implement bcrypt/argon2 hashing
- Use Supabase Auth for proper authentication
- Add password reset functionality

### Code Security

- Region codes and ED codes should be kept confidential
- Change default codes before production deployment
- Rotate codes periodically for security

### Session Management

- User sessions stored in localStorage
- Implement token-based auth for production
- Add session expiration and refresh tokens

---

## 8. Troubleshooting

### "Invalid Region Code"

- Verify code spelling (case-sensitive)
- Check if code exists in `region_codes` table
- Contact website admin for correct code

### "Invalid Mentor Code"

- Verify code spelling (format: MTR-XXXX)
- Check if mentor code is active
- Ask mentor to verify their code

### "Username Already Taken"

- Choose a different username
- Usernames must be unique across all users

### Can't See My Group

**Mentor:**
- Verify you're logged in with correct account
- Check if group was created during signup

**Student:**
- Verify mentor code was entered correctly
- Check with mentor that code is still active

---

## 9. Best Practices

### For Website Admin

- Keep track of all distributed region codes
- Document which coordinators have which codes
- Regularly audit user roles and permissions
- Back up mentor codes before deactivating

### For Coordinators

- Verify mentor codes before distributing
- Keep list of active mentors in region
- Monitor group creation and student enrollment
- Provide support for mentor onboarding

### For Mentors

- Save your mentor code in a secure location
- Share code only with your students
- Verify students during first week
- Update students if code changes

### For Students

- Keep username and password secure
- Don't share login credentials
- Verify mentor code before signup
- Contact mentor if login issues occur

---

## 10. Future Enhancements

### Planned Features

- Email verification for accounts
- Password reset functionality
- Bulk student import via CSV
- QR code for mentor codes
- Mobile app support
- Automated code rotation
- Multi-factor authentication
- Parent portal access

---

## Support

For technical support or questions:
- Contact website administrator
- Submit feature request via app
- Report bugs through contact form

---

**Last Updated:** 2025-01-14
**Version:** 1.0.0
