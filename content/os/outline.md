# OS — Outline (Step 1, รอ review)

สถานะ: **ร่างสำหรับตรวจ** ยังไม่ได้เขียนบทเรียน, simulation หรือข้อสอบ

- วิชา: Operating Systems (1/2569)
- ผู้สอน (ตามสไลด์): Mr. Watjanapong Kasemsiri
- ตำราหลัก: Anderson & Dahlin, *Operating Systems: Principles & Practice*, 2nd ed.
  สไลด์ดัดแปลงจาก CSE 451 (UW), CS162 (Berkeley), CSE 421/521 (UB)
- อ่านครบทุกไฟล์ใน `docs/OS/` แล้ว: 11 ไฟล์ 255 หน้า (อ่าน text ทุกหน้า และดูภาพสไลด์ที่มี diagram)

## 0. เรื่องที่ต้องให้ตัดสินใจก่อนเขียนบทเรียน

1. **Synchronization ขาด part 2 และ part 3** — มีแค่ `05-Synchronization-part1` กับ `part4-Conclusion`
   หัวข้อที่น่าจะอยู่ในส่วนที่หาย (ดูจาก Roadmap ใน SYN1 p.11): การสร้าง lock ด้วย interrupt disable / test-and-set,
   bounded buffer, readers/writers ผมจะไม่เขียนหัวข้อเหล่านี้จนกว่าจะมีไฟล์
2. **หัวข้อที่อยู่ใน "Main Points" แต่ไม่มีสไลด์เนื้อหา** — Multiprocessor scheduling, Queueing theory (SCH p.2),
   Virtually/physically addressed caches (ADR p.2), Zipf workloads (VM p.8) ผมจะไม่ทำบทเรียนเรื่องเหล่านี้
3. **ข้อความที่ซ่อนอยู่ในสไลด์** — บางหน้ามีข้อความใน text layer ของ PDF แต่มองไม่เห็นบนสไลด์ (น่าจะเป็น animation
   หรือเฉลยที่อาจารย์เปิดในห้อง) ได้แก่ ข้อดี/ข้อเสียของ Base and Bounds, Segmentation, Multilevel (ADR p.9, 16, 30),
   คำถาม SJF/FIFO (SCH p.8–9) และบรรทัด "Clock/Nth Chance is an approximation of LRU" (VM p.27)
   ผมเสนอให้ **นับข้อดี/ข้อเสียเป็นเนื้อหา** (เป็นคำตอบของคำถามในสไลด์ถัดไป) แต่ **Clock algorithm ไม่ทำ**
   เพราะมีแค่บรรทัดเดียวและไม่มีคำอธิบาย บอกได้ถ้าอาจารย์สอน Clock ในห้อง
4. **Scheduling ไม่มีตัวอย่างคำนวณ** — สไลด์อธิบายด้วยรูป (งาน 5 ชิ้น) ไม่มีตาราง burst time หรือการคำนวณ
   average response time ผมจะทำ simulation ให้คำนวณได้ แต่ข้อสอบจำลองจะเน้นแนวคิดตามสไลด์เป็นหลัก
   ถ้าอาจารย์ให้คำนวณในห้องหรือในแบบฝึกหัด บอกได้
5. **ไม่มี Case study และ activity** — เกรด 25% มาจาก case study เรื่อง Concurrency และ Synchronization
   ถ้ามีโจทย์ จะช่วยให้ข้อสอบจำลองสองหัวข้อนี้ใกล้ของจริงขึ้น
6. **ชื่อโฟลเดอร์** — เอกสารอยู่ที่ `docs/OS/` รหัสวิชาในเว็บคือ `os` (macOS ไม่แยกตัวพิมพ์ จึงใช้ได้ทั้งคู่)

### ข้อมูลการสอบจากสไลด์ (INT0 p.3)

- Class activities 15% · Case studies 25% · **Final Exam 60%** — ไม่มีสอบกลางภาค ข้อสอบปลายภาคจึงน่าจะครอบคลุมทุกบท
- เข้าห้องสอบพร้อม **โน้ต A4 เขียนมือ 1 แผ่น** ได้ → โจทย์น่าจะเน้นความเข้าใจและการประยุกต์มากกว่าท่องจำ
  ข้อสอบจำลองจะถ่วงไปทางระดับ 2–3 (วิเคราะห์สถานการณ์, ไล่ลำดับเหตุการณ์, เปรียบเทียบ) มากกว่านิยาม

### ตัวย่อไฟล์ที่ใช้อ้างอิง

