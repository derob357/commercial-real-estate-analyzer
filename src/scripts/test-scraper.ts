#!/usr/bin/env bun

import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function testDatabase() {
  console.log('🗄️ Testing database connections...');

  try {
    // Test Prisma connection
    const propertyCount = await prisma.property.count();
    console.log(`✅ Database connected. Properties in DB: ${propertyCount}`);

    // Test basic data operations
    console.log('📝 Testing basic operations...');
    
    // Test creating a property
    const testProperty = await prisma.property.create({
      data: {
        address: 'Test Property 123 Main St',
        city: 'Test City',
        state: 'CA',
        zip_code: '90210',
        property_type: 'multifamily',
        units: 20,
        sq_ft: 15000,
        year_built: 2020,
        listing_price: 3000000,
        listing_source: 'test_system'
      }
    });
    console.log(`✅ Test property created with ID: ${testProperty.id}`);

    // Clean up test data
    await prisma.property.delete({
      where: { id: testProperty.id }
    });
    console.log('🗑️ Test property cleaned up');

    console.log('✅ Database tests passed!');

  } catch (error) {
    console.error('❌ Database test failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testDatabase();