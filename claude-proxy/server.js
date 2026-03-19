const http = require('http')
const { exec } = require('child_process')
const { writeFileSync, unlinkSync } = require('fs')
const { tmpdir } = require('os')
const { join } = require('path')

const PORT = 8095
const CLAUDE_PATH = process.env.CLAUDE_PATH || 'claude'

const server = http.createServer((req, res) => {
  if (req.method === 'POST' && req.url === '/chat') {
    let body = ''
    req.on('data', chunk => { body += chunk })
    req.on('end', () => {
      try {
        const { messages, max_tokens } = JSON.parse(body)

        // Build prompt from messages
        let systemPrompt = ''
        let userMessages = []
        for (const msg of messages) {
          if (msg.role === 'system') systemPrompt = msg.content
          else userMessages.push(`${msg.role}: ${msg.content}`)
        }

        const fullPrompt = systemPrompt
          ? `${systemPrompt}\n\n${userMessages.join('\n\n')}`
          : userMessages.join('\n\n')

        // Write prompt to temp file to avoid shell escaping issues
        const tmpFile = join(tmpdir(), `claude-prompt-${Date.now()}.txt`)
        writeFileSync(tmpFile, fullPrompt, 'utf8')

        const startTime = Date.now()
        const cmd = `cat "${tmpFile}" | ${CLAUDE_PATH} -p - --output-format json --max-turns 1 2>/dev/null`

        exec(cmd, { timeout: 120000, maxBuffer: 10 * 1024 * 1024, env: process.env }, (error, stdout, stderr) => {
          // Clean up temp file
          try { unlinkSync(tmpFile) } catch {}

          const latencyMs = Date.now() - startTime

          if (error && !stdout) {
            console.error(`Claude CLI error: ${error.message}`)
            res.writeHead(502, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({ error: `Claude CLI error: ${error.message.slice(0, 200)}` }))
            return
          }

          try {
            const parsed = JSON.parse(stdout.trim())
            const content = parsed.result || ''
            const usage = parsed.usage || {}

            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              choices: [{ message: { content } }],
              usage: {
                prompt_tokens: usage.input_tokens || 0,
                completion_tokens: usage.output_tokens || 0,
                total_tokens: (usage.input_tokens || 0) + (usage.output_tokens || 0),
              },
              model: Object.keys(parsed.modelUsage || {})[0] || 'claude',
              latencyMs,
              cost_usd: parsed.total_cost_usd || 0,
            }))
          } catch {
            // Plain text fallback
            res.writeHead(200, { 'Content-Type': 'application/json' })
            res.end(JSON.stringify({
              choices: [{ message: { content: stdout.trim() } }],
              usage: { prompt_tokens: 0, completion_tokens: 0, total_tokens: 0 },
              latencyMs,
            }))
          }
        })
      } catch (parseErr) {
        res.writeHead(400, { 'Content-Type': 'application/json' })
        res.end(JSON.stringify({ error: 'Invalid JSON body' }))
      }
    })
  } else if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' })
    res.end(JSON.stringify({ status: 'ok', service: 'claude-proxy' }))
  } else {
    res.writeHead(404)
    res.end('Not found')
  }
})

server.listen(PORT, '127.0.0.1', () => {
  console.log(`Claude CLI proxy listening on http://127.0.0.1:${PORT}`)
})
