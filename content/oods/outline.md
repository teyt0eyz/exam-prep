# OODS — Outline (Step 1, รอ review)

สถานะ: **ร่างสำหรับตรวจ** ยังไม่ได้เขียนบทเรียน, simulation หรือข้อสอบ

- วิชา: Object Oriented Data Structures (สไลด์ใช้ชื่อ "Data Structure and Algorithms")
- ผู้สอน (ตามสไลด์): รศ.ดร.อรรถสิทธิ์ หล่าสกุล
- ภาษาที่ใช้สอน: Java
- อ่านครบทุกไฟล์ใน `docs/OOD/` แล้ว: 10 ไฟล์ 499 หน้า (อ่านจากภาพสไลด์ทุกหน้า เพราะเนื้อหาส่วนใหญ่เป็นรูป ไม่ใช่ text)

## 0. เรื่องที่ต้องให้ตัดสินใจก่อนเขียนบทเรียน

1. **ลำดับของสไลด์ OOP สองไฟล์** — `package_Inheritance.pdf` และ `Polymorhism.pdf` ไม่มีเลขครั้ง
   ผมวางไว้ **ก่อน** บทที่ 1 ด้วยเหตุผลสองข้อ: (ก) สไลด์ Inheritance p.39 บอกว่า Lab 3–4 ส่งได้ "ก่อนสอบกลางภาค"
   (ข) บทที่ 3 ใช้ `extends` / `implements` ทันทีโดยไม่อธิบาย ถ้าอาจารย์สอนลำดับอื่น บอกได้เลย
2. **`HTTP for Developer.pdf`** — เป็นสไลด์ภาษาอังกฤษเรื่อง HTTP, URL, status code ไม่เกี่ยวกับ data structure
   น่าจะเป็นของ Web App Dev หรือ IST ที่วางผิดโฟลเดอร์ ผม **ไม่ได้นับรวม** ใน outline นี้ (สรุปเนื้อหาอยู่ท้ายไฟล์ ข้อ 6)
3. **ขอบเขตเนื้อหา** — เอกสารมีถึงบทที่ 8 (Binary Tree) เท่านั้น ไม่มี Hash table, BST, AVL, Graph, Sorting
   (ยกเว้น Heap Sort ในบทที่ 7) ชื่อ BSTSet / AVLSet / HashSet โผล่แค่ในตารางเปรียบเทียบของบทที่ 1
   ผมจะไม่เพิ่มหัวข้อเหล่านี้ ถ้ามีสไลด์บทที่ 9 ขึ้นไป หรือขอบเขตสอบกว้างกว่านี้ ต้องเพิ่มไฟล์ก่อน
4. **ไม่มีไฟล์แบบฝึกหัดและข้อสอบเก่า** — สไลด์อ้างถึงแบบฝึกหัดทุกบท (ส่งทาง MS Teams) แต่ไม่มีไฟล์ใน `docs/`
   ถ้ามี จะช่วยให้เดาน้ำหนักข้อสอบและสไตล์โจทย์ได้แม่นขึ้นมาก
5. **ชื่อโฟลเดอร์** — เอกสารอยู่ที่ `docs/OOD/` แต่รหัสวิชาในเว็บคือ `oods` (ไฟล์นี้จึงอยู่ที่ `content/oods/`)
   ผมไม่ได้เปลี่ยนชื่อโฟลเดอร์ของคุณ field `source` ของข้อสอบจะอ้างตาม path จริง เช่น `docs/OOD/STACK_5 (1).pdf p.11`

### ตัวย่อไฟล์ที่ใช้อ้างอิง

| ย่อ | ไฟล์ | หน้า | หัวเรื่องในสไลด์ |
|---|---|---|---|
| INH | `package_Inheritance.pdf` | 62 | การสืบทอดคลาส (Inheritance)(1) + package |
| POLY | `Polymorhism.pdf` | 39 | Polymorphism, Abstract class, Interface |
| C12 | `COLLECTION_1_2n.pdf` | 77 | ครั้งที่ 1, 2 — Collection (fundamental) |
| C3 | `COLLECTION_3(LINKED).pdf` | 54 | ครั้งที่ 3 — Linked Collection |
| L4 | `LIST_4.pdf` | 53 | บทที่ 4 — รายการ (List) |
| S5 | `STACK_5 (1).pdf` | 42 | บทที่ 5 — กองซ้อน (Stack) |
| Q6 | `QUEUE_6.pdf` | 33 | บทที่ 6 — แถวคอย (Queue) #1 |
| Q7 | `QUEUE_7.pdf` | 44 | แถวคอย #2 — Priority Queue |
| T8 | `BinaryTREE_8.pdf` | 59 | บทที่ 8 — Binary Tree |

---

## 1. บทและหัวข้อตามลำดับที่สอน

รูปแบบ: **หัวข้อ** → แนวคิดหลัก · สูตร/อัลกอริทึม · ที่มา

### ส่วน A — Object-Oriented Programming (ลำดับเป็นการคาดเดา ดูข้อ 0.1)

#### บท A1: Package และ Inheritance — INH

**A1.1 Package** (INH p.2–5)
- จัดคลาสที่เกี่ยวข้องเป็นกลุ่ม ชื่อเต็ม = ชื่อ package + ชื่อคลาส เช่น `java.io.File`, `jlab.graphics.DWindow`
- `package com.lasakul;` ที่หัวไฟล์ และ `import com.attasit.ABC;` ในคลาสที่เรียกใช้

