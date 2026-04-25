// Authentication API Functions
const API_BASE = '/api';
let currentUser = null;
let authToken = null;

// Check authentication on page load
function checkAuth() {
    const token = localStorage.getItem('authToken');
    const user = localStorage.getItem('user');
    
    if (token && user) {
        authToken = token;
        currentUser = JSON.parse(user);
        showDashboard();
    }
}

// Toggle between login and register forms
function toggleForms() {
    const loginForm = document.getElementById('loginForm');
    const registerForm = document.getElementById('registerForm');
    loginForm.style.display = loginForm.style.display === 'none' ? 'block' : 'none';
    registerForm.style.display = registerForm.style.display === 'none' ? 'block' : 'none';
}

// Handle login
async function handleLogin(event) {
    event.preventDefault();
    const username = document.getElementById('loginUsername').value;
    const password = document.getElementById('loginPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/login`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showMessage('تم تسجيل الدخول بنجاح! 🎉', 'success');
            setTimeout(() => showDashboard(), 500);
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('❌ خطأ في الاتصال: ' + error.message, 'error');
    }
}

// Handle register
async function handleRegister(event) {
    event.preventDefault();
    const username = document.getElementById('regUsername').value;
    const email = document.getElementById('regEmail').value;
    const password = document.getElementById('regPassword').value;

    try {
        const response = await fetch(`${API_BASE}/auth/register`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ username, email, password })
        });

        const data = await response.json();

        if (data.success) {
            authToken = data.token;
            currentUser = data.user;
            
            localStorage.setItem('authToken', authToken);
            localStorage.setItem('user', JSON.stringify(currentUser));
            
            showMessage('تم إنشاء الحساب بنجاح! 🎊', 'success');
            setTimeout(() => showDashboard(), 500);
        } else {
            showMessage('❌ ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('❌ خطأ في الاتصال: ' + error.message, 'error');
    }
}

// Logout
function logout() {
    localStorage.removeItem('authToken');
    localStorage.removeItem('user');
    authToken = null;
    currentUser = null;
    
    showMessage('تم تسجيل الخروج بنجاح', 'info');
    setTimeout(() => {
        document.getElementById('authSection').style.display = 'grid';
        document.getElementById('dashboardSection').classList.remove('active');
        document.getElementById('userInfo').classList.remove('active');
        document.getElementById('loginForm').style.display = 'block';
        document.getElementById('registerForm').style.display = 'none';
        
        // Clear form inputs
        document.getElementById('loginUsername').value = '';
        document.getElementById('loginPassword').value = '';
        document.getElementById('regUsername').value = '';
        document.getElementById('regEmail').value = '';
        document.getElementById('regPassword').value = '';
    }, 500);
}

// Show dashboard
function showDashboard() {
    document.getElementById('authSection').style.display = 'none';
    document.getElementById('dashboardSection').classList.add('active');
    document.getElementById('userInfo').classList.add('active');
    document.getElementById('userName').textContent = currentUser.username;
    document.getElementById('userAvatar').textContent = currentUser.username.charAt(0).toUpperCase();
    document.getElementById('welcomeMessage').textContent = `مرحباً بك يا ${currentUser.username}! 👋`;
    
    loadStats();
}

// Load game statistics
async function loadStats() {
    try {
        const response = await fetch(`${API_BASE}/stats`);
        const data = await response.json();
        
        if (data.success && data.stats) {
            document.getElementById('playerCount').textContent = data.stats.totalPlayers || 0;
            document.getElementById('villageCount').textContent = data.stats.totalVillages || 0;
            document.getElementById('onlineCount').textContent = data.stats.onlinePlayers || 0;
        }
    } catch (error) {
        console.error('Error loading stats:', error);
    }
}

// Load data from API
async function loadData(type) {
    const container = document.getElementById('dataContainer');
    container.innerHTML = '<div class="loading"><div class="spinner"></div><p>جاري التحميل...</p></div>';

    try {
        const url = `${API_BASE}/${type}`;
        const response = await fetch(url, {
            headers: authToken ? { 'Authorization': `Bearer ${authToken}` } : {}
        });
        const data = await response.json();

        if (data.success) {
            const titles = {
                players: '👥 اللاعبين',
                villages: '🏘️ القرى',
                stats: '📊 الإحصائيات',
                health: '🏥 حالة الخادم'
            };

            container.innerHTML = `
                <div class="data-display">
                    <h3>${titles[type] || type}</h3>
                    <pre>${JSON.stringify(data.data || data.stats || data, null, 2)}</pre>
                </div>
            `;
        } else {
            showMessage('❌ خطأ: ' + data.error, 'error');
        }
    } catch (error) {
        showMessage('❌ خطأ في تحميل البيانات: ' + error.message, 'error');
    }
}

// Show message notification
function showMessage(text, type = 'info') {
    const container = document.getElementById('messagesContainer');
    const message = document.createElement('div');
    message.className = `message ${type}`;
    message.innerHTML = `<span>${text}</span>`;
    container.appendChild(message);

    setTimeout(() => {
        message.style.opacity = '0';
        setTimeout(() => message.remove(), 300);
    }, 4000);
}

// Initialize on page load
window.addEventListener('load', () => {
    checkAuth();
    loadStats();
});
