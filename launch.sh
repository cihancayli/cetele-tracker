#!/bin/bash

# Cetele Dashboard Launch Script

echo "🚀 Launching Cetele Performance Tracker..."
echo ""
echo "📍 Server will be available at:"
echo "   - Landing Page:   http://localhost:8000"
echo "   - Admin Portal:   http://localhost:8000/admin.html"
echo "   - Student Portal: http://localhost:8000/student.html"
echo ""
echo "⚠️  IMPORTANT: Before using the app, set up the database:"
echo "   1. Go to: https://supabase.com/dashboard/project/fkagbfrkowrhvchnqbqt/editor"
echo "   2. Open the SQL Editor"
echo "   3. Copy and paste the contents of 'setup-database.sql'"
echo "   4. Run the SQL query"
echo ""
echo "Press Ctrl+C to stop the server"
echo ""
echo "----------------------------------------"
echo ""

# Start the server
python3 -m http.server 8000
