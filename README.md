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

## Production deployment (Vercel + Supabase)

Production requires Supabase. The local JSON/file store is used only during
development; the app refuses to use it in production so applications are not
silently lost on an ephemeral host.

1. Create a Supabase project and open **SQL Editor → New query**.
2. Run [`supabase/schema.sql`](./supabase/schema.sql) to create the private
   applications table and private resume bucket. The table is not readable by
   anonymous visitors; the server uses the service-role key.
3. In Supabase, open **Project Settings → API** and copy the Project URL and
   `service_role` secret key. Keep the service-role key private; never use it
   in a `NEXT_PUBLIC_*` variable or share it in chat.
4. In Vercel, import `hussmony34-cmyk/SGHRecruitment22` and add these
   environment variables under **Project Settings → Environment Variables**:
   `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `HR_API_KEY`. Use the
   Supabase Project URL and service-role key from step 3, and generate a
   separate long random value for `HR_API_KEY`.
5. Deploy. After adding or changing environment variables, redeploy so the
   server picks them up. The public application is at `/apply`; HR signs in at
   `/dashboard` with the `HR_API_KEY`.

For local testing, copy `.env.example` to `.env.local`, fill in the values
locally, then run `npm run dev`. Never commit `.env.local`.

Resume uploads are private and limited to PDF, DOC, or DOCX files up to 5 MB.
HR-authorized downloads are streamed through the server. Existing records in
the local `data/applications.json` file and resumes in `data/private-resumes/`
are not automatically copied to Supabase; migrate only records you have
authorization to transfer. Protect HR access, restrict dashboard access, and
set an appropriate data-retention policy before inviting real applicants.
