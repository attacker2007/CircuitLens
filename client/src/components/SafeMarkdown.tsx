/**
 * CircuitLens Safe Markdown Renderer Component
 *
 * Safely parses and renders Markdown formatting into standard React elements
 * without dangerouslySetInnerHTML, eliminating XSS vectors.
 */

import React from 'react';
import {
  parseMarkdownBlocks,
  parseInline,
  renderInlineNodes,
  type MarkdownBlock,
  type InlineNode,
} from '../utils/markdownParser.ts';

export type { MarkdownBlock, InlineNode };
export { parseMarkdownBlocks, parseInline, renderInlineNodes };

export interface SafeMarkdownProps {
  content: string;
  className?: string;
}

/**
 * SafeMarkdown Component
 * Renders parsed Markdown as safe, accessible React DOM elements.
 */
export const SafeMarkdown: React.FC<SafeMarkdownProps> = ({ content, className = '' }) => {
  const blocks = parseMarkdownBlocks(content);

  if (blocks.length === 0) {
    return null;
  }

  return (
    <div className={`safe-markdown ${className}`.trim()}>
      {blocks.map((block, bIdx) => {
        const key = `blk-${bIdx}`;

        switch (block.type) {
          case 'codeblock':
            return (
              <pre key={key} className="msg-code-block" tabIndex={0}>
                <code data-language={block.language || undefined}>
                  {block.lines.join('\n')}
                </code>
              </pre>
            );

          case 'heading': {
            const level = block.level || 3;
            const HeadingTag =
              level === 1 || level === 2 ? 'h3' : level === 3 ? 'h4' : 'h5';
            return (
              <HeadingTag key={key} className={`msg-heading level-${level}`}>
                {renderInlineNodes(parseInline(block.lines.join(' ')), `${key}-h`)}
              </HeadingTag>
            );
          }

          case 'blockquote':
            return (
              <blockquote key={key} className="msg-quote">
                {renderInlineNodes(parseInline(block.lines.join(' ')), `${key}-q`)}
              </blockquote>
            );

          case 'ul':
            return (
              <ul key={key} className="msg-list">
                {block.lines.map((item, iIdx) => (
                  <li key={`${key}-li-${iIdx}`}>
                    {renderInlineNodes(parseInline(item), `${key}-li-${iIdx}`)}
                  </li>
                ))}
              </ul>
            );

          case 'ol':
            return (
              <ol key={key} className="msg-ordered-list">
                {block.lines.map((item, iIdx) => (
                  <li key={`${key}-oli-${iIdx}`}>
                    {renderInlineNodes(parseInline(item), `${key}-oli-${iIdx}`)}
                  </li>
                ))}
              </ol>
            );

          case 'paragraph':
          default:
            return (
              <p key={key} className="msg-para">
                {renderInlineNodes(parseInline(block.lines.join(' ')), `${key}-p`)}
              </p>
            );
        }
      })}
    </div>
  );
};
