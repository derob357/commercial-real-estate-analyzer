import { PrismaClient } from '@prisma/client'

declare global {
  var __prisma: PrismaClient | undefined
}

const prisma = global.__prisma || new PrismaClient()

if (process.env.NODE_ENV === 'development') {
  global.__prisma = prisma
}

export { prisma }

// Database utility functions
export class DatabaseUtils {
  static async ensureConnection() {
    try {
      await prisma.$queryRaw`SELECT 1`
      return true
    } catch (error) {
      console.error('Database connection failed:', error)
      return false
    }
  }

  static async closeConnection() {
    await prisma.$disconnect()
  }

  static async clearTestData() {
    if (process.env.NODE_ENV === 'test') {
      await prisma.scrapeJob.deleteMany()
      await prisma.taxPayment.deleteMany()
      await prisma.taxAssessment.deleteMany()
      await prisma.underwritingAnalysis.deleteMany()
      await prisma.property.deleteMany()
      await prisma.taxAssessorSource.deleteMany()
      await prisma.zipCodeMapping.deleteMany()
      await prisma.address.deleteMany()
    }
  }
}