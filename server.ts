import express from 'express';
import { createServer as createViteServer } from 'vite';
import multer from 'multer';
import path from 'path';
import fs from 'fs';
import Database from 'better-sqlite3';
import { fileURLToPath } from 'url';
import crypto from 'crypto';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Database
const db = new Database('models.db');
db.exec(`
  CREATE TABLE IF NOT EXISTS files (
    id TEXT PRIMARY KEY,
    original_name TEXT,
    filename TEXT,
    mime_type TEXT,
    size INTEGER,
    upload_date DATETIME DEFAULT CURRENT_TIMESTAMP
  )
`);

// Ensure upload directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Multer configuration
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = crypto.randomBytes(8).toString('hex');
    cb(null, uniqueSuffix + '-' + file.originalname);
  }
});

const upload = multer({ 
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024 // 50MB limit
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/upload', upload.single('file'), (req, res) => {
    try {
      if (!req.file) {
        return res.status(400).json({ error: 'No file uploaded' });
      }

      const id = crypto.randomBytes(6).toString('hex');
      const { originalname, filename, mimetype, size } = req.file;

      const stmt = db.prepare('INSERT INTO files (id, original_name, filename, mime_type, size) VALUES (?, ?, ?, ?, ?)');
      stmt.run(id, originalname, filename, mimetype, size);

      res.json({ id, originalName: originalname });
    } catch (error) {
      console.error('Upload error:', error);
      res.status(500).json({ error: 'Failed to upload file' });
    }
  });

  app.get('/api/files', (req, res) => {
    try {
      const files = db.prepare('SELECT * FROM files ORDER BY upload_date DESC').all();
      res.json(files);
    } catch (error) {
      console.error('Fetch error:', error);
      res.status(500).json({ error: 'Failed to fetch files' });
    }
  });

  app.get('/api/download/:id', (req, res) => {
    try {
      const file = db.prepare('SELECT * FROM files WHERE id = ?').get(req.params.id) as any;
      if (!file) {
        return res.status(404).json({ error: 'File not found' });
      }

      const filePath = path.join(uploadDir, file.filename);
      if (!fs.existsSync(filePath)) {
        return res.status(404).json({ error: 'Physical file not found' });
      }

      res.download(filePath, file.original_name);
    } catch (error) {
      console.error('Download error:', error);
      res.status(500).json({ error: 'Failed to download file' });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, 'dist')));
    app.get('*', (req, res) => {
      res.sendFile(path.join(__dirname, 'dist', 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer().catch(err => {
  console.error('Failed to start server:', err);
});
