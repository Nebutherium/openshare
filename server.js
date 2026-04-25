const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

let files = [];

app.use('/uploads', express.static('uploads'));

// MAIN SITE
app.get('/', (req, res) => {
    res.send(`
<h2>OpenShare</h2>

<form id="uploadForm">
<input name="title" placeholder="title" required />
<input type="file" name="file" required />
<button>Upload</button>
</form>

<hr>

<div id="list"></div>

<script>
async function load() {
    let r = await fetch('/files');
    let d = await r.json();

    document.getElementById('list').innerHTML =
        d.map((f,i)=>`
            <div>
                <a href="${f.url}" target="_blank">${f.title}</a>
            </div>
        `).join('');
}

document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    let fd = new FormData(e.target);

    await fetch('/upload', { method:'POST', body: fd });

    e.target.reset();
    load();
};

load();
</script>
    `);
});

// ADMIN PAGE
app.get('/admin', (req, res) => {
    res.send(`
<h2>Admin Panel</h2>
<p>Delete uploaded files</p>

<div id="adminList"></div>

<script>
async function loadAdmin() {
    let r = await fetch('/files');
    let d = await r.json();

    document.getElementById('adminList').innerHTML =
        d.map((f,i)=>`
            <div style="margin-bottom:10px;">
                <a href="${f.url}" target="_blank">${f.title}</a>
                <button onclick="del(${i})">Delete</button>
            </div>
        `).join('');
}

async function del(i) {
    await fetch('/delete/' + i, { method:'DELETE' });
    loadAdmin();
}

loadAdmin();
</script>
    `);
});

// UPLOAD
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.sendStatus(400);

    files.unshift({
        title: req.body.title,
        url: '/uploads/' + req.file.filename,
        file: req.file.filename
    });

    res.sendStatus(200);
});

// LIST
app.get('/files', (req, res) => {
    res.json(files);
});

// DELETE FILE (ADMIN)
app.delete('/delete/:id', (req, res) => {
    const id = req.params.id;
    const file = files[id];

    if (!file) return res.sendStatus(404);

    const filePath = path.join(__dirname, 'uploads', file.file);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    files.splice(id, 1);

    res.sendStatus(200);
});

app.listen(PORT, () => {
    console.log("Running on " + PORT);
});
