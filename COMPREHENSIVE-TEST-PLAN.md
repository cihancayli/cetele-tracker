# Comprehensive Testing Plan - Admin Dashboard Fixes

## Testing Date: 2025-11-15
## Dashboard Version: admin-new-fixed.js

---

## 🎯 THREE CRITICAL FIXES TO TEST

### Fix 1: Weekly Cetele Submissions Viewing
**Problem:** Can't view weekly cetele submissions
**Solution:** Fixed date comparison, added comprehensive logging, improved data loading

### Fix 2: Dual Role Privileges (Coordinator + Mentor)
**Problem:** Coordinators who are also mentors don't have mentor privileges
**Solution:** Implemented `hasPermission()` function checking both role field and flags

### Fix 3: Mentor Code Display
**Problem:** Mentor code not displaying/working
**Solution:** Added detailed error handling, logging, and fallback messages

---

## 📋 TEST SCENARIOS

### A. WEEKLY CETELE VIEWING TESTS

#### Test A1: View Current Week Cetele
**Steps:**
1. Login as coordinator: `debug@test.com` / `debug123`
2. Navigate to "Weekly Cetele" page
3. Check console for logs:
   - "Loading cetele data..."
   - "All students: X"
   - "All activities: X"
   - "Week submissions found: X"

**Expected Result:**
- Table displays with all students in rows
- All activities in columns
- Checkmarks (✓) show completed activities
- Total percentage shows at end of each row
- Week display shows correct date range

**Console Logs to Check:**
```
Loading cetele data...
All students: [number]
All activities: [number]
Current week start: [date]
Week submissions found: [number]
```

**Failure Indicators:**
- "No submissions found" when data exists
- Empty table body
- Console errors about date parsing
- Missing activity columns

---

#### Test A2: Navigate Between Weeks
**Steps:**
1. On Weekly Cetele page
2. Click "Next Week →" button
3. Check week display updates
4. Check console logs for new week date
5. Click "← Previous Week" button
6. Verify it returns to original week

**Expected Result:**
- Week display updates correctly
- Submissions load for new week
- Navigation works smoothly
- Console shows correct week dates

**Console Logs:**
```
Loading cetele data...
Current week start: [new date]
Week submissions found: [number for new week]
```

---

#### Test A3: Filter by Group
**Steps:**
1. On Weekly Cetele page
2. Select a specific group from dropdown
3. Verify only students from that group show
4. Select "All Groups"
5. Verify all students show again

**Expected Result:**
- Filtering works instantly
- Correct students displayed
- Activity data still loads properly

---

#### Test A4: Empty State (No Submissions)
**Steps:**
1. Navigate to a future week (use Next Week multiple times)
2. Check for appropriate empty message

**Expected Result:**
- Shows "No submissions found for this week" or similar
- Helpful message displayed
- No JavaScript errors

---

### B. DUAL ROLE PRIVILEGES TESTS

#### Test B1: Coordinator with Mentor Flag
**Steps:**
1. Check database for user with `is_coordinator=true` AND `is_mentor=true`
2. Login as that user
3. Navigate to each page and verify full access:
   - Overview: Can view all stats
   - Analytics: Can view all charts
   - Hierarchy: Can view full tree
   - Groups: Can create/edit/delete groups
   - Students: Can add/edit/remove students
   - Weekly Cetele: Can view AND edit ALL groups
   - Mentor Code: Can view mentor code
   - Activities: Can add/edit/delete activities

**Expected Result:**
- User has FULL coordinator privileges
- PLUS mentor code visibility
- PLUS ability to edit own group's cetele

**Console Verification:**
```javascript
// In console, type:
hasPermission('edit_own_cetele')  // Should return true
hasPermission('manage_groups')     // Should return true
currentUser.is_coordinator         // Should be true
currentUser.is_mentor              // Should be true
```

---

#### Test B2: Permission Hierarchy Check
**Steps:**
1. Open browser console on any page
2. Check currentUser object:
```javascript
console.log('User:', currentUser);
console.log('Role:', currentUser.role);
console.log('Is Coordinator:', currentUser.is_coordinator);
console.log('Is Mentor:', currentUser.is_mentor);
```

**Expected Output:**
```javascript
{
  id: "...",
  role: "coordinator",
  is_coordinator: true,
  is_mentor: true,  // If dual role
  username: "...",
  ...
}
```

---

