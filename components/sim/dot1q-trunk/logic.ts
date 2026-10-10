// 802.1Q tagging on a trunk and the native VLAN: docs/IST/Vlan.pdf p.6–7, 20–22.

export interface Config {
  /** Access VLAN of host A on SW1 and host B on SW2. */
  vlanA: number;
  vlanB: number;
  /** Native VLAN configured on each end of the trunk. */
  native1: number;
  native2: number;
}

export interface Stage {
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  /** Where the frame is: host A, SW1, on the trunk, SW2, host B. */
  at: 0 | 1 | 2 | 3 | 4;
  /** Tag on the frame at this point (null = untagged). */
  tag: number | null;
  /** VLAN the switch that holds the frame treats it as. */
  vlan: number | null;
}

export function stages(c: Config): Stage[] {
  const out: Stage[] = [
    {
      title: 'A ส่ง frame เข้า access port ของ SW1',
      body: `host ไม่รู้จัก VLAN จึงส่ง Ethernet frame ธรรมดา (untagged) SW1 รับเข้าทาง access port ซึ่งอยู่ใน VLAN ${c.vlanA} จึงถือว่า frame นี้เป็นของ VLAN ${c.vlanA}`,
      tone: 'active',
      at: 1,
      tag: null,
      vlan: c.vlanA,
    },
  ];

  const tagged = c.vlanA !== c.native1;
  out.push(
    tagged
      ? {
          title: `SW1 ใส่ 802.1Q tag VLAN ${c.vlanA} แล้วส่งออก trunk`,
          body: `trunk ขนหลาย VLAN ในสายเดียว จึงต้องบอกว่า frame เป็นของ VLAN ใด SW1 แทรก tag 4 byte (TPID 0x8100 + Priority 3 bit + CFI 1 bit + VLAN ID 12 bit = ${c.vlanA}) ไว้หลัง Source MAC`,
          tone: 'active',
          at: 2,
          tag: c.vlanA,
          vlan: c.vlanA,
        }
      : {
          title: `VLAN ${c.vlanA} เป็น Native VLAN ของ SW1 → ส่งออก trunk แบบไม่ใส่ tag`,
          body: `frame ของ Native VLAN เป็น VLAN เดียวบน trunk ที่ไม่ถูกใส่ tag (untagged) SW1 จึงส่ง frame ออกไปเหมือนเดิม ฝั่งรับต้องเดาเองว่าเป็นของ VLAN ใด`,
          tone: 'waiting',
          at: 2,
          tag: null,
          vlan: c.vlanA,
        },
  );

  const seen = tagged ? c.vlanA : c.native2;
  out.push(
    tagged
      ? {
          title: `SW2 อ่าน tag: VLAN ${c.vlanA}`,
          body: `frame มี tag จึงรู้ทันทีว่าเป็นของ VLAN ${c.vlanA} ไม่ขึ้นกับการตั้ง Native VLAN`,
          tone: 'active',
          at: 3,
          tag: c.vlanA,
          vlan: seen,
        }
      : {
          title: `SW2 ได้ frame ไม่มี tag → จัดเข้า Native VLAN ของตัวเอง (${c.native2})`,
          body:
            c.native1 === c.native2
              ? `frame ที่ไม่มี tag บน trunk ถูกจัดเข้า Native VLAN ของฝั่งรับ ซึ่งตั้งตรงกัน (${c.native2}) frame จึงยังอยู่ VLAN เดิม`
              : `frame ที่ไม่มี tag บน trunk ถูกจัดเข้า Native VLAN ของฝั่งรับ แต่ SW1 ตั้ง ${c.native1} ส่วน SW2 ตั้ง ${c.native2} — Native VLAN mismatch: frame ที่ออกจาก VLAN ${c.vlanA} กลายเป็นของ VLAN ${c.native2} คือ traffic รั่วข้าม VLAN (CDP จะแจ้งเตือน ตรวจด้วย show cdp neighbors detail)`,
          tone: c.native1 === c.native2 ? 'waiting' : 'error',
          at: 3,
          tag: null,
          vlan: seen,
        },
  );

  const leak = seen !== c.vlanA;
  out.push(
    seen === c.vlanB
      ? {
          title: leak ? `B (VLAN ${c.vlanB}) ได้รับ frame ที่ไม่ควรได้` : 'SW2 ลอก tag แล้วส่งให้ B',
          body: leak
            ? `SW2 เข้าใจว่า frame เป็นของ VLAN ${seen} จึงส่งออก access port ของ B ทั้งที่ A อยู่ VLAN ${c.vlanA} การแยก VLAN ถูกทำลายโดยไม่มี Layer 3 เกี่ยวข้อง แก้โดยตั้ง switchport trunk native vlan ให้ตรงกันทั้งสองฝั่ง (แนะนำ VLAN ที่ไม่ใช้ เช่น 999)`
            : `access port ของ B อยู่ VLAN ${c.vlanB} ตรงกับ VLAN ของ frame SW2 จึงส่งออกโดย${tagged ? 'ลอก tag ออกก่อน' : 'ไม่มี tag อยู่แล้ว'} B ได้รับ Ethernet frame ธรรมดา ไม่รู้เลยว่ามี VLAN`,
          tone: leak ? 'error' : 'done',
          at: 4,
          tag: null,
          vlan: seen,
        }
      : {
          title: `B อยู่ VLAN ${c.vlanB} ไม่ได้รับ frame`,
          body: `SW2 ส่ง frame ของ VLAN ${seen} ออกเฉพาะพอร์ตใน VLAN ${seen} ส่วน B อยู่ VLAN ${c.vlanB} เป็นคนละ broadcast domain ${leak ? `(และ frame ยังรั่วจาก VLAN ${c.vlanA} ไปอยู่ VLAN ${seen} เพราะ Native VLAN ไม่ตรงกัน)` : 'ถ้าต้องการให้คุยกันต้องผ่านอุปกรณ์ Layer 3'}`,
          tone: leak ? 'error' : 'waiting',
          at: 3,
          tag: null,
          vlan: seen,
        },
  );
  return out;
}

export interface State {
  config: Config;
  stages: readonly Stage[];
  /** -1 before the first step. */
  i: number;
}
export const init = (config: Config): State => ({ config, stages: stages(config), i: -1 });
export const isDone = (s: State) => s.i >= s.stages.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
