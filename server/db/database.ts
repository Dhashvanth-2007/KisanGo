import initSqlJs, { Database as SqlJsDatabase } from 'sql.js';
import path from 'path';
import fs from 'fs';
import os from 'os';
import { fileURLToPath } from 'url';
import { CREATE_TABLES_SQL } from './schema.js';

let dbFilePath: string = '';

try {
  const isVercel = process.env.VERCEL || process.env.AWS_LAMBDA_FUNCTION_NAME;
  if (isVercel) {
    dbFilePath = path.join(os.tmpdir(), 'kisan_go.sqlite');
  } else {
    const __filename = fileURLToPath(import.meta.url);
    const __dirname = path.dirname(__filename);
    const dbDir = path.resolve(__dirname, '../../data');
    if (!fs.existsSync(dbDir)) {
      fs.mkdirSync(dbDir, { recursive: true });
    }
    dbFilePath = path.resolve(dbDir, 'kisan_mitra.sqlite');
  }
} catch (e) {
  // Fallback to tmp dir
  dbFilePath = path.join(os.tmpdir(), 'kisan_go.sqlite');
}

let sqlJsInstance: any = null;
let rawDb: SqlJsDatabase | null = null;

// Initialize SQL.js and load/create DB
export async function getDb(): Promise<SqlJsDatabase> {
  if (rawDb) return rawDb;

  if (!sqlJsInstance) {
    sqlJsInstance = await initSqlJs();
  }

  try {
    if (dbFilePath && fs.existsSync(dbFilePath)) {
      const fileBuffer = fs.readFileSync(dbFilePath);
      rawDb = new sqlJsInstance.Database(fileBuffer);
    } else {
      rawDb = new sqlJsInstance.Database();
    }
  } catch (err) {
    console.warn('Fallback to in-memory database:', err);
    rawDb = new sqlJsInstance.Database();
  }

  return rawDb!;
}

// Throttled / Debounced DB file saving
let saveTimeout: any = null;
export function saveDbToFile() {
  if (rawDb && dbFilePath) {
    try {
      const data = rawDb.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbFilePath, buffer);
    } catch (e) {
      // If filesystem write fails on serverless, in-memory state remains intact
    }
  }
}

function scheduleSaveDbToFile() {
  if (saveTimeout) clearTimeout(saveTimeout);
  saveTimeout = setTimeout(() => {
    saveDbToFile();
  }, 100);
}

// Helper query wrappers compatible with standard prepared statements
export const db = {
  prepare(sql: string) {
    return {
      get(...params: any[]) {
        if (!rawDb) throw new Error('Database not initialized. Please call initDatabase() first.');
        try {
          const stmt = rawDb.prepare(sql);
          const flatParams = params.flat();
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          if (stmt.step()) {
            const row = stmt.getAsObject();
            stmt.free();
            return row;
          }
          stmt.free();
          return undefined;
        } catch (err: any) {
          throw new Error(`Query failed: ${sql} -> ${err.message}`);
        }
      },
      all(...params: any[]) {
        if (!rawDb) throw new Error('Database not initialized. Please call initDatabase() first.');
        try {
          const stmt = rawDb.prepare(sql);
          const flatParams = params.flat();
          if (flatParams.length > 0) {
            stmt.bind(flatParams);
          }
          const rows: any[] = [];
          while (stmt.step()) {
            rows.push(stmt.getAsObject());
          }
          stmt.free();
          return rows;
        } catch (err: any) {
          throw new Error(`Query failed: ${sql} -> ${err.message}`);
        }
      },
      run(...params: any[]) {
        if (!rawDb) throw new Error('Database not initialized. Please call initDatabase() first.');
        try {
          const flatParams = params.flat();
          rawDb.run(sql, flatParams);
          scheduleSaveDbToFile();
          return { changes: 1 };
        } catch (err: any) {
          throw new Error(`Execution failed: ${sql} -> ${err.message}`);
        }
      }
    };
  },

  exec(sql: string) {
    if (!rawDb) throw new Error('Database not initialized');
    rawDb.exec(sql);
    scheduleSaveDbToFile();
  },

  transaction(fn: () => any) {
    return () => {
      if (!rawDb) throw new Error('Database not initialized');
      let inTxn = false;
      try {
        rawDb.exec('BEGIN TRANSACTION;');
        inTxn = true;
      } catch (beginErr) {
        // If a transaction is already active in SQLite, continue
      }

      try {
        const result = fn();
        if (inTxn) {
          try {
            rawDb.exec('COMMIT;');
          } catch (commitErr) {
            // commit error
          }
        }
        saveDbToFile();
        return result;
      } catch (err) {
        if (inTxn) {
          try {
            rawDb.exec('ROLLBACK;');
          } catch (rollbackErr) {
            // Ignore rollback failure
          }
        }
        throw err;
      }
    };
  }
};

export async function initDatabase(): Promise<void> {
  const dbInstance = await getDb();
  dbInstance.exec(CREATE_TABLES_SQL);
  saveDbToFile();
  console.log('✅ SQLite Database (via SQL.js WASM) initialized & schema applied.');
}
