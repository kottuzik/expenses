# תוכנית Milestone 2 – ניהול קטגוריות והוצאות מקצה לקצה

> מבוסס על `MILESTONES.md` (Milestone 2), `PRD.md` (3.ב, 4.1, 4.2, 4.5, Edge Cases), `ARCHITECTURE.md` (סעיפים 1, 3, 5, 9 ו-ADR-1–6), `DESIGN.md` (1.4, 1.5, 1.6, 1.12, ניווט, פריסת Desktop, Style Guide) והתמונות `wireframes.png`, `mockups.png`.
> מצב נוכחי: Milestone 1 ✅ – Next.js 16 עם `proxy.ts`, כניסה בסיסמה, `checkSession`, `createAdminClient`, `now()`, `isSameOrigin`, מעטפת ניווט, Migration תשתית (`app_state`, `change_signals`, `login_attempts`). מסך ״הוצאות״ ו״קטגוריות״ מוצגים כ״בקרוב״.

## 1. מטרה ותוצר

משפחה מנהלת קטגוריות (הוספה, שינוי שם/צבע, מחיקה עם העברת הוצאות) ומוסיפה, עורכת, משכפלת, מסננת, ממיינת ומדפדפת בהוצאות שנשמרות ב-Supabase Development. כל הוולידציות נאכפות גם בשרת וגם ב-DB.

**מחוץ לטווח של Milestone זה** (מתוכנן ל-Milestones הבאים):
- מחיקת הוצאה לסל מחזור ופעולת ״מחיקה״ בתפריט הפריט – Milestone 4 (העמודה `deleted_at` נוצרת כבר עכשיו, והרשימה מסננת לפיה).
- זיהוי התנגשויות עריכה (409 לפי `version`), Realtime וטריגרי `data_epoch` – Milestone 4 (העמודה `version` נוצרת ומתעדכנת כבר עכשיו).
- Dashboard, סיכומים וכפתור הוספה ב-Dashboard – Milestone 3.
- כפתור ״ייצוא CSV״ במסך ההוצאות – Milestone 5 (לא יוצג עכשיו).
- נעילת שחזור (`maintenance_mode`) במסלולי הכתיבה – Milestone 7.
- מצב Offline מלא (PWA) – Milestone 6. כאן רק חסימת שמירה כשאין חיבור.

## 2. שלבי עבודה (סדר הבנייה)

### שלב A – תלויות
- Runtime: `@tanstack/react-query`, `react-hook-form`, `@hookform/resolvers`, `date-fns`, `@date-fns/tz` (כולן כבר נבחרו ב-ARCHITECTURE).
- Dev: `pg` + `@types/pg` – לבדיקות DB בתוך טרנזקציה שמתבטלת (ROLLBACK) מול Dev, דרך `DATABASE_URL` הקיים ב-`.env` (ראו ADR בסעיף 4).
- לא נדרשים חשבונות, שירותים או משתני סביבה חדשים.

### שלב B – Migration (`supabase/migrations/<timestamp>_categories_expenses.sql`)
**`categories`:**
- `id uuid PK default gen_random_uuid()`, `name text not null`, `normalized_name text generated always as (lower(regexp_replace(btrim(name), '\s+', ' ', 'g'))) stored`, `color text not null`, `created_at`, `updated_at`, `version bigint not null default 1`.
- `CHECK (char_length(btrim(name)) between 1 and 30)`; `UNIQUE (normalized_name)` – מונע כפילויות אחרי התעלמות מרווחים מיותרים ומהבדלי אותיות גדולות/קטנות.
- `CHECK (color in (...12 ערכי הפלטה מ-DESIGN 2.1...))`.

**`expenses`:**
- `id uuid PK`, `amount numeric(9,2) not null`, `expense_date date not null`, `category_id uuid not null references categories(id) on delete restrict`, `description text null`, `deleted_at timestamptz null`, `created_at`, `updated_at`, `version bigint not null default 1`.
- `CHECK (amount > 0 and amount <= 1000000)`, `CHECK (expense_date >= '2000-01-01')`, `CHECK (description is null or char_length(description) <= 200)`.
- אינדקסים: `(expense_date desc, id)`, `(category_id, expense_date)`, `(deleted_at, expense_date)`.

