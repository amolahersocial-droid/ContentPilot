# RankForge - SEO Content SaaS Platform

**RankForge** is a dual-mode SEO content generation and publishing platform that operates as both a standalone WordPress content tool and a Shopify-embedded app. It leverages AI to automate content creation, SEO optimization, and publishing workflows.

## 🚀 Features

- **AI-Powered Content Generation** - GPT-4o for article creation with intelligent internal linking
- **Image Generation** - DALL·E 3 for contextual imagery
- **SEO Optimization** - Built-in validator with readability scoring, meta tag validation, and keyword analysis
- **Automated Publishing** - Direct integration with WordPress and Shopify
- **Advanced Site Crawler** - Configurable depth, robots.txt parsing, and metadata extraction
- **Background Job Processing** - Database-backed queue for async tasks
- **Subscription Management** - Razorpay for standalone, Shopify Billing API for embedded mode
- **Dual Authentication** - Email/password for standalone, Shopify OAuth for embedded
- **GDPR Compliance** - Built for Shopify with webhook support

## 📋 Prerequisites

Before you begin, ensure you have the following:

- **Node.js** 18+ installed
- **PostgreSQL** database (Neon recommended)
- **API Keys** (see Environment Variables section)

## 🛠️ Installation & Setup

### 1. Clone the Repository

```bash
git clone <your-repo-url>
cd rankforge
```

### 2. Install Dependencies

```bash
npm install
```

### 3. Set Up Environment Variables

Create a `.env` file in the root directory with the following variables:

```bash
# Database
DATABASE_URL=postgresql://user:password@host:port/database

# Session Secret
SESSION_SECRET=your-random-secret-key-here

# OpenAI API
OPENAI_API_KEY=sk-...

# Razorpay (for standalone mode)
RAZORPAY_KEY_ID=rzp_test_...
RAZORPAY_KEY_SECRET=...

# Shopify (for embedded mode)
SHOPIFY_API_KEY=...
SHOPIFY_API_SECRET=...
SHOPIFY_REDIRECT_URI=http://localhost:5000/api/auth/callback

# Optional: Email Services
SENDGRID_API_KEY=SG...
FROM_EMAIL=noreply@rankforge.app

# Optional: Application URL
APP_URL=http://localhost:5000
NODE_ENV=development
```

> **Note**: See [SETUP.md](SETUP.md) for detailed instructions on obtaining API keys.

### 4. Set Up the Database

The application uses PostgreSQL with Drizzle ORM. Follow these steps:

#### Option A: Using Existing Database

If you already have a PostgreSQL database, update the `DATABASE_URL` in your `.env` file.

#### Option B: Creating New Database

1. **Install PostgreSQL** locally or use a cloud provider (Neon, Supabase, etc.)

2. **Create Database**:
   ```bash
   # Using psql
   createdb rankforge
   
   # Or using SQL
   psql -U postgres
   CREATE DATABASE rankforge;
   ```

3. **Update DATABASE_URL** in `.env`:
   ```
   DATABASE_URL=postgresql://username:password@localhost:5432/rankforge
   ```

#### Push Schema to Database

Once your database is ready, push the schema:

```bash
npm run db:push
```

This command will create all necessary tables in your database.

### 5. Run the Application

#### Development Mode

```bash
npm run dev
```

The application will start on `http://localhost:5000`

#### Production Mode

```bash
# Build the application
npm run build

# Start production server
npm start
```

## 🔐 Authentication Modes

### Standalone Mode (Email/Password)
- Users access the app directly at your domain
- Email/password authentication
- Razorpay for subscription payments

### Shopify Embedded Mode
- Accessed within Shopify admin
- Shopify OAuth authentication
- Shopify Billing API for subscriptions
- App Bridge 4.x for navigation

## 📁 Project Structure

```
rankforge/
├── client/                 # Frontend (React + TypeScript)
│   ├── src/
│   │   ├── components/    # UI components
│   │   ├── contexts/      # React contexts (Auth, Mode, Shopify)
│   │   ├── pages/         # Page components
│   │   └── lib/           # Utilities
├── server/                # Backend (Express + TypeScript)
│   ├── services/          # Business logic
│   ├── middleware/        # Express middleware
│   ├── routes.ts          # API routes
│   └── index.ts           # Server entry point
├── shared/                # Shared types and schemas
│   └── schema.ts          # Database schema (Drizzle)
└── migrations/            # Database migrations
```

## 🗄️ Database Schema

The application uses the following main tables:

- **users** - User accounts (standalone mode)
- **shops** - Shopify stores (embedded mode)
- **sites** - Connected WordPress/Shopify sites
- **posts** - Generated content
- **keywords** - SEO keywords
- **jobs** - Background job queue
- **backlinks** - Link building campaigns
- **outreach_campaigns** - Email outreach

See `shared/schema.ts` for complete schema definition.

## 🔑 API Keys & Setup

### Required for All Modes
- **OpenAI API Key** - For content and image generation
  - Get it from: https://platform.openai.com/api-keys
  
- **Database Connection** - PostgreSQL URL
  - Neon (recommended): https://neon.tech
  - Supabase: https://supabase.com
  - Or any PostgreSQL provider

### Standalone Mode
- **Razorpay Keys** - For payments
  - Get from: https://dashboard.razorpay.com/app/keys
  - Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`

### Shopify Embedded Mode
- **Shopify Partner Account** - Create app
  - Get from: https://partners.shopify.com
  - Set `SHOPIFY_API_KEY` and `SHOPIFY_API_SECRET`

### Optional
- **SendGrid API Key** - For email notifications
  - Get from: https://app.sendgrid.com/settings/api_keys

## 🧪 Testing

```bash
# Run TypeScript type checking
npm run check
```

## 📚 Additional Documentation

- [SETUP.md](SETUP.md) - Detailed setup instructions
- [SHOPIFY_MIGRATION_PLAN.md](SHOPIFY_MIGRATION_PLAN.md) - Shopify app migration guide
- [replit.md](replit.md) - Project architecture and preferences

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

This project is licensed under the MIT License.

## 🆘 Support

For issues or questions:
1. Check existing documentation
2. Search closed issues
3. Open a new issue with detailed description

## 🔄 Updates & Maintenance

### Database Migrations

When you modify the schema in `shared/schema.ts`:

```bash
# Push changes to database
npm run db:push

# If you encounter conflicts, use force flag (use with caution)
npm run db:push --force
```

### Updating Dependencies

```bash
npm update
```

---

Built with ❤️ using React, Express, TypeScript, and Drizzle ORM
