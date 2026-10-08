// The ambient layer behind the story and "How I think": a slow orange-amber
// glow, and a form in warm frosted glass that is faceted and exact during the
// story, then melts into something soft and organic for "How I think".
// One fragment shader, ray-marched. Everything it shows is set by scroll.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;

uniform vec2  uRes;     // canvas size, device px
uniform vec2  uCenter;  // the form's centre, device px, bottom-left origin
uniform float uSize;    // the form's radius, device px
uniform float uAppear;  // 0..1, how present the form is
uniform float uMorph;   // 0 = faceted, 1 = organic
uniform vec2  uRot;     // rotation: around y, around x
uniform float uPhase;   // moves the organic surface
uniform float uDrift;   // moves the glow
uniform float uFade;    // 0..1, the whole layer from page colour up

out vec4 outColor;

const vec3 NOIR = vec3(0.047, 0.043, 0.039);
const vec3 AMBER = vec3(0.91, 0.56, 0.18);
const vec3 ORANGE = vec3(0.96, 0.46, 0.16);
const vec3 EMBER = vec3(0.55, 0.2, 0.06);

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

/* ---------- The glow: two soft lights drifting on the page colour ---------- */

vec3 glow(vec2 p) { // p: device px / height, so x runs 0..aspect
  float a = uRes.x / uRes.y;
  vec3 col = NOIR;
  vec2 c1 = vec2((0.16 + 0.07 * sin(uDrift * 1.3)) * a, 0.74 + 0.08 * cos(uDrift * 0.9));
  vec2 c2 = vec2((0.86 - 0.08 * sin(uDrift * 0.8 + 0.6)) * a, 0.2 + 0.1 * sin(uDrift * 1.4 + 1.0));
  vec2 c3 = uCenter / uRes.y;
  col += AMBER * 0.13 * exp(-dot(p - c1, p - c1) / 0.2);
  col += ORANGE * 0.1 * exp(-dot(p - c2, p - c2) / 0.16);
  // A warm halo behind the form, so the glass has light to bend.
  float r = uSize / uRes.y;
  col += EMBER * 0.24 * uAppear * exp(-dot(p - c3, p - c3) / (r * r * 2.6));
  return col;
}

/* ---------- The form ---------- */

mat2 rot(float a) { float c = cos(a), s = sin(a); return mat2(c, -s, s, c); }

// Icosahedron: twenty flat faces, the "technically correct" shape.
float sdIco(vec3 p, float r) {
  const float PHI = 1.618034;
  p = abs(p);
  float d = dot(p, normalize(vec3(1.0)));
  d = max(d, dot(p, normalize(vec3(0.0, 1.0 / PHI, PHI))));
  d = max(d, dot(p, normalize(vec3(1.0 / PHI, PHI, 0.0))));
  d = max(d, dot(p, normalize(vec3(PHI, 0.0, 1.0 / PHI))));
  return d - r;
}

// A soft body whose surface slowly moves: the shape that feels right.
float sdBlob(vec3 p) {
  float n = noise(p * 1.0 + vec3(0.0, uPhase, uPhase * 0.6)) * 0.4
          + noise(p * 2.3 - vec3(uPhase * 0.7, 0.0, uPhase * 0.4)) * 0.05;
  return length(p) - 0.88 - (n - 0.225);
}

// The facets soften into a smooth pebble first, then the pebble comes alive,
// so the change never passes through a dented in-between.
float map(vec3 p) {
  p.xz *= rot(uRot.x);
  p.yz *= rot(uRot.y);
  float soften = smoothstep(0.0, 0.6, uMorph);
  float alive = smoothstep(0.4, 1.0, uMorph);
  float d = mix(sdIco(p, 0.8), length(p) - 0.94, soften);
  return alive > 0.0 ? mix(d, sdBlob(p), alive) : d;
}

vec3 normalAt(vec3 p) {
  const vec2 e = vec2(0.0015, -0.0015);
  return normalize(e.xyy * map(p + e.xyy) + e.yyx * map(p + e.yyx) +
                   e.yxy * map(p + e.yxy) + e.xxx * map(p + e.xxx));
}

// A soft studio around the glass: a warm key panel above left, an orange rim
// panel to the right, an amber bounce from below. The glass reflects it and,
// through its body, bends it. frost widens the panels for what's seen through.
const vec3 KEY = vec3(-0.5, 0.8, 0.35);
const vec3 RIM = vec3(0.9, -0.1, 0.3);
const vec3 BOUNCE = vec3(-0.2, -0.9, 0.4);
vec3 env(vec3 d, float frost) {
  vec3 c = NOIR * 0.6;
  c += vec3(1.0, 0.9, 0.8) * smoothstep(0.62 - frost, 0.98, dot(d, normalize(KEY))) * 2.0;
  c += ORANGE * smoothstep(0.5 - frost, 0.95, dot(d, normalize(RIM))) * 1.0;
  c += AMBER * smoothstep(0.3 - frost, 1.0, dot(d, normalize(BOUNCE))) * 0.35;
  return c;
}

