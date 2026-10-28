# ARCHITECTURE – מערכת לניהול הוצאות הבית

> מסמך ארכיטקטורה המבוסס על `PRD.md` | מחקר מקורות רשמיים: 28.10.2026 | שפת ממשק: עברית, RTL.

## 1. Technology Stack שנבחר

| תחום | בחירה | תפקיד |
|---|---|---|
| Frontend ו-Backend | **Next.js (App Router) + React + TypeScript** | אפליקציית Web אחת, UI ו-Route Handlers לפעולות מאובטחות |
| עיצוב | **CSS Modules + CSS רגיל** | Responsive, RTL, תחזוקה ללא תלות ב-UI framework |
| טפסים וולידציה | **React Hook Form + Zod** | חוויית עריכה ואימות זהה בלקוח ובשרת |
| גרפים | **Recharts** | Donut/Pie ו-Bar Chart נגישים במידת האפשר, עם חלופה טקסטואלית |
| שליפת נתונים בלקוח | **TanStack Query** | Cache, Refetch לאחר אירועי Realtime/חיבור מחדש, מצבי Loading/Error |
| תאריכים | **date-fns + `@date-fns/tz`** | חישובי יום/שבוע/חודש לפי `Asia/Jerusalem`, פורמט `DD.MM.YYYY` |
| CSV | **Papa Parse** | פענוח וייצור CSV בטוח |
| Database | **Supabase PostgreSQL** | הוצאות, קטגוריות, מצב שחזור, מטא-דאטה של גיבויים; עסקאות ו-Constraints |
| Authentication | **Supabase Auth עם Sessions מובנים (`@supabase/ssr`) – משתמש טכני משפחתי יחיד** | אימות סיסמה, Session ב-Cookies, התנתקות גלובלית, שחזור Email, שינוי כתובת; ללא הרשמה או ניהול משתמשים בממשק |
| Real-time | **Supabase Realtime (Postgres Changes)** | אותות שינוי למכשירים מאומתים ורענון שאילתות; מתאים להיקף ביתי |
| גיבויים חיצוניים | **Cloudflare R2, bucket פרטי** – מוקם רק ב-Milestone 7 | Snapshot חודשי וגיבוי בטיחות מחוץ למסד הנתונים |
| Email | **Gmail SMTP (סיסמת אפליקציה) מחובר ל-Supabase Auth** | Email לשחזור סיסמה ואישור שינוי כתובת; ללא צורך בדומיין פרטי |
| PWA | **Web App Manifest + Service Worker מבוקר** | התקנה וצפייה בנתונים שכבר נטענו במצב Offline |
| Hosting ו-Cron | **Vercel Functions + Vercel Cron** – פרויקט Vercel אחד | פריסה, APIs, גיבוי חודשי, ניקוי יומי; ללא שרת קבוע |
| קוד ו-CI/CD | **GitHub + Vercel Git Integration + Supabase CLI migrations** | ניהול גרסאות ופריסה אוטומטית; Migrations ל-Production בהפעלה ידנית |
| בדיקות | **Vitest + React Testing Library + Playwright** | בדיקות לוגיקה, UI ותרחישים מקצה לקצה |

**בחירה לאחר השוואת חלופות:** Next.js נבחר על פני React/Vite עם Backend נפרד (יותר רכיבי פריסה) ועל פני SPA עם גישה ישירה בלבד ל-Supabase (קשה לאכוף גיבויים ושחזור מאובטחים). PostgreSQL נבחר על פני Firebase Firestore ו-SQLite בענן בשל קשרים, עסקאות, Constraints ושאילתות סיכום. Supabase Auth עדיף כאן על מערכת סיסמאות עצמאית, ומנגנון ה-Sessions המובנה שלו עדיף על שכבת Sessions אפליקטיבית נוספת (פחות קוד, ואותו Session משמש גם ל-Realtime). Gmail SMTP נבחר על פני Resend כי אינו דורש רכישת דומיין והגדרות DNS, והיקף ההודעות זניח; R2 נבחר על פני Supabase Storage בלבד כדי שגיבויים לא יהיו תלויים באותו פרויקט DB, ועל פני AWS S3 בשל מודל העלות הפשוט לפרויקט קטן. Recharts נבחר על פני Chart.js ו-ECharts בגלל שילוב React פשוט; CSS Modules על פני Tailwind כדי לצמצם שכבת תצורה נוספת. אין צורך ב-AI, ב-ORM, ב-Redis, ב-Message Queue או ב-Backend עצמאי.

**סיכונים ועלויות:** שני פרויקטי Supabase Free פעילים הם מכסת החינם הנוכחית; פרויקט Free עשוי להיות מושהה לאחר שבוע של פעילות נמוכה, גם אם הוא אתר אמיתי. אין גיבויים מנוהלים זמינים ב-Free; המנגנון המותאם במסמך הוא דרישת מוצר ולא תחליף לבדיקות שחזור. Vercel Hobby מיועד לשימוש אישי לא מסחרי; Cron זמין לפחות בתדירות יומית אך זמני הרצה אינם מדויקים, ו-Functions מוגבלות בזמן. R2 Standard מציע שכבת חינם של 10 GB-month ופעולות מוגבלות; Gmail SMTP מוגבל לכמה מאות הודעות ביום ודורש חשבון Gmail עם אימות דו-שלבי וסיסמת אפליקציה. המחירים והמכסות עשויים להשתנות ויש לאמתם לפני פתיחת החשבונות. **אין הבטחה שכל המערכת תישאר חינמית**, בפרט אם נפח הנתונים, ריצות גיבוי או מגבלות Function יחייבו שדרוג.