**A1.2 Inheritance พื้นฐาน** (INH p.6, 11, 17)
- `class B extends A` — A = superclass (คลาสแม่), B = subclass (คลาสลูก)
- คลาสลูกได้: object variable, object method ของแม่
- คลาสลูกไม่ได้: class variable, class method, constructor และเข้าถึง private variable ไม่ได้ (INH p.6)
- คลาสลูกเพิ่มตัวแปร/เมท็อดใหม่ได้ และเขียนเมท็อดแทนของเดิมได้ = **override**
- Java ไม่ให้ลบเมท็อดของ superclass และควรเลี่ยงชื่อ instance variable ซ้ำกับของแม่ (INH p.17)

**A1.3 `this` กับ `super`** (INH p.12–13)
- `this.var` / `super.var`, `this.method()` / `super.method()`
- `this(...)` เรียก constructor ในคลาสตัวเอง, `super(...)` เรียก constructor ของแม่
- ตัวอย่าง `Point2D` → `Point3D` (`super(x, y); this.z = z;`)

**A1.4 Constructor ใน inheritance** (INH p.14–16)
- คลาสที่ไม่มี constructor: compiler เพิ่ม default constructor ให้
- ถ้าบรรทัดแรกของ constructor ไม่ใช่ `this(...)` หรือ `super(...)` compiler เติม `super();` ให้
- ลำดับการทำงาน: constructor แม่ก่อนลูก ("I'm in A" แล้ว "I'm in B")
- ถ้าแม่มีแต่ `A(int x)` แล้วลูกเรียก `super()` → compile error

**A1.5 ตัวอย่างและ Lab** (INH p.7–10, 18–62)
- `Ball` → `ColoredBall` (เพิ่มสี, override `draw`), `Ball` → `BallG` (`dy += gravity; super.move(w);`)
- Lab Dot Matrix LED 5x7: `DotMatrixLED_5x7` → `DecimalLED_5x7` → ใช้ใน `IntegerLEDWindow_5x7 extends DWindow`
- Lab LED 8x8 แบบ byte: แปลง byte เป็น boolean ด้วย `(b >> i) & 1`, shift ซ้าย/ขวา, rotate
- หมายเหตุ: ส่วน Lab (ราว 40 หน้า) เป็นงานเขียนโปรแกรมกับ library `jlab.graphics` ผมคาดว่าออกสอบข้อเขียนน้อย
  จะสรุปเฉพาะแนวคิด inheritance ที่ใช้ ไม่ทำบทเรียนแยกเรื่อง LED

#### บท A2: Polymorphism, Abstract class, Interface — POLY

**A2.1 Polymorphism: หนึ่งอ็อบเจกต์หลายบทบาท** (POLY p.1, 3–4)
- ตัวอ้างอิงของคลาสแม่ (และบรรพบุรุษ) อ้างอ็อบเจกต์ของคลาสลูกหลานได้
- ลำดับชั้นตัวอย่าง: `Animal` ← `Dog`, `Cat`; `Dog` ← `Basenji`
- `Animal a = d;` ผ่าน แต่ `Dog d = c;` (c เป็น Cat) แปลไม่ผ่าน

**A2.2 Upcast / Downcast** (POLY p.5)
- upcast: `Animal a = new Dog();` ทำได้เสมอ
- `Dog d = a;` แปลไม่ผ่าน ต้อง downcast: `Dog d = (Dog) a;`
- ถ้า `a` ชี้ไป `Cat` แล้ว `(Dog) a` → แปลผ่าน แต่ run แล้วเกิด `ClassCastException`
- `Cat c = new Cat(); d = (Dog) c;` → แปลไม่ผ่าน (คนละสายการสืบทอด)

**A2.3 การเรียกเมท็อดประจำอ็อบเจกต์ (dynamic binding)** (POLY p.6–8)
- ตอนแปล (compile-time): ดูคลาสของ **ตัวแปร** ว่ามีเมท็อดนั้นไหม
- ตอนทำงาน (run-time): เรียกเมท็อดของคลาสของ **อ็อบเจกต์** ที่ถูกอ้างอิงจริง
- `Dog d = new Basenji(); d.bark();` → ได้เสียงของ Basenji

**A2.4 สองวิธีใช้งาน** (POLY p.9–16)
- แบบมีเมท็อดร่วมในคลาสแม่: `Animal.makeSound(Animal[] a)` วน `a[i].bark()`
- แบบไม่มีเมท็อดร่วม: ตรวจเองด้วย `instanceof` แล้ว downcast เช่น `((Dog) animal).bark()`

**A2.5 Abstract class** (POLY p.17–23)
- มีคำว่า `abstract` ที่หัวคลาส, มี abstract method ได้ (มีแต่หัว ไม่มีตัว)
- คลาสลูกที่ไม่ abstract ต้องเขียน abstract method ทุกตัว
- สร้างอ็อบเจกต์จาก abstract class ไม่ได้ (ใช้เพื่อสืบทอดเท่านั้น)
- ตัวอย่าง `abstract class Ad_Ball extends Ball { abstract void moveG(DWindow w); }` → `Ball_up`, `Ball_down`

**A2.6 Interface** (POLY p.24–37)
- Java สืบทอดได้ทางเดียว (single inheritance) จึงใช้ interface ให้คลาสที่ไม่เกี่ยวข้องกันมีเมท็อดชุดเดียวกัน
- `class DVDPlayer extends MediaPlayer implements PowerSaving`
- ใน interface: ตัวแปรเป็น `public static final`, เมท็อดเป็น `public abstract` (ไม่เขียน compiler เติมให้)
- ใช้ interface เป็นชนิดข้อมูลได้: `PowerSaving[] p`
- ตัวอย่าง `interface Form` → `Undergraduate`, `Officer`

**A2.7 เปรียบเทียบ Abstract class กับ Interface** (POLY p.38)

