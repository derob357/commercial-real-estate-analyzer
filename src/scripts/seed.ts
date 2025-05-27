#!/usr/bin/env tsx

import { initializeBackend } from '../lib/init'

async function seed() {
  console.log('Seeding database...')
  
  try {
    await initializeBackend()
    console.log('Database seeded successfully!')
    process.exit(0)
  } catch (error) {
    console.error('Seeding failed:', error)
    process.exit(1)
  }
}

seed()