**טריגר משותף** `BEFORE UPDATE` לשתי הטבלאות: `updated_at = now()`, `version = old.version + 1`.

**קטגוריות התחלתיות** – בתוך ה-Migration (רץ פעם אחת בלבד), עם `ON CONFLICT (normalized_name) DO NOTHING` כהגנה נוספת, ובסדר `created_at` עולה כדי שיוצגו בסדר ה-PRD: מזון (ליים `#84C441`), ביגוד (ורוד `#EC4899`), רשויות (כחול `#3B82F6`), פנאי (ענבר `#F59E0B`), אחר (אפור `#6B7280`).

**פונקציית DB `delete_category(p_id uuid, p_replacement_id uuid)`** – עסקה אחת:
1. `pg_advisory_xact_lock` קבוע לקטגוריות (מונע שתי מחיקות מקבילות שישאירו אפס קטגוריות).
2. הקטגוריה לא קיימת → שגיאה `category_not_found`.
3. זו הקטגוריה האחרונה → שגיאה `last_category`.
4. יש לה הוצאות (כולל הוצאות עם `deleted_at`, לפי ARCHITECTURE 3) ואין חלופה, או שהחלופה זהה/לא קיימת → שגיאה `replacement_required` / `replacement_invalid`.
5. `UPDATE expenses SET category_id = p_replacement_id` ואז `DELETE` של הקטגוריה.
- `SECURITY INVOKER`, `set search_path = ''`, הרשאת הרצה ל-`service_role` בלבד.

**RLS והרשאות:** RLS מופעל בשתי הטבלאות, **ללא Policies**, ו-`revoke all` מ-`anon`/`authenticated` – כל קריאה וכתיבה עוברת רק דרך ה-API בשרת (ראו ADR בסעיף 4). Realtime של Milestone 4 מאזין ל-`change_signals` בלבד, ולכן אין צורך בגישת דפדפן לטבלאות האלה.

**הרצה:** `npm run db:push` מול Development בלבד; בדיקה שהקטגוריות ההתחלתיות נוצרו פעם אחת.

### שלב C – לוגיקה משותפת (`src/lib/`)
- `src/lib/categories/palette.ts` – 12 צבעי הפלטה (HEX + שם עברי), `firstUnusedColor(usedColors)` לברירת מחדל.
- `src/lib/dates.ts` – לפי `Asia/Jerusalem` עם `@date-fns/tz`: `todayIsrael(now())` → `YYYY-MM-DD`; `formatDisplayDate('2024-08-12')` → `12.08.2024`; `parseDisplayDate('12.08.2024')` → ISO או `null` (כולל דחיית תאריך לא קיים כמו 31.02).
- `src/lib/format.ts` – `formatCurrency` עם `Intl.NumberFormat('he-IL', {style:'currency', currency:'ILS'})`.
- `src/lib/validation/expense.ts` – סכמת Zod אחת ללקוח ולשרת:
  - `amount`: מחרוזת בלבד (לא Float), `^\d+(\.\d{1,2})?$`, פסיק מומר לנקודה, `> 0` ו-`<= 1000000` (השוואה על המחרוזת/אגורות שלמות, לא Floating Point). נשלחת ל-DB כמחרוזת כדי ש-`numeric` לא יעגל.
  - `expenseDate`: ISO תקין, `>= 2000-01-01`, `<= todayIsrael(now())` – התאריך של היום נקבע בשרת, לא לפי שעון הלקוח.
  - `categoryId`: UUID חובה.
  - `description`: אופציונלי, `trim`, מחרוזת ריקה → `null`, עד 200 תווים.
  - הודעות שגיאה בעברית לכל שדה (למשל ״יש להזין סכום גדול מ-0״, ״הסכום המרבי הוא ₪1,000,000״, ״עד שתי ספרות אחרי הנקודה״, ״לא ניתן לבחור תאריך עתידי״, ״התאריך המוקדם ביותר הוא 01.01.2000״, ״יש לבחור קטגוריה״, ״עד 200 תווים״).
