// login.js
document.addEventListener('DOMContentLoaded', () => {
    const loginForm = document.getElementById('login-form');
    const emailInput = document.getElementById('email');
    const passwordInput = document.getElementById('password');
    const errorMessage = document.getElementById('error-message');

    // 替換成你的後端 API 網址，這個網址在部署後會是公開的
    const API_BASE_URL = 'http://localhost:3000'; 

    loginForm.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email = emailInput.value;
        const password = passwordInput.value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({ email, password }),
            });

            const data = await response.json();

            if (response.ok) {
                // 登入成功
                // 將 Token 存入 localStorage
                localStorage.setItem('authToken', data.token); 
                // 將 schemaName 也存起來，方便後續使用 (可選)
                localStorage.setItem('schemaName', data.schemaName);

                // 導向主頁面
                window.location.href = 'index.html'; 
            } else {
                // 登入失敗
                errorMessage.textContent = data.message || '登入失敗，請檢查電子郵件或密碼。';
            }
        } catch (error) {
            console.error('Login error:', error);
            errorMessage.textContent = '連線失敗，請檢查伺服器狀態。';
        }
    });
});