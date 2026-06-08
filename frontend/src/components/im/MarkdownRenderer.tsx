'use client';

import React from 'react';
import ReactMarkdown from 'react-markdown';
import rehypeHighlight from 'rehype-highlight';

interface MarkdownRendererProps {
  content: string;
  className?: string;
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={className}>
      <ReactMarkdown
        rehypePlugins={[rehypeHighlight]}
        components={{
          h1: ({ children }) => <h1 className="text-xl font-bold text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h1>,
          h2: ({ children }) => <h2 className="text-lg font-bold text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h2>,
          h3: ({ children }) => <h3 className="text-base font-semibold text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h3>,
          h4: ({ children }) => <h4 className="text-sm font-semibold text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h4>,
          h5: ({ children }) => <h5 className="text-sm font-medium text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h5>,
          h6: ({ children }) => <h6 className="text-xs font-medium text-minimal-text dark:text-minimal-dark-text mt-3 mb-1">{children}</h6>,
          p: ({ children }) => <p className="text-[13px] leading-relaxed my-1">{children}</p>,
          a: ({ href, children }) => (
            <a href={href} target="_blank" rel="noopener noreferrer" className="text-minimal-accent hover:text-minimal-accent-hover underline underline-offset-2">{children}</a>
          ),
          strong: ({ children }) => <strong className="font-semibold">{children}</strong>,
          em: ({ children }) => <em>{children}</em>,
          del: ({ children }) => <del className="line-through opacity-60">{children}</del>,
          code: ({ className, children, ...props }) => {
            const isInline = !className;
            if (isInline) {
              return <code className="px-1 py-0.5 rounded bg-minimal-bg dark:bg-minimal-dark-bg text-[13px] font-mono text-minimal-error" {...props}>{children}</code>;
            }
            return <code className={className} {...props}>{children}</code>;
          },
          pre: ({ children }) => (
            <div className="my-2 rounded-lg overflow-hidden border border-minimal-border dark:border-minimal-dark-border">
              <pre className="p-3 bg-minimal-bg dark:bg-minimal-dark-bg overflow-x-auto text-[13px] font-mono whitespace-pre">{children}</pre>
            </div>
          ),
          blockquote: ({ children }) => (
            <blockquote className="pl-3 py-1 my-1 border-l-3 border-minimal-accent text-minimal-secondary italic text-[13px]">{children}</blockquote>
          ),
          ul: ({ children }) => <ul className="my-1 space-y-0.5 list-disc pl-5">{children}</ul>,
          ol: ({ children }) => <ol className="my-1 space-y-0.5 list-decimal pl-5">{children}</ol>,
          li: ({ children }) => <li className="text-[13px] leading-relaxed">{children}</li>,
          hr: () => <hr className="my-2 border-minimal-border" />,
          table: ({ children }) => (
            <div className="my-2 overflow-x-auto rounded-minimal border border-minimal-border">
              <table className="w-full text-[13px]">{children}</table>
            </div>
          ),
          thead: ({ children }) => <thead className="bg-minimal-bg">{children}</thead>,
          th: ({ children }) => <th className="px-3 py-1.5 text-left font-medium text-minimal-text border-b border-minimal-border">{children}</th>,
          td: ({ children }) => <td className="px-3 py-1.5 text-minimal-secondary border-b border-minimal-border last:border-0">{children}</td>,
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  );
}
