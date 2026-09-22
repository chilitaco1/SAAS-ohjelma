# Selko

Selko is a simple invoicing app for sole traders and small businesses in Finland. The interface is in Finnish. Money is shown in euros, for example `5,90 €`.

The name Selko is a working name. To rename the app, change `APP_NAME` in `lib/brand.ts`.

This version is the first slice only. You can open every page and use the menu. Nothing is saved yet. There is no login, no database, and no PDF.

## Decisions already locked in

- One login has one company.
- Invoice numbers look like `INV-1001`, `INV-1002`, `INV-1003`.
- A draft has no invoice number. The number is given when the invoice is sent.
- An overdue invoice is a sent invoice whose due date has passed. Overdue is calculated, not stored as its own status.
- Reference numbers follow the Finnish domestic reference (`viitenumero`).
- The company profile will have a switch for “VAT registered”. When that is on, the default VAT rate is 25.5%.

## Run the app on your computer

You need Node.js 22 installed. Then:

1. Open a terminal in this project folder.
2. Run:

```bash
npm install
npm run dev
```

3. Open [http://localhost:43123](http://localhost:43123) in your browser.

Leave that terminal running while you use the app. Stop it with Ctrl+C.

## What you should see

1. A green sidebar with Etusivu, Laskut, Asiakkaat, Tuotteet, Yritys, and Asetukset.
2. On a phone-width window, the sidebar is hidden and a menu button opens it.
3. The dashboard shows four figures, all zero, and a green **Luo lasku** button.
4. **Luo lasku** opens a page that explains the future invoice form. It does not save anything.
5. Amounts use Finnish formatting, such as `0,00 €`.

## Pages

| Address | Page |
| --- | --- |
| `/` | Etusivu |
| `/laskut` | Laskut |
| `/laskut/uusi` | Uusi lasku |
| `/asiakkaat` | Asiakkaat |
| `/tuotteet` | Tuotteet |
| `/yritys` | Yritys |
| `/asetukset` | Asetukset |

## Where the code lives

| Path | What it is |
| --- | --- |
| `app/` | One file per page. The address in the browser matches the folder name. |
| `app/layout.tsx` | The frame around every page: language, font, and the menu. |
| `components/app-shell.tsx` | The sidebar and the phone menu. |
| `components/ui/` | Ready-made buttons and cards from shadcn/ui. Leave these alone unless a button itself needs a change. |
| `lib/brand.ts` | The product name. |
| `lib/navigation.ts` | The menu items. |
| `lib/money.ts` | Turns cents into Finnish euros. |

## Next step

The next slice is accounts: registration, login, logout, and password reset. That needs a Supabase project, and it will come with click-by-click setup instructions.
