import { CubeDaily, ChallengeError } from './daily';
import { challengeNo, cleanName, isDay, isDevice, kstDay, parseMoves } from './cube';
import { HttpError, json, readJson } from './http';
import { withoutPrefix } from './routing';

export { CubeDaily };

export interface Env {
  DAILY: DurableObjectNamespace<CubeDaily>;
  ALLOWED_ORIGINS?: string;
}

export function isAllowedOrigin(origin: string, env: Env): boolean {
  const allowed = (env.ALLOWED_ORIGINS ?? '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
  return allowed.some(
    (entry) =>
      origin === entry ||
      ((entry.endsWith('://localhost') || entry.endsWith('://127.0.0.1')) && origin.startsWith(`${entry}:`)),
  );
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  if (!origin || !isAllowedOrigin(origin, env)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
    'Access-Control-Allow-Headers': 'Content-Type',
    'Access-Control-Max-Age': '86400',
    Vary: 'Origin',
  };
}

function checkOrigin(request: Request, env: Env): void {
  const origin = request.headers.get('Origin');
  if (origin && !isAllowedOrigin(origin, env)) throw new HttpError(403, '허용되지 않은 주소예요');
}

const day = (env: Env, d: string) => env.DAILY.get(env.DAILY.idFromName(d));

function device(v: unknown): string {
  if (!isDevice(v)) throw new HttpError(400, '기기 정보가 올바르지 않아요');
  return v;
}

async function route(request: Request, env: Env, now: number): Promise<Response> {
  const url = new URL(request.url);
  const key = `${request.method} ${url.pathname.replace(/\/+$/, '')}`;
  const today = kstDay(now);
  switch (key) {
    case 'GET /api/health':
      return json({ ok: true, day: today });

    // 오늘의 챌린지 상태 (섞기는 시작할 때만 알려 준다)
    case 'GET /api/challenge/today': {
      const dev = device(url.searchParams.get('device'));
      const status = await day(env, today).status(today, dev);
      return json({ ...status, no: challengeNo(today), now });
    }
    case 'POST /api/challenge/start': {
      checkOrigin(request, env);
      const dev = device((await readJson(request)).device);
      const r = await day(env, today).start(today, dev, now);
      return json({ ...r, no: challengeNo(today) });
    }
    case 'POST /api/challenge/bonus': {
      checkOrigin(request, env);
      const dev = device((await readJson(request)).device);
      return json(await day(env, today).bonus(today, dev));
    }
    case 'POST /api/challenge/giveup': {
      checkOrigin(request, env);
      const dev = device((await readJson(request)).device);
      return json(await day(env, today).giveUp(today, dev));
    }
    case 'POST /api/challenge/submit': {
      checkOrigin(request, env);
      const body = await readJson(request);
      const dev = device(body.device);
      const runId = typeof body.runId === 'string' ? body.runId : '';
      const runDay = runId.split('.')[0];
      if (!isDay(runDay) || !/^\d{4}-\d{2}-\d{2}\.[a-f0-9]{16}$/.test(runId)) throw new HttpError(400, '도전 정보가 올바르지 않아요');
      const name = cleanName(body.name);
      if (!name) throw new HttpError(400, '이니셜은 영문 3글자로 넣어 주세요');
      const moves = parseMoves(body.moves);
      if (!moves) throw new HttpError(400, '이동 기록이 올바르지 않아요');
      const ms = Number(body.ms);
      const r = await day(env, runDay).submit(runDay, dev, runId, name, ms, moves, now);
      return json({ ...r, day: runDay });
    }
    case 'GET /api/challenge/ranking': {
      const dev = device(url.searchParams.get('device'));
      const d = url.searchParams.get('day') || today;
      if (!isDay(d)) throw new HttpError(400, '날짜가 올바르지 않아요');
      return json({ day: d, no: challengeNo(d), ...(await day(env, d).ranking(dev)) });
    }
    default:
      throw new HttpError(404, '없는 주소예요');
  }
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    // api.ohsangplay.com/cube/… 로 들어오면 /cube를 떼고 처리한다.
    request = withoutPrefix(request);
    const cors = corsHeaders(request, env);
    if (request.method === 'OPTIONS') return new Response(null, { status: 204, headers: cors });
    let response: Response;
    try {
      response = await route(request, env, Date.now());
    } catch (err) {
      if (err instanceof HttpError || err instanceof ChallengeError) response = json({ error: err.message }, err.status);
      else if (err instanceof Error && /^(도전|오늘|이미|큐브|시간)/.test(err.message)) {
        // Durable Object에서 던진 오류는 RPC를 건너오며 일반 Error가 된다
        response = json({ error: err.message }, 400);
      } else {
        console.error(err);
        response = json({ error: '잠시 후 다시 시도해 주세요' }, 500);
      }
    }
    for (const [k, v] of Object.entries(cors)) response.headers.set(k, v);
    return response;
  },
} satisfies ExportedHandler<Env>;
