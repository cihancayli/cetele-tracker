# Cetele Performance Tracker 🏆

A beautiful, modern web application for tracking student spiritual activities and progress with real-time analytics, built with Supabase backend.

## Features ✨

### Admin Portal
- **Comprehensive Dashboard**: View overall statistics and performance metrics
- **Group Management**: Create and manage student groups by grade/class
- **Student Management**: Add students and assign them to groups
- **Weekly View**: See all submissions for any week
- **Advanced Analytics**:
  - Progress tracking over time
  - Activity breakdown charts
  - Individual performance cards
  - Leaderboards with rankings
- **Beautiful Visualizations**: Interactive charts using Chart.js

### Student Portal
- **Easy Submission**: Simple interface to submit weekly activities
- **Progress Tracking**: View personal statistics and history
- **Visual Feedback**: Beautiful animations and success confirmations
- **Historical Data**: Review past submissions and progress trends
- **Motivational Messages**: Personalized encouragement based on performance

## Technology Stack 🛠️

- **Frontend**: HTML5, CSS3, Vanilla JavaScript
- **Backend**: Supabase (PostgreSQL database)
- **Charts**: Chart.js for data visualization
- **Animations**: CSS3 animations and transitions
- **Storage**: LocalStorage for session persistence

## Setup Instructions 🚀

### 1. Database Setup

1. Go to your Supabase project: https://fkagbfrkowrhvchnqbqt.supabase.co
2. Navigate to the SQL Editor
3. Copy and paste the following SQL schema:

```sql
-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Groups table
CREATE TABLE IF NOT EXISTS groups (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Students table
CREATE TABLE IF NOT EXISTS students (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    grade TEXT NOT NULL,
    group_id UUID REFERENCES groups(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Activities table
CREATE TABLE IF NOT EXISTS activities (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    type TEXT,
    order_index INTEGER,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Weekly submissions table
CREATE TABLE IF NOT EXISTS weekly_submissions (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    student_id UUID REFERENCES students(id) ON DELETE CASCADE,
    week_start_date DATE NOT NULL,
    activity_completions JSONB NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, week_start_date)
);

-- Users table for authentication
CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    role TEXT NOT NULL CHECK (role IN ('admin', 'student')),
    student_id UUID REFERENCES students(id),
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_students_group ON students(group_id);
CREATE INDEX IF NOT EXISTS idx_submissions_student ON weekly_submissions(student_id);
CREATE INDEX IF NOT EXISTS idx_submissions_week ON weekly_submissions(week_start_date);
CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

-- Row Level Security Policies
ALTER TABLE groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE students ENABLE ROW LEVEL SECURITY;
ALTER TABLE activities ENABLE ROW LEVEL SECURITY;
ALTER TABLE weekly_submissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- Allow all operations for authenticated users
CREATE POLICY "Allow all for authenticated users" ON groups FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON students FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON activities FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON weekly_submissions FOR ALL USING (auth.role() = 'authenticated');
CREATE POLICY "Allow all for authenticated users" ON users FOR ALL USING (auth.role() = 'authenticated');

-- Allow read access to anonymous users for public viewing
CREATE POLICY "Allow read for anonymous" ON groups FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON students FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON activities FOR SELECT USING (true);
CREATE POLICY "Allow read for anonymous" ON weekly_submissions FOR SELECT USING (true);
```

4. Run the SQL query to create all tables

### 2. Initial Data Setup

The application will automatically create default activities when first accessed. You can also manually add them:

```sql
INSERT INTO activities (name, description, type, order_index) VALUES
('Kitap', '35 pages', 'reading', 1),
('Risale Sohbet 1', 'First session', 'discussion', 2),
('Risale Sohbet 2', 'Second session', 'discussion', 3),
('Kuran', '7 pages', 'reading', 4),
('Kaset/Video', '60 minutes', 'media', 5),
('Teheccud', '3 times', 'prayer', 6),
('SWB/Dhikr', '101/day', 'prayer', 7);
```

### 3. Running the Application

#### Option A: Simple Local Server (Recommended)

1. Install a simple HTTP server:
   ```bash
   # Using Python 3
   cd cetele-dashboard
   python3 -m http.server 8000
   ```

2. Open your browser and navigate to:
   - Landing Page: http://localhost:8000
   - Admin Portal: http://localhost:8000/admin.html
   - Student Portal: http://localhost:8000/student.html

#### Option B: VS Code Live Server

1. Install "Live Server" extension in VS Code
2. Right-click on `index.html` and select "Open with Live Server"

#### Option C: Deploy to Production