## 2. מבנה המערכת

```text
Browser / Installed PWA
  ├─ Next.js UI (Dashboard, Expenses, Reports, Categories, Trash, CSV, Settings, Backups)
  ├─ Service Worker + IndexedDB (cache קריאה מוגבל ומוגן)
  └─ Supabase Realtime (מנוי מאומת ב-Session של Supabase Auth; אותות רענון בלבד)
            │ HTTPS
            ▼
Vercel – Next.js Route Handlers (Node.js)
  ├─ Auth/session guard (בדיקת Session מול auth.sessions) + Zod validation + rate limiting
  ├─ Expenses/Categories/Reports/CSV APIs
  ├─ Backups/Restore/Cron APIs
  └─ Supabase server clients / R2 S3 SDK
            ├─ Supabase Auth + PostgreSQL (Dev או Prod)
            ├─ Cloudflare R2 private bucket (Dev או Prod)
            └─ Supabase Auth SMTP → Gmail
```

**גבולות אמון:** כל קריאה או שינוי של מידע פיננסי מתבצעים דרך Route Handlers מאומתים; אין לחשוף `service_role`/secret key, R2 credentials או SMTP credentials בדפדפן. Supabase Realtime נרשם רק לאחר Auth, עם RLS שמאפשר למשתמש המשפחתי היחיד לקבל אירועי שינוי. כדי למזער מידע שעובר ב-Realtime, הלקוח מאזין לטבלת אותות קטנה (`change_signals`) ולא לטבלאות ההוצאות עצמן. אירועי Realtime משמשים ל-invalidate/refetch דרך ה-API ולא כתחליף לאימות הרשאות. יש להימנע משליחת נתוני הוצאה מלאים ב-Broadcast ציבורי. קובצי CSV וגיבויים לעולם אינם מוגשים מ-URL ציבורי.

### 2.1 Modules ושכבות

- **UI/Presentation:** מסכי כניסה, Dashboard, רשימת הוצאות עם Pagination (20), טופס הוספה/עריכה/שכפול, סיכומים, השוואה, קטגוריות, סל מחזור, ייבוא/ייצוא, הגדרות וגיבויים. טקסטי UI בעברית, `dir="rtl"`; מספרים ומטבע מוצגים בצורה קריאה.
- **Application/API:** בדיקות Session והרשאות, ולידציה, קביעת תאריכים לפי `Asia/Jerusalem`, Pagination וסינון, ניהול גרסאות למניעת התנגשויות, עיבוד CSV, תזמור גיבוי ושחזור.
- **Domain/DB:** Constraints, עסקאות PostgreSQL, שאילתות Aggregation, מחיקה רכה, ניהול קטגוריות, נעילת תחזוקה וגרסאות רשומות.
- **Infrastructure:** Supabase, R2, SMTP, Cron, PWA cache, תצורה וסודות.

## 3. Data Model

| ישות | שדות עיקריים | כללים |
|---|---|---|
| `categories` | `id uuid PK`, `name text`, `normalized_name text UNIQUE`, `color text`, `created_at`, `updated_at`, `version bigint` | שם עד 30 תווים, מנורמל לאחר trim/רווחים והמרת case; `color` מתוך 12 ערכי הפלטה שב-`DESIGN.md` (CHECK); חייבת להישאר לפחות קטגוריה אחת (בדיקה בעסקת המחיקה); קטגוריות התחלתיות נוצרות פעם אחת בלבד |
| `expenses` | `id uuid PK`, `amount numeric(9,2)`, `expense_date date`, `category_id FK`, `description text NULL`, `deleted_at timestamptz NULL`, `created_at`, `updated_at`, `version bigint` | `amount > 0 AND amount <= 1000000`; `expense_date >= '2000-01-01'` ולא עתידי לפי זמן ישראל בבדיקת שרת; `description` עד 200 תווים; FK לקטגוריה; `deleted_at` מציין סל מחזור |
| `app_state` | `id` יחיד, `maintenance_mode`, `maintenance_until timestamptz`, `restore_id`, `updated_at` | נעילה גלובלית לשחזור עם זמן תפוגה (ראו 7.2) |
| `change_signals` | `id` יחיד, `data_epoch`, `auth_epoch`, `changed_at` | טבלת אותות ל-Realtime בלבד: טריגרים מעלים את `data_epoch` בכל שינוי בהוצאות/קטגוריות; `auth_epoch` עולה בשינוי/איפוס סיסמה. אין בה נתונים פיננסיים |
| `login_attempts` | `id`, `kind` (`login`/`reset`), `ip_hash`, `created_at` | Rate limiting לניסיונות כניסה ושחזור (ב-Vercel אין זיכרון קבוע בין קריאות); ניקוי רשומות בנות יותר מ-24 שעות |
| `backups` | `id`, `kind` (`monthly`/`safety`), `period text NULL` (`YYYY-MM`, ייחודי ל-monthly), `object_key`, `created_at`, `expires_at`, `status`, `checksum`, `schema_version`, `size_bytes` | קטלוג גיבויים; קובצי Snapshot עצמם ב-R2; `UNIQUE (kind, period)` מונע גיבוי חודשי כפול; שמירת 12 גיבויים חודשיים אחרונים, גיבויי safety למשך 30 יום |
| `restores` | `id`, `backup_id`, `safety_backup_id`, `status` (`started`/`succeeded`/`failed`), `error`, `started_at`, `finished_at` | תיעוד כל ניסיון שחזור ותוצאתו, ללא נתונים אישיים |
| `import_batches` / `import_rows` | `id`, `status`, `source_row`, `fingerprint`, `expense_id NULL`, `error`, `created_at` | זיהוי הצלחות וכישלונות, Retry רק לשורות שנכשלו; נתוני ייבוא נמחקים אוטומטית לאחר 7 ימים |

