# Institutional Commercial Real Estate Scraping System

## Overview

This system provides comprehensive web scraping and data integration for major commercial real estate firms, delivering institutional-grade data for investment analysis and market research.

## Supported Institutional Sources

### CBRE (CB Richard Ellis)
- **URL**: https://www.cbre.com
- **Data Types**: Properties, Research Reports, Transactions, Market Data
- **Rate Limit**: 15 requests/minute
- **Specialization**: Global market leader, comprehensive property listings

### Colliers International
- **URL**: https://www.colliers.com
- **Data Types**: Properties, Market Intelligence, Transaction Data
- **Rate Limit**: 12 requests/minute
- **Specialization**: Professional services, market analysis

### JLL (Jones Lang LaSalle)
- **URL**: https://www.jll.com/en-us
- **Data Types**: Investment Sales, Research, Market Outlook
- **Rate Limit**: 10 requests/minute
- **Specialization**: Investment services, market forecasting

### Cushman & Wakefield
- **URL**: https://www.cushmanwakefield.com/en/united-states
- **Data Types**: Property Database, Market Research, Analytics
- **Rate Limit**: 8 requests/minute
- **Specialization**: Global reach, market analytics

## System Architecture

### Database Schema

#### Core Tables

**InstitutionalProperty**
```sql
- id: Unique identifier
- source: Source firm (cbre, colliers, jll, cushman_wakefield)
- property_id: Original property ID from source
- address, city, state, zip_code: Location data
- property_type, property_subtype: Asset classification
- listing_price, cap_rate, noi: Financial metrics
- units, sq_ft, year_built: Property characteristics
- data_confidence: Quality score (0-1)
```

**MarketResearchReport**
```sql
- id: Unique identifier
- source: Source firm
- title, report_type: Report identification
- market_area, property_type: Geographic and asset focus
- publication_date: When published
- key_findings, investment_themes: Extracted insights
- extraction_confidence: Quality score (0-1)
```

**InstitutionalTransaction**
```sql
- id: Unique identifier
- source: Source firm
- property_address: Transaction location
- sale_price, sale_date: Transaction details
- cap_rate, price_per_unit: Investment metrics
- buyer, seller, broker: Transaction parties
- data_confidence: Quality score (0-1)
```

**InstitutionalMarketData**
```sql
- id: Unique identifier
- source: Source firm
- metro_area, zip_code: Geographic scope
- multifamily_cap_rate, office_cap_rate: Property type rates
- avg_rent_per_unit, vacancy_rate: Market metrics
- measurement_date: Data collection date
```

### Scraping Engine Components

#### 1. InstitutionalScrapers Class
- **Purpose**: Execute scraping jobs for each institutional source
- **Features**: 
  - Playwright-based browser automation
  - Firm-specific data extraction
  - Rate limiting and compliance
  - Error handling and retry logic

#### 2. InstitutionalDataNormalizer Class
- **Purpose**: Standardize and validate scraped data
- **Features**:
  - Property type mapping
  - Address normalization
  - Financial data validation
  - Confidence scoring

#### 3. InstitutionalJobProcessor Class
- **Purpose**: Manage and execute scraping jobs
- **Features**:
  - Queue-based processing
  - Scheduled execution
  - Performance monitoring
  - Automatic retries

## API Reference

### Properties Endpoint
```
GET /api/institutional/properties
```

**Parameters:**
- `zipCode`: Filter by zip code
- `propertyType`: multifamily, office, retail, industrial, hospitality
- `source`: cbre, colliers, jll, cushman_wakefield
- `minPrice`, `maxPrice`: Price range filters
- `minCapRate`, `maxCapRate`: Cap rate range filters
- `page`, `limit`: Pagination controls

**Response:**
```json
{
  "properties": [...],
  "pagination": {
    "page": 1,
    "limit": 20,
    "total": 150,
    "totalPages": 8
  },
  "aggregations": {
    "stats": {
      "avgPrice": 5500000,
      "avgCapRate": 5.8,
      "count": 150
    },
    "sourceDistribution": [...],
    "typeDistribution": [...]
  }
}
```

