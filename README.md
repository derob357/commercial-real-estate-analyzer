# Commercial Real Estate Analyzer 🏢

A comprehensive Next.js application for commercial real estate analysis, featuring advanced property search, tax assessor data integration, market analytics, automated alerts, portfolio tracking, and MLS data integration.

## 🚀 Features

### Core Functionality
- **Property Search & Analysis**: Advanced search capabilities with detailed property analysis
- **Tax Assessor Data Integration**: Automated lookup and integration of tax assessor data across multiple jurisdictions
- **Market Data Visualization**: Interactive charts and analytics for market trends and property performance
- **Automated Property Alerts**: Real-time notifications for properties matching specified criteria
- **Portfolio Tracking**: Comprehensive portfolio management with performance monitoring
- **MLS Data Integration**: Integration with Multiple Listing Service data sources
- **Radius-Based Search**: Geographic search expansion with distance-based filtering
- **Mobile-Responsive Dashboard**: Fully responsive design optimized for all devices

### Advanced Features
- **Enhanced Analysis Engine**: Sophisticated property valuation and underwriting calculations
- **Institutional Data Scraping**: Automated collection of institutional real estate data
- **Market Reports Generation**: Automated market analysis and reporting
- **Deal Comparison Tools**: Side-by-side property comparison and analysis
- **Background Job Processing**: Asynchronous data processing with job queues
- **Rate-Limited API Calls**: Intelligent rate limiting for external API integrations

## 🛠️ Tech Stack

### Frontend
- **Next.js 15.3.2** - React framework with App Router
- **TypeScript** - Type-safe development
- **Tailwind CSS** - Utility-first CSS framework
- **shadcn/ui** - Modern UI component library
- **Radix UI** - Accessible component primitives
- **Recharts** - Data visualization and charting
- **React Hook Form** - Form management with validation
- **Lucide React** - Beautiful icons

### Backend & Database
- **Prisma** - Modern database toolkit and ORM
- **SQLite** - Lightweight database for development
- **Express.js** - Server-side API routes
- **Bull** - Job queue for background processing
- **Redis (IORedis)** - Caching and session management

### Data & Integration
- **Axios** - HTTP client for API requests
- **Cheerio** - Server-side HTML parsing and scraping
- **Playwright/Puppeteer** - Browser automation for web scraping
- **CSV Parser/Writer** - Data import/export capabilities
- **Node-Cron** - Scheduled job execution

### Development Tools
- **Biome** - Fast linter and formatter
- **ESLint** - Code quality and style enforcement
- **Bun** - Fast JavaScript runtime and package manager

## 📁 Project Structure

```
src/
├── app/                    # Next.js App Router
│   ├── api/               # API routes
│   │   ├── analyze/       # Property analysis endpoints
│   │   ├── institutional/ # Institutional data APIs
│   │   ├── jobs/          # Background job management
│   │   ├── properties/    # Property data endpoints
│   │   └── tax-assessor/  # Tax assessor integration
│   ├── globals.css        # Global styles
│   ├── layout.tsx         # Root layout component
│   └── page.tsx           # Home page
├── components/            # React components
│   ├── ui/               # shadcn/ui components
│   ├── PropertyAnalyzer.tsx
│   ├── MarketDataDashboard.tsx
│   ├── PortfolioTracker.tsx
│   ├── PropertyAlerts.tsx
│   └── MobileResponsiveDashboard.tsx
├── lib/                  # Utility libraries
│   ├── address/          # Address normalization
│   ├── jobs/             # Job queue management
│   ├── tax-assessor/     # Tax assessor integration
│   ├── underwriting/     # Financial calculations
│   ├── database.ts       # Database configuration
│   └── utils.ts          # General utilities
├── server/               # Server-side services
│   ├── routes/           # Express routes
│   ├── services/         # Business logic services
│   └── utils/            # Server utilities
├── services/             # Client-side services
└── scripts/              # Database and utility scripts
```

## 🚀 Getting Started

### Prerequisites
- **Bun** (recommended) or Node.js 18+
- **Git**

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/derob357/commercial-real-estate-analyzer.git
   cd commercial-real-estate-analyzer
   ```

2. **Install dependencies**
   ```bash
   bun install
   ```

3. **Set up environment variables**
   ```bash
   cp .env.example .env
   ```
   
   Edit `.env` with your configuration:
   ```env
   # Database
   DATABASE_URL="file:./dev.db"
   
   # Tax Assessor Configuration
   TAX_ASSESSOR_RATE_LIMIT_MS=2000
   TAX_ASSESSOR_MAX_RETRIES=3
   TAX_ASSESSOR_TIMEOUT_MS=30000
   
   # Scraping Configuration
   SCRAPING_CONCURRENT_JOBS=5
   SCRAPING_USER_AGENT="Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
   
   # Optional: Geocoding APIs
   # GOOGLE_MAPS_API_KEY=your_api_key_here
   # MAPBOX_API_KEY=your_api_key_here
   ```

4. **Initialize the database**
   ```bash
   bun run db:generate
   bun run db:push
   bun run db:seed
   ```

5. **Start the development server**
   ```bash
   bun run dev
   ```

6. **Open your browser**
   Navigate to [http://localhost:3000](http://localhost:3000)

### Additional Setup Commands

```bash
# Seed institutional data
bun run seed:institutional

