// Compile tool registry schemas via tsx and print them out so we can see
// what gets sent to OpenRouter.
import { register } from 'node:module'
register('tsx/esm', import.meta.url)
const { masterToolRegistry } = await import('../../src/lib/master/tools/index.ts')
const defs = masterToolRegistry.toolDefs()
for (const d of defs) {
  console.log('---', d.function.name, '---')
  console.log(JSON.stringify(d.function.parameters, null, 2))
}
