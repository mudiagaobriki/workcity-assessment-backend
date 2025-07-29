import express from 'express';
import cors from 'cors';
import { connect } from "./config/database.js";
import dotenv from "dotenv";
import {generalLimiter} from "./src/middleware/rateLimiter.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";
import clientRoutes from "./src/routes/clientRoutes.js";
import projectRoutes from "./src/routes/projectRoutes.js";

dotenv.config();

const app = express();

// Trust proxy (important for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

app.use(cors());
app.use(express.json());

// Apply general rate limiting to all requests
app.use(generalLimiter);

app.use('/api/auth', authRoutes);
app.use('/api/users', userRoutes);
app.use('/api/clients', clientRoutes)
app.use('/api/projects', projectRoutes)

connect();

const PORT = process.env.PORT || 3040;

if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
        console.log(`Server running on port ${PORT}`);
    });
}

export default app;