Deploy to any static hosting service:
- **Netlify**: Drag and drop the folder
- **Vercel**: Connect your GitHub repo
- **GitHub Pages**: Enable in repository settings
- **Cloudflare Pages**: Connect and deploy

## Usage Guide 📖

### For Administrators

1. **First Time Setup**:
   - Open Admin Portal
   - Navigate to "Manage Groups"
   - Create your groups (e.g., "10th Grade A", "11th Grade B")
   - Navigate to "Manage Students"
   - Add students and assign them to groups

2. **Viewing Analytics**:
   - **Overview**: See overall statistics, trends, and leaderboards
   - **Groups**: View group-specific performance
   - **Students**: View individual student progress
   - **Weekly View**: Check submissions for any specific week
   - **Analytics**: Deep dive into advanced metrics

3. **Filtering Data**:
   - Use group filters to focus on specific classes
   - Navigate between weeks to see historical data

### For Students

1. **First Time Access**:
   - Open Student Portal
   - Select your name from the dropdown OR
   - Click "I'm New - Add Me" to register

2. **Submitting Weekly Data**:
   - Check off completed activities
   - Click "Save My Progress"
   - See your completion rate in real-time

3. **Viewing Progress**:
   - Click "My Progress" to see your statistics
   - Review your weekly history
   - Get personalized encouragement messages

## Project Structure 📁

```
cetele-dashboard/
├── index.html              # Landing page
├── admin.html              # Admin dashboard
├── student.html            # Student portal
├── css/
│   ├── admin.css          # Admin styles
│   └── student.css        # Student styles
├── js/
│   ├── supabase-config.js # Database configuration
│   ├── db-helper.js       # Database helper functions
│   ├── admin.js           # Admin logic
│   └── student.js         # Student logic
└── README.md              # This file
```

## Key Features Explained 🔑

### Real-time Score Updates
As students check activities, their score updates immediately with smooth animations.

### Persistent Sessions
Students' selections are saved locally, so they don't need to re-select their name on every visit.

### Beautiful Animations
- Smooth transitions between sections
- Success animations on submission
- Hover effects on cards
- Progress bar animations
- Background gradient animations

### Responsive Design
Works perfectly on:
- Desktop computers
- Tablets
- Mobile phones

### Data Analytics
- Weekly trends over 8 weeks
- Activity completion rates
- Student rankings
- Group comparisons
- Individual performance tracking

## Customization 🎨

### Changing Activities

Edit activities in the Supabase database or modify the default activities in `js/db-helper.js`:

```javascript
const defaultActivities = [
    { name: 'Your Activity', description: 'Description', type: 'type', order_index: 1 },
    // Add more activities...
];
```

### Styling

All colors and styles are defined using CSS variables in the `:root` section:

```css
:root {
    --primary: #6366f1;
    --secondary: #8b5cf6;
    --success: #10b981;
    /* Modify these to change the theme */
}
```

### Adding New Features

The modular structure makes it easy to add features:
- Database functions: `js/db-helper.js`
- Admin UI: `admin.html` + `js/admin.js`
- Student UI: `student.html` + `js/student.js`

## Troubleshooting 🔧

### "No data available"
- Ensure the database tables are created
- Check that activities are initialized
- Verify Supabase connection in browser console

### Charts not showing
- Check that Chart.js CDN is loading
- Verify data is being fetched from database
- Check browser console for errors

### Students can't submit
- Verify they've selected their name
- Check Supabase policies allow anonymous writes
- Ensure activities are loaded

## Security Notes 🔒

Current setup allows anonymous access for easy deployment. For production:

1. **Enable Authentication**:
   - Set up Supabase Auth
   - Add login/signup pages
   - Restrict policies to authenticated users

2. **Add Admin Protection**:
   - Implement role-based access
   - Protect admin routes
   - Add password protection

3. **Data Validation**:
   - Add input sanitization
   - Implement rate limiting
   - Add CSRF protection

## Future Enhancements 💡

Potential features to add:
- [ ] Email notifications
- [ ] Export data to Excel/PDF
- [ ] Mobile app version
- [ ] Push notifications
- [ ] Custom activity templates
- [ ] Streak tracking
- [ ] Achievement badges
- [ ] Social sharing
- [ ] Multi-language support
- [ ] Dark/Light theme toggle

## Support 💬

For issues or questions:
1. Check the browser console for errors
2. Verify database connection
3. Review Supabase logs
4. Check this README for common solutions

## License 📄

This project is open source and available for educational purposes.

---

Built with ❤️ for spiritual growth tracking
