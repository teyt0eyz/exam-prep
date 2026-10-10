// Life of an HTTP request: docs/WEB/HTTP for Developer.pdf p.19–26, 30–33.
import { type Parsed } from '@/components/sim/core/inputs';

export interface Url {
  protocol: 'http' | 'https';
  host: string;
  path: string;
}
export type Outcome = '200' | '301' | '404' | '500';

export function parseUrl(text: string): Parsed<Url> {
  const m = /^(https?):\/\/([a-z0-9-]+(?:\.[a-z0-9-]+)+)(\/[^\s]*)?$/i.exec(text.trim());
  if (!m) return { error: 'ใส่ URL เต็ม เช่น https://www.example.com/index.html' };
  return { value: { protocol: m[1]!.toLowerCase() as 'http' | 'https', host: m[2]!.toLowerCase(), path: m[3] ?? '/' } };
}

/** A stable made-up address per host (the slides use 3.165.82.61 for www.example.com). */
export function fakeIp(host: string): string {
  if (host === 'www.example.com') return '3.165.82.61';
  let h = 7;
  for (const ch of host) h = (h * 31 + ch.charCodeAt(0)) % 16777216;
  return `${(h >> 16) % 223 || 1}.${(h >> 8) & 255}.${h & 255}.${(h % 253) + 1}`;
}

export interface Stage {
  key: 'url' | 'cache' | 'dns' | 'tcp' | 'request' | 'response' | 'redirect' | 'parse' | 'render' | 'close';
  title: string;
  body: string;
  tone: 'active' | 'waiting' | 'error' | 'done';
  /** Message on the wire at this stage. */
  message?: { label: string; lines: readonly string[]; active: readonly number[] };
}

const STATUS: Record<Outcome, string> = { '200': '200 OK', '301': '301 Moved Permanently', '404': '404 Not Found', '500': '500 Internal Server Error' };

