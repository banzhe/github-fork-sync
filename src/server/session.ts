import { createHash, randomBytes, scrypt, timingSafeEqual } from 'node:crypto'

import {
  deleteCookie,
  getCookie,
  getRequestProtocol,
  setCookie,
} from '@tanstack/solid-start/server'

import { sessionsRepo, settingsRepo } from '~/db/repositories'

function scryptAsync(password: string, salt: Buffer, length: number) {
  return new Promise<Buffer>((resolve, reject) => {
    scrypt(password, salt, length, (err, key) => (err ? reject(err) : resolve(key)))
  })
}

const COOKIE_NAME = 'session'
const SESSION_TTL_MS = 30 * 24 * 60 * 60 * 1000
const PASSWORD_KEY = 'password_hash'

/** 格式: scrypt$<salt hex>$<hash hex> */
async function hashPassword(password: string) {
  const salt = randomBytes(16)
  const hash = await scryptAsync(password, salt, 64)
  return `scrypt$${salt.toString('hex')}$${hash.toString('hex')}`
}

async function verifyPassword(password: string, stored: string) {
  const [algo, saltHex, hashHex] = stored.split('$')
  if (algo !== 'scrypt' || !saltHex || !hashHex) return false
  const expected = Buffer.from(hashHex, 'hex')
  const actual = await scryptAsync(password, Buffer.from(saltHex, 'hex'), expected.length)
  return timingSafeEqual(actual, expected)
}

const hashToken = (token: string) => createHash('sha256').update(token).digest('hex')

const getPasswordHash = () => settingsRepo.get(PASSWORD_KEY)

export function isPasswordSet() {
  return getPasswordHash() !== undefined
}

/** 校验密码. 尚未设置密码时, 本次输入的密码成为初始密码. */
export async function checkPassword(password: string) {
  if (!isPasswordSet()) {
    const hash = await hashPassword(password)
    // 并发的首次登录只有一个能写入, 其余按已写入的密码校验.
    settingsRepo.insertIfAbsent(PASSWORD_KEY, hash)
  }
  return verifyPassword(password, getPasswordHash()!)
}

export function createSession() {
  const token = randomBytes(32).toString('base64url')
  const expiresAt = new Date(Date.now() + SESSION_TTL_MS)
  sessionsRepo.deleteExpired()
  sessionsRepo.insert({ id: hashToken(token), expiresAt })
  setCookie(COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: getRequestProtocol() === 'https',
    path: '/',
    expires: expiresAt,
  })
}

export function isAuthenticated() {
  const token = getCookie(COOKIE_NAME)
  if (!token) return false
  const session = sessionsRepo.find(hashToken(token))
  return session !== undefined && session.expiresAt > new Date()
}

export function destroySession() {
  const token = getCookie(COOKIE_NAME)
  if (token) sessionsRepo.delete(hashToken(token))
  deleteCookie(COOKIE_NAME, { path: '/' })
}
