document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('set-password-form');
  const messageElement = document.getElementById('message');
  const params = new URLSearchParams(window.location.search);
  const token = params.get('token');

  if (!token) {
    messageElement.textContent = 'Invalid or missing token.';
    return;
  }

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const password = document.getElementById('password').value;
    const confirmPassword = document.getElementById('confirm-password').value;

    if (password !== confirmPassword) {
      messageElement.textContent = 'Passwords do not match.';
      return;
    }

    try {
      const response = await fetch('https://your-domain/api/set-password', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword: password }),
      });

      const data = await response.json();
      messageElement.textContent = data.message;
    } catch (error) {
      messageElement.textContent = 'Error setting password.';
    }
  });
});