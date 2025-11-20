import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * GET /api/admin/props?company_id=xxx&experience_id=xxx&sport=nba
 * Get player prop alerts
 */
export async function GET(req: Request) {
    try {
        const url = new URL(req.url)
        const companyId = url.searchParams.get('company_id')
        const experienceId = url.searchParams.get('experience_id') || 'default_experience'
        const sport = url.searchParams.get('sport') || 'nba'

        if (!companyId) {
            return NextResponse.json({ error: 'company_id is required' }, { status: 400 })
        }

        const alerts = await prisma.playerPropAlert.findMany({
            where: {
                companyId,
                experienceId,
                sport,
            },
            orderBy: {
                createdAt: 'desc',
            },
        })

        return NextResponse.json({ alerts })
    } catch (e: any) {
        console.error('Error fetching prop alerts:', e)
        return NextResponse.json(
            { error: e.message || 'Failed to fetch alerts' },
            { status: 500 }
        )
    }
}

/**
 * POST /api/admin/props
 * Create a new player prop alert
 */
export async function POST(req: Request) {
    try {
        const body = await req.json()
        const {
            companyId,
            experienceId = 'default_experience',
            gameId,
            sport = 'nba',
            playerId,
            playerName,
            propType,
            targetValue,
            condition,
            channelId,
        } = body

        if (!companyId || !gameId || !playerId || !propType || !targetValue || !channelId) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
        }

        const alert = await prisma.playerPropAlert.create({
            data: {
                companyId,
                experienceId,
                gameId,
                sport,
                playerId: Number(playerId),
                playerName,
                propType,
                targetValue: Number(targetValue),
                condition,
                channelId,
                status: 'pending',
            },
        })

        return NextResponse.json({ alert })
    } catch (e: any) {
        console.error('Error creating prop alert:', e)
        return NextResponse.json(
            { error: e.message || 'Failed to create alert' },
            { status: 500 }
        )
    }
}

/**
 * DELETE /api/admin/props?id=xxx
 * Delete a player prop alert
 */
export async function DELETE(req: Request) {
    try {
        const url = new URL(req.url)
        const id = url.searchParams.get('id')

        if (!id) {
            return NextResponse.json({ error: 'id is required' }, { status: 400 })
        }

        await prisma.playerPropAlert.delete({
            where: { id: Number(id) },
        })

        return NextResponse.json({ success: true })
    } catch (e: any) {
        console.error('Error deleting prop alert:', e)
        return NextResponse.json(
            { error: e.message || 'Failed to delete alert' },
            { status: 500 }
        )
    }
}