**אינדקסים:** `expenses(expense_date DESC, id)`, `(category_id, expense_date)`, `(deleted_at, expense_date)`; `categories(normalized_name)` ייחודי. מזהי UUID קבועים משמרים זהות לאורך שחזור. לכל הוצאה `version` גדל בשינוי, כולל מחיקה ושחזור. `ON DELETE RESTRICT` ב-FK; העברת הוצאות ומחיקת קטגוריה מתבצעות בעסקה אחת. גם הוצאות שבסל המחזור משויכות לקטגוריה חלופית לפני מחיקת קטגוריה, כדי למנוע הפניה שבורה.

**אימות DB:** טריגרים/Constraints ל-`amount`, גרסאות, שם מנורמל ואי-שימוש בקטגוריה שאינה קיימת. תאריך עתידי נבדק בשרת לפי `Asia/Jerusalem` (לא להסתמך על שעון לקוח). Aggregation משתמש רק ב-`deleted_at IS NULL`. סכומים מחושבים ב-`numeric`, לא ב-Floating Point. השוואת אחוזים מחזירה `null` כשבסיס ההשוואה הוא 0; UI מציג ״אין נתון להשוואה״.

**שבוע ותקופות:** ראשון–שבת; טווחי תאריכים נכללים בשני קצותיהם ב-UI ומתורגמים ל-`>= start AND < day_after_end` בשאילתה. בשתי תקופות להשוואה אין הכרח לאורך זהה; מוצגים סכומים מוחלטים והפרשים, ללא נרמול אוטומטי. תקופת הבסיס היא תמיד ״תקופה א׳״: `diff = B - A`, `percent = diff / A` (או `null` כש-A=0).

**״חמש ההוצאות האחרונות״:** `ORDER BY expense_date DESC, created_at DESC LIMIT 5` על הוצאות פעילות. `Intl.NumberFormat('he-IL', {style:'currency', currency:'ILS'})` להצגה בלבד.

## 4. Authentication, Sessions ואבטחה

1. **זהות יחידה:** ליצור **משתמש Supabase Auth אחד בלבד** בכל סביבה, עם Email שחזור מאומת וסיסמה משותפת (לפחות 8 תווים – מוגדר גם ב-Auth settings). במסך הכניסה המשתמש מזין **סיסמה בלבד**. השרת שומר כסוד רק את **מזהה המשתמש** (`FAMILY_USER_ID`), שאינו משתנה לעולם, ושולף את כתובת ה-Email העדכנית דרך Admin API (`auth.admin.getUserById`) בכל כניסה ובקשת שחזור. כך שינוי כתובת אינו דורש עדכון סודות. אין Signup ציבורי (Disable signups); יצירת המשתמש הראשוני באמצעות Supabase Dashboard בלבד.
2. **כניסה ו-Sessions:** Route Handler מבצע `signInWithPassword` דרך `@supabase/ssr`, וה-Session של Supabase נשמר ב-Cookies `HttpOnly`, `Secure`, `SameSite=Lax`. אין שכבת Sessions אפליקטיבית נפרדת. אין לשמור סיסמה ב-DB או ב-Local Storage. בכל API השרת:
   - מאמת את ה-JWT;
   - בודק שה-`session_id` שבו עדיין קיים ב-`auth.sessions` (Session שבוטל נמחק משם);
   - בודק שה-`created_at` של ה-Session אינו לפני יותר מ-30 יום; אחרת מבצע `signOut` ומחזיר 401.

   הגבלת 30 הימים נאכפת בקוד, כי הגבלת זמן Session מובנית (Time-box) זמינה ב-Supabase רק בתוכנית Pro. תוקף ה-JWT מוגדר ל-10 דקות. Rate limiting לניסיונות כניסה ושחזור דרך `login_attempts` (למשל 5 ניסיונות כושלים ב-15 דקות), בנוסף להגבלות המובנות של Supabase Auth; הגנת CSRF לפעולות שינוי (בדיקת `Origin` + `SameSite`).
3. **Realtime:** הלקוח מתחבר ל-Realtime עם ה-Session של Supabase Auth שכבר קיים בדפדפן; אין לשלוח מפתח שירות לדפדפן. ההאזנה היא לטבלת `change_signals` בלבד. אין להסתמך על ניתוק WebSocket לביטול גישה: בדיקות שרת הן מקור הסמכות; עם עליית `auth_epoch` הלקוח מנתק מנויים, מוחק cache מקומי ועובר למסך הכניסה. **שימוש ב-Postgres Changes כפוף ל-RLS; אין לאפשר גישה לנתוני טבלאות דרך Supabase REST ללקוח לא מאומת.**
4. **התנתקות ושינוי סיסמה:** התנתקות רגילה – `signOut({ scope: 'local' })` (מכשיר זה בלבד). שינוי סיסמה:
   - אימות הסיסמה הנוכחית מחדש מול Supabase Auth;
   - עדכון הסיסמה;
   - `signOut({ scope: 'global' })`, שמוחק את כל ה-Sessions בכל המכשירים;
   - העלאת `auth_epoch`.

   מכשירים מחוברים מקבלים את האות ומתנתקים מיד; מכשיר מנותק נחסם בקריאת ה-API הבאה, כי ה-Session שלו כבר לא קיים ב-`auth.sessions`. JWT שכבר הונפק תקף עד 10 דקות לכל היותר מול Realtime בלבד, וזה מקובל בהיקף ביתי.
