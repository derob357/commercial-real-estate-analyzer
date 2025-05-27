# Project Structure Documentation

This document provides a detailed overview of the Commercial Real Estate Analyzer project structure and organization.

## 📁 Root Directory

```
commercial-real-estate-analyzer/
├── .env                          # Environment variables (not in git)
├── .env.example                  # Environment variables template
├── .gitignore                    # Git ignore rules
├── README.md                     # Main project documentation
├── LICENSE                       # MIT license
├── CONTRIBUTING.md               # Contribution guidelines
├── PROJECT_STRUCTURE.md          # This file
├── package.json                  # Dependencies and scripts
├── bun.lock                      # Bun lockfile
├── next.config.js                # Next.js configuration
├── tailwind.config.ts            # Tailwind CSS configuration
├── tsconfig.json                 # TypeScript configuration
├── biome.json                    # Biome linter configuration
├── eslint.config.mjs             # ESLint configuration
├── postcss.config.mjs            # PostCSS configuration
├── components.json               # shadcn/ui configuration
└── netlify.toml                  # Netlify deployment config
```

## 📁 Source Directory (`src/`)

### `src/app/` - Next.js App Router
The main application structure using Next.js 13+ App Router pattern.

```
src/app/
├── layout.tsx                    # Root layout component
├── page.tsx                      # Home page component
├── globals.css                   # Global CSS styles
├── ClientBody.tsx                # Client-side app wrapper
└── api/                          # API route handlers
    ├── analyze/
    │   └── enhanced/
    │       └── route.ts          # Enhanced property analysis API
    ├── health/
    │   └── route.ts              # Health check endpoint
    ├── institutional/            # Institutional data APIs
    │   ├── properties/
    │   ├── transactions/
    │   ├── cap-rates/
    │   ├── market-reports/
    │   └── scrape/
    ├── jobs/                     # Background job management
    │   ├── queue/
    │   └── [id]/
    ├── properties/               # Property data endpoints
    │   └── [id]/
    │       └── tax-history/
    └── tax-assessor/             # Tax assessor integration
        ├── lookup/
        └── sources/
            └── [zip_code]/
```

### `src/components/` - React Components
Reusable UI components and application-specific components.

```
src/components/
├── ui/                           # shadcn/ui components
│   ├── button.tsx
│   ├── card.tsx
│   ├── input.tsx
│   ├── badge.tsx
│   ├── tabs.tsx
│   ├── select.tsx
│   ├── table.tsx
│   ├── dialog.tsx
│   ├── form.tsx
│   ├── label.tsx
│   ├── dropdown-menu.tsx
│   ├── sheet.tsx
│   ├── avatar.tsx
│   ├── tooltip.tsx
│   ├── progress.tsx
│   ├── separator.tsx
│   ├── alert-dialog.tsx
│   ├── chart.tsx
│   ├── command.tsx
│   └── switch.tsx
├── PropertyAnalyzer.tsx          # Main property analysis component
├── PropertyAnalysis.tsx          # Property analysis display
├── PropertySearch.tsx            # Property search interface
├── MarketDataDashboard.tsx       # Market data visualization
├── MarketDataCharts.tsx          # Chart components
├── PortfolioTracker.tsx          # Portfolio management
├── PropertyAlerts.tsx            # Alert system
├── MobileResponsiveDashboard.tsx # Mobile-optimized dashboard
├── DealComparison.tsx            # Property comparison tools
├── TaxAssessorLookup.tsx         # Tax assessor data lookup
├── TaxAssessorTest.tsx           # Tax assessor testing
├── EnhancedAnalysisTest.tsx      # Analysis testing
├── ZipCodeSearch.tsx             # ZIP code search
├── RadiusSearchPrompt.tsx        # Radius search interface
└── InstitutionalDataDashboard.tsx # Institutional data display
```

### `src/lib/` - Utility Libraries
Core utility functions and shared logic.

```
src/lib/
├── utils.ts                      # General utility functions
├── database.ts                   # Database configuration
├── init.ts                       # Application initialization
├── address/
│   └── normalizer.ts             # Address normalization
├── jobs/
│   └── scrape-queue.ts           # Job queue management
├── tax-assessor/
│   ├── mapping.ts                # Tax assessor URL mapping
│   └── scraper.ts                # Tax assessor scraping logic
└── underwriting/
    └── enhanced-calculator.ts    # Financial calculations
```

### `src/server/` - Server-Side Services
Backend business logic and API route handlers.

```
src/server/
├── index.ts                      # Server entry point
├── routes/                       # Express route handlers
│   ├── properties.ts
│   ├── market-data.ts
│   ├── tax-assessor.ts
│   ├── underwriting.ts
│   ├── research.ts
│   └── scraping.ts
├── services/                     # Business logic services
│   ├── PropertyAnalysisService.ts
│   ├── ScrapingEngine.ts
│   ├── ComparablesService.ts
│   ├── InstitutionalScrapers.ts
│   └── InstitutionalJobProcessor.ts
└── utils/                        # Server utilities
    ├── RateLimiter.ts
    ├── DataNormalizer.ts
    └── InstitutionalDataNormalizer.ts
```