| Abstract class | Interface |
|---|---|
| ไม่จำเป็นต้องเป็น abstract method ทุกตัว | ทุกเมท็อดเป็น abstract |
| เหมาะกับคลาสที่ต้องการคุณสมบัติการสืบทอด | ไม่มีคุณสมบัติการสืบทอด |
| สืบทอดได้คลาสเดียว | implements ได้ไม่จำกัด |
| มีตัวแปรแบบใดก็ได้ | มีได้เฉพาะค่าคงที่แบบ final |
| มี constructor | ไม่มี constructor |

### ส่วน B — Data Structures (ลำดับตามเลขบทในสไลด์)

#### บทที่ 1–2: Collection พื้นฐาน, ArrayCollection, การวัดประสิทธิภาพ — C12

**1.1 ที่เก็บข้อมูลมาตรฐาน** (C12 p.3–13; ทวนซ้ำใน S5 p.4)
- Collection: ไม่มีอันดับ ซ้ำได้ · Set: ไม่มีอันดับ ซ้ำไม่ได้ · List: มีอันดับ ซ้ำได้
- Stack: LIFO (สไลด์เขียน FILO (LIFO)) · Queue: FIFO (สไลด์เขียน FIFO (LILO))
- วิธีสร้าง: array, linked list, tree, hash table, graph (C12 p.9)
- โครงสร้างข้อมูลที่ดี: ให้บริการครบ ใช้ง่าย ใช้เนื้อที่น้อย ทำงานเร็ว (C12 p.13)

**1.2 ตัวอย่าง 15-puzzle** (C12 p.14–23)
- ค้นแบบ breadth-first: ใช้ Queue เก็บตารางที่สร้างขึ้น เลื่อนช่องว่าง 4 ทิศ
- ใช้ Set กันตารางซ้ำ (`set.contains` / `set.add`)
- ตารางเปรียบเทียบเวลา ArraySet / BSTSet / AVLSet / HashSet (เป็นแรงจูงใจ ไม่ได้สอนวิธีสร้าง)

**1.3 Collection interface และ ArrayCollection** (C12 p.24–42)
- `interface Collection { add(Object e); remove(Object e); isEmpty(); contains(Object e); size(); }`
- field: `Object[] elementData`, `int size` — ข้อมูลอยู่ช่อง `0..size-1`
- `add`: `elementData[size++] = e;` (ถ้า `e == null` โยน `IllegalArgumentException`)
- `indexOf`: วนเทียบด้วย `equals` คืน `-1` ถ้าไม่พบ; `contains` = `indexOf(e) != -1`
- `remove`: หา `i` แล้ว **ย้ายตัวท้ายสุดมาแทน** — `elementData[i] = elementData[--size]; elementData[size] = null;`
  (ลำดับไม่ถูกรักษา เพราะ Collection ไม่มีอันดับ)

**1.4 เรื่องจุกจิกของ Java** (C12 p.44–53)
- `Object` เป็น root class: `Object[]` เก็บอ็อบเจกต์ได้ทุกชนิด แต่เก็บ primitive ไม่ได้
- Wrapper class (`Integer`, `Double`, `Character`, ...) และ autoboxing
- `==` (อ็อบเจกต์เดียวกัน) กับ `equals` (ค่าเท่ากัน)
- garbage: อ็อบเจกต์ที่ไม่มีตัวอ้างอิง — เหตุผลที่ต้อง `elementData[size] = null`

**1.5 ขยายอาเรย์เมื่อเต็ม และ toArray** (C12 p.54–59)
- `ensureCapacity(size + 1)`: ถ้าไม่พอ สร้างอาเรย์ใหม่ขนาด `max(capacity, 2 * elementData.length)` แล้วคัดลอก
- `toArray()`: คืนอาเรย์ใหม่ขนาด `size`

**1.6 การประเมินประสิทธิภาพ** (C12 p.61–73)
- วัดด้วยการจับเวลา และด้วยการนับจำนวนคำสั่ง
- อัตราการเติบโต: `log n ≺ n ≺ n² ≺ 2ⁿ` (กราฟซ้ำใน Q7 p.15)
- Big O = ทำซ้ำ "ไม่เกิน" ; Θ (สไลด์เรียก "Zeta") = จำนวนครั้งแน่นอน
- ArrayCollection: constructor Θ(c) · `size`/`isEmpty` Θ(1) · `add` Θ(1) (ขยายอาเรย์ O(n)) · `contains` O(n) · `remove` O(n)

**1.7 แบบฝึกหัดในสไลด์** (C12 p.43, 74–77)
- เพิ่ม `clear()`, `frequency(Object)`, `removeAt(index)`, `copyObjectRange(from, to)`, `checkRedundant` ฯลฯ

#### บทที่ 3: Linked Collection และ Set — C3

**3.1 Array กับการโยง** (C3 p.4–5)
- Array: เข้าถึง `elementData[k]` เร็ว แต่ต้องจองและขยาย
- Linked: จองเท่าที่ใช้ แต่เปลืองเนื้อที่เก็บตัวโยง

**3.2 LinkedNode และ LinkedCollection แบบไม่มีปมหัว** (C3 p.9–36)
- `LinkedNode { Object element; LinkedNode next; }` · field: `first`, `size`
- `add`: แทรกหน้าสุด — `first = new LinkedNode(e, first); ++size;`
- การท่องปม: `node = first; while (node != null) node = node.next;`
- `contains`: O(n)
- `remove`: ต้องใช้ปม **ก่อนหน้า** — `p.next = p.next.next;` และต้องแยกกรณีพิเศษเมื่อลบปมแรก (`first = first.next`)

