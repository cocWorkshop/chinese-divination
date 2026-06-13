import { masterToolRegistry } from '../src/lib/master/tools'

const defs = masterToolRegistry.toolDefs()
for (const d of defs) {
  console.log('---', d.function.name, '---')
  console.log(JSON.stringify(d.function.parameters, null, 2))
}
