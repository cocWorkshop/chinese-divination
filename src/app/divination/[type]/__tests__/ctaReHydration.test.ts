/**
 * Regression lock for the repeat-CTA navigation fix: a Master CTA to the SAME
 * /divination/[type] the user is already viewing a result on must re-seed the
 * form. Two pure pieces guarantee that chain:
 *   1. withCtaNonce() forces the URL query to change on every CTA click.
 *   2. shouldHydrateFromQuery() re-applies hydration on every distinct query
 *      (not just once).
 * If either reverts, the form goes empty / the page appears not to navigate.
 */
import { describe, it, expect } from 'vitest'
import { withCtaNonce } from '@/lib/master/ctaNav'
import { shouldHydrateFromQuery } from '../hooks/queryHydration'

describe('withCtaNonce', () => {
  it('adds a _cta nonce param using the right separator', () => {
    expect(withCtaNonce('/divination/ziwei?birthDate=1990-01-01')).toMatch(/[?&]_cta=\d+$/)
    expect(withCtaNonce('/divination/ziwei?birthDate=1990-01-01')).toContain('&_cta=')
    expect(withCtaNonce('/divination/qimen')).toContain('?_cta=')
  })

  it('changes the query string vs. the input (so same-route push is not a no-op)', () => {
    const url = '/divination/ziwei?birthDate=1990-01-01&gender=male'
    const out = withCtaNonce(url)
    expect(out).not.toEqual(url)
    expect(new URL(out, 'http://x').search).not.toEqual(new URL(url, 'http://x').search)
  })

  it('does not introduce _cta as a hydratable field name collision', () => {
    // _cta must not look like any real form key the hydration whitelist reads.
    expect(withCtaNonce('/divination/bazi')).not.toMatch(/birthDate|gender|question|readingDateTime/)
  })
})

describe('shouldHydrateFromQuery', () => {
  it('hydrates on first non-empty query (last applied is empty)', () => {
    expect(shouldHydrateFromQuery('', 'birthDate=1990-01-01')).toBe(true)
  })

  it('RE-hydrates when the query changes (the repeat-CTA case)', () => {
    expect(shouldHydrateFromQuery('birthDate=1990-01-01&_cta=100', 'birthDate=1990-01-01&_cta=200')).toBe(true)
  })

  it('does NOT re-hydrate when the query is unchanged (avoids clobbering edits)', () => {
    expect(shouldHydrateFromQuery('birthDate=1990-01-01&_cta=100', 'birthDate=1990-01-01&_cta=100')).toBe(false)
  })

  it('does NOT hydrate when there are no params (draft restore owns that path)', () => {
    expect(shouldHydrateFromQuery('', '')).toBe(false)
    expect(shouldHydrateFromQuery('birthDate=x&_cta=1', '')).toBe(false)
  })
})