**3.3 แบบมีปมหัว (header node)** (C3 p.37–49)
- `header = new LinkedNode(null, null)` อยู่หน้าสุดเสมอ ไม่เก็บข้อมูล ไม่ถูกลบ
- `add`: `header.next = new LinkedNode(e, header.next);`
- `remove` เริ่มที่ `p = header` → กรณีพิเศษหายไป
- `toArray()`: Θ(n) — ตัวอย่าง add A, B, C, D แล้ว remove B ได้ `[D, C, A]` (แทรกหน้าทำให้ลำดับกลับ)

**3.4 Set** (C3 p.50–52)
- `interface Set extends Collection`
- แบบสืบทอด: `ArraySet extends ArrayCollection`, `LinkedSet extends LinkedCollection` — `add` ตรวจ `!contains(e)` ก่อน
- แบบประกอบ (composition): `LinkedSet implements Set { private Collection c = new LinkedCollection(); ... }`

**3.5 สรุป** (C3 p.53)
- ไม่มีปมหัว: มีกรณีพิเศษ · มีปมหัว: ที่เก็บซับซ้อนขึ้นนิด แต่โค้ดจัดการง่ายลง

#### บทที่ 4: List — L4

**4.1 นิยามและ interface** (L4 p.4–9)
- List = Collection ที่มีอันดับ `<a0, ..., an-1>`
- `interface List extends Collection { add(int i, Object e); remove(int i); get(int i); set(int i, Object e); indexOf(Object e); }`
- ตัวอย่างไล่ผล (L4 p.9, 37): `add(0,"A")`, `add("B")`, `add(0,"C")`, `set(2,"D")`, `indexOf("A")`, `add(i,"Z")`, `remove(2)` → `<C, Z, D>`

**4.2 ArrayList** (L4 p.10–16)
- `add(i, e)`: เลื่อนข้อมูลไปทางขวาจากท้ายมา `i` แล้วใส่ — O(n); `add(0,e)` ช้าสุด, `add(size,e)` เร็วสุด
- `remove(i)`: เลื่อนข้อมูลมาทางซ้ายทับ `i` — O(n)
- `get`/`set`: Θ(1) · `indexOf`: O(n)
- ช่วง index ที่ถูกต้อง: `add` ใช้ `0..size`, `remove` ใช้ `0..size-1` (quiz p.15–16)

**4.3 รูปแบบการโยง** (L4 p.17–20)
- โยงเดี่ยว/โยงคู่, มี/ไม่มีปมหัว, วน/ไม่วน
- ที่เลือกสร้าง: SinglyLinkedList (โยงเดี่ยว ไม่วน มีปมหัว) และ LinkedList (โยงคู่ วน มีปมหัว)

**4.4 SinglyLinkedList** (L4 p.21–27)
- `nodeAt(i)`: `p = header; for (j = -1; j < i; j++) p = p.next;` (`nodeAt(-1)` คือ header)
- `add(i, e)`: `p = nodeAt(i - 1); p.next = new LinkedNode(e, p.next);`
- `removeAfter(p)`: `p.next = p.next.next;` · `remove(i)` = `removeAfter(nodeAt(i - 1))`
- เมท็อดที่เป็น O(n): `add(e)`, `add(i,e)`, `remove(e)`, `get(i)`, `set(i,e)` (quiz p.27)

**4.5 LinkedList: โยงคู่แบบวนมีปมหัว** (L4 p.28–43)
- `LinkedNode { element, prev, next }` · เริ่มต้น `header.prev = header.next = header`
- `addBefore(q, e)`: `p = q.prev; x = new LinkedNode(e, p, q); p.next = q.prev = x; ++size;` — Θ(1)
- `add(e)` = `addBefore(header, e)` Θ(1) · `add(i, e)` = `addBefore(nodeAt(i), e)` O(n)
- `removeNode(q)`: `p = q.prev; x = q.next; p.next = x; x.prev = p; --size;` — Θ(1)
- `remove(i)`, `remove(e)`: O(n) เพราะต้องหาปมก่อน

**4.6 โจทย์เติมโค้ดในสไลด์** (L4 p.46–53)
- `equals(SinglyLinkedList x)`, `clear()`, `addFirst(e)`, `removeLast()`

#### บทที่ 5: Stack — S5

**5.1 นิยามและ interface** (S5 p.5–8)
- LIFO · `interface Stack { isEmpty(); size(); push(Object e); peek(); pop(); }`

**5.2 ArrayStack** (S5 p.9–15)
- เพิ่ม/ลบเฉพาะด้านท้ายของอาเรย์ ขยายเป็นสองเท่าเมื่อเต็ม
- `push`: `elementData[size++] = e;` — Θ(1) ถ้าไม่ขยาย, O(n) ถ้าขยาย
- `peek`: ถ้าว่างโยน `NoSuchElementException`, คืน `elementData[size - 1]` — Θ(1)
- `pop`: `e = peek(); elementData[--size] = null; return e;`
- quiz (p.13–14): บรรทัดไหนคือ push / pop

**5.3 การตรวจวงเล็บ** (S5 p.16–25)
- อ่านทีละตัว: วงเล็บเปิด → push · วงเล็บปิด → pop มาตรวจว่าตรงคู่ไหม
- pop ตอนกองซ้อนว่าง = ปิดมากกว่าเปิด · อ่านจบแล้วกองซ้อนไม่ว่าง = เปิดมากกว่าปิด
- โค้ด `checkParentheses(String t)` ใช้ `open.indexOf(token)` และ `close.indexOf(token)`

**5.4 กองซ้อนใน JVM** (S5 p.26–37)
- java stack เก็บสถานะการเรียกเมท็อด, พารามิเตอร์และ local variable, operand stack
- stack frame + return address (RA): เรียกเมท็อด = push frame, return = pop frame
- เรียกตัวเองไม่สิ้นสุด → `StackOverflowError`
- ตัวอย่างไล่ `main` → `a(3, 2)` → `b(z)` → กลับ → `b(5)`

