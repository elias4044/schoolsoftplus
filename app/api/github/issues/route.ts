import { NextRequest, NextResponse } from 'next/server';

import { withValidation } from '@/app/api/lib/routeValidation';

const REPO = 'elias4044/schoolsoftplus';
const BASE = `https://api.github.com/repos/${REPO}/issues`;

export const GET = withValidation(async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const state = searchParams.get('state') ?? 'open'; // open | closed | all
  const labels = searchParams.get('labels') ?? '';
  const page = searchParams.get('page') ?? '1';
  const per = searchParams.get('per_page') ?? '25';

  if (
    !['open', 'closed', 'all'].includes(state) ||
    !/^\d+$/.test(page) ||
    Number(page) < 1 ||
    !Number.isSafeInteger(Number(page)) ||
    !/^\d+$/.test(per) ||
    Number(per) < 1 ||
    Number(per) > 100 ||
    labels.length > 200
  )
    return NextResponse.json({ error: 'Invalid issue query.' }, { status: 400 });

  const url = new URL(BASE);
  url.searchParams.set('state', state);
  url.searchParams.set('page', page);
  url.searchParams.set('per_page', per);
  url.searchParams.set('sort', 'created');
  url.searchParams.set('direction', 'desc');
  if (labels) url.searchParams.set('labels', labels);

  const headers: Record<string, string> = {
    Accept: 'application/vnd.github+json',
    'X-GitHub-Api-Version': '2022-11-28',
    'User-Agent': 'schoolsoftplus-app',
  };
  if (process.env.GITHUB_TOKEN) {
    headers['Authorization'] = `Bearer ${process.env.GITHUB_TOKEN}`;
  }

  const upstream = await fetch(url.toString(), {
    signal: AbortSignal.timeout(8_000),
    headers,
    next: { revalidate: 60 },
  });

  if (!upstream.ok) {
    return NextResponse.json(
      { error: 'GitHub API error', status: upstream.status },
      { status: upstream.status }
    );
  }

  const data = await upstream.json();

  // Strip pull requests — GH issues endpoint includes PRs
  const issues = (Array.isArray(data) ? data : []).filter(
    (issue: { pull_request?: unknown }) => !issue.pull_request
  );

  const linkHeader = upstream.headers.get('Link') ?? '';
  const hasNext = linkHeader.includes('rel="next"');

  return NextResponse.json({ issues, hasNext });
});
