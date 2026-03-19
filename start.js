// Wrapper around Next.js standalone server.js to extend HTTP timeouts
// Default Node.js headersTimeout (60s) kills long-running LLM requests

const http = require('http')
const originalCreateServer = http.createServer

http.createServer = function(...args) {
  const server = originalCreateServer.apply(this, args)
  server.keepAliveTimeout = 620000    // 620s
  server.headersTimeout = 630000      // 630s (must be > keepAliveTimeout)
  server.requestTimeout = 660000      // 660s
  server.timeout = 660000             // 660s overall socket timeout
  console.log(`> Timeouts extended: keepAlive=620s, headers=630s, request=660s, socket=660s`)
  return server
}

// Now load the original Next.js standalone server
require('./server.js')
