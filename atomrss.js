// ===== FILE 8: Real-time Comments, Follow System, Webhooks, RSS, Anti-spam, Mod Logs =====
const {
  express,
  bodyParser,
  marked,
  fs,
  path,
  uuid,
  socketIO,
  dayjs,
  fetch,
  cors,
  jsdom,
  chalk,
  crypto,
  cookieParser,
  readline,
  compression,
  os,
  events
} = require('./core');

let follows = {}; // { user: [page1, page2], page: [user1, user2] }
let webhooks = []; // { url, event }

let commentLogs = []; // for mod logs

// Follow a user or page
app.post('/follow', requireAuth, (req, res) => {
    const { target, type } = req.body;
    const user = getUser(req);
    if (!follows[user.username]) follows[user.username] = [];
    if (!follows[user.username].includes(target)) {
        follows[user.username].push(target);
    }

    if (!follows[target]) follows[target] = [];
    if (!follows[target].includes(user.username)) {
        follows[target].push(user.username);
    }

    res.send('Followed!');
});

// Get followed content
app.get('/followed', requireAuth, (req, res) => {
    const user = getUser(req);
    const followed = follows[user.username] || [];
    res.send(`<h1>You're following:</h1><ul>${followed.map(f => `<li>${f}</li>`).join('')}</ul>`);
});

// Live polling of comments (basic polling, not socket)
app.get('/api/comments/:page', (req, res) => {
    const page = pages.find(p => p.name === req.params.page);
    if (!page) return res.status(404).send('Not found');
    res.json(page.comments || []);
});

// Submit comment via API
app.post('/api/comments/:page', (req, res) => {
    const page = pages.find(p => p.name === req.params.page);
    if (!page) return res.status(404).send('Not found');
    const user = getUser(req);
    const ip = req.ip;
    const body = req.body.text;

    if (isSpam(body)) return res.status(429).send("Spam detected!");

    const comment = {
        id: Date.now().toString(),
        user: user ? user.username : ip,
        text: parseMentions(marked.parse(body)),
        time: new Date().toISOString(),
        ip,
        reactions: {}
    };

    page.comments = page.comments || [];
    page.comments.push(comment);
    commentLogs.push({ action: "create", comment });

    sendWebhook('comment_created', comment);

    res.status(201).json({ ok: true });
});

// Spam detection
function isSpam(text) {
    const tooFast = text.length < 3 || /http/.test(text); // simple rules
    return tooFast;
}

// Webhook management
app.post('/admin/webhooks', requireAdmin, (req, res) => {
    const { url, event } = req.body;
    webhooks.push({ url, event });
    res.redirect('/admin');
});

function sendWebhook(event, payload) {
    webhooks.filter(h => h.event === event).forEach(hook => {
        fetch(hook.url, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ event, payload })
        }).catch(e => console.log('Webhook failed:', e));
    });
}

// Mod Logs view
app.get('/admin/logs', requireAdmin, (req, res) => {
    res.send(`<h1>Moderator Logs</h1><pre>${JSON.stringify(commentLogs.slice(-100), null, 2)}</pre>`);
});

// RSS Feed of comments
app.get('/rss/:page', (req, res) => {
    const page = pages.find(p => p.name === req.params.page);
    if (!page) return res.status(404).send('No page');
    res.set('Content-Type', 'application/xml');
    const items = (page.comments || []).map(c => `
        <item>
            <title>Comment by ${c.user}</title>
            <description><![CDATA[${c.text}]]></description>
            <pubDate>${c.time}</pubDate>
        </item>`).join('');
    res.send(`
        <rss version="2.0">
            <channel>
                <title>Comments on ${page.name}</title>
                ${items}
            </channel>
        </rss>
    `);
});

// Delete comment
app.post('/comment/:page/:id/delete', requireAuth, (req, res) => {
    const page = pages.find(p => p.name === req.params.page);
    const user = getUser(req);
    if (!page) return res.send('Page not found');

    const comment = (page.comments || []).find(c => c.id === req.params.id);
    if (!comment) return res.send('Comment not found');

    if (user.username === comment.user || user.role === 'admin') {
        page.comments = page.comments.filter(c => c.id !== req.params.id);
        commentLogs.push({ action: "delete", by: user.username, commentId: req.params.id });
        res.redirect(`/pages/${page.name}`);
    } else {
        res.status(403).send("Forbidden");
    }
});