#### Test B3: Mentor-Only User (No Coordinator Flag)
**Steps:**
1. Login as pure mentor: Check database for `role='mentor'` AND `is_coordinator=false`
2. Verify LIMITED access:
   - Overview: Can view own group stats only
   - Groups: CANNOT create/edit groups
   - Students: Can view own group students only
   - Weekly Cetele: Can edit OWN group only
   - Mentor Code: CAN view code
   - Activities: CANNOT add/edit activities

**Expected Result:**
- Restricted view appropriate to mentor role
- No unauthorized action buttons visible

---

### C. MENTOR CODE TESTS

#### Test C1: View Mentor Code (Has Code)
**Steps:**
1. Login as mentor user
2. Navigate to "Mentor Code" page
3. Check console for:
   - "Loading mentor code..."
   - "Current user: [object]"
   - "Mentor codes query result: [object]"

**Expected Result:**
- Code displays in large text (e.g., "DEBUG-TEST")
- Student count shows number enrolled
- Copy button is visible and functional

**Console Logs:**
```
Loading mentor code...
Current user: {id: "...", role: "mentor", is_mentor: true}
Mentor codes query result: {mentorCodes: Array(1), error: null}
Code display: DEBUG-TEST
```

---

#### Test C2: Copy Mentor Code
**Steps:**
1. On Mentor Code page with code visible
2. Click "📋 Copy to Clipboard" button
3. Paste somewhere (e.g., notepad)

**Expected Result:**
- Code copies successfully
- Can be pasted correctly
- Optional: Toast/success message appears

---

#### Test C3: No Mentor Code Assigned
**Steps:**
1. Login as user with `role='coordinator'` but no entry in `mentor_codes` table
2. Navigate to Mentor Code page

**Expected Result:**
- Shows "Not a mentor" OR
- Shows "No code assigned" with helpful instructions
- Console logs explain why no code shown

**Console Logs:**
```
Loading mentor code...
Current user: {role: "coordinator", is_mentor: false}
User is not a mentor
```

---

#### Test C4: Student Count Accuracy
**Steps:**
1. On Mentor Code page with code visible
2. Note the student count
3. Check database: Count students with matching mentor_code
4. Verify numbers match

**Database Query:**
```sql
SELECT COUNT(*) FROM students WHERE mentor_code = 'DEBUG-TEST';
```

**Expected Result:**
- Displayed count matches database count

---

### D. DATA LOADING & FILTERING TESTS

#### Test D1: Initial Data Load
**Steps:**
1. Login as coordinator
2. Open browser console
3. Navigate to Overview page
4. Check console for data loading logs

**Expected Console Output:**
```
Loading all data...
Loading user data...
Loading groups...
Loading students...
Loading cetele submissions...
All data loaded successfully
Total groups: X
Total students: X
Total submissions: X
```

---

#### Test D2: Mentor Data Filtering
**Steps:**
1. Login as pure mentor (not coordinator)
2. Navigate to Overview page
3. Check console logs
4. Verify only own group data loads

**Expected Console Output:**
```
Loading all data...
User role: mentor
Loading groups for mentor group_id: [uuid]
Loading students for group: [uuid]
Groups loaded: 1
Students loaded: [number in mentor's group]
```

---

#### Test D3: Chart Rendering
**Steps:**
1. On Overview page, check for two charts:
   - Completion Trends (line chart)
   - Activity Breakdown (doughnut chart)
2. Navigate away and back
3. Verify charts re-render without memory leaks

**Expected Result:**
- Charts display properly
- No console errors about canvas contexts
- Charts update when navigating back

**Console Check:**
```
Rendering charts...
Trends chart rendered
Activity chart rendered
```

---

### E. CRUD OPERATIONS TESTS

#### Test E1: Create Group
**Steps:**
1. Login as coordinator
2. Navigate to Groups page
3. Click "+ Create Group"
4. Fill in group details
5. Submit

**Expected Result:**
- Modal appears
- Form validates
- Group created successfully
- Groups list updates
- Success message shown

---

#### Test E2: Add Student
**Steps:**
1. Navigate to Students page
2. Click "+ Add Student"
3. Fill student details
4. Select group
5. Submit

**Expected Result:**
- Student added to database
- Appears in students table
- Group filter works

---

#### Test E3: Edit Cetele Submission
**Steps:**
1. Navigate to Weekly Cetele
2. Click on a checkbox for an activity
3. Verify it toggles
4. Check database for update

**Expected Result:**
- Checkbox toggles visually
- Database updates immediately
- Percentage recalculates
- No errors in console

---

#### Test E4: Add Activity
**Steps:**
1. Navigate to Activities page
2. Click "+ Add Activity"
3. Enter activity name
4. Submit

