// ===== FILE 9: Account Deletion, Mod Queue, Analytics, Accessibility, Backups =====
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

let modQueue = []; // { type: "comment/page", content }
let analytics = {
    pageViews: {},
    userLogins: [],
    actions: []
};

let accessibilitySettings = {}; // per-user: { fontSize, contrast, reduceMotion }
const app = express();
// === Account Deletion ===
app.get('/account/delete', (req, res) => {
    res.send(`
        <h1>Delete Account</h1>
        <p>Are you sure? This cannot be undone.</p>
        <form method="POST" action="/account/delete">
            <button>Yes, delete my account</button>
        </form>
    `);
});

app.post('/account/delete', (req, res) => {
    const user = getUser(req);
    users = users.filter(u => u.username !== user.username);
    res.clearCookie('auth').send('<h1>Account Deleted</h1>');
});

// === Mod Queue Submission (by system or user report)
function queueForModeration(type, content) {
    modQueue.push({ type, content, time: new Date() });
}

app.get('/admin/modqueue', (req, res) => {
    res.send(`<h1>Moderation Queue</h1><pre>${JSON.stringify(modQueue, null, 2)}</pre>`);
});

// === Analytics Tracking
app.use((req, res, next) => {
    const path = req.path;
    analytics.pageViews[path] = (analytics.pageViews[path] || 0) + 1;

    if (req.cookies.auth) {
        analytics.userLogins.push({ user: req.cookies.auth, time: new Date() });
    }

    analytics.actions.push({ path, ip: req.ip, time: new Date() });

    next();
});

app.get('/admin/analytics', (req, res) => {
    res.send(`
        <h1>Analytics Dashboard</h1>
        <h3>Page Views</h3><pre>${JSON.stringify(analytics.pageViews, null, 2)}</pre>
        <h3>Logins</h3><pre>${JSON.stringify(analytics.userLogins.slice(-10), null, 2)}</pre>
        <h3>Activity</h3><pre>${JSON.stringify(analytics.actions.slice(-20), null, 2)}</pre>
    `);
});

// === Accessibility Settings
app.get('/settings/accessibility', (req, res) => {
    const user = getUser(req);
    const settings = accessibilitySettings[user.username] || {};
    res.send(`
        <h1>Accessibility Settings</h1>
        <form method="POST" action="/settings/accessibility">
            Font Size: <input name="fontSize" value="${settings.fontSize || '16px'}"/><br>
            High Contrast: <input type="checkbox" name="contrast" ${settings.contrast ? 'checked' : ''} /><br>
            Reduce Motion: <input type="checkbox" name="reduceMotion" ${settings.reduceMotion ? 'checked' : ''} /><br>
            <button>Save</button>
        </form>
    `);
});

app.post('/settings/accessibility', (req, res) => {
    const user = getUser(req);
    accessibilitySettings[user.username] = {
        fontSize: req.body.fontSize,
        contrast: !!req.body.contrast,
        reduceMotion: !!req.body.reduceMotion
    };
    res.redirect('/settings/accessibility');
});

// === Backup Export
app.get('/admin/export', (req, res) => {
    const data = {
        users, pages, siteConfig, bannedUsers, bannedIPs, analytics
    };
    res.setHeader('Content-Disposition', 'attachment; filename=backup.json');
    res.json(data);
});

// === Backup Import
app.post('/admin/import', (req, res) => {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
        try {
            const imported = JSON.parse(body);
            users = imported.users;
            pages = imported.pages;
            siteConfig = imported.siteConfig;
            bannedUsers = imported.bannedUsers;
            bannedIPs = imported.bannedIPs;
            analytics = imported.analytics;
            res.send('Imported successfully!');
        } catch (e) {
            res.status(400).send('Invalid JSON');
        }
    });
});
