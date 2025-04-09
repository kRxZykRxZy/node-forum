// ===== FILE 10: Themes, OAuth, Private Messages, Modular UI, Rate Limits, Directory, Webhooks =====
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
let userThemes = {}; // { username: "dark" | "light" | "neon" }
let privateMessages = []; // { from, to, message, timestamp }
let userDirectory = []; // for search
let rateLimits = {}; // { ip: { lastAction: Date, count: Number } }
let webhooks = []; // { url, event }

const oauthProviders = {
    google: { clientId: "", clientSecret: "" },
    discord: { clientId: "", clientSecret: "" }
};

// === Theme Engine ===
app.get('/settings/theme', (req, res) => {
    const user = getUser(req);
    const current = userThemes[user.username] || 'dark';
    res.send(`
        <h1>Choose Theme</h1>
        <form method="POST" action="/settings/theme">
            <select name="theme">
                <option value="dark" ${current === 'dark' ? 'selected' : ''}>Dark</option>
                <option value="light" ${current === 'light' ? 'selected' : ''}>Light</option>
                <option value="neon" ${current === 'neon' ? 'selected' : ''}>Neon</option>
            </select>
            <button>Update</button>
        </form>
    `);
});

app.post('/settings/theme', (req, res) => {
    const user = getUser(req);
    userThemes[user.username] = req.body.theme;
    res.redirect('/settings/theme');
});

// === OAuth Placeholder (no env)
app.get('/auth/oauth/:provider', (req, res) => {
    res.send(`<h1>OAuth login for ${req.params.provider} not set up yet.</h1>`);
});

// === Private Messaging
app.get('/messages', (req, res) => {
    const user = getUser(req);
    const inbox = privateMessages.filter(m => m.to === user.username);
    res.send(`<h1>Inbox</h1><pre>${JSON.stringify(inbox, null, 2)}</pre>`);
});

app.post('/messages/send', (req, res) => {
    const user = getUser(req);
    const { to, message } = req.body;
    privateMessages.push({ from: user.username, to, message, timestamp: new Date() });
    res.redirect('/messages');
});

// === Rate Limiting
function applyRateLimit(req, res, next) {
    const ip = req.ip;
    const now = Date.now();
    if (!rateLimits[ip]) rateLimits[ip] = { lastAction: now, count: 1 };
    else {
        let r = rateLimits[ip];
        if (now - r.lastAction < 10000) { // 10s window
            r.count++;
            if (r.count > 10) return res.send('<h1>Rate limit exceeded</h1>');
        } else {
            r.lastAction = now;
            r.count = 1;
        }
    }
    next();
}
app.use(applyRateLimit);

// === User Directory
app.get('/directory', (req, res) => {
    let list = users.map(u => ({ username: u.username, role: u.role, bio: u.bio || "" }));
    res.send(`<h1>User Directory</h1><pre>${JSON.stringify(list, null, 2)}</pre>`);
});

// === Modular UI Templates
function renderPage(title, body, theme = 'dark') {
    return `
    <html><head><title>${title}</title><style>
    body { font-family: sans-serif; padding: 2em; background: ${theme === 'neon' ? '#0f0f3a' : theme === 'light' ? '#fff' : '#111'}; color: ${theme === 'light' ? '#111' : '#fff'} }
    a { color: ${theme === 'neon' ? '#0ff' : '#09f'} }
    </style></head><body>
    <h1>${title}</h1>
    ${body}
    </body></html>
    `;
}

// Example custom page
app.get('/about', (req, res) => {
    const user = getUser(req);
    const theme = user ? userThemes[user.username] : 'dark';
    res.send(renderPage('About Us', `<p>This site is running on pure Node.js magic.</p>`, theme));
});

// === Webhooks
app.post('/admin/webhooks/add', (req, res) => {
    const { url, event } = req.body;
    webhooks.push({ url, event });
    res.redirect('/admin');
});

function triggerWebhook(event, data) {
    for (let hook of webhooks) {
        if (hook.event === event) {
            fetch(hook.url, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(data)
            }).catch(console.error);
        }
    }
}

// === Final Fallback
app.use((req, res) => {
    res.status(404).send('<h1>404 Not Found</h1>');
});
