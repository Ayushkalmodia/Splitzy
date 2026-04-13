import { describe, it, expect } from 'vitest'
import { parseOAuthHash, userFromAccessTokenPayload, resolveOAuthFragment } from './oauthParse.js'

function fakeJwtPayload(payload) {
  const body = btoa(JSON.stringify(payload))
    .replace(/\+/g, '-')
    .replace(/\//g, '_')
    .replace(/=+$/, '')
  return `header.${body}.sig`
}

describe('parseOAuthHash', () => {
  it('reads access_token and provider from URL hash', () => {
    const h = '#access_token=abc&provider=google'
    expect(parseOAuthHash(h)).toEqual({ access_token: 'abc', provider: 'google' })
  })
})

describe('userFromAccessTokenPayload', () => {
  it('maps JWT payload to user shape', () => {
    const token = fakeJwtPayload({
      id: 'u1',
      email: 'o@example.com',
      name: 'OAuth User',
      role: 'member',
      authTypes: ['google', 'local']
    })
    expect(userFromAccessTokenPayload(token)).toEqual({
      id: 'u1',
      email: 'o@example.com',
      name: 'OAuth User',
      role: 'member',
      authTypes: ['google', 'local']
    })
  })
})

describe('resolveOAuthFragment', () => {
  it('returns ok with tokens for valid fragment (redirect flow)', () => {
    const token = fakeJwtPayload({
      id: 'u1',
      email: 'ok@example.com',
      name: 'Ok',
      role: 'member'
    })
    const hash = `#access_token=${encodeURIComponent(token)}&provider=google`
    const r = resolveOAuthFragment(hash)
    expect(r.ok).toBe(true)
    expect(r.access_token).toBe(token)
    expect(r.user.email).toBe('ok@example.com')
    expect(r.provider).toBe('google')
  })

  it('fails when token missing', () => {
    expect(resolveOAuthFragment('#provider=google').ok).toBe(false)
  })
})
