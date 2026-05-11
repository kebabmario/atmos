/* ════════════════════════════════════════════════════════
   ATMOS — main app logic
   ════════════════════════════════════════════════════════ */

// Meteocons fill SVG icons
const ICON_BASE = "https://cdn.jsdelivr.net/gh/basmilius/weather-icons/production/fill/all";

const WMO_CODES = {
  0:  { label: "Clear",                 icon: "clear-day.svg" },
  1:  { label: "Mostly Clear",          icon: "partly-cloudy-day.svg" },
  2:  { label: "Partly Cloudy",         icon: "partly-cloudy-day.svg" },
  3:  { label: "Cloudy",                icon: "overcast.svg" },
  45: { label: "Foggy",                 icon: "fog.svg" },
  48: { label: "Icy Fog",               icon: "fog.svg" },
  51: { label: "Light Drizzle",         icon: "drizzle.svg" },
  53: { label: "Drizzle",               icon: "drizzle.svg" },
  55: { label: "Heavy Drizzle",         icon: "drizzle.svg" },
  61: { label: "Light Rain",            icon: "rain.svg" },
  63: { label: "Rain",                  icon: "rain.svg" },
  65: { label: "Heavy Rain",            icon: "rain.svg" },
  71: { label: "Light Snow",            icon: "snow.svg" },
  73: { label: "Snow",                  icon: "snow.svg" },
  75: { label: "Heavy Snow",            icon: "snow.svg" },
  77: { label: "Snow Grains",           icon: "snow.svg" },
  80: { label: "Showers",               icon: "partly-cloudy-day-rain.svg" },
  81: { label: "Showers",               icon: "partly-cloudy-day-rain.svg" },
  82: { label: "Heavy Showers",         icon: "thunderstorms-day-rain.svg" },
  85: { label: "Snow Showers",          icon: "partly-cloudy-day-snow.svg" },
  86: { label: "Heavy Snow Showers",    icon: "partly-cloudy-day-snow.svg" },
  95: { label: "Thunderstorm",          icon: "thunderstorms-day.svg" },
  96: { label: "Thunderstorm + Hail",   icon: "thunderstorms-day-rain.svg" },
  99: { label: "Heavy Thunderstorm",    icon: "thunderstorms-day-rain.svg" },
};

const WMO_NIGHT = {
  0:  "clear-night.svg",
  1:  "partly-cloudy-night.svg",
  2:  "partly-cloudy-night.svg",
  3:  "overcast-night.svg",
  45: "fog-night.svg",
  48: "fog-night.svg",
  51: "drizzle.svg",
  53: "drizzle.svg",
  55: "drizzle.svg",
  61: "rain.svg",
  63: "rain.svg",
  65: "rain.svg",
  71: "snow.svg",
  73: "snow.svg",
  75: "snow.svg",
  77: "snow.svg",
  80: "partly-cloudy-night-rain.svg",
  81: "partly-cloudy-night-rain.svg",
  82: "thunderstorms-night-rain.svg",
  85: "partly-cloudy-night-snow.svg",
  86: "partly-cloudy-night-snow.svg",
  95: "thunderstorms-night.svg",
  96: "thunderstorms-night-rain.svg",
  99: "thunderstorms-night-rain.svg",
};

// Group every WMO code into a backdrop "condition"
const CONDITION_MAP = {
  0: "sunny",  1: "sunny",
  2: "cloudy", 3: "cloudy",
  45: "foggy", 48: "foggy",
  51: "rainy", 53: "rainy", 55: "rainy",
  61: "rainy", 63: "rainy", 65: "rainy",
  71: "snowy", 73: "snowy", 75: "snowy", 77: "snowy",
  80: "rainy", 81: "rainy", 82: "rainy",
  85: "snowy", 86: "snowy",
  95: "thunder", 96: "thunder", 99: "thunder",
};

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

/* ─────────────── Sky color palettes ───────────────
   Each entry: [top, mid, bottom] gradient stops.
   Day variants are warm + bright; night variants are deep blues. */
