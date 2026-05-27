import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const viteConfig = readFileSync('vite.config.ts', 'utf-8')

describe('Vite production base path', () => {
  it('uses relative assets so Electron file URLs can load bundled JS and CSS', () => {
    expect(viteConfig).toContain("base: './'")
  })
})
