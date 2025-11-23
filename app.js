const express = require('express');
const mysql = require('mysql2');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const SECRET = 'your_jwt_secret';

app.use(cors());
app.use(bodyParser.json());

// Database connection
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '@Shetty07',
    database: 'hostelhub4'
});

db.connect((err) => {
    if (err) {
        console.error('Database connection failed:', err);
        process.exit(1);
    }
    console.log('Connected to MySQL database');
});

// Serve frontend static files or HTML from "public" folder
app.use(express.static(path.join(__dirname, 'public')));

// -------------------------
// Add example product endpoint for frontend demo
// -------------------------
app.get('/api/products/:id', (req, res) => {
    // Simple dummy product data
    const products = {
        '123': { id: '123', name: 'Example Product', price: 9.99 },
        '456': { id: '456', name: 'Another Product', price: 19.99 }
    };
    const product = products[req.params.id];
    if (!product) {
        return res.status(404).json({ error: 'Product not found' });
    }
    res.json(product);
});

// -------------------------
// Registration
// -------------------------
app.post('/api/users', async (req, res) => {
    const { email, password, role } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    db.query(
        'INSERT INTO users (email, password, role) VALUES (?, ?, ?)',
        [email, hashedPassword, role || 'student'],
        (err, result) => {
            if (err) {
                if (err.code === 'ER_DUP_ENTRY') {
                    return res.status(400).json({ error: 'Username already exists' });
                }
                return res.status(500).json({ error: 'Registration failed' });
            }
            res.status(201).json({ message: 'User registered successfully' });
        }
    );
});

// -------------------------
// Login
// -------------------------
app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    if (!username || !password) {
        return res.status(400).json({ error: 'Username and password required' });
    }

    db.query(
        'SELECT * FROM users WHERE email = ?',
        [username],
        async (err, results) => {
            if (err) return res.status(500).json({ error: `Server error ${err}` });
            if (results.length === 0) return res.status(400).json({ error: 'Invalid credentials' });

            const user = results[0];

            const match = await bcrypt.compare(password, user.password);

            if (!match) return res.status(400).json({ error: 'Invalid credentials' });

            const token = jwt.sign(
                { id: user.id, role: user.role },
                SECRET,
                { expiresIn: '24h' }
            );

            return res.json({ token, role: user.role });
        }
    );
});

// -------------------------
// JWT Middleware
// -------------------------
function auth(req, res, next) {
    const token = req.headers.authorization?.split(' ')[1];
    if (!token) return res.status(401).json({ error: 'No token provided' });

    jwt.verify(token, SECRET, (err, user) => {
        if (err) return res.status(401).json({ error: 'Invalid token' });
        req.user = user;
        next();
    });
}

// -------------------------
// Student: Raise Complaint
// -------------------------
app.post('/api/complaints', auth, (req, res) => {
    const { title, description } = req.body;

    if (!title || !description) {
        return res.status(400).json({ error: 'Title and description required' });
    }

    db.query(
        'INSERT INTO complaints (user_id, title, description, status) VALUES (?, ?, ?, "pending")',
        [req.user.id, title, description],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to create complaint' });
            return res.status(201).json({ message: 'Complaint raised', id: result.insertId });
        }
    );
});

// -------------------------
// Student: View Own Complaints
// -------------------------
app.get('/api/complaints', auth, (req, res) => {
    db.query(
        'SELECT * FROM complaints WHERE user_id = ?',
        [req.user.id],
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch complaints' });
            return res.json(results);
        }
    );
});

// -------------------------
// Admin: View All Complaints
// -------------------------
app.get('/api/admin/complaints', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    db.query(
        'SELECT complaints.*, users.email FROM complaints JOIN users ON complaints.user_id = users.id',
        (err, results) => {
            if (err) return res.status(500).json({ error: 'Failed to fetch complaints' });
            return res.json(results);
        }
    );
});

// -------------------------
// Admin: Update Complaint Status
// -------------------------
app.put('/api/admin/complaints/:id', auth, (req, res) => {
    if (req.user.role !== 'admin') {
        return res.status(403).json({ error: 'Access denied' });
    }

    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status required' });

    db.query(
        'UPDATE complaints SET status = ? WHERE id = ?',
        [status, req.params.id],
        (err, result) => {
            if (err) return res.status(500).json({ error: 'Failed to update status' });
            if (result.affectedRows === 0) {
                return res.status(404).json({ error: 'Complaint not found' });
            }
            res.json({ message: 'Status updated successfully' });
        }
    );
});

// -------------------------
// Serve frontend HTML on "/"
// -------------------------
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// -------------------------
// Start Server
// -------------------------
app.listen(5000, () => {
    console.log('Server running on port 5000');
});
