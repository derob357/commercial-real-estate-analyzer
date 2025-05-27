# Commercial Real Estate Analysis Backend System

## Overview

This is a comprehensive backend system for commercial real estate deal analysis and data aggregation. The system integrates multiple high-quality data sources to provide institutional-grade analysis capabilities for commercial real estate investments.

## Architecture

### Core Components

1. **Express.js API Server** - RESTful API with comprehensive endpoints
2. **Prisma ORM** - Database management with SQLite/PostgreSQL support
3. **Web Scraping Engine** - Playwright-based scraping with rate limiting
4. **Financial Analysis Engine** - Advanced underwriting and scenario modeling
5. **Job Queue System** - Background processing for data collection
6. **Data Normalization** - Standardization across multiple data sources

### Technology Stack

- **Runtime**: Bun (Node.js alternative)
- **Framework**: Express.js with TypeScript
- **Database**: SQLite (development) / PostgreSQL (production)
- **ORM**: Prisma
- **Web Scraping**: Playwright + Cheerio
- **Validation**: Zod
- **Logging**: Winston
- **Job Processing**: Custom queue system with Redis support

## Data Sources Integration

### 1. RealtyRates.com
- **Data Types**: Cap rates by property type and region
- **Frequency**: Weekly updates
- **Coverage**: 32 property types, 12 regions, 45 metro areas
- **Includes**: Mortgage terms, equity requirements, historical trends

### 2. Marcus & Millichap
- **Data Types**: Property listings, transaction data, market research
- **Frequency**: Daily updates
- **Coverage**: National commercial real estate transactions
- **Includes**: $49.6B+ in transaction data, regional reports

### 3. Milken Institute
- **Data Types**: Economic indicators, regional development data
- **Frequency**: Monthly/Quarterly updates
- **Coverage**: Best-performing cities, macroeconomic trends
- **Includes**: Infrastructure data, public finance indicators

### 4. Tax Assessor Integration
- **Data Types**: Property tax assessments, payment history
- **Frequency**: Annual updates with real-time lookups
- **Coverage**: County-level tax assessor websites
- **Includes**: Assessed values, tax rates, payment status

## Database Schema

### Core Tables

```sql
-- Properties with comprehensive details
Properties (
  id, address, city, state, zip_code, county, parcel_id,
  property_type, units, sq_ft, year_built, lot_size,
  listing_price, listing_source, coordinates, dates
)

-- Financial analysis with tax integration
Financial_Metrics (
  property_id, gross_income, operating_expenses, noi,
  cap_rate, cash_on_cash_return, dscr, grm,
  effective_tax_rate, tax_trends
)

-- Market data by region
Market_Data (
  zip_code, metro_area, region, cap_rates_by_type,
  avg_rent, vacancy_rate, market_trends, economic_indicators
)

-- Tax assessment integration
Tax_Assessments (
  property_id, assessment_year, assessed_value,
  land_value, improvement_value, tax_rate, annual_taxes
)

-- Research reports and insights
Research_Reports (
  title, report_type, metro_area, property_type,
  publication_date, key_findings, source
)
```

## API Endpoints

### Property Analysis
```
POST /api/properties/analyze
GET /api/properties/search
GET /api/properties/:id
GET /api/properties/:id/comparables
POST /api/properties/:id/scenarios
```

### Market Intelligence
```
GET /api/market-data/:zip_code
GET /api/market-data/search
GET /api/market-data/cap-rates/:property_type
GET /api/market-data/trends/:metric
GET /api/market-data/comparison
```

### Tax Assessment
```
POST /api/tax-assessor/lookup
GET /api/tax-assessor/:property_id/history
GET /api/tax-assessor/status/:job_id
```

### Underwriting & Analysis
```
POST /api/underwriting/analyze
POST /api/underwriting/scenarios
GET /api/underwriting/:property_id/history
POST /api/underwriting/compare
```

### Research & Reports
```
GET /api/research/reports
GET /api/research/economic-indicators/:metro_area
GET /api/research/report/:id
```

### System Management
```
GET /api/scraping/jobs
GET /api/scraping/status
POST /api/scraping/queue
DELETE /api/scraping/job/:job_id
```

## Financial Analysis Engine

### Core Metrics Calculated

1. **Basic Metrics**
   - Net Operating Income (NOI) = Gross Income - Operating Expenses
   - Cap Rate = NOI / Purchase Price
   - Cash-on-Cash Return = Annual Cash Flow / Cash Invested
   - Debt Service Coverage Ratio = NOI / Annual Debt Service
   - Gross Rent Multiplier = Purchase Price / Gross Annual Rent

2. **Enhanced Analysis**
   - IRR calculations with multiple scenarios
   - 10-year cash flow projections
   - Tax-adjusted returns with real assessment data
   - Market comparison analysis
   - Risk assessment scoring
   - Sensitivity analysis for key variables

3. **Tax Integration**
   - Effective tax rate from actual payments
   - Assessment vs market value ratios
   - 3-year tax trend analysis
   - Tax appeal potential identification

### Scenario Modeling

