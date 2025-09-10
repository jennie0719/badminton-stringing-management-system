// script.js

// 你的後端 API 網址 (部署到 Vercel 後需要更新)
const API_BASE_URL = 'http://localhost:3000'; 

// 從 localStorage 取得 Token
const authToken = localStorage.getItem('authToken');

// 如果沒有 Token，自動導向登入頁面
if (!authToken) {
    window.location.href = 'login.html';
}

// 登出函式
function logout() {
    localStorage.removeItem('authToken');
    window.location.href = 'login.html';
}

document.addEventListener('DOMContentLoaded', () => {
    // 根據當前頁面網址，決定要處理哪種表單
    const path = window.location.pathname;
    let formType;

    if (path.includes('createOrder.html')) {
        formType = 'order';
    } else if (path.includes('createPlayer.html')) {
        formType = 'player';
    }

    if (formType) {
        fetchCustomerSettings(formType);
    }
});

// ====== 帶有 Token 的 fetch 函式 (與之前相同) ======
async function authenticatedFetch(url, options = {}) {
    const headers = {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${authToken}` 
    };

    const response = await fetch(url, {
        ...options,
        headers: {
            ...headers,
            ...options.headers
        }
    });

    if (response.status === 401 || response.status === 403) {
        localStorage.removeItem('authToken');
        window.location.href = 'login.html';
        return;
    }

    return response;
}

// ====== 獲取客戶設定並動態建立表單 ======
async function fetchCustomerSettings(formType) {
    const settingsApiUrl = `${API_BASE_URL}/api/customer/${formType}-settings`;
    const submitApiUrl = `${API_BASE_URL}/api/${formType}s`; // 假設 /api/orders 和 /api/players

    try {
        const response = await authenticatedFetch(settingsApiUrl);
        const settings = await response.json();
        
        if (settings && settings.form_fields) {
            // 根據後端提供的設定動態建立表單
            buildDynamicForm(settings.form_fields, formType, submitApiUrl);
        }
    } catch (error) {
        console.error('獲取設定失敗:', error);
    }
}

// ====== 動態建立表單的函式 ======
function buildDynamicForm(fields, formType, submitApiUrl) {
    const formContainer = document.getElementById('form-container');
    formContainer.innerHTML = '';
    
    const form = document.createElement('form');
    form.id = 'dynamic-form';

    // 根據表單類型新增固定欄位
    if (formType === 'order') {
        form.innerHTML = `
            <label for="name">姓名:</label>
            <input type="text" id="name" name="name" required>
            
            <label for="racket-count">球拍數量:</label>
            <input type="number" id="racket-count" name="racket_count" min="1" required>
        `;
    } else if (formType === 'player') {
         form.innerHTML = `
            <label for="bwfId">BWF ID:</label>
            <input type="text" id="bwfId" name="bwfId" required>
            
            <label for="name">姓名:</label>
            <input type="text" id="name" name="name" required>
        `;
    }

    // 新增動態欄位
    fields.forEach(field => {
        const label = document.createElement('label');
        label.textContent = field.label + ':';
        
        const input = document.createElement('input');
        input.type = 'text';
        input.name = field.key;
        
        form.appendChild(label);
        form.appendChild(input);
    });
    
    // 提交按鈕
    const submitButton = document.createElement('button');
    submitButton.type = 'submit';
    submitButton.textContent = '提交';
    form.appendChild(submitButton);

    formContainer.appendChild(form);

    // 綁定提交事件
    form.addEventListener('submit', (e) => handleFormSubmit(e, submitApiUrl));
}

// ====== 處理表單提交的函式 ======
async function handleFormSubmit(e, submitApiUrl) {
    e.preventDefault();

    const form = e.target;
    const formData = new FormData(form);
    
    // 收集固定欄位資料
    const standardFields = {};
    const standardInputs = form.querySelectorAll('input:not([name="bwfId"]):not([name="name"])');
    standardInputs.forEach(input => {
        if (input.name) {
            standardFields[input.name] = input.type === 'number' ? parseInt(input.value) : input.value;
        }
    });

    // 收集動態欄位資料
    const customFieldsData = {};
    const dynamicInputs = form.querySelectorAll('input:not([name="name"]):not([name="racket_count"]):not([name="bwfId"])');
    dynamicInputs.forEach(input => {
        if (input.name) {
            customFieldsData[input.name] = input.value;
        }
    });

    const submissionData = {
        ...standardFields,
        custom_fields: customFieldsData 
    };
    
    try {
        const response = await authenticatedFetch(submitApiUrl, {
            method: 'POST',
            body: JSON.stringify(submissionData)
        });

        const data = await response.json();
        if (data.success) {
            alert('提交成功！');
            form.reset();
        } else {
            alert('提交失敗：' + data.message);
        }
    } catch (error) {
        alert('連線錯誤，請檢查伺服器。');
        console.error('Submission error:', error);
    }
}