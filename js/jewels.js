// Small glass shapes for the roles section: a ring, a rounded cube and a soft
// pebble, one in each bracket. One canvas covers the section; each shape is
// drawn into its bracket's rectangle with the scissor. The glass is the same
// warm frosted material as the ambient layer, but composited with alpha, so
// the section's own background shows through the body.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uCenter;  // device px, bottom-left origin
uniform float uSize;    // radius, device px
uniform int   uShape;   // 0 ring, 1 rounded cube, 2 pebble
uniform vec2  uRot;
uniform float uPhase;
uniform float uAppear;

out vec4 outColor;

const vec3 ORANGE = vec3(0.96, 0.46, 0.16);
const vec3 VIOLET = vec3(0.58, 0.5, 1.0);
const vec3 UP = vec3(0.0, 1.0, 0.0);
const vec3 KEY = vec3(-0.55, 0.75, 0.45);  // a big warm softbox, up and to the left
const vec3 STRIP_L = vec3(-0.85, 0.0, -0.5); // tall strips behind: they streak through the glass
const vec3 STRIP_R = vec3(0.8, 0.0, -0.6);
const vec3 LOW = vec3(-0.3, -0.8, 0.5);
const vec3 BACK = vec3(0.2, 0.3, -1.0);     // the section's warm glow, behind and up to the right

float hash(vec3 p) {
  p = fract(p * 0.3183099 + 0.1);
  p *= 17.0;
  return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
}
float noise(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x),
                 mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x),
                 mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

