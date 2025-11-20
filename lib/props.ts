
import { prisma } from './prisma'
import { createMessage } from './whop-api'
import { PlayerStats } from './ball'

type PropType = 'points' | 'assists' | 'rebounds' | 'threes'

const PROP_THRESHOLDS: Record<PropType, number> = {
    points: 3, // Alert when within 3 points
    assists: 2, // Alert when within 2 assists
    rebounds: 2, // Alert when within 2 rebounds
    threes: 1, // Alert when within 1 three
}

const PROP_NAMES: Record<PropType, string> = {
    points: 'Points',
    assists: 'Assists',
    rebounds: 'Rebounds',
    threes: '3-Pointers',
}

export async function checkPlayerProps(
    gameId: string,
    sport: string,
    players: PlayerStats[]
) {
    if (sport !== 'nba') return

    try {
        // Get all pending alerts for this game
        const alerts = await prisma.playerPropAlert.findMany({
            where: {
                gameId,
                sport,
                status: { in: ['pending', 'approaching'] },
            },
        })

        if (alerts.length === 0) return

        for (const alert of alerts) {
            const player = players.find((p) => p.personId === alert.playerId)
            if (!player) continue

            const currentValue = getPlayerStat(player, alert.propType as PropType)
            const target = alert.targetValue
            const threshold = PROP_THRESHOLDS[alert.propType as PropType] || 2

            // Check for HIT
            if (currentValue >= target) {
                if (alert.status !== 'hit') {
                    await sendPropAlert(alert, currentValue, 'hit')
                    await prisma.playerPropAlert.update({
                        where: { id: alert.id },
                        data: { status: 'hit' },
                    })
                }
                continue
            }

            // Check for APPROACHING
            // Only for OVER bets
            if (alert.condition === 'over' && alert.status === 'pending') {
                if (currentValue >= target - threshold) {
                    await sendPropAlert(alert, currentValue, 'approaching')
                    await prisma.playerPropAlert.update({
                        where: { id: alert.id },
                        data: { status: 'approaching' },
                    })
                }
            }
        }
    } catch (e) {
        console.error('Error checking player props:', e)
    }
}

function getPlayerStat(player: PlayerStats, propType: PropType): number {
    switch (propType) {
        case 'points':
            return player.statistics.points
        case 'assists':
            return player.statistics.assists
        case 'rebounds':
            return player.statistics.reboundsTotal
        case 'threes':
            return player.statistics.threePointersMade
        default:
            return 0
    }
}

async function sendPropAlert(
    alert: any,
    currentValue: number,
    type: 'hit' | 'approaching'
) {
    const propName = PROP_NAMES[alert.propType as PropType] || alert.propType
    const diff = Math.abs(alert.targetValue - currentValue)

    let message = ''
    if (type === 'hit') {
        message = `✅ CASH IT! ${alert.playerName} has hit the OVER on ${alert.targetValue} ${propName}! (${currentValue})`
    } else {
        // Approaching
        const needed = alert.targetValue - currentValue
        // "🚨 LeBron James has 24 points. He is 2 points away from hitting the OVER (25.5)."
        message = `🚨 ${alert.playerName} has ${currentValue} ${propName}. He is ${needed} away from hitting the OVER (${alert.targetValue}).`
    }

    try {
        await createMessage(alert.channelId, message)
    } catch (e) {
        console.error('Error sending prop alert:', e)
    }
}