**5.5 Stack ด้วยการโยง: sLinkStack** (S5 p.38–41)
- ใช้เมท็อดของ list ที่เขียนไว้แล้ว: `push(e)` = `add(size, e)`, `peek()` = `nodeAt(size - 1).element`, `pop()` = `remove(size - 1)`
- ผล run ตัวอย่าง: push A, B, C, E → peek E → pop → peek C → pop C → pop B → size 1

#### บทที่ 6: Queue — Q6

**6.1 นิยามและ interface** (Q6 p.4–5)
- FIFO · `interface Queue { isEmpty(); size(); enqueue(Object e); peek(); dequeue(); }`

**6.2 สร้าง Queue จาก List** (Q6 p.6–9)
- `ArrayListQueue`: `enqueue` = `list.add(e)` Θ(1), `dequeue` = `list.remove(0)` **O(n)**
- `LinkedListQueue` (โยงคู่วนมีปมหัว): ทั้ง `enqueue` และ `dequeue` Θ(1) แต่เปลืองหน่วยความจำกว่า

**6.3 ArrayQueue แบบวงวน** (Q6 p.10–19)
- แบบหัวคิวอยู่ index 0 เสมอ: dequeue ต้องเลื่อนข้อมูล O(n)
- แบบจำตำแหน่ง `front`: ไม่ย้ายข้อมูล Θ(1)
- มองอาเรย์เป็นวงวน: ตำแหน่งใส่ตัวใหม่ `b = (front + size) % elementData.length`
- `dequeue`: `elementData[front] = null; front = (front + 1) % elementData.length; size--;`
- ขยายอาเรย์: คัดลอกโดยเริ่มจาก `front` วนด้วย `j = (j + 1) % length` แล้วตั้ง `front = 0`
- quiz: ตัวท้ายคิวอยู่ที่ `(front + size - 1) % elementData.length` (p.18), `peek()` คืน `elementData[front]` (p.19)

**6.4 การประยุกต์** (Q6 p.20–31)
- Queue เป็นที่พักข้อมูล (buffer): โปรแกรม → งานพิมพ์ → เครื่องพิมพ์, network → packets → router
- หาระยะสั้นสุดในตาราง (โปรแกรม Lee): dequeue ช่อง แล้วขยาย 4 ทิศไปช่องว่าง ใส่เลข `k + 1` และ enqueue
- โค้ด `findPath` / `expand`

**6.5 สรุป** (Q6 p.32)
- ถ้าจองขนาดพอ ทุก operation ของ ArrayQueue เป็น Θ(1)

#### บทที่ 7: Priority Queue และ Binary Heap — Q7

**7.1 Priority Queue** (Q7 p.3–8)
- แถวคอยที่ "ลัดคิว" ได้ตาม priority · `interface PriorityQueue extends Queue`
- `dequeue` ลบตัวที่สำคัญสุด, `peek` ขอดูตัวที่สำคัญสุด

**7.2 แบบง่ายแต่ช้า: ArrayPQ** (Q7 p.9–10)
- `enqueue` ต่อท้าย Θ(1) · `peek`/`dequeue` ต้องหา `maxIndex()` — Θ(n)

**7.3 Comparable** (Q7 p.11–13)
- `compareTo(obj)`: ค่าลบ = น้อยกว่า, 0 = เท่ากัน, ค่าบวก = มากกว่า
- ตัวอย่าง `Rectangle implements Comparable` เทียบพื้นที่
- quiz: `a.compareTo(b) >= 0` หมายถึง a มากกว่าหรือเท่ากับ b

**7.4 Binary Heap: โครงสร้าง** (Q7 p.14–20)
- เป็น binary tree แบบได้ดุล: เต็มทุกระดับ ระดับล่างสุดเต็มจากซ้ายไปขวา
- ข้อมูลของ parent มากกว่าของลูก (max heap) → รากคือค่ามากสุด
- ต้นไม้ทวิภาคได้ดุล n ปม สูง `⌊log₂ n⌋`
- เก็บในอาเรย์: ราก index 0 · ลูกซ้ายของ k = `2k + 1` · ลูกขวา = `2k + 2` · พ่อ = `(k - 1) / 2`
- quiz (p.18): อาเรย์ `50, 13, 40, 5, 12, 4`

**7.5 enqueue และ fixUp** (Q7 p.21–27)
- ใส่ต่อท้ายอาเรย์ แล้วสลับกับพ่อขึ้นไปจนไม่มากกว่าพ่อ
- `fixUp(k)`: `while (k > 0) { p = (k - 1) / 2; if (!greaterThan(k, p)) break; swap(k, p); k = p; }`

**7.6 dequeue และ fixDown** (Q7 p.28–33)
- เก็บรากเป็นคำตอบ ย้ายใบล่างขวาสุดมาที่ราก แล้วสลับลงกับ **ลูกตัวมาก** จนพ่อไม่น้อยกว่าลูก
- `fixDown(k)`: `while ((c = 2 * k + 1) < size) { if (c + 1 < size && greaterThan(c + 1, c)) c++; if (!greaterThan(c, k)) break; swap(k, c); k = c; }`

**7.7 เวลาการทำงาน** (Q7 p.34)
- `peek` Θ(1) · `enqueue` O(log n) · `dequeue` O(log n)

**7.8 สร้าง heap จากอาเรย์** (Q7 p.35–39)
- enqueue ทีละตัว: O(n log n)
- ค่อย ๆ ปรับ: `for (i = size - 1; i >= 0; i--) fixDown(i);` — สไลด์เทียบเป็น O(n)

