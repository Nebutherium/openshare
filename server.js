app.get('/admin', (req, res) => {
    if (!isAdmin(req)) return res.redirect('/');

    res.send(`
<html>
<head>
<title>Admin Panel</title>
${style}
</head>
<body>

<div class="topbar">Admin Control Sanctum</div>

<div class="container">

<a href="/">← Back</a>

<h3>👤 Users</h3>
<div class="card">
<pre>${JSON.stringify(users, null, 2)}</pre>
</div>

<h3>📦 Files</h3>

${files.map((f, i) => `
<div class="card">
<b>${f.title}</b><br>
<small>by ${f.user}</small><br>
<a href="${f.url}" target="_blank">Open</a><br>

<form method="POST" action="/admin/delete-file/${i}">
<button>Delete File</button>
</form>
</div>
`).join('')}

<h3>💬 Forum Posts</h3>

${posts.map((p, i) => `
<div class="card">
<b>${p.title}</b><br>
${p.content}<br>
<small>by ${p.user}</small><br>

<form method="POST" action="/admin/delete-post/${i}">
<button>Delete Post</button>
</form>
</div>
`).join('')}

</div>

</body>
</html>
    `);
});
