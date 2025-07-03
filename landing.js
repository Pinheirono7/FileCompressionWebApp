// Landing Page JavaScript
class LandingApp {
    constructor() {
        this.authModal = document.getElementById('authModal');
        this.loginSection = document.getElementById('loginSection');
        this.signupSection = document.getElementById('signupSection');
        this.isAuthenticated = false;
        
        this.initializeElements();
        this.bindEvents();
        this.checkAuthStatus();
    }

    initializeElements() {
        // Navigation elements
        this.loginBtn = document.getElementById('loginBtn');
        this.getStartedBtn = document.getElementById('getStartedBtn');
        this.learnMoreBtn = document.getElementById('learnMoreBtn');
        
        // Auth modal elements
        this.closeAuthModal = document.getElementById('closeAuthModal');
        this.showSignupBtn = document.getElementById('showSignupBtn');
        this.showLoginBtn = document.getElementById('showLoginBtn');
        this.loginForm = document.getElementById('loginForm');
        this.signupForm = document.getElementById('signupForm');
    }

    bindEvents() {
        // Navigation events
        this.loginBtn.addEventListener('click', () => this.showAuthModal('login'));
        this.getStartedBtn.addEventListener('click', () => this.handleGetStarted());
        this.learnMoreBtn.addEventListener('click', () => this.scrollToFeatures());
        
        // Auth modal events
        this.closeAuthModal.addEventListener('click', () => this.hideAuthModal());
        this.showSignupBtn.addEventListener('click', () => this.showSignup());
        this.showLoginBtn.addEventListener('click', () => this.showLogin());
        
        // Form events
        this.loginForm.addEventListener('submit', (e) => this.handleLogin(e));
        this.signupForm.addEventListener('submit', (e) => this.handleSignup(e));
        
        // Modal backdrop click
        this.authModal.addEventListener('click', (e) => {
            if (e.target === this.authModal) {
                this.hideAuthModal();
            }
        });
        
        // Smooth scrolling for navigation links
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const targetId = link.getAttribute('href').substring(1);
                const targetElement = document.getElementById(targetId);
                if (targetElement) {
                    targetElement.scrollIntoView({
                        behavior: 'smooth',
                        block: 'start'
                    });
                }
            });
        });

        // Escape key to close modal
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.authModal.classList.contains('show')) {
                this.hideAuthModal();
            }
        });
    }

    checkAuthStatus() {
        // Check if user is already authenticated (stored in localStorage)
        const authData = localStorage.getItem('procompress_auth');
        if (authData) {
            try {
                const userData = JSON.parse(authData);
                this.isAuthenticated = true;
                this.updateUIForAuthenticatedUser(userData);
            } catch (error) {
                localStorage.removeItem('procompress_auth');
            }
        }
    }

    updateUIForAuthenticatedUser(userData) {
        this.loginBtn.textContent = `Welcome, ${userData.name}`;
        this.loginBtn.onclick = () => this.showUserMenu();
    }

    showUserMenu() {
        // Create a simple user menu
        const menu = document.createElement('div');
        menu.className = 'user-menu';
        menu.innerHTML = `
            <div class="user-menu-content">
                <button onclick="landingApp.goToApp()">Open App</button>
                <button onclick="landingApp.logout()">Logout</button>
            </div>
        `;
        
        // Position and show menu
        document.body.appendChild(menu);
        
        // Remove menu when clicking outside
        setTimeout(() => {
            document.addEventListener('click', function closeMenu(e) {
                if (!menu.contains(e.target)) {
                    menu.remove();
                    document.removeEventListener('click', closeMenu);
                }
            });
        }, 0);
    }

    goToApp() {
        window.location.href = 'index.html';
    }

    logout() {
        localStorage.removeItem('procompress_auth');
        this.isAuthenticated = false;
        this.loginBtn.textContent = 'Sign In';
        this.loginBtn.onclick = () => this.showAuthModal('login');
        
        // Show logout success message
        this.showNotification('Successfully logged out!', 'success');
    }

    handleGetStarted() {
        if (this.isAuthenticated) {
            this.goToApp();
        } else {
            this.showAuthModal('signup');
        }
    }

    scrollToFeatures() {
        document.getElementById('features').scrollIntoView({
            behavior: 'smooth',
            block: 'start'
        });
    }

    showAuthModal(type = 'login') {
        this.authModal.classList.add('show');
        
        if (type === 'login') {
            this.showLogin();
        } else {
            this.showSignup();
        }
        
        // Focus first input
        setTimeout(() => {
            const firstInput = this.authModal.querySelector('input[type="email"], input[type="text"]');
            if (firstInput) firstInput.focus();
        }, 300);
    }

    hideAuthModal() {
        this.authModal.classList.remove('show');
    }

    showLogin() {
        this.loginSection.style.display = 'block';
        this.signupSection.style.display = 'none';
    }

    showSignup() {
        this.loginSection.style.display = 'none';
        this.signupSection.style.display = 'block';
    }

    async handleLogin(e) {
        e.preventDefault();
        
        const email = document.getElementById('loginEmail').value;
        const password = document.getElementById('loginPassword').value;
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Signing in...';
        submitBtn.disabled = true;
        
        try {
            // Simulate authentication (replace with real API call)
            await this.simulateAuth();
            
            // For demo purposes, just check if email and password are provided
            if (email && password) {
                const userData = {
                    id: Date.now(),
                    name: email.split('@')[0],
                    email: email,
                    loginTime: new Date().toISOString()
                };
                
                localStorage.setItem('procompress_auth', JSON.stringify(userData));
                this.isAuthenticated = true;
                this.updateUIForAuthenticatedUser(userData);
                this.hideAuthModal();
                this.showNotification('Successfully signed in!', 'success');
            } else {
                throw new Error('Please provide email and password');
            }
        } catch (error) {
            this.showNotification(error.message || 'Login failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    async handleSignup(e) {
        e.preventDefault();
        
        const name = document.getElementById('signupName').value;
        const email = document.getElementById('signupEmail').value;
        const password = document.getElementById('signupPassword').value;
        
        // Show loading state
        const submitBtn = e.target.querySelector('button[type="submit"]');
        const originalText = submitBtn.textContent;
        submitBtn.textContent = 'Creating account...';
        submitBtn.disabled = true;
        
        try {
            // Simulate account creation (replace with real API call)
            await this.simulateAuth();
            
            // Basic validation
            if (name && email && password) {
                const userData = {
                    id: Date.now(),
                    name: name,
                    email: email,
                    signupTime: new Date().toISOString()
                };
                
                localStorage.setItem('procompress_auth', JSON.stringify(userData));
                this.isAuthenticated = true;
                this.updateUIForAuthenticatedUser(userData);
                this.hideAuthModal();
                this.showNotification('Account created successfully!', 'success');
            } else {
                throw new Error('Please fill in all fields');
            }
        } catch (error) {
            this.showNotification(error.message || 'Signup failed. Please try again.', 'error');
        } finally {
            submitBtn.textContent = originalText;
            submitBtn.disabled = false;
        }
    }

    simulateAuth() {
        // Simulate network delay
        return new Promise(resolve => setTimeout(resolve, 1000));
    }

    showNotification(message, type = 'info') {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification notification-${type}`;
        notification.innerHTML = `
            <div class="notification-content">
                <i class="fas fa-${type === 'success' ? 'check-circle' : type === 'error' ? 'exclamation-triangle' : 'info-circle'}"></i>
                <span>${message}</span>
            </div>
        `;
        
        // Add styles
        notification.style.cssText = `
            position: fixed;
            top: 20px;
            right: 20px;
            background: ${type === 'success' ? '#10b981' : type === 'error' ? '#ef4444' : '#3b82f6'};
            color: white;
            padding: 1rem 1.5rem;
            border-radius: 8px;
            box-shadow: 0 4px 20px rgba(0,0,0,0.15);
            z-index: 9999;
            opacity: 0;
            transform: translateX(100%);
            transition: all 0.3s ease;
        `;
        
        document.body.appendChild(notification);
        
        // Animate in
        setTimeout(() => {
            notification.style.opacity = '1';
            notification.style.transform = 'translateX(0)';
        }, 100);
        
        // Remove after 5 seconds
        setTimeout(() => {
            notification.style.opacity = '0';
            notification.style.transform = 'translateX(100%)';
            setTimeout(() => notification.remove(), 300);
        }, 5000);
    }
}

// Initialize landing app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    window.landingApp = new LandingApp();
});

// Add styles for user menu and notifications
const additionalStyles = `
    .user-menu {
        position: fixed;
        top: 80px;
        right: 20px;
        background: white;
        border-radius: 8px;
        box-shadow: 0 4px 20px rgba(0,0,0,0.15);
        z-index: 1000;
        overflow: hidden;
        animation: fadeIn 0.2s ease;
    }
    
    .user-menu-content button {
        display: block;
        width: 100%;
        padding: 12px 20px;
        border: none;
        background: none;
        text-align: left;
        cursor: pointer;
        transition: background 0.2s ease;
    }
    
    .user-menu-content button:hover {
        background: #f7fafc;
    }
    
    .notification-content {
        display: flex;
        align-items: center;
        gap: 0.5rem;
    }
    
    @media (max-width: 768px) {
        .user-menu {
            right: 10px;
            left: 10px;
            top: 120px;
        }
        
        .notification {
            right: 10px;
            left: 10px;
        }
    }
`;

// Inject additional styles
const styleSheet = document.createElement('style');
styleSheet.textContent = additionalStyles;
document.head.appendChild(styleSheet);