5. **שחזור סיסמה:** ה-API מפעיל `resetPasswordForEmail` עבור ה-Email שנשלף לפי `FAMILY_USER_ID`, ללא קלט כתובת מהמשתמש, ומחזיר למסך את הכתובת במיסוך חלקי. הקישור החד-פעמי מוביל למסך איפוס באפליקציה. לאחר קביעת סיסמה חדשה מבוצעים `signOut({ scope: 'global' })` והעלאת `auth_epoch`. תוקף הקישור: שעה אחת (הגדרת OTP expiry ב-Supabase Auth, בכל סביבה).
6. **שינוי Email:** אימות סיסמה נוכחית; `updateUser({email})`. **Secure Email Change כבוי**: נדרש אישור **הכתובת החדשה בלבד**, בהתאם ל-PRD, כדי שאובדן גישה לכתובת הישנה לא ינעל את המערכת. הכתובת מתעדכנת ב-Supabase Auth רק לאחר האישור, והשרת קורא אותה משם (סעיף 1). לכן אין צורך לעדכן סודות.
7. **RLS:** להפעיל RLS בכל טבלת נתונים חשופה ל-Supabase APIs; לאפשר קריאה רק ל-`auth.uid()` של המשתמש היחיד, ולחסום שינוי ישיר מהדפדפן כאשר נדרשת לוגיקה עסקית בשרת. טבלאות ניהול גיבוי/Session פרטיות לסכמת שרת בלבד. מפתחות בעלי הרשאות עוקפות RLS זמינים רק ב-Backend.
8. **אבטחת מידע:** HTTPS, Cookies מאובטחים, Security Headers/CSP, ולידציה בשרת, מגבלת גודל CSV, בדיקות MIME/תוכן, הימנעות מ-CSV formula injection ביצוא, Audit לוג ללא סכומים/סיסמאות/תוכן אישי, והגבלת גישה לגיבויים. אין להסתמך על הגנת דף בלבד.

**הסתייגות יישומית חשובה:** Supabase Auth בנוי לחשבונות עם Email; שימוש ב-Email משפחתי יחיד מוסתר ב-UI מממש את הדרישה ל״סיסמה משותפת אחת״ ללא מערכת משתמשים. הבדיקה מול `auth.sessions` (תקפות ו-30 יום) והתנתקות גלובלית יש לאמת בבדיקות כבר ב-Milestone 1 (כניסה, Logout) וב-Milestone 6 (שינוי סיסמה בשני מכשירים).

## 5. APIs ו-Data Flow

כל הנתיבים מתחת ל-`/api` מחייבים Session תקף, למעט login, בקשת שחזור והשלמת קישור שחזור; Cron מחייב `CRON_SECRET`. כל שינוי נבדק מול `maintenance_mode` בשרת וב-DB.

| API לוגי | פעולות |
|---|---|
| `/api/auth/*` | כניסה, יציאה, Session, שינוי סיסמה, בקשת איפוס, אישור שינוי Email |
| `/api/expenses` / `/api/expenses/:id` | GET מסונן עם Pagination, POST, PATCH עם `expectedVersion`, מחיקה רכה, שכפול |
| `/api/categories` / `/api/categories/:id` | CRUD; העברה ומחיקה בעסקה אחת |
| `/api/trash` | רשימה, שחזור, מחיקה לצמיתות |
| `/api/reports/summary` / `/api/reports/compare` | Aggregations מסוננים לפי תאריכים/קטגוריות |
| `/api/csv/import/*` / `/api/csv/export` | Preview, תיקון, סימון כפילויות, שמירה חלקית ו-Retry; ייצוא כללי/מסונן |
| `/api/backups` / `/api/backups/:id/restore` | רשימת גיבויים, שחזור מאובטח עם גיבוי בטיחות |
| `/api/cron/monthly-backup`, `/api/cron/daily-cleanup` | Jobs מוגנים בסוד, Idempotent |

**הוספה/עריכה:** UI → Zod → API Auth → בדיקת maintenance → טרנזקציית DB עם `WHERE id=? AND version=? AND deleted_at IS NULL` → אירוע Realtime → Refetch במכשירים. התנגשות מחזירה HTTP 409 עם נתונים עדכניים והמשתמש בוחר לטעון אותם או לבצע שמירה מודעת על בסיס הגרסה החדשה; אין overwrite שקט. אם הוצאה נמחקה – חסימת שמירה. אם הקטגוריה שנבחרה **נמחקה** – 409 עם דרישה לבחור קטגוריה תקפה; שינוי שם/צבע של קטגוריה אינו גורם להתנגשות, כי ההוצאה מפנה למזהה הקטגוריה.

**סיכומים:** שאילתות SQL מבוססות DB (לא סכימת 20 השורות בדף); `GROUP BY category_id` ו-`SUM(amount)` על הוצאות פעילות בלבד. השוואה כוללת Union של קטגוריות בשתי התקופות, עם 0 בהיעדר הוצאה; Pie/Donut ו-Bar מקבלים את אותם נתונים המוצגים בטבלה נגישה.

