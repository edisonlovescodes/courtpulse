import { NextResponse } from 'next/server';
import { getTodaysNFLGames } from '@/lib/nfl';

export async function GET() {
  try {
    const games = await getTodaysNFLGames();
    return NextResponse.json(games, {
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate, max-age=0',
        Pragma: 'no-cache',
        Expires: '0',
      },
    });
  } catch (error) {
    console.error('Error in /api/nfl/today:', error);
    return NextResponse.json(
      { error: 'Failed to fetch NFL games' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 10;
