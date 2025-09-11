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

// ====== 路由：使用者登入 ======

// 登入 API
app.post('/api/auth/login', async (req, res) => {
    const { email, password } = req.body;
    try {
        const userResult = await pool.query(
            // 新增一個 role 欄位
            `SELECT id, password_hash, schema_name, role FROM tenants WHERE email = $1;`,
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
        
        const payload = {
            userId: user.id,
            schemaName: user.schema_name,
            role: user.role // 將角色資訊加入 Token
        };
        const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '1h' });
        
        res.json({ success: true, token, schemaName: user.schema_name, role: user.role });
    } catch (err) {
        res.status(500).json({ success: false, message: '登入失敗' });
    }
});

// 新增一個中介函式，用於驗證管理員權限
function authenticateAdmin(req, res, next) {
    authenticateToken(req, res, () => {
        if (req.user.role !== 'admin') {
            return res.status(403).json({ message: '管理員權限不足' });
        }
        next();
    });
}

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

// New API endpoint for admin use only
app.post('/api/admin/create-client', authenticateAdmin, async (req, res) => {
    // 不再需要 adminKey 驗證，因為已經由中介函式處理
    const { email, name } = req.body; 

    try {
        const schema_name = `client_${name.replace(/ /g, '_').toLowerCase()}`;

        // 在新增使用者時，預設角色為 'client'
        const clientResult = await pool.query(
            `INSERT INTO tenants (name, email, schema_name) VALUES ($1, $2, $3) RETURNING id;`,
            [name, email, schema_name]
        );
        
        // 建立客戶專屬的 schema
        await pool.query(`CREATE SCHEMA ${schema_name};`);

        res.status(201).json({ success: true, message: '客戶及資料庫建立成功。請手動寄送密碼設定連結給客戶。', tenantId: clientResult.rows[0].id });

    } catch (err) {
        console.error('客戶建立失敗:', err.message);
        res.status(500).json({ success: false, message: '客戶建立失敗，可能該帳號已存在' });
    }
});

// A new endpoint for the admin to initiate a password reset/creation
app.post('/api/admin/send-password-link', async (req, res) => {
  const { email, adminKey } = req.body;

  // Validate the admin key
  if (adminKey !== process.env.ADMIN_SECRET_KEY) {
    return res.status(403).json({ success: false, message: 'Invalid admin key.' });
  }

  try {
    const userResult = await pool.query('SELECT id FROM tenants WHERE email = $1', [email]);
    if (userResult.rows.length === 0) {
      return res.status(404).json({ success: false, message: 'User not found.' });
    }

    const userId = userResult.rows[0].id;
    const token = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + 3600000); // Token expires in 1 hour

    // Save the token to the database
    await pool.query(
      'UPDATE tenants SET password_reset_token = $1, password_reset_token_expires_at = $2 WHERE id = $3',
      [token, expiresAt, userId]
    );

    // TODO: Send an email with the link
    // The link will look like: https://<your-domain>/set-password.html?token=<the_token>
    console.log(`Password creation link: https://your-domain/set-password.html?token=${token}`);

    res.json({ success: true, message: 'Password creation link sent.' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error sending link.' });
  }
});

app.post('/api/set-password', async (req, res) => {
  const { token, newPassword } = req.body;

  try {
    const userResult = await pool.query(
      'SELECT id, password_reset_token_expires_at FROM tenants WHERE password_reset_token = $1',
      [token]
    );

    if (userResult.rows.length === 0 || new Date() > userResult.rows[0].password_reset_token_expires_at) {
      return res.status(400).json({ success: false, message: 'Invalid or expired token.' });
    }

    const userId = userResult.rows[0].id;
    const password_hash = await bcrypt.hash(newPassword, 10);

    await pool.query(
      'UPDATE tenants SET password_hash = $1, password_reset_token = NULL, password_reset_token_expires_at = NULL WHERE id = $2',
      [password_hash, userId]
    );

    res.json({ success: true, message: 'Password updated successfully!' });
  } catch (error) {
    res.status(500).json({ success: false, message: 'Error updating password.' });
  }
});

// 啟動伺服器
app.listen(PORT, () => {
    console.log(`伺服器正在 http://localhost:${PORT} 上運行`);
});