```typescript
// Example scenario analysis
{
  "scenarios": [
    {
      "name": "base_case",
      "purchase_price": 5000000,
      "down_payment_percent": 0.25,
      "interest_rate": 0.045,
      "loan_term_years": 30,
      "year_1_gross_income": 400000,
      "annual_rent_growth": 0.03,
      "vacancy_rate": 0.05,
      "exit_year": 10,
      "exit_cap_rate": 0.06
    }
  ]
}
```

## Web Scraping Infrastructure

### Rate Limiting Strategy
- RealtyRates: 30 requests/minute
- Marcus & Millichap: 20 requests/minute
- Tax Assessors: 10 requests/minute (conservative)
- Automatic retry with exponential backoff

### Data Quality Controls
1. **Validation**: Schema validation for all scraped data
2. **Normalization**: Standardized formats across sources
3. **Deduplication**: Intelligent duplicate detection
4. **Error Handling**: Comprehensive logging and retry mechanisms

### Compliance Features
- Respects robots.txt
- Implements proper rate limiting
- User-agent rotation
- Data attribution and source tracking

## Installation & Setup

### Prerequisites
```bash
# Install Bun
curl -fsSL https://bun.sh/install | bash

# Clone and setup
git clone <repo>
cd real-estate-analyzer
bun install
```

### Environment Configuration
```bash
# .env file
DATABASE_URL="file:./prisma/dev.db"
NODE_ENV="development"
PORT="3001"
LOG_LEVEL="info"

# Optional: Redis for job queue
REDIS_URL="redis://localhost:6379"

# Optional: PostgreSQL for production
# DATABASE_URL="postgresql://user:pass@localhost:5432/realestate"
```

### Database Setup
```bash
# Initialize database
bun run db:generate
bun run db:push

# Seed initial data (optional)
bun run db:seed
```

### Starting the System
```bash
# Start API server
bun run dev

# Start job processor (separate terminal)
bun run jobs:start

# Run tests
bun run test:scraper
```

## Usage Examples

### Property Analysis
```typescript
// Analyze a property
const analysis = await fetch('/api/properties/analyze', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    property_id: "property_123",
    purchase_price: 5000000,
    down_payment_percent: 0.25,
    interest_rate: 0.045,
    loan_term_years: 30,
    gross_rental_income: 400000,
    vacancy_rate: 0.05,
    annual_expenses: 120000
  })
});
```

### Market Research
```typescript
// Get market data for zip code
const marketData = await fetch('/api/market-data/90210');

// Compare multiple markets
const comparison = await fetch('/api/market-data/comparison?zip_codes=90210,10001,75201');
```

### Tax Assessment Lookup
```typescript
// Look up tax data
const taxData = await fetch('/api/tax-assessor/lookup', {
  method: 'POST',
  body: JSON.stringify({
    address: "123 Main St",
    city: "Beverly Hills",
    state: "CA",
    zip_code: "90210",
    property_id: "prop_123"
  })
});
```

## Performance & Scaling

### Database Optimization
- Indexed fields for fast lookups (zip_code, property_type, etc.)
- Efficient relationship queries with Prisma
- Connection pooling for high concurrency

### Caching Strategy
- Market data cached for 24 hours
- Tax assessments cached for 30 days
- Research reports cached for 7 days

### Monitoring
- Comprehensive logging with Winston
- Job queue monitoring and statistics
- API endpoint performance tracking
- Error rate monitoring and alerting

## Security Considerations

### Data Protection
- Input validation with Zod schemas
- SQL injection prevention via Prisma ORM
- Rate limiting on all endpoints
- Secure handling of external API credentials

### Compliance
- GDPR-compliant data handling
- Proper data attribution
- Transparent data source disclosure
- User consent management

## Development Guidelines

### Code Structure
```
src/
├── server/
│   ├── index.ts              # Main server
│   ├── routes/               # API route handlers
│   ├── services/             # Business logic
│   └── utils/                # Utility functions
├── scripts/                  # Maintenance scripts
└── lib/                      # Shared libraries
```

### Testing
- Unit tests for financial calculations
- Integration tests for API endpoints
- End-to-end tests for scraping workflows
- Database transaction testing

### Deployment
- Docker containerization
- Environment-specific configurations
- Database migration strategies
- Blue-green deployment support

## Contributing

### Code Standards
- TypeScript strict mode
- ESLint + Prettier formatting
- Comprehensive error handling
- Extensive documentation

### Pull Request Process
1. Feature branch from main
2. Add tests for new functionality
3. Update documentation
4. Pass all CI checks
5. Code review approval

## Support & Maintenance

### Monitoring Dashboards
- System health metrics
- Scraping job success rates
- API response times
- Database performance

### Regular Maintenance
- Weekly data source health checks
- Monthly performance optimization
- Quarterly security updates
- Annual architecture reviews

## License & Legal

This system is designed for institutional use in commercial real estate analysis. Ensure compliance with all data source terms of service and applicable regulations.

---

**Last Updated**: December 2024
**Version**: 1.0.0
**Maintainer**: Real Estate Analysis Team