float map(vec3 p) {
  p.xz *= rot(uRot.x);
  p.yz *= rot(uRot.y);
  if (uShape == 0) {
    vec2 q = vec2(length(p.xz) - 0.58, p.y);
    return length(q) - 0.24;
  }
  if (uShape == 1) {
    vec3 q = abs(p) - vec3(0.5) + 0.17;
    return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - 0.17;
  }
  // A smooth, slightly irregular drop that shifts as it turns.
  float n = noise(p * 1.1 + vec3(uPhase, 0.0, uPhase * 0.7)) * 0.14;
  return (length(p * vec3(1.0, 0.84, 1.0)) - 0.74 - n + 0.07) * 0.9;
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// A long thin light: bright near the vertical plane through s, on s's side.
float strip(vec3 d, vec3 s, float w) {
  s = normalize(s);
  return smoothstep(w, w * 0.2, abs(dot(d, normalize(cross(UP, s))))) * smoothstep(0.1, 0.5, dot(d, s)) * smoothstep(0.95, 0.4, abs(d.y));
}

// A small warm studio: a dim dome, a warm glow behind (the section's own),
// a key softbox, two tall strips behind (one white, one orange) and a faint
// violet low.
vec3 env(vec3 d, float frost) {
  vec3 c = mix(vec3(0.015, 0.01, 0.008), vec3(0.2, 0.14, 0.1), smoothstep(-0.4, 0.9, d.y));
  c += vec3(1.0, 0.72, 0.46) * pow(smoothstep(0.86 - frost * 0.5, 1.0, dot(d, normalize(BACK))), 1.5) * 1.8;
  c += vec3(1.0, 0.9, 0.78) * smoothstep(0.55 - frost, 0.92, dot(d, normalize(KEY))) * 2.4;
  c += vec3(1.0, 0.95, 0.9) * strip(d, STRIP_L, 0.07 + frost * 0.2) * 1.6;
  c += ORANGE * strip(d, STRIP_R, 0.09 + frost * 0.2) * 2.2;
  c += ORANGE * 0.22 * smoothstep(-0.2, -0.9, d.y);
  c += VIOLET * smoothstep(0.4 - frost, 1.0, dot(d, normalize(LOW))) * 0.4;
  return c;
}

vec3 exitDir(vec3 r1, vec3 n2, float ior) {
  vec3 r = refract(r1, n2, ior);
  return dot(r, r) < 1e-4 ? reflect(r1, n2) : r;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec2 q = (px - uCenter) / uSize;
  vec3 ro = vec3(0.0, 0.0, 3.4);
  vec3 rd = normalize(vec3(q * 0.3, -1.0));
  float b = dot(ro, rd), h = b * b - (dot(ro, ro) - 1.7);
  if (h <= 0.0) { outColor = vec4(0.0); return; }
  h = sqrt(h);
  float t = -b - h, tEnd = -b + h, dMin = 1e3, tMin = t;
  bool hit = false;
  for (int i = 0; i < 64; i++) {
    float d = map(ro + rd * t);
    if (d < dMin) { dMin = d; tMin = t; }
    if (d < 0.0012) { hit = true; break; }
    t += d * 0.8;
    if (t > tEnd) break;
  }
  // Rays that just miss still cover part of their pixel: shade them where they
  // passed closest, so the silhouette is smooth.
  float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, 1.3 / uSize, dMin);
  if (cover <= 0.0) { outColor = vec4(0.0); return; }

  vec3 p = ro + rd * (hit ? t : tMin);
  vec3 n = normalAt(p);
  float facing = max(dot(-rd, n), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - facing, 5.0);

  // Through the body: in at the front, across, out at the back.
  vec3 r1 = refract(rd, n, 1.0 / 1.46);
  vec3 qq = p + r1 * 0.03;
  float inside = 0.03;
  for (int i = 0; i < 20; i++) {
    float d = map(qq);
    if (d > 0.0) break;
    float st = max(-d, 0.02);
    qq += r1 * st;
    inside += st;
  }
  vec3 n2 = -normalAt(qq);
  vec3 through = vec3(env(exitDir(r1, n2, 1.43), 0.15).r,
                      env(exitDir(r1, n2, 1.46), 0.15).g,
                      env(exitDir(r1, n2, 1.51), 0.15).b);
  vec3 absorb = exp(-inside * vec3(0.08, 0.24, 0.5));
  vec3 refl = reflect(rd, n);

  vec3 col = through * absorb * 0.9 + vec3(0.3, 0.16, 0.08) * 0.18;
  col = mix(col, env(refl, 0.0), F);
  col += vec3(1.0, 0.93, 0.85) * pow(max(dot(refl, normalize(KEY)), 0.0), 80.0) * 1.2;
  col = min(col, vec3(1.0));
  // Premultiplied: the body lets the section show through, bright light
  // covers it. Colour never exceeds alpha, so every browser blends it alike.
  float alpha = max(0.25 + 0.75 * F, max(col.r, max(col.g, col.b)));
  float k = cover * uAppear;
  outColor = vec4(col, alpha) * k;
}`;

const UNIFORMS = ["uCenter", "uSize", "uShape", "uRot", "uPhase", "uAppear"];

export class Jewels {
  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor(canvas, { maxDpr = 2 } = {}) {
    this.canvas = canvas;
    this.maxDpr = maxDpr;
    this.ready = false;
    const gl = canvas.getContext("webgl2", { alpha: true, premultipliedAlpha: true, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    this.gl = gl;
    const program = gl.createProgram();
    for (const [type, src] of [[gl.VERTEX_SHADER, VERT], [gl.FRAGMENT_SHADER, FRAG]]) {
      const shader = gl.createShader(type);
      gl.shaderSource(shader, src);
      gl.compileShader(shader);
      if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader));
        return;
      }
      gl.attachShader(program, shader);
    }
    gl.bindAttribLocation(program, 0, "aPos");
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      console.error(gl.getProgramInfoLog(program));
      return;
    }
    this.program = program;
    this.u = Object.fromEntries(UNIFORMS.map((n) => [n, gl.getUniformLocation(program, n)]));
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);
    this.ready = true;
  }

  resize() {
    const k = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * k));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * k));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.k = k;
  }

  // items: [{ center: [x, y], size, shape, rot: [y, x], phase, appear }], CSS px
  // relative to the canvas, top-left origin.
  draw(items) {
    const gl = this.gl;
    if (!this.ready || gl.isContextLost()) return;
    this.resize();
    const k = this.k, W = this.canvas.width, H = this.canvas.height, u = this.u;
    gl.viewport(0, 0, W, H);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    gl.useProgram(this.program);
    gl.enable(gl.SCISSOR_TEST);
    for (const it of items) {
      if (it.appear <= 0.002) continue;
      const cx = it.center[0] * k, cy = H - it.center[1] * k, r = it.size * k;
      const x0 = Math.max(0, Math.floor(cx - r * 1.4)), y0 = Math.max(0, Math.floor(cy - r * 1.4));
      const x1 = Math.min(W, Math.ceil(cx + r * 1.4)), y1 = Math.min(H, Math.ceil(cy + r * 1.4));
      if (x1 <= x0 || y1 <= y0) continue;
      gl.scissor(x0, y0, x1 - x0, y1 - y0);
      gl.uniform2f(u.uCenter, cx, cy);
      gl.uniform1f(u.uSize, r);
      gl.uniform1i(u.uShape, it.shape);
      gl.uniform2f(u.uRot, it.rot[0], it.rot[1]);
      gl.uniform1f(u.uPhase, it.phase);
      gl.uniform1f(u.uAppear, it.appear);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    }
    gl.disable(gl.SCISSOR_TEST);
  }
}
