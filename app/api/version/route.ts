import { NextResponse } from 'next/server';

import { withValidation } from '@/app/api/lib/routeValidation';
import { APP_VERSION } from '@/app/api/lib/version';

export const GET = withValidation(async function GET() {
  return NextResponse.json({ version: APP_VERSION });
});