| ย่อ | ไฟล์ | หน้า | เรื่อง |
|---|---|---|---|
| INT0 | `00-Operating Systems_v3_CE_CECont.pdf` (และฉบับ `_inter`) | 6 | แนะนำวิชา, เกณฑ์คะแนน, course outline |
| INT | `01-Introduction_v5.pdf` | 15 | Introduction |
| PC1 | `02-ProcessAndContextSwitch_Part-I_v3.pdf` | 33 | The Kernel Abstraction |
| PC2 | `03-ProcessAndContextSwitch_Part-II_v2.pdf` | 40 | Mode Switch |
| CON | `04-concurrency.pdf` | 28 | Concurrency |
| SYN1 | `05-Synchronization-part1_v2.pdf` | 21 | Synchronization |
| SYN4 | `05-Synchronization-part4-Conclusion_v2_1.pdf` | 21 | Synchronization: Conclusion |
| SCH | `06-scheduling_v5 (1).pdf` | 22 | Scheduling |
| ADR | `07-address_v4.pdf` | 36 | Address Translation |
| VM | `08-Virtual memory_v3.pdf` | 27 | Virtual Memory |

---

## 1. บทและหัวข้อตามลำดับที่สอน

ลำดับตาม Course Outline (INT0 p.5) และเลขนำหน้าไฟล์

### บทที่ 1: Introduction — INT

**1.1 ประวัติของ OS** (INT p.2–8)
- ยุคไม่มี OS (ก่อน 1956)
- Early OS (1956–1960s): คอมพิวเตอร์แพงมาก ทำทีละ application, OS เป็น runtime library, batch system
- Time-sharing (1960s–1970s): multiprogramming, interactive, เริ่ม optimize เวลาของผู้ใช้แทนเวลาเครื่อง
- ปัจจุบัน (1980–): smartphone, embedded, VM, data center · อนาคต: giant-scale data center, หลาย processor ต่อเครื่อง

**1.2 บทบาทของ OS** (INT p.10)
- **Referee**: จัดสรร resource, แยก (isolate) ผู้ใช้/application, การสื่อสารระหว่างกัน
- **Illusionist**: ทำให้แต่ละ application เหมือนมีเครื่องทั้งเครื่อง (processor ไม่จำกัด, memory เกือบไม่จำกัด, storage/network ที่เชื่อถือได้)
- **Glue**: library, UI widget

**1.3 นิยาม OS** (INT p.12)
- ชุดซอฟต์แวร์ที่จัดการ resource ของคอมพิวเตอร์ให้ผู้ใช้และ application · General purpose กับ Specific purpose

**1.4 การประเมิน OS** (INT p.14–15)
- Reliability & Availability · Security · Portability (AVM, API, HAL) · Performance (overhead, efficiency, fairness, response time, throughput, predictability) · Adoption
- Design tradeoff: ต้องถ่วงดุลทั้ง 5 ด้าน

### บทที่ 2: Process and Context Switch, Part I — The Kernel Abstraction — PC1

**2.1 ทำไมต้องมี OS/Kernel** (PC1 p.2–8)
- ความหลากหลายของ hardware → OS ซ่อนความซับซ้อน
- Single-task กับ Multiuser/Multitasking
- Kernel: ส่วนของ OS ที่ทำงานตลอดเวลา จัดการ resource เป็นสะพานระหว่าง application กับ hardware

**2.2 Protection** (PC1 p.9–11)
- ทำไม: Reliability (โปรแกรมบั๊กทำร้ายแค่ตัวเอง), Security & privacy, Fairness
- อย่างไร: hardware = memory address translation + dual-mode operation; software = process + system call

**2.3 Privileged instruction และ Dual-mode operation** (PC1 p.12–16)
- ตัวอย่าง privileged instruction: สั่ง I/O device, อ่าน/เขียน I/O, jump เข้า kernel code
- user program เรียก privileged instruction → processor exception (ปกติหยุด process)
- Kernel mode (สิทธิ์เต็ม) กับ User mode (สิทธิ์จำกัด) · x86 เก็บ mode ใน EFLAGS, MIPS ใน status register
- hardware ที่ต้องมี: privileged instruction, จำกัดการเข้าถึง memory, **timer** (ดึงการควบคุมคืนจากโปรแกรมที่วน loop), การสลับ mode อย่างปลอดภัย

**2.4 Virtual Machine** (PC1 p.18–19)
- Process VM (รันโปรแกรมเดียว) กับ System VM (รัน OS ทั้งตัว)
- เป้าหมายของ Process VM: isolation, ขอบเขต memory, fault isolation, portability

