# Self-Hosting AgroEye with Your Own Supabase Project

This guide walks you through running AgroEye independently with your own Supabase project.

## Prerequisites

- A [Supabase](https://supabase.com) account and project
- [Node.js](https://nodejs.org/) 18+
- [Supabase CLI](https://supabase.com/docs/guides/cli) installed
- An [OpenAI API key](https://platform.openai.com/api-keys) for AI features
- (Optional) Android Studio for native Android builds

## Step 1: Export from GitHub

1. In Lovable, go to **Settings → GitHub** and export the project
2. Clone the repo locally:
   ```bash
   git clone https://github.com/YOUR_USERNAME/YOUR_REPO.git
   cd YOUR_REPO
   ```

## Step 2: Configure Environment

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your_supabase_anon_key
VITE_SUPABASE_PROJECT_ID=your_project_id
```

Find these values in your Supabase Dashboard → Settings → API.

## Step 3: Set Up Database

**Option A (Easiest):** Copy the contents of `supabase/setup.sql` and paste it into your Supabase Dashboard → SQL Editor → New Query → Run. This single file creates all tables, RLS policies, functions, and triggers.

**Option B (Supabase CLI):**
```bash
supabase link --project-ref YOUR_PROJECT_ID
supabase db push
```

## Step 4: Create Storage Buckets

In Supabase Dashboard → Storage, create two **public** buckets:
- `avatars`
- `crop_images`

## Step 5: Deploy Edge Functions

### Set Secrets
```bash
supabase secrets set OPENAI_API_KEY=your_openai_api_key
```

### Deploy Functions
```bash
supabase functions deploy chat-assistant
supabase functions deploy ai-recommendations
supabase functions deploy pest-detection
supabase functions deploy yield-prediction
supabase functions deploy sensor-data
supabase functions deploy lora-webhook
supabase functions deploy weather-data
```

### LoRa Gateway Setup (Optional)
If using LoRa sensors, configure your gateway's HTTP integration:
- **TTN**: Applications → Integrations → Webhooks → Add → URL: `https://YOUR_PROJECT_ID.supabase.co/functions/v1/lora-webhook`
- **Chirpstack**: Applications → Integrations → HTTP → URL: same as above

## Step 6: Run the App

```bash
npm install
npm run dev
```

Visit `http://localhost:5173` in your browser.

## Step 7: Native Android (Optional)

```bash
npm run build
npx cap add android
npx cap sync android
npx cap run android
```

## AI Configuration

All edge functions support **dual AI providers**:

| Priority | Secret Key | Provider | Model |
|----------|-----------|----------|-------|
| 1st | `OPENAI_API_KEY` | OpenAI | gpt-4o-mini |
| 2nd | `LOVABLE_API_KEY` | Lovable AI Gateway | gemini-2.5-flash |

When self-hosting, set `OPENAI_API_KEY` in your Supabase secrets. The functions will automatically use OpenAI.

## Troubleshooting

- **Auth not working**: Make sure you've enabled Email auth in Supabase Dashboard → Authentication → Providers
- **Edge functions failing**: Check that `OPENAI_API_KEY` is set via `supabase secrets list`
- **Database errors**: Ensure all migrations ran successfully and RLS policies are in place
- **CORS issues**: Edge functions include CORS headers; ensure your app URL is correct
