/**
 * CircuitLens Safe Markdown Parser & AST Generator
 *
 * Provides deterministic, zero-dependency Markdown parsing into structured AST nodes
 * and React elements without JSX syntax, enabling both Node.js test execution
 * and browser rendering without dangerouslySetInnerHTML.
 */

import React from 'react';

export type InlineNode =
  | { type: 'text'; text: string }
  | { type: 'code'; code: string }
  | { type: 'bold'; children: InlineNode[] }
  | { type: 'italic'; children: InlineNode[] }
  | { type: 'strikethrough'; children: InlineNode[] };

export interface MarkdownBlock {
  type: 'paragraph' | 'heading' | 'blockquote' | 'ul' | 'ol' | 'codeblock';
  level?: number;
  language?: string;
  lines: string[];
}

/**
 * Tokenizes inline text into strongly-typed AST nodes.
 * Guarantees that code, bold, and italic formatting are parsed safely.
 */
export function parseInline(text: string): InlineNode[] {
  if (!text) return [];

  const nodes: InlineNode[] = [];
  let index = 0;

  while (index < text.length) {
    // 1. Inline code: `...`
    if (text[index] === '`') {
      const closing = text.indexOf('`', index + 1);
      if (closing !== -1) {
        const codeContent = text.slice(index + 1, closing);
        nodes.push({ type: 'code', code: codeContent });
        index = closing + 1;
        continue;
      }
    }

    // 2. Bold italic: ***...*** or ___...___
    if (text.startsWith('***', index) || text.startsWith('___', index)) {
      const delimiter = text.slice(index, index + 3);
      const closing = text.indexOf(delimiter, index + 3);
      if (closing !== -1) {
        const inner = text.slice(index + 3, closing);
        nodes.push({
          type: 'bold',
          children: [{ type: 'italic', children: parseInline(inner) }],
        });
        index = closing + 3;
        continue;
      }
    }

    // 3. Bold: **...** or __...__
    if (text.startsWith('**', index) || text.startsWith('__', index)) {
      const delimiter = text.slice(index, index + 2);
      const closing = text.indexOf(delimiter, index + 2);
      if (closing !== -1) {
        const inner = text.slice(index + 2, closing);
        nodes.push({
          type: 'bold',
          children: parseInline(inner),
        });
        index = closing + 2;
        continue;
      }
    }

    // 4. Strikethrough: ~~...~~
    if (text.startsWith('~~', index)) {
      const closing = text.indexOf('~~', index + 2);
      if (closing !== -1) {
        const inner = text.slice(index + 2, closing);
        nodes.push({
          type: 'strikethrough',
          children: parseInline(inner),
        });
        index = closing + 2;
        continue;
      }
    }

    // 5. Italic: *...* or _..._
    if (text[index] === '*' || text[index] === '_') {
      const delimiter = text[index];
      const closing = text.indexOf(delimiter, index + 1);
      if (closing !== -1 && closing > index + 1) {
        const inner = text.slice(index + 1, closing);
        if (!inner.includes('\n')) {
          nodes.push({
            type: 'italic',
            children: parseInline(inner),
          });
          index = closing + 1;
          continue;
        }
      }
    }

    // 6. Plain text accumulation until next formatting delimiter
    let nextDelim = text.length;
    for (let d = index + 1; d < text.length; d++) {
      const char = text[d];
      if (
        char === '`' ||
        char === '*' ||
        char === '_' ||
        (char === '~' && text[d + 1] === '~')
      ) {
        nextDelim = d;
        break;
      }
    }

    const plain = text.slice(index, nextDelim);
    if (nodes.length > 0 && nodes[nodes.length - 1].type === 'text') {
      (nodes[nodes.length - 1] as { type: 'text'; text: string }).text += plain;
    } else {
      nodes.push({ type: 'text', text: plain });
    }
    index = nextDelim;
  }

  return nodes;
}

/**
 * Renders inline AST nodes into safe React elements using React.createElement.
 */