**2.5 Process abstraction** (PC1 p.20–26)
- Process = instance ของโปรแกรมที่รันด้วยสิทธิ์จำกัด · Thread = ลำดับคำสั่งใน process · Address space = ชุดสิทธิ์ของ process
- Layout: code, static data, heap, stack
- **PCB** (Process Control Block) อยู่ใน kernel: status (running/ready/blocked), registers/SP, PID, user, priority, execution time, memory space/translation table
- Execution context: PC, SP, registers

**2.6 Mode switch** (PC1 p.27–32)
- User → Kernel: **Interrupt** (timer, I/O), **Exception** (พฤติกรรมผิดปกติ/มุ่งร้าย), **System call** (protected procedure call)
- Kernel → User: เริ่ม process/thread ใหม่, return จาก interrupt/exception/syscall, context switch, user-level upcall (UNIX signal)
- เงื่อนไขของการสลับที่ปลอดภัย: เก็บ state ของ user, รับมือ state ที่ผิดปกติ, transparency

### บทที่ 3: Process and Context Switch, Part II — Mode Switch — PC2

**3.1 การรับ interrupt อย่างปลอดภัย** (PC2 p.4–6)
- Interrupt vector (จุดเข้า kernel จำนวนจำกัด) · Kernel interrupt stack · Interrupt masking
- Atomic transfer of control (เปลี่ยน PC, SP, memory protection, mode พร้อมกัน) · Transparent restartable execution

**3.2 Kernel stack** (PC2 p.7–10)
- Two-stack model: แต่ละ thread มี kernel stack และ user stack
- ทำไมไม่ใช้ user stack: security & stability, transparency

**3.3 Case study: x86 interrupt** (PC2 p.11–15)
- ลำดับ: เก็บ SP, PC, PSW → สลับไป kernel stack แล้ว push → เข้า kernel mode → vector ผ่าน interrupt table → handler เก็บ register ที่เหลือ
- จบ handler: restore register แล้ว return แบบ atomic (PC, stack, PSW, กลับ user mode)
- ภาพ before/during/after: `SS:ESP`, `CS:EIP`, `EFLAGS`, error code บน exception stack (PC2 p.12–14)

**3.4 Interrupt masking** (PC2 p.16–18)
- handler รันโดยปิด interrupt · x86: `CLI` ปิด, `STI` เปิด · มีผลเฉพาะ CPU ปัจจุบัน
- handler ต้อง non-blocking งานหนักส่งต่อให้ OS thread · Non-Maskable Interrupt (NMI)

**3.5 System call handler** (PC2 p.19)
- ขั้นตอน: vector ตามหมายเลข syscall → หา argument → **copy** จาก user memory เข้า kernel → **validate** → copy ผลกลับ

**3.6 Four fundamental OS concepts** (PC2 p.20)
- Thread (execution context) · Address space · Process (address space + thread ≥ 1) · Dual mode operation

**3.7 Process management** (PC2 p.24–32, 36)
- Windows `CreateProcess`: สร้าง PCB, address space ใหม่, load โปรแกรม, copy argument, ตั้ง hardware context, แจ้ง scheduler
- UNIX `fork` (copy process ปัจจุบัน, ไม่มี argument, คืน 0 ใน child และ pid ของ child ใน parent), `exec`, `wait`, `signal`
- ขั้นตอน implement `fork` และ `exec`
- Shell: วน `fork` → child `exec` → parent `wait`

**3.8 UNIX I/O** (PC2 p.33–35)
- Uniformity (`open`/`close`/`read`/`write` กับทุกอย่าง), open before use (file descriptor), byte-oriented, kernel-buffered, explicit close
- ทำไม `open` รวม create/exists ไว้ใน call เดียว

**3.9 Interprocess communication และโครงสร้าง OS** (PC2 p.38–40)
- Producer–consumer (pipe, ทางเดียว), Client–server (สองทาง), File system
- Monolithic kernel กับ Microkernel

### บทที่ 4: Concurrency — CON

**4.1 แรงจูงใจและนิยาม** (CON p.2–5)
- ใช้กับ: server, parallel program, UI ที่ตอบสนองเร็ว, ซ่อน latency ของ network/disk
- Thread = single execution sequence ที่เป็น separately schedulable task
- Multi-threaded kernel, multiprocess kernel, multi-threaded user process

**4.2 Thread abstraction** (CON p.6–8)
- มุมมองโปรแกรมเมอร์: processor ไม่จำกัด · ความจริง: thread ทำงานด้วยความเร็วไม่แน่นอน
- โปรแกรมต้องถูกต้องกับทุก schedule · ตัวอย่าง possible executions

**4.3 Thread operations** (CON p.9–12)
- `thread_create(thread, func, args)`, `thread_yield()`, `thread_join(thread)`, `thread_exit`
- ตัวอย่าง `threadHello` (10 threads): ทำไม "returned" พิมพ์ตามลำดับ แต่ "Hello" ไม่เรียง
- Fork/Join concurrency

