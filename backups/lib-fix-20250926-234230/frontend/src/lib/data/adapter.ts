import type { Time } from 'lightweight-charts'

export type Candle = {
  time: Time
  open: number
  high: number
  low: number
  close: number
  volume: number
}

export type ProviderKind = 'mock' | 'http' | 'ws'

type Listener = (ev: { type: 'snapshot' | 'update'; candles: Candle[] }) => void

export class MarketDataAdapter {
  private symbol: string
  private timeframe: string
  private provider: ProviderKind
  private candles: Candle[] = []
  private listeners: Listener[] = []
  private ws?: WebSocket | null
  private pollTimer?: any

  constructor(opts?: { symbol?: string; timeframe?: string; provider?: ProviderKind }) {
    this.symbol = opts?.symbol || (process.env.NEXT_PUBLIC_SYMBOL || 'BTCUSDT')
    this.timeframe = opts?.timeframe || (process.env.NEXT_PUBLIC_TIMEFRAME || '1h')
    this.provider = (opts?.provider || (process.env.NEXT_PUBLIC_DATA_PROVIDER as ProviderKind) || 'mock')
  }

  on(cb: Listener) {
    this.listeners.push(cb)
    return () => { this.listeners = this.listeners.filter(l => l !== cb) }
  }

  private emit(type: 'snapshot'|'update') {
    const c = this.candles
    this.listeners.forEach(l => l({ type, candles: c }))
  }

  setSymbol(sym: string) {
    this.symbol = sym
  }

  setTimeframe(tf: string) {
    this.timeframe = tf
  }

  stop() {
    if (this.pollTimer) { clearInterval(this.pollTimer); this.pollTimer = undefined }
    if (this.ws) { try { this.ws.close() } catch {} ; this.ws = null }
  }

  async start() {
    this.stop()
    if (this.provider === 'mock') {
      this.candles = genMock(this.timeframe, 600)
      this.emit('snapshot')
      // mock live updates
      this.pollTimer = setInterval(() => {
        const next = mockNext(this.candles)
        this.candles = next
        this.emit('update')
      }, 1000)
      return
    }

    if (this.provider === 'http') {
      const url = process.env.NEXT_PUBLIC_CANDLES_URL
      if (!url) {
        console.warn('NEXT_PUBLIC_CANDLES_URL not set; falling back to mock.')
        this.provider = 'mock'
        return this.start()
      }
      try {
        const res = await fetch(applyQuery(url, { symbol: this.symbol, tf: this.timeframe, limit: 1000 }))
        const raw = await res.json()
        this.candles = normalizeCandles(raw)
        this.emit('snapshot')
      } catch (e) {
        console.error('HTTP provider failed; falling back to mock.', e)
        this.provider = 'mock'
        return this.start()
      }
      // light polling for new bar every timeframe step
      const intervalMs = tfToMs(this.timeframe)
      this.pollTimer = setInterval(async () => {
        try {
          const res = await fetch(applyQuery(url, { symbol: this.symbol, tf: this.timeframe, limit: 2 }))
          const raw = await res.json()
          const latest = normalizeCandles(raw)
          if (latest.length) {
            this.mergeLatest(latest[latest.length - 1])
          }
        } catch {}
      }, Math.max(5_000, intervalMs / 4))
      return
    }

    if (this.provider === 'ws') {
      const stream = process.env.NEXT_PUBLIC_STREAM_URL
      if (!stream) {
        console.warn('NEXT_PUBLIC_STREAM_URL not set; falling back to mock.')
        this.provider = 'mock'
        return this.start()
      }
      // make a one-time bootstrap from HTTP if available, else start from empty
      try {
        const url = process.env.NEXT_PUBLIC_CANDLES_URL
        if (url) {
          const res = await fetch(applyQuery(url, { symbol: this.symbol, tf: this.timeframe, limit: 600 }))
          const raw = await res.json()
          this.candles = normalizeCandles(raw)
          this.emit('snapshot')
        } else {
          this.candles = []
          this.emit('snapshot')
        }
      } catch {
        this.candles = []; this.emit('snapshot')
      }
      this.ws = new WebSocket(applyQuery(stream, { symbol: this.symbol, tf: this.timeframe }))
      this.ws.onmessage = (m) => {
        try {
          const obj = JSON.parse(m.data as any)
          const c = normalizeCandle(obj)
          if (c) {
            this.mergeLatest(c)
          }
        } catch {}
      }
      this.ws.onopen = () => console.log('WS connected')
      this.ws.onclose = () => console.log('WS closed')
      this.ws.onerror = (e) => console.log('WS error', e)
    }
  }