**7.9 Heap Sort** (Q7 p.40–42)
- สร้าง max heap แล้ววน dequeue ตัวมากสุดไปวางท้ายช่วงที่ยังไม่เรียง → ได้เรียงจากน้อยไปมาก
- ตัวอย่าง `[25, 12, 10, 11, 27]` → `[10, 11, 12, 25, 27]`

#### บทที่ 8: Binary Tree — T8

**8.1 ต้นไม้** (T8 p.2–4)
- ปม (node) กับเส้นเชื่อม (edge) มีทิศทาง · แต่ละปมมีพ่อเดียว ยกเว้นราก
- ต้นไม้ v ปม มี `v - 1` เส้นเชื่อม
- การสร้าง: ใช้อาเรย์เก็บลูก หรือใช้รายการลูก (`leftChild`, `nextSibling`)

**8.2 Binary Tree** (T8 p.5–7)
- `Node { Object element; Node left, right; boolean isLeaf() }` · อ็อบเจกต์ต้นไม้เก็บแค่ `root`
- เทียบกับ Binary Heap: heap ต้องเต็มทุกชั้นและมีลำดับพ่อ–ลูก ส่วน binary tree ไม่จำเป็น

**8.3 การแวะผ่าน (traversal)** (T8 p.8–27)
- Preorder (ปม, ซ้าย, ขวา) · Inorder (ซ้าย, ปม, ขวา) · Postorder (ซ้าย, ขวา, ปม)
- กับต้นไม้นิพจน์: preorder → prefix, inorder → infix, postorder → postfix
- ตัวอย่างไล่ทีละขั้น (ราก 35): pre `35 29 20 10 25 32 40 50 45` · in `10 20 25 29 32 35 40 45 50` · post `10 25 20 32 29 45 50 40 35`

**8.4 ต้นไม้นิพจน์ (expression tree)** (T8 p.28–35)
- ใบ = operand, ปมภายใน = operator
- สร้างจาก postfix ด้วย stack: เจอ operand → push · เจอ operator → pop สองตัวมาเป็นลูกของปมใหม่ แล้ว push
- ตัวอย่าง postfix `5 y 4 * +`

**8.5 รหัส Huffman** (T8 p.36–46)
- รหัสความยาวคงที่ กับรหัสความยาวแปรได้ (ตัวที่พบบ่อยใช้รหัสสั้น)
- ตัวอย่าง: ความถี่ 40, 21, 15, 14, 8, 2 → คงที่ 3 บิต = 300 บิต, Huffman = 230 บิต
- อัลกอริทึม: สร้างปมต่อตัวอักษร → รวมสองปมที่ **น้อยสุด** เป็นปมใหม่ วนไปจนเหลือต้นเดียว → ซ้าย = 0, ขวา = 1
- โค้ด `coding(int[] freq)` ใช้ `BinaryMinHeap`: dequeue สองครั้ง รวมความถี่ แล้ว enqueue กลับ
- `HuffmanTree extends BinaryTree implements Comparable` (เทียบด้วย `freq()`)

**8.6 โครงสร้างคลาสและเมท็อดเรียกซ้ำ** (T8 p.47–58)
- `BinaryMinHeap extends BinaryHeap` โดย override `greaterThan` ให้เป็น `compareTo(...) < 0`
- `numNodes`, `numLeaves`, `height` (ต้นว่างสูง `-1`), `copy` แบบ recursive
- `printCodes`: ลงซ้ายใส่ 0 ลงขวาใส่ 1 ถึงใบแล้วพิมพ์รหัส

---

## 2. จุดที่เอกสารต่างจากความรู้ทั่วไป

ตามกฎใน CLAUDE.md บทเรียนและเฉลยจะยึดตามเอกสาร และใส่หมายเหตุไว้ในจุดเหล่านี้

| เรื่อง | ในเอกสาร | ทั่วไป | ที่มา |
|---|---|---|---|
| ชื่อสัญลักษณ์ Θ | เรียก "Zeta" | Theta | C12 p.61–73 |
| กฎคร่าว ๆ ของการวัด | "มี loop = O(n)", "ประโยคที่นับได้ = Zeta(n) โดย n = จำนวนประโยค" | เป็นการประมาณเฉพาะของสไลด์ | C12 p.73 |
| สิ่งที่คลาสลูกได้ | ไม่ได้ class variable และ class method | static member เรียกผ่านคลาสลูกได้ แต่ override ไม่ได้ | INH p.6 |
| Interface | ทุกเมท็อดเป็น abstract, ตัวแปรเป็น final เท่านั้น | ตั้งแต่ Java 8 มี `default` และ `static` method ได้ | POLY p.29, 38 |
| คุณสมบัติ heap | parent "มากกว่า" ลูก | มากกว่าหรือเท่ากับ (ตัวอย่างในสไลด์เองก็มีค่าซ้ำ 12 กับ 12) | Q7 p.16, 21 |
| Binary tree | "ทุกปมมีสองลูก" | มีลูกได้ไม่เกินสอง | T8 p.5 |

ข้อสังเกตเพิ่ม: demo sim ที่ทำไว้ใน Phase 0 แสดง "stack overflow" เมื่อ push ตอนเต็ม แต่ `ArrayStack` ในสไลด์
**ขยายอาเรย์เป็นสองเท่า** ไม่มี overflow (S5 p.11) sim จริงของวิชานี้จะทำตามสไลด์

---

## 3. Simulation ที่เสนอ

ทุกตัวใช้ `SimulationPlayer` เดิม (pure step, step back ได้, คำอธิบายภาษาไทยทุกขั้น) และแสดงโค้ด Java
บรรทัดที่กำลังทำงานตามสไลด์

