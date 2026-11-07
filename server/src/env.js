// Load server/.env regardless of how the process is started (npm, pm2, plain node)
// or which directory it is started from. Must be the first import in index.js,
// because other modules read process.env at import time.
// Variables already set in the environment take precedence over the file.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const envPath = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../.env');
if (fs.existsSync(envPath)) process.loadEnvFile(envPath);
