const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= DATA =================
let users = {};
let files = [];
let posts = [];

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
    box-shadow: 0 0 20px black;
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

input, button, textarea {
    font-family: Georgia;
    padding: 6px;
    margin: 5px 0;
    background: #1a1a1a;
    border: 1px solid #c9a227;
    color: #f5deb3;
}

button {
    cursor: pointer;
}

.card {
    border: 1px solid #c9a227;
    padding: 10px;
    margin: 10px 0;
    background: rgba(0,0,0,0.4);
}
</style>
`;

// ================= SIGNUP =================
app.get('/signup', (req, res) => {
    res.send(`
<html><head>${style}</head>
<body>
<div class="topbar">Create Account</div>
<div class="container">

<form method="POST" action="/signup">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" required><br>
<button>Sign Up</button>
</form>

<a href="/login">Login</a>

</div>
</body></html>
    `);
});

app.post('/signup', (req, res) => {
    let { user, pass } = req.body;

    if (!user || !pass) return res.send("Missing fields");

    let clean = user.toLowerCase();

    for (let u in users) {
        if (u.toLowerCase() === clean) {
            return res.send("Username already exists");
        }
    }

    users[user] = pass;

    res.setHeader('Set-Cookie', 'user=' + user + '; Path=/');
    res.redirect('/');
});

// ================= LOGIN =================
app.get('/login', (req, res) => {
    res.send(`
<html><head>${style}</head>
<body>
<div class="topbar">Login</div>
<div class="container">

<form method="POST" action="/login">
<input name="user" required><br>
<input name="pass" type="password" required><br>
<button>Login</button>
</form>

<a href="/signup">Signup</a>

</div>
</body></html>
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
    res.setHeader('Set-Cookie', 'user=; Max-Age=0; Path=/');
    res.redirect('/login');
});

// ================= HOME =================
app.get('/', (req, res) => {
    const user = getUser(req);
    if (!user) return res.redirect('/login');

    res.send(`
<html><head>${style}</head>
<body>

<div class="topbar">OpenShare Realm</div>

<div class="container">

<p>
Logged in as <b>${user}</b> |
<a href="/forums">Forums</a> |
<a href="/admin">Admin</a> |
<a href="/logout">Logout</a>
</p>

<h3>Upload</h3>

<form id="uploadForm">
<input name="title" required>
<input type="file" name="file" required>
<button>Upload</button>
</form>

<hr>

${files.map(f => `
<div class="card">
<b>${f.title}</b><br>
<a href="${f.url}" target="_blank">Open</a><br>
<small>by ${f.user}</small>
</div>
`).join('')}

</div>

<script>
document.getElementById('uploadForm').onsubmit = async (e) => {
    e.preventDefault();
    let fd = new FormData(e.target);

    await fetch('/upload', { method:'POST', body:fd });

    location.reload();
};
</script>

</body></html>
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
        user
    });

    res.sendStatus(200);
});

// ================= FORUMS =================
app.get('/forums', (req, res) => {
    const user = getUser(req);
    if (!user) return res.redirect('/login');

    res.send(`
<html><head>${style}</head>
<body>

<div class="topbar">Forums</div>

<div class="container">

<a href="/">Back</a>

<form method="POST" action="/forums">
<input name="title" placeholder="title" required><br>
<textarea name="content" required></textarea><br>
<button>Post</button>
</form>

<hr>

${posts.map((p,i) => `
<div class="card">
<b>${p.title}</b><br>
${p.content}<br>
<small>by ${p.user}</small>
</div>
`).join('')}

</div>
</body></html>
    `);
});

app.post('/forums', (req, res) => {
    const user = getUser(req);
    if (!user) return res.sendStatus(403);

    posts.unshift({
        title: req.body.title,
        content: req.body.content,
        user
    });

    res.redirect('/forums');
});

// ================= ADMIN =================
app.get('/admin', (req, res) => {
    if (!isAdmin(req)) return res.redirect('/');

    res.send(`
<html><head>${style}</head>
<body>

<div class="topbar">Admin Control</div>

<div class="container">

<h3>Users</h3>
<pre>${JSON.stringify(users, null, 2)}</pre>

<h3>Files</h3>

${files.map((f,i) => `
<div class="card">
<b>${f.title}</b> by ${f.user}<br>
<a href="${f.url}" target="_blank">Open</a>

<form method="POST" action="/admin/delete-file/${i}">
<button>Delete File</button>
</form>
</div>
`).join('')}

<h3>Posts</h3>

${posts.map((p,i) => `
<div class="card">
<b>${p.title}</b><br>
${p.content}<br>
<small>${p.user}</small>

<form method="POST" action="/admin/delete-post/${i}">
<button>Delete Post</button>
</form>
</div>
`).join('')}

</div>

</body></html>
    `);
});

// DELETE FILE
app.post('/admin/delete-file/:id', (req, res) => {
    if (!isAdmin(req)) return res.sendStatus(403);

    const f = files[req.params.id];
    if (f) {
        const p = path.join(__dirname, 'uploads', f.file);
        if (fs.existsSync(p)) fs.unlinkSync(p);
        files.splice(req.params.id, 1);
    }

    res.redirect('/admin');
});

// DELETE POST
app.post('/admin/delete-post/:id', (req, res) => {
    if (!isAdmin(req)) return res.sendStatus(403);

    posts.splice(req.params.id, 1);
    res.redirect('/admin');
});

// ================= START =================
app.listen(PORT, () => {
    console.log("Running on " + PORT);
});
