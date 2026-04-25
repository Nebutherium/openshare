app.post('/signup', (req, res) => {
    let { user, pass } = req.body;

    if (!user || !pass) return res.send("Missing fields");

    // normalize username (prevents case tricks)
    const cleanUser = user.trim().toLowerCase();

    // check duplicates (case-insensitive)
    for (let existing in users) {
        if (existing.toLowerCase() === cleanUser) {
            return res.send("Username already taken");
        }
    }

    // store original casing but safe lookup
    users[user] = pass;

    res.setHeader('Set-Cookie', 'user=' + user + '; Path=/');
    res.redirect('/');
});