### Research Reports Endpoint
```
GET /api/institutional/market-reports
```

**Parameters:**
- `source`: Filter by institutional source
- `reportType`: market_outlook, cap_rate_survey, etc.
- `marketArea`: Geographic focus
- `keyword`: Text search in title/summary
- `dateFrom`, `dateTo`: Date range filters

**Response:**
```json
{
  "reports": [...],
  "aggregations": {
    "sourceDistribution": [...],
    "reportTypeDistribution": [...],
    "monthlyDistribution": [...]
  }
}
```

### Transactions Endpoint
```
GET /api/institutional/transactions
```

**Parameters:**
- `zipCode`, `metroArea`: Location filters
- `propertyType`: Asset type filter
- `minPrice`, `maxPrice`: Sale price range
- `dateFrom`, `dateTo`: Sale date range

**Response:**
```json
{
  "transactions": [...],
  "analytics": {
    "summary": {
      "totalTransactions": 85,
      "totalVolume": 425000000,
      "avgSalePrice": 5000000,
      "avgCapRate": 6.2
    },
    "trends": {
      "monthlyVolume": [...]
    },
    "insights": {
      "marketVelocity": "hot",
      "priceAppreciation": 8.5,
      "capRateTrend": -0.3
    }
  }
}
```

### Cap Rates Endpoint
```
GET /api/institutional/cap-rates
```

**Parameters:**
- `metroArea`, `zipCode`: Geographic filters
- `propertyType`: Asset type filter
- `includeTrends`: Include historical trend data

**Response:**
```json
{
  "capRates": {
    "byPropertyType": [
      {
        "propertyType": "multifamily",
        "avgCapRate": 5.5,
        "dataPoints": 245,
        "sources": ["cbre", "colliers", "jll"]
      }
    ],
    "bySource": [...]
  },
  "marketStats": {
    "overallAvgCapRate": 5.8,
    "spread": { "min": 4.2, "max": 7.8 }
  },
  "trends": {
    "monthlyData": [...],
    "trendDirection": "stable"
  }
}
```

### Scraping Jobs Endpoint
```
POST /api/institutional/scrape
```

**Request Body:**
```json
{
  "sources": ["cbre", "colliers"],
  "jobTypes": ["properties", "research"],
  "searchParams": {
    "zipCode": "90210",
    "propertyType": "multifamily"
  },
  "priority": 1
}
```

**Response:**
```json
{
  "success": true,
  "jobs": [...],
  "batchInfo": {
    "totalJobs": 4,
    "estimatedDuration": "10 minutes"
  }
}
```

## Setup and Configuration

### 1. Database Setup
```bash
# Generate Prisma client and push schema
bun run db:generate
bun run db:push

# Seed institutional sources
bun run seed:institutional
```

### 2. Environment Variables
```env
DATABASE_URL="file:./dev.db"
```

### 3. Start Services
```bash
# Start the main application
bun run dev

# Start job processor (in separate terminal)
bun run jobs:start
```

## Data Quality and Monitoring

### Quality Scoring System
- **Property Confidence**: Based on completeness of required fields, validation of financial data, and source reliability
- **Research Extraction Confidence**: Based on successful parsing of title, date, and content
- **Transaction Confidence**: Based on validation of sale price, date, and property details

### Quality Metrics
- **Completeness Score**: Percentage of required fields populated
- **Validation Rate**: Percentage of data passing validation rules
- **Duplicate Detection**: Cross-source duplicate identification
- **Data Freshness**: Average age of scraped data

### Monitoring Dashboard
- Real-time job status tracking
- Success/failure rates by source
- Data quality trends over time
- Performance metrics and alerts

## Compliance and Ethics

