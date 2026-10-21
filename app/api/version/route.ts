import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET() {
  return NextResponse.json({
    status: 'ok',
    version: '2026.10.22-v3-imgproxy',
    features: ['same-origin-image-proxy', 'heic-auto-conversion', 'smart-compression'],
    build_time: new Date().toISOString(),
  });
}
