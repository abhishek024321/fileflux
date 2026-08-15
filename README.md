# Format Press — Word/PDF/Image/Office file converter

A full-stack file converter: React (Vite) frontend + Node/Express backend
covering all 19 conversions you asked for.

```
converter-app/
  backend/     Express API — does the actual conversion work
  frontend/    React UI — upload, pick format, download result
```

## Why a backend is required

Browsers can't natively parse `.docx`/`.pptx`/`.xlsx` or render PDF pages,
so most of these conversions can't happen client-side. This project routes
office-format conversions through **LibreOffice headless** — the same
underlying approach used by most "free online converter" sites — plus a
few specialized libraries for the rest:

| Conversion | How it's done |
|---|---|
| Word ⇄ PDF, PPT ⇄ PDF, Excel ⇄ PDF, RTF → PDF/Word, TXT → PDF/Word | LibreOffice headless (`libreoffice-convert`) |
| Word/PDF → JPG/PNG | LibreOffice → PDF, then `pdf-poppler` renders pages to images |
| JPG/PNG → PDF | `pdf-lib` (no LibreOffice needed) |
| HTML → PDF | Puppeteer (headless Chrome — best fidelity for CSS/fonts) |
| HTML → Word | `html-to-docx` |
| CSV ⇄ Excel | `xlsx` (SheetJS) — no LibreOffice needed |

## Setup

### 1. System dependencies (backend host)

```bash
# LibreOffice — needed for Word/PPT/Excel/RTF/TXT conversions
sudo apt install libreoffice        # Debian/Ubuntu
brew install libreoffice            # macOS

# Poppler — needed for PDF → image rendering
sudo apt install poppler-utils      # Debian/Ubuntu
brew install poppler                # macOS
```

### 2. Backend

```bash
cd backend
npm install
npm start        # runs on http://localhost:4000
```

### 3. Frontend

```bash
cd frontend
npm install
npm run dev       # runs on http://localhost:5173
```

Create `frontend/.env` if your backend isn't on `localhost:4000`:

```
VITE_API_BASE=https://your-api-domain.com
```

## Honest limitations to know about

- **PDF → PPT and PDF → Excel** are the weakest conversions in this space
  industry-wide — LibreOffice will produce a file, but PDFs don't store
  "this is a table" or "this is a slide" structurally, so results can be
  rough on complex layouts. Set expectations with users accordingly.
- **PDF → Word** works well for text-heavy documents, less well for
  complex multi-column layouts.
- Puppeteer downloads a bundled Chromium (~200MB) on `npm install` — fine
  locally, but factor it into your deployment image size / build time.
- The backend currently processes files synchronously and stores nothing
  — good for privacy, but for a production site with real traffic you'll
  want a job queue (e.g. BullMQ + Redis) so a big PDF doesn't block other
  users' requests, plus file-size limits on the upload middleware.

## Deployment notes

LibreOffice + Poppler + Puppeteer's Chromium make this backend too heavy
for most serverless platforms (Vercel/Netlify functions, etc.). It runs
well on:
- A regular VM (EC2, DigitalOcean Droplet, Fly.io, Railway)
- A Docker container — write a Dockerfile based on `node:20` with
  `apt-get install libreoffice poppler-utils` added
- The frontend, by contrast, is fully static and deploys anywhere
  (Vercel, Netlify, Cloudflare Pages) — just point `VITE_API_BASE` at
  your backend's URL.
