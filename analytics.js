// ===== FILE 6: Notifications, Mod Reports, Queue, Logs, Analytics =====
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

let notifications = []; // {to, message, link, timestamp}
let modReports = []; // {reporter, target, type, reason, timestamp, status}
let modLogs = []; // {admin, action, target, timestamp}
let siteAnalytics = {
    visits: 0,
    posts: 0,
    users: 0,
    comments: 0,
};

// Middleware for tracking site usage
app.use((req, res, next) => {
    siteAnalytics.visits++;
    next();
});

// Notification UI
app.get('/notifications', requireAuth, (req, res) => {
    const user = getUser(req);
    const userNotifs = notifications.filter(n => n.to === user.username);
    res.send(`
        <h1>Notifications</h1>
        <ul>
            ${userNotifs.map(n => `<li>${n.message} - <a href="${n.link}">View</a></li>`).join('')}
        </ul>
    `);
});

// Report system
app.post('/report', requireAuth, (req, res) => {
    const { target, type, reason } = req.body;
    const reporter = getUser(req).username;
    modReports.push({ reporter, target, type, reason, timestamp: Date.now(), status: 'pending' });
    res.send('Reported for moderation.');
    modLogs.push({ admin: reporter, action: `Reported ${target} (${type})`, target, timestamp: Date.now() });
});

// Mod queue
app.get('/mod/reports', requireMod, (req, res) => {
    res.send(`
        <h1>Moderation Reports</h1>
        <ul>
        ${modReports.map(r => `
            <li>
                <b>${r.type}</b> reported by ${r.reporter}: ${r.reason} on <i>${r.target}</i><br>
                Status: ${r.status}
                <form method="POST" action="/mod/resolve">
                    <input type="hidden" name="id" value="${modReports.indexOf(r)}" />
                    <button name="action" value="resolve">Resolve</button>
                    <button name="action" value="reject">Reject</button>
                </form>
            </li>`).join('')}
        </ul>
    `);
});

app.post('/mod/resolve', requireMod, (req, res) => {
    const { id, action } = req.body;
    const report = modReports[id];
    if (report) {
        report.status = action;
        modLogs.push({ admin: getUser(req).username, action: `${action} report on ${report.target}`, target: report.target, timestamp: Date.now() });
    }
    res.redirect('/mod/reports');
});

// Admin view of mod logs
app.get('/mod/logs', requireAdmin, (req, res) => {
    res.send(`
        <h1>Moderation Logs</h1>
        <ul>
        ${modLogs.map(l => `<li>${l.timestamp}: ${l.admin} did "${l.action}" on ${l.target}</li>`).join('')}
        </ul>
    `);
});

// Analytics dashboard
app.get('/admin/analytics', requireAdmin, (req, res) => {
    res.send(`
        <h1>Site Analytics</h1>
        <p>Total Visits: ${siteAnalytics.visits}</p>
        <p>Users: ${users.length}</p>
        <p>Articles: ${articles.length}</p>
        <p>Comments: ${articles.reduce((acc, a) => acc + a.comments.length, 0)}</p>
    `);
});

// Send Notification Utility
function notifyUser(username, message, link = "#") {
    notifications.push({
        to: username,
        message,
        link,
        timestamp: Date.now()
    });
}
