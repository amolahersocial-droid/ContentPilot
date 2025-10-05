# SEO Content SaaS Platform

## Overview

This platform is a fully automated, production-ready SaaS solution for generating and publishing SEO-optimized content to WordPress and Shopify sites. Its core purpose is to streamline content creation, enhance SEO performance, and automate publishing workflows. The platform leverages advanced AI for content and image generation, comprehensive SEO validation, and robust background processing for efficiency. It aims to serve businesses and individuals seeking to scale their content marketing efforts, offering features like subscription management, scheduled posting, and an admin dashboard for platform oversight.

## User Preferences

- **Design**: Dark mode default, purple primary color
- **Architecture**: Schema-first, horizontal batching, background jobs
- **Quality**: Frontend excellence priority, accessibility focus
- **Compliance**: WordPress 2025 standards, Shopify app guidelines
- **Payments**: Razorpay (not Stripe)
- **Processing**: Async job queue for all content generation and publishing

## System Architecture

The platform follows a client-server architecture. The frontend is built with **React, TypeScript, Wouter, TanStack Query, Shadcn UI, and Tailwind CSS**, supporting dark mode and ensuring a high-quality user experience. The backend is an **Express.js** server, utilizing **PostgreSQL (Neon)** with **Drizzle ORM** for type-safe database interactions.

**Core Technical Implementations:**
- **Content Generation**: AI-powered article generation using OpenAI GPT-5 and contextual image creation with DALL·E 3.
- **SEO Optimization**: Integrated validator performs Flesch-Kincaid readability scoring, meta tag validation, heading structure analysis, keyword density calculation, alt tag coverage, and duplicate content detection.
- **Site Integration**: Direct publishing to WordPress (via REST API with Application Passwords) and Shopify (via Admin API with Theme App Extensions).
- **Advanced Site Crawler**: Configurable depth, `robots.txt` parsing, metadata extraction, link mapping, and polite crawling.
- **Background Processing**: **Bull job queue with Redis** manages asynchronous tasks across three queue types: Content Generation, Publishing, and Scheduled Posts, featuring real-time progress tracking and error handling with retries.
- **Security**: Comprehensive measures include rate limiting, Helmet CSP, input sanitization, XSS protection, `express-validator` for request validation, and Drizzle ORM for SQL injection prevention.
- **Subscription Management**: Integrates with Razorpay for secure payment processing and subscription lifecycle management, featuring feature gating based on user plans.
- **Scheduled Publishing**: Hourly scheduler for automated daily post generation and publishing at customizable times, selecting random keywords from a site's configured list.

**Design System:**
- **Colors**: Primary purple, dark mode default with light mode support, semantic tokens for status.
- **Components**: Cards with subtle elevation, varied button styles, badges, sortable/paginated data tables, React Hook Form with Zod validation, and modal dialogues.
- **Typography**: Bold, hierarchical headings; readable body text with good contrast; muted styles for secondary information.

## External Dependencies

- **OpenAI API**: For GPT-5 (content generation) and DALL·E 3 (image generation).
- **WordPress REST API**: For integration and content publishing to WordPress sites.
- **Shopify Admin API**: For integration and content publishing to Shopify sites.
- **Razorpay**: For secure payment gateway services, subscription management, and webhooks.
- **PostgreSQL (Neon)**: Cloud-hosted relational database.
- **Redis**: In-memory data store, primarily used by Bull for the job queue.