const SKY_PALETTES = {
  sunny: {
    day:   ["#3a86c4", "#5fa9da", "#aad4ee"],
    night: ["#0a1428", "#11264a", "#264777"],
  },
  cloudy: {
    day:   ["#6f8ba6", "#a0b6c6", "#cbd6df"],
    night: ["#1a2332", "#2c3a4f", "#465a73"],
  },
  rainy: {
    day:   ["#3b4756", "#5b6b7d", "#7d8b9b"],
    night: ["#0d141d", "#1a2433", "#2d3b50"],
  },
  thunder: {
    day:   ["#2a2e3a", "#454a5b", "#666b7d"],
    night: ["#080a14", "#161824", "#262a3a"],
  },
  snowy: {
    day:   ["#7e95ad", "#a9bcd1", "#dde6ef"],
    night: ["#1c2a3d", "#324559", "#4a5f78"],
  },
  foggy: {
    day:   ["#7a8693", "#a9b3bd", "#cdd4db"],
    night: ["#1d242c", "#333b46", "#4d5460"],
  },
  // sunrise/sunset accent — applied for clear conditions near horizon
  goldenDay:   ["#ff9b56", "#ffce8a", "#ffe6b8"],
  goldenNight: ["#3a2347", "#7c3a55", "#e07b5a"],
};

/* ─────────────── Helpers ─────────────── */
function getIconUrl(code, isDay = true) {
  const nightIcon = WMO_NIGHT[code];
  const dayIcon = WMO_CODES[code]?.icon || "not-available.svg";
  const filename = (!isDay && nightIcon) ? nightIcon : dayIcon;
  return `${ICON_BASE}/${filename}`;
}
function iconImg(code, isDay = true, size = 32) {
  const fallback = `${ICON_BASE}/cloudy.svg`;
  return `<img src="${getIconUrl(code, isDay)}" width="${size}" height="${size}" alt="" loading="lazy" style="display:block;" onerror="this.onerror=null;this.src='${fallback}';" />`;
}
function fmtTime(iso) {
  return new Date(iso).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}
