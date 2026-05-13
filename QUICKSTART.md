# AgroEye - Quick Start Deployment Guide

## Download the Project

### Option 1: Download from Lovable
1. Click the **Download** button in the Lovable interface
2. Extract the ZIP file to your desired location
3. Navigate to the extracted folder

### Option 2: Clone from GitHub (if you've pushed it)
```bash
git clone https://github.com/YOUR_USERNAME/agroeye.git
cd agroeye
```

## Setup Instructions

### 1. Install Dependencies
```bash
npm install
```

### 2. Configure Environment Variables
Copy the example environment file and fill in your Supabase credentials:
```bash
cp .env.example .env
```

Edit `.env` with your values:
```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

### 3. Run Locally
```bash
# Development mode
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Deployment Options

### Quick Deploy with Docker
```bash
# Build and run
docker-compose up -d
```
Access at: http://localhost

### Deploy to Vercel (Easiest)
```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

### Deploy to Netlify
```bash
# Install Netlify CLI
npm i -g netlify-cli

# Deploy
netlify deploy --prod --dir=dist
```

### Self-Host on Your Server
1. Build the app: `npm run build`
2. Upload the `dist/` folder to your server
3. Configure nginx/apache to serve the files
4. Or use the Docker setup for easier deployment

## What You Need

### Required
- Node.js 18+ installed
- A Supabase account (free tier works)
- Your own domain (optional)

### Supabase Setup
1. Go to https://supabase.com
2. Create a new project
3. Get your API credentials from Project Settings → API
4. Run the SQL migrations from `supabase/migrations/` in your Supabase SQL editor
5. Deploy the edge functions from `supabase/functions/` using Supabase CLI

## Full Documentation
See `DEPLOYMENT.md` for comprehensive deployment instructions and troubleshooting.

## Support
For detailed configuration, architecture, and advanced deployment options, refer to:
- `DEPLOYMENT.md` - Full deployment guide
- `README.md` - Project overview
- `SENSOR_INTEGRATION.md` - Hardware integration guide