### ลำดับความสำคัญสูง (หัวข้อที่สไลด์สอนแบบไล่ทีละขั้นอยู่แล้ว)

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S1 | ArrayCollection | ลำดับคำสั่ง `add x`, `remove x`, `contains x` และความจุเริ่มต้น | การวน `indexOf` ทีละช่อง, ย้ายตัวท้ายมาแทนช่องที่ลบ, ใส่ `null`, ขยายอาเรย์สองเท่าและคัดลอก | 1–2 |
| S2 | Linked Collection | ลำดับคำสั่ง และสวิตช์ มี/ไม่มีปมหัว | สร้างปมใหม่, เปลี่ยนตัวโยงทีละเส้น, ตัวชี้ `p` เดินหาปมก่อนหน้า, กรณีพิเศษตอนลบปมแรก | 3 |
| S3 | ArrayList แทรกและลบ | `add(i, x)`, `remove(i)`, `get(i)` | การเลื่อนข้อมูลทีละช่อง พร้อมตัวนับจำนวนครั้งที่ย้าย เทียบ `add(0)` กับ `add(size)` | 4 |
| S4 | LinkedList โยงคู่วน | `add(i, x)`, `remove(i)`, `addFirst`, `removeLast` | `addBefore` / `removeNode` ทีละบรรทัด: `p`, `x`, `q` และตัวโยง `prev` / `next` ที่เปลี่ยน | 4 |
| S5 | ArrayStack | `push x`, `pop`, `peek` และความจุเริ่มต้น | ค่า `size`, ช่องที่เขียน/ล้าง, การขยายสองเท่า, exception ตอน `peek` กองซ้อนว่าง | 5 |
| S6 | ตรวจวงเล็บ | สตริงวงเล็บ `( ) { } [ ]` | อ่านทีละตัว, push/pop, ผลตรวจคู่, และสาเหตุความผิดพลาด 3 แบบตามสไลด์ | 5 |
| S7 | ArrayQueue วงวน | `enqueue x`, `dequeue` และความจุ | `front`, `size`, การคำนวณ `(front + size) % length`, การวนกลับต้นอาเรย์, การขยายแล้วจัดเรียงใหม่ | 6 |
| S8 | Binary Heap | ค่าที่จะ `enqueue`, กด `dequeue`, หรือป้อนอาเรย์เพื่อสร้าง heap | ต้นไม้กับอาเรย์คู่กัน, `fixUp` / `fixDown` ทีละการสลับ, index ของพ่อและลูก | 7 |
| S9 | Tree traversal | ต้นไม้ (ป้อนแบบ level-order) และเลือก pre / in / post | ปมที่กำลังแวะ, ลำดับผลลัพธ์ที่สะสม, กองซ้อนของการเรียกซ้ำ | 8 |
| S10 | Huffman tree | ตัวอักษรและความถี่ | เลือกสองปมที่น้อยสุด, รวมเป็นปมใหม่, ต้นไม้ที่โตขึ้น, ตารางรหัสและจำนวนบิตรวมเทียบรหัสคงที่ | 8 |

### ลำดับความสำคัญรอง

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S11 | Heap Sort | อาเรย์ตัวเลข | ช่วงสร้าง heap, แล้วสลับรากกับท้ายช่วงและ `fixDown` จนเรียงครบ | 7 |
| S12 | Lee shortest path | ขนาดตาราง, แตะเพื่อวางกำแพง, จุดเริ่มและปลายทาง | dequeue ช่อง, ขยาย 4 ทิศ, ใส่เลขระยะ, เนื้อหาในคิว, เส้นทางที่ได้ | 6 |
| S13 | Expression tree จาก postfix | นิพจน์ postfix | push operand, pop สองตัวมาประกอบปม operator, ต้นไม้สุดท้าย | 8 |
| S14 | JVM stack frame | ค่า argument ของ `a(x, y)` และ `b(x)` ในโปรแกรมตัวอย่างของสไลด์ | บรรทัดที่ทำงาน, frame ที่ push/pop, ค่า local variable และ return address | 5 |
| S15 | Upcast / Downcast | เลือกชนิดตัวแปร, ชนิดอ็อบเจกต์, ชนิดที่ cast จากลำดับชั้น Animal | ขั้น compile-time (ผ่าน/ไม่ผ่านเพราะอะไร), ขั้น run-time (เมท็อดของคลาสไหนทำงาน หรือ `ClassCastException`) | A2 |
| S16 | ลำดับ constructor | เลือกว่าแต่ละคลาสมี constructor แบบไหน และเรียก `super(...)` หรือไม่ | `super()` ที่ compiler เติม, ลำดับการทำงานแม่ก่อนลูก, กรณี compile error | A1 |

ข้อเสนอ: ทำ S1–S10 ก่อน ส่วน S11–S16 ทำถ้าเวลาพอ บอกได้ถ้าอยากตัดหรือสลับ

---

## 4. น้ำหนักข้อสอบ (เดา)

ที่มาของการเดา: สัดส่วนหน้าสไลด์ที่เป็นเนื้อหา (ไม่นับหน้า Lab และ screenshot โปรแกรม), จำนวน quiz ในสไลด์,
และแบบฝึกหัดท้ายบท **ไม่มีข้อสอบเก่าหรือ course syllabus ให้เทียบ** ตัวเลขนี้จึงเป็นการประมาณ

| หัวข้อ | หน้าเนื้อหา (ประมาณ) | น้ำหนัก | ข้อ / ชุด 70 ข้อ |
|---|---|---|---|
| A1 Package และ Inheritance | 20 (อีก ~42 หน้าเป็น Lab LED) | 8% | 6 |
| A2 Polymorphism, Abstract class, Interface | 39 | 10% | 7 |
| 1–2 Collection, ArrayCollection, Java พื้นฐาน | 60 | 10% | 7 |
| 1–2 Big O และ Θ | 13 | 6% | 4 |
| 3 Linked Collection และ Set | 54 | 10% | 7 |
| 4 List (ArrayList, Singly, Doubly) | 53 | 14% | 10 |
| 5 Stack | 42 | 10% | 7 |
| 6 Queue | 33 | 10% | 7 |
| 7 Priority Queue, Heap, Heap Sort | 44 | 12% | 8 |
| 8 Binary Tree, Traversal, Huffman | 59 | 10% | 7 |
| รวม | | 100% | 70 |

