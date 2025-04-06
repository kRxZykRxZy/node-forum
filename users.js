// ===== FILE 7: Profiles, Themes, Markdown, Reactions, Mentions, Badges, Directory =====
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

const marked = require('marked');

let badges = [
    { id: "founder", label: "Founder", color: "#0ff" },
    { id: "trusted", label: "Trusted", color: "#0f0" },
    { id: "mod", label: "Moderator", color: "#f80" },
    { id: "admin", label: "Administrator", color: "#f00" }
];

let reactions = ["👍", "❤️", "😂", "🎉", "😢", "👎"];

app.get('/themes', (req, res) => {
    res.send(`
        <h1>Choose Theme</h1>
        <form method="POST" action="/theme">
            <select name="theme">
                <option value="dark">Dark</option>
                <option value="light">Light</option>
                <option value="neon">Neon Blue</option>
            </select>
            <button>Apply</button>
        </form>
    `);
});

app.post('/theme', (req, res) => {
    const user = getUser(req);
    if (user) user.theme = req.body.theme;
    res.redirect('/themes');
});

app.get('/profile/:username', (req, res) => {
    const target = users.find(u => u.username === req.params.username);
    if (!target) return res.send('User not found');
    const you = getUser(req);
    const editable = you && (you.username === target.username || you.role === 'admin');
    const renderedBio = marked.parse(target.bio || '');

    res.send(`
        <h1>@${target.username}</h1>
        <p>Bio: ${renderedBio}</p>
        <p>Role: ${target.role}</p>
        <p>Currency: ${target.currency}</p>
        <p>Badges: ${target.badges?.map(b => `<span style="color:${badges.find(bd => bd.id === b)?.color}">${badges.find(bd => bd.id === b)?.label}</span>`).join(", ") || 'None'}</p>
        ${editable ? `
        <form method="POST" action="/profile/${target.username}">
            <textarea name="bio">${target.bio || ''}</textarea><br>
            <button>Update Bio</button>
        </form>` : ''}
    `);
});

app.post('/profile/:username', requireAuth, (req, res) => {
    const you = getUser(req);
    const target = users.find(u => u.username === req.params.username);
    if (you.username === target.username || you.role === 'admin') {
        target.bio = req.body.bio;
        notifyUser(target.username, "Your profile was updated!", `/profile/${target.username}`);
    }
    res.redirect(`/profile/${target.username}`);
});

// Markdown preview
app.post('/preview', (req, res) => {
    const html = marked.parse(req.body.markdown || '');
    res.send(`<div>${html}</div>`);
});

// Reactions
app.post('/react', requireAuth, (req, res) => {
    const { postId, emoji } = req.body;
    if (!reactions.includes(emoji)) return res.send('Invalid reaction.');
    const post = articles.find(p => p.id === postId);
    if (!post) return res.send('Post not found.');

    post.reactions = post.reactions || {};
    post.reactions[emoji] = post.reactions[emoji] || 0;
    post.reactions[emoji]++;
    res.send('Reacted!');
});

// Mentions parsing in comments/posts
function parseMentions(text) {
    return text.replace(/@(\w+)/g, (match, name) => {
        const exists = users.find(u => u.username === name);
        if (exists) {
            notifyUser(name, `You were mentioned in a post/comment`, `/profile/${name}`);
            return `<a href="/profile/${name}">@${name}</a>`;
        }
        return match;
    });
}

// Directory of all users
app.get('/users', (req, res) => {
    res.send(`
        <h1>User Directory</h1>
        <ul>
            ${users.map(u => `<li><a href="/profile/${u.username}">@${u.username}</a> - ${u.role}</li>`).join('')}
        </ul>
    `);
});

// Badge assignment (admin only)
app.post('/admin/badge', requireAdmin, (req, res) => {
    const { username, badgeId } = req.body;
    const user = users.find(u => u.username === username);
    if (user && badges.find(b => b.id === badgeId)) {
        user.badges = user.badges || [];
        if (!user.badges.includes(badgeId)) {
            user.badges.push(badgeId);
            notifyUser(username, `You've been awarded a badge!`, `/profile/${username}`);
        }
    }
    res.redirect('/admin');
});
