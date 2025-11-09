import { describe, it, expect } from 'vitest';
import { renderMarkdown } from '../markdown';

describe('renderMarkdown', () => {
  it('should render plain text', () => {
    const result = renderMarkdown('Hello world');
    expect(result).toBe('Hello world');
  });

  it('should render bold text', () => {
    const result = renderMarkdown('**bold** text');
    expect(result).toBe('<strong>bold</strong> text');
  });

  it('should render italic text', () => {
    const result = renderMarkdown('*italic* text');
    expect(result).toBe('<em>italic</em> text');
  });

  it('should render inline code', () => {
    const result = renderMarkdown('Use `code` here');
    expect(result).toBe('Use <code>code</code> here');
  });

  it('should render code blocks', () => {
    const result = renderMarkdown('```\nconst x = 1;\n```');
    expect(result).toContain('<pre><code>');
    expect(result).toContain('const x = 1;');
    expect(result).toContain('</code></pre>');
  });

  it('should render code blocks with language', () => {
    const result = renderMarkdown('```javascript\nconst x = 1;\n```');
    // The current implementation doesn't parse language, just renders code blocks
    expect(result).toContain('<pre><code>');
    expect(result).toContain('const x = 1;');
  });

  it('should render links', () => {
    const result = renderMarkdown('[Link](https://example.com)');
    expect(result).toBe('<a href="https://example.com" target="_blank" rel="noopener noreferrer">Link</a>');
  });

  it('should handle multiple markdown elements', () => {
    const result = renderMarkdown('**Bold** and *italic* with `code`');
    expect(result).toContain('<strong>Bold</strong>');
    expect(result).toContain('<em>italic</em>');
    expect(result).toContain('<code>code</code>');
  });

  it('should escape HTML in plain text', () => {
    const result = renderMarkdown('<script>alert("xss")</script>');
    expect(result).not.toContain('<script>');
    expect(result).toContain('&lt;script&gt;');
  });

  it('should handle empty string', () => {
    const result = renderMarkdown('');
    expect(result).toBe('');
  });

  it('should handle newlines', () => {
    const result = renderMarkdown('Line 1\nLine 2');
    expect(result).toContain('<br>');
  });
});

