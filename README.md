# Careers Portal

An English-language Next.js application for browsing career departments,
submitting applications, and reviewing candidates, interview evaluations, and
training needs analysis (TNA).

## Local development

Requires Node.js 20.9 or later. Install dependencies:

```bash
npm ci
```

In PowerShell, set the HR key and start the application in the same terminal:

```powershell
$env:HR_API_KEY = "replace-with-a-long-random-secret"
npm run dev
```

Open [http://localhost:3000](http://localhost:3000). Applicants can start from
the home page or scan a QR code pointing to `/apply?sector=nursing`. Supported
department IDs are `drs`, `nursing`, `nursing_support`, `admin`, and `operation`.
The legacy IDs `doctors`, `operations`, and `administration` remain supported.
Open `/dashboard` and enter the `HR_API_KEY` value to review and evaluate
applications. The pipeline starts each new candidate at HR Interview, then
supports Technical Interview, HR Manager Review, Offer Issued, or Rejected.
Each interview evaluation and TNA is retained in the candidate history. The HR
key is never included in client bundles.

Validation commands:

```bash
npm run lint
npm run build
```

## API

- `POST /api/applications`: validate and store an application.
- `GET /api/applications`: list applications; requires
  `Authorization: Bearer <HR_API_KEY>`.
- `PATCH /api/applications/:id`: create or update an interview evaluation and
  training needs, and move or close the candidate's pipeline stage; requires
  the HR key.

## Deployment notes

This prototype stores records in a local JSON file at
`data/applications.json` and uploaded resumes in `data/private-resumes/`. Both
locations are excluded from Git because they contain personal data. Resume
uploads are limited to PDF, DOC, or DOCX files up to 5 MB, and downloads require
HR authorization. Local file storage is not suitable for multi-server
deployments or hosts with ephemeral filesystems; use a persistent, encrypted
database and private object storage before accepting real applications. Set a
strong `HR_API_KEY` using the
deployment platform's secret manager and use HTTPS. A shared HR key is only
basic access protection and is not a replacement for individual staff
accounts, role-based permissions, or access auditing in production.