**Expected Result:**
- Activity created
- Appears in activities list
- Shows up in cetele table

---

### F. PERMISSION BOUNDARY TESTS

#### Test F1: Mentor Cannot Create Groups
**Steps:**
1. Login as mentor (not coordinator)
2. Navigate to Groups page
3. Check if "+ Create Group" button visible

**Expected Result:**
- Button is HIDDEN or DISABLED
- If clicked (via console), operation fails with permission error

---

#### Test F2: Mentor Cannot Edit Other Groups' Cetele
**Steps:**
1. Login as mentor
2. Navigate to Weekly Cetele
3. Filter to show all groups
4. Try to edit another group's submission

**Expected Result:**
- Checkboxes for other groups are DISABLED
- Only own group is editable
- Console shows permission check

---

#### Test F3: Student Cannot Access Admin
**Steps:**
1. Login as student
2. Try to navigate to admin-new.html directly

**Expected Result:**
- Redirected to login.html
- Session check fails
- Role mismatch detected

---

### G. STRESS TESTS

#### Test G1: Large Data Load
**Steps:**
1. Check database for total records
2. Login as coordinator (sees all data)
3. Navigate through all pages
4. Monitor console for performance

**Benchmarks:**
- Page load: < 3 seconds
- Data fetch: < 2 seconds
- Chart render: < 1 second
- No memory leaks

---

#### Test G2: Rapid Navigation
**Steps:**
1. Quickly click through all nav items multiple times
2. Check for:
   - Memory leaks
   - Duplicate requests
   - Chart destruction issues

**Expected Result:**
- Smooth transitions
- No console errors
- Charts properly destroyed and recreated

---

#### Test G3: Concurrent Edits
**Steps:**
1. Open two browser windows
2. Login as coordinator in both
3. Edit same cetele submission from both
4. Check for conflicts

**Expected Result:**
- Last edit wins
- No data corruption
- Both windows sync on refresh

---

## 🔍 DEBUGGING CHECKLIST

### Before Each Test:
- [ ] Clear browser cache
- [ ] Open browser console
- [ ] Check for JavaScript errors
- [ ] Monitor network requests

### During Each Test:
- [ ] Watch console logs
- [ ] Check network tab for API calls
- [ ] Verify UI updates match expectations
- [ ] Test error handling by forcing errors

### After Each Test:
- [ ] Check database for correct updates
- [ ] Verify no orphaned data
- [ ] Clear localStorage/sessionStorage
- [ ] Restart if needed

---

## 🐛 KNOWN ISSUES TO VERIFY FIXED

### Issue 1: Weekly Cetele Not Showing
**Status:** SHOULD BE FIXED
**Verification:**
- [ ] Cetele table renders
- [ ] Activities show as columns
- [ ] Students show as rows
- [ ] Checkmarks display correctly
- [ ] Week navigation works

**If Still Broken:**
- Check console for "Loading cetele data..." logs
- Verify `allStudents` and `allActivities` arrays populated
- Check date comparison logic in `loadCeteleData()`

---

### Issue 2: Dual Role Privileges
**Status:** SHOULD BE FIXED
**Verification:**
- [ ] Coordinator+mentor has full access
- [ ] Can view mentor code
- [ ] Can edit own group's cetele
- [ ] Has coordinator-level permissions
- [ ] `hasPermission()` returns true for all permissions

**If Still Broken:**
- Check `currentUser.is_coordinator` and `currentUser.is_mentor` flags
- Verify `hasPermission()` function logic
- Check database user record for correct flags

---

### Issue 3: Mentor Code Not Displaying
**Status:** SHOULD BE FIXED
**Verification:**
- [ ] Code displays for mentors
- [ ] "No code assigned" shows appropriately
- [ ] Student count accurate
- [ ] Copy functionality works
- [ ] Console logs explain behavior

**If Still Broken:**
- Check console for "Loading mentor code..." logs
- Verify `mentor_codes` table has entry
- Check `mentor_id` matches `currentUser.id`
- Verify `is_active = true` in database

---

## 📊 EXPECTED CONSOLE OUTPUT (Normal Operation)

### Page Load (Overview):
```
Checking authentication...
Session found: {role: "coordinator", ...}
User authenticated successfully
Loading all data...
Loading user data...
User loaded: {id: "...", username: "...", role: "coordinator"}
Loading groups...
Groups loaded: 3
Loading students...
Students loaded: 15
Loading activities...
Activities loaded: 5
Loading cetele submissions...
Submissions loaded: 42
All data loaded successfully
Rendering charts...
Trends chart rendered
Activity chart rendered
Loading overview stats...
Overview stats loaded
```