export function renderInlineNodes(
  nodes: InlineNode[],
  keyPrefix: string = 'inline'
): React.ReactNode[] {
  return nodes.map((node, i) => {
    const key = `${keyPrefix}-${i}`;
    switch (node.type) {
      case 'text':
        return node.text;
      case 'code':
        return React.createElement(
          'code',
          { key, className: 'msg-inline-code' },
          node.code
        );
      case 'bold':
        return React.createElement(
          'strong',
          { key },
          renderInlineNodes(node.children, `${key}-b`)
        );
      case 'italic':
        return React.createElement(
          'em',
          { key },
          renderInlineNodes(node.children, `${key}-i`)
        );
      case 'strikethrough':
        return React.createElement(
          'del',
          { key },
          renderInlineNodes(node.children, `${key}-s`)
        );
    }
  });
}

/**
 * Splits multiline Markdown content into structural block nodes.
 */
export function parseMarkdownBlocks(content: string): MarkdownBlock[] {
  if (!content) return [];

  const lines = content.replace(/\r\n/g, '\n').split('\n');
  const blocks: MarkdownBlock[] = [];
  let currentBlock: MarkdownBlock | null = null;
  let inCodeBlock = false;
  let codeBlockLang = '';
  let codeBlockLines: string[] = [];

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Fenced code block delimiter
    if (line.trim().startsWith('```')) {
      if (inCodeBlock) {
        blocks.push({
          type: 'codeblock',
          language: codeBlockLang,
          lines: codeBlockLines,
        });
        inCodeBlock = false;
        codeBlockLang = '';
        codeBlockLines = [];
      } else {
        if (currentBlock) {
          blocks.push(currentBlock);
          currentBlock = null;
        }
        inCodeBlock = true;
        codeBlockLang = line.trim().slice(3).trim();
        codeBlockLines = [];
      }
      continue;
    }

    if (inCodeBlock) {
      codeBlockLines.push(line);
      continue;
    }

    // Blank line terminates active paragraph or list
    if (line.trim() === '') {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      continue;
    }

    // Headings: # to ######
    const headingMatch = line.match(/^(#{1,6})\s+(.*)$/);
    if (headingMatch) {
      if (currentBlock) {
        blocks.push(currentBlock);
        currentBlock = null;
      }
      blocks.push({
        type: 'heading',
        level: headingMatch[1].length,
        lines: [headingMatch[2]],
      });
      continue;
    }

    // Blockquote: > text
    if (line.startsWith('> ') || line === '>') {
      const quoteText = line.replace(/^>\s?/, '');
      if (currentBlock && currentBlock.type === 'blockquote') {
        currentBlock.lines.push(quoteText);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'blockquote', lines: [quoteText] };
      }
      continue;
    }

    // Unordered list: - item, * item, + item
    const ulMatch = line.match(/^(\s*)[-*+]\s+(.*)$/);
    if (ulMatch) {
      const itemText = ulMatch[2];
      if (currentBlock && currentBlock.type === 'ul') {
        currentBlock.lines.push(itemText);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'ul', lines: [itemText] };
      }
      continue;
    }

    // Ordered list: \d+. item
    const olMatch = line.match(/^(\s*)\d+\.\s+(.*)$/);
    if (olMatch) {
      const itemText = olMatch[2];
      if (currentBlock && currentBlock.type === 'ol') {
        currentBlock.lines.push(itemText);
      } else {
        if (currentBlock) blocks.push(currentBlock);
        currentBlock = { type: 'ol', lines: [itemText] };
      }
      continue;
    }

    // Paragraph accumulation
    if (currentBlock && currentBlock.type === 'paragraph') {
      currentBlock.lines.push(line);
    } else {
      if (currentBlock) blocks.push(currentBlock);
      currentBlock = { type: 'paragraph', lines: [line] };
    }
  }

  if (inCodeBlock) {
    blocks.push({
      type: 'codeblock',
      language: codeBlockLang,
      lines: codeBlockLines,
    });
  } else if (currentBlock) {
    blocks.push(currentBlock);
  }

  return blocks;
}
