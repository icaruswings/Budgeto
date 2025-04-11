# Remix Prime Stack

[DESCRIPTION]

## Features

[TECHNICAL FEATURES]

## Getting Started

### Prerequisites

- Node.js 18+
- npm/yarn
- Stripe Account
- Clerk Account
- Convex Account

### Environment Variables

Create a `.env.local` file with:

```bash
NEXT_PUBLIC_CONVEX_URL=your_convex_url
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=your_clerk_key
CLERK_SECRET_KEY=your_clerk_secret
STRIPE_SECRET_KEY=your_stripe_secret
STRIPE_WEBHOOK_SECRET=your_webhook_secret
NEXT_PUBLIC_APP_URL=http://localhost:3000
```

### Installation

```bash
# Clone the repository
git clone https://github.com/sonnysangha/ticket-marketplace-saas-nextjs15-convex-clerk-stripe-connect

# Install dependencies
npm install

# Start the development server
npm run dev

# In a separate terminal, start Convex
npx convex dev
```

### Setting up Clerk

1. [Create a Clerk application](https://clerk.com)
2. Configure authentication providers
3. Set up redirect URLs
4. Add environment variables

### Setting up Convex

1. [Create a Convex account](https://convex.dev)
2. Create a new project
3. Install the Convex CLI:
   ```bash
   npm install convex
   ```
4. Initialize Convex in your project:
   ```bash
   npx convex init
   ```
5. Copy your deployment URL from the Convex dashboard and add it to your `.env.local`:
   ```bash
   CONVEX_URL=your_deployment_url
   ```
6. Start the Convex development server:
   ```bash
   npx convex dev
   ```

Note: Keep the Convex development server running while working on your project. It will sync your backend functions and database schema automatically.