**4.4 โครงสร้างข้อมูลและ lifecycle** (CON p.13–14)
- Shared state: code, global variables, heap · Per-thread state: TCB (stack info, saved registers, metadata) + stack
- Lifecycle: Init → Ready ⇄ Running → Finished และ Running → Waiting → Ready

**4.5 การ implement thread** (CON p.15–18)
- Kernel threads · Multithreaded process ด้วย kernel thread (Linux, MacOS) · User-level threads
- `thread_fork`: จอง TCB, จอง stack, สร้าง stub frame, ใส่ func/args, เข้า ready list

**4.6 Thread context switch** (CON p.19–24)
- Voluntary (`thread_yield`, `thread_join`) กับ Involuntary (interrupt/exception, thread ที่ priority สูงกว่า)
- ขั้นตอน: save register ลง stack เก่า → สลับ stack → restore → return
- x86 `switch_threads` · timer/I/O interrupt · faster switch ด้วย trapframe

**4.7 Multithreaded user process 3 แบบ** (CON p.25–28)
- Take 1: user thread = kernel thread (Linux, MacOS)
- Take 2: green threads (Java รุ่นแรก) — library ระดับ user, preempt ด้วย upcall/signal
- Take 3: scheduler activations (Windows 8)

### บทที่ 5: Synchronization (part 1) — SYN1

**5.1 แรงจูงใจ** (SYN1 p.2–4)
- thread อ่าน/เขียน shared memory พร้อมกัน → ผลไม่แน่นอน · schedule เป็น non-deterministic
- compiler/CPU เรียงคำสั่งใหม่ (reordering) · multi-word operation ไม่ atomic · แก้ด้วย memory barrier
- ตัวอย่าง "Can this panic?" (`pInitialized`)

**5.2 นิยาม** (SYN1 p.6)
- Race condition · Mutual exclusion · Critical section · Lock

**5.3 Too Much Milk** (SYN1 p.5, 7–10, 13)
- คุณสมบัติที่ต้องการ: **safety** (ซื้อไม่เกินหนึ่งคน) และ **liveness** (มีคนซื้อเมื่อจำเป็น)
- Try #1 ทิ้ง note, Try #2 note แยกชื่อ, Try #3 แบบไม่สมมาตร (ถูกแต่ซับซ้อน), #4 ใช้ lock
- บทเรียน: โค้ดที่ "ดูถูก" มักมีบั๊ก · กรณีหลาย thread ดู Peterson's algorithm

**5.4 Lock** (SYN1 p.12–16)
- `acquire` (รอจน free แล้วถือ), `release`
- คุณสมบัติ: ผู้ถือได้ทีละหนึ่ง (safety), ไม่มีใครถือแล้ว acquire ได้ (progress), ผู้รอได้ lock ในที่สุด (progress)
- กฎการใช้: acquire ต้นเมท็อด, release ท้ายเมท็อด, ผู้ถือเท่านั้นที่ release, ห้ามแตะ shared data โดยไม่มี lock
- ตัวอย่าง malloc/free และ double-checked locking ("Will this code work?")

**5.5 Semaphore** (SYN1 p.17)
- ค่าจำนวนเต็มไม่ติดลบ · `P()` รอจนค่า > 0 แล้วลด (atomic) · `V()` เพิ่มค่าและปลุกผู้รอ
- เหมาะกับ unlocked wait: interrupt handler, fork/join

**5.6 Condition variable** (SYN1 p.18–19)
- `wait` (ปล่อย lock และสละ processor แบบ atomic แล้วถือ lock ใหม่เมื่อถูกปลุก), `signal`, `broadcast`
- Design pattern: `while (!testSharedState()) cv.wait(&lock);`

**5.7 ใน C#** (SYN1 p.20–21)
- `lock (_Lock) { }`, `Monitor.Wait` / `Pulse` / `PulseAll`, `Semaphore.WaitOne()` = P, `Release()` = V

### บทที่ 5 (ต่อ): Synchronization — Conclusion และ Deadlock — SYN4

**5.8 สรุป Condition variable** (SYN4 p.3–5)
- ถือ lock เสมอเมื่อเรียก wait/signal/broadcast · CV ไม่มีความจำ (signal ตอนไม่มีผู้รอ = ไม่เกิดอะไร)
- thread ที่ถูกปลุกอาจไม่ได้รันทันที → **wait ต้องอยู่ใน while loop**

