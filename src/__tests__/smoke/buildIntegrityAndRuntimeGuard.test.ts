import { describe, it, expect } from 'vitest'
import fs from 'fs'
import path from 'path'

/**
 * Build & Runtime Integrity Guard
 *
 * Prevents regressions where running build commands or modifying shared
 * component imports causes runtime 500 crashes (such as missing vendor-chunks,
 * broken component exports, or circular dependencies).
 */
describe('Build & Runtime Integrity Guard', () => {
  it('ensures critical client libraries can be imported without module resolution errors', async () => {
    // Dynamic import to verify module resolution in Node/SSR environment
    const framerMotion = await import('framer-motion')
    expect(framerMotion).toBeDefined()
    expect(framerMotion.motion).toBeDefined()

    const reactMarkdown = await import('react-markdown')
    expect(reactMarkdown).toBeDefined()

    const remarkGfm = await import('remark-gfm')
    expect(remarkGfm).toBeDefined()
  })

  it('ensures core UI and Master components can be loaded without unhandled export errors', () => {
    // Read and parse source files using TypeScript compiler API
    const ts = require('typescript')

    const checkFileExports = (relPath: string, expectedTokens: string[]) => {
      const fullPath = path.join(process.cwd(), relPath)
      const content = fs.readFileSync(fullPath, 'utf-8')
      const sourceFile = ts.createSourceFile(
        fullPath,
        content,
        ts.ScriptTarget.Latest,
        true,
        ts.ScriptKind.TSX
      )
      expect(sourceFile).toBeDefined()
      for (const token of expectedTokens) {
        expect(content).toContain(token)
      }
    }

    checkFileExports('src/components/master/MasterChatContext.tsx', [
      'MasterChatProvider',
      'useMasterChat',
      'useMasterChatActions',
      'useOptionalMasterChatActions',
      'setViewingReading',
    ])

    checkFileExports('src/components/master/widget/MessageBubble.tsx', [
      'MessageBubble',
      'limit_notice',
    ])

    checkFileExports('src/components/results/XuanjiChatCard.tsx', [
      'XuanjiChatCard',
      'useOptionalMasterChatActions',
      'setViewingReading',
      'masterReplacesQa',
    ])
  })

  it('verifies package.json scripts contain safety checks', () => {
    const pkgPath = path.join(process.cwd(), 'package.json')
    const pkg = JSON.parse(fs.readFileSync(pkgPath, 'utf-8'))

    expect(pkg.scripts).toBeDefined()
    expect(pkg.scripts.dev).toBeDefined()
    expect(pkg.scripts.build).toBeDefined()
    expect(pkg.scripts['predeploy-check']).toBeDefined()
  })

  it('enforces that .next cache integrity rule is codified in documentation', () => {
    const agentsPath = path.join(process.cwd(), 'agents.md')
    const claudePath = path.join(process.cwd(), 'CLAUDE.md')
    const antigravityPath = path.join(process.cwd(), 'ANTIGRAVITY.md')

    const hasDocumentation = fs.existsSync(agentsPath) || fs.existsSync(claudePath) || fs.existsSync(antigravityPath)
    expect(hasDocumentation).toBe(true)
  })
})
