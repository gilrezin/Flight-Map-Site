

class RegisterController {
    constructor() {
        this.adminUserModel = new AdminUserModel();
        this.registerForm = document.getElementById('register-form');
        this.messageContainer = document.getElementById('register-message');
        this.init();
    }

    init() {
        this.registerForm.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleRegister();
        });
    }

    async handleRegister() {
        const formData = new FormData(this.registerForm);
        const userData = {
            username: formData.get('username'),
            email: formData.get('email'),
            password: formData.get('password'),
            confirmPassword: formData.get('confirmPassword')
        };

        if (!this.validateForm(userData)) {
            return;
        }

        this.showLoading();

        try {
            await this.adminUserModel.createUser(userData);
            this.showSuccess('Registration successful! Redirecting to login...');
            this.redirectToLogin();
        } catch (error) {
            this.showError('Registration failed: ' + error.message);
        }
    }

    validateForm(userData) {
        if (userData.password !== userData.confirmPassword) {
            this.showError('Passwords do not match');
            return false;
        }
        
        if (userData.password.length < 6) {
            this.showError('Password must be at least 6 characters long');
            return false;
        }
        
        if (!userData.email.includes('@')) {
            this.showError('Please enter a valid email address');
            return false;
        }
        
        return true;
    }

    showLoading() {
        this.messageContainer.innerHTML = `
            <div class="loading-message">Creating account...</div>
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

    redirectToLogin() {
        setTimeout(() => {
            window.location.href = '/login.html';
        }, 2000);
    }
}
