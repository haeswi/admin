const express = require('express');
const cors = require('cors');
const multer = require('multer');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// CORS и JSON
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Хранилище для Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadPath = path.join(__dirname, 'uploads');
    if (!fs.existsSync(uploadPath)) fs.mkdirSync(uploadPath);
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const name = Date.now() + ext;
    cb(null, name);
  }
});
const upload = multer({ storage }).array("images", 10);


// Инициализация базы
const db = new sqlite3.Database('./db.sqlite', (err) => {
  if (err) return console.error(err.message);
  console.log('Connected to SQLite');
});

db.run(`CREATE TABLE IF NOT EXISTS objects (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  type TEXT,
  city TEXT,
  district TEXT,
  price INTEGER,
  description TEXT,
  images TEXT,
  isPopular INTEGER DEFAULT 0
)`);


// Получение объектов
app.get('/api/objects', (req, res) => {
  db.all('SELECT * FROM objects', [], (err, rows) => {
    if (err) return res.status(500).json({ error: err.message });
    res.json(rows);
  });
});

// Добавление объекта
app.post('/api/objects', upload, (req, res) => {
  const { type, city, district, price, description, isPopular } = req.body;
  const imagePaths = req.files.map(file => '/uploads/' + file.filename);
  const imagesJSON = JSON.stringify(imagePaths);
  const popularFlag = (isPopular === 'true' || isPopular === true || isPopular === '1') ? 1 : 0;

  db.run(`INSERT INTO objects (type, city, district, price, description, images, isPopular)
          VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [type, city, district, price, description, imagesJSON, popularFlag],
    function (err) {
      if (err) return res.status(500).json({ error: err.message });
      res.status(201).json({ id: this.lastID, images: imagePaths });
    });
});


app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});