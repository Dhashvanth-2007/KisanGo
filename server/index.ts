import 'dotenv/config';
import { app, ensureInitialized } from './app.js';

const PORT = process.env.PORT || 3001;

async function startServer() {
  try {
    await ensureInitialized();
    app.listen(PORT, () => {
      console.log(`🚀 Kisan Go Backend running at http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error('❌ Failed to start server:', error);
    process.exit(1);
  }
}

startServer();
