
class LoginController {
    constructor() {
        this.adminUserModel = new AdminUserModel();
        this.loginForm = document.getElementById('login-form');
        this.messageContainer = document.getElementById('login-message');
        this.init();
    }

    init() {
        this.loginForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleLogin();
        });
    }

    async handleLogin() {
        const formData = new FormData(this.loginForm);
        const credentials = {
            username: formData.get('username'),
            password: formData.get('password')
        };

        this.showLoading();

        try {
            const result = await this.adminUserModel.login(credentials);
            this.handleLoginSuccess(result);
        } catch (error) {
            this.showError('Login failed: ' + error.message);
        }
    }

    handleLoginSuccess(result) {
        // Store user session
        sessionStorage.setItem('user', JSON.stringify(result.user));
        sessionStorage.setItem('token', result.token);
        
        this.showSuccess('Login successful! Redirecting...');
        
        // Redirect based on user role
        setTimeout(() => {
            if (result.user.role === 'admin') {
                window.location.href = '/flight_admin_dashboard.ejs';
            } else {
                window.location.href = '/index.ejs';
            }
        }, 1500);
    }

    showLoading() {
        this.messageContainer.innerHTML = `
            <div class="loading-message">Logging in...</div>
        `;
    }

    showSuccess(message) {
        this.messageContainer.innerHTML = `
            <div class="success-message">${message}</div>
        `;
    }

    showError(message) {
        this.messageContainer.innerHTML = `
            <div class="error-message">${message}</div>
        `;
    }
}