**CSV:** ייצוא ב-UTF-8 **עם BOM** וכותרות בעברית `תאריך,סכום,קטגוריה,תיאור`. ייבוא מקבל UTF-8 עם או בלי BOM, וכותרות בעברית (כנ״ל) או באנגלית `expense_date,amount,category,description`. תאריך ISO `YYYY-MM-DD`, סכום עשרוני ללא סימן ₪. Papa Parse; גודל קובץ מרבי 2MB (מתחת למגבלת גוף הבקשה של Vercel) ובדיקה בלקוח ובשרת; preview ללא שמירה, תיקון שורות בממשק, התאמת קטגוריות. איתור כפילויות לפי תאריך/סכום/קטגוריה/תיאור מנורמל, **בתוך הקובץ וגם מול הוצאות פעילות קיימות ב-DB**, **כהתראה בלבד**. שמירה בשורות/מנות עם מזהי ייבוא Idempotent; כל שורה מדווחת כהצלחה או כישלון; Retry רק לשורות שנכשלו, ללא שכפול הצלחות. כל יצירת קטגוריה ושורת הוצאה במנה חייבת לשמור עקביות; כישלון לא משאיר FK שבור. CSV export אינו כולל סל מחזור, ומנטרל בשדות הטקסט (קטגוריה, תיאור) ערכים שמתחילים בתווי נוסחה (`=`, `+`, `-`, `@`) בפתיחה בגיליונות; עמודות הסכום והתאריך אינן מנוטרלות.

## 6. PWA, Offline ו-Real-time

- `manifest.webmanifest`, icons, `display: standalone`, Service Worker, HTTPS. Cache ל-App Shell ולנתוני **קריאה שכבר נטענו בלבד** ב-IndexedDB; אין תור פעולות Offline ואין כתיבה Offline.
- בגלל שמדובר במידע פיננסי, נתוני Offline נשמרים **רק במכשיר שבו הייתה התחברות**, עם מדיניות cache מינימלית; עם Logout או ביטול Session יש למחוק cache. מאחר שלא ניתן לבטל גישה לנתונים שכבר נשמרו במכשיר שאינו מחובר לאינטרנט, יש להציג מגבלה זו במפורש: ניתוק מרחוק חוסם סנכרון ו-API מיידית, אך מחיקת cache מקומי במכשיר Offline תתבצע רק כאשר הוא יחזור לתקשר. אם נדרשת חסימה מוחלטת גם Offline, אי אפשר לספק אותה יחד עם צפייה Offline ללא מנגנון הגנה מקומי נוסף.
- בזמן Offline יש להציג מצב ״אין חיבור לאינטרנט״ ולחסום הוספה, עריכה, מחיקה, ייבוא, שינוי סיסמה ושחזור; נתוני cache מסומנים כלא-מעודכנים.
- **iPhone/Safari:** הדפדפן עשוי למחוק אחסון של אתר שלא נפתח כמה ימים; במקרה זה אין נתונים Offline עד החיבור הבא. זו מגבלה ידועה שמתועדת ב-PRD ואין לעקוף אותה.
- Realtime מחובר לערוץ מאומת על טבלת `change_signals`: עליית `data_epoch` → TanStack Query מבצע invalidate ו-Refetch לשאילתות הרלוונטיות; עליית `auth_epoch` → התנתקות ומחיקת cache. עם reconnect יש לבצע Refetch מלא. אין להשתמש ב-Realtime כמנגנון נעילה או אמת יחיד.

## 7. גיבויים, שחזור, ניקוי ועסקאות

### 7.1 Snapshot חודשי

- Cron יומי ב-Vercel בודק בשרת לפי `Asia/Jerusalem` האם חסר Snapshot לחודש הנוכחי (`period`); בפועל הגיבוי נוצר בריצה הראשונה של כל חודש (בדרך כלל ה-1 בחודש). כך אין תלות בדיוק זמן הריצה של Cron. `UNIQUE (kind, period)` ו-DB advisory lock מונעים ריצות כפולות.
- Snapshot לוגי **עקבי לנקודת זמן אחת** של `expenses` (כולל `deleted_at`) ו-`categories`, עם `schema_version`, checksum ומספר רשומות. יש לייצא דרך טרנזקציית PostgreSQL עם `REPEATABLE READ` ולא דרך דפדוף API בזמן שמשתמשים כותבים.
- הקובץ נשמר ב-**R2 private bucket מחוץ ל-Supabase**, ורק לאחר העלאה מוצלחת ואימות checksum נרשם `backups.status=ready`. שמירת 12 Snapshots חודשיים אחרונים; מחיקת הישן רק לאחר יצירת החדש בהצלחה. יש לתמוך בכישלון חלקי של העלאה, Cleanup ו-Retry.
- אין להסתמך על Supabase Free כעל שירות גיבוי מובנה; גיבוי מותאם זה שונה מגיבוי פיזי של DB ומיועד לנתוני האפליקציה שהוגדרו ב-PRD, לא לשחזור אוטומטי של כל פרויקט Supabase/הגדרות Auth.

### 7.2 שחזור מלא עם גיבוי בטיחות