function lerp(a, b, t) { return a + (b - a) * t; }
function hexToRgb(h) {
  const v = h.replace("#", "");
  return [parseInt(v.slice(0,2),16), parseInt(v.slice(2,4),16), parseInt(v.slice(4,6),16)];
}
function rgbToCss([r,g,b]) { return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`; }
function blendPalette(p1, p2, t) {
  return p1.map((c1, i) => {
    const c2 = p2[i];
    const r1 = hexToRgb(c1), r2 = hexToRgb(c2);
    return rgbToCss([lerp(r1[0],r2[0],t), lerp(r1[1],r2[1],t), lerp(r1[2],r2[2],t)]);
  });
}

/* ─────────────── Backdrop control ─────────────── */
function applySky(condition, isDay, sunriseISO, sunsetISO, nowISO) {
  const palette = SKY_PALETTES[condition] || SKY_PALETTES.cloudy;
  let stops = isDay ? palette.day : palette.night;

  // Blend toward golden-hour palette near sunrise/sunset (only for clear/sunny)
  try {
    if ((condition === "sunny" || condition === "cloudy")) {
      const now = localHoursOfDay(nowISO);
      const sr  = localHoursOfDay(sunriseISO);
      const ss  = localHoursOfDay(sunsetISO);
      if (now != null && sr != null && ss != null) {
        const minDist = Math.min(Math.abs(now - sr), Math.abs(now - ss));
        if (minDist < 1) {                  // 1h window
          const t = 1 - minDist;            // peaks at exact sunrise/sunset
          const golden = isDay ? SKY_PALETTES.goldenDay : SKY_PALETTES.goldenNight;
          stops = blendPalette(stops, golden, Math.min(t * 0.85, 0.85));
        }
      }
    }
  } catch (e) { /* non-fatal */ }

  const root = document.documentElement;
  root.style.setProperty("--sky-top",    stops[0]);
  root.style.setProperty("--sky-mid",    stops[1]);
  root.style.setProperty("--sky-bottom", stops[2]);

  // Sky glow — a soft radial highlight that replaces a discrete sun/moon
  // and sits behind everything so it never bleeds through cards.
  const glow = computeGlow(condition, isDay, sunriseISO, sunsetISO, nowISO);
  root.style.setProperty("--glow-x",       glow.x);
  root.style.setProperty("--glow-y",       glow.y);
  root.style.setProperty("--glow-color",   glow.color);
  root.style.setProperty("--glow-opacity", glow.opacity);

  document.body.dataset.condition = condition;
  document.body.dataset.time = isDay ? "day" : "night";
}

function computeGlow(condition, isDay, sunriseISO, sunsetISO, nowISO) {
  // Default: warm sun upper-left for day, soft moon upper-right for night
  let color   = isDay ? "rgba(255, 217, 122, 0.65)" : "rgba(220, 230, 255, 0.32)";
  let opacity = 0.9;
  let x = isDay ? "20%" : "78%";
  let y = "10%";

  // Sun position interpolation across the day (left → right)
  try {
    const sr  = localHoursOfDay(sunriseISO);
    const ss  = localHoursOfDay(sunsetISO);
    const now = localHoursOfDay(nowISO);
    if (isDay && sr != null && ss != null && now != null && ss > sr) {
      let t = (now - sr) / (ss - sr);
      t = Math.max(0, Math.min(1, t));
      const xPct = 12 + t * 76;        // 12% → 88%
      const yPct = 30 - Math.sin(t * Math.PI) * 26; // arc: dips to ~4%
      x = `${xPct.toFixed(1)}%`;
      y = `${yPct.toFixed(1)}%`;
    }
  } catch (_) { /* fall back to defaults */ }

  // Tone the glow per condition
  switch (condition) {
    case "sunny":
      color = isDay ? "rgba(255, 217, 122, 0.75)" : "rgba(225, 230, 255, 0.45)";
      opacity = isDay ? 1 : 0.85;
      break;
    case "cloudy":
      color = isDay ? "rgba(255, 230, 170, 0.35)" : "rgba(200, 210, 230, 0.25)";
      opacity = 0.55;
      break;
    case "rainy":
      color = "rgba(180, 200, 230, 0.18)";
      opacity = 0.45;
      break;
    case "thunder":
      color = "rgba(150, 160, 200, 0.15)";
      opacity = 0.35;
      break;
    case "snowy":
      color = isDay ? "rgba(255, 255, 255, 0.40)" : "rgba(190, 210, 240, 0.30)";
      opacity = 0.7;
      break;
    case "foggy":
      color = "rgba(255, 255, 255, 0.25)";
      opacity = 0.5;
      break;
  }

  // Warm sunrise/sunset bias (only clear-ish conditions)
  try {
    if ((condition === "sunny" || condition === "cloudy")) {
      const sr  = localHoursOfDay(sunriseISO);
      const ss  = localHoursOfDay(sunsetISO);
      const now = localHoursOfDay(nowISO);
      if (sr != null && ss != null && now != null) {
        const dist = Math.min(Math.abs(now - sr), Math.abs(now - ss));
        if (dist < 1) { // within 1 hour of sunrise or sunset
          color = "rgba(255, 150, 90, 0.65)"; // golden hour
          opacity = 0.95;
        }
      }
    }
  } catch (_) {}

  return { x, y, color, opacity };
}

/* ─────────────── tsparticles configs ─────────────── */
const PARTICLE_CONFIGS = {
  rainy: {
    fpsLimit: 60,
    particles: {
      number: { value: 220, density: { enable: true, area: 800 } },
      color:  { value: "#cfe3ff" },
      shape:  { type: "line" },
      stroke: { width: 1, color: "#cfe3ff" },
      opacity:{ value: 0.55, random: { enable: true, minimumValue: 0.25 } },
      size:   { value: { min: 6, max: 14 } },
      move: {
        enable: true,
        speed: { min: 22, max: 32 },
        direction: "bottom",
        straight: true,
        outModes: { default: "out" },
      },
      rotate: {
        value: 8,                          // slight slant
        direction: "clockwise",
        animation: { enable: false },
      },
      tilt: { enable: false },
    },
    detectRetina: true,
    background: { color: "transparent" },
  },

  thunder: {
    fpsLimit: 60,
    particles: {
      number: { value: 280, density: { enable: true, area: 800 } },
      color:  { value: "#bcd0ee" },
      shape:  { type: "line" },
      stroke: { width: 1.2, color: "#bcd0ee" },
      opacity:{ value: 0.65, random: { enable: true, minimumValue: 0.3 } },
      size:   { value: { min: 8, max: 16 } },
      move: {
        enable: true,
        speed: { min: 28, max: 38 },
        direction: "bottom",
        straight: true,
        outModes: { default: "out" },
      },
      rotate: { value: 12, direction: "clockwise" },
    },
    detectRetina: true,
    background: { color: "transparent" },
  },

  snowy: {
    fpsLimit: 60,
    particles: {
      number: { value: 140, density: { enable: true, area: 800 } },
      color:  { value: "#ffffff" },
      shape:  { type: "circle" },
      opacity:{ value: 0.8, random: { enable: true, minimumValue: 0.4 } },
      size:   { value: { min: 1.5, max: 4 } },
      move: {
        enable: true,
        speed: { min: 1.2, max: 2.8 },
        direction: "bottom",
        straight: false,
        outModes: { default: "out" },
        wobble: { enable: true, distance: 12, speed: 10 },
      },
    },
    detectRetina: true,
    background: { color: "transparent" },
    interactivity: {
      events: { onHover: { enable: true, mode: "bubble" } },
      modes:  { bubble: { distance: 80, size: 5, duration: 2, opacity: 1 } },
    },
  },

  // light dust motes for sunny day
  sunny: {
    fpsLimit: 60,
    particles: {
      number: { value: 24, density: { enable: true, area: 1000 } },
      color:  { value: "#fff7c8" },
      shape:  { type: "circle" },
      opacity:{ value: 0.25, random: { enable: true, minimumValue: 0.05 } },
      size:   { value: { min: 1, max: 3 } },
      move: {
        enable: true,
        speed: { min: 0.4, max: 1.0 },
        direction: "none",
        straight: false,
        outModes: { default: "out" },
        random: true,
      },
    },
    detectRetina: true,
    background: { color: "transparent" },
  },

  // shooting stars for clear nights
  starsNight: {
    fpsLimit: 60,
    particles: {
      number: { value: 80, density: { enable: true, area: 1000 } },
      color:  { value: "#ffffff" },
      shape:  { type: "circle" },
      opacity:{
        value: { min: 0.3, max: 1 },
        animation: { enable: true, speed: 1.2, sync: false },
      },
      size: { value: { min: 0.5, max: 1.6 } },
      move: { enable: false },
    },
    detectRetina: true,
    background: { color: "transparent" },
  },

  foggy: {
    fpsLimit: 30,
    particles: { number: { value: 0 } },
    background: { color: "transparent" },
  },

  cloudy: {
    fpsLimit: 30,
    particles: { number: { value: 0 } },
    background: { color: "transparent" },
  },
};

let particlesContainer = null;

async function setParticles(condition, isDay) {
  if (!window.tsParticles) return;

  // Pick config
  let cfg;
  if (condition === "rainy")        cfg = PARTICLE_CONFIGS.rainy;
  else if (condition === "thunder") cfg = PARTICLE_CONFIGS.thunder;
  else if (condition === "snowy")   cfg = PARTICLE_CONFIGS.snowy;
  else if (condition === "foggy")   cfg = PARTICLE_CONFIGS.foggy;
  else if (condition === "cloudy")  cfg = PARTICLE_CONFIGS.cloudy;
  else if (condition === "sunny" && isDay)  cfg = PARTICLE_CONFIGS.sunny;
  else if (condition === "sunny" && !isDay) cfg = PARTICLE_CONFIGS.starsNight;
  else cfg = PARTICLE_CONFIGS.cloudy;

  // Replace existing container
  if (particlesContainer) {
    try { particlesContainer.destroy(); } catch (_) {}
    particlesContainer = null;
  }
  particlesContainer = await tsParticles.load({ id: "tsparticles", options: cfg });
}

/* ─────────────── Lightning ─────────────── */
let thunderTimer = null;
function startThunder() {
  stopThunder();
  const el = document.getElementById("lightning");
  const trigger = () => {
    el.classList.remove("flash");
    void el.offsetWidth;          // restart animation
    el.classList.add("flash");
  };
  // first flash after a beat, then random intervals
  thunderTimer = setTimeout(function loop() {
    trigger();
    const next = 4000 + Math.random() * 9000;
    thunderTimer = setTimeout(loop, next);
  }, 1500);
}
function stopThunder() {
  if (thunderTimer) clearTimeout(thunderTimer);
  thunderTimer = null;
  document.getElementById("lightning").classList.remove("flash");
}

/* ─────────────── Sun arc ─────────────── */
/* Parse "YYYY-MM-DDTHH:MM" as the location's local clock, returning hours-of-day.
   Open-Meteo returns timezone-local ISO strings without an offset, so naive
   `new Date(...)` parsing reinterprets them in the browser's TZ — wrong when
   the user views a city in a different timezone. */
function localHoursOfDay(iso) {
  const m = String(iso).match(/T(\d{2}):(\d{2})/);
  if (!m) return null;
  return parseInt(m[1], 10) + parseInt(m[2], 10) / 60;
}

function renderSunArc(sunriseISO, sunsetISO, nowISO) {
  const arcFill = document.getElementById("sunArcFill");
  const dot     = document.getElementById("sunDot");
  if (!arcFill || !dot) return;

  const sr  = localHoursOfDay(sunriseISO);
  const ss  = localHoursOfDay(sunsetISO);
  const now = localHoursOfDay(nowISO);
  let t = (sr != null && ss != null && now != null && ss > sr)
        ? (now - sr) / (ss - sr)
        : 0;
  t = Math.max(0, Math.min(1, t));

  // Sample point on quadratic Bezier matching path "M10 90 Q100 -20 190 90"
  const p0 = { x: 10,  y: 90 };
  const p1 = { x: 100, y: -20 };
  const p2 = { x: 190, y: 90 };
  const x = (1-t)*(1-t)*p0.x + 2*(1-t)*t*p1.x + t*t*p2.x;
  const y = (1-t)*(1-t)*p0.y + 2*(1-t)*t*p1.y + t*t*p2.y;
  dot.setAttribute("cx", x.toFixed(1));
  dot.setAttribute("cy", y.toFixed(1));

  // Approximate arc length and reveal up to t
  const totalLen = arcFill.getTotalLength ? arcFill.getTotalLength() : 220;
  const visible = totalLen * t;
  arcFill.setAttribute("stroke-dasharray", `${visible} ${totalLen}`);
}

/* ─────────────── Wind compass ─────────────── */
function renderWindCompass(speedKmh, dirDeg) {
  const needle = document.getElementById("windNeedle");
  const center = document.getElementById("windCenter");
  if (needle) {
    // Meteorological direction = where wind comes FROM. Needle should point to that direction.
    needle.style.transform = `translate(-50%, -100%) rotate(${dirDeg || 0}deg)`;
  }
  if (center) {
    center.innerHTML = `${Math.round(speedKmh)}<small>km/h</small>`;
  }
}

/* ─────────────── API calls ─────────────── */
async function geocode(city) {
  const res = await fetch(
    `https://geocoding-api.open-meteo.com/v1/search?name=${encodeURIComponent(city)}&count=1`
  );
  const data = await res.json();
  if (!data.results || data.results.length === 0) throw new Error("City not found");
  return data.results[0];
}