- `src/lib/validation/category.ts` – `name` (trim, 1–30 תווים), `color` (`enum` של 12 הצבעים).
- `src/lib/validation/expense-query.ts` – פרמטרי רשימה: `from`, `to` (ISO, אופציונליים, `from <= to`), `categoryId` (אופציונלי), `sort` ∈ `date_desc | date_asc | amount_desc | amount_asc` (ברירת מחדל `date_desc`), `page` ≥ 1.

### שלב D – שכבת נתונים בשרת (`src/lib/data/`)
- `categories.ts`: `listCategories()` – כולל `expense_count` (ספירה של כל ההוצאות המשויכות, לצורך דרישת החלופה), ממוין לפי `created_at`; `createCategory`, `updateCategory` (שגיאת `23505` → `duplicate_name`); `deleteCategory(id, replacementId)` → קריאה ל-RPC ומיפוי שגיאות.
- `expenses.ts`:
  - `listExpenses(query)` – `deleted_at IS NULL`, סינון `expense_date >= from AND expense_date <= to` (שני הקצוות כלולים), קטגוריה אחת או הכל, מיון עם שובר שוויון קבוע (תאריך: `expense_date, created_at, id`; סכום: `amount, expense_date desc, id`), `range()` של 20 ו-`count: 'exact'`. שליפה עם קטגוריה מוטמעת (`category:categories(id,name,color)`) – כך ששינוי שם/צבע מופיע מיד גם בהוצאות עבר.
  - `getExpense(id)`, `createExpense(data)`, `updateExpense(id, data)` (רק `deleted_at IS NULL`; לא נמצא → 404). קטגוריה שנמחקה בינתיים (`23503`) → `category_missing`.
- הכול דרך `createAdminClient()`, רק אחרי בדיקת Session.

### שלב E – API (`src/app/api/`)
עזר משותף `src/lib/api/route.ts`: בדיקת Session (`hasValidSession` → 401), בדיקת `Origin` לכל פעולת שינוי (→ 403), פענוח JSON + Zod (→ 400 עם `fields` לכל שדה), ומיפוי שגיאות דומיין לקודים. תגובות `Cache-Control: private, no-store`.

| נתיב | פעולות |
|---|---|
| `GET /api/categories` | רשימה כולל `expenseCount` |
| `POST /api/categories` | יצירה; 409 `duplicate_name` |
| `PATCH /api/categories/:id` | שינוי שם ו/או צבע; 409 `duplicate_name`; 404 |
| `DELETE /api/categories/:id` | גוף `{ replacementId? }`; 409 `last_category` / `replacement_required`; 400 `replacement_invalid` |
| `GET /api/expenses` | רשימה מסוננת וממוינת: `{ items, total, page, pageSize: 20 }` |
| `POST /api/expenses` | יצירה (משמשת גם לשכפול – השכפול נעשה בטופס) |
| `GET /api/expenses/:id` | הוצאה אחת (לטעינת טופס עריכה/שכפול) |
| `PATCH /api/expenses/:id` | עדכון; 404 אם לא קיימת; 409 `category_missing` |

### שלב F – UI משותף (`src/components/`)
- `QueryProvider` (TanStack Query) בתוך ה-Layout המוגן; invalidate של `expenses`/`categories` אחרי כל שינוי.
- `ui/Dialog` – מבוסס `<dialog>` עם `showModal()` (מלכודת Focus, Esc, נגישות). **במובייל** מוצג כמסך מלא עם ״X״ בכותרת (כמו ב-Wireframe); **ב-Desktop** כחלון ממורכז ברוחב 480px (DESIGN).
- `ui/ConfirmDialog` – אישור עם שתי פעולות (משמש לאזהרת יציאה ולמחיקת קטגוריה).
- `ui/Toast` – הודעת הצלחה/כישלון עם `aria-live` (״ההוצאה נשמרה״, ״הקטגוריה עודכנה״ וכו׳).
- `ui/TextField`, `ui/Select`, `ui/DateField`:
  - `DateField` – שדה טקסט שמציג ומקבל `DD.MM.YYYY` (כנדרש ב-DESIGN), עם כפתור לוח שנה שפותח את בורר התאריכים המובנה של המכשיר (`input type="date"` נסתר עם `min=2000-01-01` ו-`max=היום`), כך שלא ניתן לבחור בו תאריך עתידי.
  - שדות סכום ותאריך ב-`dir="ltr"` בתוך פריסת RTL, `inputMode="decimal"` לסכום, סימן ₪ בתווית.
