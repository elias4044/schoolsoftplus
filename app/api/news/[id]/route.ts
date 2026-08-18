import { NextRequest, NextResponse } from 'next/server';
import sanitizeHtml from 'sanitize-html';

import { createSchoolsoftClient, requireSession } from '@/app/api/lib/schoolsoft';
import { handleApiError } from '@/app/api/lib/apiError';

interface RouteContext {
  params: Promise<{ id: string }>;
}

interface Attachment {
  fileId: number;
  name: string;
  type: string;
}

interface News {
  id: number;
  title: string;
  description?: string;
  strippedDescription?: string;
  attachments?: Attachment[];

  [key: string]: unknown;
}

interface Attachment {
  fileId: number;
  name: string;
  type: string;
}

/**
 * Converts a limited set of TinyMCE inline styles into
 * Tailwind-friendly classes.
 *
 * We intentionally DO NOT preserve arbitrary CSS.
 */
function stylesToClasses(style?: string): string[] {
  if (!style) return [];

  const classes = new Set<string>();

  const styles = style
    .split(';')
    .map((part) => part.trim())
    .filter(Boolean);

  for (const declaration of styles) {
    const colonIndex = declaration.indexOf(':');

    if (colonIndex === -1) continue;

    const property = declaration.slice(0, colonIndex).trim().toLowerCase();

    const value = declaration
      .slice(colonIndex + 1)
      .trim()
      .toLowerCase();

    switch (property) {
      /*
       * Text decoration
       */

      case 'text-decoration':
        if (value.includes('underline')) {
          classes.add('underline');
        }

        if (value.includes('line-through')) {
          classes.add('line-through');
        }

        break;

      case 'text-decoration-line':
        if (value.includes('underline')) {
          classes.add('underline');
        }

        if (value.includes('line-through')) {
          classes.add('line-through');
        }

        break;

      /*
       * Font
       */

      case 'font-weight':
        if (value === 'bold' || value === 'bolder' || Number(value) >= 600) {
          classes.add('font-bold');
        }

        break;

      case 'font-style':
        if (value === 'italic' || value === 'oblique') {
          classes.add('italic');
        }

        break;

      case 'text-transform':
        if (value === 'uppercase') {
          classes.add('uppercase');
        }

        if (value === 'lowercase') {
          classes.add('lowercase');
        }

        if (value === 'capitalize') {
          classes.add('capitalize');
        }

        break;

      /*
       * Alignment
       */

      case 'text-align':
        switch (value) {
          case 'left':
            classes.add('text-left');
            break;

          case 'center':
            classes.add('text-center');
            break;

          case 'right':
            classes.add('text-right');
            break;

          case 'justify':
            classes.add('text-justify');
            break;
        }

        break;

      /*
       * Vertical alignment
       */

      case 'vertical-align':
        switch (value) {
          case 'middle':
            classes.add('align-middle');
            break;

          case 'top':
            classes.add('align-top');
            break;

          case 'bottom':
            classes.add('align-bottom');
            break;
        }

        break;

      /*
       * White-space
       */

      case 'white-space':
        if (value === 'nowrap') {
          classes.add('whitespace-nowrap');
        }

        break;
    }
  }

  return [...classes];
}

/**
 * Converts SchoolSoft's pseudo-HTML:
 *
 * [p]Hello[/p]
 * [span style="..."]Hello[/span]
 * [ul][li]Item[/li][/ul]
 * [img src="..." /]
 *
 * into real HTML.
 */
function normalizeSchoolsoftMarkup(content: string): string {
  return (
    content
      // SchoolSoft sometimes escapes quotes inside the string.
      .replace(/\\"/g, '"')

      /*
       * Block elements
       */

      .replace(/\[p(\s[^\]]*)?\]/gi, '<p$1>')
      .replace(/\[\/p\]/gi, '</p>')

      .replace(/\[div(\s[^\]]*)?\]/gi, '<div$1>')
      .replace(/\[\/div\]/gi, '</div>')

      /*
       * Lists
       */

      .replace(/\[ul\]/gi, '<ul>')
      .replace(/\[\/ul\]/gi, '</ul>')

      .replace(/\[ol\]/gi, '<ol>')
      .replace(/\[\/ol\]/gi, '</ol>')

      .replace(/\[li\]/gi, '<li>')
      .replace(/\[\/li\]/gi, '</li>')

      /*
       * Inline formatting
       */

      .replace(/\[strong\]/gi, '<strong>')
      .replace(/\[\/strong\]/gi, '</strong>')

      .replace(/\[b\]/gi, '<b>')
      .replace(/\[\/b\]/gi, '</b>')

      .replace(/\[em\]/gi, '<em>')
      .replace(/\[\/em\]/gi, '</em>')

      .replace(/\[i\]/gi, '<i>')
      .replace(/\[\/i\]/gi, '</i>')

      /*
       * Span.
       *
       * We intentionally keep the style attribute here temporarily.
       * sanitize-html will process it through transformTags below.
       */

      .replace(/\[span(\s[^\]]*)?\]/gi, '<span$1>')
      .replace(/\[\/span\]/gi, '</span>')

      /*
       * Links
       */

      .replace(/\[a(\s[^\]]*)?\]/gi, '<a$1>')
      .replace(/\[\/a\]/gi, '</a>')

      /*
       * Line breaks
       */

      .replace(/\[br\s*\/?\]/gi, '<br>')

      /*
       * Images
       */

      .replace(/\[img(\s[^\]]*)?\/?\]/gi, '<img$1>')
  );
}

/**
 * Sanitizes a SchoolSoft news description and rewrites
 * SchoolSoft image URLs to our own API.
 */
