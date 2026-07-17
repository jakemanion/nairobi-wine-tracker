import type { ReactNode } from 'react'
import Link from 'next/link'

type InlineToken =
  | { type: 'text'; value: string }
  | { type: 'strong'; value: string }
  | { type: 'em'; value: string }
  | { type: 'link'; href: string; value: string }

function parseInline(text: string): InlineToken[] {
  const tokens: InlineToken[] = []
  const pattern = /(\*\*[^*]+\*\*|\*[^*]+\*|\[([^\]]+)\]\(([^)]+)\))/g
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = pattern.exec(text)) != null) {
    if (match.index > lastIndex) {
      tokens.push({ type: 'text', value: text.slice(lastIndex, match.index) })
    }

    const full = match[0]
    if (full.startsWith('**')) {
      tokens.push({ type: 'strong', value: full.slice(2, -2) })
    } else if (full.startsWith('*')) {
      tokens.push({ type: 'em', value: full.slice(1, -1) })
    } else {
      tokens.push({ type: 'link', value: match[2] ?? '', href: match[3] ?? '#' })
    }
    lastIndex = match.index + full.length
  }

  if (lastIndex < text.length) {
    tokens.push({ type: 'text', value: text.slice(lastIndex) })
  }

  return tokens.length > 0 ? tokens : [{ type: 'text', value: text }]
}

function renderInline(text: string, keyPrefix: string): ReactNode[] {
  return parseInline(text).map((token, index) => {
    const key = `${keyPrefix}-${index}`
    switch (token.type) {
      case 'strong':
        return (
          <strong key={key} style={{ color: '#F5F2EC', fontWeight: 600 }}>
            {token.value}
          </strong>
        )
      case 'em':
        return <em key={key}>{token.value}</em>
      case 'link': {
        const href = token.href
        const external = href.startsWith('http')
        if (external) {
          return (
            <a
              key={key}
              href={href}
              target="_blank"
              rel="noreferrer"
              style={{ color: '#C93048' }}
            >
              {token.value}
            </a>
          )
        }
        return (
          <Link key={key} href={href} style={{ color: '#C93048' }}>
            {token.value}
          </Link>
        )
      }
      default:
        return <span key={key}>{token.value}</span>
    }
  })
}

function renderTable(rows: string[], keyPrefix: string): ReactNode {
  const parsed = rows.map((row) =>
    row
      .trim()
      .replace(/^\|/, '')
      .replace(/\|$/, '')
      .split('|')
      .map((cell) => cell.trim()),
  )
  if (parsed.length < 2) return null

  const header = parsed[0]
  const body = parsed.slice(2) // skip separator row

  return (
    <div key={keyPrefix} className="overflow-x-auto my-4">
      <table className="w-full text-left text-[13px] border-collapse min-w-[20rem]">
        <thead>
          <tr>
            {header.map((cell, index) => (
              <th
                key={`${keyPrefix}-h-${index}`}
                className="px-2 py-2 font-semibold"
                style={{
                  color: '#F5F2EC',
                  borderBottom: '1px solid #3A3848',
                  fontFamily: 'var(--font-dm-sans), sans-serif',
                }}
              >
                {renderInline(cell, `${keyPrefix}-hcell-${index}`)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {body.map((row, rowIndex) => (
            <tr key={`${keyPrefix}-r-${rowIndex}`}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${keyPrefix}-c-${rowIndex}-${cellIndex}`}
                  className="px-2 py-2 align-top"
                  style={{
                    color: '#D0CED4',
                    borderBottom: '1px solid #2A2A34',
                    fontFamily: 'var(--font-dm-sans), sans-serif',
                  }}
                >
                  {renderInline(cell, `${keyPrefix}-ccell-${rowIndex}-${cellIndex}`)}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function LegalMarkdown({ markdown }: { markdown: string }) {
  const lines = markdown.replace(/\r\n/g, '\n').split('\n')
  const nodes: ReactNode[] = []
  let i = 0
  let block = 0

  while (i < lines.length) {
    const line = lines[i]
    const trimmed = line.trim()

    if (!trimmed) {
      i += 1
      continue
    }

    if (trimmed.startsWith('|') && trimmed.endsWith('|')) {
      const tableRows: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('|')) {
        tableRows.push(lines[i])
        i += 1
      }
      nodes.push(renderTable(tableRows, `table-${block++}`))
      continue
    }

    if (trimmed.startsWith('# ')) {
      nodes.push(
        <h1
          key={`h1-${block++}`}
          className="m-0 mb-3 text-2xl font-semibold"
          style={{ color: '#F5F2EC', fontFamily: 'var(--font-playfair), serif' }}
        >
          {renderInline(trimmed.slice(2), `h1i-${block}`)}
        </h1>,
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('## ')) {
      nodes.push(
        <h2
          key={`h2-${block++}`}
          className="m-0 mt-7 mb-2 text-lg font-semibold"
          style={{ color: '#F5F2EC', fontFamily: 'var(--font-playfair), serif' }}
        >
          {renderInline(trimmed.slice(3), `h2i-${block}`)}
        </h2>,
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('### ')) {
      nodes.push(
        <h3
          key={`h3-${block++}`}
          className="m-0 mt-5 mb-2 text-sm font-semibold"
          style={{ color: '#EDE8E0', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {renderInline(trimmed.slice(4), `h3i-${block}`)}
        </h3>,
      )
      i += 1
      continue
    }

    if (trimmed.startsWith('- ')) {
      const items: string[] = []
      while (i < lines.length && lines[i].trim().startsWith('- ')) {
        items.push(lines[i].trim().slice(2))
        i += 1
      }
      nodes.push(
        <ul
          key={`ul-${block++}`}
          className="m-0 mb-3 pl-5 space-y-1.5 text-[13px] leading-relaxed list-disc"
          style={{ color: '#D0CED4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
        >
          {items.map((item, index) => (
            <li key={`li-${block}-${index}`}>{renderInline(item, `uli-${block}-${index}`)}</li>
          ))}
        </ul>,
      )
      continue
    }

    const paragraphLines: string[] = [trimmed]
    i += 1
    while (
      i < lines.length &&
      lines[i].trim() &&
      !lines[i].trim().startsWith('#') &&
      !lines[i].trim().startsWith('- ') &&
      !lines[i].trim().startsWith('|')
    ) {
      paragraphLines.push(lines[i].trim())
      i += 1
    }

    nodes.push(
      <p
        key={`p-${block++}`}
        className="m-0 mb-3 text-[13px] leading-relaxed"
        style={{ color: '#D0CED4', fontFamily: 'var(--font-dm-sans), sans-serif' }}
      >
        {renderInline(paragraphLines.join(' '), `pi-${block}`)}
      </p>,
    )
  }

  return <div className="legal-markdown">{nodes}</div>
}