- `ui/CategoryDot` – עיגול צבע + שם הקטגוריה (אף פעם לא צבע בלבד).
- `hooks/useOnline` – מצב חיבור לפי `navigator.onLine` ואירועי `online`/`offline`; כשאין חיבור מוצג פס ״אין חיבור לאינטרנט – לא ניתן לשמור שינויים״ וכפתורי השמירה/מחיקה מושבתים. כישלון רשת בשמירה מציג שגיאה ומשאיר את הנתונים בטופס.
- `hooks/useUnsavedChangesGuard(isDirty)` – אזהרה ״יש שינויים שלא נשמרו״ עם ״המשך עריכה״ / ״יציאה ללא שמירה״ בעת: ״ביטול״, ״X״, Esc ולחיצה על ״חזור״ בדפדפן (רשומת History שנוספת בפתיחת הטופס ומאזין `popstate`); `beforeunload` לרענון/סגירת לשונית.

### שלב G – טופס הוצאה (`src/components/expenses/ExpenseFormDialog.tsx`)
- React Hook Form + אותה סכמת Zod מהשרת. שדות לפי סדר ה-Wireframe: תאריך (ברירת מחדל היום), סכום (₪), קטגוריה (עם סמן צבע), תיאור (אופציונלי, מונה תווים עד 200).
- מצבים: ״הוספת הוצאה״, ״עריכת הוצאה״ (נטען מ-`GET /api/expenses/:id`), ושכפול – כותרת ״הוספת הוצאה״ עם כל הערכים של ההוצאה המקורית, ניתנים לעריכה; השמירה יוצרת הוצאה חדשה.
- שגיאות שרת (400 `fields`) מוצגות בשדה המתאים; `category_missing` → הודעה ובחירה מחדש של קטגוריה; כישלון אחר → הודעה, והנתונים נשארים בטופס.
- אחרי שמירה: סגירה, Toast והצגת הרשימה המעודכנת.

### שלב H – מסך ״הוצאות״ (`src/app/(app)/expenses/`)
- כותרת ״הוצאות״; ב-Desktop כפתור Primary ״הוספת הוצאה״ בכותרת; במובייל כפתור צף ״+״.
- **מסננים** (במובייל כאזור מעל הרשימה, ב-Desktop בשורה אחת): ״מתאריך״, ״עד תאריך״, קטגוריה (״כל הקטגוריות״ + רשימה), מיון (״תאריך – מהחדש לישן״, ״תאריך – מהישן לחדש״, ״סכום – מהגבוה לנמוך״, ״סכום – מהנמוך לגבוה״), וכפתור ״ניקוי סינון״. מצב הסינון, המיון והעמוד נשמר בכתובת הדף (`?from=&to=&category=&sort=&page=`) – כך שרענון וחזרה לא מאבדים אותו. שינוי סינון/מיון מחזיר לעמוד 1.
- **רשימה:** במובייל – שורות לפי DESIGN 1.4: טקסט ראשי = תיאור, ואם אין – שם הקטגוריה; מתחתיו התאריך `DD.MM.YYYY`; סמן צבע + שם קטגוריה; הסכום בצד שמאל. ב-Desktop – טבלה: תיאור, קטגוריה, תאריך, סכום, פעולות. אין אייקון קטגוריה.
- לחיצה על שורה (או Enter במקלדת) פותחת את טופס העריכה. תפריט ״⋮״ עם ״שכפול״ (״מחיקה״ תתווסף ב-Milestone 4).
- **Pagination:** ״הקודם״ / ״עמוד X מתוך Y״ / ״הבא״, 20 פריטים בעמוד, ונתוני `total` מהשרת.
- מצבים: טעינה, שגיאה עם ״נסו שוב״, אין הוצאות בכלל (״עדיין אין הוצאות – הוסיפו את הראשונה״), אין תוצאות לסינון (עם ״ניקוי סינון״).

