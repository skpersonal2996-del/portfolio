// The particle version of the ambient layer. Thousands of fine points sit on
// the faces of an icosahedron in an exact triangular lattice during the story,
// then loosen into a soft, drifting cloud for "How I think". Colour runs from
// the site's orange to a muted dusk violet, over a faint glow of both.
// Same inputs as Ambient (ambient.js), so main.js can use either.

const GLOW_VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const GLOW_FRAG = `#version 300 es
precision highp float;
uniform vec2 uRes;
uniform vec2 uCenter;
uniform float uSize;
uniform float uAppear;
uniform float uDrift;
uniform float uFade;
out vec4 outColor;

const vec3 NOIR = vec3(0.047, 0.043, 0.039);
const vec3 ORANGE = vec3(0.96, 0.46, 0.16);
const vec3 VIOLET = vec3(0.36, 0.27, 0.72);

float hash(vec2 p) { return fract(sin(dot(p, vec2(12.9898, 78.233))) * 43758.5453); }

void main() {
  vec2 p = gl_FragCoord.xy / uRes.y;
  float a = uRes.x / uRes.y;
  vec3 col = NOIR;
  vec2 c1 = vec2((0.14 + 0.07 * sin(uDrift * 1.2)) * a, 0.72 + 0.08 * cos(uDrift * 0.8));
  vec2 c2 = vec2((0.86 - 0.07 * sin(uDrift * 0.9 + 0.6)) * a, 0.22 + 0.1 * sin(uDrift * 1.3 + 1.0));
  col += ORANGE * 0.1 * exp(-dot(p - c1, p - c1) / 0.2);
  col += VIOLET * 0.14 * exp(-dot(p - c2, p - c2) / 0.2);
  // A faint halo where the particles are.
  vec2 c3 = uCenter / uRes.y;
  float r = uSize / uRes.y;
  col += mix(ORANGE, VIOLET, 0.5) * 0.06 * uAppear * exp(-dot(p - c3, p - c3) / (r * r * 2.2));
  col = mix(NOIR, col, uFade);
  col += (hash(gl_FragCoord.xy) - 0.5) / 255.0;
  outColor = vec4(col, 1.0);
}`;

const POINT_VERT = `#version 300 es
in vec3 aLattice;  // exact position on an icosahedron face
in vec4 aRand;     // per point: xyz jitter in -1..1, w in 0..1
uniform vec2  uRes;
uniform vec2  uCenter;
uniform float uSize;
uniform float uMorph;
uniform vec2  uRot;
uniform float uPhase;
uniform float uAppear;
uniform float uFade;
uniform float uDpr;
out vec3 vColor;
out float vAlpha;

const vec3 ORANGE = vec3(0.98, 0.55, 0.26);
const vec3 VIOLET = vec3(0.58, 0.5, 1.0);

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

void main() {
  vec3 p = aLattice;
  vec3 s = normalize(p);
  // Organic: off the faces and onto a soft, liquid surface that swells and
  // drifts as you scroll, with a little loose dust around it.
  vec3 q = s * 1.3 + vec3(0.0, uPhase * 0.8, uPhase * 0.5);
  vec3 flow = vec3(noise(q), noise(q + vec3(5.2, 1.3, 2.7)), noise(q + vec3(9.1, 4.2, 7.3))) - 0.5;
  float swell = 0.78 + 0.52 * noise(s * 1.05 + vec3(uPhase * 0.6, 0.0, uPhase * 0.4));
  vec3 organic = s * swell + flow * 0.16 + aRand.xyz * 0.025;
  vec3 pos = mix(p, organic, uMorph);

  float cy = cos(uRot.x), sy = sin(uRot.x), cx = cos(uRot.y), sx = sin(uRot.y);
  pos = vec3(cy * pos.x + sy * pos.z, pos.y, -sy * pos.x + cy * pos.z);
  pos = vec3(pos.x, cx * pos.y - sx * pos.z, sx * pos.y + cx * pos.z);

  const float CAM = 3.4;
  vec2 screen = uCenter + pos.xy * (CAM / (CAM - pos.z)) * uSize;
  gl_Position = vec4(screen / uRes * 2.0 - 1.0, 0.0, 1.0);

  float near = clamp((pos.z + 1.1) / 2.2, 0.0, 1.0);
  gl_PointSize = uDpr * mix(1.0, 2.3, near) * (0.85 + 0.3 * aRand.w);

  // Orange on one side of the form, violet on the other, softly mixed.
  float g = smoothstep(-0.7, 0.7, s.x * 0.8 - s.y * 0.6 + (aRand.w - 0.5) * 0.4);
  vColor = mix(mix(ORANGE, VIOLET, g), vec3(1.0, 0.95, 0.9), near * near * 0.15);
  vAlpha = uAppear * uFade * mix(0.22, 0.9, near);
}`;

const POINT_FRAG = `#version 300 es
precision highp float;
in vec3 vColor;
in float vAlpha;
out vec4 outColor;
void main() {
  float r = length(gl_PointCoord - 0.5);
  float a = smoothstep(0.5, 0.1, r) * vAlpha;
  outColor = vec4(vColor * a, a);
}`;