# Start background job processing
bun run jobs:start

# Test tax assessor scraping
bun run test:scraper

# Lint and format code
bun run lint
bun run format

# Reset database (caution: destroys data)
bun run db:reset
```

## 🔧 Configuration

### Environment Variables

| Variable | Description | Required | Default |
|----------|-------------|----------|---------|
| `DATABASE_URL` | SQLite database file path | Yes | `file:./dev.db` |
| `TAX_ASSESSOR_RATE_LIMIT_MS` | Rate limiting for tax assessor requests | No | `2000` |
| `TAX_ASSESSOR_MAX_RETRIES` | Maximum retry attempts | No | `3` |
| `TAX_ASSESSOR_TIMEOUT_MS` | Request timeout in milliseconds | No | `30000` |
| `SCRAPING_CONCURRENT_JOBS` | Concurrent scraping jobs | No | `5` |
| `SCRAPING_USER_AGENT` | User agent for web scraping | No | Chrome default |
| `GOOGLE_MAPS_API_KEY` | Google Maps API key (optional) | No | - |
| `MAPBOX_API_KEY` | Mapbox API key (optional) | No | - |

### Database Schema

The application uses Prisma with SQLite for data management. Key entities include:
- **Properties**: Commercial real estate property data
- **TaxAssessorData**: Integrated tax assessment information
- **MarketData**: Market trends and analytics
- **UserAlerts**: Automated property alert configurations
- **Portfolio**: User portfolio tracking
- **Jobs**: Background job processing status

## 📊 API Endpoints

### Property Analysis
- `POST /api/analyze/enhanced` - Enhanced property analysis
- `GET /api/properties/[id]/tax-history` - Property tax history

### Tax Assessor Integration
- `POST /api/tax-assessor/lookup` - Lookup tax assessor data
- `GET /api/tax-assessor/sources/[zip_code]` - Get available sources by ZIP

### Institutional Data
- `GET /api/institutional/properties` - Institutional property data
- `GET /api/institutional/transactions` - Transaction data
- `GET /api/institutional/cap-rates` - Cap rate analytics
- `GET /api/institutional/market-reports` - Market reports

### Background Jobs
- `POST /api/jobs/queue` - Queue new background job
- `GET /api/jobs/[id]` - Get job status

## 🎯 Key Components

### PropertyAnalyzer
Advanced property analysis with financial calculations, market comparisons, and investment metrics.

### MarketDataDashboard
Interactive dashboard displaying market trends, analytics, and performance metrics with charts and visualizations.

### PortfolioTracker
Comprehensive portfolio management system for tracking property investments, performance, and returns.

### PropertyAlerts
Automated alert system that monitors properties matching user-defined criteria and sends real-time notifications.

### TaxAssessorLookup
Integration system for automatically fetching and normalizing tax assessor data from multiple jurisdictions.

## 🔄 Background Processing

The application includes robust background job processing for:
- **Data Scraping**: Automated collection of property and market data
- **Tax Assessor Updates**: Regular updates of tax assessment data
- **Market Analysis**: Periodic market trend analysis and reporting
- **Alert Processing**: Real-time property alert evaluations

## 📱 Mobile Responsiveness

The application is fully responsive and optimized for:
- **Desktop**: Full-featured dashboard experience
- **Tablet**: Adapted layouts for touch interaction
- **Mobile**: Streamlined interface for on-the-go access

## 🚀 Deployment

### Vercel (Recommended)
1. Push your code to GitHub
2. Connect your repository to Vercel
3. Configure environment variables in Vercel dashboard
4. Deploy automatically on push to main branch

### Docker
```bash
# Build Docker image
docker build -t commercial-real-estate-analyzer .

# Run container
docker run -p 3000:3000 commercial-real-estate-analyzer
```

### Manual Deployment
```bash
# Build for production
bun run build

# Start production server
bun run start
```

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## 👥 Authors

- **Deric** - [derob357](https://github.com/derob357)

## 🙏 Acknowledgments

- Next.js team for the excellent framework
- shadcn for the beautiful UI components
- Prisma team for the modern database toolkit
- The open-source community for various dependencies

## 📞 Support

For support, email derob357@yahoo.com or create an issue in the GitHub repository.

---

**Note**: This application is designed for educational and professional use in commercial real estate analysis. Ensure compliance with local laws and regulations when scraping data from external sources.