### שלב I – מסך ״קטגוריות״ (`src/app/(app)/categories/`)
- כותרת ״קטגוריות״ ופעולת ״הוספה״ (״+״). רשימה של כל הקטגוריות – גם ללא הוצאות – עם עיגול צבע, שם וכפתורי ״עריכה״ ו״מחיקה״ (עם תוויות נגישות).
- **הוספה/עריכה** בחלון (Dialog): שם (עד 30 תווים) ורשת 12 עיגולי צבע כ-Radio group (שם הצבע כתווית נגישה, Focus ירוק נראה). ברירת מחדל להוספה: הצבע הראשון שלא בשימוש. שם כפול → ״כבר קיימת קטגוריה בשם הזה״.
- **מחיקה:**
  - קטגוריה ללא הוצאות → אישור ״למחוק את הקטגוריה X?״.
  - קטגוריה עם הוצאות → ״לקטגוריה X יש N הוצאות. לאן להעביר אותן?״ + בחירת קטגוריה חלופית (חובה), ואז מחיקה בעסקה אחת בשרת.
  - כשנותרה קטגוריה אחת – כפתור המחיקה מושבת, עם הסבר ״חייבת להישאר לפחות קטגוריה אחת״.
- אזהרת שינויים שלא נשמרו גם בטופס הקטגוריה.

### שלב J – ניווט
- `nav-items.ts`: ״קטגוריות״ מקבל `href: "/categories"` (מופיע אוטומטית בניווט הצד ב-Desktop).
- מסך ״עוד״: פריט עם `href` מוצג כקישור עם חץ ניווט (במקום התגית ״בקרוב״); השאר נשארים ״בקרוב״.
- `src/app/(app)/expenses/page.tsx` מחליף את ה-`ComingSoon`.

### שלב K – בדיקות
**Vitest (ללא DB):**
- סכמת הוצאה: סכום `0`, שלילי, `1000000` (תקין), `1000000.01`, `12.345`, `12,5` (מומר), טקסט; תאריך היום (תקין), מחר (עם `setNow`), `1999-12-31`, `2000-01-01` (תקין), `31.02.2024`; קטגוריה חסרה; תיאור 200 (תקין) / 201 תווים; תיאור ריק → `null`.
- סכמת קטגוריה: שם ריק / רווחים בלבד / 31 תווים; צבע מחוץ לפלטה.
- `todayIsrael` סביב חצות (UTC לעומת ישראל), `formatDisplayDate`/`parseDisplayDate`, `formatCurrency`, `firstUnusedColor`.
- פרמטרי רשימה: `from > to` נדחה, ברירות מחדל.
- RTL: `ExpenseFormDialog` – שגיאות בשדות, אזהרת יציאה עם שינויים (ובלי שינויים – אין אזהרה), שכפול ממלא ערכים וכותרת ״הוספת הוצאה״, שמירה מושבתת כשאין חיבור; טופס קטגוריה – ברירת מחדל צבע, מחיקה מושבתת לקטגוריה אחרונה.

**Vitest אינטגרציה מול Supabase Dev:**
- **DB בטרנזקציה שמתבטלת** (`pg` + `DATABASE_URL`, `BEGIN … ROLLBACK` – אין שינוי נתונים אמיתי): Constraints דוחים סכום 0 / 1000000.01, תאריך 1999-12-31, תיאור 201 תווים, צבע מחוץ לפלטה, שם כפול (`'  מזון '`, `'מזון'` → כפילות), FK לקטגוריה לא קיימת; `version`/`updated_at` עולים בעדכון; `delete_category` – חוסם את הקטגוריה האחרונה (בתוך הטרנזקציה נמחקות שאר הקטגוריות כדי לייצר את המצב), דורש חלופה, מעביר את **כל** ההוצאות (כולל `deleted_at`) ומוחק; קטגוריות התחלתיות קיימות פעם אחת.
- **RLS:** לקוח `anon` ולקוח מאומת (Publishable key) אינם קוראים/כותבים `categories`/`expenses` ואינם מריצים `delete_category`.
- **שכבת הנתונים** (`listExpenses` עם נתוני `__test__`): 45 הוצאות בקטגוריית `__test__` → עמודים של 20/20/5; סינון טווח כולל את שני הקצוות; מיון בארבעת הכיוונים; הוצאה עם `deleted_at` לא מופיעה; שינוי שם קטגוריה מופיע בהוצאות עבר.

