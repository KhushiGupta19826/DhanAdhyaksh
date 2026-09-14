import express, { Express } from 'express';
import cors from 'cors';
import './utils/serializer'; // Initialize BigInt JSON serialization
import { config } from './utils/config';
import apiRoutes from './routes';
import { notFoundHandler, errorHandler } from './middleware/errorHandler';

const app: Express = express();

// Security & CORS
app.use(cors({
  origin: config.corsOrigin,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  credentials: true,
}));

// Body Parsing
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Request logging in non-test environments
if (!config.isTest) {
  app.use((req, _res, next) => {
    const timestamp = new Date().toISOString();
    console.log(`[${timestamp}] ${req.method} ${req.originalUrl}`);
    next();
  });
}

// Mount API routes
app.use('/api', apiRoutes);

// Centralized Error Handling Middlewares
app.use(notFoundHandler);
app.use(errorHandler);

export default app;
