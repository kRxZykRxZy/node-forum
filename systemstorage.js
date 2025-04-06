// ===== FILE 3: Pages, Comments, Tags, Markdown =====
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
const DOMPurify = require('isomorphic-dompurify');
const fs = require('fs');
const path = require('path');

const pagesPath = path.join(__dirname, 'pages');
if (!fs.existsSync(pagesPath)) fs.mkdirSync(pagesPath);

// Pages
app.get('/pages/:page', (req, res) => {
    const { page } = req.params;
    const filepath = path.join(pagesPath, `${page}.json`);
    if (!fs.existsSync(filepath)) return res.send('<h1>404 Page Not Found</h1>');

    const data = JSON.parse(fs.readFileSync(filepath));
    const contentHTML = DOMPurify.sanitize(marked.parse(data.content));

    let commentsHTML = data.comments.map(comment => {
        const user = users.find(u => u.username === comment.username);
        const roleBadge = user?.role === 'admin' ? '🛡️' : user?.role === 'moderator' ? '🔧' : '';
        const safeComment = DOMPurify.sanitize(marked.parse(comment.text));
        return `<div class="comment"><strong>${comment.username} ${roleBadge}</strong><br>${safeComment}</div>`;
    }).join('');

    res.send(`
        <html><head><title>${page}</title></head><body>
            <div class="page-content">${contentHTML}</div>
            <h3>Comments</h3>
            ${commentsHTML}
            <form action="/pages/${page}/comment" method="POST">
                <textarea name="text" required></textarea><br>
                <button type="submit">Post</button>
            </form>
        </body></html>
    `);
});

app.post('/pages/:page/comment', (req, res) => {
    const { page } = req.params;
    const filepath = path.join(pagesPath, `${page}.json`);
    const text = req.body.text;
    const user = getUser(req);

    if (!fs.existsSync(filepath)) return res.send('<h1>Page Not Found</h1>');

    const data = JSON.parse(fs.readFileSync(filepath));
    const commenter = user ? user.username : req.ip;
    const comment = { username: commenter, text };

    data.comments.push(comment);
    fs.writeFileSync(filepath, JSON.stringify(data, null, 2));
    res.redirect(`/pages/${page}`);
});

app.get('/create', requireAuth, (req, res) => {
    res.send(`
        <html><body>
            <form action="/create" method="POST">
                <input name="title" placeholder="Page Title" required /><br>
                <textarea name="content" placeholder="Markdown content" required></textarea><br>
                <input name="tags" placeholder="Comma-separated tags"><br>
                <button type="submit">Create Page</button>
            </form>
        </body></html>
    `);
});

app.post('/create', requireAuth, (req, res) => {
    const { title, content, tags } = req.body;
    const filename = title.replace(/\W+/g, '-').toLowerCase();
    const filepath = path.join(pagesPath, `${filename}.json`);
    const newPage = {
        title,
        content,
        creator: req.session.user,
        tags: tags.split(',').map(t => t.trim()),
        comments: []
    };
    fs.writeFileSync(filepath, JSON.stringify(newPage, null, 2));
    res.redirect(`/pages/${filename}`);
});

// Tag Index
app.get('/tags/:tag', (req, res) => {
    const tag = req.params.tag;
    const files = fs.readdirSync(pagesPath);
    const results = [];

    for (const file of files) {
        const page = JSON.parse(fs.readFileSync(path.join(pagesPath, file)));
        if (page.tags.includes(tag)) {
            results.push(`<a href="/pages/${file.replace('.json', '')}">${page.title}</a>`);
        }
    }

    res.send(`
        <html><body>
            <h1>Tag: ${tag}</h1>
            ${results.join('<br>')}
        </body></html>
    `);
});