**5.9 Performance** (SYN4 p.6–7)
- ปัญหา: overhead การสร้าง thread, lock contention, shared data วิ่งไปมาระหว่าง core, false sharing
- ลด contention: fine-grained locking, per-processor data structure, ownership/staged architecture

**5.10 Best practices** (SYN4 p.8)
- 6 ข้อ เช่น acquire ต้นเมท็อด/release ก่อน return, wait ใน while loop, ห้ามใช้ `thread.sleep` รอ thread อื่น

**5.11 Synchronization without lock** (SYN4 p.9–11)
- CSP (Google Go): หนึ่ง thread ต่อ shared object, สื่อสารด้วย message · เทียบกับ lock/CV

**5.12 Deadlock** (SYN4 p.12–21)
- Dining Lawyers · resource แบบ preemptable / non-preemptable
- Starvation กับ Deadlock: deadlock ⇒ starvation แต่กลับกันไม่จริง
- ตัวอย่าง: สอง lock สลับลำดับ, สอง lock กับ condition variable
- **เงื่อนไขจำเป็น 4 ข้อ**: limited access to resources, no preemption, multiple independent requests (wait while holding), circular chain of requests
- การป้องกัน: จำกัดพฤติกรรมโปรแกรม, resource ให้พอ, ตัด wait while holding (release ก่อนเรียกออกนอก module, Banker's algorithm), ตัด circular waiting (lock ordering, resource allocation graph), predict the future
- Detection (หา cycle ใน resource allocation graph, wait-for graph) และ Recovery (thread rollback, thread restart)

### บทที่ 6: Scheduling — SCH

**6.1 นิยาม** (SCH p.3–4)
- Task/Job, latency/response time, throughput, overhead, fairness, predictability
- Workload, preemptive scheduler, work-conserving

**6.2 FIFO และ SJF** (SCH p.5–9)
- FIFO: ทำตามลำดับที่มาถึงจนเสร็จหรือสละ processor
- SJF: ทำงานที่เหลือน้อยที่สุดก่อน (สไลด์ระบุว่ามักเรียก SRTF)
- SJF optimal สำหรับ average response time แต่มีข้อเสีย (starvation, variance สูง)

**6.3 Round Robin** (SCH p.10–14)
- time quantum · ยาวมาก → เหมือน FIFO · สั้นมาก → overhead สูง
- RR กับ FIFO เมื่องานขนาดเท่ากัน: RR แย่กว่า · RR ไม่ได้ยุติธรรมเสมอ

**6.4 Max-Min fairness** (SCH p.15–16)
- workload ผสม I/O-bound กับ compute-bound · maximize ส่วนแบ่งขั้นต่ำ

**6.5 Multi-level Feedback Queue (MFQ)** (SCH p.17–19)
- ชุดของ RR queue แต่ละ queue มี priority · priority สูง = time slice สั้น
- งานเริ่มที่ priority สูงสุด ถ้าใช้ time slice หมดจะลดลงหนึ่งระดับ
- ตัวอย่าง: priority 1–4 ใช้ time slice 10 / 20 / 40 / 80 ms

**6.6 สรุป uniprocessor** (SCH p.20–22)
- งานขนาดเท่ากัน: FIFO optimal, RR แย่ · งานขนาดต่างกัน: FIFO แย่, RR ใกล้เคียง SJF
- SJF: average response time ดีที่สุด แต่ variance แย่ที่สุด · RR และ Max-Min ไม่เกิด starvation

### บทที่ 7: Address Translation — ADR

**7.1 แนวคิดและเป้าหมาย** (ADR p.3–5)
- virtual address → translation → physical address (ไม่ถูกต้อง → exception)
- เป้าหมาย: memory protection, memory sharing, sparse address, efficiency
- สิ่งที่ทำได้เพิ่ม: copy on write, fill on demand, demand paging, memory-mapped file

**7.2 Base and Bounds** (ADR p.6–9)
- physical = base + virtual, ถ้า virtual ≥ bound → exception
- ข้อดี: ง่าย เร็ว ปลอดภัย ย้ายตำแหน่งได้ · ข้อเสีย: กันเขียนทับ code ตัวเองไม่ได้, share ไม่ได้, ขยาย stack/heap ไม่ได้

**7.3 Segmentation** (ADR p.10–16)
- segment table ต่อ process: start (base), length (bound), access permission
- virtual address = segment # + offset · ตัวอย่าง 2-bit segment + 12-bit offset (ADR p.13)
- ข้อดี: share ได้, protect code ได้, ขยาย stack/heap ได้ · ข้อเสีย: จัดการ memory ซับซ้อน, **external fragmentation**

**7.4 Paging** (ADR p.17–21)
- page ขนาดคงที่ · หา page ว่างด้วย bitmap · page table ต่อ process
- virtual address = page # + offset → frame # + offset
- ตัวอย่าง page table `[4, 3, 1]` (ADR p.21)

**7.5 Sparse address space และ Multi-level translation** (ADR p.23–30)
- ปัญหา page table ใหญ่เกินเมื่อ address space กว้าง
- Paged segmentation, Multi-level page table, Multi-level paged segmentation
- ข้อดี: จองเฉพาะ entry ที่ใช้, share ได้ระดับ segment หรือ page · ข้อเสีย: เปลือง pointer, lookup สองครั้งขึ้นไปต่อ reference

**7.6 TLB** (ADR p.31–34)
- cache ของการแปล virtual page → physical page
- **Cost of translation = Cost of TLB lookup + Prob(TLB miss) × cost of page table lookup**

**7.7 การใช้งานของ address translation** (ADR p.35–36)
- process isolation, IPC, shared code, program initialization, dynamic allocation, zero-copy I/O, memory-mapped file, demand paging

### บทที่ 8: Virtual Memory — VM

**8.1 Cache** (VM p.2–7)
- hit / miss, cache block · temporal locality, spatial locality
- Write through กับ Write back · Memory hierarchy (ตารางเวลาและขนาด VM p.5)

**8.2 Demand paging** (VM p.9–13)
- ลำดับ 13 ขั้น: TLB miss → page table walk → page fault → trap → หา file + offset → จอง frame (evict ถ้าจำเป็น) → อ่าน disk → disk interrupt → mark valid → resume → TLB miss → walk → execute
- การจอง page frame: เลือก page เหยื่อ, ตั้ง PTE เป็น invalid, ลบ TLB entry, เขียนกลับ disk ถ้าถูกแก้

**8.3 Dirty bit และ Use bit** (VM p.14–17)
- dirty (modified) bit ตั้งโดย hardware เมื่อ store · use bit ตั้งเมื่อ TLB miss · kernel reset ได้
- Core map (MIPS)

**8.4 Memory-mapped file** (VM p.18–19)
- เทียบกับ explicit read/write · ข้อดี: โค้ดง่าย, zero-copy I/O, pipelining, IPC

**8.5 Replacement policy** (VM p.20–27)
- Random, **FIFO**, **MIN** (optimal: แทนตัวที่จะไม่ถูกใช้นานที่สุดในอนาคต), **LRU** (ประมาณ MIN), **LFU**
- ตัวอย่างในสไลด์: FIFO กับ sequential scan `A B C D E ...` 4 ช่อง (miss ทุกครั้ง), เปรียบเทียบ LRU/FIFO/MIN (VM p.25)
- **Belady's anomaly**: reference `A B C D A B E A B C D E` — FIFO 3 ช่องกับ 4 ช่อง (VM p.26)

---

## 2. จุดที่เอกสารต่างจากความรู้ทั่วไป

บทเรียนและเฉลยจะยึดตามเอกสาร และใส่หมายเหตุในจุดเหล่านี้

| เรื่อง | ในเอกสาร | ทั่วไป/ตำราอื่น | ที่มา |
|---|---|---|---|
| เงื่อนไข deadlock | limited access, no preemption, wait while holding, circular chain | ชื่อแบบ Coffman: mutual exclusion, hold and wait, no preemption, circular wait | SYN4 p.18 |
| Banker's algorithm | อยู่ใต้หัวข้อ "Eliminate wait while holding" ของ Preventing Deadlock | มักจัดเป็น deadlock avoidance | SYN4 p.19 |
| ชื่อ algorithm | FIFO, SJF (= SRTF, พิจารณาเฉพาะ preemptive), MIN | FCFS, แยก SJF กับ SRTF, OPT | SCH p.4–6, VM p.23 |
| Semaphore | `P()` / `V()` | `wait()` / `signal()` | SYN1 p.17 |
| สถานะ thread | Init, Ready, Running, Waiting, Finished | New, Ready, Running, Waiting/Blocked, Terminated | CON p.14 |
| จำนวน page table entry | 32-bit, page 4KB ⇒ "500K" entries | 2³² / 2¹² = 2²⁰ ≈ 1 ล้าน | ADR p.23 |

หมายเหตุ: ตัวอย่างในไฟล์ดีไซน์ (Claude Design) ใช้ชื่อแบบ Coffman และมีบท File System / Disk Scheduling / I/O
ซึ่ง **ไม่มีในเอกสารของอาจารย์** เนื้อหาจริงจะตามเอกสาร ไม่ตามตัวอย่างในดีไซน์

---

## 3. Simulation ที่เสนอ

ทุกตัวใช้ `SimulationPlayer` เดิม มีคำอธิบายภาษาไทยทุกขั้น และผู้ใช้แก้ input ได้

### ลำดับความสำคัญสูง

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S1 | CPU Scheduling | รายการงาน (เวลามาถึง, ความยาว), เลือก FIFO / SJF / Round Robin, time quantum | Gantt chart ที่โตทีละช่วง, ready queue, งานที่ถูกเลือกและเหตุผล, response time ของแต่ละงานและค่าเฉลี่ย | 6 |
| S2 | Multi-level Feedback Queue | รายการงาน (ความยาว, ช่วง I/O), time slice ของแต่ละระดับ | queue 4 ระดับ, งานที่ถูกเลือกจาก queue สูงสุด, การลดระดับเมื่อใช้ time slice หมด | 6 |
| S3 | Page Replacement | reference string, จำนวน frame, เลือก FIFO / MIN / LRU / LFU | เนื้อหาใน frame, hit หรือ miss, ตัวที่ถูกแทนและเหตุผล, จำนวน miss สะสม · โหมดเทียบ 3 กับ 4 frame เพื่อดู Belady's anomaly | 8 |
| S4 | Address Translation | virtual address, เลือก Base & Bounds / Segmentation / Paging, แก้ตารางได้ | แยก address เป็นส่วน (segment/page + offset), เปิดตาราง, ตรวจ bound และ permission, ได้ physical address หรือ exception | 7 |
| S5 | TLB และ Demand Paging | ลำดับ page ที่เข้าถึง (อ่าน/เขียน), ขนาด TLB, จำนวน frame | TLB hit/miss, page table walk, page fault 13 ขั้น, การ evict, dirty/use bit, และค่า cost ตามสูตร TLB | 7–8 |
| S6 | Too Much Milk | เลือกวิธี (Try #1, #2, #3, Lock) และกำหนดลำดับการสลับ thread เอง | บรรทัดที่แต่ละ thread ทำ, สถานะ note และนม, แจ้งเมื่อผิด safety (ซื้อสองคน) หรือ liveness (ไม่มีใครซื้อ) | 5 |
| S7 | Race condition และ Lock | จำนวนรอบที่แต่ละ thread เพิ่มค่า, ลำดับการสลับ, เปิด/ปิด lock | load / add / store ของแต่ละ thread, ค่าที่หายไป (lost update), thread ที่รอ lock | 5 |
| S8 | Deadlock และ Resource Allocation Graph | จำนวน thread และ lock, ลำดับการ acquire ของแต่ละ thread, สวิตช์ lock ordering | เส้นถือครองและเส้นร้องขอในกราฟ, การตรวจ cycle, สถานะ waiting และ deadlock, ผลของ lock ordering | 5 |

### ลำดับความสำคัญรอง

| # | ชื่อ | ผู้ใช้ป้อนอะไร | แสดงอะไรทีละขั้น | บท |
|---|---|---|---|---|
| S9 | Semaphore P/V | ค่าเริ่มต้น และลำดับ `P` / `V` ของแต่ละ thread | ค่า semaphore, คิวผู้รอ, thread ที่ถูกปลุก | 5 |
| S10 | Condition variable | ลำดับเหตุการณ์ของ thread ที่ wait และ signal, เลือก `if` หรือ `while` | การปล่อยและถือ lock ใหม่, ready list, บั๊กเมื่อใช้ `if` แทน `while` | 5 |
| S11 | Interrupt และ Mode switch (x86) | เลือกเหตุการณ์: timer interrupt, system call, exception | user stack กับ kernel stack, ค่า `SS:ESP` / `CS:EIP` / `EFLAGS` ที่ถูก push, การสลับ mode, การ return | 2–3 |
| S12 | fork / exec / wait | โปรแกรมสั้น ๆ ที่เลือกจำนวน `fork` และตำแหน่ง `exec` / `wait` | ต้นไม้ process, ค่าที่ `fork` คืนในแต่ละ process, PCB ที่ถูกสร้าง | 3 |
| S13 | Thread lifecycle | ลำดับ operation: create, yield, join, exit, timer interrupt | สถานะของแต่ละ thread (Init/Ready/Running/Waiting/Finished) และ ready list | 4 |
| S14 | Multi-level page table | virtual address และขนาดของแต่ละ index | การ walk ทีละระดับ และจำนวน lookup เทียบกับ page table ชั้นเดียว | 7 |

ข้อเสนอ: ทำ S1–S8 ก่อน เพราะเป็นหัวข้อที่ต้องไล่ทีละขั้นจึงจะเข้าใจ และเหมาะกับข้อสอบแบบประยุกต์

---

## 4. น้ำหนักข้อสอบ (เดา)

ที่มาของการเดา: สัดส่วนหน้าสไลด์, จำนวนคำถาม (Question / Activity) ที่อาจารย์ใส่ในสไลด์, และข้อเท็จจริงว่าสอบปลายภาค
ครั้งเดียวครอบคลุมทุกบท **ไม่มีข้อสอบเก่าให้เทียบ** ตัวเลขนี้จึงเป็นการประมาณ

| หัวข้อ | หน้า | น้ำหนัก | ข้อ / ชุด 70 ข้อ |
|---|---|---|---|
| 1 Introduction | 15 | 6% | 4 |
| 2 Kernel abstraction, dual mode, process | 33 | 12% | 8 |
| 3 Mode switch, syscall, process management, UNIX I/O | 40 | 13% | 9 |
| 4 Concurrency และ thread | 28 | 11% | 8 |
| 5 Synchronization: race, lock, semaphore, CV | 21 + ส่วนของ SYN4 | 12% | 8 |
| 5 Deadlock, performance, CSP | ส่วนของ SYN4 | 10% | 7 |
| 6 Scheduling | 22 | 11% | 8 |
| 7 Address translation | 36 | 14% | 10 |
| 8 Virtual memory | 27 | 11% | 8 |
| รวม | | 100% | 70 |

Concurrency และ Synchronization มี case study แยก 25% อยู่แล้ว จึงอาจออกในข้อสอบปลายภาคน้อยกว่าสัดส่วนหน้า
หรืออาจออกมากเพราะเป็นหัวใจของวิชา ผมไม่มีข้อมูลพอจะตัดสิน จึงให้ตามสัดส่วนหน้า

### สไตล์คำถามที่เห็นจากสไลด์

อาจารย์ใส่คำถามปลายเปิดไว้ตลอด ข้อสอบจำลองจะแปลงเป็นปรนัยแนวเดียวกัน

- **ทำไม / จะเกิดอะไร** — "ทำไมใช้ user stack ไม่ได้" (PC2 p.8), "ทำไม 'thread returned' ต้องพิมพ์ตามลำดับ" (CON p.11)
- **โค้ดนี้ถูกไหม** — "Can this panic?" (SYN1 p.3), "Will this code work?" (SYN1 p.16)
- **กรณีขอบ** — "fork / exec คืน error ได้ไหม", "wait คืนทันทีได้ไหม" (PC2 p.30)
- **ข้อเสียของวิธีนี้คืออะไร** — Base & Bounds, Segmentation, Paging, Multilevel (ADR p.8, 15, 22, 29)
- **เมื่อไรดีที่สุด/แย่ที่สุด** — "FIFO optimal เมื่อไร, pessimal เมื่อไร" (SCH p.9), "time quantum ยาวมาก/สั้นมากเป็นอย่างไร" (SCH p.10)
- **ไล่ลำดับเหตุการณ์** — Too Much Milk, x86 interrupt, demand paging 13 ขั้น, reference string

---

## 5. โครงบทเรียนที่จะสร้างใน Step ถัดไป (เสนอ)

19 บทเรียน ชื่อไฟล์ `content/os/NN-*.mdx`

| # | บทเรียน | chapter | sim |
|---|---|---|---|
| 01 | ประวัติและบทบาทของ OS | 1 | – |
| 02 | การประเมิน OS และ design tradeoff | 1 | – |
| 03 | Kernel, protection และ dual-mode operation | 2 | – |
| 04 | Process, PCB และ address space | 2 | – |
| 05 | Interrupt, exception, system call | 2–3 | S11 (รอง) |
| 06 | Kernel stack และ x86 interrupt | 3 | S11 (รอง) |
| 07 | fork, exec, wait และ shell | 3 | S12 (รอง) |
| 08 | UNIX I/O, IPC และโครงสร้าง kernel | 3 | – |
| 09 | Thread abstraction และ operations | 4 | S13 (รอง) |
| 10 | Thread context switch และ user-level thread | 4 | – |
| 11 | Race condition และ Too Much Milk | 5 | S6, S7 |
| 12 | Lock, Semaphore, Condition variable | 5 | S9, S10 (รอง) |
| 13 | Synchronization performance และ best practice | 5 | – |
| 14 | Deadlock | 5 | S8 |
| 15 | Scheduling: FIFO, SJF, Round Robin | 6 | S1 |
| 16 | Max-Min fairness และ MFQ | 6 | S2 |
| 17 | Base & Bounds, Segmentation, Paging | 7 | S4 |
| 18 | Multi-level translation และ TLB | 7 | S5, S14 (รอง) |
| 19 | Cache, Demand paging, Page replacement | 8 | S3, S5 |
