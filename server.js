const express = require('express');
const mysql = require('mysql2/promise');
const cors = require('cors');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

// Database configuration
const dbConfig = {
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'blood_donation'
};

// Create database connection pool
const pool = mysql.createPool({
    ...dbConfig,
    waitForConnections: true,
    connectionLimit: 10,
    queueLimit: 0
});

// Handle POST registration
app.post('/register.php', async (req, res) => {
    try {
        await handleRegistration(req, res);
    } catch (error) {
        console.error('Registration error:', error);
        sendErrorPage(res, 'Server error occurred');
    }
});

// Handle GET donors request
app.get('/register.php', async (req, res) => {
    if (req.query.action === 'getDonors') {
        try {
            await getDonors(req, res);
        } catch (error) {
            console.error('Get donors error:', error);
            res.status(500).json({ error: 'Failed to fetch donors' });
        }
    } else {
        res.status(404).send('Not found');
    }
});

async function handleRegistration(req, res) {
    // Check if all required fields are present
    const requiredFields = ['fullName', 'email', 'phone', 'age', 'bloodType', 'gender', 'address', 'city', 'state', 'pincode'];
    
    for (const field of requiredFields) {
        if (!req.body[field] || req.body[field].trim() === '') {
            return sendErrorPage(res, Please fill all required fields: ${field});
        }
    }

    // Extract data
    const {
        fullName,
        email,
        phone,
        age,
        bloodType,
        gender,
        address,
        city,
        state,
        pincode,
        lastDonation
    } = req.body;

    // Age validation
    const ageNum = parseInt(age);
    if (ageNum < 18 || ageNum > 65) {
        return sendErrorPage(res, "Age must be between 18 and 65 years.");
    }

    // Check if donor already exists
    const connection = await pool.getConnection();
    try {
        const [existingDonors] = await connection.execute(
            'SELECT id FROM donors WHERE email = ? OR phone = ?',
            [email, phone]
        );

        if (existingDonors.length > 0) {
            return sendErrorPage(res, "Donor already registered with this email or phone number.");
        }

        // Insert into database
        if (lastDonation) {
            await connection.execute(
                `INSERT INTO donors (full_name, email, phone, age, blood_type, gender, address, city, state, pincode, last_donation) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [fullName, email, phone, ageNum, bloodType, gender, address, city, state, pincode, lastDonation]
            );
        } else {
            await connection.execute(
                `INSERT INTO donors (full_name, email, phone, age, blood_type, gender, address, city, state, pincode) 
                 VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
                [fullName, email, phone, ageNum, bloodType, gender, address, city, state, pincode]
            );
        }

        // Send success page
        sendSuccessPage(res, fullName, email, phone, ageNum, bloodType, gender, address, city, state, pincode);

    } catch (error) {
        console.error('Database error:', error);
        sendErrorPage(res, "Database error: " + error.message);
    } finally {
        connection.release();
    }
}

async function getDonors(req, res) {
    const bloodType = req.query.bloodType || '';
    const city = req.query.city || '';
    
    let sql = 'SELECT * FROM donors WHERE 1=1';
    const params = [];

    if (bloodType) {
        sql += ' AND blood_type = ?';
        params.push(bloodType);
    }

    if (city) {
        sql += ' AND city LIKE ?';
        params.push(%${city}%);
    }

    sql += ' ORDER BY registration_date DESC';

    try {
        const connection = await pool.getConnection();
        const [donors] = await connection.execute(sql, params);
        connection.release();
        
        res.json(donors);
    } catch (error) {
        console.error('Error fetching donors:', error);
        res.status(500).json({ error: 'Failed to fetch donors' });
    }
}

