/**
 * Mutate-in-place helper for assembling the streaming partial result.
 * Walks `path`, creating intermediate objects/arrays as needed, then
 * applies `transform` to the leaf — the transform receives the existing
 * value (or undefined) and returns the new value. Used both for
 * appending chars to a partial string (`value_chunk`) and for setting
 * a final value (`value_done`).
 *
 * Mutates `root` directly; callers serialize via `JSON.stringify(root)`
 * to feed the renderer. We accept the mutation because path-tagged
 * events arrive at high frequency (1-3 chars per event during a 200-
 * char section) and shallow-cloning the entire tree per char would
 * stall the React reconciler.
 */
export function mutateAtPath(
  root: Record<string, unknown>,
  path: (string | number)[],
  transform: (existing: unknown) => unknown,
): void {
  if (path.length === 0) return
  let cur = root as Record<string | number, unknown>
  for (let i = 0; i < path.length - 1; i++) {
    const key = path[i]
    const nextKey = path[i + 1]
    const wantArray = typeof nextKey === 'number'
    const existing = cur[key]
    if (existing === undefined || existing === null) {
      const fresh = wantArray ? [] : {}
      cur[key] = fresh
      cur = fresh as Record<string | number, unknown>
    } else {
      cur = existing as Record<string | number, unknown>
    }
  }
  const lastKey = path[path.length - 1]
  cur[lastKey] = transform(cur[lastKey])
}
