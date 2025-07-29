import express from 'express';
import { signup, login } from '../controllers/authController.js';
import { authLimiter } from '../middleware/rateLimiter.js';

const router = express.Router();

// Apply auth rate limiting to all auth routes
router.use(authLimiter);

router.post('/signup', signup);
router.post('/login', login);

export default router;