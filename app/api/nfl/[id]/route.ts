import { NextResponse } from 'next/server';
import { getNFLGame } from '@/lib/nfl';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  try {
    const game = await getNFLGame(params.id);

    if (!game) {
      return NextResponse.json(
        { error: 'Game not found' },
        { status: 404 }
      );
    }

    return NextResponse.json(game);
  } catch (error) {
    console.error(`Error in /api/nfl/${params.id}:`, error);
    return NextResponse.json(
      { error: 'Failed to fetch NFL game details' },
      { status: 500 }
    );
  }
}

export const dynamic = 'force-dynamic';
export const revalidate = 10;