function sendSuccessPage(res, fullName, email, phone, age, bloodType, gender, address, city, state, pincode) {
    const successHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Successful - BloodDonor</title>
        <style>
            * {
                margin: 0;
                padding: 0;
                box-sizing: border-box;
            }
            
            body {
                font-family: 'Arial', sans-serif;
                background: linear-gradient(135deg, #f8f9fa, #e9ecef);
                min-height: 100vh;
                padding: 20px;
            }
            
            .success-container {
                max-width: 800px;
                margin: 50px auto;
                background: white;
                border-radius: 15px;
                box-shadow: 0 10px 30px rgba(0,0,0,0.1);
                overflow: hidden;
            }
            
            .success-header {
                background: linear-gradient(135deg, #28a745, #20c997);
                color: white;
                padding: 40px;
                text-align: center;
            }
            
            .success-icon {
                font-size: 4rem;
                margin-bottom: 20px;
            }
            
            .success-title {
                font-size: 2.5rem;
                margin-bottom: 10px;
            }
            
            .success-subtitle {
                font-size: 1.2rem;
                opacity: 0.9;
            }
            
            .donor-details {
                padding: 40px;
            }
            
            .details-title {
                color: #333;
                font-size: 1.5rem;
                margin-bottom: 20px;
                border-bottom: 2px solid #28a745;
                padding-bottom: 10px;
            }
            
            .detail-row {
                display: grid;
                grid-template-columns: 1fr 1fr;
                gap: 20px;
                margin-bottom: 15px;
                padding: 15px;
                background: #f8f9fa;
                border-radius: 8px;
            }
            
            .detail-label {
                font-weight: bold;
                color: #555;
            }
            
            .detail-value {
                color: #333;
            }
            
            .action-buttons {
                padding: 30px 40px;
                background: #f8f9fa;
                text-align: center;
                border-top: 1px solid #dee2e6;
            }
            
            .btn {
                display: inline-block;
                padding: 12px 30px;
                margin: 0 10px;
                background: #dc3545;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                font-weight: bold;
                transition: all 0.3s;
                border: none;
                cursor: pointer;
                font-size: 1rem;
            }
            
            .btn:hover {
                background: #c82333;
                transform: translateY(-2px);
                box-shadow: 0 5px 15px rgba(220, 53, 69, 0.3);
            }
            
            .btn-secondary {
                background: #6c757d;
            }
            
            .btn-secondary:hover {
                background: #5a6268;
            }
            
            @media (max-width: 768px) {
                .detail-row {
                    grid-template-columns: 1fr;
                }
                
                .btn {
                    display: block;
                    margin: 10px 0;
                    width: 100%;
                }
            }
        </style>
    </head>
    <body>
        <div class="success-container">
            <div class="success-header">
                <div class="success-icon">✅</div>
                <h1 class="success-title">Registration Successful!</h1>
                <p class="success-subtitle">Thank you for registering as a blood donor. You're now part of our life-saving community.</p>
            </div>
            
            <div class="donor-details">
                <h2 class="details-title">Your Registration Details</h2>
                
                <div class="detail-row">
                    <div class="detail-label">Full Name:</div>
                    <div class="detail-value">${escapeHtml(fullName)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value">${escapeHtml(email)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value">${escapeHtml(phone)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Age:</div>
                    <div class="detail-value">${age} years</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Blood Type:</div>
                    <div class="detail-value">${escapeHtml(bloodType)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Gender:</div>
                    <div class="detail-value">${escapeHtml(gender)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Address:</div>
                    <div class="detail-value">${escapeHtml(address)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">City:</div>
                    <div class="detail-value">${escapeHtml(city)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">State:</div>
                    <div class="detail-value">${escapeHtml(state)}</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">ZIP Code:</div>
                    <div class="detail-value">${escapeHtml(pincode)}</div>
                </div>
            </div>
            
            <div class="action-buttons">
                <a href="index.html" class="btn">Go to Home</a>
                <a href="donors.html" class="btn btn-secondary">Find Other Donors</a>
                <a href="emergency.html" class="btn">Emergency Requests</a>
            </div>
        </div>
    </body>
    </html>
    `;
    res.send(successHTML);
}

function sendErrorPage(res, errorMessage) {
    const errorHTML = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>Registration Error - BloodDonor</title>
        <style>
            body {
                font-family: Arial, sans-serif;
                background: #f8f9fa;
                display: flex;
                justify-content: center;
                align-items: center;
                min-height: 100vh;
                margin: 0;
                padding: 20px;
            }
            
            .error-container {
                background: white;
                padding: 40px;
                border-radius: 10px;
                box-shadow: 0 5px 15px rgba(0,0,0,0.1);
                text-align: center;
                max-width: 500px;
                width: 100%;
            }
            
            .error-icon {
                font-size: 3rem;
                color: #dc3545;
                margin-bottom: 20px;
            }
            
            .error-title {
                color: #dc3545;
                margin-bottom: 20px;
            }
            
            .btn {
                display: inline-block;
                padding: 10px 20px;
                background: #dc3545;
                color: white;
                text-decoration: none;
                border-radius: 5px;
                margin-top: 20px;
            }
        </style>
    </head>
    <body>
        <div class="error-container">
            <div class="error-icon">❌</div>
            <h1 class="error-title">Registration Failed</h1>
            <p>${escapeHtml(errorMessage)}</p>
            <a href="register.html" class="btn">Go Back</a>
        </div>
    </body>
    </html>
    `;
    res.send(errorHTML);
}

function escapeHtml(unsafe) {
    if (!unsafe) return '';
    return unsafe
        .toString()
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

// Serve static files from public directory
app.use(express.static('public'));

// Start server
app.listen(PORT, () => {
    console.log(Server running on http://localhost:${PORT});
    console.log(PHP endpoints are now available at:);
    console.log(- POST http://localhost:${PORT}/register.php);
    console.log(- GET  http://localhost:${PORT}/register.php?action=getDonors);
});