เหตุผลที่ให้ List และ Heap มากกว่าสัดส่วนหน้า: สองบทนี้มี quiz และโจทย์เติมโค้ดในสไลด์มากที่สุด และมีสูตร
(index, ตัวโยง) ที่ออกเป็นข้อสอบปรนัยได้ง่าย

ที่ยังไม่รู้: การแบ่งกลางภาค/ปลายภาค ถ้าสอบครั้งนี้ครอบคลุมแค่บางบท ผมจะปรับสัดส่วนใหม่เฉพาะบทที่ออก

### สไตล์โจทย์ที่เห็นจาก quiz ในสไลด์

ข้อสอบจำลองจะเลียนแบบรูปแบบเหล่านี้ เพราะเป็นหลักฐานเดียวที่มีว่าอาจารย์ถามอย่างไร

- **เลือกบรรทัดโค้ดที่ถูก** — "ข้อใดทำการ `push(e)`" ตัวเลือกต่างกันที่ `--size` / `size--` / `++size` / `size++` (S5 p.13–14)
- **สูตร index** — "ตำแหน่งของตัวที่อยู่ท้ายคิวคือข้อใด" (Q6 p.18), "`peek()` ต้องคืนข้อมูลตัวใด" (Q6 p.19)
- **ช่วงค่าที่ถูกต้อง** — index ที่ใช้กับ `add(i, e)` และ `remove(i)` ได้ (L4 p.15–16)
- **เลือกเมท็อดตามเวลาทำงาน** — เมท็อดใดเป็น O(n) (L4 p.27)
- **จับคู่สาเหตุ** — ความผิดพลาดของวงเล็บกับเหตุการณ์ที่ตรวจพบ (S5 p.22)
- **อ่านโครงสร้างจากอาเรย์** — heap `50, 13, 40, 5, 12, 4` ข้อใดจริง (Q7 p.18)
- **ความหมายของค่าที่คืน** — `a.compareTo(b) >= 0` แสดงว่า (Q7 p.13)
- **เติมโค้ดในช่องว่าง** — `addFirst`, `removeLast`, `clear`, `equals` (L4 p.46–53), `coding` ของ Huffman (T8 p.56)
- **ไล่ผลลัพธ์** — ลำดับคำสั่งกับ list/stack แล้วถามสถานะสุดท้าย (L4 p.9, S5 p.41)

---

## 5. โครงบทเรียนที่จะสร้างใน Step ถัดไป (เสนอ)

17 บทเรียน เรียงตามลำดับสอน ชื่อไฟล์ `content/oods/NN-*.mdx`

| # | บทเรียน | chapter | sim |
|---|---|---|---|
| 01 | Package และ Inheritance | A1 | S16 (รอง) |
| 02 | Polymorphism และการ cast | A2 | S15 (รอง) |
| 03 | Abstract class และ Interface | A2 | – |
| 04 | ที่เก็บข้อมูลมาตรฐาน และ 15-puzzle | 1–2 | – |
| 05 | ArrayCollection และเรื่องจุกจิกของ Java | 1–2 | S1 |
| 06 | Big O และ Θ | 1–2 | – |
| 07 | Linked Collection: มีและไม่มีปมหัว | 3 | S2 |
| 08 | Set: สืบทอดกับประกอบ | 3 | – |
| 09 | List และ ArrayList | 4 | S3 |
| 10 | SinglyLinkedList | 4 | – |
| 11 | LinkedList โยงคู่วนมีปมหัว | 4 | S4 |
| 12 | Stack, ตรวจวงเล็บ, กองซ้อนใน JVM | 5 | S5, S6, S14 (รอง) |
| 13 | Queue และ ArrayQueue วงวน | 6 | S7, S12 (รอง) |
| 14 | Priority Queue และ Binary Heap | 7 | S8 |
| 15 | สร้าง heap และ Heap Sort | 7 | S11 (รอง) |
| 16 | Binary Tree และ traversal | 8 | S9, S13 (รอง) |
| 17 | รหัส Huffman | 8 | S10 |

---

## 6. ไฟล์ที่ไม่ได้นับรวม: `HTTP for Developer.pdf` (36 หน้า)

สรุปเนื้อหาไว้เผื่อย้ายไปวิชาที่ถูก:

- World Wide Web, ส่วนประกอบของเว็บ (resource, URL, HTTP), client กับ web server
- ISO OSI 7 layer และตำแหน่งของ HTTP / SSL / TCP / IP
- HTTP คือ text-based client–server protocol ระดับ application ส่งบน TCP · port เริ่มต้น HTTP 80, HTTPS 443
- HTTP flow: เปิด TCP connection → ส่ง request → อ่าน response → ปิดหรือใช้ซ้ำ
- โครงสร้าง request (method, path, protocol version, headers) และ response (version, status code, status message, headers)
- Status code: 2xx, 3xx, 4xx, 5xx และตัวที่พบบ่อย (200, 201, 204, 301/302, 400, 401/403, 404, 409, 500/503)
- `Content-Type`, `Content-Disposition`, ตัวอย่าง media type
- โครงสร้าง URL, DNS lookup, ลำดับเหตุการณ์เมื่อพิมพ์ URL ใน browser
- HTTPS และ "HTTP is stateless, but not sessionless"
