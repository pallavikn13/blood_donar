<?php
// Database initialization script
$servername = "localhost";
$username = "root";
$password = "";

// Create connection
$conn = new mysqli($servername, $username, $password);

// Check connection
if ($conn->connect_error) {
    die("Connection failed: " . $conn->connect_error);
}

// Create database
$sql = "CREATE DATABASE IF NOT EXISTS blood_donation";
if ($conn->query($sql) === TRUE) {
    echo "Database created successfully<br>";
} else {
    echo "Error creating database: " . $conn->error . "<br>";
}

// Select database
$conn->select_db("blood_donation");

// Create donors table
$sql = "CREATE TABLE IF NOT EXISTS donors (
    id INT(6) UNSIGNED AUTO_INCREMENT PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    age INT(3) NOT NULL,
    blood_type VARCHAR(5) NOT NULL,
    gender VARCHAR(10) NOT NULL,
    address TEXT NOT NULL,
    city VARCHAR(50) NOT NULL,
    state VARCHAR(50) NOT NULL,
    pincode VARCHAR(20) NOT NULL,
    last_donation DATE NULL,
    registration_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY unique_email (email),
    UNIQUE KEY unique_phone (phone)
)";

if ($conn->query($sql) === TRUE) {
    echo "Table donors created successfully<br>";
} else {
    echo "Error creating table: " . $conn->error . "<br>";
}

// Insert sample data
$sample_data = [
    ["John Doe", "john@example.com", "1234567890", 25, "A+", "Male", "123 Main St", "New York", "NY", "10001", "2024-01-15"],
    ["Jane Smith", "jane@example.com", "1234567891", 30, "O-", "Female", "456 Oak Ave", "Los Angeles", "CA", "90001", "2024-02-20"],
    ["Mike Johnson", "mike@example.com", "1234567892", 28, "B+", "Male", "789 Pine Rd", "Chicago", "IL", "60007", "2024-01-30"],
    ["Sarah Wilson", "sarah@example.com", "1234567893", 22, "AB+", "Female", "321 Elm St", "Houston", "TX", "77001", NULL],
    ["David Brown", "david@example.com", "1234567894", 35, "O+", "Male", "654 Maple Dr", "Phoenix", "AZ", "85001", "2024-03-10"],
    ["Emily Davis", "emily@example.com", "1234567895", 29, "A-", "Female", "987 Birch Ln", "Philadelphia", "PA", "19019", "2024-02-15"],
    ["Robert Miller", "robert@example.com", "1234567896", 32, "B-", "Male", "147 Cedar St", "San Antonio", "TX", "78201", NULL],
    ["Lisa Garcia", "lisa@example.com", "1234567897", 26, "AB-", "Female", "258 Spruce Ave", "San Diego", "CA", "92101", "2024-03-05"]
];

foreach ($sample_data as $data) {
    // Check if donor already exists
    $check_sql = "SELECT id FROM donors WHERE email = '" . $data[1] . "' OR phone = '" . $data[2] . "'";
    $result = $conn->query($check_sql);
    
    if ($result->num_rows == 0) {
        $sql = "INSERT INTO donors (full_name, email, phone, age, blood_type, gender, address, city, state, pincode, last_donation) 
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        $stmt = $conn->prepare($sql);
        $stmt->bind_param("sssisssssss", $data[0], $data[1], $data[2], $data[3], $data[4], $data[5], $data[6], $data[7], $data[8], $data[9], $data[10]);
        
        if ($stmt->execute()) {
            echo "Sample donor inserted: " . $data[0] . "<br>";
        } else {
            echo "Error inserting sample donor: " . $stmt->error . "<br>";
        }
        
        $stmt->close();
    } else {
        echo "Sample donor already exists: " . $data[0] . "<br>";
    }
}

$conn->close();
echo "Database initialization complete!";