1. המשתמש בוחר Snapshot תקין – חודשי או גיבוי safety (שניהם מוצגים ברשימה, מסומנים בנפרד) – רואה תאריך ומאשר במפורש. נרשמת שורת `restores` בסטטוס `started`.
2. Backend רוכש **נעילה גלובלית ב-DB** ומעביר `maintenance_mode=true` עם `maintenance_until = now() + 10 minutes`, כך שכל כתיבה מכל המכשירים נחסמת ב-DB, לא רק ב-UI. תהליכי ייבוא/Cron בודקים אותה נעילה. **נעילה שפג תוקפה נחשבת משוחררת**, כך שקריסה באמצע אינה משאירה את המערכת נעולה לצמיתות; ה-Cron היומי מנקה נעילות שפגו ומסמן את ה-`restores` המתאים כ-`failed`.
3. נוצר Snapshot safety עקבי של הנתונים הנוכחיים ומועלה ל-R2; אם יצירתו נכשלת, אין להתחיל בשחזור, משחררים את הנעילה ומחזירים שגיאה.
4. Backend מוריד ומאמת Snapshot יעד (checksum, schema_version, IDs, FK, נתונים). אם `schema_version` של ה-Snapshot ישן מהנוכחי, מופעלות עליו בזיכרון פונקציות המרה מגרסה לגרסה (`upgradeSnapshot(vN → vN+1)`), שנכתבות יחד עם כל Migration שמשנה את `expenses`/`categories`. Snapshot שגרסתו חדשה מהקוד הנוכחי נדחה. ההחלפה המלאה מתבצעת **בטרנזקציית PostgreSQL יחידה**, תוך שמירת הנעילה; כישלון גורם ל-`ROLLBACK` ללא נתונים חלקיים. הוצאות מסל המחזור שגילן מעל 30 יום לפי `deleted_at` לא מוחזרות כפעילות, ונמחקות בהתאם למדיניות.
5. בסיום: העלאת `data_epoch`, שחרור נעילה, עדכון `restores` ל-`succeeded`/`failed`, אות Realtime ורענון כל המכשירים. Snapshot safety נשמר בנפרד 30 יום ומופיע ברשימת הגיבויים; Cron מוחק אותו לאחר פקיעה.

**מגבלת זמן Vercel:** לפי נפח הנתונים הצפוי ב-PRD (עד כ-20,000 הוצאות, כמה MB לכל היותר), Snapshot ושחזור אמורים להסתיים בתוך שניות, הרבה מתחת למגבלת משך Function. לכן נבחר מנגנון סינכרוני פשוט. Milestone 7 כולל בדיקת זמן מול נתוני בדיקה בנפח 20,000 הוצאות; אם היא נכשלת, עוצרים ומחליטים עם המשתמש על פתרון חלופי לפני אישור השלב.

**התאוששות מאסון:** מאחר שהקטלוג `backups` נמצא ב-Supabase, אובדן מלא של פרויקט ה-DB מחייב כלי ניהול מוגן לייבוא Snapshot מ-R2 לפרויקט חדש והחלת migrations; ממשק השחזור הרגיל לבדו לא יכול לפעול כש-DB אינו זמין. יש לשמור ב-R2 מטא-דאטה מינימלי עם Snapshot ולאמת יכולת שחזור לפרויקט נקי. אין לכלול Secrets/סיסמאות בתוך Snapshot.

### 7.3 סל מחזור וניקוי

- מחיקה רכה מעדכנת `deleted_at=now()`; שחזור מאפס אותו; מחיקה לצמיתות מוחקת שורה.
- Cron יומי מסיר הוצאות שחלפו **30×24 שעות** ממועד מחיקתן; גם API מסנן הוצאות שפג תוקפן כדי שלא ייראו זמינות לשחזור אם Cron התעכב. התראה בשבעת הימים האחרונים לפי זמן שנותר.
- Cron מסיר גיבויי safety בני יותר מ-30 יום, נתוני ייבוא בני יותר מ-7 ימים, רשומות `login_attempts` בנות יותר מ-24 שעות ונעילות תחזוקה שפגו, ומנקה שאריות קבצים זמניים; כל פעולה Idempotent ומתועדת ללא נתונים אישיים.

## 8. סביבות, Configuration ו-Deployment

| סביבה | Database/Auth | Vercel | R2 | Secrets |
|---|---|---|---|---|
| Development | פרויקט Supabase **נפרד** עם נתוני בדיקה (מוקם ב-Milestone 1) | Local `npm run dev`; Vercel Preview (מ-Milestone 8) | bucket נפרד ל-Dev (מוקם ב-Milestone 7) | `.env` מקומי **ל-Dev בלבד**, ללא Commit (מוגן ב-`.gitignore`) |
| Production | פרויקט Supabase **נפרד** עם נתונים אמיתיים (מוקם ב-Milestone 8) | Vercel Production (מ-Milestone 8) | bucket פרטי נפרד ל-Prod (מוקם ב-Milestone 8) | **Vercel Environment Variables בהיקף Production בלבד** |

- אין צורך ב-Docker או ב-Supabase מקומי: Next.js רץ מקומית, כל DB/Auth/Realtime נבדקים מול Supabase Development בענן. אפשר להשתמש ב-Supabase CLI **לניהול migrations מרחוק בלבד**.
- משתנים לכל סביבה: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`/publishable key (נדרש בדפדפן ל-Realtime; מוגן ב-RLS), `SUPABASE_SECRET_KEY`/`SERVICE_ROLE_KEY` **שרת בלבד**, `DATABASE_URL`/חיבור Postgres מוגבל, `FAMILY_USER_ID`, `CRON_SECRET`, `SITE_URL` (ל-Auth redirects); מ-Milestone 7 גם `R2_ENDPOINT`, `R2_BUCKET`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`. הגדרות SMTP (Gmail) נשמרות ב-Supabase Dashboard של כל סביבה, לא ב-Git. קובץ `.env.example` עם שמות המשתנים בלבד נשמר ב-Git.
- קוד המקור ו-`supabase/migrations/*.sql` ב-GitHub Repository פרטי; אין להעלות `.env*`, גיבויים, CSV אמיתיים או נתוני Production. `main` מייצג Production. מאחר שיש מפתח/משתמש יחיד: **Push ישיר ל-`main`** בסוף כל Milestone, לפי זרימת העבודה ב-`CLAUDE.md`; הבדיקות האוטומטיות רצות מקומית לפני הדחיפה. אין חובת Pull Requests.
- **פרויקט Vercel אחד** מחובר ל-GitHub: Push ל-`main` מפעיל Production Deployment; Push לענף אחר (אם ייעשה) יוצר Preview. משתני הסביבה מוגדרים בנפרד לפי היקף: **Preview → Supabase Dev**, **Production → Supabase Prod**. Push ל-`main` שתלוי בשינוי DB מתבצע **רק לאחר שה-DB של Production עודכן** (ראו 8.1).

