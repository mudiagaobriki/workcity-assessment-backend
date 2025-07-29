import request from 'supertest';
import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';
import app from '../../app.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';

describe('Project Controller Tests', () => {
    let mongoServer;
    let authToken;
    let testUser;
    let testClient;

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
        await Project.deleteMany({});

        // Create test user
        testUser = new User({
            name: 'Project Test User',
            email: `projectuser${Date.now()}@example.com`, // Unique email
            phone: '1234567890',
            password: 'password123',
            role: 'user'
        });
        await testUser.save();

        // Create test client
        testClient = new Client({
            name: 'Project Test Client',
            email: `projectclient${Date.now()}@example.com`, // Unique email
            phone: '0987654321',
            company: 'Project Client Corporation',
            address: '123 Client Street',
            createdBy: testUser._id
        });
        await testClient.save();

        // Generate authentication token
        authToken = jwt.sign({ userId: testUser._id }, process.env.JWT_SECRET || 'test-secret');
    });

    describe('POST /api/projects - Create Project', () => {
        it('should create a new project successfully', async () => {
            const projectData = {
                name: 'E-commerce Website Development',
                description: 'Complete e-commerce website development with modern design',
                status: 'planning',
                startDate: '2024-01-15',
                endDate: '2024-06-15',
                budget: 25000,
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            expect(response.body.message).toBe('Project created successfully');
            expect(response.body.project.name).toBe(projectData.name);
            expect(response.body.project.description).toBe(projectData.description);
            expect(response.body.project.status).toBe(projectData.status);
            expect(response.body.project.budget).toBe(projectData.budget);
        });

        it('should create project with minimum required fields', async () => {
            const minimalProjectData = {
                name: 'Minimal Project',
                description: 'A project with minimum required fields',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(minimalProjectData)
                .expect(201);

            expect(response.body.project.name).toBe(minimalProjectData.name);
            expect(response.body.project.status).toBe('planning'); // Default status
        });

        it('should return 400 for missing required fields', async () => {
            const incompleteData = {
                name: 'Incomplete Project',
                description: 'Missing required fields'
                // Missing startDate and client
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(incompleteData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 404 for non-existent client', async () => {
            const nonExistentClientId = '507f1f77bcf86cd799439011';
            const projectData = {
                name: 'Non-existent Client Project',
                description: 'Project referencing a non-existent client',
                startDate: '2024-01-01',
                client: nonExistentClientId
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });

        it('should return 401 without authentication token', async () => {
            const projectData = {
                name: 'Unauthorized Project',
                description: 'This project creation should fail',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('GET /api/projects - Get All Projects', () => {
        beforeEach(async () => {
            // Create test projects
            await Project.create([
                {
                    name: 'Website Development Project',
                    description: 'Complete website development with modern design',
                    status: 'planning',
                    startDate: new Date('2024-01-01'),
                    budget: 15000,
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Mobile App Development',
                    description: 'Cross-platform mobile application development',
                    status: 'in-progress',
                    startDate: new Date('2024-02-01'),
                    budget: 30000,
                    client: testClient._id,
                    createdBy: testUser._id
                }
            ]);
        });

        it('should get all projects successfully', async () => {
            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(2);
            expect(response.body[0].name).toBeDefined();
            expect(response.body[0].client).toBeDefined();
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('GET /api/projects/client/:clientId - Get Projects by Client', () => {
        let anotherClient;

        beforeEach(async () => {
            // Create another client
            anotherClient = await Client.create({
                name: 'Second Test Client',
                email: `secondclient${Date.now()}@example.com`,
                phone: '5555555555',
                company: 'Second Client Corporation',
                createdBy: testUser._id
            });

            // Create projects for different clients
            await Project.create([
                {
                    name: 'Project for First Client',
                    description: 'This project belongs to the first client',
                    status: 'planning',
                    startDate: new Date('2024-01-01'),
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Project for Second Client',
                    description: 'This project belongs to the second client',
                    status: 'completed',
                    startDate: new Date('2024-01-15'),
                    client: anotherClient._id,
                    createdBy: testUser._id
                }
            ]);
        });

        it('should get projects by specific client ID', async () => {
            const response = await request(app)
                .get(`/api/projects/client/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Project for First Client');
        });
    });

    describe('GET /api/projects/:id - Get Project By ID', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Single Project Test',
                description: 'Project for testing individual retrieval',
                status: 'in-progress',
                startDate: new Date('2024-01-01'),
                budget: 22000,
                client: testClient._id,
                createdBy: testUser._id
            });
        });

        it('should get project by ID successfully', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body._id).toBe(testProject._id.toString());
            expect(response.body.name).toBe(testProject.name);
            expect(response.body.description).toBe(testProject.description);
        });

        it('should return 404 for non-existent project ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/projects/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });
    });

    describe('PUT /api/projects/:id - Update Project', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Original Project Name',
                description: 'Original project description for testing updates',
                status: 'planning',
                startDate: new Date('2024-01-01'),
                budget: 10000,
                client: testClient._id,
                createdBy: testUser._id
            });
        });

        it('should update project successfully', async () => {
            const updateData = {
                name: 'Updated Project Name',
                description: 'Updated project description with more details',
                status: 'in-progress',
                startDate: '2024-01-01',
                budget: 18000,
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            expect(response.body.message).toBe('Project updated successfully');
            expect(response.body.project.name).toBe(updateData.name);
            expect(response.body.project.status).toBe(updateData.status);
        });

        it('should return 404 for non-existent project ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const updateData = {
                name: 'Updated Project',
                description: 'Updated description for testing',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });
    });

    describe('DELETE /api/projects/:id - Delete Project', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This project will be deleted',
                status: 'planning',
                startDate: new Date('2024-01-01'),
                client: testClient._id,
                createdBy: testUser._id
            });
        });

        it('should delete project successfully', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(response.body.message).toBe('Project deleted successfully');

            // Verify project was deleted
            const deletedProject = await Project.findById(testProject._id);
            expect(deletedProject).toBeNull();
        });

        it('should return 404 for non-existent project ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .delete(`/api/projects/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });
    });

    describe('Project Validation', () => {
        it('should validate negative budget', async () => {
            const invalidData = {
                name: 'Budget Test Project',
                description: 'Testing negative budget validation',
                startDate: '2024-01-01',
                budget: -5000,
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should validate end date before start date', async () => {
            const invalidData = {
                name: 'Date Validation Project',
                description: 'Testing date validation',
                startDate: '2024-06-01',
                endDate: '2024-01-01', // End date before start date
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });
    });
});