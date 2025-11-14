# 🚀 Quick Start Guide

## Step 1: Set Up Database (5 minutes)

1. **Open Supabase SQL Editor**:
   - Go to: https://supabase.com/dashboard/project/fkagbfrkowrhvchnqbqt/editor
   - Or navigate to: Supabase Dashboard → Your Project → SQL Editor

2. **Run the Setup Script**:
   - Open the file `setup-database.sql` in this folder
   - Copy ALL the contents
   - Paste into the Supabase SQL Editor
   - Click "Run" or press Ctrl+Enter

3. **Verify Success**:
   - You should see a success message
   - Check that tables were created: groups, students, activities, weekly_submissions
   - You should see 7 default activities created

## Step 2: Launch the Application

### Option A: Using the Launch Script (Mac/Linux)
```bash
cd ~/cetele-dashboard
./launch.sh
```

### Option B: Manual Launch
```bash
cd ~/cetele-dashboard
python3 -m http.server 8000
```

## Step 3: Open in Browser

Once the server is running, open these URLs:

- **Landing Page**: http://localhost:8000
- **Admin Portal**: http://localhost:8000/admin.html
- **Student Portal**: http://localhost:8000/student.html

## Step 4: First Time Setup (Admin)

1. Go to Admin Portal: http://localhost:8000/admin.html
2. Click "Manage Groups"
3. Add your first group:
   - Click "➕ Add Group"
   - Enter name (e.g., "10th Grade A")
   - Enter grade (e.g., "10th")
   - Click "Add Group"

4. Click "Manage Students"
5. Add your first student:
   - Click "➕ Add Student"
   - Enter student name
   - Enter grade
   - Select group (optional)
   - Click "Add Student"

## Step 5: Test Student Submission

1. Go to Student Portal: http://localhost:8000/student.html
2. Select your name from dropdown (or register as new)
3. Check off some activities
4. Click "💾 Save My Progress"
5. Check "📊 My Progress" to see your stats

## Step 6: View in Admin Dashboard

1. Go back to Admin Portal
2. Click "📈 Overview" to see:
   - Overall statistics
   - Leaderboard
   - Charts and trends
3. Explore other sections:
   - 👥 Groups - View group performance
   - 🎓 Students - See all students
   - 📅 Weekly View - Check submissions by week
   - 📊 Analytics - Deep dive into data

## Troubleshooting

### "No data available" or Charts not showing
- Make sure you ran the database setup SQL
- Check browser console (F12) for errors
- Verify Supabase URL and API key in `js/supabase-config.js`

### Server won't start
- Make sure port 8000 is not in use
- Try a different port: `python3 -m http.server 3000`
- Then access: http://localhost:3000

### Database connection errors
- Verify you're using the correct Supabase project
- Check that RLS policies allow anonymous access
- Ensure API key is correct in `supabase-config.js`

## Default Activities

The system comes with 7 default activities:
1. Kitap (35 pages)
2. Risale Sohbet 1 (First session)
3. Risale Sohbet 2 (Second session)
4. Kuran (7 pages)
5. Kaset/Video (60 minutes)
6. Teheccud (3 times)
7. SWB/Dhikr (101/day)

You can add more activities through the Supabase database.

## Next Steps

Once everything is working locally:

1. **Add more students and groups**
2. **Collect weekly submissions**
3. **View analytics and trends**
4. **Deploy to production** (see README.md for deployment options)

## Need Help?

- Check the full README.md for detailed documentation
- Open browser console (F12) to see error messages
- Verify database tables in Supabase Dashboard

---

**Ready?** Let's get started! 🎉
