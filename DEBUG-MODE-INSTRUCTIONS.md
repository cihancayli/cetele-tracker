# Debug Mode Setup Instructions

## Step 1: Set Up Test Data in Database

1. Go to your Supabase project: https://fkagbfrkowrhvchnqbqt.supabase.co
2. Click on **SQL Editor** in the left sidebar
3. Click **New Query**
4. Open the file `setup-debug-mode.sql` from this project
5. Copy all the SQL code
6. Paste it into the Supabase SQL Editor
7. Click **Run** or press `Cmd/Ctrl + Enter`

This will create:
- Debug test group
- Debug students
- Debug users (coordinator, ED, mentor, students)
- Sample activities
- Sample weekly submissions

## Step 2: Access Debug Login

### For Admin/Coordinator Login:
1. Open `login.html` in your browser
2. Scroll down past the email/password fields
3. You'll see a **"Debug Mode"** divider
4. Click the **"🔧 Quick Test Login (Coordinator)"** button
5. You'll be automatically logged in and redirected to the admin dashboard

**Manual Login Alternative:**
- Email: `debug@test.com`
- Password: `debug123`

### For Student Login:
1. Open `student-login.html` in your browser
2. Scroll down past the login/signup forms
3. You'll see a **"Debug Mode"** section
4. Click the **"🔧 Quick Test Login (Student 1)"** button
5. You'll be automatically logged in and redirected to the student dashboard

**Manual Login Alternative:**
- Username: `debug_student1`
- Password: `debug123`

## All Debug Credentials

### Coordinator
- **Email:** debug@test.com
- **Password:** debug123
- **Username:** debug_coordinator

### Educational Director
- **Email:** debug-ed@test.com
- **Password:** debug123
- **Username:** debug_ed

### Mentor
- **Email:** debug-mentor@test.com
- **Password:** debug123
- **Username:** debug_mentor

### Students
**Student 1:**
- **Username:** debug_student1
- **Password:** debug123

**Student 2:**
- **Username:** debug_student2
- **Password:** debug123

### Mentor Code for New Signups
- **Code:** DEBUG-TEST

## Testing Workflow

1. **First**: Run `setup-debug-mode.sql` in Supabase SQL Editor
2. **Admin Testing**:
   - Open `login.html`
   - Click debug login button
   - Test admin dashboard features
3. **Student Testing**:
   - Open `student-login.html`
   - Click debug login button
   - Test student submission features
4. **Sign-up Testing**:
   - Open `student-login.html`
   - Switch to "Create Account" tab
   - Use mentor code: `DEBUG-TEST`
   - Create a new test student

## Troubleshooting

**"Debug user not found" error:**
- Make sure you ran `setup-debug-mode.sql` in Supabase SQL Editor
- Check your browser console for specific errors
- Verify you're connected to the correct Supabase project

**Can't see debug button:**
- Make sure you're opening the correct files:
  - Admin: `login.html`
  - Student: `student-login.html`
- Try hard refresh: `Cmd/Ctrl + Shift + R`
- Check that JavaScript is enabled

**Connection errors:**
- Verify Supabase URL and anon key in `js/supabase-config.js`
- Check your internet connection
- Check Supabase project status

## Notes

- Debug mode uses the **same database** as production
- All debug users have predictable IDs starting with `00000000-0000-0000-0000-0000000000XX`
- Password hashing is simple base64 (NOT production-secure!)
- Debug data can be safely deleted by running the cleanup section of the SQL script
