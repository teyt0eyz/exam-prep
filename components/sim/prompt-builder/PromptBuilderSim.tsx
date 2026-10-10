'use client';

import { useMemo } from 'react';
import { PresetBar, SimTextInput, SimulationPlayer, useParsedText, type SimExplanation, type SimTone } from '@/components/sim/core';
import { PARTS, PART_LABEL, RATIO_USE, init, isDone, parseBrief, promptText, risks, step, type Part, type State } from './logic';

const lines = (o: Partial<Record<Part, string>>) => PARTS.filter((p) => o[p]).map((p) => `${PART_LABEL[p].split('/')[0]!.replace('Art ', '')} = ${o[p]}`).join('\n');

const PRESETS = [
  // Nano Banana p.23: the cookie-box example prompt
  {
    label: 'สไลด์ p.23: กล่องขนมคุกกี้',
    value: lines({ subject: 'ภาพถ่ายสินค้า กล่องขนมคุกกี้ วางอยู่บนโต๊ะห้องรับแขก', light: 'แสงแดดอุ่นๆยามเช้าส่องผ่านผ้าม่านโปร่งแสงเข้ามา', mood: 'บรรยากาศดูอบอุ่น ภาพคุณภาพสูง 8k' }),
  },
  // Nano Banana p.27–29: power words, negative prompt, ratio for TikTok
  {
    label: 'ครบสูตร + Ratio สำหรับ TikTok',
    value: lines({ subject: 'ขวดเซรั่มบำรุงผิว วางด้านล่างของภาพ เว้นที่ว่างด้านบน', style: 'Minimal, Hyper-realistic', light: 'Soft Studio Light, Macro shot, Bokeh', mood: 'ดูพรีเมียม สะอาดตา', exclusion: 'ตัวอักษร, นิ้วเกิน, ภาพเบลอ', ratio: '9:16' }),
  },
  // Nano Banana p.12–14: what not to ask for
  { label: 'ตัวอย่างที่เสี่ยงผิดลิขสิทธิ์', value: lines({ subject: 'Mickey Mouse ถือแก้วกาแฟที่มีโลโก้ Starbucks', style: '3D Render', mood: 'สดใส' }) },
];

const WHY: Record<Part, string> = {
  subject: 'Subject คือสิ่งที่จะขาย เป็นส่วนเดียวที่ขาดไม่ได้ ยิ่งบอกตำแหน่งการวางชัด (เช่น ชิดซ้าย เว้นที่ว่างด้านขวา) ยิ่งได้ Negative Space สำหรับใส่ข้อความโปรโมชัน',
  style: 'Art Style กำหนดหน้าตาโดยรวม เช่น 3D Render, Minimal, Pop Art ใช้ชื่อ "แนวศิลปะ" ได้ แต่ไม่ควรใช้ชื่อศิลปินดัง',
  light: 'Lighting/Camera ทำให้ภาพดูแพงและมีมิติ เช่น Cinematic, Golden Hour, Soft Studio Light, Macro shot, 85mm lens, Bokeh (หน้าชัดหลังละลาย)',
  mood: 'Mood บอกอารมณ์ของภาพ ทำให้ AI เลือกโทนสีและบรรยากาศให้เข้ากัน',
  exclusion: 'Exclusion (Negative Prompt) คือการสั่งสิ่งที่ "ไม่เอา" ใส่ไว้ท้ายคำสั่ง ช่วยลดนิ้วเกิน ตาเข ตัวอักษรขยะ (Gibberish) และภาพเบลอ',
  ratio: 'การเจนให้ตรงสัดส่วนของแพลตฟอร์มตั้งแต่แรก ทำให้โพสต์ได้ทันทีโดยไม่ต้อง Crop (Speed to Market) และภาพเต็มจอหยุดสายตาได้ดีกว่า',
};

