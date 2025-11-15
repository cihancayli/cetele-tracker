# Debug Data Setup Guide 🚀

## What This Creates

A **complete dataset** for testing the Cetele Dashboard with realistic data:

- **8 Users:**
  - 1 ED (Educational Director)
  - 1 Coordinator (debug@test.com)
  - 6 Mentors (one for each group)

- **6 Groups:**
  - Aziz Group (10th Grade)
  - Cihan Group (11th Grade)
  - Fatima Group (9th Grade)
  - Omar Group (12th Grade)
  - Aisha Group (10th Grade)
  - Yusuf Group (11th Grade)

- **60 Students:**
  - 10 students per group
  - Realistic names (Ali, Sara, Mohamed, Fatima, etc.)
  - Each with a unique 4-character suffix

- **10 Activities:**
  - Kuran (Quran recitation)
  - Kitap (Book reading)
  - Teheccud (Night prayer)
  - Salat (Daily prayers)
  - Zikr (Remembrance)
  - Dua (Supplication)
  - Sadaka (Charity)
  - Halaqa (Study circle)
  - Volunteer (Community service)
  - Hadith (Hadith study)

- **6 Mentor Codes:**
  - MENTOR-AZIZ
  - MENTOR-CIHAN
  - MENTOR-FATIMA
  - MENTOR-OMAR
  - MENTOR-AISHA
  - MENTOR-YUSUF

- **180 Cetele Submissions:**
  - 3 weeks of data
  - Each student has 3 submissions (one per week)
  - Random completion rates (50-100%)
  - Realistic activity patterns

---

## How to Run

### Step 1: Open Supabase Dashboard
1. Go to https://supabase.com/dashboard
2. Select your project
3. Click **"SQL Editor"** in the left sidebar

### Step 2: Run the Script
1. Click **"New Query"**
2. Copy the **entire contents** of `populate-debug-data.sql`
3. Paste into the SQL editor
4. Click **"Run"** (or press Ctrl/Cmd + Enter)

### Step 3: Wait for Completion
The script will:
- Clean up any existing debug data
- Create all users, groups, students
- Generate 180 submissions with random data
- Show verification tables

You should see output like:
```
USERS: 8
GROUPS: 6
STUDENTS: 60
ACTIVITIES: 10
MENTOR CODES: 6
SUBMISSIONS: 180
```

And a summary table showing each group with student counts and submission stats.

---

## Login Credentials

After running the script, you can login as:

### Coordinator (Full Access)
- **Email:** `debug@test.com`
- **Password:** `debug123`
- **Access:** All pages, all groups, all data

### ED (Top Level)
- **Email:** `ed@debug.cetele`
- **Password:** `debug123`
- **Access:** Everything (highest level)

### Mentors (Limited Access)
- **Email:** `aziz@debug.cetele` (or cihan, fatima, omar, aisha, yusuf)
- **Password:** `debug123`
- **Access:** Only their own group's data

---

## What You'll See

### Dashboard Overview
After logging in as coordinator:

**Total Students:** 60
**This Week's Completion:** ~75% (varies due to random data)
**Active Streaks:** Varies
**Average Score:** ~75

### Groups Page
6 groups listed:
- Aziz Group (10 students)
- Cihan Group (10 students)
- Fatima Group (10 students)
- Omar Group (10 students)
- Aisha Group (10 students)
- Yusuf Group (10 students)

### Students Page
60 students total with realistic completion rates

### Weekly Cetele Page
- Navigate between 3 weeks of data
- See checkmarks for completed activities
- Each student has varying completion patterns

### Activities Summary Page
**This is where it gets interesting!**

You'll see:
- Total activities completed across all groups (varies, ~1000-1200)
- Most active group (usually varies)
- Average completion rate (~70-80%)

**Group Summaries** like:
```
👥 Aziz Group
10 students | 30 submissions | 215 total activities

Kuran: 25
Salat: 28
Kitap: 22
Zikr: 18
...
```

**Student Details:**
Each of the 60 students with their stats, completion %, and top activities

---

## Data Characteristics

### Realistic Patterns
- **Completion rates vary:** Each week, each student has 50-100% completion
- **Activity diversity:** Not all activities completed equally
- **Time progression:** 3 weeks of historical data
- **Group differences:** Each group will have different totals due to randomization

### Week Dates
The script creates submissions for:
- **Week 1:** 3 weeks ago (from current date)
- **Week 2:** 2 weeks ago
- **Week 3:** 1 week ago

So you can navigate back in the Weekly Cetele page and see data!

---

## Testing Scenarios

### Scenario 1: Coordinator View
**Login as:** `debug@test.com`

**Test:**
1. Navigate to Activities Summary
2. See all 6 groups with their totals
3. Change time filter to "This Week" vs "All Time"
4. Compare activity counts

**Expected:**
- All groups visible
- Activities Summary shows totals for each group
- Student details table has 60 rows

---

### Scenario 2: Mentor View
**Login as:** `aziz@debug.cetele`

**Test:**
1. Navigate to Groups - should only see Aziz Group
2. Navigate to Students - should only see 10 students from Aziz Group
3. Navigate to Weekly Cetele - should only see Aziz Group students
4. Navigate to Activities Summary - should only see Aziz Group data

**Expected:**
- Limited to own group only
- Can view mentor code: MENTOR-AZIZ
- Cannot see other groups' data

---

### Scenario 3: Delete Operations
**Login as:** `debug@test.com`

