// Authentication Module

// Default admin credentials (change these in production!)
const DEFAULT_ADMIN_EMAIL = 'admin@cetele.app';
const DEFAULT_ADMIN_PASSWORD = 'cetele2024';

// Initialize
async function init() {
    await loadStudentsForLogin();
    checkExistingSession();
}

// Check if user is already logged in
function checkExistingSession() {
    const session = localStorage.getItem('cetele_session');
    if (session) {
        const sessionData = JSON.parse(session);

        // Check if session is still valid (24 hours)
        const sessionAge = Date.now() - sessionData.timestamp;
        if (sessionAge < 24 * 60 * 60 * 1000) {
            // Redirect to appropriate portal
            if (sessionData.role === 'admin') {
                window.location.href = 'admin.html';
            } else {
                window.location.href = 'student.html';
            }
        } else {
            // Session expired
            localStorage.removeItem('cetele_session');
        }
    }
}

// Switch between tabs
function switchTab(tab) {
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    document.querySelectorAll('.form-section').forEach(s => s.classList.remove('active'));

    event.target.classList.add('active');
    document.getElementById(`${tab}Form`).classList.add('active');

    hideMessage();
}

// Load students for login dropdown
async function loadStudentsForLogin() {
    try {
        const students = await DatabaseHelper.getStudents();
        const select = document.getElementById('studentSelect');

        students.forEach(student => {
            const option = document.createElement('option');
            option.value = student.id;
            option.textContent = `${student.name} - ${student.grade}`;
            select.appendChild(option);
        });
    } catch (error) {
        console.error('Error loading students:', error);
    }
}

// Admin Login
async function adminLogin(event) {
    event.preventDefault();

    const email = document.getElementById('adminEmail').value.trim();
    const password = document.getElementById('adminPassword').value;
    const btn = document.getElementById('adminLoginBtn');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
        // Method 1: Check default credentials
        if (email === DEFAULT_ADMIN_EMAIL && password === DEFAULT_ADMIN_PASSWORD) {
            createSession('admin', email, null);
            showMessage('Login successful! Redirecting...', 'success');
            setTimeout(() => {
                window.location.href = 'admin.html';
            }, 1000);
            return;
        }

        // Method 2: Try Supabase Auth
        const { data, error } = await supabase.auth.signInWithPassword({
            email,
            password
        });

        if (error) {
            throw new Error('Invalid credentials. Use default: admin@cetele.app / cetele2024');
        }

        // Check if user has admin role
        const { data: userData } = await supabase
            .from('users')
            .select('role')
            .eq('email', email)
            .single();

        if (userData?.role !== 'admin') {
            throw new Error('You do not have admin access');
        }

        createSession('admin', email, data.user.id);
        showMessage('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'admin.html';
        }, 1000);

    } catch (error) {
        showMessage(error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Sign In as Admin';
    }
}

// Student Login
async function studentLogin(event) {
    event.preventDefault();

    const studentId = document.getElementById('studentSelect').value;
    const code = document.getElementById('studentCode').value.trim();
    const btn = document.getElementById('studentLoginBtn');

    if (!studentId) {
        showMessage('Please select your name', 'error');
        return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
        // Get student data
        const student = await DatabaseHelper.getStudentById(studentId);

        if (!student) {
            throw new Error('Student not found');
        }

        // If code is required and provided, verify it (optional feature)
        if (code) {
            // You can implement code verification here
            // For now, we'll accept any code
        }

        createSession('student', student.name, studentId);
        showMessage('Login successful! Redirecting...', 'success');

        setTimeout(() => {
            window.location.href = 'student.html';
        }, 1000);

    } catch (error) {
        showMessage(error.message, 'error');
        btn.disabled = false;
        btn.textContent = 'Continue as Student';
    }
}

// Send Magic Link
async function sendMagicLink(role) {
    const email = role === 'admin'
        ? document.getElementById('adminEmail').value.trim()
        : prompt('Enter your email address:');

    if (!email) return;

    try {
        const { error } = await supabase.auth.signInWithOtp({
            email,
            options: {
                emailRedirectTo: window.location.origin + (role === 'admin' ? '/admin.html' : '/student.html')
            }
        });

        if (error) throw error;

        showMessage('Magic link sent! Check your email.', 'success');
    } catch (error) {
        showMessage('Error sending magic link: ' + error.message, 'error');
    }
}

// Create Session
function createSession(role, identifier, userId) {
    const session = {
        role,
        identifier,
        userId,
        timestamp: Date.now()
    };

    localStorage.setItem('cetele_session', JSON.stringify(session));

    // Also store student ID for backward compatibility
    if (role === 'student' && userId) {
        localStorage.setItem('studentId', userId);
    }
}

// Show/Hide Messages
function showMessage(text, type) {
    const messageEl = document.getElementById('message');
    messageEl.textContent = text;
    messageEl.className = `message ${type}`;
    messageEl.style.display = 'block';
}

function hideMessage() {
    document.getElementById('message').style.display = 'none';
}

// Check Authentication (use this in admin.html and student.html)
function checkAuth(requiredRole) {
    const session = localStorage.getItem('cetele_session');

    if (!session) {
        window.location.href = 'login.html';
        return null;
    }

    const sessionData = JSON.parse(session);

    // Check if session is expired (24 hours)
    const sessionAge = Date.now() - sessionData.timestamp;
    if (sessionAge > 24 * 60 * 60 * 1000) {
        localStorage.removeItem('cetele_session');
        window.location.href = 'login.html';
        return null;
    }

    // Check if role matches
    if (sessionData.role !== requiredRole) {
        window.location.href = 'login.html';
        return null;
    }

    return sessionData;
}

// Logout function (global)
function logout() {
    if (confirm('Are you sure you want to logout?')) {
        localStorage.removeItem('cetele_session');
        localStorage.removeItem('studentId');
        window.location.href = 'login.html';
    }
}

// Initialize on page load
if (window.location.pathname.includes('login.html')) {
    window.addEventListener('DOMContentLoaded', init);
}
