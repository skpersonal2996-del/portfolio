// The hero portrait, drawn with WebGL2 so it can glitch and grow without a
// bitmap ever being scaled up in CSS. One canvas covers the hero stage and the
// photo is drawn into whatever rectangle the layout asks for.

const VERT = `#version 300 es
in vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAG = `#version 300 es
precision highp float;

uniform sampler2D uTex;
uniform vec2  uRes;     // canvas size, device px
uniform vec4  uRect;    // x, y, w, h in device px, top-left origin
uniform float uRadius;  // corner radius, device px
uniform vec2  uImg;     // image size, px
uniform vec2  uFocus;   // crop focus, 0..1 (like object-position)
uniform float uZoom;    // 1 = cover
uniform float uLod;     // mip level for the current scale
uniform float uTime;    // seconds
uniform vec2  uMouse;   // pointer, device px, top-left origin
uniform float uGlitch;  // 0..1
uniform float uSpread;  // 0 = around the pointer, 1 = across the frame
uniform float uReveal;  // 0..1, the frame opening from its centre
uniform float uDim;     // 0..1
uniform float uDpr;
uniform float uFade;    // 0..1, down to the page colour

out vec4 outColor;

float hash(float p) { p = fract(p * 0.1031); p *= p + 33.33; p *= p + p; return fract(p); }
float hash2(vec2 p) { vec3 q = fract(vec3(p.xyx) * 0.1031); q += dot(q, q.yzx + 33.33); return fract((q.x + q.y) * q.z); }

float roundBox(vec2 p, vec2 b, float r) {
  vec2 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, q.y), 0.0) - r;
}

vec2 cover(vec2 uv) {
  float rectAspect = uRect.z / uRect.w;
  float imgAspect = uImg.x / uImg.y;
  vec2 s = rectAspect > imgAspect ? vec2(1.0, imgAspect / rectAspect) : vec2(rectAspect / imgAspect, 1.0);
  s /= uZoom;
  return (1.0 - s) * uFocus + uv * s;
}

vec3 tap(vec2 uv) { return textureLod(uTex, cover(uv), uLod).rgb; }