  private mergeLatest(latest: Candle) {
    const cur = this.candles
    if (!cur.length) { this.candles = [latest]; this.emit('update'); return }
    const last = cur[cur.length - 1]
    const lastTs = asSec(last.time)
    const latestTs = asSec(latest.time)
    if (latestTs === lastTs) {
      // in-progress candle update
      cur[cur.length - 1] = { ...last, ...latest, high: Math.max(last.high, latest.high), low: Math.min(last.low, latest.low) }
      this.emit('update')
    } else if (latestTs > lastTs) {
      cur.push(latest)
      // keep memory bounded
      if (cur.length > 2000) cur.splice(0, cur.length - 2000)
      this.emit('update')
    }
  }

  getCandles() { return this.candles }
}

/** Helpers */

function asSec(t: Time): number {
  if (typeof t === 'number') return t
  if (typeof (t as any) === 'string') return Number(t)
  const bd = t as any
  if (bd?.day) {
    // business day -> approximate to midnight
    const d = new Date(Date.UTC(bd.year, (bd.month||1)-1, bd.day))
    return Math.floor(d.getTime()/1000)
  }
  return 0
}

function applyQuery(url: string, params: Record<string, any>): string {
  const u = new URL(url, typeof window !== 'undefined' ? window.location.href : 'http://localhost')
  for (const [k,v] of Object.entries(params)) if (v != null && v !== '') u.searchParams.set(k, String(v))
  return u.toString()
}

function normalizeCandles(arr: any[]): Candle[] {
  return Array.isArray(arr) ? arr.map(normalizeCandle).filter(Boolean) as Candle[] : []
}

function normalizeCandle(obj: any): Candle | null {
  if (!obj) return null
  const t = (obj.time ?? obj.t ?? obj[0])
  const open  = toNum(obj.open ?? obj.o ?? obj[1])
  const high  = toNum(obj.high ?? obj.h ?? obj[2])
  const low   = toNum(obj.low  ?? obj.l ?? obj[3])
  const close = toNum(obj.close?? obj.c ?? obj[4])
  const vol   = toNum(obj.volume?? obj.v ?? obj[5] ?? 0)
  if (t == null || [open,high,low,close].some(n => typeof n !== 'number' || Number.isNaN(n))) return null
  const time = typeof t === 'number' && t > 10_000_000_000 ? Math.floor(t/1000) : t
  return { time, open, high, low, close, volume: vol }
}

function toNum(x: any) { const n = typeof x === 'string' ? parseFloat(x) : x; return typeof n === 'number' ? n : NaN }

function tfToMs(tf: string): number {
  const m = tf.match(/^(\d+)([mhdw])$/i)
  if (!m) return 60*60*1000
  const n = parseInt(m[1], 10)
  const k = m[2].toLowerCase()
  switch (k) {
    case 'm': return n * 60_000
    case 'h': return n * 3_600_000
    case 'd': return n * 86_400_000
    case 'w': return n * 604_800_000
    default: return 3_600_000
  }
}

/** Mock generator */

function genMock(tf: string, n: number): Candle[] {
  const step = Math.floor(tfToMs(tf)/1000) // seconds
  const now = Math.floor(Date.now()/1000)
  let t = now - n*step
  let p = 100 + Math.random()*20
  const out: Candle[] = []
  for (let i=0;i<n;i++){
    const drift = (Math.random()-0.5)*2
    const vol = Math.max(1, Math.round(100*Math.random()))
    const open = p
    const high = open + Math.abs(drift)*2 + Math.random()*1.5
    const low  = open - Math.abs(drift)*2 - Math.random()*1.5
    const close = Math.max(low, Math.min(high, open + drift))
    p = close
    out.push({ time: t, open, high, low, close, volume: vol })
    t += step
  }
  return out
}

function mockNext(prev: Candle[]): Candle[] {
  if (!prev.length) return genMock('1h', 2)
  const step = asSec(prev[prev.length-1].time) - asSec(prev[Math.max(0, prev.length-2)].time) || 3600
  const last = prev[prev.length - 1]
  const nowSec = Math.floor(Date.now()/1000)
  const shouldClose = nowSec >= asSec(last.time) + step
  if (shouldClose) {
    // close bar, open next
    const open = last.close
    const drift = (Math.random()-0.5)*2
    const high = open + Math.abs(drift)*2 + Math.random()
    const low  = open - Math.abs(drift)*2 - Math.random()
    const close = Math.max(low, Math.min(high, open + drift))
    const next: Candle = { time: asSec(last.time)+step, open, high, low, close, volume: Math.max(1, Math.round(100*Math.random())) }
    return [...prev, next].slice(-2000)
  } else {
    // update in-progress bar
    const drift = (Math.random()-0.5)*1.2
    const high = Math.max(last.high, last.close + Math.abs(drift))
    const low  = Math.min(last.low,  last.close - Math.abs(drift))
    const close = Math.max(low, Math.min(high, last.close + drift))
    const upd: Candle = { ...last, high, low, close, volume: last.volume + Math.round(50*Math.random()) }
    const copy = prev.slice()
    copy[copy.length-1] = upd
    return copy
  }
}
