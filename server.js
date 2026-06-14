const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');

const app = express();
const PORT = 5000;

// Middleware
app.use(cors());
app.use(express.json());

// Initialize In-Memory Database (Resets on server restart, perfect for testing)
const db = new sqlite3.Database(':memory:', (err) => {
    if (err) return console.error(err.message);
    console.log('Connected to the in-memory SQLite database.');
});

// Create Tasks Table
db.run(`CREATE TABLE tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'pending'
)`);

// --- REST API ENDPOINTS ---

// 1. READ ALL
app.get('/api/tasks', (req, res) => {
    db.all('SELECT * FROM tasks ORDER BY id DESC', [], (err, rows) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(rows);
    });
});

// 2. CREATE (With Server-Side Validation)
app.post('/api/tasks', (req, res) => {
    const { title, description } = req.body;
    
    // Server-side validation
    if (!title || title.trim() === '') {
        return res.status(400).json({ error: 'Title field is required.' });
    }

    const sql = 'INSERT INTO tasks (title, description) VALUES (?, ?)';
    db.run(sql, [title.trim(), description ? description.trim() : ''], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        res.status(201).json({ id: this.lastID, title, description, status: 'pending' });
    });
});

// 3. UPDATE STATUS
app.put('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) return res.status(400).json({ error: 'Status is required.' });

    const sql = 'UPDATE tasks SET status = ? WHERE id = ?';
    db.run(sql, [status, id], function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found.' });
        res.json({ message: 'Task updated successfully', id, status });
    });
});

// 4. DELETE
app.delete('/api/tasks/:id', (req, res) => {
    const { id } = req.params;
    
    db.run('DELETE FROM tasks WHERE id = ?', id, function(err) {
        if (err) return res.status(500).json({ error: err.message });
        if (this.changes === 0) return res.status(404).json({ error: 'Task not found.' });
        res.json({ message: 'Task deleted successfully', id });
    });
});

// Serve Frontend Static Files
const path = require('path');
app.use(express.static(__dirname));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Start Server on Environment Port
const HOST_PORT = process.env.PORT || 5000;
app.listen(HOST_PORT, () => {
    console.log(`Server running on port ${HOST_PORT}`);
});


