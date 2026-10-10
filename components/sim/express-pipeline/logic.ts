// A request travelling through an Express middleware chain: body parser, logger, auth, validation, route, 404.
// Supplementary (no lecturer slides); status codes follow docs/WEB/HTTP for Developer.pdf p.25–26.
import type { Parsed } from '@/components/sim/core/inputs';

export interface Request {
  method: string;
  path: string;
  /** Value of the Authorization header, or '' when absent. */
  auth: string;
  /** Raw body text, or '' when absent. */
  rawBody: string;
}

export const STAGES = ['json', 'logger', 'auth', 'validate', 'route', 'notFound'] as const;
export type Stage = (typeof STAGES)[number];
export const STAGE_CODE: Record<Stage, string> = {
  json: 'app.use(express.json())',
  logger: 'app.use(logger)',
  auth: 'app.use(requireAuth)',
  validate: 'validateUser',
  route: 'route handler',
  notFound: 'app.use(notFound)',
};

export interface Response {
  status: number;
  body: string;
}

export interface State {
  req: Request;
  /** Index into STAGES of the stage that just ran; -1 before the request enters. */
  at: number;
  /** req.body after express.json(), as text; null until parsed. */
  parsed: string | null;
  response: Response | null;
  /** What the stage that just ran decided. */
  note: 'enter' | 'next' | 'skip' | 'respond';
  users: readonly number[];
}

export const TOKEN = 'Bearer secret';
const METHODS = ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'];

/** Lines: "POST /users", optional "Authorization: Bearer secret", optional "body: {...}". */
export function parseRequest(text: string): Parsed<Request> {
  const rows = text.split('\n').map((l) => l.trim()).filter(Boolean);
  const first = rows[0];
  if (!first) return { error: 'บรรทัดแรกต้องเป็น method และ path เช่น GET /users' };
  const [method, path, ...extra] = first.split(/\s+/);
  if (!method || !METHODS.includes(method.toUpperCase())) return { error: `method ต้องเป็น ${METHODS.join(', ')}` };
  if (!path || !path.startsWith('/') || extra.length > 0 || path.length > 24) return { error: 'path ต้องขึ้นต้นด้วย / เช่น /users/1' };
  const req: Request = { method: method.toUpperCase(), path, auth: '', rawBody: '' };
  for (const row of rows.slice(1)) {
    const at = row.indexOf(':');
    const key = at < 0 ? '' : row.slice(0, at).trim().toLowerCase();
    const value = at < 0 ? '' : row.slice(at + 1).trim();
    if (key === 'authorization') req.auth = value;
    else if (key === 'body') req.rawBody = value;
    else return { error: `ไม่รู้จัก "${row.slice(0, 20)}" ใช้ได้: Authorization: … และ body: {…}` };
    if (value.length > 60) return { error: 'แต่ละบรรทัดยาวได้ไม่เกิน 60 ตัวอักษร' };
  }
  return { value: req };
}

export const init = (req: Request): State => ({ req, at: -1, parsed: null, response: null, note: 'enter', users: [1, 2] });
export const isDone = (state: State) => state.response !== null;

const respond = (state: State, at: number, status: number, body: string, extra: Partial<State> = {}): State => ({ ...state, ...extra, at, response: { status, body }, note: 'respond' });
const isWrite = (method: string) => method !== 'GET';

function tryJson(raw: string): { ok: true; value: unknown } | { ok: false } {
  try {
    return { ok: true, value: JSON.parse(raw) };
  } catch {
    return { ok: false };
  }
}

export function step(state: State): State {
  if (state.response) return state;
  const at = state.at + 1;
  const stage = STAGES[at]!;
  const { req } = state;
  const next = (extra: Partial<State> = {}, note: State['note'] = 'next'): State => ({ ...state, ...extra, at, note });
  const match = /^\/users(?:\/(\d+))?$/.exec(req.path);

  switch (stage) {
    case 'json': {
      if (!req.rawBody) return next({ parsed: '{}' }, 'skip');
      const json = tryJson(req.rawBody);
      if (!json.ok) return respond(state, at, 400, '{"message":"Invalid JSON"}');
      return next({ parsed: JSON.stringify(json.value) });
    }
    case 'logger':
      return next();
    case 'auth':
      if (!isWrite(req.method)) return next({}, 'skip');
      if (!req.auth) return respond(state, at, 401, '{"message":"Token required"}');
      if (req.auth !== TOKEN) return respond(state, at, 403, '{"message":"Invalid token"}');
      return next();
    case 'validate': {
      const needsName = match !== null && (req.method === 'POST' || req.method === 'PUT');
      if (!needsName) return next({}, 'skip');
      const body = tryJson(state.parsed ?? '{}');
      const name = body.ok && typeof body.value === 'object' && body.value !== null ? (body.value as { name?: unknown }).name : undefined;
      if (typeof name !== 'string' || name.trim() === '') return respond(state, at, 400, '{"message":"name is required"}');
      return next();
    }
    case 'route': {
      if (!match) return next({}, 'skip');
      const id = match[1] === undefined ? null : Number(match[1]);
      const exists = id !== null && state.users.includes(id);
      if (id === null) {
        if (req.method === 'GET') return respond(state, at, 200, `[${state.users.map((u) => `{"id":${u}}`).join(',')}]`);
        if (req.method === 'POST') {
          const newId = Math.max(0, ...state.users) + 1;
          return respond(state, at, 201, `{"id":${newId}}`, { users: [...state.users, newId] });
        }
        return next({}, 'skip');
      }
      if (!exists) return respond(state, at, 404, '{"message":"User not found"}');
      if (req.method === 'GET') return respond(state, at, 200, `{"id":${id}}`);
      if (req.method === 'DELETE') return respond(state, at, 204, '', { users: state.users.filter((u) => u !== id) });
      if (req.method === 'PUT' || req.method === 'PATCH') return respond(state, at, 200, `{"id":${id}}`);
      return next({}, 'skip');
    }
    default:
      return respond(state, at, 404, '{"message":"Route not found"}');
  }
}
