import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import jwt from 'jsonwebtoken';

describe('Client Controller Tests', () => {
    let mongoServer;
    let authToken;
    let testUser;

    beforeAll(async () => {
        // Close any existing connections
        if (mongoose.connection.readyState !== 0) {
            await mongoose.disconnect();
        }

        // Setup in-memory MongoDB
        mongoServer = await MongoMemoryServer.create();
        const mongoUri = mongoServer.getUri();
        await mongoose.connect(mongoUri);
    });

    afterAll(async () => {
        await mongoose.disconnect();
        await mongoServer.stop();
    });

    beforeEach(async () => {
        // Clear database
        await User.deleteMany({});
        await Client.deleteMany({});

        // Create a test user for authentication
        testUser = new User({
            name: 'Test User',
            email: `testuser${Date.now()}@example.com`, // Unique email
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
                address: '123 Business Street'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(clientData)
                .expect(201);

            expect(response.body.message).toBe('Client created successfully');
            expect(response.body.client.name).toBe(clientData.name);
            expect(response.body.client.email).toBe(clientData.email);
            expect(response.body.client.phone).toBe(clientData.phone);
            expect(response.body.client.company).toBe(clientData.company);
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
    });

    describe('GET /api/clients - Get All Clients', () => {
        beforeEach(async () => {
            // Create test clients
            await Client.create([
                {
                    name: 'Client One',
                    email: 'client1@example.com',
                    phone: '1111111111',
                    company: 'Company One Ltd',
                    createdBy: testUser._id
                },
                {
                    name: 'Client Two',
                    email: 'client2@example.com',
                    phone: '2222222222',
                    company: 'Company Two Inc',
                    createdBy: testUser._id
                }
            ]);
        });

        it('should get all clients successfully', async () => {
            const response = await request(app)
                .get('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            expect(response.body[0].name).toBeDefined();
            expect(response.body[0].email).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get('/api/clients')
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
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
        });

        it('should return 404 for non-existent client ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/clients/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
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
                createdBy: testUser._id
            });
        });

        it('should update client successfully', async () => {
            const updateData = {
                name: 'Updated Client Name',
                email: 'updated@example.com',
                phone: '9999999999',
                company: 'Updated Company Inc'
            };

            const response = await request(app)
                .put(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Client updated successfully');
            expect(response.body.client.name).toBe(updateData.name);
            expect(response.body.client.email).toBe(updateData.email);
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
    });

    describe('DELETE /api/clients/:id - Delete Client', () => {
        let testClient;

        beforeEach(async () => {
            testClient = await Client.create({
                name: 'Client to Delete',
                email: 'delete@example.com',
                phone: '1111111111',
                company: 'Delete Company Ltd',
                createdBy: testUser._id
            });
        });

        it('should delete client successfully', async () => {
            const response = await request(app)
                .delete(`/api/clients/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Client deleted successfully');

            // Verify client was deleted
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
    });

    describe('Client Data Validation', () => {
        it('should handle email validation', async () => {
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

        it('should handle phone validation', async () => {
            const shortPhoneData = {
                name: 'John Smith',
                email: 'john@example.com',
                phone: '123', // Too short
                company: 'Smith Technologies'
            };

            const response = await request(app)
                .post('/api/clients')
                .set('Authorization', `Bearer ${authToken}`)
                .send(shortPhoneData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});