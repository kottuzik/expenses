# תוכנית Milestone 1 – הקמת מערכת מאובטחת וכניסה משפחתית

> מבוסס על `MILESTONES.md` (Milestone 1), `ARCHITECTURE.md` (סעיפים 1, 3, 4, 8, 9), `DESIGN.md` (1.1, 1.3, 1.12, ניווט, פריסת Desktop, Style Guide) ו-`PRD.md` (4.8).
> מצב נוכחי: אין קוד בפרויקט – רק `spec/`, `CLAUDE.md`, `.gitignore`.

## 1. מטרה ותוצר

אפליקציית Next.js שרצה מקומית ומחוברת **רק** ל-Supabase Development בענן. המשתמש מזין סיסמה משפחתית (ללא Email), נכנס ל״לוח בקרה״ מוגן וריק מנתונים, מנווט במעטפת (Bottom Navigation במובייל / ניווט צד ב-Desktop) ומתנתק.

**מחוץ לטווח של Milestone זה:** הוצאות/קטגוריות, שחזור סיסמה (מסך ״שכחתי סיסמה״ – Milestone 6), שינוי סיסמה, Realtime, PWA, R2, Vercel, Production, `CRON_SECRET`.

## 2. שלבי עבודה (סדר הבנייה)

### שלב A – שלד הפרויקט
1. `create-next-app` בשורש הפרויקט: TypeScript, App Router, ESLint, תיקיית `src/`, **ללא Tailwind**, alias `@/*`. גרסת Next.js היציבה העדכנית (16.x – משתמשת ב-`proxy.ts` במקום `middleware.ts`).
2. תלויות:
   - Runtime: `@supabase/ssr`, `@supabase/supabase-js`, `zod`, `lucide-react` (אייקוני קו נקיים כמו ב-Style Guide).
   - Dev: `vitest`, `@vitejs/plugin-react`, `jsdom`, `@testing-library/react`, `@testing-library/jest-dom`, `@testing-library/user-event`, `@playwright/test`, `supabase` (CLI, לניהול Migrations מרחוק בלבד), `tsx`, `dotenv`.
   - React Hook Form, TanStack Query, Recharts, date-fns, Papa Parse – **לא** מותקנים עכשיו; יותקנו ב-Milestone שבו נדרשים לראשונה.
3. הוספה ל-`.gitignore` (בלי להסיר דבר): `next-env.d.ts` אינו נדרש להחרגה; לוודא ש-`playwright/.auth/` מוחרג (קובץ Session של בדיקות).

### שלב B – הקמת Supabase Development (הדרכה צעד אחר צעד למשתמש)
Claude עוצר ומדריך בשפה פשוטה; המשתמש מבצע בעצמו:
1. יצירת חשבון Supabase (אם אין) ו**פרויקט אחד** בשם למשל `expenses-dev`, אזור קרוב (למשל Frankfurt), שמירת סיסמת ה-DB במקום בטוח.
2. **Authentication → Sign In / Providers:** כיבוי ״Allow new users to sign up״; Email provider נשאר פעיל; כיבוי ״Confirm email״ אינו נדרש.
3. **Authentication → Users → Add user → Create new user:** כתובת Email של המשפחה + הסיסמה המשפחתית ל-Development, סימון ״Auto Confirm User״. העתקת ה-**User UID**.
4. **Password settings:** אורך מינימלי 8.
5. **JWT / Sessions:** Access token expiry = `600` שניות (10 דקות).
6. **Project Settings → API Keys:** העתקת Project URL, Publishable key, Secret key.
7. **Connect → Session pooler connection string** (לצורך הרצת Migrations בלבד).
8. מילוי הערכים ב-`.env` (Claude לא קורא את הקובץ).

Production, R2 ו-Vercel **אינם** מוקמים.

### שלב C – משתני סביבה
`.env.example` (שמות בלבד, בלי ערכים), ואז העתקה חד-פעמית ל-`.env`:

| משתנה | שימוש |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | כתובת פרויקט Dev |
| `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` | מפתח ציבורי (מוגן ב-RLS) |
| `SUPABASE_SECRET_KEY` | שרת בלבד – לעולם לא בקוד לקוח |
| `FAMILY_USER_ID` | ה-UID של המשתמש הטכני |
| `SITE_URL` | `http://localhost:3000` – בדיקת Origin (CSRF) |
| `DATABASE_URL` | מחרוזת חיבור Dev – **רק** להרצת Migrations מהמחשב המקומי |
| `E2E_FAMILY_PASSWORD` | סיסמת ה-Dev, לבדיקות אוטומטיות בלבד |