**Playwright (Desktop 1280×800 + Mobile Pixel 7):**
- ללא Session: `GET/POST /api/expenses`, `/api/categories` → 401; `/expenses`, `/categories` → הפניה ל-`/login`.
- ולידציה בשרת (בקשות API ישירות עם Session, עוקפות את הלקוח): כל המקרים הלא תקינים מה-DoD → 400; צבע מחוץ לפלטה → 400; מחיקת קטגוריה עם הוצאות ללא חלופה → 409; `Origin` זר → 403.
- הוספת הוצאה → מופיעה ברשימה; עריכה → מתעדכנת; שכפול → נוצרת הוצאה נוספת; הוצאה ללא תיאור מוצגת בשם הקטגוריה.
- יציאה מטופס עם שינויים → אזהרה; ״המשך עריכה״ שומר נתונים; ״יציאה ללא שמירה״ סוגרת.
- סינון לפי קטגוריית `__test__` וטווח תאריכים, מיון, מעבר לעמוד 2 וחזרה.
- קטגוריות: הוספה, שם כפול נחסם, שינוי שם וצבע ← מתעדכן ברשימת ההוצאות, מחיקה עם חלופה ← ההוצאות עוברות.
- Desktop: הטופס כחלון 480px, רשימה כטבלה, ״קטגוריות״ בניווט הצד; Mobile: טופס במסך מלא, כפתור צף, כניסה לקטגוריות ממסך ״עוד״.
- Offline (`context.setOffline(true)`): הודעת ״אין חיבור״ וכפתור השמירה מושבת.

**נתוני בדיקה:** כל קטגוריה שנוצרת בבדיקות מתחילה ב-`__test__`, וכל תיאור הוצאה ב-`__test__`. `scripts/test-reset.ts` מורחב: מוחק הוצאות של קטגוריות `__test__` או עם תיאור `__test__`, ואז את קטגוריות ה-`__test__`. הבדיקות מנקות בסיום, ולא נוגעות בקטגוריות ההתחלתיות.

### שלב L – תיעוד ואימות
- `README.md`: עדכון קצר (מסכים חדשים, `npm run db:push` למיגרציה החדשה).
- ADRs ב-`ARCHITECTURE.md` (סעיף 4 למטה).
- הרצה עצמית: `npm run db:push` (Dev), `npm run typecheck`, `npm run lint`, `npm run build`, כל הבדיקות, בדיקה ידנית בדפדפן במובייל וב-Desktop; סגירת השרת; סימון 🟡 ב-`MILESTONES.md`. בלי commit.

## 3. מבנה קבצים צפוי

```text
supabase/migrations/<timestamp>_categories_expenses.sql
src/lib/categories/palette.ts
src/lib/dates.ts, format.ts
src/lib/validation/expense.ts, category.ts, expense-query.ts
src/lib/data/expenses.ts, categories.ts
src/lib/api/route.ts
src/app/api/categories/route.ts, [id]/route.ts
src/app/api/expenses/route.ts, [id]/route.ts
src/app/(app)/expenses/page.tsx, ExpensesScreen.tsx, expenses.module.css
src/app/(app)/categories/page.tsx, CategoriesScreen.tsx, categories.module.css
src/app/(app)/more/page.tsx (קישורים ליעדים שנבנו)
src/components/QueryProvider.tsx
src/components/expenses/ExpenseFormDialog.tsx, ExpenseList.tsx, ExpenseFilters.tsx, Pagination.tsx
src/components/categories/CategoryFormDialog.tsx, DeleteCategoryDialog.tsx, ColorPicker.tsx
src/components/ui/Dialog.tsx, ConfirmDialog.tsx, Toast.tsx, TextField.tsx, Select.tsx, DateField.tsx, CategoryDot.tsx, OfflineBanner.tsx (+ *.module.css)
src/hooks/useOnline.ts, useUnsavedChangesGuard.ts
scripts/test-reset.ts (הרחבה)
tests/unit/*.test.ts(x), tests/integration/db.ts (+ *.test.ts), tests/e2e/expenses.spec.ts, categories.spec.ts
```