### Navigation to Cetele:
```
Navigating to page: cetele
Loading cetele filters...
Loading cetele data...
All students: 15
All activities: 5
Current week start: Mon Nov 11 2025
Week submissions found: 8
Building cetele table...
Cetele table rendered: 15 rows, 5 columns
```

### Mentor Code Page:
```
Navigating to page: mentor-code
Loading mentor code...
Current user: {id: "...", role: "mentor", is_mentor: true}
Querying mentor codes for mentor_id: ...
Mentor codes query result: {mentorCodes: [{code: "DEBUG-TEST", ...}], error: null}
Code display: DEBUG-TEST
Loading enrolled students count...
Students enrolled: 5
Mentor code page loaded
```

---

## 🚨 ERROR SCENARIOS TO TEST

### Scenario 1: Network Failure
**Steps:**
1. Disconnect internet
2. Try to load data
3. Check error handling

**Expected:**
- Graceful error message
- No app crash
- Retry option or instruction

---

### Scenario 2: Invalid Session
**Steps:**
1. Manually corrupt localStorage.cetele_session
2. Refresh page

**Expected:**
- Redirect to login
- Session cleared
- Clean error message

---

### Scenario 3: Missing Database Records
**Steps:**
1. Login as mentor with no mentor_code record
2. Check Mentor Code page

**Expected:**
- "No code assigned" message
- Helpful instructions
- No JavaScript errors

---

### Scenario 4: Empty Data States
**Steps:**
1. Check page with no data (e.g., new group with no students)

**Expected:**
- Appropriate empty state message
- Helpful call-to-action
- No broken UI

---

## ✅ TEST COMPLETION CHECKLIST

### Critical Fixes:
- [ ] Weekly Cetele displays correctly
- [ ] Week navigation works
- [ ] Activity columns show all activities
- [ ] Checkmarks toggle and save
- [ ] Coordinator+mentor has full permissions
- [ ] Mentor code displays for mentors
- [ ] Student count is accurate
- [ ] Copy code works

### All Features:
- [ ] Overview stats load
- [ ] Charts render properly
- [ ] Analytics page works
- [ ] Hierarchy displays
- [ ] Groups CRUD works
- [ ] Students CRUD works
- [ ] Activities CRUD works
- [ ] Navigation is smooth
- [ ] Logout works
- [ ] Session persists correctly

### Performance:
- [ ] Pages load in < 3s
- [ ] No memory leaks
- [ ] Charts don't duplicate
- [ ] Data fetches are efficient
- [ ] No console errors

### Security:
- [ ] Mentors can't access other groups
- [ ] Students can't access admin
- [ ] Sessions expire properly
- [ ] Permissions enforced server-side

---

## 📝 BUG REPORT TEMPLATE

**If You Find a Bug:**

```
BUG REPORT
----------
Date: [date]
Page: [page name]
User Role: [coordinator/mentor/student]
Browser: [browser and version]

Description:
[What were you trying to do?]

Steps to Reproduce:
1.
2.
3.

Expected Result:
[What should happen?]

Actual Result:
[What actually happened?]

Console Logs:
[Paste relevant console output]

Error Messages:
[Any error messages shown]

Screenshots:
[If applicable]

Database State:
[Relevant database queries/results]
```

---

## 🎯 SUCCESS CRITERIA

All three critical issues MUST be fixed:

1. ✅ **Cetele Viewing:** Table displays with all students, activities, checkmarks, and week navigation works
2. ✅ **Dual Roles:** Coordinators with mentor flag have full permissions including mentor code access
3. ✅ **Mentor Code:** Code displays correctly with student count and copy functionality

Secondary criteria:
- All CRUD operations work without errors
- Permission system enforces boundaries correctly
- No console errors during normal operation
- Performance is acceptable (pages load quickly)
- Empty states and error handling work properly

---

## 📞 TESTING SUPPORT

**Console Commands for Debugging:**

```javascript
// Check current user
console.log('User:', currentUser);

// Check permission
console.log('Can edit:', hasPermission('edit_own_cetele'));

// Check loaded data
console.log('Students:', allStudents.length);
console.log('Groups:', allGroups.length);
console.log('Activities:', allActivities.length);
console.log('Submissions:', allSubmissions.length);

// Check session
console.log('Session:', JSON.parse(localStorage.getItem('cetele_session')));

// Force data reload
loadAllData();
```

---

**End of Test Plan**
Generated: 2025-11-15
Version: 1.0
