// STP port states and convergence, and RSTP: docs/IST/Spanning Tree Protocol Presentation (1).pdf p.12, 20–22.

export type Protocol = 'stp' | 'rstp';

export interface Phase {
  /** Port state during this phase. */
  state: string;
  title: string;
  body: string;
  /** Seconds since the failure when this phase starts and ends. */
  from: number;
  to: number;
  tone: 'active' | 'waiting' | 'error' | 'done';
  bpdu: boolean;
  learn: boolean;
  forward: boolean;
}

export function phases(protocol: Protocol, maxAge: number, forwardDelay: number): Phase[] {
  if (protocol === 'stp') {
    const t1 = maxAge;
    const t2 = t1 + forwardDelay;
    const t3 = t2 + forwardDelay;
    return [
      { state: 'Blocking', title: 'ก่อนเกิดเหตุ: พอร์ตสำรองอยู่ในสถานะ Blocking', body: 'พอร์ตนี้ถูก block เพื่อตัด loop ไม่ส่ง data frame และไม่เรียน MAC แต่ยังรับ BPDU ที่ root ส่งมาทุก 2 วินาที (Hello time) เพื่อรู้ว่าเส้นทางหลักยังอยู่', from: 0, to: 0, tone: 'waiting', bpdu: true, learn: false, forward: false },
      { state: 'Blocking', title: `เส้นทางหลักล่ม: รอ Max Age ${maxAge} วินาที`, body: `BPDU ที่ดีกว่าหยุดมาถึง แต่ switch ยังเก็บข้อมูล BPDU ล่าสุดไว้จนครบ Max Age (${maxAge} วินาที) จึงจะถือว่าข้อมูลนั้นหมดอายุและเริ่มคำนวณ topology ใหม่ ตลอดช่วงนี้เครือข่ายส่วนที่อยู่หลังลิงก์ที่ล่มใช้งานไม่ได้`, from: 0, to: t1, tone: 'error', bpdu: true, learn: false, forward: false },
      { state: 'Listening', title: `Listening ${forwardDelay} วินาที`, body: `พอร์ตเริ่มเข้าร่วม: รับและส่ง BPDU เพื่อตัดสินบทบาทของตัวเอง (Root Port หรือ Designated Port) แต่ยังไม่เรียน MAC และยังไม่ส่ง data frame รอครบ Forward Delay (${forwardDelay} วินาที) เพื่อให้แน่ใจว่าไม่มี BPDU ที่ดีกว่ามาถึง`, from: t1, to: t2, tone: 'waiting', bpdu: true, learn: false, forward: false },
      { state: 'Learning', title: `Learning ${forwardDelay} วินาที`, body: `พอร์ตเริ่มเรียน Source MAC ลง MAC address table แต่ยังไม่ส่ง data frame การเรียนไว้ก่อนช่วยลดการ flood เมื่อเปิดใช้จริง รออีกหนึ่ง Forward Delay (${forwardDelay} วินาที)`, from: t2, to: t3, tone: 'waiting', bpdu: true, learn: true, forward: false },
      { state: 'Forwarding', title: `Forwarding: เครือข่ายกลับมาใช้ได้ที่วินาทีที่ ${t3}`, body: `พอร์ตส่งและรับ data frame ตามปกติ เวลารวม = Max Age + Forward Delay + Forward Delay = ${maxAge} + ${forwardDelay} + ${forwardDelay} = ${t3} วินาที${t3 === 50 ? ' ซึ่งคือ "ประมาณ 50 วินาที" ของ STP 802.1D' : ''}`, from: t3, to: t3, tone: 'done', bpdu: true, learn: true, forward: true },
    ];
  }
  return [
    { state: 'Discarding', title: 'ก่อนเกิดเหตุ: Alternate Port อยู่ในสถานะ Discarding', body: 'RSTP รวม Blocking และ Listening ของ STP เป็นสถานะ Discarding และกำหนดบทบาท Alternate Port ไว้ล่วงหน้าให้เป็นตัวสำรองของ Root Port พอร์ตนี้ไม่ส่ง data แต่รู้อยู่แล้วว่าเป็นทางสำรองไป root', from: 0, to: 0, tone: 'waiting', bpdu: true, learn: false, forward: false },
    { state: 'Discarding', title: 'เส้นทางหลักล่ม: Alternate Port ขึ้นเป็น Root Port', body: 'switch ตรวจพบว่า Root Port ล่ม และมี Alternate Port ที่คำนวณไว้แล้ว จึงเลื่อนบทบาททันทีโดยไม่ต้องรอ Max Age', from: 0, to: 0, tone: 'active', bpdu: true, learn: false, forward: false },
    { state: 'Learning', title: 'Proposal / Agreement handshake', body: 'แทนที่จะรอ timer RSTP ให้ switch สองฝั่งของลิงก์คุยกันตรง ๆ: ฝั่งหนึ่งส่ง Proposal อีกฝั่งตรวจว่าไม่เกิด loop แล้วตอบ Agreement เมื่อตกลงกันได้ พอร์ตก็ข้ามไปสถานะถัดไปได้เลย', from: 0, to: 1, tone: 'active', bpdu: true, learn: true, forward: false },
    { state: 'Forwarding', title: 'Forwarding: ใช้เวลาไม่ถึง 10 วินาที', body: 'RSTP มีสามสถานะ: Discarding, Learning, Forwarding สไลด์ระบุเวลา convergence ของ RSTP ว่าน้อยกว่า 10 วินาที เทียบกับประมาณ 50 วินาทีของ STP (ในทางปฏิบัติมักเร็วกว่านั้นมาก)', from: 1, to: 1, tone: 'done', bpdu: true, learn: true, forward: true },
  ];
}

export interface State {
  protocol: Protocol;
  phases: readonly Phase[];
  i: number;
}
export const init = (protocol: Protocol, maxAge: number, forwardDelay: number): State => ({ protocol, phases: phases(protocol, maxAge, forwardDelay), i: 0 });
export const isDone = (s: State) => s.i >= s.phases.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
