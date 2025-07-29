import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import jwt from 'jsonwebtoken';

describe('Client Controller Tests', () => {
    let authToken;
    let testUser;

    beforeEach(async () => {
        // Create a test user for authentication
        testUser = new User({
            name: 'Test User',
            email: 'testuser@example.com',
            phone: '1234567890',
            password: 'password123',
            role: 'user'
        });
        await testUser.save();

        // Generate authentication token
        authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET || 'test-secret');
    });

    describe('POST /api/clients - Create Client', () => {
        it('should create a new client successfully', async () => {
            const clientData = {
                name: 'John Smith',
                email: 'john.smith@example.com',
                phone: '5551234567',
                company: 'Smith Technologies Inc',
                address: '123 Business Street, Tech City, TC 12345'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(clientData)
                .expect(201);

            expect(response.body.message).toBe('Client created successfully');
            expect(response.body.client).toBeDefined();
            expect(response.body.client.name).toBe(clientData.name);
            expect(response.body.client.email).toBe(clientData.email);
            expect(response.body.client.phone).toBe(clientData.phone);
            expect(response.body.client.company).toBe(clientData.company);
            expect(response.body.client.address).toBe(clientData.address);
            expect(response.body.client.createdBy).toBeDefined();
            expect(response.body.client._id).toBeDefined();

            // Verify client was actually saved to database
            const savedClient = await Client.findById(response.body.client._id);
            expect(savedClient).toBeTruthy();
            expect(savedClient.name).toBe(clientData.name);
            expect(savedClient.email).toBe(clientData.email);
            expect(savedClient.createdBy.toString()).toBe(testUser._id.toString());
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteData = {
                name: 'John Smith',
                email: 'john@example.com'
                // Missing required phone and company fields
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(incompleteData)
                .expect(400);

            expect(response.body.error).toBeDefined();
            expect(typeof response.body.error).toBe('string');
        });

        it('should return 400 for invalid email format', async () => {
            const invalidEmailData = {
                name: 'John Smith',
                email: 'invalid-email-format',
                phone: '5551234567',
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidEmailData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 400 for empty name field', async () => {
            const emptyNameData = {
                name: '',
                email: 'john@example.com',
                phone: '5551234567',
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(emptyNameData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 400 for phone number too short', async () => {
            const shortPhoneData = {
                name: 'John Smith',
                email: 'john@example.com',
                phone: '123',
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(shortPhoneData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            const clientData = {
                name: 'John Smith',
                email: 'john@example.com',
                phone: '5551234567',
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .send(clientData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should return 401 with invalid authentication token', async () => {
            const clientData = {
                name: 'John Smith',
                email: 'john@example.com',
                phone: '5551234567',
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', 'Bearer invalid-token-here')
                .send(clientData)
                .expect(401);

            expect(response.body.error).toBe('Invalid token.');
        });

        it('should create client without optional address field', async () => {
            const clientDataNoAddress = {
                name: 'Jane Doe',
                email: 'jane.doe@example.com',
                phone: '5559876543',
                company: 'Doe Enterprises'
                // No address field provided
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(clientDataNoAddress)
                .expect(201);

            expect(response.body.client.name).toBe(clientDataNoAddress.name);
            expect(response.body.client.address).toBeUndefined();
        });
    });

    describe('GET /api/clients - Get All Clients', () => {
        beforeEach(async () => {
            // Create multiple test clients
            await Client.create([
                {
                    name: 'Client One',
                    email: 'client1@example.com',
                    phone: '1111111111',
                    company: 'Company One Ltd',
                    address: '111 First Street',
                    createdBy: testUser._id
                },
                {
                    name: 'Client Two',
                    email: 'client2@example.com',
                    phone: '2222222222',
                    company: 'Company Two Inc',
                    address: '222 Second Avenue',
                    createdBy: testUser._id
                },
                {
                    name: 'Client Three',
                    email: 'client3@example.com',
                    phone: '3333333333',
                    company: 'Company Three Corp',
                    createdBy: testUser._id
                }
            ]);
        });

        it('should get all clients successfully for authenticated user', async () => {
            const response = await request(app)
                .get('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);

            // Check that each client has required fields
            response.body.forEach(client => {
                expect(client.name).toBeDefined();
                expect(client.email).toBeDefined();
                expect(client.phone).toBeDefined();
                expect(client.company).toBeDefined();
                expect(client.createdBy).toBeDefined();
                expect(client._id).toBeDefined();
                expect(client.createdAt).toBeDefined();
                expect(client.updatedAt).toBeDefined();
            });

            // Verify clients are sorted by creation date (newest first)
            const createdDates = response.body.map(client => new Date(client.createdAt));
            expect(createdDates[0].getTime()).toBeGreaterThanOrEqual(createdDates[1].getTime());
            expect(createdDates[1].getTime()).toBeGreaterThanOrEqual(createdDates[2].getTime());
        });

        it('should return empty array when no clients exist', async () => {
            // Remove all clients
            await Client.deleteMany({});

            const response = await request(app)
                .get('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get('/api/clients')
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should return 401 with invalid authentication token', async () => {
            const response = await request(app)
                .get('/api/clients')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBe('Invalid token.');
        });
    });

    describe('GET /api/clients/:id - Get Client By ID', () => {
        let testClient;

        beforeEach(async () => {
            testClient = await Client.create({
                name: 'Test Client',
                email: 'testclient@example.com',
                phone: '5555555555',
                company: 'Test Company Ltd',
                address: '555 Test Street',
                createdBy: testUser._id
            });
        });

        it('should get client by ID successfully', async () => {
            const response = await request(app)
                .get(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body._id).toBe(testClient._id.toString());
            expect(response.body.name).toBe(testClient.name);
            expect(response.body.email).toBe(testClient.email);
            expect(response.body.phone).toBe(testClient.phone);
            expect(response.body.company).toBe(testClient.company);
            expect(response.body.address).toBe(testClient.address);
            expect(response.body.createdBy).toBeDefined();
        });

        it('should return 404 for non-existent client ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/clients/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });

        it('should return 400 for invalid ObjectId format', async () => {
            const invalidId = 'invalid-id-format';

            const response = await request(app)
                .get(`/api/clients/${invalidId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(500); // This will be caught by error handler

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get(`/api/clients/${testClient._id}`)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('PUT /api/clients/:id - Update Client', () => {
        let testClient;

        beforeEach(async () => {
            testClient = await Client.create({
                name: 'Original Client Name',
                email: 'original@example.com',
                phone: '1111111111',
                company: 'Original Company Ltd',
                address: 'Original Address',
                createdBy: testUser._id
            });
        });

        it('should update client successfully with all fields', async () => {
            const updateData = {
                name: 'Updated Client Name',
                email: 'updated@example.com',
                phone: '9999999999',
                company: 'Updated Company Inc',
                address: 'Updated Address 123'
            };

            const response = await request(app)
                .put(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Client updated successfully');
            expect(response.body.client.name).toBe(updateData.name);
            expect(response.body.client.email).toBe(updateData.email);
            expect(response.body.client.phone).toBe(updateData.phone);
            expect(response.body.client.company).toBe(updateData.company);
            expect(response.body.client.address).toBe(updateData.address);

            // Verify update in database
            const updatedClient = await Client.findById(testClient._id);
            expect(updatedClient.name).toBe(updateData.name);
            expect(updatedClient.email).toBe(updateData.email);
            expect(updatedClient.phone).toBe(updateData.phone);
            expect(updatedClient.company).toBe(updateData.company);
            expect(updatedClient.address).toBe(updateData.address);
        });

        it('should update client with partial data', async () => {
            const partialUpdateData = {
                name: 'Partially Updated Name',
                email: 'partial@example.com'
                // Only updating name and email
            };

            const response = await request(app)
                .put(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(partialUpdateData)
                .expect(200);

            expect(response.body.client.name).toBe(partialUpdateData.name);
            expect(response.body.client.email).toBe(partialUpdateData.email);
            // Other fields should remain unchanged
            expect(response.body.client.phone).toBe(testClient.phone);
            expect(response.body.client.company).toBe(testClient.company);
            expect(response.body.client.address).toBe(testClient.address);
        });

        it('should return 404 for non-existent client ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com',
                phone: '1234567890',
                company: 'Updated Company'
            };

            const response = await request(app)
                .put(`/api/clients/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });

        it('should return 400 for invalid update data', async () => {
            const invalidUpdateData = {
                name: '', // Empty name should fail validation
                email: 'invalid-email-format',
                phone: '123' // Too short
            };

            const response = await request(app)
                .put(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            const updateData = {
                name: 'Updated Name',
                email: 'updated@example.com',
                phone: '1234567890',
                company: 'Updated Company'
            };

            const response = await request(app)
                .put(`/api/clients/${testClient._id}`)
                .send(updateData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('DELETE /api/clients/:id - Delete Client', () => {
        let testClient;

        beforeEach(async () => {
            testClient = await Client.create({
                name: 'Client to Delete',
                email: 'delete@example.com',
                phone: '1111111111',
                company: 'Delete Company Ltd',
                address: 'Delete Address',
                createdBy: testUser._id
            });
        });

        it('should delete client successfully', async () => {
            const response = await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Client deleted successfully');

            // Verify client was actually deleted from database
            const deletedClient = await Client.findById(testClient._id);
            expect(deletedClient).toBeNull();
        });

        it('should return 404 for non-existent client ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .delete(`/api/clients/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should return 401 with invalid authentication token', async () => {
            const response = await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBe('Invalid token.');
        });

        it('should handle multiple delete attempts gracefully', async () => {
            // Delete client first time
            await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Try to delete same client again
            const response = await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });
    });

    describe('Client Data Integrity', () => {
        it('should maintain data relationships correctly', async () => {
            const clientData = {
                name: 'Relationship Test Client',
                email: 'relationship@example.com',
                phone: '5551234567',
                company: 'Relationship Test Company'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(clientData)
                .expect(201);

            // Verify the createdBy relationship
            expect(response.body.client.createdBy._id).toBe(testUser._id.toString());
            expect(response.body.client.createdBy.name).toBe(testUser.name);
            expect(response.body.client.createdBy.email).toBe(testUser.email);

            // Verify timestamps are present
            expect(response.body.client.createdAt).toBeDefined();
            expect(response.body.client.updatedAt).toBeDefined();
        });

        it('should handle concurrent client creation correctly', async () => {
            const clientData1 = {
                name: 'Concurrent Client 1',
                email: 'concurrent1@example.com',
                phone: '5551111111',
                company: 'Concurrent Company 1'
            };

            const clientData2 = {
                name: 'Concurrent Client 2',
                email: 'concurrent2@example.com',
                phone: '5552222222',
                company: 'Concurrent Company 2'
            };

            // Create both clients simultaneously
            const [response1, response2] = await Promise.all([
                request(app)
                    .post('/api/clients')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(clientData1),
                request(app)
                    .post('/api/clients')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(clientData2)
            ]);

            expect(response1.status).toBe(201);
            expect(response2.status).toBe(201);
            expect(response1.body.client.name).toBe(clientData1.name);
            expect(response2.body.client.name).toBe(clientData2.name);
            expect(response1.body.client._id).not.toBe(response2.body.client._id);
        });
    });
});