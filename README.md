# NismoChain — Nissan NISMO Shop, ERP & Blockchain Ledger

Pick a Nissan NISMO model, configure it, place an order, and every purchase is hashed into a
tamper-evident ledger while totals roll up into the ERP and Sales Records pages.

Built with [Lovable](https://lovable.dev) · continue in the
[Lovable editor](https://lovable.dev/projects/217a3407-0c05-42d8-bde5-36c7a349d8e2).

## Features

- Car configurator with live pricing in Philippine pesos, paint/wheel/interior previews
- Nationwide Philippine delivery lookup with exact map pin (Google Maps)
- "Order is confirmed" email to the buyer's address (Gmail)
- SHA-256 hash-chained ledger, ERP totals, sales records with CSV export
- All orders stored in the database

## Run it in VS Code

You need [Node.js](https://github.com/nvm-sh/nvm#installing-and-updating) 20+ and npm.

```sh
git clone <this-repository-url>
cd <repository-name>
npm install
cp .env.example .env   # Windows: copy .env.example .env
npm run dev
```

Open http://localhost:8080.

### Filling in .env

`.env` is not committed, so a fresh clone has no keys. Open your project in Lovable and copy the
values from **Project Settings → Secrets / Connectors** into `.env`:

| Variable | What it powers |
| --- | --- |
| `VITE_SUPABASE_URL`, `VITE_SUPABASE_PUBLISHABLE_KEY`, `VITE_SUPABASE_PROJECT_ID` | Saving and reading orders |
| `SUPABASE_URL`, `SUPABASE_PUBLISHABLE_KEY`, `SUPABASE_PROJECT_ID` | Same values, used on the server |
| `LOVABLE_API_KEY` | Authenticates the Maps and Gmail calls |
| `GOOGLE_MAPS_API_KEY` | Delivery address lookup and map pin |
| `GOOGLE_MAIL_API_KEY` | Sending the order confirmation email |

Restart `npm run dev` after editing `.env`. If a key is missing, the app tells you exactly which
variable to add instead of failing silently.

Maps and email calls always run on the server (never in the browser), so these keys stay private.

## Scripts

- `npm run dev` — start the dev server on port 8080
- `npm run build` — production build
- `npm run preview` — preview the production build
- `npm run lint` — lint the project
