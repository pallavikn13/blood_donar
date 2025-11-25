<?php
// Database configuration
$servername = "localhost";
$username = "root";
$password = "";
$dbname = "blood_donation";

// Create connection
$conn = new mysqli($servername, $username, $password, $dbname);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Handle different actions
if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    handleRegistration($conn);
} elseif (isset($_GET['action']) && $_GET['action'] === 'getDonors') {
    getDonors($conn);
}

function handleRegistration($conn) {
    // Check if all required fields are present
    $required_fields = ['fullName', 'email', 'phone', 'age', 'bloodType', 'gender', 'address', 'city', 'state', 'pincode'];
    
    foreach ($required_fields as $field) {
        if (!isset($_POST[$field]) || empty($_POST[$field])) {
            // Show error page instead of JSON
            showErrorPage("Please fill all required fields: " . $field);
            return;
        }
    }

    // Sanitize input data
    $fullName = $conn->real_escape_string($_POST['fullName']);
    $email = $conn->real_escape_string($_POST['email']);
    $phone = $conn->real_escape_string($_POST['phone']);
    $age = intval($_POST['age']);
    $bloodType = $conn->real_escape_string($_POST['bloodType']);
    $gender = $conn->real_escape_string($_POST['gender']);
    $address = $conn->real_escape_string($_POST['address']);
    $city = $conn->real_escape_string($_POST['city']);
    $state = $conn->real_escape_string($_POST['state']);
    $pincode = $conn->real_escape_string($_POST['pincode']);
    $lastDonation = isset($_POST['lastDonation']) ? $conn->real_escape_string($_POST['lastDonation']) : NULL;
    
    // Age validation
    if ($age < 18 || $age > 65) {
        showErrorPage("Age must be between 18 and 65 years.");
        return;
    }

    // Check if donor already exists
    $check_sql = "SELECT id FROM donors WHERE email = '$email' OR phone = '$phone'";
    $result = $conn->query($check_sql);
    
    if ($result && $result->num_rows > 0) {
        showErrorPage("Donor already registered with this email or phone number.");
        return;
    }
    
    // Insert into database
    if ($lastDonation) {
        $sql = "INSERT INTO donors (full_name, email, phone, age, blood_type, gender, address, city, state, pincode, last_donation) 
                VALUES ('$fullName', '$email', '$phone', $age, '$bloodType', '$gender', '$address', '$city', '$state', '$pincode', '$lastDonation')";
    } else {
        $sql = "INSERT INTO donors (full_name, email, phone, age, blood_type, gender, address, city, state, pincode) 
                VALUES ('$fullName', '$email', '$phone', $age, '$bloodType', '$gender', '$address', '$city', '$state', '$pincode')";
    }
    
    if ($conn->query($sql) === TRUE) {
        // Show success page with donor details
        showSuccessPage($fullName, $email, $phone, $age, $bloodType, $gender, $address, $city, $state, $pincode);
    } else {
        showErrorPage("Database error: " . $conn->error);
    }
}

function showSuccessPage($fullName, $email, $phone, $age, $bloodType, $gender, $address, $city, $state, $pincode) {
    ?>
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
                    <div class="detail-value"><?php echo htmlspecialchars($fullName); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Email:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($email); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Phone:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($phone); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Age:</div>
                    <div class="detail-value"><?php echo $age; ?> years</div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Blood Type:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($bloodType); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Gender:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($gender); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">Address:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($address); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">City:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($city); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">State:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($state); ?></div>
                </div>
                
                <div class="detail-row">
                    <div class="detail-label">ZIP Code:</div>
                    <div class="detail-value"><?php echo htmlspecialchars($pincode); ?></div>
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
    <?php
    exit();
}

function showErrorPage($errorMessage) {
    ?>
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
            <p><?php echo htmlspecialchars($errorMessage); ?></p>
            <a href="register.html" class="btn">Go Back</a>
        </div>
    </body>
    </html>
    <?php
    exit();
}

function getDonors($conn) {
    $bloodType = isset($_GET['bloodType']) ? $conn->real_escape_string($_GET['bloodType']) : '';
    $city = isset($_GET['city']) ? $conn->real_escape_string($_GET['city']) : '';
    
    $sql = "SELECT * FROM donors WHERE 1=1";
    
    if (!empty($bloodType)) {
        $sql .= " AND blood_type = '$bloodType'";
    }
    
    if (!empty($city)) {
        $sql .= " AND city LIKE '%$city%'";
    }
    
    $sql .= " ORDER BY registration_date DESC";
    
    $result = $conn->query($sql);
    
    if (!$result) {
        echo json_encode(["error" => "Query failed: " . $conn->error]);
        return;
    }
    
    $donors = [];
    
    if ($result->num_rows > 0) {
        while($row = $result->fetch_assoc()) {
            $donors[] = $row;
        }
    }
    
    echo json_encode($donors);
}

$conn->close();
?>