// let / const / var: docs/WEB/JavaScript - Variable.pdf p.3–6.

export type Keyword = 'var' | 'let' | 'const';
export type Scenario = 'scope' | 'redeclare' | 'reassign' | 'init';

export interface Line {
  code: string;
  /** What running this line does; null = a line that is only shown (braces, blanks). */
  run: null | { ok: boolean; output?: string; title: string; body: string };
}

const SCOPE_NAME: Record<Keyword, string> = { var: 'function scope', let: 'block scope', const: 'block scope' };

export function program(scenario: Scenario, k: Keyword): Line[] {
  const block = k !== 'var';
  switch (scenario) {
    case 'scope':
      return [
        { code: `${k} global = "global"`, run: { ok: true, title: 'ประกาศ global นอกทุก function และ block', body: 'ตัวแปรที่ประกาศชั้นนอกสุดใช้ได้ทั้งไฟล์ ไม่ว่าจะใช้ keyword ใด' } },
        { code: '', run: null },
        { code: 'function test() {', run: null },
        { code: `    ${k} f1 = "function";`, run: null },
        { code: '    console.log(f1);', run: null },
        { code: '}', run: null },
        { code: '', run: null },
        { code: 'if (true) {', run: null },
        { code: `    ${k} block = "block";`, run: { ok: true, title: 'ประกาศ block ภายใน { } ของ if', body: block ? `${k} เป็น block scoped: ตัวแปรมีอยู่เฉพาะใน { } ที่ประกาศ` : 'var ไม่สนใจ { } ของ if (ไม่ใช่ function) ตัวแปร block จึงหลุดออกไปเป็นตัวแปรของ scope ชั้นนอก' } },
        { code: '}', run: null },
        { code: '', run: null },
        { code: 'test();', run: { ok: true, output: 'function', title: 'เรียก test(): ประกาศ f1 และพิมพ์ค่า', body: `โค้ดใน function ทำงานตอนถูกเรียก ไม่ใช่ตอนประกาศ: f1 ถูกสร้างภายใน function และ console.log(f1) ข้างในพิมพ์ "function" ได้ เพราะอยู่ scope เดียวกัน เมื่อ function จบ f1 ก็หมดอายุ` } },
        { code: 'console.log(global)', run: { ok: true, output: 'global', title: 'console.log(global) ทำได้', body: 'global อยู่ชั้นนอกสุด' } },
        {
          code: 'console.log(block);',
          run: block
            ? { ok: false, output: 'ReferenceError: block is not defined', title: 'console.log(block) → ReferenceError', body: `${k} เป็น block scoped: block มีอยู่เฉพาะใน { } ของ if เท่านั้น ในสไลด์บรรทัดนี้จึงถูก comment ไว้ (โปรแกรมจริงจะหยุดที่ error นี้ simulation ทำบรรทัดถัดไปต่อเพื่อให้เห็นผลของแต่ละบรรทัด)` }
            : { ok: true, output: 'block', title: 'console.log(block) ทำได้', body: 'var ไม่ใช่ block scoped ตัวแปรที่ประกาศใน if จึงใช้ข้างนอกได้ นี่คือเหตุผลหนึ่งที่ควรเลี่ยง var' },
        },
        { code: 'console.log(f1);', run: { ok: false, output: 'ReferenceError: f1 is not defined', title: 'console.log(f1) → ReferenceError', body: `f1 ประกาศใน function จึงใช้นอก function ไม่ได้ ไม่ว่าจะเป็น var, let หรือ const สรุป: ${k} เป็น ${SCOPE_NAME[k]}` } },
      ];
    case 'redeclare':
      return [
        { code: `${k} ok = "ok";`, run: { ok: true, title: 'ประกาศ ok ครั้งแรก', body: 'การประกาศ (declaration) คือการสร้างตัวแปรขึ้นมา' } },
        {
          code: `${k} ok = "great";`,
          run:
            k === 'var'
              ? { ok: true, title: 'ประกาศ ok ซ้ำ: var ยอม', body: 'var ประกาศชื่อเดิมซ้ำใน scope เดียวกันได้ (redeclaration) ค่าใหม่ทับค่าเก่าเงียบ ๆ จึงพลาดได้ง่ายเมื่อใช้ชื่อซ้ำโดยไม่ตั้งใจ' }
              : { ok: false, output: "SyntaxError: Identifier 'ok' has already been declared", title: `ประกาศ ok ซ้ำ: ${k} ไม่ยอม`, body: `${k} ประกาศชื่อเดิมซ้ำใน scope เดียวกันไม่ได้ โปรแกรมไม่ทำงานเลย (เป็น SyntaxError ที่ตรวจพบก่อนรัน)` },
        },
        { code: 'console.log(ok);', run: k === 'var' ? { ok: true, output: 'great', title: 'พิมพ์ great', body: 'ค่าล่าสุดชนะ' } : { ok: false, title: 'ไม่ถูกทำ', body: 'โปรแกรมหยุดตั้งแต่ตรวจพบการประกาศซ้ำ' } },
      ];
    case 'reassign':
      return [
        { code: `${k} name = "John";`, run: { ok: true, title: 'ประกาศและกำหนดค่าเริ่มต้น', body: 'name มีค่า "John"' } },
        {
          code: 'name = "Ben";',
          run:
            k === 'const'
              ? { ok: false, output: 'TypeError: Assignment to constant variable.', title: 'กำหนดค่าใหม่ให้ const → TypeError', body: 'const กำหนดค่าใหม่ (reassignment) ไม่ได้ จึงใช้กับค่าที่ไม่ควรเปลี่ยน สไลด์แนะนำให้ใช้ const เป็นค่าเริ่มต้น และใช้ let เมื่อค่าต้องเปลี่ยน' }
              : { ok: true, title: 'กำหนดค่าใหม่ได้', body: `reassignment ทำได้กับ var และ let: name เปลี่ยนเป็น "Ben" (ไม่ต้องเขียน ${k} ซ้ำ เพราะไม่ใช่การประกาศใหม่)` },
        },
        { code: 'console.log(name);', run: k === 'const' ? { ok: false, title: 'ไม่ถูกทำ', body: 'โปรแกรมหยุดที่ error บรรทัดก่อนหน้า' } : { ok: true, output: 'Ben', title: 'พิมพ์ Ben', body: 'ได้ค่าที่กำหนดใหม่' } },
      ];
    default:
      return [
        {
          code: `${k} name1;`,
          run:
            k === 'const'
              ? { ok: false, output: 'SyntaxError: Missing initializer in const declaration', title: 'const ต้องมีค่าเริ่มต้น', body: 'const กำหนดค่าใหม่ทีหลังไม่ได้ จึงต้องให้ค่าตั้งแต่ตอนประกาศ (initialization) ถ้าไม่ให้จะเป็น SyntaxError' }
              : { ok: true, title: 'ประกาศโดยไม่กำหนดค่า', body: `${k} ประกาศโดยไม่ให้ค่าเริ่มต้นได้ ตัวแปรจะมีค่าเป็น undefined` },
        },
        { code: 'console.log(name1);', run: k === 'const' ? { ok: false, title: 'ไม่ถูกทำ', body: 'โปรแกรมไม่ผ่านการตรวจ syntax' } : { ok: true, output: 'undefined', title: 'พิมพ์ undefined', body: 'var และ let ที่ยังไม่ได้กำหนดค่า ถูก initialize เป็น undefined' } },
      ];
  }
}

export interface State {
  lines: readonly Line[];
  /** Index of the line just executed; -1 at the start. */
  at: number;
  output: readonly string[];
  halted: boolean;
}

const nextRunnable = (lines: readonly Line[], from: number) => lines.findIndex((l, i) => i > from && l.run !== null);

export const init = (scenario: Scenario, keyword: Keyword): State => ({ lines: program(scenario, keyword), at: -1, output: [], halted: false });
export const isDone = (s: State) => nextRunnable(s.lines, s.at) === -1;

export function step(s: State): State {
  const at = nextRunnable(s.lines, s.at);
  if (at === -1) return s;
  const run = s.lines[at]!.run!;
  return { ...s, at, output: run.output ? [...s.output, run.output] : s.output, halted: s.halted || !run.ok };
}
