$(document).ready(function() {
    // Mobile menu toggle
    $('.hamburger').click(function() {
        $('.nav-menu').toggleClass('active');
    });

    // Initialize emergency page functionality
    initializeEmergencyPage();
    
    // Initialize live donor activity simulation
    if ($('#activeDonors').length) {
        simulateDonorActivity();
        updateLiveDonorCount(); // Initial count update
    }
});

// Emergency Page Functions
function initializeEmergencyPage() {
    // Only initialize if we're on the emergency page
    if (!$('#emergencyForm').length) return;
    
    console.log('Initializing emergency page...');
    
    // Clear form button
    $('#clearForm').click(function() {
        $('#emergencyForm')[0].reset();
        $('#responseMessage').hide();
        $('.form-group').removeClass('error');
    });
    
    // Form submission handling
    $('#emergencyForm').on('submit', function(e) {
        e.preventDefault();
        
        if (!validateEmergencyForm()) {
            showResponseMessage({
                status: 'error',
                message: 'Please fill all required fields marked with *'
            });
            return;
        }
        
        const submitBtn = $('#submitBtn');
        const originalText = submitBtn.html();
        submitBtn.html('<span class="btn-icon">⏳</span> Processing Emergency Request...').prop('disabled', true);
        
        const formData = getFormData();
        
        // Submit emergency request to emergency.php
        submitEmergencyRequest(formData)
            .then(emergencyResponse => {
                if (emergencyResponse.status === 'success') {
                    // After emergency request is saved, find matching donors
                    return findMatchingDonorsFromDB(formData.bloodType, formData.hospitalCity)
                        .then(matchingDonors => {
                            const finalResponse = processEmergencyRequest(formData, matchingDonors, emergencyResponse);
                            // Show donors one by one
                            showDonorsSequentially(finalResponse);
                            
                            if (finalResponse.status === 'success') {
                                $('#emergencyForm')[0].reset();
                            }
                        });
                } else {
                    showResponseMessage(emergencyResponse);
                }
            })
            .catch(error => {
                console.error('Error:', error);
                showResponseMessage({
                    status: 'error',
                    message: 'Error processing emergency request. Please try again.'
                });
            })
            .finally(() => {
                submitBtn.html(originalText).prop('disabled', false);
            });
    });
    
    // Remove error class on input
    $('input, select, textarea').on('input', function() {
        $(this).closest('.form-group').removeClass('error');
    });
}

function validateEmergencyForm() {
    const requiredFields = [
        'patientName', 'contactPerson', 'hospital', 'hospitalCity', 
        'bloodType', 'units', 'urgency', 'contact'
    ];
    
    let isValid = true;
    $('.form-group').removeClass('error');
    
    requiredFields.forEach(field => {
        // FIXED: Corrected template literal syntax
        const element = $(`[name="${field}"]`);
        if (!element.val() || !element.val().trim()) {
            element.closest('.form-group').addClass('error');
            isValid = false;
        }
    });
    
    return isValid;
}

function getFormData() {
    return {
        patientName: $('#patientName').val(),
        contactPerson: $('#contactPerson').val(),
        hospital: $('#hospital').val(),
        hospitalCity: $('#hospitalCity').val(),
        hospitalAddress: $('#hospitalAddress').val(),
        bloodType: $('#bloodType').val(),
        units: $('#units').val(),
        urgency: $('#urgency').val(),
        contact: $('#contact').val(),
        message: $('#message').val()
    };
}

function submitEmergencyRequest(formData) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'emergency.php',
            type: 'POST',
            data: formData,
            success: function(response) {
                try {
                    const result = typeof response === 'string' ? JSON.parse(response) : response;
                    resolve(result);
                } catch (e) {
                    console.error('JSON Parse Error:', e);
                    reject('Invalid response from server');
                }
            },
            error: function(xhr, status, error) {
                console.error('AJAX Error:', error);
                reject(error);
            }
        });
    });
}

function findMatchingDonorsFromDB(bloodType, city) {
    return new Promise((resolve, reject) => {
        $.ajax({
            url: 'submit.php',
            type: 'GET',
            data: {
                action: 'getDonors',
                bloodType: bloodType,
                city: city
            },
            success: function(response) {
                try {
                    const donors = typeof response === 'string' ? JSON.parse(response) : response;
                    resolve(donors);
                } catch (e) {
                    console.error('Error parsing donors:', e);
                    resolve([]);
                }
            },
            error: function(xhr, status, error) {
                console.error('Error fetching donors:', error);
                resolve([]); // Resolve with empty array instead of rejecting
            }
        });
    });
}

