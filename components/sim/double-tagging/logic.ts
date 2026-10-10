// VLAN hopping by double tagging: docs/IST/Vlan.pdf p.33–34, 38 and docs/IST/มาตรฐานและเทคโนโลยีเครือข่าย (2).pdf p.7.

export interface Config {
  /** Access VLAN of the attacker's port on SW1. */
  attacker: number;
  /** Native VLAN of the trunk between SW1 and SW2. */
  native: number;
  /** VLAN the attacker wants to reach. */
  target: number;
  /** `vlan dot1q tag native`: the native VLAN is tagged too. */
  tagNative: boolean;
}

export interface Stage {
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  at: 0 | 1 | 2 | 3 | 4;
  /** Tags on the frame, outermost first. */
  tags: readonly number[];
}

export function stages(c: Config): Stage[] {
  const out: Stage[] = [
    {
      title: `ผู้โจมตีสร้าง frame ที่มี tag สองชั้น: outer ${c.attacker}, inner ${c.target}`,
      body: `ผู้โจมตีอยู่บน access port ของ VLAN ${c.attacker} ใช้เครื่องมือ (เช่น yersinia) สร้าง frame ที่มี 802.1Q tag ซ้อนกัน: ชั้นนอกเป็น VLAN ของตัวเอง ชั้นในเป็น VLAN เป้าหมาย ${c.target}`,
      tone: 'active',
      at: 0,
      tags: [c.attacker, c.target],
    },
    {
      title: `SW1 รับ frame เข้า VLAN ${c.attacker}`,
      body: `outer tag ตรงกับ VLAN ของ access port (${c.attacker}) SW1 จึงรับ frame และถือว่าเป็นของ VLAN ${c.attacker} SW1 ดู tag เพียงชั้นเดียว inner tag จึงยังอยู่ในเนื้อ frame`,
      tone: 'active',
      at: 1,
      tags: [c.attacker, c.target],
    },
  ];

  const stripped = c.attacker === c.native && !c.tagNative;
  if (stripped) {
    out.push({
      title: `VLAN ${c.attacker} เป็น Native VLAN → SW1 ลอก outer tag แล้วส่งออก trunk`,
      body: `frame ของ Native VLAN ต้องส่งบน trunk แบบไม่มี tag SW1 จึงลอก outer tag ออก แต่ inner tag (VLAN ${c.target}) ยังอยู่ frame ที่วิ่งบน trunk จึงดูเหมือน frame ปกติของ VLAN ${c.target}`,
      tone: 'error',
      at: 2,
      tags: [c.target],
    });
    out.push({
      title: `SW2 อ่าน tag ที่เหลือ: VLAN ${c.target}`,
      body: `SW2 เห็น tag เดียวคือ ${c.target} ไม่มีทางรู้ว่าเคยมีอีกชั้น จึงถือว่า frame เป็นของ VLAN ${c.target}`,
      tone: 'error',
      at: 3,
      tags: [c.target],
    });
    out.push({
      title: `frame ไปถึงเหยื่อใน VLAN ${c.target} — VLAN hopping สำเร็จ`,
      body: `SW2 ลอก tag แล้วส่งออก access port ของเหยื่อ ผู้โจมตีข้ามจาก VLAN ${c.attacker} ไป VLAN ${c.target} ได้โดยไม่ผ่าน router แต่ทำได้ทิศทางเดียว: คำตอบจากเหยื่ออยู่ใน VLAN ${c.target} และกลับมาหาผู้โจมตีใน VLAN ${c.attacker} ไม่ได้ ป้องกันโดยเปลี่ยน Native VLAN เป็น VLAN ที่ไม่มีใครใช้ (เช่น 999)`,
      tone: 'error',
      at: 4,
      tags: [],
    });
    return out;
  }

  out.push({
    title: `SW1 ส่งออก trunk โดย outer tag ${c.attacker} ยังอยู่`,
    body:
      c.attacker === c.native
        ? `VLAN ${c.attacker} เป็น Native VLAN แต่เปิด vlan dot1q tag native ไว้ SW1 จึงใส่ tag ให้ Native VLAN ด้วย outer tag ไม่ถูกลอก inner tag จึงไม่โผล่ออกมา`
        : `VLAN ${c.attacker} ไม่ใช่ Native VLAN (${c.native}) frame จึงถูกส่งบน trunk พร้อม tag ${c.attacker} ตามปกติ outer tag ไม่ถูกลอก inner tag จึงยังซ่อนอยู่ข้างใน`,
    tone: 'waiting',
    at: 2,
    tags: [c.attacker, c.target],
  });
  out.push({
    title: `SW2 อ่าน outer tag: VLAN ${c.attacker}`,
    body: `SW2 ดู tag ชั้นนอกสุดเท่านั้น จึงถือว่า frame เป็นของ VLAN ${c.attacker} inner tag เป็นแค่ข้อมูลในเนื้อ frame`,
    tone: 'waiting',
    at: 3,
    tags: [c.attacker, c.target],
  });
  out.push({
    title: `frame อยู่ใน VLAN ${c.attacker} ตามเดิม — โจมตีไม่สำเร็จ`,
    body: `frame ถูกส่งเฉพาะในพอร์ตของ VLAN ${c.attacker} ไม่ถึงเหยื่อใน VLAN ${c.target} double tagging ได้ผลก็ต่อเมื่อผู้โจมตีอยู่ใน VLAN เดียวกับ Native VLAN ของ trunk การย้าย Native VLAN ไปยัง VLAN ที่ไม่มีพอร์ตของผู้ใช้จึงปิดช่องนี้`,
    tone: 'done',
    at: 3,
    tags: [c.attacker, c.target],
  });
  return out;
}

export interface State {
  config: Config;
  stages: readonly Stage[];
  i: number;
}
export const init = (config: Config): State => ({ config, stages: stages(config), i: -1 });
export const isDone = (s: State) => s.i >= s.stages.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
