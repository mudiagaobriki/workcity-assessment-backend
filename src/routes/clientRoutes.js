import express from 'express';
import {
    createClient,
    getAllClients,
    getClientById,
    updateClient,
    deleteClient
} from '../controllers/clientController.js';
import { auth } from '../middleware/auth.js';
import { crudLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply CRUD rate limiting to all client routes
router.use(crudLimiter);

router.post('/', auth, createClient);
router.get('/', auth, getAllClients);
router.get('/:id', auth, getClientById);
router.put('/:id', auth, updateClient);
router.delete('/:id', auth, deleteClient);

export default router;