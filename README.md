# Algaeo.io — Crop Intelligence Platform

A Next.js 14 + Supabase + Tailwind CSS application for crop projection, soil intelligence, and AgTurbo formula analysis. Built as a PWA for tractor-mounted tablets.

---

## Tech Stack

- **Frontend**: Next.js 14 (App Router), JavaScript, Tailwind CSS
- **Backend**: Supabase (Auth, PostgreSQL + PostGIS, Storage)
- **Charts**: Chart.js + react-chartjs-2
- **PWA**: next-pwa
- **Fonts**: DM Mono + Syne (Google Fonts)

---

## Project Structure

```
src/
  app/
    page.js              ← Root redirect (auth check)
    layout.js            ← Root layout + fonts
    globals.css          ← Global styles + CSS variables
    auth/page.js         ← Sign in / Sign up
    dashboard/page.js    ← Crop projection dashboard
    agtturbo/page.js     ← AgTurbo formula + comparison charts
    calculator/page.js   ← Cost-savings calculator
  components/
    layout/Navbar.js     ← Top navigation bar
    charts/Charts.js     ← All Chart.js wrappers
  lib/
    supabase.js          ← Supabase browser client
    cropConfig.js        ← All crop models + AgTurbo formula data
supabase/
  migrations/
    001_init.sql         ← PostGIS + all tables + RLS policies
public/
  manifest.json          ← PWA manifest
```

---

## Quick Start

### 1. Install dependencies

```bash
npm install
```

### 2. Set up environment variables

Copy `.env.local.example` to `.env.local` and fill in your Supabase credentials:

```bash
cp .env.local.example .env.local
```

```env
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
```

You can find these in your Supabase project under **Settings → API**.

### 3. Set up the database

In your Supabase project, go to **SQL Editor** and run the contents of:

```
supabase/migrations/001_init.sql
```

This creates:
- `profiles` table (extended user data collected at signup)
- `fields` table (PostGIS polygon storage)
- `crop_projections` table (saved projection runs)
- Row Level Security policies
- Auto-profile trigger on new user signup

### 4. Enable Google OAuth (optional)

In Supabase: **Authentication → Providers → Google**

Add your Google OAuth credentials. Set the redirect URL to:
```
https://your-domain.com/dashboard
```

### 5. Run the dev server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

---

## Deploy to Vercel

```bash
# Install Vercel CLI
npm i -g vercel

# Deploy
vercel --prod
```

Add your environment variables in the Vercel dashboard under **Settings → Environment Variables**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## Features

### Authentication
- Email/password sign up collecting: first name, last name, email, farm name, state, primary crop
- Google OAuth
- Session-based routing (unauthenticated users redirected to `/auth`)

### Crop Projections (`/dashboard`)
7 crop models with live inputs and 4 charts each:
| Crop | Cost Lever | Profit Lever |
|---|---|---|
| Corn | Nitrogen ($/lb) | Test Weight / Bushels |
| Soybeans | P & K Inputs | Pod Retention (R1–R3) |
| Peanuts | Fungicide / Calcium | TSMK % Grade |
| Tomatoes | Irrigation / Labor | Brix (Sugar Content) |
| Berries | Soil Acidifiers | Packable Yield / Cull Rate |
| Pasture | Hay / Urea | Grazing Days Extension |
| Miscanthus | Harvest Fuel | Dry Biomass Tons |

### AgTurbo Formula (`/agtturbo`)
- Full 18-ingredient formula grid with color-coded ingredient types
- Multi-crop yield comparison bar chart
- Microbial activity index line chart (3 key strains)
- Nutrient uptake radar chart (AgTurbo vs. synthetic)
- Priority metrics summary table

### Cost-Savings Calculator (`/calculator`)
- Live inputs: field size, N cost, N application rate, Algaeo cost
- KPI cards: N savings, Algaeo investment, net savings, ROI multiple
- 5-year cumulative savings bar chart (3% annual N inflation)
- Links to algaeo.com for product details

---

## Supabase Schema

```sql
profiles          -- user metadata (farm, state, crop)
fields            -- PostGIS field boundaries
crop_projections  -- saved projection runs (inputs + outputs as JSONB)
```

All tables have Row Level Security enabled — users only see their own data.

---

## PWA

The app is configured as a Progressive Web App via `next-pwa`. On mobile or tablet:
1. Open in browser
2. Tap **Add to Home Screen**
3. Runs in standalone mode — no App Store required

Add 192×192 and 512×512 PNG icons to `/public/` named `icon-192.png` and `icon-512.png` for full PWA icon support.

---

## Environment Variables Reference

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Your Supabase anon/public key |

---

## Links

- Product: [algaeo.com](https://algaeo.com)
- Platform: [algaeo.io](https://algaeo.io)