function processEmergencyRequest(formData, matchingDonors, emergencyResponse) {
    // Handle case where matchingDonors might not be an array
    const donorsArray = Array.isArray(matchingDonors) ? matchingDonors : [];
    
    // Filter available donors who are eligible
    const availableDonors = donorsArray.filter(donor => {
        // FIXED: Handle different donor data structures
        const isAvailable = donor.available !== false && donor.available !== 'false';
        const lastDonation = donor.last_donation || donor.lastDonation;
        return isAvailable && isEligibleForDonation(lastDonation);
    });
    
    // Get top donors to contact (max 5)
    const donorsToContact = availableDonors.slice(0, 5);
    
    return {
        status: 'success',
        message: emergencyResponse.message || '🚨 EMERGENCY REQUEST SUBMITTED SUCCESSFULLY!',
        matching_donors: donorsArray.length,
        available_donors: availableDonors.length,
        donors_to_contact: donorsToContact,
        emergency_details: formData,
        emergency_id: emergencyResponse.emergency_id,
        timestamp: new Date().toISOString()
    };
}

function isEligibleForDonation(lastDonationDate) {
    if (!lastDonationDate || lastDonationDate === 'null' || lastDonationDate === '0000-00-00') return true;
    
    try {
        const lastDonation = new Date(lastDonationDate);
        const today = new Date();
        const daysSinceLastDonation = Math.floor((today - lastDonation) / (1000 * 60 * 60 * 24));
        
        return daysSinceLastDonation >= 56;
    } catch (e) {
        console.error('Error parsing donation date:', e);
        return true; // Assume eligible if date parsing fails
    }
}

// FIXED: Added missing showResponseMessage function
function showResponseMessage(response) {
    const messageDiv = $('#responseMessage');
    messageDiv.removeClass('success error').show();
    
    if (response.status === 'success') {
        messageDiv.addClass('success').html(`
            <h4>✅ ${response.message}</h4>
            ${response.details ? `<p>${response.details}</p>` : ''}
        `);
    } else {
        messageDiv.addClass('error').html(`
            <h4>❌ ${response.message}</h4>
            ${response.details ? `<p>${response.details}</p>` : ''}
        `);
    }
}

