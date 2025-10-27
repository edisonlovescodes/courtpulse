import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function clearTestGames() {
  try {
    const result = await prisma.testGameSession.deleteMany({})
    console.log(`✅ Deleted ${result.count} test game sessions`)
  } catch (error) {
    console.error('❌ Error clearing test games:', error)
  } finally {
    await prisma.$disconnect()
  }
}

clearTestGames()
