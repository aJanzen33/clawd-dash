// Turns one frame from scene.ts (an SVG of <g>/<rect> only) into RGBA pixels,
// since the terminal draws an Image, not an Svg. Supports exactly what the scene
// emits: translate/scale transforms, group opacity, and solid #hex fills.

type Mat = { a: number; d: number; e: number; f: number }
type Ctx = { m: Mat; o: number }

const TAG = /<(\/?)(\w+)([^>]*?)\/?>/g
const ATTR = /([\w-]+)="([^"]*)"/g
const STEP = /(translate|scale)\(([^)]*)\)/g

function attrs(src: string): Record<string, string> {
  const out: Record<string, string> = {}
  for (const [, k, v] of src.matchAll(ATTR)) out[k!] = v!
  return out
}

function compose(m: Mat, transform: string | undefined): Mat {
  if (!transform) return m
  let r = m
  for (const [, kind, args] of transform.matchAll(STEP)) {
    const [x = 0, y] = args!.trim().split(/[\s,]+/).map(Number)
    if (kind === 'translate') r = { ...r, e: r.a * x + r.e, f: r.d * (y ?? 0) + r.f }
    else r = { ...r, a: r.a * x, d: r.d * (y ?? x) }
  }
  return r
}

function hex(c: string): [number, number, number] {
  const s = c.replace('#', '')
  const full = s.length === 3 ? s.split('').map(ch => ch + ch).join('') : s
  const n = parseInt(full, 16)
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255]
}

/**
 * Rasterizes `svg` (viewBox 0 0 w h) into RGBA, keeping columns [cropX, w),
 * each art pixel blown up to `scale` x `scale` so the terminal scales crisply.
 */
export function rasterize(svg: string, w: number, h: number, cropX: number, scale: number) {
  const rgb = new Float32Array(w * h * 3)
  const stack: Ctx[] = [{ m: { a: 1, d: 1, e: 0, f: 0 }, o: 1 }]

  for (const [, close, name, rest] of svg.matchAll(TAG)) {
    const top = stack[stack.length - 1]!
    if (name === 'g') {
      if (close) stack.pop()
      else {
        const at = attrs(rest!)
        stack.push({ m: compose(top.m, at.transform), o: top.o * (at.opacity ? Number(at.opacity) : 1) })
      }
      continue
    }
    if (name !== 'rect') continue

    const at = attrs(rest!)
    const x = Number(at.x), y = Number(at.y), rw = Number(at.width), rh = Number(at.height)
    const { a, d, e, f } = top.m
    const xs = [a * x + e, a * (x + rw) + e], ys = [d * y + f, d * (y + rh) + f]
    const x0 = Math.max(0, Math.round(Math.min(...xs))), x1 = Math.min(w, Math.round(Math.max(...xs)))
    const y0 = Math.max(0, Math.round(Math.min(...ys))), y1 = Math.min(h, Math.round(Math.max(...ys)))
    if (x0 >= x1 || y0 >= y1 || top.o <= 0) continue

    const [r, g, b] = hex(at.fill ?? '#000')
    const o = Math.min(1, top.o)
    for (let py = y0; py < y1; py++) {
      for (let px = x0; px < x1; px++) {
        const i = (py * w + px) * 3
        rgb[i] = r * o + rgb[i]! * (1 - o)
        rgb[i + 1] = g * o + rgb[i + 1]! * (1 - o)
        rgb[i + 2] = b * o + rgb[i + 2]! * (1 - o)
      }
    }
  }

  const ow = (w - cropX) * scale
  const oh = h * scale
  const out = new Uint8Array(ow * oh * 4)
  for (let oy = 0; oy < oh; oy++) {
    for (let ox = 0; ox < ow; ox++) {
      const i = (Math.floor(oy / scale) * w + cropX + Math.floor(ox / scale)) * 3
      const j = (oy * ow + ox) * 4
      out[j] = rgb[i]!
      out[j + 1] = rgb[i + 1]!
      out[j + 2] = rgb[i + 2]!
      out[j + 3] = 255
    }
  }
  return { rgba: out, width: ow, height: oh }
}
