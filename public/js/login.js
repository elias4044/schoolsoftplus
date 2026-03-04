async function loginToSchoolsoft(username, password) {
    // Show loading state
    const loginBtn = document.querySelector('.login-btn');
    const originalBtnText = loginBtn.textContent;
    loginBtn.innerHTML = '<div class="btn-spinner"></div> <span>Signing in...</span>';
    loginBtn.disabled = true;

    // Get redirect url from params or use default
    const urlParams = new URLSearchParams(window.location.search);
    const redirect = urlParams.get('redirect') || '/main.html';

    try {
        const res = await fetch('/api/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                username,
                password,
            })
        });

        // First check if response is JSON
        const textData = await res.text();
        let data;
        try {
            data = JSON.parse(textData);
        } catch (e) {
            throw new Error(`Invalid JSON response: ${textData.slice(0, 50)}`);
        }
        if (data.success) {
            // Show success animation before redirecting
            loginBtn.innerHTML = `
            <svg class="checkmark" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 52 52">
                <circle class="checkmark-circle" cx="26" cy="26" r="25" fill="none"/>
                <path class="checkmark-check" fill="none" d="M14.1 27.2l7.1 7.2 16.7-16.8"/>
            </svg>
            <span>Success!</span>
        `;

            sessionStorage.setItem('cookies', JSON.stringify([
                data.sessionCookie.split(';')[0],
                data.hashCookie.split(';')[0]
            ]));

            sessionStorage.setItem('username', username);

            // Redirect after a short delay to show the success animation
            setTimeout(() => {
                localStorage.removeItem("theme")
                window.location.href = redirect;
            }, 500);
        } else {
            // Show error message
            const errorElement = document.getElementById('login-error');
            errorElement.textContent = 'Login failed. Please check your credentials. If this error persists, please try to login on the real schoolsoft and then here.';

            // Reset button
            loginBtn.innerHTML = originalBtnText;
            loginBtn.disabled = false;
        }
    } catch (error) {
        console.error('Login error:', error);
        const errorElement = document.getElementById('login-error');
        errorElement.textContent = error.message || 'Connection error. Please try again.';

        // Reset button
        loginBtn.innerHTML = originalBtnText;
        loginBtn.disabled = false;
    }

}

// Add event listener to the login form
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            // Clear previous error messages
            document.getElementById('username-error').textContent = '';
            document.getElementById('password-error').textContent = '';
            document.getElementById('login-error').textContent = '';

            const username = document.getElementById('username').value;
            const password = document.getElementById('password').value;

            // Simple validation
            let isValid = true;

            if (!username) {
                document.getElementById('username-error').textContent = 'Username is required';
                isValid = false;
            }

            if (!password) {
                document.getElementById('password-error').textContent = 'Password is required';
                isValid = false;
            }

            if (isValid) {
                await loginToSchoolsoft(username, password);
            }
        });
    }

});