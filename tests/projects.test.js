import request from 'supertest';
import app from '../server.js';
import User from '../models/User.js';
import Client from '../models/Client.js';
import Project from '../models/Project.js';
import jwt from 'jsonwebtoken';

describe('Project Controller Tests', () => {
    let authToken;
    let testUser;
    let testClient;

    beforeEach(async () => {
        // Create test user
        testUser = new User({
            name: 'Project Test User',
            email: 'projectuser@example.com',
            phone: '1234567890',
            password: 'password123',
            role: 'user'
        });
        await testUser.save();

        // Create test client for project relationships
        testClient = new Client({
            name: 'Project Test Client',
            email: 'projectclient@example.com',
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
        it('should create a new project successfully with all fields', async () => {
            const projectData = {
                name: 'E-commerce Website Development',
                description: 'Complete e-commerce website development with modern design, payment integration, and admin dashboard functionality',
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
            expect(response.body.project).toBeDefined();
            expect(response.body.project.name).toBe(projectData.name);
            expect(response.body.project.description).toBe(projectData.description);
            expect(response.body.project.status).toBe(projectData.status);
            expect(response.body.project.budget).toBe(projectData.budget);
            expect(response.body.project.client).toBeDefined();
            expect(response.body.project.client._id).toBe(testClient._id.toString());
            expect(response.body.project.createdBy).toBeDefined();
            expect(response.body.project.createdBy._id).toBe(testUser._id.toString());

            // Verify project was saved to database
            const savedProject = await Project.findById(response.body.project._id);
            expect(savedProject).toBeTruthy();
            expect(savedProject.name).toBe(projectData.name);
            expect(savedProject.client.toString()).toBe(testClient._id.toString());
            expect(savedProject.createdBy.toString()).toBe(testUser._id.toString());
        });

        it('should create project with minimum required fields', async () => {
            const minimalProjectData = {
                name: 'Minimal Project',
                description: 'A project with only the minimum required fields for testing',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(minimalProjectData)
                .expect(201);

            expect(response.body.project.name).toBe(minimalProjectData.name);
            expect(response.body.project.description).toBe(minimalProjectData.description);
            expect(response.body.project.status).toBe('planning'); // Default status
            expect(response.body.project.endDate).toBeUndefined();
            expect(response.body.project.budget).toBeUndefined();
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

        it('should return 400 for invalid project name (too short)', async () => {
            const invalidData = {
                name: 'A', // Too short (less than 2 characters)
                description: 'Valid description for testing name validation',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 400 for invalid description (too short)', async () => {
            const invalidData = {
                name: 'Valid Project Name',
                description: 'Short', // Too short (less than 10 characters)
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 400 for invalid status value', async () => {
            const invalidData = {
                name: 'Status Test Project',
                description: 'Testing invalid status value validation',
                status: 'invalid-status-value',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 400 for negative budget', async () => {
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

        it('should return 400 for end date before start date', async () => {
            const invalidData = {
                name: 'Date Validation Project',
                description: 'Testing date validation with end date before start date',
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

        it('should return 404 for non-existent client', async () => {
            const nonExistentClientId = '507f1f77bcf86cd799439011';
            const projectData = {
                name: 'Non-existent Client Project',
                description: 'Project referencing a non-existent client for testing',
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
                description: 'This project creation should fail without authentication',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .send(projectData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should create project with all valid status values', async () => {
            const validStatuses = ['planning', 'in-progress', 'completed', 'on-hold'];

            for (const status of validStatuses) {
                const projectData = {
                    name: `${status} Project`,
                    description: `Project testing ${status} status value`,
                    status: status,
                    startDate: '2024-01-01',
                    client: testClient._id.toString()
                };

                const response = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData)
                    .expect(201);

                expect(response.body.project.status).toBe(status);
            }
        });
    });

    describe('GET /api/projects - Get All Projects', () => {
        beforeEach(async () => {
            // Create multiple test projects
            await Project.create([
                {
                    name: 'Website Development Project',
                    description: 'Complete website development with modern responsive design',
                    status: 'planning',
                    startDate: new Date('2024-01-01'),
                    budget: 15000,
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Mobile App Development',
                    description: 'Cross-platform mobile application development using React Native',
                    status: 'in-progress',
                    startDate: new Date('2024-02-01'),
                    endDate: new Date('2024-08-01'),
                    budget: 30000,
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Data Analytics Dashboard',
                    description: 'Business intelligence dashboard with real-time analytics and reporting',
                    status: 'completed',
                    startDate: new Date('2023-10-01'),
                    endDate: new Date('2024-01-01'),
                    budget: 20000,
                    client: testClient._id,
                    createdBy: testUser._id
                }
            ]);
        });

        it('should get all projects successfully for authenticated user', async () => {
            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(3);

            // Check that each project has required fields and populated relationships
            response.body.forEach(project => {
                expect(project.name).toBeDefined();
                expect(project.description).toBeDefined();
                expect(project.status).toBeDefined();
                expect(project.startDate).toBeDefined();
                expect(project.client).toBeDefined();
                expect(project.client.name).toBeDefined();
                expect(project.client.company).toBeDefined();
                expect(project.createdBy).toBeDefined();
                expect(project.createdBy.name).toBeDefined();
                expect(project._id).toBeDefined();
                expect(project.createdAt).toBeDefined();
                expect(project.updatedAt).toBeDefined();
            });

            // Verify projects are sorted by creation date (newest first)
            const createdDates = response.body.map(project => new Date(project.createdAt));
            expect(createdDates[0].getTime()).toBeGreaterThanOrEqual(createdDates[1].getTime());
            expect(createdDates[1].getTime()).toBeGreaterThanOrEqual(createdDates[2].getTime());
        });

        it('should return empty array when no projects exist', async () => {
            // Remove all projects
            await Project.deleteMany({});

            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get('/api/projects')
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should return 401 with invalid authentication token', async () => {
            const response = await request(app)
                .get('/api/projects')
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBe('Invalid token.');
        });
    });

    describe('GET /api/projects/client/:clientId - Get Projects by Client', () => {
        let anotherClient;

        beforeEach(async () => {
            // Create another client
            anotherClient = await Client.create({
                name: 'Second Test Client',
                email: 'secondclient@example.com',
                phone: '5555555555',
                company: 'Second Client Corporation',
                address: '456 Another Street',
                createdBy: testUser._id
            });

            // Create projects for different clients
            await Project.create([
                {
                    name: 'Project for First Client',
                    description: 'This project belongs specifically to the first test client',
                    status: 'planning',
                    startDate: new Date('2024-01-01'),
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Another Project for First Client',
                    description: 'Second project for the first client to test multiple projects',
                    status: 'in-progress',
                    startDate: new Date('2024-02-01'),
                    budget: 12000,
                    client: testClient._id,
                    createdBy: testUser._id
                },
                {
                    name: 'Project for Second Client',
                    description: 'This project belongs to the second test client',
                    status: 'completed',
                    startDate: new Date('2024-01-15'),
                    endDate: new Date('2024-05-15'),
                    budget: 18000,
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
            expect(response.body.length).toBe(2);

            // Verify all returned projects belong to the specified client
            response.body.forEach(project => {
                expect(project.client._id).toBe(testClient._id.toString());
                expect(project.client.name).toBe(testClient.name);
                expect(project.client.company).toBe(testClient.company);
            });

            // Check specific project names
            const projectNames = response.body.map(p => p.name);
            expect(projectNames).toContain('Project for First Client');
            expect(projectNames).toContain('Another Project for First Client');
            expect(projectNames).not.toContain('Project for Second Client');
        });

        it('should get projects for second client', async () => {
            const response = await request(app)
                .get(`/api/projects/client/${anotherClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(1);
            expect(response.body[0].name).toBe('Project for Second Client');
            expect(response.body[0].client._id).toBe(anotherClient._id.toString());
        });

        it('should return empty array for client with no projects', async () => {
            // Create a client with no projects
            const clientWithNoProjects = await Client.create({
                name: 'Empty Client',
                email: 'empty@example.com',
                phone: '7777777777',
                company: 'Empty Company',
                createdBy: testUser._id
            });

            const response = await request(app)
                .get(`/api/projects/client/${clientWithNoProjects._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(Array.isArray(response.body)).toBe(true);
            expect(response.body.length).toBe(0);
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get(`/api/projects/client/${testClient._id}`)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('GET /api/projects/:id - Get Project By ID', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Single Project Test',
                description: 'Project for testing individual project retrieval by ID',
                status: 'in-progress',
                startDate: new Date('2024-01-01'),
                endDate: new Date('2024-07-01'),
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
            expect(response.body.status).toBe(testProject.status);
            expect(response.body.budget).toBe(testProject.budget);
            expect(response.body.client).toBeDefined();
            expect(response.body.client._id).toBe(testClient._id.toString());
            expect(response.body.createdBy).toBeDefined();
            expect(response.body.createdBy._id).toBe(testUser._id.toString());
        });

        it('should return 404 for non-existent project ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';

            const response = await request(app)
                .get(`/api/projects/${nonExistentId}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .get(`/api/projects/${testProject._id}`)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });
    });

    describe('PUT /api/projects/:id - Update Project', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Original Project Name',
                description: 'Original project description for comprehensive update testing',
                status: 'planning',
                startDate: new Date('2024-01-01'),
                budget: 10000,
                client: testClient._id,
                createdBy: testUser._id
            });
        });

        it('should update project successfully with all fields', async () => {
            const updateData = {
                name: 'Updated Project Name',
                description: 'Updated project description with new requirements and specifications',
                status: 'in-progress',
                startDate: '2024-02-01',
                endDate: '2024-08-01',
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
            expect(response.body.project.description).toBe(updateData.description);
            expect(response.body.project.status).toBe(updateData.status);
            expect(response.body.project.budget).toBe(updateData.budget);

            // Verify update in database
            const updatedProject = await Project.findById(testProject._id);
            expect(updatedProject.name).toBe(updateData.name);
            expect(updatedProject.description).toBe(updateData.description);
            expect(updatedProject.status).toBe(updateData.status);
            expect(updatedProject.budget).toBe(updateData.budget);
        });

        it('should update project with partial data', async () => {
            const partialUpdateData = {
                name: 'Partially Updated Project Name',
                status: 'in-progress'
                // Only updating name and status
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(partialUpdateData)
                .expect(200);

            expect(response.body.project.name).toBe(partialUpdateData.name);
            expect(response.body.project.status).toBe(partialUpdateData.status);
            // Other fields should remain unchanged
            expect(response.body.project.description).toBe('Original project description for comprehensive update testing');
            expect(response.body.project.budget).toBe(10000);
        });

        it('should return 404 for non-existent project ID', async () => {
            const nonExistentId = '507f1f77bcf86cd799439011';
            const updateData = {
                name: 'Updated Project',
                description: 'Updated description for non-existent project',
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

        it('should return 400 for invalid update data', async () => {
            const invalidUpdateData = {
                name: '', // Empty name should fail validation
                description: 'Short', // Too short description
                status: 'invalid-status',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidUpdateData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should validate end date is after start date on update', async () => {
            const invalidDateData = {
                name: 'Date Validation Update',
                description: 'Testing date validation on project update',
                startDate: '2024-06-01',
                endDate: '2024-01-01', // End date before start date
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidDateData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should validate status enum values on update', async () => {
            const invalidStatusData = {
                name: 'Status Validation Update',
                description: 'Testing invalid status value on project update',
                status: 'invalid-status-value',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(invalidStatusData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should validate budget is non-negative on update', async () => {
            const negativeBudgetData = {
                name: 'Budget Validation Update',
                description: 'Testing negative budget validation on project update',
                startDate: '2024-01-01',
                budget: -8000, // Negative budget
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(negativeBudgetData)
                .expect(400);

            expect(response.body.error).toBeDefined();
        });

        it('should return 404 when updating with non-existent client', async () => {
            const nonExistentClientId = '507f1f77bcf86cd799439011';
            const updateData = {
                name: 'Client Validation Update',
                description: 'Testing update with non-existent client reference',
                startDate: '2024-01-01',
                client: nonExistentClientId
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(404);

            expect(response.body.error).toBe('Client not found');
        });

        it('should return 401 without authentication token', async () => {
            const updateData = {
                name: 'Unauthorized Update',
                description: 'This update should fail without authentication',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .put(`/api/projects/${testProject._id}`)
                .send(updateData)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should update project status through all valid states', async () => {
            const validStatuses = ['planning', 'in-progress', 'completed', 'on-hold'];

            for (const status of validStatuses) {
                const updateData = {
                    status: status
                };

                const response = await request(app)
                    .put(`/api/projects/${testProject._id}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(updateData)
                    .expect(200);

                expect(response.body.project.status).toBe(status);
            }
        });
    });

    describe('DELETE /api/projects/:id - Delete Project', () => {
        let testProject;

        beforeEach(async () => {
            testProject = await Project.create({
                name: 'Project to Delete',
                description: 'This project will be deleted during testing to verify deletion functionality',
                status: 'planning',
                startDate: new Date('2024-01-01'),
                budget: 8000,
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

            // Verify project was actually deleted from database
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

        it('should return 401 without authentication token', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .expect(401);

            expect(response.body.error).toBe('Access denied. No token provided.');
        });

        it('should return 401 with invalid authentication token', async () => {
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', 'Bearer invalid-token')
                .expect(401);

            expect(response.body.error).toBe('Invalid token.');
        });

        it('should handle multiple delete attempts gracefully', async () => {
            // Delete project first time
            await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            // Try to delete same project again
            const response = await request(app)
                .delete(`/api/projects/${testProject._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(404);

            expect(response.body.error).toBe('Project not found');
        });
    });

    describe('Project Data Integrity and Relationships', () => {
        it('should maintain proper client-project relationships', async () => {
            const projectData = {
                name: 'Relationship Test Project',
                description: 'Testing proper maintenance of client-project relationships',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const response = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            // Verify the client relationship is properly populated
            expect(response.body.project.client._id).toBe(testClient._id.toString());
            expect(response.body.project.client.name).toBe(testClient.name);
            expect(response.body.project.client.company).toBe(testClient.company);
            expect(response.body.project.client.email).toBe(testClient.email);

            // Verify the createdBy relationship
            expect(response.body.project.createdBy._id).toBe(testUser._id.toString());
            expect(response.body.project.createdBy.name).toBe(testUser.name);
            expect(response.body.project.createdBy.email).toBe(testUser.email);
        });

        it('should handle concurrent project operations correctly', async () => {
            const projectData1 = {
                name: 'Concurrent Project 1',
                description: 'First project for testing concurrent operations',
                startDate: '2024-01-01',
                budget: 15000,
                client: testClient._id.toString()
            };

            const projectData2 = {
                name: 'Concurrent Project 2',
                description: 'Second project for testing concurrent operations',
                startDate: '2024-02-01',
                budget: 20000,
                client: testClient._id.toString()
            };

            // Create both projects simultaneously
            const [response1, response2] = await Promise.all([
                request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData1),
                request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData2)
            ]);

            expect(response1.status).toBe(201);
            expect(response2.status).toBe(201);
            expect(response1.body.project.name).toBe(projectData1.name);
            expect(response2.body.project.name).toBe(projectData2.name);
            expect(response1.body.project._id).not.toBe(response2.body.project._id);
            expect(response1.body.project.budget).toBe(projectData1.budget);
            expect(response2.body.project.budget).toBe(projectData2.budget);
        });

        it('should maintain timestamps correctly on updates', async () => {
            // Create initial project
            const projectData = {
                name: 'Timestamp Test Project',
                description: 'Testing timestamp maintenance on project updates',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            const originalCreatedAt = createResponse.body.project.createdAt;
            const originalUpdatedAt = createResponse.body.project.updatedAt;

            // Wait a small amount to ensure timestamp difference
            await new Promise(resolve => setTimeout(resolve, 100));

            // Update the project
            const updateData = {
                name: 'Updated Timestamp Test Project',
                description: 'Updated description for timestamp testing'
            };

            const updateResponse = await request(app)
                .put(`/api/projects/${createResponse.body.project._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .send(updateData)
                .expect(200);

            // Verify timestamps
            expect(updateResponse.body.project.createdAt).toBe(originalCreatedAt);
            expect(new Date(updateResponse.body.project.updatedAt).getTime())
                .toBeGreaterThan(new Date(originalUpdatedAt).getTime());
        });

        it('should handle project filtering by multiple clients correctly', async () => {
            // Create additional clients
            const client2 = await Client.create({
                name: 'Filter Test Client 2',
                email: 'filterclient2@example.com',
                phone: '2222222222',
                company: 'Filter Test Company 2',
                createdBy: testUser._id
            });

            const client3 = await Client.create({
                name: 'Filter Test Client 3',
                email: 'filterclient3@example.com',
                phone: '3333333333',
                company: 'Filter Test Company 3',
                createdBy: testUser._id
            });

            // Create projects for different clients
            const projectPromises = [
                Project.create({
                    name: 'Project 1 for Client 1',
                    description: 'First project for the original test client',
                    startDate: new Date('2024-01-01'),
                    client: testClient._id,
                    createdBy: testUser._id
                }),
                Project.create({
                    name: 'Project 2 for Client 1',
                    description: 'Second project for the original test client',
                    startDate: new Date('2024-01-15'),
                    client: testClient._id,
                    createdBy: testUser._id
                }),
                Project.create({
                    name: 'Project 1 for Client 2',
                    description: 'First project for the second client',
                    startDate: new Date('2024-02-01'),
                    client: client2._id,
                    createdBy: testUser._id
                }),
                Project.create({
                    name: 'Project 1 for Client 3',
                    description: 'First project for the third client',
                    startDate: new Date('2024-03-01'),
                    client: client3._id,
                    createdBy: testUser._id
                })
            ];

            await Promise.all(projectPromises);

            // Test filtering by first client
            const client1Projects = await request(app)
                .get(`/api/projects/client/${testClient._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(client1Projects.body.length).toBe(2);
            client1Projects.body.forEach(project => {
                expect(project.client._id).toBe(testClient._id.toString());
            });

            // Test filtering by second client
            const client2Projects = await request(app)
                .get(`/api/projects/client/${client2._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(client2Projects.body.length).toBe(1);
            expect(client2Projects.body[0].client._id).toBe(client2._id.toString());

            // Test filtering by third client
            const client3Projects = await request(app)
                .get(`/api/projects/client/${client3._id}`)
                .set('Authorization', `Bearer ${authToken}`)
                .expect(200);

            expect(client3Projects.body.length).toBe(1);
            expect(client3Projects.body[0].client._id).toBe(client3._id.toString());
        });

        it('should validate project data constraints comprehensively', async () => {
            const testCases = [
                {
                    name: 'Name too long',
                    data: {
                        name: 'A'.repeat(101), // Exceeds 100 character limit
                        description: 'Valid description for testing name length validation',
                        startDate: '2024-01-01',
                        client: testClient._id.toString()
                    },
                    expectedStatus: 400
                },
                {
                    name: 'Description too long',
                    data: {
                        name: 'Valid Project Name',
                        description: 'A'.repeat(501), // Exceeds 500 character limit
                        startDate: '2024-01-01',
                        client: testClient._id.toString()
                    },
                    expectedStatus: 400
                },
                {
                    name: 'Invalid client ID format',
                    data: {
                        name: 'Valid Project Name',
                        description: 'Valid description for testing invalid client ID format',
                        startDate: '2024-01-01',
                        client: 'invalid-client-id-format'
                    },
                    expectedStatus: 400
                },
                {
                    name: 'Valid edge case data',
                    data: {
                        name: 'AB', // Minimum 2 characters
                        description: 'Valid desc', // Minimum 10 characters
                        startDate: '2024-01-01',
                        budget: 0, // Zero budget should be valid
                        client: testClient._id.toString()
                    },
                    expectedStatus: 201
                }
            ];

            for (const testCase of testCases) {
                const response = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(testCase.data);

                expect(response.status).toBe(testCase.expectedStatus);

                if (testCase.expectedStatus === 400) {
                    expect(response.body.error).toBeDefined();
                } else if (testCase.expectedStatus === 201) {
                    expect(response.body.project.name).toBe(testCase.data.name);
                }
            }
        });

        it('should handle complex project status transitions', async () => {
            // Create a project
            const projectData = {
                name: 'Status Transition Project',
                description: 'Testing complex status transitions throughout project lifecycle',
                status: 'planning',
                startDate: '2024-01-01',
                client: testClient._id.toString()
            };

            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            const projectId = createResponse.body.project._id;

            // Test status transitions
            const statusTransitions = [
                { from: 'planning', to: 'in-progress' },
                { from: 'in-progress', to: 'on-hold' },
                { from: 'on-hold', to: 'in-progress' },
                { from: 'in-progress', to: 'completed' }
            ];

            for (const transition of statusTransitions) {
                const updateResponse = await request(app)
                    .put(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send({ status: transition.to })
                    .expect(200);

                expect(updateResponse.body.project.status).toBe(transition.to);

                // Verify in database
                const dbProject = await Project.findById(projectId);
                expect(dbProject.status).toBe(transition.to);
            }
        });
    });

    describe('Project Business Logic Validation', () => {
        it('should validate realistic project scenarios', async () => {
            const realisticProjects = [
                {
                    name: 'Enterprise CRM System',
                    description: 'Complete customer relationship management system with advanced analytics, reporting, and integration capabilities',
                    status: 'planning',
                    startDate: '2024-03-01',
                    endDate: '2024-12-31',
                    budget: 150000,
                    client: testClient._id.toString()
                },
                {
                    name: 'Mobile Banking App',
                    description: 'Secure mobile banking application with biometric authentication and real-time transaction processing',
                    status: 'in-progress',
                    startDate: '2024-01-01',
                    endDate: '2024-09-30',
                    budget: 200000,
                    client: testClient._id.toString()
                },
                {
                    name: 'Data Migration Project',
                    description: 'Legacy system data migration to modern cloud infrastructure with zero downtime requirements',
                    status: 'completed',
                    startDate: '2023-06-01',
                    endDate: '2023-12-15',
                    budget: 75000,
                    client: testClient._id.toString()
                }
            ];

            for (const projectData of realisticProjects) {
                const response = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData)
                    .expect(201);

                expect(response.body.project.name).toBe(projectData.name);
                expect(response.body.project.description).toBe(projectData.description);
                expect(response.body.project.status).toBe(projectData.status);
                expect(response.body.project.budget).toBe(projectData.budget);

                // Verify dates are properly formatted
                expect(new Date(response.body.project.startDate)).toBeInstanceOf(Date);
                if (projectData.endDate) {
                    expect(new Date(response.body.project.endDate)).toBeInstanceOf(Date);
                }
            }
        });

        it('should handle edge cases in date validation', async () => {
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);

            const tomorrow = new Date(today);
            tomorrow.setDate(tomorrow.getDate() + 1);

            // Test past start date (should be allowed)
            const pastProjectData = {
                name: 'Past Start Date Project',
                description: 'Testing project with start date in the past',
                startDate: yesterday.toISOString().split('T')[0],
                client: testClient._id.toString()
            };

            const pastResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(pastProjectData)
                .expect(201);

            expect(pastResponse.body.project.name).toBe(pastProjectData.name);

            // Test future start date (should be allowed)
            const futureProjectData = {
                name: 'Future Start Date Project',
                description: 'Testing project with start date in the future',
                startDate: tomorrow.toISOString().split('T')[0],
                endDate: new Date(tomorrow.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0], // 30 days later
                client: testClient._id.toString()
            };

            const futureResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(futureProjectData)
                .expect(201);

            expect(futureResponse.body.project.name).toBe(futureProjectData.name);
        });

        it('should validate project budget ranges', async () => {
            const budgetTestCases = [
                {
                    name: 'Zero Budget Project',
                    budget: 0,
                    expectedStatus: 201
                },
                {
                    name: 'Small Budget Project',
                    budget: 1000,
                    expectedStatus: 201
                },
                {
                    name: 'Large Budget Project',
                    budget: 1000000,
                    expectedStatus: 201
                },
                {
                    name: 'Negative Budget Project',
                    budget: -1000,
                    expectedStatus: 400
                }
            ];

            for (const testCase of budgetTestCases) {
                const projectData = {
                    name: testCase.name,
                    description: `Testing ${testCase.name.toLowerCase()} budget validation`,
                    startDate: '2024-01-01',
                    budget: testCase.budget,
                    client: testClient._id.toString()
                };

                const response = await request(app)
                    .post('/api/projects')
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(projectData);

                expect(response.status).toBe(testCase.expectedStatus);

                if (testCase.expectedStatus === 201) {
                    expect(response.body.project.budget).toBe(testCase.budget);
                } else {
                    expect(response.body.error).toBeDefined();
                }
            }
        });

        it('should handle project lifecycle management', async () => {
            // Create a project in planning phase
            const projectData = {
                name: 'Lifecycle Management Project',
                description: 'Testing complete project lifecycle from planning to completion',
                status: 'planning',
                startDate: '2024-01-01',
                budget: 50000,
                client: testClient._id.toString()
            };

            const createResponse = await request(app)
                .post('/api/projects')
                .set('Authorization', `Bearer ${authToken}`)
                .send(projectData)
                .expect(201);

            const projectId = createResponse.body.project._id;

            // Simulate project progression through different phases
            const phases = [
                {
                    status: 'in-progress',
                    updates: { startDate: '2024-02-01' }
                },
                {
                    status: 'on-hold',
                    updates: { description: 'Project temporarily on hold due to resource constraints' }
                },
                {
                    status: 'in-progress',
                    updates: { description: 'Project resumed with additional resources allocated' }
                },
                {
                    status: 'completed',
                    updates: {
                        endDate: '2024-08-31',
                        description: 'Project successfully completed within budget and timeline'
                    }
                }
            ];

            for (const phase of phases) {
                const updateData = {
                    status: phase.status,
                    ...phase.updates
                };

                const updateResponse = await request(app)
                    .put(`/api/projects/${projectId}`)
                    .set('Authorization', `Bearer ${authToken}`)
                    .send(updateData)
                    .expect(200);

                expect(updateResponse.body.project.status).toBe(phase.status);

                // Verify each update in database
                const dbProject = await Project.findById(projectId);
                expect(dbProject.status).toBe(phase.status);

                if (phase.updates.description) {
                    expect(dbProject.description).toBe(phase.updates.description);
                }
            }
        });
    });
});