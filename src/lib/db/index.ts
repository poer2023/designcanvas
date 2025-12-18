import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

// Database file location
const DATA_DIR = path.join(process.cwd(), 'data');
const DB_PATH = path.join(DATA_DIR, 'posterlab.db');

// Ensure data directory exists
if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Create assets subdirectories
const ASSETS_DIR = path.join(DATA_DIR, 'assets');
const ASSET_SUBDIRS = ['images', 'elements', 'exports', 'styles', 'posters', 'finals'];

if (!fs.existsSync(ASSETS_DIR)) {
    fs.mkdirSync(ASSETS_DIR, { recursive: true });
}

ASSET_SUBDIRS.forEach(subdir => {
    const subdirPath = path.join(ASSETS_DIR, subdir);
    if (!fs.existsSync(subdirPath)) {
        fs.mkdirSync(subdirPath, { recursive: true });
    }
});

// Initialize database
let db: Database.Database | null = null;

export function getDb(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
        initializeSchema();
    }
    return db;
}

function initializeSchema() {
    const schemaPath = path.join(process.cwd(), 'src/lib/db/schema.sql');
    const schemaV19Path = path.join(process.cwd(), 'src/lib/db/schema-v1.9.sql');

    // Load both schemas
    const schemas = [schemaPath, schemaV19Path];

    for (const schemaFile of schemas) {
        if (!fs.existsSync(schemaFile)) {
            console.log(`Schema file not found: ${schemaFile}`);
            continue;
        }

        const schema = fs.readFileSync(schemaFile, 'utf-8');

        // Remove multi-line comments 
        const withoutBlockComments = schema.replace(/\/\*[\s\S]*?\*\//g, '');

        // Remove single-line comments
        const lines = withoutBlockComments.split('\n')
            .map(line => {
                const commentIdx = line.indexOf('--');
                return commentIdx >= 0 ? line.substring(0, commentIdx) : line;
            })
            .join('\n');

        // Split by semicolons and execute each statement
        const statements = lines
            .split(';')
            .map(s => s.trim())
            .filter(s => s.length > 0);

        for (const statement of statements) {
            try {
                getDbInstance().exec(statement + ';');
            } catch (error) {
                // Ignore "table already exists" errors
                if (!(error instanceof Error) || !error.message.includes('already exists')) {
                    console.error('Schema error:', error);
                }
            }
        }
    }
}


function getDbInstance(): Database.Database {
    if (!db) {
        db = new Database(DB_PATH);
        db.pragma('journal_mode = WAL');
        db.pragma('foreign_keys = ON');
    }
    return db;
}

export function closeDb() {
    if (db) {
        db.close();
        db = null;
    }
}

// Export paths for asset management
export const PATHS = {
    DATA_DIR,
    ASSETS_DIR,
    getImagePath: (filename: string) => path.join(ASSETS_DIR, 'images', filename),
    getElementPath: (filename: string) => path.join(ASSETS_DIR, 'elements', filename),
    getExportPath: (filename: string) => path.join(ASSETS_DIR, 'exports', filename),
    getStylePath: (filename: string) => path.join(ASSETS_DIR, 'styles', filename),
    getPosterPath: (filename: string) => path.join(ASSETS_DIR, 'posters', filename),
    getFinalPath: (filename: string) => path.join(ASSETS_DIR, 'finals', filename),
};