## 4. החלטות טכניות לתיעוד כ-ADR בזמן הבנייה

1. **גישה לטבלאות `categories`/`expenses` דרך השרת בלבד** – RLS מופעל ללא Policies, והשרת ניגש עם ה-Secret key אחרי `checkSession`. מימוש מחמיר של ״כל קריאה או שינוי של מידע פיננסי דרך Route Handlers מאומתים״ (ARCHITECTURE 2); הדפדפן לא צריך גישה ישירה, כי Realtime יאזין רק ל-`change_signals`.
2. **מחיקת קטגוריה כפונקציית DB אחת** (`delete_category`) – Supabase JS אינו תומך בטרנזקציה של כמה פקודות; פונקציה מבטיחה שהעברת ההוצאות והמחיקה מתבצעות יחד, עם נעילה נגד מחיקות מקבילות.
3. **סכום כמחרוזת מקצה לקצה** – הלקוח והשרת אינם ממירים ל-Float; Zod בודק עד שתי ספרות ותחום, ו-PostgreSQL שומר `numeric(9,2)`.
4. **טופס אחד ב-`<dialog>`**: מסך מלא במובייל, חלון 480px ב-Desktop – מימוש יחיד שעומד ב-DESIGN בשני הגדלים, עם אזהרת יציאה שמכסה גם את כפתור ״חזור״ בדפדפן.
5. **שדה תאריך טקסטואלי `DD.MM.YYYY` + בורר מובנה** – בורר התאריכים של הדפדפן מציג פורמט לפי שפת המכשיר, ולכן התצוגה עצמה נשלטת בקוד.
6. **בדיקות DB בטרנזקציה שמתבטלת (`pg` + `DATABASE_URL` של Dev)** – מאפשר לבדוק מצבים כמו ״קטגוריה אחרונה״ בלי לפגוע בנתוני Dev; `DATABASE_URL` נשאר בשימוש מקומי בלבד ולא באפליקציה (בהתאם ל-ADR-4).

## 5. Definition of Done – איך כל סעיף ייבדק

| תנאי | בדיקה |
|---|---|
| כל Migrations הורצו ונבדקו ב-Development בלבד; קטגוריות התחלתיות לא נוצרות פעמיים | `npm run db:push` מול Dev; בדיקת אינטגרציה לספירת הקטגוריות ההתחלתיות + `ON CONFLICT` |
| סכום לא חיובי/מעל ₪1,000,000/יותר משתי ספרות, תאריך עתידי/לפני 2000, קטגוריה חסרה ותיאור מעל 200 נדחים גם בשרת; תיאור אופציונלי | Vitest לסכמה + Playwright API ישיר (400) + Constraints ב-DB בטרנזקציה מתבטלת |
| לא ניתן למחוק את הקטגוריה האחרונה; צבע מחוץ לפלטה נדחה בשרת | `delete_category` בטרנזקציה מתבטלת + API 400 לצבע + כפתור מושבת ב-UI |
| הוספה, עריכה ושכפול עובדים; יציאה עם שינויים דורשת בחירה מפורשת | Playwright בשני הגדלים + RTL |
| סינון, מיון ו-Pagination של 20 מול DB, כולל מעבר עמודים | אינטגרציה `listExpenses` (45 רשומות) + Playwright |
| שינוי קטגוריה משפיע על כל ההוצאות; מחיקה עם הוצאות מחייבת חלופה ומעבירה את כולן | אינטגרציה (כולל הוצאות עם `deleted_at`) + Playwright |
| משתמש לא מאומת אינו קורא/משנה; בדיקות CRUD ו-Constraints עוברות | Playwright 401 + RLS לקוח anon/מאומת + כל חבילות הבדיקה |

## 6. נקודות עצירה מול המשתמש במהלך הבנייה
- אין צורך בהקמת שירותים או בחשבונות חדשים. אם פרויקט Supabase Development הושהה (פרויקט חינמי) – לעצור ולהדריך להפעלה מחדש ב-Dashboard.
- אם `npm run db:push` נכשל – לעצור ולהציג את השגיאה, בלי לשנות דבר ידנית ב-Dashboard.
- אין commit/push בסיום – רק סימון 🟡.
