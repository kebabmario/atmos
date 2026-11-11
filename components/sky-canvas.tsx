"use client";

import { useEffect, useRef } from "react";
import { sunPosition, type Sky } from "@/lib/theme";
import type { ConditionKind } from "@/lib/weather";

/* A live sky for the place: single-scattering atmosphere lit by the real sun
   position, a cloud deck sized by cloud cover and drifting with the wind,
   stars once the sun is well down, and a little film grain. */

type SkyCanvasProps = {
  latitude: number;
  longitude: number;
  cloudCover: number; // percent
  sky: Sky;
  windSpeed: number; // km/h
  windDirection: number; // degrees the wind blows from
  dark: boolean; // light text on top: keep the sky in a dark range
  condition: ConditionKind;
  precipitation: number; // mm in the current hour
};

const RESOLUTION = 0.5; // the sky is soft, so half resolution is plenty
const FRAME_MS = 33;
const SUN_OFFSET = -0.38; // radians left of centre, so the glow sits behind the city name

// How heavy and how wet each sky reads: minimum cover, and darkening of cloud bases.
const SKY_LOOK: Record<Sky, { cover: number; wet: number }> = {
  clear: { cover: 0, wet: 0 },
  partly: { cover: 0.3, wet: 0 },
  cloud: { cover: 0.8, wet: 0.35 },
  rain: { cover: 0.9, wet: 1 },
  snow: { cover: 0.85, wet: -0.25 },
  storm: { cover: 0.95, wet: 1.6 },
};

// What is falling right now, as rain and snow strength from 0 to 1.
const FALLING: Partial<Record<ConditionKind, { rain: number; snow: number }>> = {
  drizzle: { rain: 0.3, snow: 0 },
  rain: { rain: 0.6, snow: 0 },
  "heavy-rain": { rain: 1, snow: 0 },
  sleet: { rain: 0.45, snow: 0.35 },
  snow: { rain: 0, snow: 0.7 },
  storm: { rain: 1, snow: 0 },
};

function falling(condition: ConditionKind, precipitation: number) {
  const base = FALLING[condition];
  if (!base) return { rain: 0, snow: 0 };
  const boost = Math.min(precipitation / 6, 1); // about 6 mm an hour reads as a downpour
  return {
    rain: base.rain && Math.max(base.rain, boost),
    snow: base.snow && Math.max(base.snow, boost),
  };
}

