import express from 'express';
import cors from 'cors';
import { connect } from "./config/database.js";
import dotenv from "dotenv";
import {generalLimiter} from "./src/middleware/rateLimiter.js";
import authRoutes from "./src/routes/authRoutes.js";
import userRoutes from "./src/routes/userRoutes.js";

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


connect();

export default app;