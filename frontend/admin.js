// admin.js
const API_BASE_URL = 'https://<your-vercel-domain>/api/server'; 
const authToken = localStorage.getItem('authToken');

function parseJwt(token) {
    try {
        const base64Url = token.split('.')[1];
        const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
        const jsonPayload = decodeURIComponent(atob(base64).split('').map(function(c) {
            return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
        }).join(''));
        return JSON.parse(jsonPayload);
    } catch (e) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    const tokenData = parseJwt(authToken);
    const contentContainer = document.getElementById('content-container');
    const deniedMessage = document.getElementById('access-denied-message');

    if (!authToken || !tokenData || tokenData.role !== 'admin') {
        contentContainer.classList.add('hidden');
        deniedMessage.classList.remove('hidden');
    } else {
        contentContainer.classList.remove('hidden');
        deniedMessage.classList.add('hidden');
    }

    document.getElementById('create-client-form').addEventListener('submit', async (e) => {
        e.preventDefault();
        const name = document.getElementById('name').value;
        const email = document.getElementById('email').value;

        try {
            const response = await fetch(`${API_BASE_URL}/api/admin/create-client`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${authToken}`
                },
                body: JSON.stringify({ name, email }),
            });

            const data = await response.json();
            alert(data.message);

            if (response.ok) {
                document.getElementById('create-client-form').reset();
            }
        } catch (error) {
            alert('連線錯誤，無法建立客戶。');
        }
    });
});