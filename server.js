// Preload script: patches fs with graceful-fs to handle EMFILE errors.
// Usage: NODE_OPTIONS="--require ./server.js" npx next dev --port=3001
const realFs = require('fs');
const gracefulFs = require('graceful-fs');
gracefulFs.gracefulify(realFs);