### `src/services/` - Client-Side Services
Frontend service layer for API communication.

```
src/services/
├── RadiusSearchService.ts        # Geographic search
├── MLSDataService.ts             # MLS data integration
└── CloudSyncService.ts           # Cloud synchronization
```

### `src/scripts/` - Utility Scripts
Database management and utility scripts.

```
src/scripts/
├── seed.ts                       # Database seeding
├── seed-institutional.ts         # Institutional data seeding
├── start-jobs.ts                 # Job queue startup
└── test-scraper.ts               # Scraper testing
```

## 📁 Database (`prisma/`)

```
prisma/
├── schema.prisma                 # Database schema definition
└── dev.db                        # SQLite database file (not in git)
```

### Key Database Entities

- **Properties**: Commercial real estate property records
- **TaxAssessorData**: Tax assessment information
- **MarketData**: Market trends and analytics
- **UserAlerts**: Property alert configurations
- **Portfolio**: User portfolio tracking
- **Jobs**: Background job processing
- **InstitutionalData**: Institutional real estate data

## 📁 Documentation Files

- `README.md`: Main project overview and setup
- `CONTRIBUTING.md`: Contribution guidelines
- `PROJECT_STRUCTURE.md`: This detailed structure guide
- `BACKEND_SYSTEM_DOCUMENTATION.md`: Backend system details
- `INSTITUTIONAL_SCRAPING_DOCUMENTATION.md`: Scraping documentation

## 📁 Configuration Files

### Build & Development
- `next.config.js`: Next.js configuration
- `tailwind.config.ts`: Tailwind CSS setup
- `tsconfig.json`: TypeScript compiler options
- `biome.json`: Code formatting and linting
- `eslint.config.mjs`: ESLint rules
- `postcss.config.mjs`: PostCSS processing

### Package Management
- `package.json`: Dependencies and npm scripts
- `bun.lock`: Bun dependency lockfile

### Deployment
- `netlify.toml`: Netlify deployment configuration
- `.env.example`: Environment variables template

## 🔧 Key Technologies by Directory

### Frontend (`src/app/`, `src/components/`)
- **Next.js 15.3.2**: React framework with App Router
- **TypeScript**: Type-safe development
- **Tailwind CSS**: Utility-first styling
- **shadcn/ui**: Modern UI components
- **Radix UI**: Accessible primitives
- **React Hook Form**: Form management
- **Recharts**: Data visualization

### Backend (`src/server/`, `src/lib/`)
- **Prisma**: Database ORM and migrations
- **Express.js**: Server framework
- **SQLite**: Development database
- **Bull**: Job queue management
- **Cheerio**: HTML parsing
- **Playwright/Puppeteer**: Browser automation

### Utilities (`src/scripts/`, `src/services/`)
- **Node-Cron**: Scheduled tasks
- **Axios**: HTTP client
- **Lodash**: Utility functions
- **CSV Parser/Writer**: Data import/export
- **Winston**: Logging

## 📊 Data Flow

1. **User Interface**: Components in `src/components/`
2. **API Layer**: Routes in `src/app/api/`
3. **Business Logic**: Services in `src/server/services/`
4. **Data Access**: Prisma models and `src/lib/database.ts`
5. **External APIs**: Scrapers and integrations in `src/lib/`

## 🚀 Development Workflow

1. **Frontend Development**: Work in `src/components/` and `src/app/`
2. **API Development**: Add routes in `src/app/api/`
3. **Business Logic**: Implement in `src/server/services/`
4. **Database Changes**: Update `prisma/schema.prisma`
5. **Scripts**: Add utilities in `src/scripts/`

## 📱 Component Hierarchy

```
App (layout.tsx)
├── ClientBody.tsx
│   ├── PropertySearch.tsx
│   ├── PropertyAnalyzer.tsx
│   │   ├── PropertyAnalysis.tsx
│   │   └── TaxAssessorLookup.tsx
│   ├── MarketDataDashboard.tsx
│   │   └── MarketDataCharts.tsx
│   ├── PortfolioTracker.tsx
│   ├── PropertyAlerts.tsx
│   ├── DealComparison.tsx
│   └── MobileResponsiveDashboard.tsx
```

## 🔍 Key Files to Understand

### Entry Points
- `src/app/layout.tsx`: Application root
- `src/app/page.tsx`: Home page
- `src/server/index.ts`: Server entry

### Core Logic
- `src/lib/database.ts`: Database connection
- `src/components/PropertyAnalyzer.tsx`: Main analysis component
- `src/lib/tax-assessor/scraper.ts`: Tax data scraping

### Configuration
- `prisma/schema.prisma`: Database schema
- `.env.example`: Environment setup
- `package.json`: Dependencies and scripts

This structure supports scalable development, clear separation of concerns, and maintainable code organization.