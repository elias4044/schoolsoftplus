import type { Metadata } from 'next';
import { headers } from 'next/headers';
import { notFound } from 'next/navigation';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

interface Props {
  params: Promise<{ token: string }>;
}

async function fetchNote(token: string) {
  const h = headers();
  const host = (await h).get('host');
  const protocol = host?.startsWith('localhost') ? 'http' : 'https';
  const url = `${protocol}://${host}/api/notes/shared/${token}`;
  const res = await fetch(url, { cache: 'no-store' });
  if (!res.ok) return null;
  const json = await res.json();
  return json.note ?? null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { token } = await params;
  const note = await fetchNote(token);
  return { title: note ? `${note.title} — SchoolSoft+` : 'Note not found' };
}

export default async function SharedNotePage({ params }: Props) {
  const { token } = await params;
  const note = await fetchNote(token);
  if (!note) notFound();

  const date = new Date(note.updatedAt).toLocaleDateString('en-SE', {
    day: 'numeric',
    month: 'long',
    year: 'numeric',
  });

  return (
    <div
      className="min-h-screen"
      style={{ background: 'var(--background)', color: 'var(--foreground)' }}
    >
      <div className="mx-auto max-w-2xl px-6 py-12">
        {/* Header */}
        <div className="mb-8">
          <div
            className="mb-4 inline-flex items-center gap-1.5 rounded-full px-2 py-0.5 text-xs"
            style={{
              background: 'oklch(0.65 0.22 278 / 15%)',
              color: 'oklch(0.75 0.15 278)',
              border: '1px solid oklch(0.65 0.22 278 / 25%)',
            }}
          >
            <svg
              className="h-2.5 w-2.5"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
            >
              <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
              <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
            </svg>
            Shared note
          </div>
          <h1 className="text-3xl font-bold tracking-tight">{note.title}</h1>
          <p className="text-muted-foreground mt-2 text-sm">Last updated {date}</p>
        </div>

        {/* Content */}
        <div className="prose prose-invert prose-sm max-w-none" style={{ lineHeight: 1.75 }}>
          <ReactMarkdown remarkPlugins={[remarkGfm]}>
            {note.content || '*This note has no content.*'}
          </ReactMarkdown>
        </div>

        {/* Footer */}
        <div
          className="text-muted-foreground mt-16 flex items-center gap-2 border-t pt-6 text-xs"
          style={{ borderColor: 'oklch(1 0 0 / 8%)' }}
        >
          <span>Shared via</span>
          <span className="font-semibold" style={{ color: 'oklch(0.75 0.15 278)' }}>
            SchoolSoft+
          </span>
        </div>
      </div>
    </div>
  );
}
