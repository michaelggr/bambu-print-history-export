import { describe, expect, it } from 'vitest'
import { readFileSync } from 'node:fs'

const appSource = readFileSync('src/App.tsx', 'utf-8')

describe('Electron router compatibility', () => {
  it('uses HashRouter so file URLs do not render a blank page', () => {
    expect(appSource).toContain('HashRouter')
    expect(appSource).not.toContain('BrowserRouter')
  })
})
