// ===== FILE 5: Admin Settings, Bans, Roles, Currency, Config Panel =====

let bannedIPs = [];
let bannedUsers = [];
let siteConfig = {
    currencyName: "Credits",
    dailyBonus: 10,
    theme: "dark",
    maintenance: false
};

function isBanned(req, res, next) {
    const ip = req.ip;
    const user = getUser(req);
    if (bannedIPs.includes(ip) || (user && bannedUsers.includes(user.username))) {
        return res.send('<h1>You are banned from accessing this site.</h1>');
    }
    next();
}

app.use(isBanned);

// Admin dashboard
app.get('/admin', requireAdmin, (req, res) => {
    res.send(`
        <html><body>
        <h1>Admin Panel</h1>
        <h3>Site Configuration</h3>
        <form method="POST" action="/admin/config">
            Currency: <input name="currencyName" value="${siteConfig.currencyName}" /><br>
            Daily Bonus: <input name="dailyBonus" value="${siteConfig.dailyBonus}" /><br>
            <button type="submit">Update</button>
        </form>
        <h3>Ban User/IP</h3>
        <form method="POST" action="/admin/ban">
            Username/IP: <input name="target" />
            <select name="type"><option value="user">User</option><option value="ip">IP</option></select>
            <button type="submit">Ban</button>
        </form>
        <h3>Promote User</h3>
        <form method="POST" action="/admin/promote">
            Username: <input name="username" />
            Role: <select name="role">
                <option value="moderator">Moderator</option>
                <option value="trusted">Trusted</option>
                <option value="admin">Admin</option>
            </select>
            <button type="submit">Promote</button>
        </form>
        </body></html>
    `);
});

app.post('/admin/config', requireAdmin, (req, res) => {
    const { currencyName, dailyBonus } = req.body;
    siteConfig.currencyName = currencyName;
    siteConfig.dailyBonus = parseInt(dailyBonus);
    res.redirect('/admin');
});

app.post('/admin/ban', requireAdmin, (req, res) => {
    const { target, type } = req.body;
    if (type === 'ip') bannedIPs.push(target);
    else bannedUsers.push(target);
    res.redirect('/admin');
});

app.post('/admin/promote', requireAdmin, (req, res) => {
    const { username, role } = req.body;
    const user = users.find(u => u.username === username);
    if (user) user.role = role;
    res.redirect('/admin');
});

// Currency display & bonus
app.get('/wallet', requireAuth, (req, res) => {
    const user = getUser(req);
    res.send(`<h1>${user.username}'s Wallet</h1><p>Balance: ${user.currency} ${siteConfig.currencyName}</p>`);
});

app.post('/daily-bonus', requireAuth, (req, res) => {
    const user = getUser(req);
    user.currency += siteConfig.dailyBonus;
    res.redirect('/wallet');
});
