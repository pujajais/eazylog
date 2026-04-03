# EazyLog — Health Symptom Tracker

## Overview
EazyLog is a web app for chronic pain patients who struggle to type during pain episodes. It provides multiple low-friction ways to log symptoms: voice input, quick-tap presets, and an interactive body map.

## Tech Stack
- **Framework**: Next.js 14 (App Router, TypeScript)
- **Styling**: Tailwind CSS with custom warm/calming design tokens
- **Auth & Database**: Supabase (email auth + PostgreSQL with RLS)
- **AI**: Anthropic Claude API for symptom parsing and doctor report generation
- **3D**: Three.js via @react-three/fiber for body map
- **Charts**: Recharts for dashboard visualizations
- **PWA**: next-pwa for installable mobile experience

## Project Structure
```
src/
├── app/
│   ├── page.tsx                 # Landing page
│   ├── layout.tsx               # Root layout with fonts and providers
│   ├── globals.css              # Tailwind + custom styles
│   ├── manifest.ts              # PWA manifest
│   ├── auth/
│   │   └── callback/route.ts    # Supabase auth callback
│   ├── log/page.tsx             # Voice/text symptom logging
│   ├── quick-tap/page.tsx       # One-tap preset logging
│   ├── dashboard/page.tsx       # Analytics and doctor reports
│   ├── body-map/page.tsx        # 3D interactive body map
│   └── api/
│       ├── parse-symptom/route.ts   # Claude parses free-text into structured data
│       └── doctor-report/route.ts   # Claude generates doctor-ready summaries
├── components/
│   ├── Navigation.tsx           # Bottom nav bar
│   ├── AuthForm.tsx             # Login/signup form
│   └── BodyModel.tsx            # Three.js body model
└── lib/
    ├── supabase/
    │   ├── client.ts            # Browser Supabase client
    │   └── server.ts            # Server-side Supabase client
    └── types.ts                 # TypeScript types
```

## Design System
- **Primary**: Sage green `#5B8C7B`
- **Background**: Cream `#FAF7F2`
- **Accent**: Terracotta `#D4956A`
- **Font**: Georgia (serif) — warm and readable
- **Vibe**: Calming, gentle, like a kind friend. NOT clinical.

## AI Safety Rules
- Never diagnose conditions
- Never give medical advice
- Only structure and reflect symptoms back
- Escalate emergencies (chest pain, breathing difficulty) with "call 911" message

## Database
See `supabase-schema.sql` for full schema with RLS policies. Key tables:
- `profiles` — extends auth.users
- `symptom_entries` — core symptom data with parsed fields
- `quick_tap_presets` — customizable per-user quick-tap buttons
- `follow_ups` — AI follow-up Q&A per entry
- `doctor_reports` — generated summaries

## Commands
- `npm run dev` — start dev server
- `npm run build` — production build
- `npm run lint` — ESLint