קובץ `src/lib/env.ts` מאמת את המשתנים עם Zod ומפריד בין `serverEnv` (נטען רק בשרת, עם `import 'server-only'`) ל-`publicEnv`.

### שלב D – Migration ראשון (`supabase/migrations/<timestamp>_infrastructure.sql`)
- `supabase init` (יוצר `supabase/config.toml`; לא מריצים Supabase מקומי).
- טבלאות:
  - `app_state` – `id smallint PK CHECK (id = 1)`, `maintenance_mode boolean NOT NULL DEFAULT false`, `maintenance_until timestamptz`, `restore_id uuid`, `updated_at timestamptz NOT NULL DEFAULT now()`; INSERT של השורה היחידה (`ON CONFLICT DO NOTHING`).
  - `change_signals` – `id smallint PK CHECK (id = 1)`, `data_epoch bigint NOT NULL DEFAULT 0`, `auth_epoch bigint NOT NULL DEFAULT 0`, `changed_at timestamptz NOT NULL DEFAULT now()`; שורה יחידה.
  - `login_attempts` – `id bigint GENERATED ALWAYS AS IDENTITY PK`, `kind text NOT NULL CHECK (kind IN ('login','reset'))`, `ip_hash text NOT NULL`, `created_at timestamptz NOT NULL DEFAULT now()`; אינדקס `(kind, ip_hash, created_at)`.
- RLS מופעל על שלוש הטבלאות; `REVOKE ALL` מ-`anon` ומ-`authenticated`, ואז:
  - `change_signals`: `GRANT SELECT` + Policy SELECT ל-`authenticated` (נדרש ל-Realtime ב-Milestone 4).
  - `app_state`, `login_attempts`: אין Policies – גישה מהשרת בלבד (Secret key).
- פונקציה `public.session_created_at(p_session_id uuid) RETURNS timestamptz` – `SECURITY DEFINER`, `SET search_path = ''`, מחזירה את `created_at` מ-`auth.sessions` (או `NULL` אם ה-Session לא קיים/בוטל). `REVOKE EXECUTE` מ-`public`, `anon`, `authenticated`; `GRANT EXECUTE` ל-`service_role` בלבד.
- הרצה: `npm run db:push` → `supabase db push --db-url "$DATABASE_URL"` (עם `--dry-run` קודם), **רק מול Dev**.

### שלב E – תשתית שרת ואבטחה (`src/lib/`)
- `clock.ts` – `now(): Date` יחיד לכל לוגיקה תלוית-זמן; `setNow(date | null)` לבדיקות בלבד (חוסם שימוש כש-`NODE_ENV === 'production'`).
- `supabase/server.ts` – `createServerClient` עם `cookies()` של Next (getAll/setAll + headers).
- `supabase/admin.ts` – לקוח עם Secret key, ללא Session, `server-only`.
- `auth/session.ts` – `checkSession(supabase)`:
  1. `auth.getClaims()` (אימות JWT);
  2. `session_id` מתוך ה-claims → `rpc('session_created_at')` דרך לקוח ה-admin;
  3. אין Session / `created_at` לפני יותר מ-30 יום לפי `now()` → `signOut({ scope: 'local' })` ותוצאה ״לא מאומת״.
  - `requireApiSession()` – מחזיר 401 JSON; `requirePageSession()` – `redirect('/login')`.
