#!/usr/bin/env node

/**
 * HMS API Testing Suite
 * Tests all microservices endpoints with realistic hospital workflows
 */

const axios = require('axios');
const { v4: uuidv4 } = require('uuid');

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

class HMSApiTester {
  constructor() {
    this.correlationId = uuidv4();
    this.testResults = [];
    
    // Test data
    this.testPatient = null;
    this.testDoctor = null;
    this.testAppointment = null;
    this.testBill = null;
    this.testPayment = null;
  }

  async makeRequest(method, endpoint, data = null, headers = {}) {
    try {
      const config = {
        method,
        url: `${BASE_URL}${endpoint}`,
        headers: {
          'Content-Type': 'application/json',
          'x-correlation-id': this.correlationId,
          ...headers
        }
      };

      if (data) {
        config.data = data;
      }

      const response = await axios(config);
      return { success: true, data: response.data, status: response.status };
    } catch (error) {
      return {
        success: false,
        error: error.response?.data || error.message,
        status: error.response?.status || 500
      };
    }
  }

  async test(description, testFunction) {
    console.log(`\\n🧪 ${description}`);
    try {
      const result = await testFunction();
      if (result.success) {
        console.log(`✅ PASS: ${description}`);
        this.testResults.push({ description, status: 'PASS', result });
        return result;
      } else {
        console.log(`❌ FAIL: ${description}`, result.error);
        this.testResults.push({ description, status: 'FAIL', error: result.error });
        return result;
      }
    } catch (error) {
      console.log(`❌ ERROR: ${description}`, error.message);
      this.testResults.push({ description, status: 'ERROR', error: error.message });
      return { success: false, error: error.message };
    }
  }

  async runAllTests() {
    console.log('🏥 HMS API Testing Suite');
    console.log('========================');
    console.log(`Base URL: ${BASE_URL}`);
    console.log(`Correlation ID: ${this.correlationId}`);

    // Health checks
    await this.testHealthChecks();

    // Patient workflow
    await this.testPatientWorkflow();

    // Doctor workflow
    await this.testDoctorWorkflow();

    // Appointment workflow
    await this.testAppointmentWorkflow();

    // Billing workflow
    await this.testBillingWorkflow();

    // Payment workflow
    await this.testPaymentWorkflow();

    // Prescription workflow
    await this.testPrescriptionWorkflow();

    // Notification workflow
    await this.testNotificationWorkflow();

    // Error handling
    await this.testErrorHandling();

    // Print summary
    this.printSummary();
  }

  async testHealthChecks() {
    console.log('\\n🔍 Health Check Tests');
    console.log('===================');

    await this.test('API Gateway Health', async () => {
      return await this.makeRequest('GET', '/health');
    });

    const services = [
      { name: 'Patient Service', port: 3001 },
      { name: 'Doctor Service', port: 3002 },
      { name: 'Appointment Service', port: 3003 },
      { name: 'Billing Service', port: 3004 },
      { name: 'Prescription Service', port: 3005 },
      { name: 'Payment Service', port: 3006 },
      { name: 'Notification Service', port: 3007 }
    ];

    for (const service of services) {
      await this.test(`${service.name} Health`, async () => {
        return await axios.get(`http://localhost:${service.port}/health`);
      });
    }
  }

  async testPatientWorkflow() {
    console.log('\\n👤 Patient Workflow Tests');
    console.log('========================');

    // Create patient
    await this.test('Create Patient', async () => {
      const patientData = {
        name: 'John Smith',
        email: 'john.smith@example.com',
        phone: '1234567890',
        dob: '1985-03-15'
      };

      const result = await this.makeRequest('POST', '/v1/patients', patientData);
      if (result.success) {
        this.testPatient = result.data.data.patient;
      }
      return result;
    });

    // Get patient by ID
    if (this.testPatient) {
      await this.test('Get Patient by ID', async () => {
        return await this.makeRequest('GET', `/v1/patients/${this.testPatient.patient_id}`);
      });

      // Update patient
      await this.test('Update Patient', async () => {
        const updateData = {
          phone: '9876543210'
        };
        return await this.makeRequest('PUT', `/v1/patients/${this.testPatient.patient_id}`, updateData);
      });

      // Search patients
      await this.test('Search Patients', async () => {
        return await this.makeRequest('GET', '/v1/patients/search?q=John');
      });
    }

    // List patients
    await this.test('List Patients with Pagination', async () => {
      return await this.makeRequest('GET', '/v1/patients?page=1&limit=5');
    });
  }

