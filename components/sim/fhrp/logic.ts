// FHRP failover (HSRP and VRRP): docs/IST/Default Gateway คือจุดเปราะบางของเครือข่าย.pdf p.5–13, 17–22
// and docs/IST/มาตรฐานและเทคโนโลยีเครือข่าย (2).pdf p.26–34.

export type Protocol = 'hsrp' | 'vrrp';
export type Scenario = 'fail' | 'wan';
export type Router = 'R1' | 'R2';

export interface Config {
  protocol: Protocol;
  p1: number;
  p2: number;
  preempt: boolean;
  scenario: Scenario;
  /** Tracking decrement applied when the WAN link goes down (0 = no tracking). */
  decrement: number;
}

export const TERMS: Record<Protocol, { active: string; standby: string; hello: string; mac: string; mcast: string; filter: string }> = {
  hsrp: { active: 'Active', standby: 'Standby', hello: 'Hello', mac: '0000.0C9F.F001', mcast: '224.0.0.102 (UDP 1985)', filter: 'udp port 1985' },
  vrrp: { active: 'Master', standby: 'Backup', hello: 'Advertisement', mac: '0000.5E00.0101', mcast: '224.0.0.18 (IP protocol 112)', filter: 'ip proto 112' },
};
export const IP: Record<Router, string> = { R1: '192.168.10.2', R2: '192.168.10.3' };
export const VIP = '192.168.10.1';

export interface Phase {
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  /** Router forwarding for the virtual IP; null = nobody (outage). */
  forwarder: Router | null;
  prio: Record<Router, number>;
  up: Record<Router, boolean>;
  /** WAN uplink of each router. */
  wan: Record<Router, boolean>;
  /** Traffic reaches the outside world. */
  reachable: boolean;
}

export const masterDown = (priority: number) => 3 * 1 + (256 - priority) / 256;

