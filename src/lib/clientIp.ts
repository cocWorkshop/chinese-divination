/**
 * Utility to extract client IP address across API routes and middleware.
 *
 * Security note on X-Forwarded-For:
 * In production behind an edge reverse proxy (e.g. Cloudflare, AWS ALB, Nginx),
 * ensure the edge proxy strips client-supplied X-Forwarded-For headers and only
 * appends the verified connecting IP.
 */
export function getClientIp(req: Request): string | null {
  const forwarded = req.headers.get('x-forwarded-for')
  if (forwarded) {
    const first = forwarded.split(',')[0]?.trim()
    if (first) return first
  }
  const realIp = req.headers.get('x-real-ip')?.trim()
  if (realIp) return realIp
  return null
}
