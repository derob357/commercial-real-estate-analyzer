import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedInstitutionalSources() {
  console.log('Seeding institutional data sources...');

  try {
    // CBRE Configuration
    await prisma.institutionalSource.upsert({
      where: { name: 'cbre' },
      update: {},
      create: {
        name: 'cbre',
        display_name: 'CBRE',
        base_url: 'https://www.cbre.com',
        properties_url: 'https://www.cbre.com/properties',
        research_url: 'https://www.cbre.com/insights',
        transactions_url: 'https://www.cbre.com/insights/transaction-data',
        market_data_url: 'https://www.cbre.com/insights/market-outlook',
        requires_javascript: true,
        rate_limit_per_minute: 15,
        request_delay_ms: 4000,
        timeout_ms: 30000,
        requires_auth: false,
        selectors: JSON.stringify({
          properties: {
            container: '.property-item, .listing-item, .property-card',
            address: '.address, .property-address, .listing-address',
            price: '.price, .asking-price, .list-price',
            cap_rate: '.cap-rate, .capitalization-rate',
            property_type: '.property-type, .asset-type',
            units: '.units, .unit-count',
            sqft: '.sqft, .square-feet, .sf',
            year_built: '.year-built, .built',
            agent: '.agent-name, .broker-name',
            description: '.description, .property-description'
          },
          research: {
            container: '.research-item, .report-item, .publication-item',
            title: '.title, .report-title, .research-title',
            summary: '.summary, .excerpt, .description',
            date: '.date, .published-date, .pub-date',
            type: '.type, .category, .report-type',
            market: '.market, .region, .geography',
            download_link: 'a[href*=".pdf"]'
          },
          transactions: {
            container: '.transaction-item, .sale-item, .closed-deal',
            address: '.address, .property-address',
            price: '.sale-price, .transaction-price',
            date: '.sale-date, .closed-date',
            cap_rate: '.cap-rate, .capitalization-rate',
            buyer: '.buyer, .purchaser',
            seller: '.seller, .vendor'
          }
        }),
        field_mappings: JSON.stringify({
          property_type_mappings: {
            'Apartment': 'multifamily',
            'Office Building': 'office',
            'Retail': 'retail',
            'Industrial': 'industrial',
            'Hotel': 'hospitality'
          },
          price_multipliers: {
            'Million': 1000000,
            'M': 1000000,
            'K': 1000,
            'Thousand': 1000
          }
        }),
        user_agents: JSON.stringify([
          'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36'
        ]),
        is_active: true,
        robots_txt_compliant: true
      }
    });

    // Colliers Configuration
    await prisma.institutionalSource.upsert({
      where: { name: 'colliers' },
      update: {},
      create: {
        name: 'colliers',
        display_name: 'Colliers',
        base_url: 'https://www.colliers.com',
        properties_url: 'https://www.colliers.com/listings',
        research_url: 'https://www.colliers.com/insights',
        transactions_url: 'https://www.colliers.com/insights/transaction-data',
        market_data_url: 'https://www.colliers.com/insights/market-data',
        requires_javascript: true,
        rate_limit_per_minute: 12,
        request_delay_ms: 5000,
        timeout_ms: 30000,
        requires_auth: false,
        selectors: JSON.stringify({
          properties: {
            container: '.listing-card, .property-listing, .search-result',
            address: '.property-address, .listing-address',
            price: '.asking-price, .price, .listing-price',
            cap_rate: '.cap-rate, .yield',
            property_type: '.property-type, .asset-class',
            units: '.unit-count, .units',
            sqft: '.floor-area, .sqft',
            year_built: '.year-built, .construction-year',
            agent: '.listing-agent, .contact-name',
            description: '.property-description, .listing-description'
          },
          research: {
            container: '.insight-card, .research-card, .report-item',
            title: '.insight-title, .report-title',
            summary: '.insight-summary, .report-summary',
            date: '.publication-date, .date',
            type: '.insight-type, .report-category',
            market: '.market-focus, .geographic-focus',
            download_link: '.download-link, a[href*=".pdf"]'
          }
        }),
        field_mappings: JSON.stringify({
          property_type_mappings: {
            'Multi-Family': 'multifamily',
            'Office': 'office',
            'Retail': 'retail',
            'Industrial': 'industrial',
            'Hospitality': 'hospitality'
          }
        }),
        is_active: true,
        robots_txt_compliant: true
      }
    });

    // JLL Configuration
    await prisma.institutionalSource.upsert({
      where: { name: 'jll' },
      update: {},
      create: {
        name: 'jll',
        display_name: 'JLL',
        base_url: 'https://www.jll.com/en-us',
        properties_url: 'https://www.jll.com/en-us/properties',
        research_url: 'https://www.jll.com/en-us/trends-and-insights',
        transactions_url: 'https://www.jll.com/en-us/trends-and-insights/market-data',
        market_data_url: 'https://www.jll.com/en-us/trends-and-insights/research',
        requires_javascript: true,
        rate_limit_per_minute: 10,
        request_delay_ms: 6000,
        timeout_ms: 30000,
        requires_auth: false,
        selectors: JSON.stringify({
          properties: {
            container: '.property-card, .listing-tile, .search-card',
            address: '.property-address, .card-address',
            price: '.price, .asking-price',
            cap_rate: '.cap-rate, .yield-rate',
            property_type: '.property-type, .asset-type',
            units: '.unit-count, .number-of-units',
            sqft: '.building-size, .total-area',
            year_built: '.year-built, .construction-date',
            description: '.property-summary, .description'
          },
          research: {
            container: '.insight-tile, .research-tile, .content-card',
            title: '.card-title, .insight-title',
            summary: '.card-description, .summary',
            date: '.publish-date, .content-date',
            type: '.content-type, .category',
            market: '.geography, .market-focus'
          }
        }),
        field_mappings: JSON.stringify({
          property_type_mappings: {
            'Multifamily': 'multifamily',
            'Office': 'office',
            'Retail': 'retail',
            'Industrial & Logistics': 'industrial',
            'Hotels': 'hospitality'
          }
        }),
        is_active: true,
        robots_txt_compliant: true
      }
    });

    // Cushman & Wakefield Configuration
    await prisma.institutionalSource.upsert({
      where: { name: 'cushman_wakefield' },
      update: {},
      create: {
        name: 'cushman_wakefield',
        display_name: 'Cushman & Wakefield',
        base_url: 'https://www.cushmanwakefield.com/en/united-states',
        properties_url: 'https://www.cushmanwakefield.com/en/united-states/properties',
        research_url: 'https://www.cushmanwakefield.com/en/united-states/insights',
        transactions_url: 'https://www.cushmanwakefield.com/en/united-states/insights/transaction-activity',
        market_data_url: 'https://www.cushmanwakefield.com/en/united-states/insights/market-data',
        requires_javascript: true,
        rate_limit_per_minute: 8,
        request_delay_ms: 7500,
        timeout_ms: 30000,
        requires_auth: false,
        selectors: JSON.stringify({
          properties: {
            container: '.property-item, .listing-card',
            address: '.property-address, .address',
            price: '.asking-price, .price',
            cap_rate: '.cap-rate',
            property_type: '.property-type',
            units: '.units',
            sqft: '.area, .sqft',
            year_built: '.year-built',
            description: '.description'
          },
          research: {
            container: '.insight-card, .report-card',
            title: '.card-title, .report-title',
            summary: '.card-summary, .excerpt',
            date: '.publish-date, .date',
            type: '.report-type, .content-type',
            market: '.market, .region'
          }
        }),
        field_mappings: JSON.stringify({
          property_type_mappings: {
            'Apartment': 'multifamily',
            'Office': 'office',
            'Retail': 'retail',
            'Industrial': 'industrial',
            'Hotel': 'hospitality'
          }
        }),
        is_active: true,
        robots_txt_compliant: true
      }
    });

    console.log('✅ Successfully seeded institutional data sources');

    // Create sample scraping jobs for testing
    console.log('Creating sample scraping jobs...');

    const sources = ['cbre', 'colliers', 'jll', 'cushman_wakefield'];
    const jobTypes = ['properties', 'research', 'transactions', 'market_data'];

    for (const source of sources) {
      for (const jobType of jobTypes) {
        await prisma.institutionalScrapeJob.create({
          data: {
            source,
            job_type: jobType,
            priority: 3,
            status: 'pending',
            search_params: JSON.stringify({
              zipCode: '90210', // Sample zip code
              propertyType: 'multifamily'
            })
          }
        });
      }
    }

    console.log('✅ Successfully created sample scraping jobs');

    // Create data quality report entries
    console.log('Creating initial data quality reports...');

    const reportDate = new Date();
    const periodStart = new Date(Date.now() - 24 * 60 * 60 * 1000);

    for (const source of sources) {
      for (const dataType of ['properties', 'research', 'transactions', 'market_data']) {
        await prisma.dataQualityReport.create({
          data: {
            source,
            data_type: dataType,
            total_records: 0,
            valid_records: 0,
            invalid_records: 0,
            duplicate_records: 0,
            missing_required_fields: 0,
            completeness_score: 0,
            report_date: reportDate,
            report_period_start: periodStart,
            report_period_end: reportDate
          }
        });
      }
    }

    console.log('✅ Successfully created initial data quality reports');

  } catch (error) {
    console.error('❌ Error seeding institutional sources:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

async function seedSampleInstitutionalData() {
  console.log('Seeding sample institutional data...');

  try {
    // Sample institutional properties
    const sampleProperties = [
      {
        source: 'cbre',
        property_id: 'cbre_sample_001',
        address: '123 Commercial Ave',
        city: 'Los Angeles',
        state: 'CA',
        zip_code: '90210',
        property_type: 'multifamily',
        property_subtype: 'garden_style',
        units: 150,
        sq_ft: 120000,
        year_built: 2015,
        listing_price: 25000000,
        price_per_unit: 166667,
        price_per_sqft: 208,
        cap_rate: 0.055,
        noi: 1375000,
        listing_agent: 'John Smith',
        listing_firm: 'CBRE',
        market_area: 'West LA',
        status: 'active',
        data_confidence: 0.85,
        last_verified: new Date()
      },
      {
        source: 'colliers',
        property_id: 'colliers_sample_001',
        address: '456 Office Blvd',
        city: 'Dallas',
        state: 'TX',
        zip_code: '75201',
        property_type: 'office',
        property_subtype: 'high_rise',
        sq_ft: 200000,
        year_built: 2018,
        listing_price: 40000000,
        price_per_sqft: 200,
        cap_rate: 0.062,
        noi: 2480000,
        listing_agent: 'Jane Doe',
        listing_firm: 'Colliers',
        market_area: 'Downtown Dallas',
        status: 'active',
        data_confidence: 0.90,
        last_verified: new Date()
      }
    ];

    for (const property of sampleProperties) {
      await prisma.institutionalProperty.create({
        data: property
      });
    }

    // Sample research reports
    const sampleReports = [
      {
        source: 'cbre',
        title: 'Q4 2024 Multifamily Market Outlook',
        report_type: 'market_outlook',
        market_area: 'United States',
        property_type: 'multifamily',
        summary: 'Multifamily markets showed resilience in Q4 2024 with cap rates stabilizing around 5.5% nationally.',
        key_findings: JSON.stringify([
          'Cap rates averaged 5.5% nationally',
          'Rent growth slowed to 3.2% YoY',
          'Transaction volume increased 15% from Q3'
        ]),
        publication_date: new Date('2024-12-01'),
        author: 'CBRE Research Team',
        source_url: 'https://www.cbre.com/insights/multifamily-outlook-q4-2024',
        extraction_confidence: 0.88
      },
      {
        source: 'jll',
        title: 'Office Market Recovery Trends',
        report_type: 'market_report',
        market_area: 'Major US Markets',
        property_type: 'office',
        summary: 'Office markets continue recovery with improving fundamentals in key metropolitan areas.',
        key_findings: JSON.stringify([
          'Vacancy rates decreased in 65% of markets',
          'Flight to quality continues',
          'Average asking rents stabilized'
        ]),
        publication_date: new Date('2024-11-15'),
        author: 'JLL Research',
        source_url: 'https://www.jll.com/insights/office-recovery-trends',
        extraction_confidence: 0.82
      }
    ];

    for (const report of sampleReports) {
      await prisma.marketResearchReport.create({
        data: report
      });
    }

    // Sample transactions
    const sampleTransactions = [
      {
        source: 'cbre',
        property_address: '789 Retail Plaza',
        city: 'Miami',
        state: 'FL',
        zip_code: '33101',
        property_type: 'retail',
        units: 25,
        sq_ft: 45000,
        year_built: 2010,
        sale_price: 8500000,
        sale_date: new Date('2024-11-20'),
        price_per_unit: 340000,
        price_per_sqft: 189,
        cap_rate: 0.068,
        buyer: 'Regional REIT',
        seller: 'Private Developer',
        broker: 'CBRE',
        days_on_market: 120,
        data_confidence: 0.92
      }
    ];

    for (const transaction of sampleTransactions) {
      await prisma.institutionalTransaction.create({
        data: transaction
      });
    }

    // Sample market data
    const sampleMarketData = [
      {
        source: 'cbre',
        metro_area: 'Los Angeles',
        state: 'CA',
        multifamily_cap_rate: 0.055,
        office_cap_rate: 0.065,
        retail_cap_rate: 0.070,
        industrial_cap_rate: 0.060,
        avg_rent_per_unit: 2800,
        avg_rent_per_sqft: 3.20,
        vacancy_rate: 0.08,
        avg_price_per_unit: 650000,
        avg_price_per_sqft: 520,
        measurement_date: new Date(),
        data_confidence: 0.85
      }
    ];

    for (const marketData of sampleMarketData) {
      await prisma.institutionalMarketData.create({
        data: marketData
      });
    }

    console.log('✅ Successfully seeded sample institutional data');

  } catch (error) {
    console.error('❌ Error seeding sample data:', error);
    throw error;
  }
}

// Main execution
async function main() {
  try {
    await seedInstitutionalSources();
    await seedSampleInstitutionalData();
    console.log('🎉 All institutional data seeded successfully!');
  } catch (error) {
    console.error('💥 Failed to seed institutional data:', error);
    process.exit(1);
  }
}

if (require.main === module) {
  main();
}

export { seedInstitutionalSources, seedSampleInstitutionalData };