### 8.1 נוהל Database Migrations – ללא הרצת DB מקומי

1. מפתח/AI מכין Migration SQL ממוספר ב-Repository, כולל בדיקות ותוכנית תאימות לאחור. לא עורכים Schema ידנית ב-Dashboard לאחר תחילת ניהול migrations.
2. מפעיל הפיתוח מריץ `supabase link --project-ref <DEV_REF>`, `supabase db push --dry-run`, ואז `supabase db push` **רק על Dev**; בודק CRUD, Realtime, RLS, CSV ושחזור על נתוני בדיקה.
3. רק לאחר **אישור מפורש של המשתמש** לשינוי Production:
   - Claude מכין ודוחף את ה-Migrations לענף נפרד (לא ל-`main`).
   - **המשתמש עצמו** מפעיל ב-GitHub את ה-workflow הידני `migrate-production` (`workflow_dispatch`, כפתור ״Run workflow״) על אותו ענף. ההפעלה הידנית היא האישור. Claude מדריך צעד אחר צעד.
   - ה-workflow מבצע `supabase db push --dry-run` ואז `supabase db push` מול **Prod**, עם credentials של Production השמורים כ-**Repository Secrets**.

   הערה: Environment Approval ו-Environment Secrets של GitHub אינם זמינים ל-repo פרטי בתוכנית החינמית, ולכן לא משתמשים בהם. רק בעל ה-repo (המשתמש) יכול להפעיל את ה-workflow. אין לתת למחשב המקומי גישת Production.
4. **סדר מחייב:** Migration תואם-לאחור ב-Production → אימות הצלחה → מיזוג הענף ו-Push ל-`main` → Vercel Production Deployment. שינויי Schema שוברי תאימות מחייבים expand/contract בשני Deployments; אין להריץ migrations של Prod אוטומטית בכל Push.
5. Migration שנכשל חוסם את Deployment. Rollback של Schema אינו מובטח אוטומטית; מתקנים באמצעות Migration נוסף או הליך התאוששות מבוקר. נתוני Production לא מועתקים ל-Dev.

**מה לא מועבר ב-Migrations:** יצירת פרויקט Supabase, משתמש Auth הראשוני וה-Email שלו, SMTP (Gmail), אורך סיסמה מינימלי, תוקף JWT ו-OTP, תבניות Email ו-Redirect URLs, הגדרות Auth ושיעורי הגבלה, מפתחות וסודות, הגדרות Realtime ברמת פרויקט, R2 buckets ו-permissions, Vercel domains/Cron/Environment Variables. כל אלה מוגדרים **בנפרד** ל-Dev ול-Prod ומתועדים ב-Checklist תצורה שאינו כולל Secrets. SQL policies, triggers, indexes ו-DB functions כן נכללים ב-Migrations.

### 8.2 מגבלות תוכניות – הסבר תפעולי

- **Supabase Free:** עד שני פרויקטים פעילים ללא תשלום; בדיוק Dev ו-Prod ימלאו את המכסה. כל פרויקט Free מקבל 500 MB Database ו-1 GB Storage (לפי תמחור שנבדק); אחרי כשבוע של פעילות מועטה הוא עלול להיות מושהה. **החלטה:**
  - ה-Cron היומי מבצע שאילתה ל-Prod DB כל יום, כדי לשמור על פעילות.
  - ב-Milestone 8 יש לוודא בתיעוד הרשמי של Supabase שפעילות כזו אכן מונעת השהיה.
  - אם לא – המשתמש יחליט אז בין שדרוג ל-Pro (החל מ-$25 לחודש) לבין קבלת הסיכון, עם הוראות הפעלה מחדש מתועדות.

  Dev עלול להיות מושהה בין Milestones; הפעלתו מחדש נעשית בלחיצה ב-Dashboard.
- **Supabase Backups:** גיבויים מנוהלים יומיים מוצעים בתוכניות בתשלום, לא כתחליף ל-12 Snapshots חודשיים ולגיבויי safety שנדרשים כאן.
- **Vercel Hobby:** שימוש אישי לא-מסחרי, Git deployments, Functions ו-Cron; Cron יומי אינו מדויק לשעה ולכן לוגיקת גיבוי חודשית בודקת תאריך בשרת. יש לבדוק מגבלות Function זמן/זיכרון בפועל.
- **R2 Standard:** Free tier כולל עד 10 GB-month, מיליון פעולות Class A ועשרה מיליון Class B לחודש; מעבר לכך עשוי להיות מחויב. Bucket פרטי בלבד.
- **Email:** Supabase SMTP ברירת מחדל **אינו מתאים ל-Production** (מוגבל לכתובות מורשות ולכמות קטנה של הודעות). לכן מגדירים Custom SMTP של Gmail:
  - שרת `smtp.gmail.com`, פורט 587.
  - חשבון Gmail ייעודי או קיים, עם אימות דו-שלבי ו**סיסמת אפליקציה**.
  - אין צורך בדומיין.

  ההגדרה נעשית על ידי המשתמש, בהדרכה, ב-Supabase Dashboard של כל סביבה. סיסמת האפליקציה אינה נשמרת ב-Git.
