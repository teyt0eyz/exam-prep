# Applications for Business (BIZ) — outline

Source of truth: `docs/APP-BUSINESS/` (FutureSkill course slides). The subject is made of 8 short courses.
The subject's official name and exam date are not in the docs; the title in `lib/subjects.ts` is a working name.

## Courses and documents

| Course (as listed by the student) | Document | Pages | Lessons |
|---|---|---|---|
| เสกกราฟิกธุรกิจให้ปัง ด้วย Nano Banana | AI Graphic with Nano Banana (Gemini) .pdf | 68 | 01, 02, 02a, 03 |
| การวิเคราะห์ข้อมูลเบื้องต้นโดยใช้ Excel | FutureSkill_Introduction to Data Analysis in Excel (1).pdf | 75 | 04–07 |
| การสร้างรายงานบน Excel โดยใช้ Pivot Table และ Pivot Chart | FutureSkill_Create Report on Excel with Pivot Table and Pivot Chart.pdf | 48 | 08–10 |
| วิธีใช้งาน ChatGPT ช่วยวิเคราะห์ข้อมูลใน Google Sheet | [01WAI1] EP.1 … (1).pdf | 29 | 11–12 |
| เริ่มต้นใช้งาน Notion สำหรับมือใหม่ | [01NT1] Slide FutureSkill_Notion EP1.pdf | 125 | 13–15 |
| สร้างระบบบัญชีอัตโนมัติด้วย Excel | FutureSkill_Excel for Accounting_Chapter 2.1–2.5.pptx.pdf | 23 | 16 |
| สูตรลัด Excel ที่ใช้บ่อยที่สุดในงานจริง | **no document** | – | 17 (เสริม) |
| สร้าง Dashboard เบื้องต้นใน Excel แบบมือโปร | **no document** | – | 18 (เสริม) |

## Simulations

| Sim | Lesson | Preset from the docs |
|---|---|---|
| `prompt-builder` | 02 | Nano Banana p.23 cookie-box prompt |
| `clean-data` | 06 | Data Analysis p.52 (duplicates, errors, missing values, formatting) |
| `pivot-table` | 08 | Pivot p.14 Gross income per Branch |
| `journal-post` | 16 | Accounting ch.2.3 p.3 Post button (Dr = Cr, then ledger and trial balance) |

## How the slides were read

Most slides are screenshots or infographics with little extractable text. Every page's text layer was read; the image-only pages (about 150) were then viewed as rendered images, except the Zapier step-by-step screenshots (Notion p.97–104).
Content that is not on a slide is wrapped in an `<Extra>` box (Excel menu paths in lessons 08–10 and 16) or stated as an example written for the lesson.

## Where the docs are thin or differ from general knowledge

- Data Analysis p.70 labels `=MAX(F2:F1001)` as "วันที่เริ่มต้น" and `=MIN(...)` as "วันสิ้นสุด", which is the reverse of what the formulas return (DocNote in lesson 06). No quiz question depends on it.
- Pivot slides chart the monthly example as clustered columns, not a line chart; lesson 10 follows the slides.

- Accounting slides contain headings only. The VBA sample and the XLOOKUP formula in lesson 16 are written to match those headings.
- Accounting ch.2.3 writes `msg("Hello World")`; real VBA is `MsgBox "Hello World"` (DocNote in lesson 16).
- Pivot slides translate Gross income as "รายได้" and Gross margin (%) as "เปอร์เซ็นต์รายได้"; in accounting these are gross profit and gross margin (DocNote in lesson 08). Quiz follows the slides.
- Data Analysis p.9 (Gartner graphic) lists "spreadsheets" under Unstructured, while the slide's own quizzes treat tabular data as Structured (DocNote in lesson 04). Quiz follows the quizzes.
- Pivot chapters 2–4 list what is taught but demonstrate it live; menu paths in lesson 09 come from Excel itself.
- Notion plan prices and limits (p.13) are a snapshot from when the slides were made.

## Quiz weights (70 per set)

Nano Banana 12 · Data Analysis 12 · Pivot 11 · ChatGPT in Sheets 8 · Notion 12 · Excel Accounting 5 · Excel formulas (เสริม) 6 · Excel Dashboard (เสริม) 4