### Rate Limiting
- **CBRE**: 15 requests/minute
- **Colliers**: 12 requests/minute  
- **JLL**: 10 requests/minute
- **Cushman & Wakefield**: 8 requests/minute

### Respectful Scraping Practices
- Robots.txt compliance checking
- User agent rotation
- Request delays and backoff
- Error handling without hammering
- Data attribution and source tracking

### Legal Considerations
- Fair use for research and analysis
- No commercial redistribution of scraped data
- Respect for terms of service
- Data used for investment analysis only

## Advanced Features

### 1. Cross-Source Data Correlation
- Property matching across multiple sources
- Price variation analysis
- Market consensus indicators
- Data reliability scoring

### 2. Market Intelligence
- Automated trend detection
- Investment opportunity identification
- Market sentiment analysis
- Comparative market analysis

### 3. Data Export and Integration
- CSV/Excel export functionality
- API integration with third-party tools
- Real-time data feeds
- Custom report generation

## Usage Examples

### Search Properties by Market
```javascript
const response = await fetch('/api/institutional/properties?zipCode=90210&propertyType=multifamily&minCapRate=5.0');
const data = await response.json();
console.log(`Found ${data.properties.length} multifamily properties`);
```

### Get Latest Research Reports
```javascript
const response = await fetch('/api/institutional/market-reports?source=cbre&reportType=market_outlook');
const data = await response.json();
data.reports.forEach(report => {
  console.log(`${report.title} - ${report.publication_date}`);
});
```

### Trigger Data Update
```javascript
const response = await fetch('/api/institutional/scrape', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({
    sources: ['cbre', 'colliers'],
    jobTypes: ['properties'],
    priority: 1
  })
});
```

### Analyze Market Trends
```javascript
const response = await fetch('/api/institutional/cap-rates?metroArea=Los Angeles&includeTrends=true');
const data = await response.json();
console.log(`Market trend: ${data.trends.trendDirection}`);
```

## Performance Optimization

### Caching Strategy
- API response caching for market data
- Database query optimization with indexes
- Image and static asset caching
- CDN integration for global performance

### Scalability Considerations
- Horizontal scaling with job distribution
- Database sharding by geographic region
- Queue-based processing for high volume
- Load balancing for API endpoints

## Troubleshooting

### Common Issues

**1. Scraping Job Failures**
- Check rate limiting compliance
- Verify source website structure
- Review error logs for specific issues
- Ensure proxy/VPN if needed

**2. Data Quality Issues**
- Review normalization rules
- Check validation criteria
- Analyze source data changes
- Update field mappings

**3. Performance Issues**
- Monitor database query performance
- Check job queue processing speed
- Review memory usage patterns
- Optimize data aggregation queries

### Debugging Tools
- Comprehensive logging system
- Performance monitoring dashboard
- Data quality reports
- Job execution metrics

## Security Considerations

### Data Protection
- Secure database access
- API authentication and authorization
- Rate limiting for API endpoints
- Input validation and sanitization

### Scraping Security
- Proxy rotation for anonymity
- CAPTCHA detection and handling
- Session management
- IP rotation strategies

## Future Enhancements

### Planned Features
1. **AI-Powered Market Analysis**
   - Natural language processing for research reports
   - Predictive market modeling
   - Automated investment scoring

2. **Enhanced Data Sources**
   - Regional and boutique firms
   - Government data integration
   - Economic indicator correlation

3. **Advanced Analytics**
   - Machine learning for property valuation
   - Risk assessment modeling
   - Portfolio optimization tools

4. **Integration Capabilities**
   - CRM system integration
   - Investment platform APIs
   - Automated reporting systems

## Support and Maintenance

### Regular Maintenance Tasks
- Weekly data quality reviews
- Monthly source structure validation
- Quarterly performance optimization
- Annual compliance audits

### Support Channels
- Technical documentation updates
- Performance monitoring alerts
- Error tracking and resolution
- Feature request management

---

For technical support or feature requests, please refer to the project repository or contact the development team.