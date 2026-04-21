// GET /api/jobs — list recent jobs for dashboard
import { NextRequest, NextResponse } from 'next/server';
import { loadConfig } from '@/lib/config';
import { getJobs } from '@/lib/db';

export async function GET(req: NextRequest) {
  const config = loadConfig();
  const limit = parseInt(req.nextUrl.searchParams.get('limit') || '30');
  const jobs = await getJobs(config, limit);
  return NextResponse.json({ jobs, count: jobs.length });
}