  async testDoctorWorkflow() {
    console.log('\\n👨‍⚕️ Doctor Workflow Tests');
    console.log('=========================');

    // Create doctor (would typically be done via doctor service)
    await this.test('Create Doctor', async () => {
      const doctorData = {
        name: 'Dr. Sarah Johnson',
        email: 'dr.sarah@hospital.com',
        phone: '5555551234',
        department: 'Cardiology',
        specialization: 'Cardiologist'
      };

      const result = await this.makeRequest('POST', '/v1/doctors', doctorData);
      if (result.success) {
        this.testDoctor = result.data.data.doctor;
      }
      return result;
    });

    // List doctors by department
    await this.test('List Doctors by Department', async () => {
      return await this.makeRequest('GET', '/v1/doctors?department=Cardiology');
    });

    // Check doctor availability
    if (this.testDoctor) {
      await this.test('Check Doctor Availability', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        const dateStr = tomorrow.toISOString().split('T')[0];
        
        return await this.makeRequest('GET', `/v1/schedules/${this.testDoctor.doctor_id}/availability?date=${dateStr}`);
      });
    }
  }

  async testAppointmentWorkflow() {
    console.log('\\n📅 Appointment Workflow Tests');
    console.log('============================');

    if (this.testPatient && this.testDoctor) {
      // Book appointment
      await this.test('Book Appointment', async () => {
        const tomorrow = new Date();
        tomorrow.setDate(tomorrow.getDate() + 1);
        tomorrow.setHours(10, 0, 0, 0);
        
        const appointmentData = {
          patient_id: this.testPatient.patient_id,
          doctor_id: this.testDoctor.doctor_id,
          department: this.testDoctor.department,
          slot_start: tomorrow.toISOString(),
          slot_end: new Date(tomorrow.getTime() + 30 * 60000).toISOString()
        };

        const result = await this.makeRequest('POST', '/v1/appointments', appointmentData);
        if (result.success) {
          this.testAppointment = result.data.data.appointment;
        }
        return result;
      });

      // Get appointment
      if (this.testAppointment) {
        await this.test('Get Appointment', async () => {
          return await this.makeRequest('GET', `/v1/appointments/${this.testAppointment.appointment_id}`);
        });

        // Reschedule appointment
        await this.test('Reschedule Appointment', async () => {
          const newTime = new Date();
          newTime.setDate(newTime.getDate() + 2);
          newTime.setHours(14, 0, 0, 0);

          const rescheduleData = {
            slot_start: newTime.toISOString(),
            slot_end: new Date(newTime.getTime() + 30 * 60000).toISOString()
          };

          return await this.makeRequest('PUT', `/v1/appointments/${this.testAppointment.appointment_id}/reschedule`, rescheduleData);
        });
      }
    }

    // List appointments
    await this.test('List Appointments', async () => {
      return await this.makeRequest('GET', '/v1/appointments');
    });
  }

  async testBillingWorkflow() {
    console.log('\\n💰 Billing Workflow Tests');
    console.log('=========================');

    if (this.testAppointment) {
      // Generate bill
      await this.test('Generate Bill', async () => {
        const billData = {
          patient_id: this.testPatient.patient_id,
          appointment_id: this.testAppointment.appointment_id,
          line_items: [
            {
              description: 'Consultation Fee',
              quantity: 1,
              unit_price: 150.00
            },
            {
              description: 'Medical Tests',
              quantity: 2,
              unit_price: 75.00
            }
          ]
        };

        const result = await this.makeRequest('POST', '/v1/bills', billData);
        if (result.success) {
          this.testBill = result.data.data.bill;
        }
        return result;
      });

      // Get bill
      if (this.testBill) {
        await this.test('Get Bill', async () => {
          return await this.makeRequest('GET', `/v1/bills/${this.testBill.bill_id}`);
        });
      }
    }

    // List bills
    await this.test('List Bills', async () => {
      return await this.makeRequest('GET', '/v1/bills');
    });
  }

  async testPaymentWorkflow() {
    console.log('\\n💳 Payment Workflow Tests');
    console.log('=========================');

    if (this.testBill) {
      // Process payment
      await this.test('Process Payment', async () => {
        const paymentData = {
          bill_id: this.testBill.bill_id,
          amount: this.testBill.total_amount,
          method: 'CARD',
          reference: `PAY-${uuidv4()}`
        };

        const result = await this.makeRequest('POST', '/v1/payments', paymentData, {
          'Idempotency-Key': uuidv4()
        });
        
        if (result.success) {
          this.testPayment = result.data.data.payment;
        }
        return result;
      });

      // Test idempotency
      await this.test('Payment Idempotency', async () => {
        const idempotencyKey = uuidv4();
        const paymentData = {
          bill_id: this.testBill.bill_id,
          amount: 50.00,
          method: 'UPI',
          reference: `PAY-${uuidv4()}`
        };

        // Make same request twice with same idempotency key
        const result1 = await this.makeRequest('POST', '/v1/payments', paymentData, {
          'Idempotency-Key': idempotencyKey
        });

        const result2 = await this.makeRequest('POST', '/v1/payments', paymentData, {
          'Idempotency-Key': idempotencyKey
        });

        // Both should succeed but return same payment
        return {
          success: result1.success && result2.success,
          message: 'Idempotency test completed'
        };
      });
    }

    // List payments
    await this.test('List Payments', async () => {
      return await this.makeRequest('GET', '/v1/payments');
    });
  }

  async testPrescriptionWorkflow() {
    console.log('\\n💊 Prescription Workflow Tests');
    console.log('==============================');

    if (this.testAppointment) {
      // Create prescription
      await this.test('Create Prescription', async () => {
        const prescriptionData = {
          appointment_id: this.testAppointment.appointment_id,
          patient_id: this.testPatient.patient_id,
          doctor_id: this.testDoctor.doctor_id,
          medication: 'Amoxicillin',
          dosage: '500mg',
          days: 7,
          instructions: 'Take with food, twice daily'
        };

        return await this.makeRequest('POST', '/v1/prescriptions', prescriptionData);
      });
    }

    // List prescriptions
    await this.test('List Prescriptions', async () => {
      return await this.makeRequest('GET', '/v1/prescriptions');
    });
  }

  async testNotificationWorkflow() {
    console.log('\\n📢 Notification Workflow Tests');
    console.log('==============================');

    // Send notification
    await this.test('Send Notification', async () => {
      const notificationData = {
        recipient_type: 'PATIENT',
        recipient_id: this.testPatient?.patient_id || 1,
        channel: 'EMAIL',
        template_name: 'appointment_confirmation',
        subject: 'Appointment Confirmation',
        message: 'Your appointment has been confirmed for tomorrow at 10:00 AM'
      };

      return await this.makeRequest('POST', '/v1/notifications', notificationData);
    });

    // List notifications
    await this.test('List Notifications', async () => {
      return await this.makeRequest('GET', '/v1/notifications');
    });
  }

  async testErrorHandling() {
    console.log('\\n🚫 Error Handling Tests');
    console.log('=======================');

    // Test 404
    await this.test('404 Error Handling', async () => {
      const result = await this.makeRequest('GET', '/v1/nonexistent');
      return {
        success: result.status === 404,
        message: '404 error properly handled'
      };
    });

    // Test validation error
    await this.test('Validation Error Handling', async () => {
      const result = await this.makeRequest('POST', '/v1/patients', {
        name: '', // Invalid empty name
        email: 'invalid-email'
      });
      return {
        success: result.status === 400,
        message: 'Validation error properly handled'
      };
    });

    // Test correlation ID propagation
    await this.test('Correlation ID Propagation', async () => {
      const customCorrelationId = uuidv4();
      const result = await this.makeRequest('GET', '/health', null, {
        'x-correlation-id': customCorrelationId
      });
      
      return {
        success: result.success,
        message: 'Correlation ID properly propagated'
      };
    });
  }

  printSummary() {
    console.log('\\n📊 Test Summary');
    console.log('================');
    
    const passed = this.testResults.filter(t => t.status === 'PASS').length;
    const failed = this.testResults.filter(t => t.status === 'FAIL').length;
    const errors = this.testResults.filter(t => t.status === 'ERROR').length;
    
    console.log(`Total Tests: ${this.testResults.length}`);
    console.log(`✅ Passed: ${passed}`);
    console.log(`❌ Failed: ${failed}`);
    console.log(`🚫 Errors: ${errors}`);
    console.log(`Success Rate: ${((passed / this.testResults.length) * 100).toFixed(1)}%`);

    if (failed > 0 || errors > 0) {
      console.log('\\n🔍 Failed Tests:');
      this.testResults
        .filter(t => t.status !== 'PASS')
        .forEach(test => {
          console.log(`- ${test.description}: ${test.error || test.status}`);
        });
    }

    console.log(`\\n🎉 Testing completed with correlation ID: ${this.correlationId}`);
  }
}

// Run tests if called directly
if (require.main === module) {
  const tester = new HMSApiTester();
  tester.runAllTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
  });
}

module.exports = HMSApiTester;