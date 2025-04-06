// Node.js Forum Software
// File 2/10 - User system, roles, bans, and profiles
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

const crypto = require('crypto');

// Utility: Generate unique ID
const generateId = () => crypto.randomBytes(16).toString('hex');

// Middleware: Check if user is banned by IP or username
const banCheck = (req, res, next) => {
  const ip = req.ipUser;
  const user = req.session?.user || ip;
  if (cache.bans.find(b => b.type === 'ip' && b.value === ip) ||
      cache.bans.find(b => b.type === 'user' && b.value === user)) {
    return res.send(layout('Banned', '<h2>You are banned from this forum.</h2>'));
  }
  next();
};

// Session setup (very basic session, not production-ready)
const sessions = {};

app.use((req, res, next) => {
  let sid = req.headers.cookie?.match(/sid=([a-zA-Z0-9]+)/)?.[1];
  if (!sid || !sessions[sid]) {
    sid = generateId();
    sessions[sid] = { ip: req.ipUser };
    res.setHeader('Set-Cookie', `sid=${sid}`);
  }
  req.session = sessions[sid];
  next();
});

// Registration page
app.get('/signup', (req, res) => {
  res.send(layout('Sign Up', `
    <form method="POST">
      <input name="username" placeholder="Username" required><br>
      <input type="password" name="password" placeholder="Password" required><br>
      <button>Sign Up</button>
    </form>
  `));
});

// Handle sign-up
app.post('/signup', async (req, res) => {
  const { username, password } = req.body;
  if (cache.users.find(u => u.username === username)) {
    return res.send(layout('Sign Up Error', '<p>Username already exists</p>'));
  }
  const newUser = {
    id: generateId(),
    username,
    password,
    role: username === 'admin-kRxZy_kRxZy' ? 'admin' : 'member',
    bio: '',
    badges: [],
    currency: 100,
    followers: [],
  };
  cache.users.push(newUser);
  await saveToJSONBin();
  req.session.user = username;
  res.redirect(`/users/${username}`);
});

// Login page
app.get('/login', (req, res) => {
  res.send(layout('Login', `
    <form method="POST">
      <input name="username" placeholder="Username" required><br>
      <input type="password" name="password" placeholder="Password" required><br>
      <button>Login</button>
    </form>
  `));
});

// Handle login
app.post('/login', (req, res) => {
  const { username, password } = req.body;
  const user = cache.users.find(u => u.username === username && u.password === password);
  if (!user) return res.send(layout('Login Failed', '<p>Invalid credentials</p>'));
  req.session.user = username;
  res.redirect(`/users/${username}`);
});

// Profile page
app.get('/users/:username', (req, res) => {
  const user = cache.users.find(u => u.username === req.params.username);
  if (!user) return res.send(layout('User Not Found', '<p>User does not exist.</p>'));

  const viewer = req.session.user;
  const isOwner = viewer === user.username || cache.users.find(u => u.username === viewer && u.role === 'admin');
  const editForm = isOwner ? `
    <form method="POST" action="/users/${user.username}/bio">
      <textarea name="bio">${user.bio}</textarea>
      <button>Update Bio</button>
    </form>` : '';

  res.send(layout(`${user.username}'s Profile`, `
    <h2>${user.username}</h2>
    <p>Role: ${user.role}</p>
    <p>Bio: ${user.bio}</p>
    <p>Currency: ${user.currency}</p>
    <p>Badges: ${user.badges.join(', ')}</p>
    ${editForm}
  `));
});

// Handle bio update
app.post('/users/:username/bio', async (req, res) => {
  const user = cache.users.find(u => u.username === req.params.username);
  if (!user) return res.send('User not found');
  if (req.session.user !== user.username && req.session.user !== 'admin-kRxZy_kRxZy') {
    return res.send('Not allowed');
  }
  user.bio = req.body.bio;
  await saveToJSONBin();
  res.redirect(`/users/${user.username}`);
});

// Ban user (admin only)
app.post('/ban/user', async (req, res) => {
  if (req.session.user !== 'admin-kRxZy_kRxZy') return res.send('Unauthorized');
  cache.bans.push({ type: 'user', value: req.body.username });
  await saveToJSONBin();
  res.send('User banned');
});

// Ban IP (admin only)
app.post('/ban/ip', async (req, res) => {
  if (req.session.user !== 'admin-kRxZy_kRxZy') return res.send('Unauthorized');
  cache.bans.push({ type: 'ip', value: req.body.ip });
  await saveToJSONBin();
  res.send('IP banned');
});

// Role assignment (admin only)
app.post('/admin/role', async (req, res) => {
  if (req.session.user !== 'admin-kRxZy_kRxZy') return res.send('Unauthorized');
  const user = cache.users.find(u => u.username === req.body.username);
  if (user) user.role = req.body.role;
  await saveToJSONBin();
  res.send('Role updated');
});
