import type { Plugin } from 'unified'

interface AstNode {
  type: string
  value?: string
  children?: AstNode[]
  [key: string]: unknown
}

function createEmphasisRegex() {
  // Matches:
  // 1: ***bold italic***
  // 2: **bold** (allows single * inside, but not **)
  // 3: ~~strikethrough~~
  // 4: *italic* (single * with no adjacent whitespace)
  return /(\*\*\*([^*\n]+(?:\n(?!\n)[^*\n]+)*?)\*\*\*|\*\*((?:[^*\n]|\*(?!\*)|(?:\n(?!\n)))+?)\*\*|~~([^~\n]+(?:\n(?!\n)[^~\n]+)*?)~~|(?<!\*)\*([^*\s\n](?:(?:[^*\n]|\n(?!\n))*?[^*\s\n])?)\*(?!\*))/g
}

function parseTextNode(text: string): AstNode[] | null {
  const regex = createEmphasisRegex()
  if (!regex.test(text)) return null
  regex.lastIndex = 0

  const nodes: AstNode[] = []
  let lastIndex = 0
  let m: RegExpExecArray | null

  while ((m = regex.exec(text)) !== null) {
    if (m.index > lastIndex) {
      nodes.push({ type: 'text', value: text.slice(lastIndex, m.index) })
    }

    if (m[2]) {
      // ***bold italic***
      nodes.push({
        type: 'strong',
        children: [{ type: 'emphasis', children: [{ type: 'text', value: m[2] }] }],
      })
    } else if (m[3]) {
      // **bold**
      nodes.push({
        type: 'strong',
        children: [{ type: 'text', value: m[3] }],
      })
    } else if (m[4]) {
      // ~~strikethrough~~
      nodes.push({
        type: 'delete',
        children: [{ type: 'text', value: m[4] }],
      })
    } else if (m[5]) {
      // *italic*
      nodes.push({
        type: 'emphasis',
        children: [{ type: 'text', value: m[5] }],
      })
    }

    lastIndex = regex.lastIndex
  }

  if (lastIndex < text.length) {
    nodes.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return nodes
}

/**
 * Merges split delimiters across sibling children when inner markdown (e.g. `*italic*`)
 * was already parsed by CommonMark, but outer delimiters (e.g. `**`) were rejected
 * due to CJK trailing punctuation without ASCII whitespace (e.g. `。**此`).
 */
function mergeCrossSiblingDelimiters(children: AstNode[]): void {
  const delimiters = [
    { marker: '***', openType: 'strong', wrapInner: 'emphasis' },
    { marker: '**', openType: 'strong' },
    { marker: '~~', openType: 'delete' },
  ]

  for (const { marker, openType, wrapInner } of delimiters) {
    let i = 0
    while (i < children.length) {
      const child = children[i]
      if (child.type === 'text' && typeof child.value === 'string') {
        const val = child.value
        const openIdx = val.indexOf(marker)
        if (openIdx !== -1) {
          const closeIdx = val.indexOf(marker, openIdx + marker.length)
          // If unclosed within this text node, look for closing marker in subsequent sibling text nodes
          if (closeIdx === -1) {
            let closeSiblingIdx = -1
            let endInSiblingIdx = -1
            for (let j = i + 1; j < children.length; j++) {
              const sib = children[j]
              if (sib.type === 'text' && typeof sib.value === 'string') {
                const sibClose = sib.value.indexOf(marker)
                if (sibClose !== -1) {
                  closeSiblingIdx = j
                  endInSiblingIdx = sibClose
                  break
                }
              }
            }

            if (closeSiblingIdx !== -1) {
              const beforeOpen = val.slice(0, openIdx)
              const insideStart = val.slice(openIdx + marker.length)

              const closingSib = children[closeSiblingIdx]
              const sibVal = typeof closingSib.value === 'string' ? closingSib.value : ''
              const insideEnd = sibVal.slice(0, endInSiblingIdx)
              const afterClose = sibVal.slice(endInSiblingIdx + marker.length)

              const innerChildren: AstNode[] = []
              if (insideStart.length > 0) {
                innerChildren.push({ type: 'text', value: insideStart })
              }
              for (let m = i + 1; m < closeSiblingIdx; m++) {
                innerChildren.push(children[m])
              }
              if (insideEnd.length > 0) {
                innerChildren.push({ type: 'text', value: insideEnd })
              }

              const newWrappedChild: AstNode = wrapInner
                ? {
                    type: openType,
                    children: [{ type: wrapInner, children: innerChildren }],
                  }
                : {
                    type: openType,
                    children: innerChildren,
                  }

              const replacement: AstNode[] = []
              if (beforeOpen.length > 0) {
                replacement.push({ type: 'text', value: beforeOpen })
              }
              replacement.push(newWrappedChild)
              if (afterClose.length > 0) {
                replacement.push({ type: 'text', value: afterClose })
              }

              children.splice(i, closeSiblingIdx - i + 1, ...replacement)
              continue
            }
          }
        }
      }
      i++
    }
  }
}

/**
 * Remark plugin to resolve CommonMark specification emphasis boundary flaws on CJK text.
 *
 * In standard CommonMark (and remark-parse):
 * A closing delimiter run (e.g. `**`) is NOT right-flanking if it is preceded by Unicode
 * punctuation (e.g. `。`, `！`, `？`, `，`, `】`, `》`) and immediately followed by a
 * Unicode letter (such as a CJK character `此`, `這`, etc.) without ASCII whitespace.
 *
 * Because Chinese typography never inserts spaces around punctuation, standard Markdown
 * fails to parse `**重要論斷。**此處...` or `**《易經》**論斷`, leaving literal asterisks `**`.
 *
 * This plugin traverses mdast text nodes and restores authentic strong/emphasis/delete
 * AST nodes without mutating original punctuation or injecting artificial whitespace.
 */
export const remarkCjkFriendly: Plugin<[], AstNode> = () => {
  return (tree: AstNode) => {
    function visit(node: AstNode) {
      if (!node.children || !Array.isArray(node.children)) return

      // First reconcile any outer delimiters that span across inner parsed markdown siblings
      mergeCrossSiblingDelimiters(node.children)

      const newChildren: AstNode[] = []
      for (const child of node.children) {
        if (child.type === 'text' && typeof child.value === 'string') {
          const parsed = parseTextNode(child.value)
          if (parsed) {
            for (const p of parsed) {
              visit(p)
              newChildren.push(p)
            }
            continue
          }
        } else if (child.type !== 'code' && child.type !== 'inlineCode') {
          visit(child)
        }
        newChildren.push(child)
      }
      node.children = newChildren
    }

    visit(tree)
  }
}

export default remarkCjkFriendly
