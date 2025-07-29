import User from '../models/User.js';

// Get all users (admin only)
export const getAllUsers = async (req, res) => {
    try {
        const users = await User.find().select('-password');
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
};

// Get current user profile
export const getUserProfile = async (req, res) => {
    res.json(req.user);
};