const express = require('express');
const mysql = require('mysql2');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.json());
app.use(express.static(path.join(__dirname, 'public')));

// DATABASE CONNECTION
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'root123', // <-- TYPE YOUR EXACT NEW MYSQL PASSWORD HERE!
  database: 'hospital_db'
});

db.connect((err) => {
    if (err) { console.error('Database connection failed: ' + err.stack); return; }
    console.log('Connected to MySQL database successfully.');
});

// --- AUTHENTICATION APIs ---
app.post('/api/register', (req, res) => {
    const data = req.body;
    if (data.role === 'patient') {
        const query = "INSERT INTO patients (username, password, name, age, blood_group, weight, contact) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(query, [data.username, data.password, data.name, data.age, data.blood_group, data.weight, data.contact], (err) => {
            if (err) return res.status(400).json({ success: false, message: 'Error or username exists.' });
            res.json({ success: true, message: 'Patient registered successfully!' });
        });
    } else if (data.role === 'doctor') {
        const query = "INSERT INTO doctors (username, password, name, specialty, experience, email, phone) VALUES (?, ?, ?, ?, ?, ?, ?)";
        db.query(query, [data.username, data.password, data.name, data.specialty, data.experience, data.email, data.phone], (err) => {
            if (err) return res.status(400).json({ success: false, message: 'Error or username exists.' });
            res.json({ success: true, message: 'Doctor registered successfully!' });
        });
    }
});

app.post('/api/login', (req, res) => {
    const { role, username, password } = req.body;
    const table = role === 'patient' ? 'patients' : 'doctors';
    const query = "SELECT * FROM " + table + " WHERE username = ? AND password = ?";
    db.query(query, [username, password], (err, results) => {
        if (err) return res.status(500).json({ success: false, message: 'Database error.' });
        if (results.length > 0) {
            const user = results[0];
            res.json({ success: true, message: 'Welcome back!', user: { id: user.id, name: user.name, role: role } });
        } else {
            res.json({ success: false, message: 'Invalid credentials.' });
        }
    });
});

// --- DASHBOARD APIs ---
app.get('/api/doctors', (req, res) => {
    db.query("SELECT id, name, specialty, experience FROM doctors", (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/doctors/:id', (req, res) => {
    db.query("SELECT * FROM doctors WHERE id = ?", [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results[0]);
    });
});

app.post('/api/appointments', (req, res) => {
    const { patient_id, doctor_id, date } = req.body;
    db.query("INSERT INTO appointments (patient_id, doctor_id, appointment_date) VALUES (?, ?, ?)", [patient_id, doctor_id, date], (err) => {
        if (err) return res.status(400).json({ success: false, error: err.message });
        res.json({ success: true, message: 'Appointment booked!' });
    });
});

app.get('/api/appointments/patient/:id', (req, res) => {
    const query = "SELECT a.id as appointment_id, a.appointment_date, a.status, d.name as doctor_name, d.specialty FROM appointments a JOIN doctors d ON a.doctor_id = d.id WHERE a.patient_id = ?";
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.get('/api/appointments/doctor/:id', (req, res) => {
    const query = "SELECT a.id as appointment_id, a.appointment_date, a.status, p.name as patient_name, p.age, p.blood_group, p.weight, p.contact FROM appointments a JOIN patients p ON a.patient_id = p.id WHERE a.doctor_id = ?";
    db.query(query, [req.params.id], (err, results) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json(results);
    });
});

app.put('/api/appointments/:id/confirm', (req, res) => {
    db.query("UPDATE appointments SET status = 'Confirmed' WHERE id = ?", [req.params.id], (err) => {
        if (err) return res.status(500).json({ error: err.message });
        res.json({ success: true });
    });
});

app.listen(PORT, () => {
    console.log('Server is running on http://localhost:' + PORT);
});