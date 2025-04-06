// core.js
const express = require('express');
const bodyParser = require('body-parser');
const marked = require('marked');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');
const socketIO = require('socket.io');
const dayjs = require('dayjs');
const fetch = require('node-fetch');
const cors = require('cors');
const { JSDOM } = require('jsdom');

// Export everything as one object
module.exports = {
  express,
  bodyParser,
  marked,
  fs,
  path,
  uuidv4,
  socketIO,
  dayjs,
  fetch,
  cors,
  JSDOM,
};