async function fetchWeather(lat, lon, timezone) {
  const url =
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
    `&current=temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,cloud_cover,wind_speed_10m,wind_direction_10m,is_day,dew_point_2m` +
    `&hourly=temperature_2m,weather_code,is_day` +
    `&daily=weather_code,temperature_2m_max,temperature_2m_min,sunrise,sunset` +
    `&timezone=${encodeURIComponent(timezone)}` +
    `&forecast_days=7`;
  const res = await fetch(url);
  return await res.json();
}

/* ─────────────── Rendering ─────────────── */
function renderHourly(hourly) {
  const now = new Date();
  const container = document.getElementById("hourlyScroll");
  container.innerHTML = "";
  let count = 0;
  for (let i = 0; i < hourly.time.length && count < 24; i++) {
    const t = new Date(hourly.time[i]);
    if (t < now && count === 0 && i + 1 < hourly.time.length && new Date(hourly.time[i+1]) < now) continue;
    if (t < new Date(now.getTime() - 30*60*1000)) continue;
    const code = hourly.weather_code[i];
    const isDay = hourly.is_day[i] === 1;
    const label = count === 0
        ? "Now"
        : t.toLocaleTimeString([], { hour: "numeric", hour12: true }).replace(" ", "");
    container.innerHTML += `
      <div class="hourly-item${count === 0 ? " is-now" : ""}">
        <span class="hour">${label}</span>
        ${iconImg(code, isDay, 30)}
        <span class="h-temp">${Math.round(hourly.temperature_2m[i])}°</span>
      </div>`;
    count++;
  }
}

