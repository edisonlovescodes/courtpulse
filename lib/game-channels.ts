/**
 * Game Channels - Automatic game embeds with banners
 * Inspired by Pluto Discord bot game channel creation
 */

import { prisma } from './prisma'
import { createMessage } from './whop-api'
import type { NBAGame } from './ball'
import type { NBAOdds } from './espn'

type GameChannelData = {
    game: NBAGame
    odds?: NBAOdds
    companyId: string
    experienceId: string
    sport: string
}

/**
 * Create and post a game channel embed with banner
 */
export async function postGameChannel(
    channelId: string,
    data: GameChannelData
): Promise<void> {
    const { game, odds, companyId, experienceId, sport } = data

    try {
        // Check if we already posted for this game
        const existing = await prisma.gameChannel.findUnique({
            where: {
                companyId_experienceId_gameId_sport: {
                    companyId,
                    experienceId,
                    gameId: game.gameId,
                    sport,
                },
            },
        })

        if (existing) {
            console.log('[Game Channels] Already posted for game:', game.gameId)
            return
        }

        // Format team records
        const homeRecord = formatRecord(game.homeTeam.wins, game.homeTeam.losses)
        const awayRecord = formatRecord(game.awayTeam.wins, game.awayTeam.losses)

        // Generate banner (Note: This would use the generate_image tool in actual implementation)
        // For now, we'll skip banner generation and just post the embed
        console.log('[Game Channels] Would generate banner for:', {
            home: game.homeTeam.teamName,
            away: game.awayTeam.teamName,
        })

        // Create the embed message
        const embed = createGameEmbed({
            homeTeam: `${game.homeTeam.teamCity} ${game.homeTeam.teamName}`,
            awayTeam: `${game.awayTeam.teamCity} ${game.awayTeam.teamName}`,
            homeNickname: game.homeTeam.teamName,
            awayNickname: game.awayTeam.teamName,
            homeRecord,
            awayRecord,
            odds,
            gameStatus: game.gameStatusText,
        })

        // Post to Whop channel
        const message = await createMessage(channelId, embed)

        // Save to database
        await prisma.gameChannel.create({
            data: {
                companyId,
                experienceId,
                gameId: game.gameId,
                sport,
                channelId,
                messageId: message.id,
                homeTeam: game.homeTeam.teamName,
                awayTeam: game.awayTeam.teamName,
                homeRecord,
                awayRecord,
                gameStatus: 'live',
            },
        })

        console.log('[Game Channels] Posted game embed:', game.gameId)
    } catch (error) {
        console.error('[Game Channels] Error posting game:', error)
        throw error
    }
}

/**
 * Update an existing game channel embed with new score/status
 */
export async function updateGameChannel(
    data: GameChannelData
): Promise<void> {
    const { game, companyId, experienceId, sport } = data

    try {
        const existing = await prisma.gameChannel.findUnique({
            where: {
                companyId_experienceId_gameId_sport: {
                    companyId,
                    experienceId,
                    gameId: game.gameId,
                    sport,
                },
            },
        })

        if (!existing) {
            console.log('[Game Channels] No existing embed to update for:', game.gameId)
            return
        }

        // Determine game status
        let gameStatus = 'live'
        if (game.gameStatus === 3) {
            gameStatus = 'final'
        } else if (game.gameStatus === 1) {
            gameStatus = 'scheduled'
        }

        // Update database record
        await prisma.gameChannel.update({
            where: { id: existing.id },
            data: {
                gameStatus,
                updatedAt: new Date(),
            },
        })

        console.log('[Game Channels] Updated game status:', game.gameId, gameStatus)
    } catch (error) {
        console.error('[Game Channels] Error updating game:', error)
    }
}

/**
 * Format game embed message
 */
function createGameEmbed(data: {
    homeTeam: string
    awayTeam: string
    homeNickname: string
    awayNickname: string
    homeRecord: string
    awayRecord: string
    odds?: NBAOdds
    gameStatus: string
}): string {
    const {
        homeTeam,
        awayTeam,
        homeNickname,
        awayNickname,
        homeRecord,
        awayRecord,
        odds,
        gameStatus,
    } = data

    const lines: string[] = [
        `🏀 **${awayNickname} @ ${homeNickname}**`,
        '',
        '📊 **Team Records**',
        `${awayNickname}: ${awayRecord}`,
        `${homeNickname}: ${homeRecord}`,
        '',
    ]

    if (odds && (odds.spread || odds.overUnder)) {
        lines.push('💰 **Betting Odds**')
        if (odds.spread) {
            lines.push(`Spread: ${homeNickname} ${odds.spread}`)
        }
        if (odds.overUnder) {
            lines.push(`Over/Under: ${odds.overUnder}`)
        }
        if (odds.moneyline) {
            lines.push(
                `Moneyline: ${awayNickname} ${odds.moneyline.away} / ${homeNickname} ${odds.moneyline.home}`
            )
        }
        lines.push('')
    }

    lines.push(`⏰ **Status**: ${gameStatus}`)
    lines.push('')
    lines.push('_Follow this channel for live updates_')

    return lines.join('\n')
}

/**
 * Format team record (wins-losses)
 */
function formatRecord(wins: number, losses: number): string {
    return `${wins}-${losses}`
}

/**
 * Generate matchup banner using AI image generation
 * Note: In actual implementation, this would use the generate_image tool
 */
export async function generateGameBanner(
    homeTeam: string,
    awayTeam: string,
    homeRecord: string,
    awayRecord: string
): Promise<string | null> {
    // Placeholder for actual implementation
    // In real implementation, call generate_image tool with a prompt like:
    // `NBA game matchup banner: ${awayTeam} (${awayRecord}) vs ${homeTeam} (${homeRecord}), 
    //  professional sports graphics style, dark background, bold typography`

    console.log('[Game Channels] Banner generation placeholder:', {
        homeTeam,
        awayTeam,
        homeRecord,
        awayRecord,
    })

    return null
}
