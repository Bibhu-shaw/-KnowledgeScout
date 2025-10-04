const express = require('express');
const multer = require('multer');
const pdfParse = require('pdf-parse');
const mammoth = require('mammoth');
const { Pool } = require('pg');
const bodyParser = require('body-parser');
const cors = require('cors');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000; // Render sets PORT automatically

app.use(cors());
app.use(bodyParser.json());

// PostgreSQL connection using Render environment variables
const pool = new Pool({
  user: process.env.DB_USER,
  host: process.env.DB_HOST,
  database: process.env.DB_NAME,
  password: process.env.DB_PASSWORD,
  port: process.env.DB_PORT,
  ssl: {
    rejectUnauthorized: false, // Required for Render PostgreSQL
  },
});

// Test DB connection
pool.query('SELECT NOW()', (err, res) => {
  if (err) {
    console.error('DB connection failed:', err.message);
  } else {
    console.log('DB connected successfully');
  }
});

// Multer for file uploads
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  fileFilter: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    if (ext !== '.pdf' && ext !== '.docx') {
      return cb(new Error('Only .pdf and .docx allowed'));
    }
    cb(null, true);
  },
});

// Upload endpoint
app.post('/upload', upload.single('file'), async (req, res) => {
  try {
    const file = req.file;
    let text = '';

    if (file.mimetype === 'application/pdf') {
      const data = await pdfParse(file.buffer);
      text = data.text;
    } else if (file.mimetype === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document') {
      const result = await mammoth.extractRawText({ buffer: file.buffer });
      text = result.value;
    }

    const chunks = text.split('\n').filter(chunk => chunk.trim());

    // Insert document
    const docRes = await pool.query(
      'INSERT INTO documents (name) VALUES ($1) RETURNING id',
      [file.originalname]
    );
    const docId = docRes.rows[0].id;

    // Insert chunks
    for (const chunk of chunks) {
      await pool.query(
        'INSERT INTO chunks (doc_id, chunk_text) VALUES ($1, $2)',
        [docId, chunk]
      );
    }

    res.status(200).json({ message: 'File uploaded and processed' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Query endpoint
app.post('/query', async (req, res) => {
  const { question } = req.body;
  try {
    const result = await pool.query(
      `SELECT chunk_text FROM chunks WHERE chunk_text ILIKE $1 LIMIT 5`,
      [`%${question}%`]
    );
    const answers = result.rows.map(row => row.chunk_text);
    res.status(200).json({ answers });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Start server
app.listen(port, () => {
  console.log(`Backend running on port ${port}`);
});
