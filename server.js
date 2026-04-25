const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATA =================
let users = {}; // username -> password
let files = [];

// ================= HELPERS =================
function getUser(req) {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/user=([^;]+)/);
    return match ? match[1] : null;
}

function isAdmin(req) {
    return getUser(req) === "admin";
}

// ================= MIDDLEWARE =================
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

.container {
    width: 80%;
    margin: 30px auto;
    padding: 20px;
    background: rgba(10,10,10,0.85);
    border: 3px solid #c9a227;
    box-shadow: 0 0 25px rgba(0,0,0,0.8);
}

.topbar {
    background: linear-gradient(#3b2a1a, #1a120b);
    color: #ffd700;
    padding: 12px;
    font-size: 20px;
    font-weight: bold;
    border-bottom: 2px solid #c9a227;
}

a {
    color: #ffd700;
    text-decoration: none;
}

a:hover {
    text-shadow: 0 0 5px gold;
}

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

table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 10px;
}

th {
    background: #2a1d12;
    color: #ffd700;
    padding: 10px;
}

td {
    padding: 10px;
    border-bottom: 1px solid #3a2a1a;
}

tr:hover {
    background: rgba(201,162,39,0.1);
}

.small {
    font-size: 11px;
    color: #c0b283;
}
</style>
`;

// ================= SIGNUP =================
app.get('/signup', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Sign Up</title>${style}</head>
<body>

<div class="topbar">Create Account</div>

<div class="container">

<h2>Sign Up</h2>

<form method="POST" action="/signup">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" placeholder="password" required><br>
<button>Create Account</button>
</form>

<p><a href="/login">Login</a></p>

</div>

</body>
</html>
    `);
});

app.post('/signup', (req, res) => {
    let { user, pass } = req.body;

    if (!user || !pass) return res.send("Missing fields");

    let clean = user.trim().toLowerCase();

    for (let u in users) {
        if (u.toLowerCase() === clean) {
            return res.send("Username already taken");
        }
    }

    users[user] = pass;

    res.setHeader('Set-Cookie', 'user=' + user + '; Path=/');
    res.redirect('/');
});

// ================= LOGIN =================
app.get('/login', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head><title>Login</title>${style}</head>
<body>

<div class="topbar">Login Portal</div>

<div class="container">

<h2>Login</h2>

<form method="POST" action="/login">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" required><br>
<button>Login</button>
</form>

<p><a href="/signup">Sign Up</a></p>

</div>

</body>
</html>
    `);
});

app.post('/login', (req, res) => {
    let { user, pass } = req.body;

    let found = Object.keys(users).find(
        u => u.toLowerCase() === user.toLowerCase()
    );

    if (found && users[found] === pass) {
        res.setHeader('Set-Cookie', 'user=' + found + '; Path=/');
        return res.redirect('/');
    }

    res.send("Invalid login");
});

// ================= LOGOUT =================
app.get('/logout', (req, res) => {
    res.setHeader('Set-Cookie', 'user=; Path=/; Max-Age=0');
    res.redirect('/login');
});

// ================= HOME =================
app.get('/', (req, res) => {
    const user = getUser(req);
    if (!user) return res.redirect('/login');

    res.send(`
<!DOCTYPE html>
<html>
<head><title>OpenShare</title>${style}</head>
<body>

<div class="topbar">OpenShare Archive</div>

<div class="container">

<p>
Logged in as: <b>${user}</b> |
<a href="/logout">Logout</a>
</p>

<form id="uploadForm">
Title: <input name="title" required />
<input type="file" name="file" required />
<button>Upload</button>
</form>

<hr>

<table>
<tr>
<th>File</th>
<th>Link</th>
<th>Uploader</th>
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
                <td><a href="\${f.url}" target="_blank">Open</a></td>
                <td class="small">\${f.user}</td>
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

// ================= UPLOAD =================
app.post('/upload', upload.single('file'), (req, res) => {
    const user = getUser(req);
    if (!req.file || !user) return res.sendStatus(400);

    files.unshift({
        title: req.body.title,
        url: '/uploads/' + req.file.filename,
        file: req.file.filename,
        user: user,
        time: new Date().toLocaleString()
    });

    res.sendStatus(200);
});

// ================= FILE LIST =================
app.get('/files', (req, res) => {
    res.json(files);
});

// ================= DELETE (ADMIN ONLY) =================
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

// ================= START SERVER =================
app.listen(PORT, () => {
    console.log("Server running on port " + PORT);
});