// FUNCTION: Show donors all at once
function showDonorsSequentially(response) {
    const messageDiv = $('#responseMessage');
    messageDiv.removeClass('success error').show();
    
    if (response.status === 'success') {
        let donorContacts = '';
        
        if (response.donors_to_contact && response.donors_to_contact.length > 0) {
            donorContacts = `
                <div style="background: #e8f5e8; padding: 20px; border-radius: 10px; margin: 20px 0; border: 2px solid #28a745;">
                    <h4 style="color: #155724; margin-bottom: 15px;">📱 SMS NOTIFICATIONS SENT!</h4>
                    <p style="margin-bottom: 15px;">We found ${response.available_donors} available donors and sent SMS alerts to ${response.donors_to_contact.length} donors in ${response.emergency_details.hospitalCity}:</p>
            `;
            
            // Show ALL donors at once
            response.donors_to_contact.forEach((donor, index) => {
                // FIXED: Handle different donor data structures
                const donorName = donor.full_name || donor.name || donor.fullName || 'Unknown Donor';
                const donorPhone = donor.phone || donor.contact || 'N/A';
                const donorBloodType = donor.blood_type || donor.bloodType || 'Unknown';
                const donorCity = donor.city || donor.location || 'Unknown';
                
                donorContacts += `
                    <div style="background: white; padding: 15px; margin: 10px 0; border-radius: 8px; border-left: 4px solid #28a745;">
                        <strong style="font-size: 1.1em;">${index + 1}. ${donorName}</strong><br>
                        <span style="color: #666;">📞 Phone: ${donorPhone}</span><br>
                        <span style="color: #666;">🩸 Blood Type: ${donorBloodType}</span><br>
                        <span style="color: #666;">📍 Location: ${donorCity}</span><br>
                        <span style="color: #28a745; font-weight: bold;">✅ SMS Alert Sent</span>
                    </div>
                `;
            });
            
            donorContacts += `
                    <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin-top: 15px;">
                        <strong>📱 Next Steps:</strong> 
                        <p style="margin: 5px 0 0 0;">Donors have been notified via SMS and will contact you directly. Please keep your phone available.</p>
                    </div>
                </div>
            `;
        } else {
            donorContacts = `
                <div style="background: #fff3cd; padding: 15px; border-radius: 8px; margin: 15px 0;">
                    <p>No available donors found in ${response.emergency_details.hospitalCity}. We've created an emergency alert and will notify you if any donors become available.</p>
                </div>
            `;
        }
        
        messageDiv.addClass('success').html(`
            <div style="text-align: center;">
                <h4 style="color: #155724; font-size: 1.5em;">✅ ${response.message}</h4>
                <p style="font-size: 1.1em;">Found ${response.matching_donors} matching donors in ${response.emergency_details.hospitalCity}</p>
            </div>
            ${donorContacts}
            <div style="background: #d1ecf1; padding: 15px; border-radius: 8px; margin-top: 15px;">
                <strong>Emergency Details:</strong><br>
                <strong>⏰ Time:</strong> ${new Date().toLocaleString()}<br>
                <strong>🏥 Hospital:</strong> ${response.emergency_details.hospital}<br>
                <strong>🩸 Blood Type:</strong> ${response.emergency_details.bloodType}<br>
                <strong>📞 Contact:</strong> ${response.emergency_details.contact}
            </div>
        `);
        
    } else {
        messageDiv.addClass('error').html(`
            <h4 style="color: #721c24;">❌ ${response.message}</h4>
            <p>Please try again or contact emergency services directly.</p>
        `);
    }
    
    // Scroll to response message
    $('html, body').animate({
        scrollTop: messageDiv.offset().top - 100
    }, 1000);
}

// Emergency contact functions
function callEmergency(number) {
    const cardId = number === '911' ? 'medicalEmergencyCard' : 
                  number === '+1-555-BLOOD-HELP' ? 'bloodBankCard' : 'patientCoordinatorCard';
    
    const card = document.getElementById(cardId);
    
    if (card) {
        card.classList.add('active');
    }
    
    alert(`Calling: ${number}\n\nPlease use your phone to complete the call.`);
    
    setTimeout(() => {
        if (card) {
            card.classList.remove('active');
        }
    }, 3000);
    
    console.log(`Initiating call to: ${number}`);
}

// Simulate live donor activity
function simulateDonorActivity() {
    setInterval(() => {
        const donorsElement = document.getElementById('activeDonors');
        if (!donorsElement) return;
        
        const currentText = donorsElement.textContent;
        const currentCount = parseInt(currentText) || 50;
        const newCount = Math.max(45, currentCount + Math.floor(Math.random() * 6) - 3);
        donorsElement.textContent = newCount + '+';
        
        donorsElement.style.animation = 'pulse 0.5s ease-in-out';
        setTimeout(() => {
            donorsElement.style.animation = '';
        }, 500);
    }, 15000);
}

function updateLiveDonorCount() {
    $.ajax({
        url: 'submit.php',
        type: 'GET',
        data: {
            action: 'getDonors'
        },
        success: function(response) {
            try {
                const donors = typeof response === 'string' ? JSON.parse(response) : response;
                const donorsArray = Array.isArray(donors) ? donors : [];
                const activeCount = donorsArray.filter(donor => {
                    const isAvailable = donor.available !== false && donor.available !== 'false';
                    return isAvailable;
                }).length;
                $('#activeDonors').text(activeCount + '+');
            } catch (e) {
                // Fallback to simulated count
                const baseCount = 50;
                const variation = Math.floor(Math.random() * 10) - 5;
                const liveCount = Math.max(10, baseCount + variation);
                $('#activeDonors').text(liveCount + '+');
            }
        },
        error: function() {
            // Fallback to simulated count
            const baseCount = 50;
            const variation = Math.floor(Math.random() * 10) - 5;
            const liveCount = Math.max(10, baseCount + variation);
            $('#activeDonors').text(liveCount + '+');
        }
    });
}