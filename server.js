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

// ================= WOW STYLE =================
const style = `
<style>
body {
    margin: 0;
    font-family: Georgia, serif;
    background: url('https://i.imgur.com/3ZQ3Z9m.jpg');
    background-size: cover;
    color: #f5deb3;
}

/* MAIN WINDOW FRAME */
.container {
    width: 85%;
    margin: 30px auto;
    padding: 20px;
    background: rgba(10, 10, 10, 0.85);
    border: 3px solid #c9a227;
    box-shadow: 0 0 25px rgba(0,0,0,0.8);
}

/* TITLE BAR */
.topbar {
    background: linear-gradient(#3b2a1a, #1a120b);
    color: #ffd700;
    padding: 12px;
    font-size: 20px;
    font-weight: bold;
    border-bottom: 2px solid #c9a227;
    text-shadow: 0 0 5px black;
}

/* LINKS */
a {
    color: #ffd700;
    text-decoration: none;
}

a:hover {
    color: #fff2a8;
    text-shadow: 0 0 5px gold;
}

/* INPUTS */
input, button {
    font-family: Georgia, serif;
    padding: 6px;
    margin: 5px 0;
    background: #1a1a1a;
    border: 1px solid #c9a227;
    color: #f5deb3;
}

button {
    cursor: pointer;
    background: linear-gradient(#3b2a1a, #1a120b);
}

button:hover {
    background: #4a351f;
}

/* WOW TABLE */
table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
    background: rgba(0,0,0,0.4);
}

th {
    background: #2a1d12;
    color: #ffd700;
    padding: 10px;
    border-bottom: 2px solid #c9a227;
}

td {
    padding: 10px;
    border-bottom: 1px solid #3a2a1a;
}

tr:hover {
    background: rgba(201, 162, 39, 0.1);
}

/* SMALL TEXT */
.small {
    font-size: 11px;
    color: #c0b283;
}

/* PANEL BUTTON BAR */
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

<div class="topbar">OpenShare - Azeroth Archive</div>

<div class="container">

<div class="nav">
<a href="/login">Enter Admin Portal</a>
</div>

<form id="uploadForm">
Title: <input name="title" required />
<input type="file" name="file" required />
<button>Upload Relic</button>
</form>

<hr>

<table>
<tr>
<th>Item</th>
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
                <td><a href="\${f.url}" target="_blank">View</a></td>
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

<div class="topbar">Sanctum Access</div>

<div class="container">

<form method="POST" action="/login">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" placeholder="password" required><br>
<button>Enter Portal</button>
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

    res.send("Access Denied");
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
<title>Admin</title>
${style}
</head>
<body>

<div class="topbar">Admin Sanctum</div>

<div class="container">

<div class="nav">
<button onclick="load()">Refresh</button>
<button onclick="deleteAll()">Purge All</button>
<a href="/logout">Logout</a>
</div>

<input id="search" placeholder="Search relics..." onkeyup="load()">

<div id="stats"></div>

<table>
<tr>
<th>Name</th>
<th>Action</th>
<th>Delete</th>
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
        "Relics stored: " + data.length;

    document.getElementById('adminList').innerHTML =
        filtered.map((f,i) => \`
            <tr>
                <td>\${f.title}</td>
                <td><a href="\${f.url}" target="_blank">Open</a></td>
                <td><button onclick="del(\${i})">Destroy</button></td>
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
