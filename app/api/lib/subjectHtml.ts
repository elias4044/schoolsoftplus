import sanitizeHtml from 'sanitize-html';

export function cleanSubjectHtml(value: string): string {
  return sanitizeHtml(value, {
    allowedTags: [
      'p',
      'br',
      'strong',
      'em',
      'b',
      'i',
      'u',
      'ul',
      'ol',
      'li',
      'a',
      'blockquote',
      'h2',
      'h3',
      'table',
      'thead',
      'tbody',
      'tr',
      'th',
      'td',
      'img',
    ],
    allowedAttributes: { a: ['href', 'title'], img: ['src', 'alt', 'width', 'height'] },
    allowedSchemes: ['https', 'http', 'mailto'],
  });
}

export function cleanSubjectContent<T>(value: T): T {
  if (Array.isArray(value)) return value.map(cleanSubjectContent) as T;
  if (!value || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, content]) => [
      key,
      ['description', 'content', 'text', 'teacherComment'].includes(key) &&
      typeof content === 'string'
        ? cleanSubjectHtml(content)
        : cleanSubjectContent(content),
    ])
  ) as T;
}
