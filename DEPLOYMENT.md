# AgroEye - Deployment Guide

This guide will help you deploy AgroEye independently on your own infrastructure.

## Prerequisites

1. **Node.js** (v18 or higher)
2. **Supabase Account** - [Sign up for free](https://supabase.com)
3. **Git** installed on your machine

## Step 1: Set Up Supabase Project

### 1.1 Create a New Supabase Project

1. Go to [Supabase Dashboard](https://app.supabase.com)
2. Click "New Project"
3. Fill in project details:
   - **Name**: AgroEye (or your preferred name)
   - **Database Password**: Create a strong password (save it securely)
   - **Region**: Choose closest to your users
4. Click "Create new project" and wait for setup to complete

### 1.2 Get Your Project Credentials

1. In your Supabase project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (under "Project URL")
   - **anon public** key (under "Project API keys")
   - **Project Reference ID** (from URL: `https://app.supabase.com/project/[THIS_IS_YOUR_ID]`)

### 1.3 Set Up Database Schema

1. In Supabase dashboard, go to **SQL Editor**
2. Run all migration files from the `supabase/migrations/` directory in order
3. Or use Supabase CLI (see below for CLI setup)

### 1.4 Configure Authentication

1. Go to **Authentication** → **Providers**
2. Enable **Email** provider
3. Go to **Authentication** → **Email Templates** to customize (optional)
4. Go to **Authentication** → **URL Configuration**:
   - Add your app URL to **Redirect URLs** (e.g., `https://your-domain.com/*`)
   - Add your app URL to **Site URL**

### 1.5 Set Up Storage Buckets

1. Go to **Storage** in Supabase dashboard
2. Create the following buckets:
   - `avatars` (public bucket)
   - `crop_images` (public bucket)
3. For each bucket, set appropriate RLS policies (they're in the migrations)

## Step 2: Configure Environment Variables

### 2.1 Create Environment File

1. Copy `.env.example` to `.env`:
   ```bash
   cp .env.example .env
   ```

2. Fill in your Supabase credentials:
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   VITE_SUPABASE_PROJECT_ID=your-project-id-here
   ```

## Step 3: Install Dependencies & Run Locally

```bash
# Install dependencies
npm install

# Run development server
npm run dev

# Build for production
npm run build

# Preview production build
npm run preview
```

## Step 4: Deploy Edge Functions (Optional)

If you want AI features (recommendations, chat assistant):

### 4.1 Install Supabase CLI

```bash
npm install -g supabase
```

### 4.2 Link to Your Project

```bash
supabase login
supabase link --project-ref your-project-id
```

### 4.3 Deploy Functions

```bash
supabase functions deploy ai-recommendations
supabase functions deploy chat-assistant
supabase functions deploy weather-data
supabase functions deploy sensor-data
```

### 4.4 Set Function Secrets (if using OpenAI)

```bash
supabase secrets set OPENAI_API_KEY=your-openai-key
```

## Step 5: Deploy to Production

Choose your preferred hosting platform:

### Option A: Vercel (Recommended)

1. Install Vercel CLI:
   ```bash
   npm install -g vercel
   ```

2. Deploy:
   ```bash
   vercel
   ```

3. Set environment variables in Vercel dashboard:
   - Go to **Settings** → **Environment Variables**
   - Add all variables from your `.env` file

4. Redeploy:
   ```bash
   vercel --prod
   ```

### Option B: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Build your app:
   ```bash
   npm run build
   ```

3. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

4. Set environment variables:
   ```bash
   netlify env:set VITE_SUPABASE_URL "your-url"
   netlify env:set VITE_SUPABASE_ANON_KEY "your-key"
   netlify env:set VITE_SUPABASE_PROJECT_ID "your-id"
   ```

### Option C: GitHub Pages

1. Update `vite.config.ts` with your base path:
   ```typescript
   export default defineConfig({
     base: '/your-repo-name/',
     // ... rest of config
   })
   ```

2. Build:
   ```bash
   npm run build
   ```

3. Deploy using GitHub Actions (create `.github/workflows/deploy.yml`):
   ```yaml
   name: Deploy to GitHub Pages

   on:
     push:
       branches: [ main ]

   jobs:
     deploy:
       runs-on: ubuntu-latest
       steps:
         - uses: actions/checkout@v3
         - uses: actions/setup-node@v3
           with:
             node-version: '18'
         - run: npm ci
         - run: npm run build
           env:
             VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
             VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
             VITE_SUPABASE_PROJECT_ID: ${{ secrets.VITE_SUPABASE_PROJECT_ID }}
         - uses: peaceiris/actions-gh-pages@v3
           with:
             github_token: ${{ secrets.GITHUB_TOKEN }}
             publish_dir: ./dist
   ```

### Option D: Self-Hosted (Docker)

1. Create `Dockerfile`:
   ```dockerfile
   FROM node:18-alpine as build
   WORKDIR /app
   COPY package*.json ./
   RUN npm ci
   COPY . .
   ARG VITE_SUPABASE_URL
   ARG VITE_SUPABASE_ANON_KEY
   ARG VITE_SUPABASE_PROJECT_ID
   ENV VITE_SUPABASE_URL=$VITE_SUPABASE_URL
   ENV VITE_SUPABASE_ANON_KEY=$VITE_SUPABASE_ANON_KEY
   ENV VITE_SUPABASE_PROJECT_ID=$VITE_SUPABASE_PROJECT_ID
   RUN npm run build

   FROM nginx:alpine
   COPY --from=build /app/dist /usr/share/nginx/html
   COPY nginx.conf /etc/nginx/nginx.conf
   EXPOSE 80
   CMD ["nginx", "-g", "daemon off;"]
   ```

2. Create `nginx.conf`:
   ```nginx
   events {
     worker_connections 1024;
   }

   http {
     include /etc/nginx/mime.types;
     default_type application/octet-stream;

     server {
       listen 80;
       server_name localhost;
       root /usr/share/nginx/html;
       index index.html;

       location / {
         try_files $uri $uri/ /index.html;
       }
     }
   }
   ```

3. Build and run:
   ```bash
   docker build -t agroeye \
     --build-arg VITE_SUPABASE_URL=your-url \
     --build-arg VITE_SUPABASE_ANON_KEY=your-key \
     --build-arg VITE_SUPABASE_PROJECT_ID=your-id \
     .
   
   docker run -p 80:80 agroeye
   ```

## Step 6: Configure Custom Domain (Optional)

### For Vercel:
1. Go to project settings → **Domains**
2. Add your custom domain
3. Update DNS records as instructed

### For Netlify:
1. Go to **Domain settings**
2. Add custom domain
3. Update DNS records

### Update Supabase Redirect URLs:
1. Go to Supabase **Authentication** → **URL Configuration**
2. Add your custom domain to allowed redirect URLs

## Troubleshooting

### Build Errors

**Error: Cannot find module '@/...'**
- Make sure `tsconfig.json` has correct path mappings
- Run `npm install` again

**Vite build fails**
- Clear cache: `rm -rf node_modules/.vite`
- Rebuild: `npm run build`

### Authentication Issues

**Users can't sign up**
- Check Supabase **Authentication** → **Providers** has Email enabled
- Check **URL Configuration** includes your app URL
- Verify email confirmation is disabled for testing (Auth → Settings)

**Session not persisting**
- Check browser allows cookies
- Verify VITE_SUPABASE_URL is correct
- Check browser console for errors

### Database Issues

**Tables not found**
- Run all migrations in Supabase SQL Editor
- Check **Database** → **Tables** to verify tables exist
- Verify RLS policies are enabled

**Permission denied**
- Check RLS policies in your migrations
- Verify user is authenticated
- Check Supabase logs in **Logs** → **Postgres Logs**

### PWA Issues

**App not installable**
- Verify `manifest.json` is accessible
- Check icons exist in `public/` folder
- Ensure HTTPS is enabled (required for PWA)
- Check browser console for manifest errors

**Service Worker not working**
- Clear browser cache and service workers
- Check `sw.js` is accessible at `/sw.js`
- Verify HTTPS (SW requires secure context)

## Environment-Specific Configuration

### Development
```bash
npm run dev
```

### Staging
```bash
# Create .env.staging
VITE_SUPABASE_URL=your-staging-supabase-url
VITE_SUPABASE_ANON_KEY=your-staging-key

# Build and preview
npm run build
npm run preview
```

### Production
```bash
# Use production environment variables
npm run build
```

## Monitoring & Maintenance

1. **Supabase Logs**: Monitor in dashboard → **Logs**
2. **Error Tracking**: Consider adding Sentry or similar
3. **Analytics**: Add Google Analytics or Plausible
4. **Backups**: Configure automatic backups in Supabase
5. **Updates**: Regularly update dependencies:
   ```bash
   npm update
   npm audit fix
   ```

## Security Best Practices

1. **Never commit `.env` file** - it's in `.gitignore`
2. **Use Row Level Security (RLS)** - already configured in migrations
3. **Keep dependencies updated** - run `npm audit` regularly
4. **Use HTTPS** - required for PWA and secure authentication
5. **Set strong database password** in Supabase
6. **Enable 2FA** on your Supabase account
7. **Review and rotate API keys** periodically

## Support & Resources

- **Supabase Docs**: https://supabase.com/docs
- **Vite Docs**: https://vitejs.dev
- **React Docs**: https://react.dev
- **AgroEye GitHub**: [Your repository URL]

## License

[Your chosen license]