- `auth/rate-limit.ts` – חסימה אחרי **5 כישלונות ב-15 דקות לאותו `ip_hash`** (SHA-256 של ה-IP מ-`x-forwarded-for`); רישום כישלון בלבד; ניקוי רשומות מעל 24 שעות בזמן הרישום (עד שיהיה Cron).
- `security/origin.ts` – `assertSameOrigin(request)`: לכל POST, `Origin` חייב להיות זהה ל-`SITE_URL`; אחרת 403. Cookies של Supabase נשארים `SameSite=Lax`, `HttpOnly` היכן שאפשר, `Secure` ב-Production.
- `next.config.ts` – Security headers בסיסיים: `X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, `Permissions-Policy` מינימלי.

### שלב F – Proxy ו-API
- `src/proxy.ts` – לכל בקשה (למעט קבצים סטטיים): יצירת לקוח שרת, `getClaims()` לריענון טוקן, ואז `checkSession`. בקשה ללא Session תקף לדף מוגן → Redirect ל-`/login`; משתמש מחובר שמגיע ל-`/login` → Redirect ל-`/`. נתיבי `/api/*` אינם מופנים – ה-Route Handler עצמו מחזיר 401.
- `POST /api/auth/login` – גוף `{ password }` (Zod: מחרוזת 1–200 תווים):
  1. `assertSameOrigin`; 2. בדיקת Rate limit → 429 עם הודעה בעברית; 3. שליפת ה-Email לפי `FAMILY_USER_ID` (`auth.admin.getUserById`); 4. `signInWithPassword`; 5. כישלון → רישום ב-`login_attempts` ו-401 עם הודעה כללית ״הסיסמה שגויה״; הצלחה → 200 (Cookies נכתבים).
- `POST /api/auth/logout` – `assertSameOrigin`, `signOut({ scope: 'local' })`, 200.
- `GET /api/auth/session` – דוגמת API מוגן (`requireApiSession`) שמחזיר `{ authenticated: true }`; משמש את הבדיקות להוכחת חסימה בשרת.

### שלב G – UI, עיצוב ומעטפת ניווט
- `src/app/layout.tsx` – `<html lang="he" dir="rtl">`, `next/font/google`: Inter + Heebo (400/500/600/700, Heebo עם subset `hebrew`), `font-family: Inter, Heebo, sans-serif`, metadata בעברית (כותרת ״ניהול הוצאות״).
- `src/app/globals.css` – משתני CSS לכל צבעי ה-Palette ו-12 צבעי הקטגוריות (לשימוש עתידי), טיפוגרפיה H1–Caption, מרווחים 8/16/24/32, radius 12px, צל `0 4px 12px rgba(0,0,0,0.06)`, Focus ירוק נראה, יעדי לחיצה ≥44px, רקע `#F8FAF4`.
- רכיבי בסיס (`src/components/ui/`): `Button` (Primary ירוק עם טקסט `#1F2937`, Secondary, Tertiary, Danger, מצבי Hover/Pressed/Disabled), `PasswordInput` (Label מעל השדה, כפתור הצגה/הסתרה עם `aria-label`, מצב Error אדום עם הודעה מקושרת ב-`aria-describedby`), `Card`, `ComingSoon`.
- **מסך התחברות** `src/app/login/page.tsx` (מחוץ למעטפת): לוגו (אייקון גרף ירוק בעיגול) + ״ניהול הוצאות״, שדה ״סיסמה״ בלבד, כפתור ״התחברות״ (מצב טעינה), הודעות שגיאה (סיסמה שגויה / נחסם זמנית – ״יותר מדי ניסיונות. נסו שוב בעוד כמה דקות״ / אין חיבור). קישור ״שכחתי סיסמה״ מוצג **כמושבת עם תווית ״בקרוב״** (המסך עצמו ב-Milestone 6). **אין** שדה Email ואין ״הרשמה״.
- **מעטפת מוגנת** `src/app/(app)/layout.tsx` – קורא `requirePageSession()`; מכיל `AppShell`:
  - **מובייל/Tablet (<1024px):** Bottom Navigation קבוע עם 4 יעדים – ״לוח בקרה״, ״הוצאות״, ״סיכומים״, ״עוד״ (אייקון + תווית, פעיל בירוק, `aria-current="page"`). Tablet: רוחב תוכן מרבי 720px ממורכז.
  - **Desktop (≥1024px):** ניווט צד ימני ברוחב 240px: לוגו ״ניהול הוצאות״, 4 היעדים הראשיים, ואחריהם יעדי ״עוד״ (קטגוריות, השוואת תקופות, ייבוא מקובץ CSV, סל מחזור, גיבויים ושחזור, שינוי סיסמה, כתובת Email לשחזור) עם תגית ״בקרוב״, ו״התנתקות״ בתחתית. אזור תוכן עד 1200px.
  - יעדים שלא נבנו מוצגים עם תגית ״בקרוב״ (פריטים לא לחיצים, `aria-disabled`); ״הוצאות״ ו״סיכומים״ מובילים לדף ״בקרוב״ פשוט כדי שהניווט הראשי יעבוד.
- **לוח בקרה** `src/app/(app)/page.tsx` – כותרת ״לוח בקרה״, שם החודש הנוכחי בעברית (לפי `now()`), כרטיס מצב ריק: ״כאן יוצג סיכום הוצאות החודש – בקרוב״. אין נתוני הוצאות.
- **עוד** `src/app/(app)/more/page.tsx` – במבנה של DESIGN 1.12: קבוצות ״ניהול נתונים״ ו״גישה ואבטחה״ עם תגיות ״בקרוב״, וכפתור ״התנתקות״ בצבע שגיאה **שעובד** (במובייל זו הדרך היחידה להתנתק). ב-Desktop הדף נגיש אך הניווט הצדדי כבר מציג את הכול.
- `LogoutButton` (Client) – `POST /api/auth/logout` → `router.replace('/login')` + `router.refresh()`.
- טקסטים בעברית ב-UI; הערות קוד באנגלית.

### שלב H – בדיקות
**Vitest (ללא DB):** `vitest.config.ts` עם jsdom ו-`@testing-library/jest-dom`.
- `clock` – `setNow`/איפוס.
- `isSessionExpired(createdAt, now)` – בדיוק 30 יום / 30 יום + דקה.
- `assertSameOrigin` – Origin זהה / שונה / חסר.
- `hashIp` ובדיקת סף ה-Rate limit (לוגיקה טהורה).
- RTL: מסך התחברות – יש שדה ״סיסמה״, אין שדה Email ואין ״הרשמה״, `dir="rtl"`, שגיאה מוצגת ומקושרת לשדה.

**Vitest אינטגרציה מול Supabase Dev** (`npm run test:integration`, קובץ נפרד):
- RLS: לקוח `anon` אינו קורא/כותב אף אחת משלוש הטבלאות; משתמש מאומת קורא את `change_signals` בלבד ואינו יכול לכתוב; `rpc('session_created_at')` חסום ל-`anon`/`authenticated`.
- `auth.signUp` עם המפתח הציבורי נכשל (Signup חסום).
- Session אמיתי (התחברות עם `E2E_FAMILY_PASSWORD`): `checkSession` מחזיר תקף; עם `setNow(+31 ימים)` – נדחה (**שעון מוזז**); לאחר `signOut` – `session_created_at` מחזיר `NULL`.

**Playwright** (`playwright.config.ts`, מפעיל `npm run dev`, פרויקטים: Desktop 1280×800 ו-Mobile 375×812, עברית):
- גישה ל-`/` ול-`/more` ללא Session → מועבר ל-`/login`; `GET /api/auth/session` ללא Session → 401.
- התחברות בסיסמה שגויה → הודעת שגיאה; התחברות תקינה → ״לוח בקרה״.
- Desktop: ניווט צד מימין עם 4 יעדים + ״בקרוב״ + ״התנתקות״; Mobile: Bottom Navigation עם 4 יעדים, ואין ניווט צד.
- התנתקות (מניווט הצד ב-Desktop / ממסך ״עוד״ במובייל) → `/login`; חזרה ל-`/` נחסמת.
- POST ל-`/api/auth/login` עם `Origin` זר → 403.
- Rate limit: 5 סיסמאות שגויות → החמישית/השישית מחזירה ״יותר מדי ניסיונות״ (רץ אחרון, ומנקה את `login_attempts` בסיום).

**`npm run test:reset`** – `scripts/test-reset.ts` (עם `tsx` + `dotenv`): מוחק את כל רשומות `login_attempts` ב-Dev; מוכן להרחבה לנתוני `__test__` ב-Milestones הבאים. מסרב לרוץ אם `NEXT_PUBLIC_SUPABASE_URL` אינו נראה כ-Dev (בדיקה מול משתנה `SUPABASE_ENV=development` שיתווסף ל-`.env.example`).

**סקריפטים ב-`package.json`:** `dev`, `build`, `start`, `lint`, `test` (Vitest יחידה), `test:integration`, `test:e2e` (Playwright), `test:reset`, `db:push`.

### שלב I – תיעוד ואימות
- `README.md` קצר בעברית: דרישות (Node 20+), `npm install`, מילוי `.env`, `npm run db:push`, `npm run dev`, הרצת בדיקות מול Dev בענן, `npm run test:reset`.
- עדכון `CLAUDE.md` → ״פקודות הרצה״: `npm run dev`; בדיקות: `npm test && npm run test:integration && npm run test:e2e`.
- ADRs ב-`ARCHITECTURE.md` (סעיף ״החלטות מרכזיות (ADRs)״): ראו סעיף 4 למטה.
- הרצה עצמית: `npm run build`, כל הבדיקות, בדיקה ידנית בדפדפן במובייל וב-Desktop; סגירת השרת; סימון 🟡 ב-`MILESTONES.md`.

## 3. מבנה קבצים צפוי

```text
.env.example
README.md
next.config.ts
package.json / tsconfig.json / eslint.config.mjs
vitest.config.ts / vitest.integration.config.ts / playwright.config.ts
scripts/test-reset.ts
supabase/config.toml
supabase/migrations/<timestamp>_infrastructure.sql
src/proxy.ts
src/app/layout.tsx, globals.css
src/app/login/page.tsx, LoginForm.tsx, login.module.css
src/app/(app)/layout.tsx, page.tsx, expenses/page.tsx, reports/page.tsx, more/page.tsx
src/app/api/auth/login/route.ts, logout/route.ts, session/route.ts
src/components/AppShell/ (BottomNav, SideNav, nav-items.ts, LogoutButton, *.module.css)
src/components/ui/ (Button, PasswordInput, Card, ComingSoon, *.module.css)
src/lib/env.ts, clock.ts
src/lib/supabase/server.ts, admin.ts
src/lib/auth/session.ts, rate-limit.ts
src/lib/security/origin.ts
tests/unit/*.test.ts(x), tests/integration/*.test.ts, tests/e2e/*.spec.ts
```

## 4. החלטות טכניות לתיעוד כ-ADR בזמן הבנייה

1. **בדיקת `auth.sessions` דרך פונקציית DB `SECURITY DEFINER`** שזמינה רק ל-`service_role` – כי סכמת `auth` אינה חשופה ל-API, ואין צורך בחיבור Postgres ישיר בזמן ריצה.
2. **RLS לפי ״כל משתמש מאומת״** (`to authenticated`) – יש משתמש Auth יחיד ו-Signup חסום, ולכן זה שקול ל-`auth.uid()` של המשתמש המשפחתי בלי לקודד UID שונה לכל סביבה ב-Migration.
3. **`DATABASE_URL` משמש רק להרצת Migrations מקומית מול Dev** (`supabase db push --db-url`) – במקום `supabase login` + `link`, פחות צעדים למשתמש. האפליקציה עצמה עובדת דרך Supabase API בלבד.
4. **Rate limiting לפי IP מגובב** (5 כישלונות / 15 דקות), בנוסף להגבלות המובנות של Supabase Auth.
5. **`lucide-react` לאייקונים** – סט קווי מתאר אחיד כמו ב-Style Guide, במקום ציור SVG ידני.

## 5. Definition of Done – איך כל סעיף ייבדק

| תנאי | בדיקה |
|---|---|
| פרויקט Dev קיים, הסביבה המקומית מחוברת רק אליו, אין Secrets ב-Git | אישור המשתמש על הקמה; `git status`/`git check-ignore .env`; `.env.example` ללא ערכים |
| Migration הורץ ב-Dev; RLS והרשאות נבדקו; אין Signup ציבורי | `npm run db:push` הצליח; בדיקות אינטגרציה RLS + signUp |
| Routes/API מוגנים נחסמים בשרת; Login/Logout עובדים; Session מעל 30 יום נדחה (שעון מוזז); חסימה זמנית אחרי כישלונות | Playwright + אינטגרציה `checkSession` עם `setNow` |
| `npm run build` ובדיקות עוברות; מסך כניסה בעברית/RTL ללא Email והרשמה; ניווט תקין במובייל וב-Desktop | `npm run build`, Vitest/RTL, Playwright בשני הגדלים |
| המשתמש יכול להפעיל לבד ולקבל תוצאה עובדת | `README.md` + הוראות ״הרץ כדי שאבדוק״ |

## 6. נקודות עצירה מול המשתמש במהלך הבנייה
- **לפני שלב B** – הדרכת הקמת Supabase Dev ומילוי `.env`; הבנייה ממשיכה רק אחרי שהמשתמש מאשר שסיים.
- אם הגדרה כלשהי ב-Supabase Dashboard לא נמצאת כמתואר (ממשק משתנה) – לעצור ולבדוק יחד.
- אין commit/push בסיום – רק סימון 🟡.
