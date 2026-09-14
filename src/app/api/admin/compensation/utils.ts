export function isPseudoError(errorText: string | null | undefined, status?: number | null): boolean {
  if (status === 429) return true
  if (!errorText) return false
  const lower = errorText.toLowerCase()
  return (
    errorText.includes('機緣不足') ||
    errorText.includes('机缘不足') ||
    errorText.includes('額度不足') ||
    errorText.includes('额度不足') ||
    lower.includes('not enough karma') ||
    lower.includes('insufficient credits') ||
    lower.includes('insufficient_credits')
  )
}