function Canvas({ state }: { state: State }) {
  const current = state.pc > 0 && !state.checked ? PARTS[state.pc - 1] : null;
  const found = state.checked ? risks(state.brief) : [];
  return (
    <div className="flex flex-col gap-3">
      <ol className="flex flex-wrap items-center gap-1.5 font-mono text-[12px] leading-5">
        {PARTS.map((p, i) => {
          const seen = i < state.pc;
          const used = state.used.includes(p);
          return (
            <li key={p} className="flex items-center gap-1.5">
              {i > 0 ? <span className="text-faint">+</span> : null}
              <span className={`rounded-sm border px-2 py-1 ${p === current ? 'border-accent bg-accent-soft font-semibold text-accent' : used ? 'border-ok bg-ok-soft text-ok' : seen ? 'border-dashed border-line text-faint line-through' : 'border-line bg-surface text-ink'}`}>
                [{PART_LABEL[p]}]
              </span>
            </li>
          );
        })}
      </ol>
      <div className="rounded-md border border-line bg-code px-3 py-2.5">
        <p className="text-[12px] font-medium leading-[18px] text-faint">Prompt ที่จะส่งให้ Gemini</p>
        <p className="mt-1 min-h-[52px] break-words text-[15px] leading-[26px]">
          {state.used.length === 0 ? <span className="text-faint">(ยังว่าง)</span> : null}
          {state.used.map((p) => (
            <span key={p} className={p === current ? 'rounded-sm bg-accent-soft font-semibold text-accent' : ''}>
              {promptText(state.brief, [p])}{' '}
            </span>
          ))}
        </p>
      </div>
      {state.checked ? (
        <ul className="flex flex-col gap-1 px-1 text-[13px] leading-5">
          {found.length === 0 ? <li className="text-ok">✓ ไม่พบคำที่เสี่ยงเรื่องบุคคลดัง ตัวละครมีลิขสิทธิ์ หรือโลโก้แบรนด์ดัง</li> : null}
          {found.map((r) => (
            <li key={r} className="text-bad">✗ {r}</li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

function explain(state: State): SimExplanation {
  if (state.pc === 0) {
    return { title: 'สั่งแบบ Art Director ไม่ใช่แบบ Robot', body: 'Business Prompting Formula คือ [Subject] + [Art Style] + [Lighting/Camera] + [Mood] + [Exclusion] แล้วระบุ Ratio ให้ตรงแพลตฟอร์ม จะต่อ prompt ทีละส่วนให้เห็นว่าแต่ละส่วนเพิ่มอะไรให้ภาพ' };
  }
  if (state.checked) {
    const found = risks(state.brief);
    return found.length === 0
      ? { title: 'Final Check: ผ่าน', body: 'ก่อนโพสต์ให้ตรวจตามเช็คลิสต์เสมอ: ไม่มีหน้าคนดัง ไม่มีตัวละครหรือมาสคอตที่มีเจ้าของ ไม่มีโลโก้แบรนด์ดังติดมา ไม่มีฟอนต์ผิดลิขสิทธิ์ และเป็นงานที่ตกแต่งเพิ่มโดยแบรนด์เราแล้ว' }
      : { title: `Final Check: พบความเสี่ยง ${found.length} ข้อ`, body: 'AI เป็นแค่เครื่องมือ ผู้ใช้งานคือผู้รับผิดชอบทางกฎหมาย ทางออกตามสไลด์: สร้างมาสคอตของแบรนด์เราเอง ใช้นายแบบ/นางแบบทั่วไปที่ไม่อ้างอิงบุคคลจริง และเจนเฉพาะรูปทรงแล้วนำโลโก้ของเราเองมาแปะภายหลัง' };
  }
  const part = PARTS[state.pc - 1]!;
  const value = state.brief[part];
  if (!value) {
    return { title: `ข้าม [${PART_LABEL[part]}]`, body: part === 'ratio' ? 'ไม่ได้ระบุ Ratio ภาพที่ได้อาจต้องนำไป Crop ใหม่ในแอปอื่น ทำให้เสียเวลา' : `ไม่ได้ระบุส่วนนี้ AI จะเลือกให้เอง ผลลัพธ์จึงคุมได้น้อยลง — ${WHY[part]}` };
  }
  const extra = part === 'ratio' ? (RATIO_USE[value] ? ` สัดส่วน ${value} เหมาะกับ ${RATIO_USE[value]}` : ' สัดส่วนที่สไลด์แนะนำคือ 1:1, 9:16, 16:9 และ 4:5') : '';
  return { title: `เพิ่ม [${PART_LABEL[part]}]`, body: `${WHY[part]}${extra}` };
}

function status(state: State): { tone: SimTone; label: string } {
  if (state.pc === 0) return { tone: 'normal', label: 'เริ่มต้น' };
  if (state.checked) return risks(state.brief).length === 0 ? { tone: 'done', label: 'ปลอดภัย' } : { tone: 'error', label: 'เสี่ยงลิขสิทธิ์' };
  const part = PARTS[state.pc - 1]!;
  return state.brief[part] ? { tone: 'active', label: PART_LABEL[part] } : { tone: 'waiting', label: 'ข้าม' };
}
const render = (state: State) => <Canvas state={state} />;

export function PromptBuilderSim() {
  const brief = useParsedText(PRESETS[0]!.value, parseBrief);
  const initialState = useMemo(() => init(brief.value), [brief.value]);
  return (
    <SimulationPlayer
      title="Business Prompting Formula"
      initialState={initialState}
      step={step}
      isDone={isDone}
      render={render}
      explain={explain}
      status={status}
      inputs={
        <div className="flex flex-col gap-3">
          <PresetBar presets={PRESETS} activeIndex={PRESETS.findIndex((p) => p.value === brief.text)} onPick={brief.apply} />
          <SimTextInput label="ส่วนประกอบของ prompt (บรรทัดละ 1 ส่วน)" hint="Subject = … / Style = … / Light = … / Mood = … / Exclusion = … / Ratio = 9:16 (เว้นบางส่วนได้ ยกเว้น Subject)" text={brief.text} error={brief.error} onChange={brief.apply} rows={6} />
        </div>
      }
      legend={
        <>
          <span className="text-accent">สีเน้น = ส่วนที่เพิ่งเพิ่ม</span>
          <span className="text-ok">เขียว = อยู่ใน prompt แล้ว</span>
          <span className="text-faint">ขีดฆ่า = ไม่ได้ระบุ</span>
        </>
      }
    />
  );
}
