// Router-on-a-Stick and an extended ACL on a sub-interface: docs/IST/มาตรฐานและเทคโนโลยีเครือข่าย (2).pdf p.5–16.

export type HostId = 'staff' | 'server' | 'kali';
export type Service = 'icmp' | 'http' | 'https' | 'ssh';

export const HOSTS: Record<HostId, { label: string; vlan: number; ip: string; net: string; gw: string }> = {
  staff: { label: 'Staff PC', vlan: 10, ip: '192.168.10.50', net: '192.168.10.0/24', gw: '192.168.10.1' },
  server: { label: 'Web Server', vlan: 20, ip: '192.168.20.100', net: '192.168.20.0/24', gw: '192.168.20.1' },
  kali: { label: 'Kali', vlan: 99, ip: '192.168.99.10', net: '192.168.99.0/24', gw: '192.168.99.1' },
};
export const SERVICES: Record<Service, string> = { icmp: 'ICMP (ping)', http: 'TCP 80', https: 'TCP 443', ssh: 'TCP 22' };

/** The slide's policy: VLAN 10 may reach the web server on TCP 80/443 only; applied `in` on Gi0/0/0.10. */
export const ACL = [
  'ip access-list extended STAFF_TO_SERVER',
  ' permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.100 eq 80',
  ' permit tcp 192.168.10.0 0.0.0.255 host 192.168.20.100 eq 443',
  ' deny ip 192.168.10.0 0.0.0.255 192.168.20.0 0.0.0.255',
  ' permit ip any any',
  'interface GigabitEthernet0/0/0.10',
  ' ip access-group STAFF_TO_SERVER in',
];

export interface Config {
  src: HostId;
  dst: HostId;
  service: Service;
  acl: boolean;
}

export interface Stage {
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  /** 0 source host, 1 switch, 2 trunk up, 3 router, 4 trunk down, 5 switch, 6 destination */
  at: number;
  tag: number | null;
  /** ACL line that matched (index into ACL). */
  aclLine?: number;
  /** Sub-interface highlighted in the routing table. */
  sub?: number;
}

function aclMatch(c: Config): { line: number; permit: boolean } {
  const toServerNet = HOSTS[c.dst].vlan === 20;
  if (c.dst === 'server' && c.service === 'http') return { line: 1, permit: true };
  if (c.dst === 'server' && c.service === 'https') return { line: 2, permit: true };
  if (toServerNet) return { line: 3, permit: false };
  return { line: 4, permit: true };
}

