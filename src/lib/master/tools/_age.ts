/**
 * Compute Western age (周歲) from a YYYY-MM-DD birthDate. Returns null when
 * the date is missing, malformed, or in the future.
 *
 * Surfaced from `get_user_profile` and `list_family_members` so the master
 * never has to do date math on its own — date arithmetic from a chat LLM
 * is reliably wrong by a year on either side of the birthday.
 *
 * 虛歲 (Chinese age) is intentionally NOT computed here: its definition
 * varies by region (+1 from birth vs. +1 at 春節), and the master can derive
 * it from `age` + birth month when it actually matters.
 */
export function computeAge(birthDate: string | null): number | null {
  if (!birthDate) return null
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(birthDate)
  if (!m) return null
  const y = Number(m[1])
  const mo = Number(m[2])
  const d = Number(m[3])
  const birth = new Date(y, mo - 1, d)
  if (Number.isNaN(birth.getTime())) return null
  // Reject calendar-rolled dates like "2026-02-30" (parses as March 2 / 3).
  if (
    birth.getFullYear() !== y ||
    birth.getMonth() !== mo - 1 ||
    birth.getDate() !== d
  ) {
    return null
  }
  const today = new Date()
  let age = today.getFullYear() - birth.getFullYear()
  const monthDiff = today.getMonth() - birth.getMonth()
  if (monthDiff < 0 || (monthDiff === 0 && today.getDate() < birth.getDate())) {
    age--
  }
  return age >= 0 ? age : null
}