const VERTEX = `
attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;
uniform vec3 uSun;
uniform float uCover;
uniform float uWet;
uniform vec2 uDrift;
uniform float uDark;
uniform float uRain;
uniform float uSnow;
uniform float uSlant;

const float PI = 3.14159265;
const float R_PLANET = 6371.0;
const float R_ATMOS = 6471.0;
const vec3 ORIGIN = vec3(0.0, 6372.0, 0.0);
const vec3 K_RLH = vec3(5.5e-3, 13.0e-3, 22.4e-3);
const float K_MIE = 21e-3;
const float SH_RLH = 8.0;
const float SH_MIE = 1.2;
const float G = 0.758;

vec2 rsi(vec3 r0, vec3 rd, float sr) {
  float b = 2.0 * dot(rd, r0);
  float c = dot(r0, r0) - sr * sr;
  float d = b * b - 4.0 * c;
  if (d < 0.0) return vec2(1e5, -1e5);
  return vec2(-b - sqrt(d), -b + sqrt(d)) * 0.5;
}

// Single scattering, after Nishita; distances in km.
vec3 atmosphere(vec3 r, vec3 sun) {
  vec2 p = rsi(ORIGIN, r, R_ATMOS);
  if (p.x > p.y) return vec3(0.0);
  vec2 ground = rsi(ORIGIN, r, R_PLANET);
  if (ground.x < ground.y && ground.x > 0.0) p.y = min(p.y, ground.x);
  float stepI = (p.y - max(p.x, 0.0)) / 12.0;
  float t = max(p.x, 0.0);
  vec3 rlh = vec3(0.0);
  vec3 mie = vec3(0.0);
  float odRlh = 0.0;
  float odMie = 0.0;
  float mu = dot(r, sun);
  float pRlh = 3.0 / (16.0 * PI) * (1.0 + mu * mu);
  float pMie = 3.0 / (8.0 * PI) * ((1.0 - G * G) * (mu * mu + 1.0)) /
    (pow(1.0 + G * G - 2.0 * mu * G, 1.5) * (2.0 + G * G));
  for (int i = 0; i < 12; i++) {
    vec3 pos = ORIGIN + r * (t + stepI * 0.5);
    float h = length(pos) - R_PLANET;
    float dRlh = exp(-h / SH_RLH) * stepI;
    float dMie = exp(-h / SH_MIE) * stepI;
    odRlh += dRlh;
    odMie += dMie;
    float stepJ = rsi(pos, sun, R_ATMOS).y / 6.0;
    float lRlh = 0.0;
    float lMie = 0.0;
    for (int j = 0; j < 6; j++) {
      vec3 q = pos + sun * (stepJ * (float(j) + 0.5));
      float hj = length(q) - R_PLANET;
      lRlh += exp(-hj / SH_RLH) * stepJ;
      lMie += exp(-hj / SH_MIE) * stepJ;
    }
    vec3 attn = exp(-(K_MIE * (odMie + lMie) + K_RLH * (odRlh + lRlh)));
    rlh += dRlh * attn;
    mie += dMie * attn;
    t += stepI;
  }
  return 22.0 * (pRlh * K_RLH * rlh + pMie * K_MIE * mie);
}

float hash(vec2 p) { return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453); }

float noise(vec2 p) {
  vec2 i = floor(p);
  vec2 f = fract(p);
  vec2 u = f * f * (3.0 - 2.0 * f);
  return mix(mix(hash(i), hash(i + vec2(1.0, 0.0)), u.x),
             mix(hash(i + vec2(0.0, 1.0)), hash(i + vec2(1.0, 1.0)), u.x), u.y);
}

float fbm(vec2 p) {
  float v = 0.0;
  float a = 0.5;
  mat2 m = mat2(1.6, 1.2, -1.2, 1.6);
  for (int i = 0; i < 5; i++) {
    v += a * noise(p);
    p = m * p;
    a *= 0.5;
  }
  return v;
}

// Stars: one per few cells at a random sub-pixel spot. Brightness follows a steep
// power law (many faint, few bright), colour runs blue-white to warm, and only
// the bright ones scintillate.
vec3 stars() {
  vec2 g = gl_FragCoord.xy / 3.0;
  vec2 cell = floor(g);
  float h = hash(cell);
  if (h < 0.93) return vec3(0.0);
  vec2 spot = 0.2 + 0.6 * vec2(hash(cell + 3.7), hash(cell + 9.1));
  float dist = length((fract(g) - spot) * 3.0); // canvas pixels
  float mag = pow(hash(cell + 5.3), 7.0);
  float core = exp(-dist * dist * 2.5);
  float glow = exp(-dist * 1.6) * mag * 0.35;
  float twinkle = 1.0 + 0.35 * mag * sin(uTime * (4.0 + 6.0 * h) + h * 60.0);
  vec3 tint = mix(vec3(0.78, 0.86, 1.0), vec3(1.0, 0.9, 0.8), hash(cell + 1.9));
  return tint * (core * (0.035 + 1.3 * mag) + glow) * twinkle;
}

// Rain: one streak per column, motion-blurred, at a given depth.
float rainLayer(float scale, float speed, float len, float thickPx, float density, float seed) {
  vec2 q = gl_FragCoord.xy / uRes.y * scale;
  q.x += q.y * uSlant;
  q.y += uTime * speed;
  float col = floor(q.x);
  if (hash(vec2(col, seed)) > density) return 0.0;
  float offset = (hash(vec2(col, seed + 1.7)) - 0.5) * 0.6;
  float x = abs(fract(q.x) - 0.5 - offset);
  float thick = thickPx * scale / uRes.y;
  float y = fract(q.y * 0.35 + hash(vec2(col, seed + 3.1)));
  float streak = (1.0 - smoothstep(len * 0.6, len, y)) * smoothstep(0.0, 0.01, y);
  return streak * (1.0 - smoothstep(thick * 0.5, thick, x)) * (1.0 - 0.5 * y / len);
}

// Snow: a flake in some cells, swaying as it falls; large soft ones read as out of focus.
float snowLayer(float scale, float fall, float size, float soft, float density, float seed) {
  vec2 q = gl_FragCoord.xy / uRes.y * scale;
  q.y += uTime * fall;
  q.x += uTime * fall * uSlant + sin(q.y * 0.9 + seed) * 0.22;
  vec2 id = floor(q);
  if (hash(id + seed) > density) return 0.0;
  vec2 o = vec2(hash(id + seed + 1.3), hash(id + seed + 2.7)) - 0.5;
  float d = length(fract(q) - 0.5 - o * 0.6);
  return 1.0 - smoothstep(size * (1.0 - soft), size, d);
}

void main() {
  vec2 uv = gl_FragCoord.xy / uRes;
  float fov = 1.25;
  float el = max((uv.y - 0.22) * fov, 0.0); // below the horizon, hold the horizon colour
  float az = (uv.x - 0.5) * fov * uRes.x / uRes.y;
  vec3 dir = normalize(vec3(sin(az) * cos(el), sin(el), cos(az) * cos(el)));

  float sunY = uSun.y;
  float day = smoothstep(-0.12, 0.2, sunY);
  float mu = dot(dir, uSun);
  vec3 sky = atmosphere(dir, uSun);
  vec3 sunCol = mix(vec3(1.0, 0.5, 0.46), vec3(1.0, 0.96, 0.92), smoothstep(0.0, 0.35, sunY)) *
    smoothstep(-0.1, 0.03, sunY);

  // Cloud deck: a noise field projected on a plane overhead, drifting with the wind.
  float d = 0.0;
  float n = 0.0;
  if (dir.y > 0.0) {
    vec2 p = dir.xz / (dir.y + 0.08) * 0.55 + uDrift;
    n = fbm(p + 0.6 * fbm(p * 0.5 + uTime * 0.006));
    float edge = mix(0.8, 0.2, uCover);
    d = smoothstep(edge, edge + 0.3, n) * smoothstep(0.0, 0.2, dir.y);
  }
  vec3 ambient = atmosphere(vec3(0.0, 1.0, 0.0), uSun) * 1.6 + vec3(0.25) * day;
  vec3 cloud = ambient + sunCol * 1.4 * (0.5 + 0.5 * n) * mix(1.0, 0.45, uCover);
  cloud *= mix(1.0, 0.55, smoothstep(0.45, 1.0, n) * uCover);
  cloud *= 1.0 - 0.32 * uWet;
  cloud += sunCol * pow(max(mu, 0.0), 10.0) * 1.2 * (1.0 - d);
  cloud *= mix(0.3, 1.0, day); // twilight clouds stay dim and blue, not brown
  cloud += vec3(0.008, 0.011, 0.02) * (1.0 - day);

  vec3 col = mix(sky, cloud, d * 0.96);
  col += sunCol * 30.0 * smoothstep(0.99975, 0.9999, mu) * (1.0 - d) * step(0.0, dir.y);

  float exposure = mix(7.0, 1.5, day);
  col = 1.0 - exp(-col * exposure);
  // Blue hour: around the horizon crossing the whole sky cools toward blue.
  float twilight = 1.0 - smoothstep(0.02, 0.16, abs(sunY - 0.02));
  col = mix(col, col * vec3(0.7, 0.86, 1.3), twilight * 0.8);


  float night = 1.0 - smoothstep(-0.2, 0.08, sunY);
  col += vec3(0.03, 0.045, 0.1) * night * (1.0 - 0.5 * uv.y);
  col += stars() * night * (1.0 - d) * (1.0 - 0.85 * uCover) * smoothstep(0.03, 0.4, dir.y);

  col += (hash(gl_FragCoord.xy + fract(uTime * 7.0) * 100.0) - 0.5) * 0.035;
  col *= 1.0 - 0.2 * dot(uv - vec2(0.5, 0.65), uv - vec2(0.5, 0.65));
  // A light hold on the range: the text halos in globals.css do the rest.
  col = uDark > 0.5 ? col * 0.8 : mix(col, vec3(0.94, 0.96, 0.99), 0.42);

  // Falling weather sits in front of everything, lit by how bright the sky is.
  float lit = mix(0.3, 1.0, day);
  if (uRain > 0.0) {
    col = mix(col, vec3(0.55, 0.6, 0.66) * lit, 0.12 * uRain); // spray haze
    float r = rainLayer(64.0, 26.0, 0.26, 0.5, 0.35 + 0.4 * uRain, 11.0) * 0.12
      + rainLayer(32.0, 22.0, 0.27, 0.7, 0.25 + 0.35 * uRain, 23.0) * 0.18
      + rainLayer(15.0, 17.0, 0.28, 0.9, 0.12 + 0.25 * uRain, 37.0) * 0.24;
    r *= (0.45 + 0.55 * uRain) * smoothstep(0.25, 0.7, uv.y); // thins out toward the content below
    // Backlit drops shine on a dark sky; against bright cloud they read as darker streaks.
    col = uDark > 0.5 ? col + vec3(0.78, 0.84, 0.92) * r * lit * 1.4 : mix(col, col * 0.72, min(r * 2.2, 1.0));
  }
  if (uSnow > 0.0) {
    float f = snowLayer(42.0, 3.0, 0.16, 0.5, 0.25 + 0.3 * uSnow, 5.0) * 0.55
      + snowLayer(20.0, 2.2, 0.14, 0.6, 0.15 + 0.25 * uSnow, 9.0) * 0.75
      + snowLayer(8.0, 1.3, 0.12, 0.9, 0.06 + 0.12 * uSnow, 13.0) * 0.55;
    f *= smoothstep(0.15, 0.6, uv.y);
    col = mix(col, vec3(0.96, 0.97, 1.0) * mix(0.55, 1.0, day), clamp(f, 0.0, 1.0));
  }
  gl_FragColor = vec4(col, 1.0);
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.warn("atmos sky:", gl.getShaderInfoLog(shader));
    return null;
  }
  return shader;
}

export function SkyCanvas(props: SkyCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const propsRef = useRef(props);
  const redrawRef = useRef<() => void>(() => {});

  useEffect(() => {
    propsRef.current = props;
    redrawRef.current();
  });

  useEffect(() => {
    const canvas = canvasRef.current;
    const gl = canvas?.getContext("webgl", { antialias: false, alpha: false });
    if (!canvas || !gl) return; // no WebGL: the page background shows instead

    const vs = compile(gl, gl.VERTEX_SHADER, VERTEX);
    const fs = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
    const program = gl.createProgram();
    if (!vs || !fs || !program) return;
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) return;
    gl.useProgram(program);

    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
    const aPos = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const u = (name: string) => gl.getUniformLocation(program, name);
    const uRes = u("uRes");
    const uTime = u("uTime");
    const uSun = u("uSun");
    const uCover = u("uCover");
    const uWet = u("uWet");
    const uDrift = u("uDrift");
    const uDark = u("uDark");
    const uRain = u("uRain");
    const uSnow = u("uSnow");
    const uSlant = u("uSlant");

    const reduce = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const start = performance.now();
    const drift = [0, 0];
    let last = start;
    let raf = 0;
    let sun = { elevation: 0, azimuth: 0 };
    let sunAt = 0;

    const resize = () => {
      canvas.width = Math.max(1, Math.round(window.innerWidth * RESOLUTION));
      canvas.height = Math.max(1, Math.round(window.innerHeight * RESOLUTION));
      gl.viewport(0, 0, canvas.width, canvas.height);
    };

    const draw = (now: number) => {
      const p = propsRef.current;
      if (now - sunAt > 30_000 || sunAt === 0) {
        sun = sunPosition(new Date(), p.latitude, p.longitude);
        sunAt = now;
      }
      const look = SKY_LOOK[p.sky];
      const cover = Math.max(look.cover, p.cloudCover / 100);

      // Clouds travel toward where the wind blows, seen from a camera facing the sun.
      const toward = ((p.windDirection + 180) * Math.PI) / 180 - sun.azimuth;
      const speed = 0.004 + p.windSpeed * 0.0007;
      const dt = Math.min(now - last, 100) / 1000;
      drift[0] -= Math.sin(toward) * speed * dt;
      drift[1] -= Math.cos(toward) * speed * dt;
      last = now;

      const e = sun.elevation;
      gl.uniform2f(uRes, canvas.width, canvas.height);
      gl.uniform1f(uTime, (now - start) / 1000);
      gl.uniform3f(uSun, Math.sin(SUN_OFFSET) * Math.cos(e), Math.sin(e), Math.cos(SUN_OFFSET) * Math.cos(e));
      gl.uniform1f(uCover, cover);
      gl.uniform1f(uWet, look.wet);
      gl.uniform2f(uDrift, drift[0], drift[1]);
      gl.uniform1f(uDark, p.dark ? 1 : 0);
      const fall = falling(p.condition, p.precipitation);
      gl.uniform1f(uRain, fall.rain);
      gl.uniform1f(uSnow, fall.snow);
      // Crosswind leans the rain: wind toward screen-right sends drops down and right.
      gl.uniform1f(uSlant, Math.max(-0.5, Math.min(0.5, Math.sin(toward) * p.windSpeed / 45)));
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (now - last >= FRAME_MS) draw(now);
    };
    const play = () => {
      if (!reduce && !raf && !document.hidden) raf = requestAnimationFrame(frame);
    };
    const pause = () => {
      cancelAnimationFrame(raf);
      raf = 0;
    };
    const onVisibility = () => (document.hidden ? pause() : play());
    const onResize = () => {
      resize();
      draw(performance.now());
    };

    redrawRef.current = () => {
      sunAt = 0;
      draw(performance.now());
    };
    resize();
    draw(start);
    play();
    // Reduced motion still follows the sun, one still frame a minute.
    const still = reduce ? window.setInterval(() => redrawRef.current(), 60_000) : 0;

    window.addEventListener("resize", onResize);
    document.addEventListener("visibilitychange", onVisibility);
    canvas.addEventListener("webglcontextlost", pause);
    return () => {
      pause();
      window.clearInterval(still);
      window.removeEventListener("resize", onResize);
      document.removeEventListener("visibilitychange", onVisibility);
      canvas.removeEventListener("webglcontextlost", pause);
      redrawRef.current = () => {};
    };
  }, []);

  return <canvas ref={canvasRef} className="sky-canvas" aria-hidden="true" />;
}