export function stages(c: Config): Stage[] {
  const s = HOSTS[c.src];
  const d = HOSTS[c.dst];
  const out: Stage[] = [
    {
      title: `${s.label} ส่ง packet ไปที่ default gateway`,
      body: `ปลายทาง ${d.ip} อยู่คนละ subnet กับ ${s.ip} (${s.net}) host จึงส่ง frame ไปยัง MAC ของ default gateway ${s.gw} ไม่ได้ส่งถึงปลายทางตรง ๆ frame ยังไม่มี tag เพราะ host ต่ออยู่กับ access port`,
      tone: 'active',
      at: 0,
      tag: null,
    },
    {
      title: `Switch ใส่ tag VLAN ${s.vlan} แล้วส่งขึ้น trunk`,
      body: `access port อยู่ใน VLAN ${s.vlan} switch จึงรู้ว่า frame เป็นของ VLAN นี้ และ MAC ของ gateway อยู่ทางพอร์ต trunk ที่ต่อกับ router จึงแทรก 802.1Q tag (VID ${s.vlan}) แล้วส่งออก trunk`,
      tone: 'active',
      at: 2,
      tag: s.vlan,
    },
    {
      title: `Router อ่าน VID ${s.vlan} → ส่งเข้า sub-interface Gi0/0/0.${s.vlan}`,
      body: `physical interface Gi0/0/0 ไม่มี IP มีแต่ sub-interface router อ่าน VID แล้วส่ง frame ให้ sub-interface ที่ตั้ง encapsulation dot1Q ${s.vlan} ไว้ จากนั้นลอก tag และ L2 header ออก เหลือ IP packet`,
      tone: 'active',
      at: 3,
      tag: null,
      sub: s.vlan,
    },
  ];

  if (c.acl && c.src === 'staff') {
    const m = aclMatch(c);
    if (!m.permit) {
      out.push({
        title: 'ACL ขาเข้าบน Gi0/0/0.10: deny → ทิ้ง packet',
        body: `ACL ตรวจทีละบรรทัดจากบนลงล่าง ${SERVICES[c.service]} ไปยัง ${d.ip} ไม่ตรงกับบรรทัด permit ของ TCP 80 และ 443 จึงตกที่ deny ip จาก VLAN 10 ไป VLAN 20 packet ถูกทิ้งตั้งแต่รับเข้า โดย router ยังไม่ต้องเปิด routing table เลย (เหตุผลที่ผูกทิศ in บน sub-interface ต้นทาง) ถ้าสแกนด้วย nmap จะเห็นสถานะ filtered`,
        tone: 'error',
        at: 3,
        tag: null,
        aclLine: m.line,
        sub: s.vlan,
      });
      return out;
    }
    out.push({
      title: 'ACL ขาเข้าบน Gi0/0/0.10: permit',
      body: m.line === 4 ? `ปลายทาง ${d.ip} ไม่ได้อยู่ใน VLAN 20 จึงไม่ตรงกับสามบรรทัดแรก และผ่านด้วย permit ip any any บรรทัดสุดท้าย (ถ้าไม่มีบรรทัดนี้ จะถูก implicit deny ท้าย ACL ทิ้งทั้งหมด)` : `${SERVICES[c.service]} ไปยัง web server ตรงกับบรรทัด permit จึงผ่าน เมื่อเจอบรรทัดที่ตรงแล้ว ACL หยุดตรวจทันที`,
      tone: 'active',
      at: 3,
      tag: null,
      aclLine: m.line,
      sub: s.vlan,
    });
  } else if (c.acl) {
    out.push({
      title: `ไม่มี ACL บน Gi0/0/0.${s.vlan}`,
      body: `ACL ถูกผูกไว้เฉพาะขาเข้าของ Gi0/0/0.10 packet ที่เข้ามาทาง sub-interface อื่นจึงไม่ถูกตรวจ นี่คือเหตุผลที่ Kali ใน VLAN 99 ยัง ping หรือสแกน server ได้ ถ้าต้องการกันด้วยต้องผูก ACL เพิ่ม`,
      tone: 'waiting',
      at: 3,
      tag: null,
      sub: s.vlan,
    });
  }

  out.push({
    title: `Routing table: ${d.net} ต่อตรงที่ Gi0/0/0.${d.vlan}`,
    body: `router หาเส้นทางของ ${d.ip} พบรายการ C (connected) ${d.net} ทาง sub-interface Gi0/0/0.${d.vlan} ไม่ต้องมี routing protocol เพราะทุก VLAN ต่อตรงกับ router อยู่แล้ว`,
    tone: 'active',
    at: 3,
    tag: null,
    sub: d.vlan,
  });
  out.push({
    title: `Router ใส่ tag VLAN ${d.vlan} แล้วส่งกลับลง trunk เส้นเดิม`,
    body: `router ห่อ packet ด้วย L2 header ใหม่ (Source MAC เป็นของ router, Destination MAC เป็นของ ${d.label}) และใส่ 802.1Q tag VID ${d.vlan} แล้วส่งออกทาง physical interface เดิม traffic จึงวิ่งบน trunk สองรอบ (hairpinning): ส่งข้าม VLAN 1 Gbps กิน trunk 2 Gbps`,
    tone: 'active',
    at: 4,
    tag: d.vlan,
    sub: d.vlan,
  });
  out.push({
    title: `Switch ลอก tag แล้วส่งให้ ${d.label}`,
    body: `switch อ่าน VID ${d.vlan} หา MAC ปลายทางในตารางของ VLAN ${d.vlan} แล้วส่งออก access port โดยลอก tag ออก ${d.label} ได้รับ frame ธรรมดา การข้าม VLAN สำเร็จผ่าน Layer 3`,
    tone: 'done',
    at: 6,
    tag: null,
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
