const express = require('express');
const multer = require('multer');
const path = require('path');

const app = express();
const PORT = 3000;

// storage setup
const storage = multer.diskStorage({
    destination: (req, file, cb) => cb(null, 'uploads/'),
    filename: (req, file, cb) => {
        cb(null, Date.now() + path.extname(file.originalname));
    }
});

const upload = multer({ storage });

// in-memory file list
let files = [];

// serve uploads
app.use('/uploads', express.static('uploads'));

// MAIN PAGE
app.get('/', (req, res) => {
    res.send(`
<!DOCTYPE html>
<html>
<head>
<title>OpenShare</title>
<style>
body { font-family: Verdana; background:white; font-size:13px; }
.container { width:80%; margin:auto; }
table { width:100%; border-collapse:collapse; }
th,td { border-bottom:1px solid #ccc; padding:5px; }
a { color:blue; }
</style>
</head>
<body>

<div class="container">
<h2>OpenShare</h2>

<form id="uploadForm">
Title: <input type="text" name="title" required><br><br>
File: <input type="file" name="file" required><br><br>
<button type="submit">Upload</button>
</form>

<hr>

<table>
<thead>
<tr><th>Name</th><th>Download</th></tr>
</thead>
<tbody id="files"></tbody>
</table>
</div>

<script>
async function loadFiles() {
    let res = await fetch('/files');
    let data = await res.json();

    let container = document.getElementById("files");
    container.innerHTML = "";

    data.forEach(f => {
        let row = document.createElement("tr");
        row.innerHTML = \`
            <td>\${f.title}</td>
            <td><a href="\${f.url}" download>Download</a></td>
        \`;
        container.appendChild(row);
    });
}

document.getElementById("uploadForm").onsubmit = async (e) => {
    e.preventDefault();
    let formData = new FormData(e.target);

    await fetch('/upload', {
        method: 'POST',
        body: formData
    });

    e.target.reset();
    loadFiles();
};

loadFiles();
</script>

</body>
</html>
    `);
});

// upload route
app.post('/upload', upload.single('file'), (req, res) => {
    files.unshift({
        title: req.body.title,
        url: '/uploads/' + req.file.filename
    });
    res.sendStatus(200);
});

// list files
app.get('/files', (req, res) => {
    res.json(files);
});

// start server
app.listen(PORT, () => {
    console.log("Running on http://localhost:3000");
});