# Web Application Development — Outline

- เอกสารใน `docs/WEB/`: 13 ไฟล์ (อ่านครบทุกหน้า ไฟล์ชุด JavaScript 8 ไฟล์เป็นภาพล้วน อ่านจากภาพ)
- อาจารย์สอนเพิ่มโดยไม่มีเอกสาร (ตามที่ผู้เรียนแจ้ง): React, backend, Express.js, Bruno, Next.js → ทำเป็นบทเรียน **เสริม** เขียนจากความรู้ทั่วไป

## ไฟล์และตัวย่อ

| ย่อ | ไฟล์ | หน้า | เรื่อง |
|---|---|---|---|
| HTTP | `HTTP for Developer.pdf` | 36 | WWW, client–server, HTTP message, status code, Content-Type, URL, DNS, stateless |
| EX | `HTML_EXERCISES.pdf` | 10 | โครงสร้าง HTML, heading, paragraph, image, link, list, table, div |
| TBL | `HTML Table _ List.pdf` | 23 | table, list, image, lazy loading, video, audio |
| HJS | `HTML JavaScript.pdf` | 10 | onclick, `<script>`, ไฟล์ภายนอก, `defer` |
| VAR | `JavaScript - Variable.pdf` | 6 | let / const / var, การตั้งชื่อ, scope |
| OP | `JavaScript - Operator.pdf` | 3 | arithmetic, comparison, `==` กับ `===` |
| STR | `JavaScript - String _ Number(1).pdf` | 2 | string method, number, random |
| STY | `JavaScript - Style Guide.pdf` | 1 | naming case |
| FN | `JavaScript Function - A Cheat Sheet for Developer.pdf` | 3 | function, parameter, return, arrow function |
| ARR | `JavaScript - Array.pdf` | 8 | index, push/pop/shift/unshift, loop, destructuring, map/filter/find/reduce |
| OBJ | `JavaScript - Object.pdf` | 8 | property, method, this, for...in, destructuring, spread/rest, JSON |
| DOM | `JavaScript DOM.pdf` | 2 | เลือก แก้ สร้าง ลบ element, event listener |
| RJS | `JavaScript - for React.pdf` | 2 | รายการแนวคิด JavaScript ที่ต้องรู้ก่อนเรียน React |

## บทเรียน

| # | บทเรียน | ที่มา | sim |
|---|---|---|---|
| 01 | เว็บทำงานอย่างไร: client–server, URL, DNS | HTTP | http-request |
| 02 | HTTP message, status code, Content-Type | HTTP | http-request |
| 03 | HTML พื้นฐาน | EX | – |
| 04 | Table, List, Image, Video, Audio | TBL, EX | – |
| 05 | ใส่ JavaScript ใน HTML | HJS | – |
| 06 | Variable: let, const, var | VAR, STY | js-scope |
| 07 | Operator, String และ Number | OP, STR | – |
| 08 | Function | FN | – |
| 09 | Array พื้นฐาน | ARR | array-basic |
| 10 | Array: map, filter, find, reduce | ARR | array-methods |
| 11 | Object | OBJ | – |
| 12 | Spread, Rest และ JSON | OBJ | – |
| 13 | DOM manipulation | DOM | – |
| 14 | JavaScript ที่ต้องรู้ก่อน React | RJS | – |
| 15 | React พื้นฐาน (เสริม) | ไม่มีเอกสาร | – |
| 16 | Backend และ REST API (เสริม) | ไม่มีเอกสาร | – |
| 17 | Express.js (เสริม) | ไม่มีเอกสาร | – |
| 18 | ทดสอบ API ด้วย Bruno (เสริม) | ไม่มีเอกสาร | – |
| 19 | Next.js (เสริม) | ไม่มีเอกสาร | – |

## จุดที่เอกสารพิมพ์ผิดหรือต่างจากของจริง