// Points on each of the icosahedron's 20 faces, in an even triangular grid.
// Points on shared edges are kept twice, so the edges read slightly brighter.
function icoLattice(freq) {
  const t = (1 + Math.sqrt(5)) / 2;
  const V = [
    [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0], [0, -1, t], [0, 1, t],
    [0, -1, -t], [0, 1, -t], [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
  ].map((v) => {
    const l = Math.hypot(...v);
    return v.map((c) => c / l);
  });
  const F = [
    [0, 11, 5], [0, 5, 1], [0, 1, 7], [0, 7, 10], [0, 10, 11], [1, 5, 9], [5, 11, 4],
    [11, 10, 2], [10, 7, 6], [7, 1, 8], [3, 9, 4], [3, 4, 2], [3, 2, 6], [3, 6, 8],
    [3, 8, 9], [4, 9, 5], [2, 4, 11], [6, 2, 10], [8, 6, 7], [9, 8, 1],
  ];
  const out = [];
  for (const [a, b, c] of F) {
    for (let i = 0; i <= freq; i++) {
      for (let j = 0; j <= freq - i; j++) {
        const k = freq - i - j;
        out.push(
          (V[a][0] * i + V[b][0] * j + V[c][0] * k) / freq,
          (V[a][1] * i + V[b][1] * j + V[c][1] * k) / freq,
          (V[a][2] * i + V[b][2] * j + V[c][2] * k) / freq
        );
      }
    }
  }
  return new Float32Array(out);
}

function program(gl, vert, frag) {
  const prog = gl.createProgram();
  for (const [type, src] of [[gl.VERTEX_SHADER, vert], [gl.FRAGMENT_SHADER, frag]]) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, src);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
      console.error(gl.getShaderInfoLog(shader));
      return null;
    }
    gl.attachShader(prog, shader);
  }
  gl.linkProgram(prog);
  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error(gl.getProgramInfoLog(prog));
    return null;
  }
  return prog;
}

const uniforms = (gl, prog, names) => Object.fromEntries(names.map((n) => [n, gl.getUniformLocation(prog, n)]));

export class Particles {
  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  // freq sets the lattice density: 20 faces × (freq+1)(freq+2)/2 points.
  constructor(canvas, { freq = 22, maxDpr = 2 } = {}) {
    this.canvas = canvas;
    this.maxDpr = maxDpr;
    this.ready = false;
    this.setup(freq);
  }

  setup(freq) {
    const gl = this.canvas.getContext("webgl2", { alpha: false, antialias: false, depth: false, stencil: false });
    if (!gl) return;
    this.gl = gl;
    this.glowProg = program(gl, GLOW_VERT, GLOW_FRAG);
    this.pointProg = program(gl, POINT_VERT, POINT_FRAG);
    if (!this.glowProg || !this.pointProg) return;
    this.gu = uniforms(gl, this.glowProg, ["uRes", "uCenter", "uSize", "uAppear", "uDrift", "uFade"]);
    this.pu = uniforms(gl, this.pointProg, ["uRes", "uCenter", "uSize", "uMorph", "uRot", "uPhase", "uAppear", "uFade", "uDpr"]);

    // The glow: one oversized triangle.
    this.glowVao = gl.createVertexArray();
    gl.bindVertexArray(this.glowVao);
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const glowPos = gl.getAttribLocation(this.glowProg, "aPos");
    gl.enableVertexAttribArray(glowPos);
    gl.vertexAttribPointer(glowPos, 2, gl.FLOAT, false, 0, 0);

    // The points: lattice positions plus four random numbers each.
    const lattice = icoLattice(freq);
    this.count = lattice.length / 3;
    const rand = new Float32Array(this.count * 4);
    for (let i = 0; i < this.count; i++) {
      rand[i * 4] = Math.random() * 2 - 1;
      rand[i * 4 + 1] = Math.random() * 2 - 1;
      rand[i * 4 + 2] = Math.random() * 2 - 1;
      rand[i * 4 + 3] = Math.random();
    }
    this.pointVao = gl.createVertexArray();
    gl.bindVertexArray(this.pointVao);
    for (const [name, data, size] of [["aLattice", lattice, 3], ["aRand", rand, 4]]) {
      const loc = gl.getAttribLocation(this.pointProg, name);
      gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
      gl.bufferData(gl.ARRAY_BUFFER, data, gl.STATIC_DRAW);
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, 0, 0);
    }
    gl.bindVertexArray(null);
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

  // Same state as Ambient.draw: center, size, appear, morph, rot, phase, drift, fade.
  draw(s) {
    const gl = this.gl;
    if (!this.ready || gl.isContextLost()) return;
    this.resize();
    const k = this.k, W = this.canvas.width, H = this.canvas.height;
    const cx = s.center[0] * k, cy = H - s.center[1] * k, size = s.size * k;
    gl.viewport(0, 0, W, H);

    gl.disable(gl.BLEND);
    gl.useProgram(this.glowProg);
    gl.bindVertexArray(this.glowVao);
    const g = this.gu;
    gl.uniform2f(g.uRes, W, H);
    gl.uniform2f(g.uCenter, cx, cy);
    gl.uniform1f(g.uSize, size);
    gl.uniform1f(g.uAppear, s.appear);
    gl.uniform1f(g.uDrift, s.drift);
    gl.uniform1f(g.uFade, s.fade);
    gl.drawArrays(gl.TRIANGLES, 0, 3);

    if (s.appear > 0.002 && s.fade > 0.002) {
      gl.enable(gl.BLEND);
      gl.blendFunc(gl.ONE, gl.ONE); // additive: dense areas glow a little
      gl.useProgram(this.pointProg);
      gl.bindVertexArray(this.pointVao);
      const p = this.pu;
      gl.uniform2f(p.uRes, W, H);
      gl.uniform2f(p.uCenter, cx, cy);
      gl.uniform1f(p.uSize, size);
      gl.uniform1f(p.uMorph, s.morph);
      gl.uniform2f(p.uRot, s.rot[0], s.rot[1]);
      gl.uniform1f(p.uPhase, s.phase);
      gl.uniform1f(p.uAppear, s.appear);
      gl.uniform1f(p.uFade, s.fade);
      gl.uniform1f(p.uDpr, k);
      gl.drawArrays(gl.POINTS, 0, this.count);
    }
    gl.bindVertexArray(null);
  }
}
