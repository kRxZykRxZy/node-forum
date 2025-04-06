const express = require('express');
const app = express();
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const session = require('express-session');
const { v4: uuidv4 } = require('uuid');

// In-memory storage for simplicity (use a real database for production)
let users = []; // stores users {username, password, role}
let articles = []; // stores articles {title, content, comments, creator}
let sessions = {}; // session tracking by username

// Middleware
app.use(bodyParser.urlencoded({ extended: true }));
app.use(session({
    secret: 'google-trillion-dollar-wiki',
    resave: false,
    saveUninitialized: true
}));

// Serve dynamic HTML content for index page and other pages
app.get('/', (req, res) => {
    let pageContent = `
    <html>
        <head>
            <title>Google Wiki - Trillion Dollar Wiki</title>
            <style>
                body { font-family: Arial, sans-serif; background-color: #1e1e1e; color: white; }
                .header { background-color: #3f3f3f; padding: 10px; text-align: center; }
                .login { margin: 20px auto; text-align: center; }
                input { padding: 10px; margin: 5px; border-radius: 5px; }
                .wiki-article { margin: 20px auto; padding: 10px; background-color: #2e2e2e; border-radius: 5px; width: 80%; }
                .comment { margin: 10px 0; padding: 10px; background-color: #444; border-radius: 5px; }
                .nav { text-align: center; padding: 10px; }
                .nav a { color: white; padding: 10px; text-decoration: none; }
                .nav a:hover { background-color: #444; }
            </style>
        </head>
        <body>
            <div class="header">
                <h1>Google Trillion Dollar Wiki</h1>
            </div>
            <div class="nav">
                <a href="/">Home</a> | 
                <a href="/login">Login</a> | 
                <a href="/signup">Sign Up</a>
            </div>
            <div class="login">
                ${req.session.username ? 
                    `<p>Welcome, ${req.session.username}!</p><form action="/logout" method="POST"><button type="submit">Logout</button></form>` :
                    ``
                }
            </div>
            <div class="wiki-articles">
                <h2>Articles</h2>
                ${articles.map(article => `
                    <div class="article">
                        <h3><a href="/page/${article.title}">${article.title}</a></h3>
                        <p>${article.content.slice(0, 100)}...</p>
                        <h4>Comments</h4>
                        ${article.comments.map(comment => `<div class="comment">${comment}</div>`).join('')}
                    </div>
                `).join('')}
            </div>
        </body>
    </html>
    `;
    res.send(pageContent);
});

// User Login
app.get('/login', (req, res) => {
    let pageContent = `
    <html>
        <head><title>Login - Google Wiki</title></head>
        <body>
            <h2>Login</h2>
            <form action="/login" method="POST">
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Login</button>
            </form>
        </body>
    </html>
    `;
    res.send(pageContent);
});

app.post('/login', (req, res) => {
    const { username, password } = req.body;
    const user = users.find(u => u.username === username);
    if (user && bcrypt.compareSync(password, user.password)) {
        req.session.username = username;
        sessions[username] = req.session.id; // Track active session
        res.redirect('/');
    } else {
        res.send('<p>Invalid credentials. Please try again.</p><a href="/">Go back</a>');
    }
});

// User Signup
app.get('/signup', (req, res) => {
    let pageContent = `
    <html>
        <head><title>Sign Up - Google Wiki</title></head>
        <body>
            <h2>Sign Up</h2>
            <form action="/signup" method="POST">
                <input type="text" name="username" placeholder="Username" required>
                <input type="password" name="password" placeholder="Password" required>
                <button type="submit">Sign Up</button>
            </form>
        </body>
    </html>
    `;
    res.send(pageContent);
});

app.post('/signup', (req, res) => {
    const { username, password } = req.body;
    const hashedPassword = bcrypt.hashSync(password, 10);
    users.push({ username, password: hashedPassword, role: 'user' });
    req.session.username = username;
    sessions[username] = req.session.id; // Track active session
    res.redirect('/');
});

// Create new article
app.get('/post', (req, res) => {
    if (!req.session.username) return res.redirect('/login');
    let pageContent = `
    <html>
        <head><title>Create Article - Google Wiki</title></head>
        <body>
            <h2>Create New Article</h2>
            <form action="/post" method="POST">
                <input type="text" name="title" placeholder="Title" required>
                <textarea name="content" placeholder="Content" required></textarea>
                <button type="submit">Post</button>
            </form>
        </body>
    </html>
    `;
    res.send(pageContent);
});

app.post('/post', (req, res) => {
    const { title, content } = req.body;
    const newArticle = { title, content, comments: [], creator: req.session.username };
    articles.push(newArticle);
    res.redirect('/');
});

// View a specific page/article
app.get('/page/:title', (req, res) => {
    const article = articles.find(a => a.title === req.params.title);
    if (!article) return res.send('<p>Article not found</p><a href="/">Go back</a>');

    let pageContent = `
    <html>
        <head><title>${article.title} - Google Wiki</title></head>
        <body>
            <h1>${article.title}</h1>
            <p>${article.content}</p>
            <h2>Comments</h2>
            ${article.comments.map(comment => `<div class="comment">${comment}</div>`).join('')}
            <form action="/comment/${article.title}" method="POST">
                <input type="text" name="comment" placeholder="Add a comment" required>
                <button type="submit">Post Comment</button>
            </form>
        </body>
    </html>
    `;
    res.send(pageContent);
});

// Add comment to a specific article
app.post('/comment/:title', (req, res) => {
    const article = articles.find(a => a.title === req.params.title);
    if (!article) return res.send('<p>Article not found</p><a href="/">Go back</a>');
    const { comment } = req.body;
    article.comments.push(comment);
    res.redirect(`/page/${article.title}`);
});

// Logout
app.post('/logout', (req, res) => {
    req.session.destroy((err) => {
        if (err) return res.send('Error logging out');
        res.redirect('/');
    });
});

// User profile page
app.get('/users/:username', (req, res) => {
    const user = users.find(u => u.username === req.params.username);
    if (!user) return res.send('<p>User not found</p><a href="/">Go back</a>');
    
    let pageContent = `
    <html>
        <head><title>${user.username} - Profile</title></head>
        <body>
            <h1>${user.username}'s Profile</h1>
            <p>Role: ${user.role}</p>
            <h2>Articles Created</h2>
            ${articles.filter(a => a.creator === user.username).map(article => `<p><a href="/page/${article.title}">${article.title}</a></p>`).join('')}
        </body>
    </html>
    `;
    res.send(pageContent);
});

// Start server
app.listen(3000, () => {
    console.log('Server running on http://localhost:3000');
});