| ในเอกสาร | ของจริง | ที่มา |
|---|---|---|
| `str.startWith()`, `str.endWith()` | `startsWith()`, `endsWith()` | STR p.1 |
| `parseInv(val)` | `parseInt(val)` | STR p.1 |
| `randomMinMax` คืน `Math.floor(Math.random() * (max-min+1))+1` | ต้องบวก `min` ไม่ใช่ `1` (บรรทัดสูตรด้านบนในสไลด์เขียน `+ min`) | STR p.2 |
| `arr.include(el, start)` ในรายการ method | `includes` (โค้ดตัวอย่างในสไลด์ใช้ `includes`) | ARR p.4 |
| หัวข้อ "Object.key() and Object.value()" | `Object.keys()`, `Object.values()` (โค้ดในสไลด์ถูก) | OBJ p.6 |
| `<ul type="disk">` | `disc` | TBL p.11 |
| comparison operator `!!` ในรายการ | `!=` (ตารางในสไลด์ถูก) | OP p.1 |
| 303 = "Redirect for Undefined Reason", 4xx = "Application Error" | 303 See Other, 4xx Client Error | HTTP p.25 |
| ตาราง status: 401 / 403 = "Unauthorized" | 401 Unauthorized, 403 Forbidden (หน้า 25 ของสไลด์เองเรียก 403 ว่า Forbidden) | HTTP p.26 |
| เฉลย `delKey` ใช้ `const { age, ...remain } = obj` | ใช้ได้กับ key ชื่อ age เท่านั้น ไม่ได้ใช้ parameter `propertyName` | OBJ p.8 |
| reduce แบบ object เริ่ม `min: 0` | ค่า min จะได้ 0 เสมอเมื่อข้อมูลเป็นบวก | ARR p.8 |

## น้ำหนักข้อสอบจำลอง (เดา)

ไม่มีข้อสอบเก่าและไม่มีเกณฑ์คะแนน น้ำหนักตามปริมาณเอกสาร และกันส่วนหนึ่งให้เรื่องที่สอนแต่ไม่มีเอกสาร

| หัวข้อ | ข้อ / ชุด 70 ข้อ |
|---|---|
| Web และ HTTP | 9 |
| HTML | 8 |
| Variable, Operator, String, Number | 10 |
| Function | 5 |
| Array | 11 |
| Object, Spread และ JSON | 8 |
| DOM และ JavaScript ใน HTML | 6 |
| React (เสริม) | 5 |
| Backend, Express และ Bruno (เสริม) | 5 |
| Next.js (เสริม) | 3 |

## Supplementary coverage added for frontend and backend (no lecturer docs)

The lecturer also teaches React, backend, Express, Bruno and Next.js, and no slides exist for them.
These lessons are written from general knowledge and marked `extra: true`:

| Lesson | Covers | Sim |
|---|---|---|
| 05a-css-basics | selectors, specificity, box model, display, flexbox, media query | – |
| 14a-async-fetch | Promise, async/await, ordering, fetch, res.ok, Promise.all | event-loop |
| 15-react-basics | component, JSX, props, useState, lists, events, useEffect | – |
| 15a-react-forms-state | controlled input, onSubmit, immutable array/object updates, lifting state | – |
| 15b-react-effects-data | dependency array, cleanup, loading/error/data, useRef, useContext, custom hook | – |
| 16-backend-rest-api, 17-express, 18-bruno | REST, routes, req/res, middleware, API testing | – |
| 17a-express-validation-errors | middleware order, validation, error handler, CORS, .env, project structure | express-pipeline |
| 17b-database-crud | SQL vs NoSQL, keys, SELECT/INSERT/UPDATE/DELETE, SQL injection, ORM | – |
| 17ba-mongodb | collection/document/_id, CRUD methods and operators, embed vs reference, Mongoose | – |
| 17c-auth-jwt | authentication vs authorization, hashing, JWT, session/cookie, 401 vs 403 | – |
| 19-nextjs | App Router, server/client components, route handlers | – |
| 19a-fullstack-flow | one request traced end to end, who validates what, debugging by symptom | – |

Quiz weights per set (70): HTTP 7 · HTML 6 · Variable/Operator/String 7 · Function 4 · Array 8 · Object/JSON 6 · DOM 4
(60% from the slides) · Async/fetch 4 · CSS 2 · React 8 · Backend/Database (SQL and MongoDB)/Auth 12 · Next.js 2 (40% supplementary).
Per the student (2026-10-10) the lecturer does not fix a tech stack; the aim is understanding full-stack concepts, so both SQL and MongoDB are covered and tools appear only as examples.