export function stages(url: Url, outcome: Outcome, dnsCached: boolean): Stage[] {
  const port = url.protocol === 'https' ? 443 : 80;
  const ip = fakeIp(url.host);
  const parts = url.host.split('.');
  const tld = parts[parts.length - 1]!;
  const domain = parts.slice(-2).join('.');
  const sub = parts.length > 2 ? parts.slice(0, -2).join('.') : null;
  const request = [`GET ${url.path} HTTP/1.1`, `Host: ${url.host}`, 'Accept-Language: th', ''];

  const out: Stage[] = [
    {
      key: 'url',
      title: 'แยกส่วนของ URL',
      body: `protocol = ${url.protocol}://${sub ? ` · subdomain = ${sub}` : ''} · domain = ${domain} · path = ${url.path} — protocol บอกวิธีคุยและ port เริ่มต้น (${url.protocol.toUpperCase()} ใช้ port ${port}) ส่วน host บอกว่าจะคุยกับเครื่องใด และ path บอกว่าขอ resource ใด`,
      tone: 'active',
    },
    {
      key: 'cache',
      title: dnsCached ? 'browser ตรวจ cache: พบ IP ของ host นี้แล้ว' : 'browser ตรวจ cache: ไม่พบ (cache miss)',
      body: dnsCached ? `browser เคยติดต่อ ${url.host} จึงมี IP address ${ip} อยู่ใน cache ข้ามการทำ DNS lookup ได้` : `browser ตรวจ cache ของตัวเองก่อนเสมอ ครั้งนี้ยังไม่รู้ IP address ของ ${url.host} จึงต้องหาด้วย DNS`,
      tone: dnsCached ? 'done' : 'waiting',
    },
  ];
  if (!dnsCached)
    out.push({
      key: 'dns',
      title: `DNS lookup: ${url.host} → ${ip}`,
      body: `เหมือนเปิดสมุดโทรศัพท์หาเบอร์จากชื่อ คำถามถูกส่งผ่าน DNS server เป็นลำดับ: root → TLD (.${tld}) → authoritative ของ ${domain} จนได้ IP address ${ip} คอมพิวเตอร์ติดต่อกันด้วย IP ไม่ใช่ชื่อ`,
      tone: 'active',
    });
  out.push({
    key: 'tcp',
    title: `เปิด TCP connection ไปที่ ${ip} port ${port}`,
    body: `HTTP เป็น application layer protocol ที่ส่งผ่าน TCP จึงต้องเปิด connection ก่อนด้วย three-way handshake: SYN → SYN-ACK → ACK${url.protocol === 'https' ? ' (HTTPS จะมีการเจรจาเข้ารหัสต่ออีกขั้น เพื่อส่งข้อมูลระหว่าง browser กับ server อย่างปลอดภัย)' : ''}`,
    tone: 'active',
    message: { label: 'TCP three-way handshake', lines: ['client → server : SYN', 'server → client : SYN-ACK', 'client → server : ACK'], active: [0, 1, 2] },
  });
  out.push({
    key: 'request',
    title: 'ส่ง HTTP request message',
    body: `บรรทัดแรกมีสามส่วน: Method (GET) · Path (${url.path}) · Protocol version (HTTP/1.1) ตามด้วย headers (เช่น Host) แล้วปิดด้วยบรรทัดว่าง HTTP เป็น protocol แบบข้อความ (text-based) อ่านได้ด้วยตา`,
    tone: 'active',
    message: { label: 'HTTP request', lines: request, active: [0] },
  });

  const ok = ['HTTP/1.1 200 OK', 'Date: Sat, 09 Oct 2010 14:28:02 GMT', 'Server: Apache', 'Content-Length: 29769', 'Content-Type: text/html', '', '<!doctype html>…'];
  if (outcome === '301') {
    out.push({
      key: 'response',
      title: 'server ตอบ 301: ย้ายไปที่อื่นแล้ว',
      body: 'status code กลุ่ม 3xx คือ Redirection: resource ถูกย้าย server บอกที่อยู่ใหม่มาใน header Location โดยไม่ส่งเนื้อหา',
      tone: 'waiting',
      message: { label: 'HTTP response', lines: [`HTTP/1.1 ${STATUS['301']}`, `Location: ${url.protocol}://${url.host}/new${url.path === '/' ? '' : url.path}`, 'Content-Length: 0', ''], active: [0, 1] },
    });
    out.push({
      key: 'redirect',
      title: 'browser ส่ง request ใหม่ไปยัง Location',
      body: 'browser ทำตาม redirect เองโดยอัตโนมัติ: ส่ง GET อีกครั้งไปยัง URL ใหม่ (ใช้ connection เดิมซ้ำได้เพราะเป็น host เดิม) คราวนี้ server ตอบ 200 OK พร้อมเนื้อหา',
      tone: 'active',
      message: { label: 'HTTP response (ครั้งที่สอง)', lines: ok, active: [0] },
    });
  } else if (outcome === '200') {
    out.push({
      key: 'response',
      title: 'server ตอบ 200 OK พร้อม HTML',
      body: 'บรรทัดแรกมีสามส่วน: Protocol version · Status code (200) · Status message (OK) กลุ่ม 2xx คือ Success ตามด้วย headers: Content-Type บอกว่า body เป็นอะไร (text/html) และ Content-Length บอกขนาด แล้วจึงเป็น body',
      tone: 'done',
      message: { label: 'HTTP response', lines: ok, active: [0, 4] },
    });
  } else {
    const is404 = outcome === '404';
    out.push({
      key: 'response',
      title: `server ตอบ ${STATUS[outcome]}`,
      body: is404
        ? 'กลุ่ม 4xx คือความผิดพลาดฝั่งผู้ขอ: 404 Not Found แปลว่าขอ resource ที่ไม่มีอยู่ (path ผิด) การส่งซ้ำแบบเดิมจะได้ผลเดิม ต้องแก้ที่ URL'
        : 'กลุ่ม 5xx คือ Server Error: request ถูกต้อง แต่ server ทำงานผิดพลาดเอง (500 Internal Server Error) ผู้ใช้แก้เองไม่ได้ ต้องแก้ที่ฝั่ง server',
      tone: 'error',
      message: { label: 'HTTP response', lines: [`HTTP/1.1 ${STATUS[outcome]}`, 'Content-Type: text/html', '', is404 ? '<h1>Not Found</h1>' : '<h1>Server Error</h1>'], active: [0] },
    });
  }

  if (outcome === '200' || outcome === '301') {
    out.push({ key: 'parse', title: 'browser parse HTML → สร้าง DOM และ CSSOM', body: 'browser อ่าน HTML document แล้วสร้างต้นไม้ DOM (จาก HTML) และ CSSOM (จาก CSS) ระหว่างทางถ้าเจอ link ไปยังไฟล์ CSS, JavaScript หรือรูปภาพ ก็ส่ง HTTP request เพิ่มเพื่อขอแต่ละไฟล์', tone: 'active' });
    out.push({ key: 'render', title: 'รัน JavaScript และ render หน้าเว็บ', body: 'browser รัน JavaScript แล้ว render ผ่านขั้นตอน render tree → layout → painting จนหน้าเว็บปรากฏบนจอ', tone: 'done' });
  } else {
    out.push({ key: 'render', title: 'browser แสดงหน้า error', body: 'browser แสดง body ที่ server ส่งมากับ error (หรือหน้า error ของ browser เอง) การรู้กลุ่มของ status code ช่วยบอกได้ทันทีว่าปัญหาอยู่ฝั่งใด', tone: 'error' });
  }
  out.push({ key: 'close', title: 'ปิด connection หรือเก็บไว้ใช้ต่อ', body: 'ขั้นสุดท้ายของ HTTP flow: ปิด TCP connection หรือใช้ซ้ำกับ request ถัดไป HTTP เป็น stateless: request แต่ละครั้งไม่มีความเกี่ยวข้องกันในตัว protocol แม้จะส่งบน connection เดียวกัน (แต่ไม่ใช่ sessionless: ใช้ cookie สร้าง session ได้)', tone: 'done' });
  return out;
}

export interface State {
  stages: readonly Stage[];
  i: number;
}
export const init = (url: Url, outcome: Outcome, dnsCached: boolean): State => ({ stages: stages(url, outcome, dnsCached), i: -1 });
export const isDone = (s: State) => s.i >= s.stages.length - 1;
export const step = (s: State): State => (isDone(s) ? s : { ...s, i: s.i + 1 });