vec3 exitDir(vec3 r1, vec3 n2, float ior) {
  vec3 r = refract(r1, n2, ior);
  return dot(r, r) < 1e-4 ? reflect(r1, n2) : r; // total internal reflection
}

// Warm frosted glass. Light is followed in through the front face, across the
// body to the back face and out again, each colour at a slightly different
// angle; the longer the path inside, the warmer and darker it gets. At
// glancing angles the surface turns to reflection, which draws the rims.
vec3 glass(vec3 p, vec3 n, vec3 rd, vec2 px) {
  float facing = max(dot(-rd, n), 0.0);
  float F = 0.04 + 0.96 * pow(1.0 - facing, 5.0);

  vec3 r1 = refract(rd, n, 1.0 / 1.46);
  vec3 q = p + r1 * 0.03;
  float inside = 0.03;
  for (int i = 0; i < 24; i++) {
    float d = map(q);
    if (d > 0.0) break;
    float st = max(-d, 0.02);
    q += r1 * st;
    inside += st;
  }
  vec3 n2 = -normalAt(q);
  vec3 through = vec3(env(exitDir(r1, n2, 1.44), 0.25).r,
                      env(exitDir(r1, n2, 1.46), 0.25).g,
                      env(exitDir(r1, n2, 1.49), 0.25).b);
  vec3 behind = glow((px + r1.xy * uSize * 0.6) / uRes.y);
  vec3 absorb = exp(-inside * vec3(0.16, 0.42, 0.85));
  vec3 col = (through * 1.25 + behind * 1.6) * absorb + vec3(0.34, 0.2, 0.1) * 0.35;

  vec3 refl = reflect(rd, n);
  col = mix(col, env(refl, 0.0), F);
  col += vec3(1.0, 0.93, 0.85) * pow(max(dot(refl, normalize(KEY)), 0.0), 80.0) * 1.1;
  return col;
}

void main() {
  vec2 px = gl_FragCoord.xy;
  vec3 col = glow(px / uRes.y);

  if (uAppear > 0.002) {
    vec2 q = (px - uCenter) / uSize;
    vec3 ro = vec3(0.0, 0.0, 3.4);
    vec3 rd = normalize(vec3(q * 0.3, -1.0));
    // Only march rays that meet the form's bounding sphere.
    float b = dot(ro, rd), h = b * b - (dot(ro, ro) - 1.7);
    if (h > 0.0) {
      h = sqrt(h);
      float t = -b - h, tEnd = -b + h;
      float dMin = 1e3;
      bool hit = false;
      for (int i = 0; i < 64; i++) {
        float d = map(ro + rd * t);
        dMin = min(dMin, d);
        if (d < 0.0012) { hit = true; break; }
        t += d * 0.75;
        if (t > tEnd) break;
      }
      // Soft edge: about one screen pixel of coverage at the silhouette.
      float pix = 1.2 / uSize;
      float cover = hit ? 1.0 : 1.0 - smoothstep(0.0, pix, dMin);
      if (cover > 0.0) {
        vec3 p = ro + rd * t;
        col = mix(col, glass(p, normalAt(p), rd, px), cover * uAppear);
      }
    }
  }

  col = mix(NOIR, col, uFade);
  col += (hash(vec3(px, 1.7)) - 0.5) / 255.0; // dither, so the dark gradients don't band
  outColor = vec4(col, 1.0);
}`;

const UNIFORMS = ["uRes", "uCenter", "uSize", "uAppear", "uMorph", "uRot", "uPhase", "uDrift", "uFade"];

export class Ambient {
  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  // Rendered below screen resolution: the glow is soft and the glass is
  // frosted, so the saving is invisible.
  constructor(canvas, { scale = 0.7, maxDpr = 1.5 } = {}) {
    this.canvas = canvas;
    this.scale = scale;
    this.maxDpr = maxDpr;
    this.ready = false;
    this.setup();
  }

  setup() {
    const gl = this.canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
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
    const k = Math.min(window.devicePixelRatio || 1, this.maxDpr) * this.scale;
    const w = Math.max(1, Math.round(this.canvas.clientWidth * k));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * k));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.k = k;
  }

  // s: { center: [x, y] and size in CSS px (top-left origin), appear, morph,
  //      rot: [y, x], phase, drift, fade }
  draw(s) {
    const gl = this.gl;
    if (!this.ready || gl.isContextLost()) return;
    this.resize();
    const k = this.k, H = this.canvas.height;
    const u = this.u;
    gl.viewport(0, 0, this.canvas.width, H);
    gl.useProgram(this.program);
    gl.uniform2f(u.uRes, this.canvas.width, H);
    gl.uniform2f(u.uCenter, s.center[0] * k, H - s.center[1] * k);
    gl.uniform1f(u.uSize, s.size * k);
    gl.uniform1f(u.uAppear, s.appear);
    gl.uniform1f(u.uMorph, s.morph);
    gl.uniform2f(u.uRot, s.rot[0], s.rot[1]);
    gl.uniform1f(u.uPhase, s.phase);
    gl.uniform1f(u.uDrift, s.drift);
    gl.uniform1f(u.uFade, s.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }
}