**Test:**
1. Go to Students page
2. Try deleting a student
3. Watch debug console for logs
4. Student should disappear
5. Refresh page - student still gone

**Expected:**
- Delete works (if RLS policies fixed)
- Debug console shows detailed logs
- UI updates immediately

---

### Scenario 4: Time-Based Filtering
**Login as:** `debug@test.com`

**Test:**
1. Go to Activities Summary
2. Set time filter to "This Week"
3. Note the total activities count
4. Change to "All Time"
5. Total should increase (~3x more)

**Expected:**
- This Week: ~400-450 activities
- All Time: ~1100-1300 activities

---

### Scenario 5: Weekly Navigation
**Login as:** `debug@test.com`

**Test:**
1. Go to Weekly Cetele
2. Click "Previous Week" multiple times
3. Should see data for all 3 weeks
4. Click "Next Week" to return

**Expected:**
- 3 weeks of data available
- Each week has different completion patterns
- Students have different checkmarks each week

---

## Verification Queries

If you want to check the data directly in Supabase:

### Count Students per Group
```sql
SELECT
    g.name,
    COUNT(s.id) AS student_count
FROM groups g
LEFT JOIN students s ON s.group_id = g.id
WHERE g.name LIKE '%Group'
GROUP BY g.name
ORDER BY g.name;
```

Expected: 10 students per group

### Count Submissions per Week
```sql
SELECT
    week_start_date,
    COUNT(*) AS submission_count,
    ROUND(AVG(
        (SELECT COUNT(*)::FLOAT
         FROM JSONB_EACH(activity_completions)
         WHERE value::TEXT = 'true')
    ), 1) AS avg_completed_activities
FROM cetele_submissions
GROUP BY week_start_date
ORDER BY week_start_date DESC;
```

Expected: 60 submissions per week, ~6-8 avg activities completed

### Show Top Students by Completion
```sql
SELECT
    s.name,
    g.name AS group_name,
    COUNT(cs.id) AS total_submissions,
    ROUND(AVG(
        (SELECT COUNT(*)::FLOAT
         FROM JSONB_EACH(cs.activity_completions)
         WHERE value::TEXT = 'true') * 100.0 / 10
    ), 1) AS avg_completion_percent
FROM students s
JOIN groups g ON g.id = s.group_id
LEFT JOIN cetele_submissions cs ON cs.student_id = s.id
GROUP BY s.id, s.name, g.name
ORDER BY avg_completion_percent DESC
LIMIT 10;
```

---

## Clean Up

If you want to start fresh and re-run the script:

The script **automatically cleans up** old debug data before creating new data, so you can run it multiple times safely!

It deletes:
- All students with names like "Student%" or matching the pattern
- All mentor codes like "MENTOR-%"
- All users with @debug.cetele emails
- All groups with names like "%Group"
- All submissions for deleted students

Then creates everything fresh.

---

## Troubleshooting

### No Data Showing
**Problem:** Dashboard loads but shows 0 students/groups

**Solution:**
1. Check if script ran successfully
2. Run verification queries above
3. Check browser console for errors
4. Verify RLS policies allow access

### Permission Errors
**Problem:** "Row level security policy violated"

**Solution:**
Run `FIX-RLS-POLICIES.sql` to allow anon access

### Students Not Loading
**Problem:** Students table is empty

**Solution:**
1. Check if `uuid_generate_v4()` function exists
2. Run: `CREATE EXTENSION IF NOT EXISTS "uuid-ossp";`
3. Re-run the populate script

### Submissions Missing
**Problem:** Weekly Cetele shows no data

**Solution:**
1. Check table name - should be `cetele_submissions`
2. Verify week dates are within range
3. Check console logs in debug console

---

## Expected Dashboard State

After populating data and logging in as coordinator:

### Overview Page
- **Total Students:** 60
- **Completion stats:** Populated with real percentages
- **Charts:** Show actual trends
- **Recent Submissions:** Last few submissions visible

### Groups Page
- 6 group cards
- Each showing 10 students
- Each has a mentor assigned

### Students Page
- 60 rows in table
- Names like "Ali a1b2", "Sara c3d4", etc.
- Completion rates vary from ~50-100%

### Weekly Cetele Page
- Table with 60 rows (all students)
- 10 activity columns
- Checkmarks scattered throughout
- Navigate between 3 weeks

### Activities Summary Page
**Group Summaries:**
```
👥 Aziz Group
10 students | 30 submissions | ~210 activities

Kuran: 24
Salat: 27
Kitap: 21
Zikr: 19
Teheccud: 15
```

(Numbers vary due to randomization)

**Student Details:**
60 rows with completion stats and top activities

---

## Performance Note

Generating 180 submissions can take **10-30 seconds** depending on your Supabase server performance. This is normal!

The script:
1. Creates users/groups (fast)
2. Creates 60 students (fast)
3. Generates 180 submissions with random data (slower - this is the bulk of the time)
4. Runs verification queries (fast)

Just wait for the "SUCCESS MESSAGE" at the end.

---

## Next Steps

After populating:

1. **Login:** http://localhost:8000/login.html
2. **Use:** `debug@test.com` / `debug123`
3. **Explore:** Navigate through all pages
4. **Test:** Try all features (delete, edit, filter, etc.)
5. **Debug:** Watch the debug console for logs
6. **Enjoy:** You now have realistic data to work with!

---

**File:** `populate-debug-data.sql`
**Run in:** Supabase SQL Editor
**Expected time:** 10-30 seconds
**Result:** Complete dataset ready for testing! 🎉
