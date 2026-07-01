# MoneyForLife GPT

MoneyForLife GPT is a polished static demo for a personal finance web app. It is built to be playable immediately, then upgraded to Supabase Auth and Postgres when credentials are ready.

## Demo Features

- Dashboard with income, expense, balance, savings rate, and life score
- Add and delete transactions
- Budget progress by category
- Savings goals
- Smart insight panel
- Local demo persistence using `localStorage`
- Supabase-ready schema with Row Level Security

## Run Locally

Open `index.html` directly, or run a tiny static server:

```bash
python3 -m http.server 4173
```

Then open:

```text
http://localhost:4173
```

## Deploy To Vercel

This project is static. In Vercel, set the project root to this folder and deploy. No build command is required.

## Supabase Setup

1. Create a Supabase project.
2. Open SQL Editor.
3. Run `supabase/migrations/001_initial_schema.sql`.
4. Enable Google provider in Supabase Auth.
5. Replace the demo localStorage adapter in `app.js` with Supabase queries.

For a production version, the next step should be converting this static prototype into Next.js so auth callbacks, protected routes, and server-side operations are cleaner.
