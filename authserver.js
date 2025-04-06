// Node.js Forum Software
// File 1/10 - Core server, routing, user auth, markdown, and JSONBin persistence

const express = require('express');
const fetch = require('node-fetch');
const fs = require('fs');
const path = require('path');
const marked = require('marked');
const app = express();
const PORT = 3000;

const JSONBIN_URL = 'https://api.jsonbin.io/v3/b/67f25f4b8960c979a57f3a00';
const API_KEY = '$2a$10$HhPPODs7uMDC9IzGCAo4COiZ..r2y3uKVJpoSrCAeye.Ns2xGYGBm';

// Static folders
app.use('/static', express.static(path.join(__dirname, 'static')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// In-memory cache
let cache = {
  users: [],
  pages: [],
  bans: [],
  settings: {},
};

const loadFromJSONBin = async () => {
  const res = await fetch(JSONBIN_URL, {
    headers: { 'X-Master-Key': API_KEY },
  });
  const json = await res.json();
  cache = json.record;
};

const saveToJSONBin = async () => {
  await fetch(JSONBIN_URL, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      'X-Master-Key': API_KEY,
    },
    body: JSON.stringify(cache),
  });
};

// Middleware
app.use(async (req, res, next) => {
  if (!cache.users.length) await loadFromJSONBin();
  req.ipUser = req.headers['x-forwarded-for'] || req.socket.remoteAddress;
  next();
});

// Templates
const layout = (title, body) => `
<!DOCTYPE html>
<html>
<head>
  <title>${title}</title>
  <link rel="stylesheet" href="/static/style.css">
</head>
<body>
  <div class="navbar">
    <a href="/">Home</a>
    <a href="/create">New Page</a>
  </div>
  <div class="content">
    ${body}
  </div>
</body>
</html>
`;

// Routes
app.get('/', (req, res) => {
  const pageList = cache.pages.map(p => `<li><a href="/pages/${p.title}">${p.title}</a></li>`).join('');
  res.send(layout('Home', `<h1>Futuristic Forum</h1><ul>${pageList}</ul>`));
});

app.get('/create', (req, res) => {
  res.send(layout('Create Page', `
    <form action="/create" method="POST">
      <input name="title" placeholder="Page Title" required><br>
      <textarea name="content" placeholder="Markdown content" rows="10" cols="50"></textarea><br>
      <button type="submit">Create</button>
    </form>
  `));
});

app.post('/create', async (req, res) => {
  const { title, content } = req.body;
  const html = marked(content);
  const filePath = path.join(__dirname, 'pages', `${title}.html`);
  fs.writeFileSync(filePath, layout(title, html));
  cache.pages.push({ title, author: req.ipUser });
  await saveToJSONBin();
  res.redirect(`/pages/${title}`);
});

// Comment system, roles, markdown preview, and more will continue in the next file...

app.listen(PORT, () => console.log(`Forum running on http://localhost:${PORT}`));
