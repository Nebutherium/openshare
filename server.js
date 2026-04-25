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

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// ================= STORAGE =================
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

// ================= RETRO STYLE =================
const style = `
<style>
body {
    font-family: "Courier New", monospace;
    background: #eaeaea;
    margin: 0;
    color: #111;
}

.topbar {
    background: #111;
    color: white;
    padding: 10px;
    font-weight: bold;
}

.container {
    width: 90%;
    max-width: 1000px;
    margin: 20px auto;
    background: white;
    padding: 15px;
    border: 2px solid #ccc;
}

a {
    color: #0000cc;
    text-decoration: none;
}

a:hover {
    text-decoration: underline;
}

input, button {
    padding: 5px;
    margin: 4px 0;
    font-family: monospace;
}

button {
    background: #222;
    color: white;
    border: none;
    cursor: pointer;
}

button:hover {
    background: #444;
}

/* TABLE STYLE */
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
}

th {
    background: #ddd;
    padding: 8px;
    text-align: left;
    border-bottom: 2px solid #aaa;
}

td {
    padding: 8px;
    border-bottom: 1px solid #ccc;
}

tr:hover {
    background: #f5f5f5;
}

.small {
    font-size: 11px;
    color: #666;
}

.nav {
    margin-bottom: 10px;
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

<div class="topbar">OpenShare Index</div>

<div class="container">

<div class="nav">
<a href="/login">Admin Login</a>
</div>

<form id="uploadForm">
Title: <input name="title" required />
<input type="file" name="file" required />
<button>Upload</button>
</form>

<hr>

<table>
<tr>
<th>Name</th>
<th>Action</th>
<th>Time</th>
</tr>

<tbody id="list"></tbody>
</table>

</div>

<script>
async function load() {
    let res = await fetch('/files');
    let data = await res.json();

    document.getElementById('list').innerHTML =
        data.map(f => \`
            <tr>
                <td>\${f.title}</td>
                <td><a href="\${f.url}" target="_blank">Download</a></td>
                <td class="small">\${f.time || ""}</td>
            </tr>
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

<div class="topbar">Admin Login</div>

<div class="container">

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

<div class="topbar">Admin Panel</div>

<div class="container">

<div class="nav">
<button onclick="load()">Refresh</button>
<button onclick="deleteAll()">Delete All</button>
<a href="/logout">Logout</a>
</div>

<input id="search" placeholder="Search files..." onkeyup="load()">

<div id="stats"></div>

<table>
<tr>
<th>Name</th>
<th>Link</th>
<th>Action</th>
</tr>

<tbody id="adminList"></tbody>
</table>

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
            <tr>
                <td>\${f.title}</td>
                <td><a href="\${f.url}" target="_blank">Open</a></td>
                <td><button onclick="del(\${i})">Delete</button></td>
            </tr>
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

// ================= FILES =================
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
