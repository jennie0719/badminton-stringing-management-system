// server.js

// 引入所需的函式庫
require('dotenv').config();
const express = require('express');
const { Pool } = require('pg');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');

// 初始化 Express 應用程式
const app = express();
app.use(express.json());

// 從 .env 檔案中讀取機密資訊
const DATABASE_URL = process.env.DATABASE_URL;
const JWT_SECRET = process.env.JWT_SECRET;
const PORT = process.env.PORT || 3000;

// 連接到 PostgreSQL 資料庫
const pool = new Pool({
  connectionString: DATABASE_URL,
});

// ====== 中介函式：驗證 JWT Token ======
function authenticateToken(req, res, next) {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (token == null) {
        return res.status(401).json({ message: '未提供授權令牌' });
    }

    jwt.verify(token, JWT_SECRET, (err, user) => {
        if (err) {
            return res.status(403).json({ message: '無效的或過期的令牌' });
        }
        req.user = user; // 將使用者資訊存入請求物件
        next();
    });
}

// ====== 路由：使用者註冊和登入 ======

// 註冊新帳號 API
app.post('/api/auth/register', async (req, res) => {
    const { email, password, name } = req.body;
    try {
        const salt = await bcrypt.genSalt(10);
        const password_hash = await bcrypt.hash(password, salt);
        
        // 將使用者資訊存入 tenants 資料表
        const result = await pool.query(
            `INSERT INTO tenants (name, email, password_hash, schema_name) 
             VALUES ($1, $2, $3, $4) 
             RETURNING id;`,
            [name, email, password_hash, 'client_' + name.replace(/ /g, '_').toLowerCase()]
        );
        
        // 注意：這裡只新增了使用者資料，你還需要手動在資料庫中為該客戶建立一個 schema
        res.status(201).json({ success: true, message: '使用者建立成功' });
    } catch (err) {
        console.error('註冊失敗:', err.message);
        res.status(500).json({ success: false, message: '註冊失敗，可能該帳號已存在' });
    }
});

// 登入 API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query(
            `SELECT id, password_hash, schema_name FROM tenants WHERE email = $1;`,
            [email]
        );
        if (userResult.rows.length === 0) {
            return res.status(400).json({ success: false, message: '無效的電子郵件或密碼' });
        }
        
        const user = userResult.rows[0];
        const isMatch = await bcrypt.compare(password, user.password_hash);
        
        if (!isMatch) {
            return res.status(400).json({ success: false, message: '無效的電子郵件或密碼' });
        }
        
        // 登入成功，建立 JWT
        const payload = {
            userId: user.id,
            schemaName: user.schema_name
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ success: true, token, schemaName: user.schema_name });
    } catch (err) {
        console.error('登入失敗:', err.message);
        res.status(500).json({ success: false, message: '登入失敗' });
    }
});

// ====== 路由：已驗證的使用者才能存取 ======

// 取得客戶的自訂欄位設定
app.get('/api/customer/settings', authenticateToken, async (req, res) => {
    const { schemaName } = req.user;

    try {
        const result = await pool.query(`
            SELECT ts.custom_fields_definition
            FROM tenants t
            JOIN tenant_settings ts ON t.id = ts.tenant_id
            WHERE t.schema_name = $1;
        `, [schemaName]);

        if (result.rows.length > 0) {
            res.json(result.rows[0].custom_fields_definition);
        } else {
            res.status(404).json({ message: '找不到客戶設定' });
        }
    } catch (err) {
        console.error('獲取設定失敗:', err.message);
        res.status(500).json({ message: '伺服器錯誤' });
    }
});

// 新增訂單的 API
app.post('/api/orders', authenticateToken, async (req, res) => {
    const { name, racket_count, custom_fields } = req.body;
    const { schemaName } = req.user;

    try {
        const insertQuery = `
            INSERT INTO ${schemaName}.orders (name, racket_count, custom_fields)
            VALUES ($1, $2, $3)
            RETURNING id;
        `;
        const insertResult = await pool.query(insertQuery, [name, racket_count, custom_fields]);
        res.status(201).json({ success: true, orderId: insertResult.rows[0].id });
    } catch (err) {
        console.error('新增訂單失敗:', err.message);
        res.status(500).json({ message: '伺服器錯誤' });
    }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});