const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const PORT = process.env.PORT || 3000;

// ================= USERS (simple demo system) =================
const users = {
    admin: "1234",
    test: "1234"
};

function getUser(req) {
    const cookie = req.headers.cookie || "";
    const match = cookie.match(/user=([^;]+)/);
    return match ? match[1] : null;
}

function isAdmin(req) {
    return getUser(req) === "admin";
}

// ================= PARSING =================
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

// ================= DATA =================
let files = [];

app.use('/uploads', express.static('uploads'));

// ================= LOGIN =================
app.get('/login', (req, res) => {
    res.send(`
<h2>Login</h2>

<form method="POST" action="/login">
<input name="user" placeholder="username" required><br>
<input name="pass" type="password" placeholder="password" required><br>
<button>Login</button>
</form>
    `);
});

app.post('/login', (req, res) => {
    const { user, pass } = req.body;

    if (users[user] && users[user] === pass) {
        res.setHeader('Set-Cookie', 'user=' + user + '; Path=/');
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
<h2>OpenShare</h2>

<p>Logged in as: <b>${user}</b> | <a href="/logout">Logout</a></p>

<form id="uploadForm">
Title: <input name="title" required />
<input type="file" name="file" required />
<button>Upload</button>
</form>

<hr>

<div id="list"></div>

<script>
async function load() {
    let res = await fetch('/files');
    let data = await res.json();

    document.getElementById('list').innerHTML =
        data.map(f => \`
            <div style="border:1px solid #ccc;padding:10px;margin:5px;">
                <b>\${f.title}</b><br>
                <a href="\${f.url}" target="_blank">Download</a><br>
                <small>Uploaded by: \${f.user}</small>
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

// ================= START =================
app.listen(PORT, () => {
    console.log("Running on port " + PORT);
});
