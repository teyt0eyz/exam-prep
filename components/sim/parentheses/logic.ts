// Parentheses checking with a stack, as in docs/OOD/STACK_5 (1).pdf p.16–23.

export const OPEN = '{([';
export const CLOSE = '})]';
export const MAX_LENGTH = 16;

export type ParenResult = 'ok' | 'mismatch' | 'extraClose' | 'extraOpen';

export type ParenEvent =
  | { kind: 'init' }
  | { kind: 'push'; token: string }
  | { kind: 'match'; token: string; popped: string }
  | { kind: 'mismatch'; token: string; popped: string; expected: string }
  | { kind: 'extraClose'; token: string }
  | { kind: 'skip'; token: string }
  | { kind: 'endOk' }
  | { kind: 'endExtraOpen'; left: number };

export interface ParenState {
  text: string;
  /** Index of the next character to read. */
  i: number;
  /** Bottom first; the top is the last item. */
  stack: readonly string[];
  event: ParenEvent;
  /** Set once checkParentheses has returned. */
  result: ParenResult | null;
}

export function initParen(text: string): ParenState {
  return { text, i: 0, stack: [], event: { kind: 'init' }, result: null };
}

export const isDone = (s: ParenState) => s.result !== null;

/** Pure: reads one character, or does the final isEmpty() check after the last one. */
export function step(s: ParenState): ParenState {
  if (s.result !== null) return s;

  if (s.i >= s.text.length) {
    return s.stack.length === 0
      ? { ...s, event: { kind: 'endOk' }, result: 'ok' }
      : { ...s, event: { kind: 'endExtraOpen', left: s.stack.length }, result: 'extraOpen' };
  }

  const token = s.text[s.i] as string;
  const next = { ...s, i: s.i + 1 };

  if (OPEN.includes(token)) return { ...next, stack: [...s.stack, token], event: { kind: 'push', token } };

  const k = CLOSE.indexOf(token);
  if (k < 0) return { ...next, event: { kind: 'skip', token } };

  const popped = s.stack.at(-1);
  if (popped === undefined) return { ...next, event: { kind: 'extraClose', token }, result: 'extraClose' };

  const stack = s.stack.slice(0, -1);
  const expected = OPEN[k] as string;
  return popped === expected
    ? { ...next, stack, event: { kind: 'match', token, popped } }
    : { ...next, stack, event: { kind: 'mismatch', token, popped, expected }, result: 'mismatch' };
}

export function validate(text: string): string | null {
  if (text.length === 0) return 'ใส่อย่างน้อย 1 ตัวอักษร เช่น ({[]})';
  if (text.length > MAX_LENGTH) return `ใส่ได้ไม่เกิน ${MAX_LENGTH} ตัวอักษร`;
  if (/\s/.test(text)) return 'ไม่ต้องเว้นวรรค';
  return null;
}

/** checkParentheses from STACK_5 p.23. */
export const CODE = [
  'public static boolean checkParentheses(String t) {',
  '  String open = "{([", close = "})]";',
  '  Stack s = new ArrayStack(100);',
  '  for (int i = 0; i < t.length(); i++) {',
  '    String token = t.substring(i, i + 1);',
  '    if (open.indexOf(token) >= 0) {',
  '      s.push(token);',
  '    } else {',
  '      int k = close.indexOf(token);',
  '      if (k >= 0)',
  '        if (s.isEmpty() ||',
  '            !open.substring(k, k + 1).equals(s.pop()))',
  '          return false;',
  '    }',
  '  }',
  '  return s.isEmpty();',
  '}',
] as const;

export function activeLines(event: ParenEvent): number[] {
  switch (event.kind) {
    case 'init':
      return [1, 2];
    case 'push':
      return [5, 6];
    case 'match':
      return [8, 9, 10, 11];
    case 'mismatch':
      return [11, 12];
    case 'extraClose':
      return [10, 12];
    case 'skip':
      return [8, 9];
    case 'endOk':
    case 'endExtraOpen':
      return [15];
  }
}
