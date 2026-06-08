'use client';

import React from 'react';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

// Escape HTML to prevent XSS
function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

// Apply inline markdown formatting to a text string, returning HTML
function inlineFormat(text: string): string {
  return text
    // Inline code (must be first to prevent inner matches)
    .replace(/`([^`]+)`/g, '<code class="px-1 py-0.5 rounded bg-zinc-200 dark:bg-zinc-700 text-[13px] font-mono text-rose-600 dark:text-rose-400">$1</code>')
    // Bold + italic
    .replace(/\*\*\*(.+?)\*\*\*/g, '<strong><em>$1</em></strong>')
    // Bold
    .replace(/\*\*(.+?)\*\*/g, '<strong class="font-semibold">$1</strong>')
    // Italic
    .replace(/(?<!\*)\*(?!\*)(.+?)(?<!\*)\*(?!\*)/g, '<em>$1</em>')
    // Strikethrough
    .replace(/~~(.+?)~~/g, '<del class="line-through opacity-60">$1</del>')
    // Links [text](url)
    .replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">$1</a>')
    // Bare URLs
    .replace(/(?<!["(])(https?:\/\/[^\s<>"'`\]]+)/g, '<a href="$1" target="_blank" rel="noopener noreferrer" class="text-indigo-500 hover:text-indigo-400 underline underline-offset-2">$1</a>');
}

// Parse markdown content into React elements
function parseMarkdown(content: string): React.ReactNode[] {
  const lines = content.split('\n');
  const elements: React.ReactNode[] = [];
  let i = 0;
  let key = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Empty line → spacing
    if (line.trim() === '') {
      i++;
      continue;
    }

    // Headings
    const headingMatch = line.match(/^(#{1,6})\s+(.+)$/);
    if (headingMatch) {
      const level = headingMatch[1].length;
      const text = headingMatch[2];
      const sizes = ['text-xl', 'text-lg', 'text-base', 'text-sm', 'text-sm', 'text-xs'];
      const weights = ['font-bold', 'font-bold', 'font-semibold', 'font-semibold', 'font-medium', 'font-medium'];
      elements.push(
        <div
          key={key++}
          className={`${sizes[level - 1]} ${weights[level - 1]} text-zinc-800 dark:text-zinc-100 mt-3 mb-1`}
          dangerouslySetInnerHTML={{ __html: inlineFormat(esc(text)) }}
        />
      );
      i++;
      continue;
    }

    // Horizontal rule
    if (/^(-{3,}|\*{3,}|_{3,})$/.test(line.trim())) {
      elements.push(<hr key={key++} className="my-2 border-zinc-300 dark:border-zinc-600" />);
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith('> ')) {
      const quoteLines: string[] = [];
      while (i < lines.length && lines[i].startsWith('> ')) {
        quoteLines.push(lines[i].slice(2));
        i++;
      }
      elements.push(
        <blockquote
          key={key++}
          className="pl-3 py-1 my-1 border-l-3 border-indigo-400 dark:border-indigo-500 text-zinc-600 dark:text-zinc-400 italic text-[13px]"
          dangerouslySetInnerHTML={{ __html: inlineFormat(esc(quoteLines.join('\n'))) }}
        />
      );
      continue;
    }

    // Unordered list (- or * prefix)
    if (/^[\-\*]\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^[\-\*]\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^[\-\*]\s+/, ''));
        i++;
      }
      elements.push(
        <ul key={key++} className="my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="text-indigo-400 shrink-0 mt-0.5">•</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(esc(item)) }} />
            </li>
          ))}
        </ul>
      );
      continue;
    }

    // Ordered list (1. prefix)
    if (/^\d+\.\s+/.test(line)) {
      const items: string[] = [];
      while (i < lines.length && /^\d+\.\s+/.test(lines[i])) {
        items.push(lines[i].replace(/^\d+\.\s+/, ''));
        i++;
      }
      elements.push(
        <ol key={key++} className="my-1 space-y-0.5">
          {items.map((item, idx) => (
            <li key={idx} className="flex gap-2 text-[13px] leading-relaxed">
              <span className="text-indigo-400 shrink-0 mt-0.5 font-mono text-[11px] min-w-[16px]">{idx + 1}.</span>
              <span dangerouslySetInnerHTML={{ __html: inlineFormat(esc(item)) }} />
            </li>
          ))}
        </ol>
      );
      continue;
    }

    // Table (detect | separator)
    if (line.includes('|') && i + 1 < lines.length && /^[\s|:-]+$/.test(lines[i + 1])) {
      const tableLines: string[] = [];
      while (i < lines.length && lines[i].includes('|')) {
        tableLines.push(lines[i]);
        i++;
      }
      if (tableLines.length >= 2) {
        const headers = tableLines[0].split('|').map((s) => s.trim()).filter(Boolean);
        const rows = tableLines.slice(2).map((r) => r.split('|').map((s) => s.trim()).filter(Boolean));
        elements.push(
          <div key={key++} className="my-2 overflow-x-auto rounded-lg border border-zinc-200 dark:border-zinc-700">
            <table className="w-full text-[13px]">
              <thead>
                <tr className="bg-zinc-100 dark:bg-zinc-800">
                  {headers.map((h, hi) => (
                    <th key={hi} className="px-3 py-1.5 text-left font-medium text-zinc-700 dark:text-zinc-300 border-b border-zinc-200 dark:border-zinc-700" dangerouslySetInnerHTML={{ __html: inlineFormat(esc(h)) }} />
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, ri) => (
                  <tr key={ri} className="border-b border-zinc-100 dark:border-zinc-800 last:border-0">
                    {row.map((cell, ci) => (
                      <td key={ci} className="px-3 py-1.5 text-zinc-600 dark:text-zinc-400" dangerouslySetInnerHTML={{ __html: inlineFormat(esc(cell)) }} />
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        );
        continue;
      }
    }

    // Regular paragraph — collect consecutive non-special lines
    const paraLines: string[] = [];
    while (
      i < lines.length &&
      lines[i].trim() !== '' &&
      !lines[i].match(/^#{1,6}\s/) &&
      !lines[i].match(/^[\-\*]\s+/) &&
      !lines[i].match(/^\d+\.\s+/) &&
      !lines[i].startsWith('> ') &&
      !lines[i].match(/^(-{3,}|\*{3,}|_{3,})$/)
    ) {
      paraLines.push(lines[i]);
      i++;
    }
    if (paraLines.length > 0) {
      elements.push(
        <p
          key={key++}
          className="text-[13px] leading-relaxed my-1"
          dangerouslySetInnerHTML={{ __html: inlineFormat(esc(paraLines.join('\n'))) }}
        />
      );
    }
  }

  return elements;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  const rendered = React.useMemo(() => parseMarkdown(content), [content]);
  return <div className={className}>{rendered}</div>;
}