function renderWeekly(daily, currentTemp) {
  const container = document.getElementById("weeklyForecast");
  container.innerHTML = "";

  // Find global min/max across the week for the range bar
  let weekMin = Infinity, weekMax = -Infinity;
  for (let i = 0; i < daily.time.length; i++) {
    weekMin = Math.min(weekMin, daily.temperature_2m_min[i]);
    weekMax = Math.max(weekMax, daily.temperature_2m_max[i]);
  }
  const span = Math.max(1, weekMax - weekMin);

  for (let i = 0; i < daily.time.length; i++) {
    const date = new Date(daily.time[i]);
    const day  = i === 0 ? "Today" : DAYS[date.getDay()];
    const code = daily.weather_code[i];
    const lo = daily.temperature_2m_min[i];
    const hi = daily.temperature_2m_max[i];

    const left  = ((lo - weekMin) / span) * 100;
    const width = ((hi - lo) / span) * 100;

    // Marker for "now" on today's row
    let nowDot = "";
    if (i === 0 && currentTemp != null) {
      const nowPct = ((currentTemp - weekMin) / span) * 100;
      nowDot = `<div class="range-bar-now" style="left:${Math.max(0, Math.min(100, nowPct))}%"></div>`;
    }

    container.innerHTML += `
      <div class="weekly-row">
        <span class="day">${day}</span>
        <span class="w-icon-cell">${iconImg(code, true, 28)}</span>
        <div class="w-range">
          <span class="w-low">${Math.round(lo)}°</span>
          <div class="range-bar">
            <div class="range-bar-fill" style="left:${left}%; width:${width}%"></div>
            ${nowDot}
          </div>
          <span class="w-high">${Math.round(hi)}°</span>
        </div>
      </div>`;
  }
}