- **GitHub Free (repo פרטי):** Actions זמין; Environment Secrets ו-Required Reviewers אינם זמינים – לכן נעשה שימוש ב-Repository Secrets וב-`workflow_dispatch` (ראו 8.1).

## 9. החלטות תפעוליות, אמינות ובדיקות קבלה טכניות

- **Concurrency:** גרסאות רשומה + HTTP 409; שינוי קטגוריה/מחיקתה בעסקה; כל מסלולי הכתיבה בודקים נעילת שחזור באותו גבול טרנזקציה.
- **אבטחת גיבויים:** R2 bucket פרטי עם Access Keys בעלי הרשאות מינימליות; כל קובץ כולל checksum. הדרישה שאושרה היא הגנה באמצעות הרשאות, **לא הצפנה אפליקטיבית ייעודית**; HTTPS והגנות ספק האחסון חלות כרגיל.
- **תאימות PWA:** cache מבודד לנתוני המשתמש המשפחתי; אין להציג נתונים רגישים במסך Login לאחר Logout. לבצע בדיקת ניתוק סיסמה גם כשהמכשיר השני Offline.
- **אסטרטגיית בדיקות מול Supabase Dev בענן (ללא DB מקומי):**
  - בדיקות לוגיקה טהורה (חישובי תקופות, ולידציה, CSV) רצות ב-Vitest ללא DB.
  - בדיקות אינטגרציה ו-Playwright יוצרות נתונים עם סימון מזהה (קטגוריות שמתחילות ב-`__test__`, ותיאור הוצאות עם אותה תחילית) ומנקות אותם בסיום כל ריצה. סקריפט `npm run test:reset` מוחק את כל נתוני הבדיקה ב-Dev.
  - אסור להריץ בדיקות מול Production.
  - **שעון ניתן להזזה:** כל הלוגיקה התלויה בזמן (30 יום בסל, 7 ימי התראה, 30 יום ל-Session, גיבוי חודשי, תפוגת נעילה) מקבלת את ״עכשיו״ דרך פונקציה אחת (`now()`), שבבדיקות ניתן לקבוע לה ערך, כדי לבדוק אירועים עתידיים בלי להמתין.
- **בדיקות חובה:** שני מכשירים עורכים אותה הוצאה; שינוי/מחיקת קטגוריה בזמן עריכה; מחיקה בזמן עריכה; שגיאות CSV ו-Retry ללא כפילויות; שינוי סיסמה וביטול Sessions; Email חדש מאומת; גיבוי של נתוני סל המחזור; Snapshot עקבי בזמן כתיבה; שחזור מוצלח; כישלון ביצירת safety; כישלון שחזור עם Rollback; מניעת כתיבות בזמן שחזור; שחזור לאחר מחיקת נתונים; גיבוי/שחזור בתוך מגבלות Vercel.
- **ניטור:** לוגים של שגיאות Jobs ושל זמני ריצה ב-Vercel; רישום תוצאת כל גיבוי ושחזור ב-DB. לא לחשוף סכומי הוצאות או סיסמאות בלוגים.
- **Scalability:** פתרון זה מיועד לבית יחיד. Postgres ו-Vercel יכולים לתמוך בנפח גדל; במקרה של גיבויים גדולים, מעבירים את Worker בלבד. אין להוסיף Queue או Microservices לפני צורך מוכח.

## 10. מקורות רשמיים ומגבלות מחקר

1. Next.js Route Handlers – https://nextjs.org/docs/app/getting-started/route-handlers
2. Supabase pricing – https://supabase.com/pricing
3. Supabase Free projects and pausing – https://supabase.com/docs/guides/platform/billing-on-supabase ; https://supabase.com/docs/guides/platform/free-project-pausing
4. Supabase Database Migrations – https://supabase.com/docs/guides/deployment/database-migrations ; https://supabase.com/docs/guides/local-development/cli-workflows
5. Supabase Realtime and Authorization – https://supabase.com/docs/guides/realtime/subscribing-to-database-changes ; https://supabase.com/docs/guides/realtime/authorization
6. Supabase Auth password reset and SMTP – https://supabase.com/docs/guides/auth/passwords ; https://supabase.com/docs/guides/auth/auth-smtp
7. Supabase Database Backups – https://supabase.com/docs/guides/platform/backups
8. Vercel Hobby, Cron, Functions – https://vercel.com/docs/plans/hobby ; https://vercel.com/docs/cron-jobs/usage-and-pricing
9. Cloudflare R2 pricing and S3 API – https://developers.cloudflare.com/r2/pricing/ ; https://developers.cloudflare.com/r2/get-started/s3/
10. Supabase Auth sessions (Time-box ב-Pro בלבד, `auth.sessions`, תוקף JWT) – https://supabase.com/docs/guides/auth/sessions
11. Gmail SMTP וסיסמאות אפליקציה – https://support.google.com/accounts/answer/185833
12. GitHub Environments בתוכנית Free – https://docs.github.com/en/actions/reference/workflows-and-actions/deployments-and-environments

המקורות תומכים ביכולות השירותים ובמכסותיהם במועד הבדיקה. תכנון Session מותאם, Realtime, Snapshot ושחזור הוא **החלטה ארכיטקטונית לפרויקט** ולא יכולת מובנית שהספקים מבטיחים; יש לאמת אותה בבדיקות אינטגרציה לפני שימוש בנתונים אמיתיים.
