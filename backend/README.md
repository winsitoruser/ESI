# NainERP Backend

Production-ready backend for Bedagang ERP system built with Express.js, TypeScript, and Sequelize ORM.

## Tech Stack

- **Runtime:** Node.js 20+
- **Framework:** Express.js
- **Language:** TypeScript
- **ORM:** Sequelize 6 (PostgreSQL)
- **Auth:** JWT (jsonwebtoken + bcryptjs)
- **Validation:** express-validator
- **Logging:** Winston
- **Security:** Helmet, CORS, Rate Limiting
- **Containerization:** Docker + Docker Compose

## Modules

| Module | Description |
|--------|-------------|
| Auth | Authentication, Users, Roles, Tenants |
| Branch | Branch management & setup |
| Product | Products, Categories, Variants, Pricing |
| POS | Transactions, Shifts, Held Orders |
| Inventory | Warehouses, Stock, Movements, Opname |
| Purchase | Suppliers, Purchase Orders, Goods Receipt |
| Customer | Customer management, Loyalty |
| Kitchen | Kitchen Display, Recipes, Ingredients |
| Table | Tables, Sessions, Reservations |
| Employee | Employee profiles, Schedules |
| HRIS | Attendance, Leave, Payroll, KPI |
| Finance | Chart of Accounts, Journals, Invoices, Budgets |
| SFA | Sales teams, Visits, Leads, Opportunities |
| CRM | Customer relations, Tickets, Automation |
| Marketing | Campaigns, Promos, Vouchers, Segments |
| Fleet | Vehicles, Drivers, GPS, Maintenance |
| TMS | Shipments, Carriers, Tracking |
| Manufacturing | BOM, Routings, Work Orders, QC |
| Asset | Asset tracking, Depreciation, Maintenance |
| Project | Projects, Tasks, Milestones, Timesheets |
| Procurement | Vendors, RFQ, Contracts |
| EXIM | Export/Import, Customs, LC |
| Billing | Subscriptions, Payments, Usage |
| Admin | Settings, Notifications, Webhooks, Audit |

## Quick Start

### Prerequisites
- Node.js 20+
- PostgreSQL 14+
- Redis (optional, for caching)

### Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env
# Edit .env with your database credentials

# Run database seed (creates tables + demo data)
npm run seed

# Start development server
npm run dev
```

### Docker

```bash
# Start all services (API + PostgreSQL + Redis)
docker-compose up -d

# Run seed inside container
docker-compose exec api npm run seed
```

## API Endpoints

Base URL: `http://localhost:4000/api/v1`

### Health Check
```
GET /api/v1/health
```

### Authentication
```
POST /api/v1/auth/register
POST /api/v1/auth/login
POST /api/v1/auth/refresh-token
POST /api/v1/auth/logout
GET  /api/v1/auth/me
PUT  /api/v1/auth/me
PUT  /api/v1/auth/change-password
```

All other endpoints require `Authorization: Bearer <token>` header.

### Demo Credentials
```
Email: admin@demo.com
Password: admin123
```

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start dev server with hot reload |
| `npm run build` | Build TypeScript to JavaScript |
| `npm start` | Start production server |
| `npm run seed` | Seed database with demo data |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests |

## Project Structure

```
backend/
├── src/
│   ├── config/         # Configuration & database connection
│   ├── middleware/      # Auth, error handling, validation, audit
│   ├── models/         # Sequelize models organized by module
│   ├── routes/         # Express route handlers
│   ├── seeds/          # Database seed scripts
│   ├── types/          # TypeScript type definitions
│   ├── utils/          # Helpers, logger, CRUD base controller
│   ├── app.ts          # Express app setup
│   └── server.ts       # Server entry point
├── .env.example
├── Dockerfile
├── docker-compose.yml
├── package.json
├── tsconfig.json
└── README.md
```

## Environment Variables

See `.env.example` for all available configuration options.

## License

Private - Bedagang ERP
