import express from 'express';
import {
    createProject,
    getAllProjects,
    getProjectsByClient,
    getProjectById,
    updateProject,
    deleteProject
} from '../controllers/projectController.js';
import { auth } from '../middleware/auth.js';
import { crudLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply CRUD rate limiting to all project routes
router.use(crudLimiter);

// Project routes
router.post('/', auth, createProject);
router.get('/', auth, getAllProjects);
router.get('/client/:clientId', auth, getProjectsByClient);
router.get('/:id', auth, getProjectById);
router.put('/:id', auth, updateProject);
router.delete('/:id', auth, deleteProject);

export default router;