void main() {
  vec2 px = vec2(gl_FragCoord.x, uRes.y - gl_FragCoord.y);
  vec2 local = px - uRect.xy;
  vec2 halfSize = uRect.zw * 0.5;

  // Rounded frame, antialiased over one device pixel.
  float mask = clamp(0.5 - roundBox(local - halfSize, halfSize, uRadius), 0.0, 1.0);

  // Intro: the frame opens from its centre with a ragged, signal-like edge.
  float tick = floor(mod(uTime, 1000.0) * 24.0);
  float rag = (hash(floor(local.y / (5.0 * uDpr)) * 1.7 + tick) - 0.5) * 0.2 * (1.0 - uReveal) * step(0.001, uReveal);
  float open = abs(local.x - halfSize.x) / max(halfSize.x, 1.0);
  mask *= step(open, uReveal + rag);
  if (mask <= 0.0) { outColor = vec4(0.0); return; }

  vec2 uv = local / uRect.zw;
  float g = uGlitch;

  // Horizontal slices slide sideways. Which slices move re-rolls 24 times a
  // second, and slices near the pointer move most.
  float rows = floor(mix(22.0, 70.0, hash(tick * 0.37 + 3.1)));
  float row = floor(uv.y * rows);
  float near = exp(-pow((px.y - uMouse.y) / (150.0 * uDpr), 2.0));
  float chance = g * mix(0.18 + 0.82 * near, 0.5, uSpread);
  float moves = step(1.0 - chance, hash(row * 7.31 + tick * 1.7));
  float shift = (hash(row * 3.17 + tick * 2.3) - 0.5) * 0.12 * g * moves;
  shift += (hash(row * 11.9 + tick) - 0.5) * 0.004 * g;
  vec2 guv = vec2(uv.x + shift, uv.y);

  // Colour channels pull apart, further on the slices that jumped.
  float split = g * (0.003 + 0.014 * moves);
  vec3 col = vec3(tap(guv + vec2(split, 0.0)).r, tap(guv).g, tap(guv - vec2(split, 0.0)).b);

  // Grade: low-key black and white. Colour only survives while glitching.
  float lum = dot(col, vec3(0.2126, 0.7152, 0.0722));
  col = mix(vec3(lum), col, clamp(g * 1.6, 0.0, 1.0));
  col = pow(col, vec3(1.3));
  vec2 v = uv - 0.5;
  col *= 1.0 - dot(v, v) * mix(0.4, 1.15, uDim);
  col *= mix(0.94, 0.44, uDim);
  col *= vec3(1.015, 1.0, 0.972);

  // Grain always; scanlines only while glitching.
  col += (hash2(floor(px / uDpr) + fract(uTime * 0.37) * 911.0) - 0.5) * (0.05 + 0.08 * g);
  col *= 1.0 - g * 0.08 * step(0.5, fract(px.y / (3.0 * uDpr)));

  // Fade into the page colour (#0C0B0A), not pure black, so there's no seam.
  col = mix(col, vec3(0.047, 0.043, 0.039), uFade);

  outColor = vec4(clamp(col, 0.0, 1.0) * mask, mask);
}`;

const UNIFORMS = [
  "uTex", "uRes", "uRect", "uRadius", "uImg", "uFocus", "uZoom", "uLod",
  "uTime", "uMouse", "uGlitch", "uSpread", "uReveal", "uDim", "uDpr", "uFade",
];

export class PortraitGL {
  static supported() {
    try {
      return !!document.createElement("canvas").getContext("webgl2");
    } catch {
      return false;
    }
  }

  constructor(canvas, { focus = [0.66, 0.38], maxDpr = 2 } = {}) {
    this.canvas = canvas;
    this.focus = focus;
    this.maxDpr = maxDpr;
    this.ready = false;
    this.image = null;
    this.dpr = 1;
    this.onLost = this.onLost.bind(this);
    this.onRestored = this.onRestored.bind(this);
    canvas.addEventListener("webglcontextlost", this.onLost);
    canvas.addEventListener("webglcontextrestored", this.onRestored);
  }

  // Waits for the load event rather than img.decode(): decode() never settles
  // while the page sits in a background tab.
  async load(url) {
    const img = new Image();
    await new Promise((resolve, reject) => {
      img.onload = resolve;
      img.onerror = reject;
      img.src = url;
    });
    this.image = img;
    this.setup();
    return this.ready;
  }

  setup() {
    const gl = this.canvas.getContext("webgl2", {
      alpha: true,
      premultipliedAlpha: true,
      antialias: false,
      depth: false,
      stencil: false,
    });
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

    // One oversized triangle covers the canvas; the scissor keeps work to the photo.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(0);
    gl.vertexAttribPointer(0, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, this.image);
    gl.generateMipmap(gl.TEXTURE_2D);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR_MIPMAP_LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

    gl.useProgram(program);
    gl.uniform1i(this.u.uTex, 0);
    gl.uniform2f(this.u.uImg, this.image.naturalWidth, this.image.naturalHeight);
    gl.uniform2f(this.u.uFocus, this.focus[0], this.focus[1]);
    this.ready = true;
  }

  resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, this.maxDpr);
    const w = Math.max(1, Math.round(this.canvas.clientWidth * dpr));
    const h = Math.max(1, Math.round(this.canvas.clientHeight * dpr));
    if (this.canvas.width !== w || this.canvas.height !== h) {
      this.canvas.width = w;
      this.canvas.height = h;
    }
    this.dpr = dpr;
  }

  // s: { rect: {x, y, w, h} and radius in CSS px relative to the canvas,
  //      zoom, focus, glitch, spread, reveal, dim, fade, mouse: {x, y}, time }
  draw(s) {
    const gl = this.gl;
    if (!this.ready || !gl || gl.isContextLost()) return;
    this.resize();
    const d = this.dpr;
    const W = this.canvas.width, H = this.canvas.height;

    gl.viewport(0, 0, W, H);
    gl.disable(gl.SCISSOR_TEST);
    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);
    if (s.reveal <= 0 || s.rect.w < 1 || s.rect.h < 1) return;

    const x = s.rect.x * d, y = s.rect.y * d, w = s.rect.w * d, h = s.rect.h * d;
    const sx = Math.max(0, Math.floor(x)), sy = Math.max(0, Math.floor(H - (y + h)));
    const sw = Math.ceil(Math.min(W, x + w) - sx), sh = Math.ceil(Math.min(H, H - y) - sy);
    if (sw <= 0 || sh <= 0) return;
    gl.enable(gl.SCISSOR_TEST);
    gl.scissor(sx, sy, sw, sh);

    // Pick the mip level from how many image pixels land on each screen pixel.
    const iw = this.image.naturalWidth, ih = this.image.naturalHeight;
    const shown = (w / h > iw / ih ? 1 : (w / h) / (iw / ih)) / s.zoom;
    const lod = Math.max(0, Math.log2((iw * shown) / w) - 0.3);

    const u = this.u;
    gl.useProgram(this.program);
    gl.uniform2f(u.uRes, W, H);
    gl.uniform4f(u.uRect, x, y, w, h);
    gl.uniform1f(u.uRadius, Math.min(s.radius * d, w / 2, h / 2));
    gl.uniform1f(u.uZoom, s.zoom);
    gl.uniform1f(u.uLod, lod);
    gl.uniform1f(u.uTime, s.time);
    gl.uniform2f(u.uMouse, s.mouse.x * d, s.mouse.y * d);
    gl.uniform1f(u.uGlitch, s.glitch);
    gl.uniform1f(u.uSpread, s.spread);
    gl.uniform1f(u.uReveal, s.reveal);
    gl.uniform1f(u.uDim, s.dim);
    gl.uniform1f(u.uDpr, d);
    gl.uniform1f(u.uFade, s.fade || 0);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
  }

  onLost(e) {
    e.preventDefault();
    this.ready = false;
    this.canvas.dispatchEvent(new CustomEvent("portrait:lost"));
  }

  onRestored() {
    this.setup();
    if (this.ready) this.canvas.dispatchEvent(new CustomEvent("portrait:restored"));
  }
}
