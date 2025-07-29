import express from 'express';
import cors from 'cors';
import { connect } from "./config/database.js";
import dotenv from "dotenv";

dotenv.config();

const app = express();

// Trust proxy (important for rate limiting behind reverse proxies)
app.set('trust proxy', 1);

// Middleware
app.use(cors());
app.use(express.json());

connect();

export default app;