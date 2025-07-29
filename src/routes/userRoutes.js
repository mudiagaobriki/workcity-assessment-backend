import express from 'express';
import { getAllUsers, getUserProfile } from '../controllers/userController.js';
import { auth, adminAuth } from '../middleware/auth.js';
import { adminLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

router.get('/', auth, adminAuth, adminLimiter, getAllUsers);
router.get('/profile', auth, getUserProfile);

export default router;