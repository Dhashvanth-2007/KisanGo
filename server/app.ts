import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { seedData } from './db/seed.js';
import apiRouter from './routes/api.js';

export const app = express();

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Middleware to ensure DB is initialized on incoming requests
let isInitialized = false;
let initPromise: Promise<void> | null = null;

export async function ensureInitialized() {
  if (isInitialized) return;
  if (!initPromise) {
    initPromise = (async () => {
      try {
        console.log('🌱 Initializing Kisan Go Database...');
        await initDatabase();
        await seedData();
        isInitialized = true;
      } catch (err) {
        console.error('Initialization error:', err);
        initPromise = null;
        throw err;
      }
    })();
  }
  await initPromise;
}

app.use(async (req, res, next) => {
  try {
    await ensureInitialized();
    next();
  } catch (err: any) {
    console.error('Database initialization error in request:', err);
    res.status(500).json({
      success: false,
      message: `Database initialization error: ${err.message}`
    });
  }
});

// API Routes
app.use('/api', apiRouter);

// Health check
app.get('/api/health', (req, res) => {
  res.json({
    status: 'online',
    app: 'Kisan Go API',
    version: '2.0.0',
    timestamp: new Date().toISOString()
  });
});
