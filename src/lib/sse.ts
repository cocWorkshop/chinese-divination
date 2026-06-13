/**
 * Minimal SSE plumbing shared by the streaming routes (divination, master).
 * Wire format only — event vocabulary stays with each route.
 */

export interface SSEController {
  /** Send one `data: <json>\n\n` event. Safe after close (silently dropped). */
  send: (data: unknown) => void
  /** Send a `: heartbeat` comment (keeps proxies from closing idle streams). */
  heartbeat: () => void
  /** Close the stream. Safe to call twice. */
  close: () => void
}

/**
 * Build a text/event-stream Response. `start` receives a safe controller —
 * all enqueue/close calls are guarded against the client having disconnected.
 */
export function sseResponse(start: (sse: SSEController) => void | Promise<void>): Response {
  const encoder = new TextEncoder()
  const stream = new ReadableStream({
    async start(controller) {
      const sse: SSEController = {
        send: (data) => {
          try { controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`)) } catch { /* closed */ }
        },
        heartbeat: () => {
          try { controller.enqueue(encoder.encode(': heartbeat\n\n')) } catch { /* closed */ }
        },
        close: () => {
          try { controller.close() } catch { /* already closed */ }
        },
      }
      await start(sse)
    },
  })
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    },
  })
}