export function phases(c: Config): Phase[] {
  const t = TERMS[c.protocol];
  // higher priority wins; a tie goes to the higher interface IP (R2 = .3)
  const first: Router = c.p1 > c.p2 ? 'R1' : 'R2';
  const second: Router = first === 'R1' ? 'R2' : 'R1';
  const base = { R1: c.p1, R2: c.p2 };
  const allUp = { R1: true, R2: true };
  const hold = c.protocol === 'hsrp' ? 10 : Number(masterDown(base[second]).toFixed(3));
  const out: Phase[] = [];
  const push = (p: Partial<Phase> & Pick<Phase, 'title' | 'body' | 'tone'>) => out.push({ forwarder: first, prio: base, up: allUp, wan: allUp, reachable: true, ...p });

  push({
    title: `เลือก ${t.active}: ${first}`,
    body:
      c.p1 === c.p2
        ? `priority เท่ากัน (${c.p1}) จึงตัดสินด้วย IP ของ interface ที่สูงกว่า: R2 (${IP.R2}) ชนะ R1 (${IP.R1}) ${second} เป็น ${t.standby}`
        : `router ที่ priority สูงกว่าได้เป็น ${t.active}: ${first} (${base[first]}) ชนะ ${second} (${base[second]}) ซึ่งเป็น ${t.standby} (default priority คือ 100)`,
    tone: 'active',
  });
  push({
    title: `ทำงานปกติ: ${first} ส่ง ${t.hello} เป็นระยะ`,
    body:
      c.protocol === 'hsrp'
        ? `${first} ตอบ ARP ของ Virtual IP ${VIP} ด้วย Virtual MAC ${t.mac} และ forward traffic ของ client ทั้งสองตัวส่ง Hello ทุก 3 วินาทีไปที่ ${t.mcast} ถ้า ${second} ไม่ได้ยิน Hello ครบ hold time 10 วินาที จะถือว่า Active ล่ม`
        : `${first} ตอบ ARP ของ Virtual IP ${VIP} ด้วย Virtual MAC ${t.mac} และส่ง Advertisement ทุก 1 วินาทีไปที่ ${t.mcast} ${second} คอยฟังอยู่ ถ้าเงียบเกิน Master Down Interval จะขึ้นแทน`,
    tone: 'done',
  });

  if (c.scenario === 'fail') {
    const down = { ...allUp, [first]: false };
    push({ title: `${first} ล่ม: ${t.hello} หยุด`, body: `client ยังส่ง frame ไปที่ Virtual MAC เดิม แต่ไม่มี router ตัวใด forward ให้ ${second} ยังไม่รู้ว่า ${first} ล่ม ต้องรอ timer ก่อน`, tone: 'error', forwarder: null, up: down, wan: down, reachable: false });
    push({
      title: `ผ่านไป ${hold} วินาที: ${second} ขึ้นเป็น ${t.active}`,
      body:
        c.protocol === 'hsrp'
          ? `hold timer 10 วินาทีหมดโดยไม่ได้ยิน Hello ${second} จึงเปลี่ยนจาก Standby เป็น Active เวลาที่เครือข่ายขาดช่วง (convergence time) ของ HSRP ค่า default จึงราว 10 วินาที ปรับให้เร็วขึ้นได้ด้วย standby 1 timers 1 4`
          : `Master_Down_Interval = 3 × Advertisement_Interval + Skew_Time โดย Skew_Time = (256 − Priority) ÷ 256 = (256 − ${base[second]}) ÷ 256 = ${Number(((256 - base[second]) / 256).toFixed(3))} → 3 × 1 + ${Number(((256 - base[second]) / 256).toFixed(3))} = ${hold} วินาที Backup ที่ priority สูงกว่ามี skew สั้นกว่า จึงขึ้นก่อนตัวอื่น`,
      tone: 'waiting',
      forwarder: second,
      up: down,
      wan: down,
    });
    push({ title: `${second} ส่ง Gratuitous ARP`, body: `Gratuitous ARP ทำให้ switch แก้ MAC address table ว่า Virtual MAC ${t.mac} ย้ายมาอยู่พอร์ตของ ${second} แล้ว ฝั่ง client ไม่ต้องทำอะไร: Virtual IP และ Virtual MAC ไม่เปลี่ยน จึงไม่ต้อง ARP ใหม่หรือล้าง ARP cache ping ต่อเนื่องจะหายแค่ไม่กี่ครั้ง`, tone: 'done', forwarder: second, up: down, wan: down });
    const takeBack = c.preempt && base[first] > base[second];
    push(
      takeBack
        ? { title: `${first} กลับมา และยึด ${t.active} คืน (preempt เปิด)`, body: `${first} มี priority ${base[first]} สูงกว่า ${second} (${base[second]}) และเปิด preempt จึงยึดบทบาทคืน ${second} กลับเป็น ${t.standby} ในทางปฏิบัติควรตั้ง preempt delay เพื่อรอให้ routing ของ ${first} พร้อมก่อน`, tone: 'active' }
        : {
            title: `${first} กลับมา แต่เป็น ${t.standby}`,
            body: !c.preempt
              ? `preempt ปิดอยู่ ${first} จึงไม่แย่งบทบาทแม้ priority จะสูงกว่า ${second} ยังเป็น ${t.active} ต่อไป${c.protocol === 'hsrp' ? ' (HSRP ปิด preempt เป็นค่า default ต้องสั่ง standby 1 preempt เอง)' : ' (VRRP เปิด preempt เป็นค่า default กรณีนี้คือถูกปิดเอง)'}`
              : `แม้เปิด preempt แต่ ${first} ไม่ได้มี priority สูงกว่า ${second} จึงไม่มีสิทธิ์ยึด`,
            tone: 'waiting',
            forwarder: second,
          },
    );
    return out;
  }

  const wan = { ...allUp, [first]: false };
  if (c.decrement === 0) {
    push({ title: `WAN ของ ${first} ขาด แต่ ${first} ยังเป็น ${t.active}`, body: `interface ฝั่ง LAN ยังปกติ ${first} จึงยังส่ง ${t.hello} ได้ และ ${second} ไม่มีเหตุให้ขึ้นแทน client ยังส่ง traffic มาที่ ${first} ซึ่งไม่มีทางออก → packet ถูกทิ้งทั้งหมด (blackhole) FHRP ดูแค่ว่า router ยังอยู่ ไม่ได้ดูว่า router ส่งต่อได้หรือไม่ ต้องใช้ interface tracking`, tone: 'error', wan, reachable: false });
    return out;
  }
  const lowered = { ...base, [first]: base[first] - c.decrement };
  push({ title: `WAN ของ ${first} ขาด: tracking ลด priority ${base[first]} − ${c.decrement} = ${lowered[first]}`, body: `track 1 interface ... line-protocol ตรวจพบว่า uplink ล่ม และ standby 10 track 1 decrement ${c.decrement} ลด priority ของ ${first} ลงทันที ${t.hello} ถัดไปของ ${first} จึงประกาศ priority ${lowered[first]}`, tone: 'waiting', prio: lowered, wan, reachable: false });
  const lower = lowered[first] < base[second];
  if (lower && c.preempt)
    push({ title: `${second} (priority ${base[second]}) ยึด ${t.active}`, body: `${lowered[first]} < ${base[second]} และ ${second} เปิด preempt จึงขึ้นเป็น ${t.active} แทน แล้วส่ง Gratuitous ARP traffic ของ client ออกทาง WAN ของ ${second} ได้ ค่า decrement ต้องมากพอให้ priority ตกลงต่ำกว่าอีกตัว`, tone: 'done', forwarder: second, prio: lowered, wan });
  else
    push({
      title: `${first} ยังเป็น ${t.active} → blackhole`,
      body: lower ? `priority ของ ${first} (${lowered[first]}) ต่ำกว่า ${second} (${base[second]}) แล้ว แต่ ${second} ไม่ได้เปิด preempt จึงไม่ยึดบทบาทจาก ${t.active} ที่ยังทำงานอยู่ tracking จะได้ผลต้องเปิด preempt ด้วย` : `priority หลังลด (${lowered[first]}) ยังไม่ต่ำกว่า ${second} (${base[second]}) decrement น้อยเกินไป ${first} จึงยังเป็น ${t.active} และ traffic ยังถูกทิ้ง`,
      tone: 'error',
      prio: lowered,
      wan,
      reachable: false,
    });
  return out;
}

export interface State {
  config: Config;
  phases: readonly Phase[];
  i: number;
}
export const init = (config: Config): State => ({ config, phases: phases(config), i: 0 });
export const isDone = (s: State) => s.i >= s.phases.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