function sanitizeNewsDescription(description: string, attachments: Attachment[]): string {
  const byFileId = new Map(
    attachments
      .filter((attachment) => attachment.type.toUpperCase() === 'IMAGE')
      .map((attachment) => [attachment.fileId, attachment])
  );

  const normalized = normalizeSchoolsoftMarkup(description);

  return sanitizeHtml(normalized, {
    allowedTags: [
      /*
       * Blocks
       */
      'p',
      'div',
      'br',

      /*
       * Formatting
       */
      'span',
      'strong',
      'b',
      'em',
      'i',

      /*
       * Lists
       */
      'ul',
      'ol',
      'li',

      /*
       * Links
       */
      'a',

      /*
       * Images
       */
      'img',
    ],

    allowedAttributes: {
      p: ['class'],
      div: ['class'],
      span: ['class'],
      a: ['href', 'title'],
      img: ['src', 'alt', 'width', 'height'],
    },

    allowedClasses: {
      p: ['tinymce-p'],

      /*
       * Formatting classes
       */
      span: [
        'underline',
        'line-through',
        'font-bold',
        'italic',

        'uppercase',
        'lowercase',
        'capitalize',

        'text-left',
        'text-center',
        'text-right',
        'text-justify',

        'align-middle',
        'align-top',
        'align-bottom',

        'whitespace-nowrap',
      ],

      div: [],
    },

    allowedSchemes: ['http', 'https', 'mailto'],

    transformTags: {
      /*
       * Convert TinyMCE's inline CSS into safe classes.
       *
       * Example:
       *
       * <span style="text-decoration: underline;">
       *
       * becomes:
       *
       * <span class="underline">
       */
      span: (_tagName, attribs) => {
        const classes = stylesToClasses(attribs.style);

        return {
          tagName: 'span',

          attribs:
            classes.length > 0
              ? {
                  class: classes.join(' '),
                }
              : ({} as Record<string, string>),
        };
      },

      /*
       * SchoolSoft images
       */
      img: (_tagName, attribs) => {
        const originalSrc = attribs.src;

        if (!originalSrc) {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        let parsedUrl: URL;

        try {
          parsedUrl = new URL(originalSrc, 'https://schoolsoft.invalid/');
        } catch {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        /*
         * Only accept SchoolSoft's image endpoint.
         */
        if (parsedUrl.pathname !== '/showFileImage.jsp') {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        const fileIdString = parsedUrl.searchParams.get('fileid');

        if (!fileIdString) {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        const fileId = Number(fileIdString);

        if (!Number.isInteger(fileId)) {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        /*
         * Only allow images that are actually attached
         * to this news article.
         */
        const attachment = byFileId.get(fileId);

        if (!attachment) {
          return {
            tagName: 'img',
            attribs: {},
          };
        }

        const proxyUrl = new URL('/api/file', 'https://frontend.invalid');

        proxyUrl.searchParams.set('id', String(fileId));

        proxyUrl.searchParams.set('type', attachment.type.toLowerCase());

        proxyUrl.searchParams.set('responseType', 'redirect');

        return {
          tagName: 'img',

          attribs: {
            src: `${proxyUrl.pathname}${proxyUrl.search}`,

            alt: attribs.alt || attachment.name,

            ...(attribs.width
              ? {
                  width: attribs.width,
                }
              : {}),

            ...(attribs.height
              ? {
                  height: attribs.height,
                }
              : {}),
          },
        };
      },

      /*
       * Links
       */
      a: (_tagName, attribs) => {
        const href = attribs.href;

        if (!href) {
          return {
            tagName: 'a',
            attribs: {},
          };
        }

        try {
          const url = new URL(href, 'https://schoolsoft.invalid/');

          /*
           * Don't allow javascript:, data:, etc.
           */
          if (!['http:', 'https:', 'mailto:'].includes(url.protocol)) {
            return {
              tagName: 'a',
              attribs: {},
            };
          }

          return {
            tagName: 'a',

            attribs: {
              href,

              ...(attribs.title
                ? {
                    title: attribs.title,
                  }
                : {}),
            },
          };
        } catch {
          return {
            tagName: 'a',
            attribs: {},
          };
        }
      },
    },
  });
}

// -- GET /api/news/:id ---------------------------------------------------------
export async function GET(req: NextRequest, context: RouteContext) {
  const { searchParams } = new URL(req.url);
  const orgId = searchParams.get('orgid') ?? 18;

  const { id } = await context.params;

  if (!id) {
    return NextResponse.json(
      {
        success: false,
        error: 'Missing ID',
      },
      { status: 400 }
    );
  }

  const sess = await requireSession(req);

  if (!sess) {
    return NextResponse.json(
      {
        success: false,
        error: 'Not authenticated.',
      },
      { status: 401 }
    );
  }

  if (!sess.token) {
    return NextResponse.json(
      {
        success: false,
        error:
          'This route requires AuthV2 (https://developer.ssp.elias4044.com/docs/auth-v2). The legacy route is available at /api/news/legacy',
      },
      { status: 401 }
    );
  }

  if (!sess.user?.userId) {
    return NextResponse.json(
      {
        success: false,
        error: 'UserId was not found.',
      },
      { status: 400 }
    );
  }

  const api = createSchoolsoftClient(sess.school);

  try {
    const res = await api.get<News>(
      `/eva/api/v2/student/${sess.user.userId}/schools/${orgId}/news/${id}`,
      {
        headers: {
          Authorization: `Bearer ${sess.token}`,
        },
      }
    );

    const news = res.data;
    const attachments = news.attachments ?? [];

    const descriptionHtml = news.description
      ? sanitizeNewsDescription(news.description, attachments)
      : '';

    return NextResponse.json({
      ...news,

      description: descriptionHtml,
      descriptionHtml,
    });
  } catch (err) {
    return handleApiError(err, 'news');
  }
}