/* ─────────────── Main load ─────────────── */
async function loadWeather(city) {
  try {
    document.getElementById("location").textContent = "Loading...";
    document.getElementById("condition").innerHTML = "";
    document.getElementById("tempMain").textContent = "--°";

    const geo  = await geocode(city);
    const data = await fetchWeather(geo.latitude, geo.longitude, geo.timezone);

    const cur   = data.current;
    const code  = cur.weather_code;
    const isDay = cur.is_day === 1;
    const info  = WMO_CODES[code] || { label: "Unknown" };
    const condition = CONDITION_MAP[code] || "cloudy";

    // Hero
    document.getElementById("location").textContent = `${geo.name}${geo.country_code ? ", " + geo.country_code : ""}`;
    document.getElementById("tempMain").textContent = `${Math.round(cur.temperature_2m)}°`;
    document.getElementById("condition").innerHTML = `
      ${iconImg(code, isDay, 24)}
      <span>${info.label}</span>`;
    document.getElementById("tempRange").textContent =
      `H:${Math.round(data.daily.temperature_2m_max[0])}°  L:${Math.round(data.daily.temperature_2m_min[0])}°`;

    // Details
    document.getElementById("humidity").textContent   = `${cur.relative_humidity_2m}%`;
    document.getElementById("humiditySub").textContent = (cur.dew_point_2m != null)
      ? `Dew point ${Math.round(cur.dew_point_2m)}°`
      : `Dew point`;
    document.getElementById("sunrise").textContent    = fmtTime(data.daily.sunrise[0]);
    document.getElementById("sunset").textContent     = fmtTime(data.daily.sunset[0]);
    document.getElementById("feelsLike").textContent  = `${Math.round(cur.apparent_temperature)}°`;
    const diff = Math.round(cur.apparent_temperature - cur.temperature_2m);
    document.getElementById("feelsLikeSub").textContent =
      Math.abs(diff) < 1 ? "Similar to actual" :
      diff > 0 ? `${diff}° warmer than actual` : `${Math.abs(diff)}° cooler than actual`;
    document.getElementById("cloudCover").textContent = `${cur.cloud_cover}%`;
    document.getElementById("cloudBar").style.width   = `${cur.cloud_cover}%`;

    // Wind compass + sun arc
    renderWindCompass(cur.wind_speed_10m, cur.wind_direction_10m);
    renderSunArc(data.daily.sunrise[0], data.daily.sunset[0], cur.time || new Date().toISOString());

    // Backdrop
    applySky(condition, isDay, data.daily.sunrise[0], data.daily.sunset[0], cur.time);
    await setParticles(condition, isDay);
    if (condition === "thunder") startThunder(); else stopThunder();

    // Forecasts
    renderHourly(data.hourly);
    renderWeekly(data.daily, cur.temperature_2m);
  } catch (e) {
    console.error(e);
    document.getElementById("location").textContent = "City not found 😕";
    document.getElementById("condition").innerHTML = "";
  }
}

/* ─────────────── Events ─────────────── */
document.getElementById("searchBtn").addEventListener("click", () => {
  const city = document.getElementById("cityInput").value.trim();
  if (city) loadWeather(city);
});
document.getElementById("cityInput").addEventListener("keydown", (e) => {
  if (e.key === "Enter") {
    const city = e.target.value.trim();
    if (city) loadWeather(city);
  }
});

// Boot
loadWeather("New York");
