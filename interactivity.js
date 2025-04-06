// ===== FILE 4: Comments Edit/Delete, Notifications, Reactions, Mentions, Themes =====

const escapeHTML = (str) => str.replace(/[&<>'"`=]/g, s => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;', '`': '&#96;', '=': '&#61;' })[s]);

let notifications = [];

// Comment edit/delete
app.post('/pages/:page/edit-comment/:index', requireAuth, (req, res) => {
    const { page, index } = req.params;
    const filepath = path.join(pagesPath, `${page}.json`);
    const newText = req.body.text;
    const pageData = JSON.parse(fs.readFileSync(filepath));
    const user = getUser(req);

    if (!pageData.comments[index]) return res.send('Comment not found');
    if (pageData.comments[index].username !== user.username && user.role !== 'admin') return res.send('Not allowed');

    pageData.comments[index].text = newText;
    fs.writeFileSync(filepath, JSON.stringify(pageData, null, 2));
    res.redirect(`/pages/${page}`);
});

app.post('/pages/:page/delete-comment/:index', requireAuth, (req, res) => {
    const { page, index } = req.params;
    const filepath = path.join(pagesPath, `${page}.json`);
    const pageData = JSON.parse(fs.readFileSync(filepath));
    const user = getUser(req);

    if (!pageData.comments[index]) return res.send('Comment not found');
    if (pageData.comments[index].username !== user.username && user.role !== 'admin') return res.send('Not allowed');

    pageData.comments.splice(index, 1);
    fs.writeFileSync(filepath, JSON.stringify(pageData, null, 2));
    res.redirect(`/pages/${page}`);
});

// Reactions system
let reactions = {}; // { "pageTitle:index": {like: [usernames], love: [...], ...} }

app.post('/pages/:page/react/:index/:reaction', requireAuth, (req, res) => {
    const { page, index, reaction } = req.params;
    const key = `${page}:${index}`;
    const user = getUser(req);
    reactions[key] = reactions[key] || {};
    reactions[key][reaction] = reactions[key][reaction] || [];
    if (!reactions[key][reaction].includes(user.username)) {
        reactions[key][reaction].push(user.username);
    }
    res.redirect(`/pages/${page}`);
});

// Mentions notifications
function checkMentions(commentText, page, index) {
    const mentioned = Array.from(commentText.matchAll(/@([a-zA-Z0-9_\-]+)/g));
    mentioned.forEach(([_, username]) => {
        if (users.find(u => u.username === username)) {
            notifications.push({
                to: username,
                text: `You were mentioned in a comment on <a href="/pages/${page}">${page}</a>`
            });
        }
    });
}

// Apply theme via query
app.get('/theme/:mode', (req, res) => {
    const theme = req.params.mode;
    res.cookie('theme', theme);
    res.redirect('back');
});

// Notification feed
app.get('/notifications', requireAuth, (req, res) => {
    const user = getUser(req);
    const userNotes = notifications.filter(n => n.to === user.username);
    res.send(`<html><body><h2>Your Notifications</h2>${userNotes.map(n => `<p>${n.text}</p>`).join('')}</body></html>`);
});

// Inject theme to page
function themeStyle(req) {
    const theme = req.cookies.theme || 'dark';
    return theme === 'light'
        ? `<style>body { background: white; color: black; }</style>`
        : `<style>body { background: #121212; color: #00bfff; }</style>`;
}
