const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= ADMIN =================
const ADMIN_USER = "admin";
const ADMIN_PASS = "1234";

function isAdmin(req) {
    return req.headers.cookie && req.headers.cookie.includes("auth=1");
}

// ================= PARSER =================
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= FILE STORAGE =================
if (!fs.existsSync('uploads')) {
    fs.mkdirSync('uploads');
}

const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) =>
        cb(null, Date.now() + '-' + file.originalname)
});

const upload = multer({ storage });

let files = [];

app.use('/uploads', express.static('uploads'));

// ================= GLOBAL STYLE =================
const style = `
<style>
body {
    font-family: Arial, sans-serif;
    background: #f4f4f4;
    margin: 0;
    padding: 0;
    color: #111;
}

.container {
    width: 85%;
    margin: auto;
    background: white;
    padding: 20px;
    box-shadow: 0 0 10px rgba(0,0,0,0.1);
}

h2 {
    border-bottom: 2px solid #ddd;
    padding-bottom: 5px;
}

a {
    color: #0645ad;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

input, button {
    padding: 6px;
    margin: 4px 0;
}

button {
    cursor: pointer;
    background: #333;
    color: white;
    border: none;
}

button:hover {
    background: #555;
}

.card {
    border: 1px solid #ddd;
    padding: 10px;
    margin-bottom: 10px;
    background: #fafafa;
}

.small {
    font-size: 12px;
    color: #666;
}
</style>
`;

// ================= HOME =================
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>OpenShare</title>
${style}
</head>
<body>

<div class="container">

<h2>OpenShare</h2>

<p><a href="/login">Admin Login</a></p>

<form id="uploadForm">
Title: <input name="title" required />
<input type="file" name="file" required />
<button>Upload</button>
</form>

<hr>

<div id="list"></div>

</div>

<script>
async function load() {
    let res = await fetch('/files');
    let data = await res.json();

    document.getElementById('list').innerHTML =
        data.map(f => \`
            <div class="card">
                <a href="\${f.url}" target="_blank">\${f.title}</a><br>
                <span class="small">\${f.time || ""}</span>
            </div>
        \`).join('');
}

document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    let fd = new FormData(e.target);

    await fetch('/upload', {
        method: 'POST',
        body: fd
    });

    e.target.reset();
    load();
};

load();
</script>

</body>
</html>
    `);
});

// ================= LOGIN =================
app.get('/login', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Login</title>
${style}
</head>
<body>

<div class="container">

<h2>Admin Login</h2>

<form method="POST" action="/login">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" placeholder="password" required><br>
<button>Login</button>
</form>

</div>

</body>
</html>
    `);
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;

    if (user === ADMIN_USER && pass === ADMIN_PASS) {
        res.setHeader('Set-Cookie', 'auth=1; Path=/');
        return res.redirect('/admin');
    }

    res.send("Wrong login");
});

// ================= LOGOUT =================
app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'auth=0; Path=/; Max-Age=0');
    res.redirect('/');
});

// ================= ADMIN =================
app.get('/admin', (req, res) => {
    if (!isAdmin(req)) return res.redirect('/login');

    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>Admin Panel</title>
${style}
</head>
<body>

<div class="container">

<h2>Admin Panel</h2>

<p>
<button onclick="load()">Refresh</button>
<button onclick="deleteAll()">Delete All</button>
<a href="/logout">Logout</a>
</p>

<input id="search" placeholder="Search..." onkeyup="load()">

<div id="stats"></div>
<hr>

<div id="adminList"></div>

</div>

<script>

async function load() {
    let res = await fetch('/files');
    let data = await res.json();

    let q = document.getElementById('search').value.toLowerCase();

    let filtered = data.filter(f =>
        f.title.toLowerCase().includes(q)
    );

    document.getElementById('stats').innerHTML =
        "<b>Total files:</b> " + data.length;

    document.getElementById('adminList').innerHTML =
        filtered.map((f,i) => \`
            <div class="card">
                <b>\${f.title}</b><br>
                <a href="\${f.url}" target="_blank">Open</a><br>
                <span class="small">\${f.time || ""}</span><br>
                <button onclick="del(\${i})">Delete</button>
            </div>
        \`).join('');
}

async function del(i) {
    await fetch('/delete/' + i, { method: 'DELETE' });
    load();
}

async function deleteAll() {
    let res = await fetch('/files');
    let data = await res.json();

    for (let i = data.length - 1; i >= 0; i--) {
        await fetch('/delete/' + i, { method: 'DELETE' });
    }

    load();
}

load();

</script>

</body>
</html>
    `);
});

// ================= UPLOAD =================
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.sendStatus(400);

    files.unshift({
        title: req.body.title,
        url: '/uploads/' + req.file.filename,
        file: req.file.filename,
        time: new Date().toLocaleString()
    });

    res.sendStatus(200);
});

// ================= FILE LIST =================
app.get('/files', (req, res) => {
    res.json(files);
});

// ================= DELETE =================
app.delete('/delete/:id', (req, res) => {
    if (!isAdmin(req)) return res.sendStatus(403);

    const file = files[req.params.id];
    if (!file) return res.sendStatus(404);

    const filePath = path.join(__dirname, 'uploads', file.file);

    if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
    }

    files.splice(req.params.id, 1);

    res.sendStatus(200);
});

// ================= START =================
app.listen(PORT, () => {
    console.log("Running on port " + PORT);
});
