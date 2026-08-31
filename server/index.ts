import express from 'express';
import cors from 'cors';
import { initDatabase } from './db/database.js';
import { seedData } from './db/seed.js';
import apiRouter from './routes/api.js';

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Request logger
app.use((req, res, next) => {
  console.log(`[${new Date().toLocaleTimeString()}] ${req.method} ${req.url}`);
  next();
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

async function startServer() {
  try {
    console.log('🌱 Initializing Kisan Go Database...');
    await initDatabase();
    await seedData();

    app.listen(PORT, () => {
      console.log(`🚀 Kisan Go Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
