const DEFAULT_LOCATION = {
  // Dhaka, Bangladesh (reasonable default for this project)
  latitude: 23.8103,
  longitude: 90.4125,
};

const isFiniteNumber = (value) => Number.isFinite(value) && !Number.isNaN(value);

const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

const normalizeDateOnly = (dateString) => {
  // Accepts YYYY-MM-DD or any ISO date; returns YYYY-MM-DD
  const date = new Date(dateString);
  if (Number.isNaN(date.getTime())) return null;
  return date.toISOString().slice(0, 10);
};

const normalizeTimeOnly = (timeString) => {
  // Accept HH:MM (24h)
  if (!timeString) return null;
  const match = String(timeString).trim().match(/^([01]\d|2[0-3]):([0-5]\d)$/);
  if (!match) return null;
  return `${match[1]}:${match[2]}`;
};

const minutesSinceMidnight = (timeHHMM) => {
  const [hh, mm] = String(timeHHMM).split(":").map((v) => Number(v));
  if (!Number.isFinite(hh) || !Number.isFinite(mm)) return null;
  return hh * 60 + mm;
};

const pickClosestHourlyIndex = (hourlyTimes, desiredMinutes) => {
  if (!Array.isArray(hourlyTimes) || hourlyTimes.length === 0) return -1;
  if (!Number.isFinite(desiredMinutes)) return 0;

  let bestIndex = 0;
  let bestDiff = Number.POSITIVE_INFINITY;

  for (let i = 0; i < hourlyTimes.length; i++) {
    const t = hourlyTimes[i];
    const hh = Number(String(t).slice(11, 13));
    const mm = Number(String(t).slice(14, 16));
    if (!Number.isFinite(hh) || !Number.isFinite(mm)) continue;
    const currentMinutes = hh * 60 + mm;
    const diff = Math.abs(currentMinutes - desiredMinutes);
    if (diff < bestDiff) {
      bestDiff = diff;
      bestIndex = i;
    }
  }

  return bestIndex;
};

// In-memory cache: key -> { expiresAt, payload }
const cache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

export const getWeatherForDate = async (req, res) => {
  try {
    const { date, time, latitude, longitude } = req.query;

    const normalizedDate = normalizeDateOnly(date);
    if (!normalizedDate) {
      return res.status(400).json({ message: "Invalid or missing 'date'. Use YYYY-MM-DD." });
    }

    const normalizedTime = normalizeTimeOnly(time);
    if (time !== undefined && !normalizedTime) {
      return res.status(400).json({ message: "Invalid 'time'. Use HH:MM (24-hour)." });
    }

    const parsedLat = latitude === undefined ? DEFAULT_LOCATION.latitude : Number(latitude);
    const parsedLon = longitude === undefined ? DEFAULT_LOCATION.longitude : Number(longitude);

    if (!isFiniteNumber(parsedLat) || !isFiniteNumber(parsedLon)) {
      return res
        .status(400)
        .json({ message: "Invalid 'latitude' or 'longitude'. Must be numbers." });
    }

    const safeLat = clamp(parsedLat, -90, 90);
    const safeLon = clamp(parsedLon, -180, 180);

    const cacheKey = `${normalizedDate}|${normalizedTime || "_"}|${safeLat.toFixed(4)}|${safeLon.toFixed(4)}`;
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ source: "cache", ...cached.payload });
    }

    const url = new URL("https://api.open-meteo.com/v1/forecast");
    url.searchParams.set("latitude", String(safeLat));
    url.searchParams.set("longitude", String(safeLon));
    url.searchParams.set(
      "daily",
      [
        "weather_code",
        "temperature_2m_max",
        "temperature_2m_min",
        "precipitation_sum",
        "wind_speed_10m_max",
      ].join(",")
    );

    if (normalizedTime) {
      url.searchParams.set(
        "hourly",
        [
          "weather_code",
          "temperature_2m",
          "precipitation",
          "precipitation_probability",
          "wind_speed_10m",
        ].join(",")
      );
    }
    url.searchParams.set("timezone", "auto");
    url.searchParams.set("start_date", normalizedDate);
    url.searchParams.set("end_date", normalizedDate);

    const response = await fetch(url);
    if (!response.ok) {
      const body = await response.text().catch(() => "");
      return res.status(502).json({ message: "Failed to fetch weather from Open-Meteo", detail: body });
    }

    const data = await response.json();

    const dailyTime = data?.daily?.time?.[0];
    const tempMax = data?.daily?.temperature_2m_max?.[0];
    const tempMin = data?.daily?.temperature_2m_min?.[0];
    const precipitationSum = data?.daily?.precipitation_sum?.[0];
    const windMax = data?.daily?.wind_speed_10m_max?.[0];
    const weatherCode = data?.daily?.weather_code?.[0];

    const payload = {
      location: { latitude: safeLat, longitude: safeLon },
      date: dailyTime || normalizedDate,
      units: {
        temperature: data?.daily_units?.temperature_2m_max || "°C",
        precipitation: data?.daily_units?.precipitation_sum || "mm",
        wind: data?.daily_units?.wind_speed_10m_max || "km/h",
      },
      daily: {
        weatherCode: weatherCode ?? null,
        tempMax: isFiniteNumber(tempMax) ? tempMax : null,
        tempMin: isFiniteNumber(tempMin) ? tempMin : null,
        precipitationSum: isFiniteNumber(precipitationSum) ? precipitationSum : null,
        windSpeedMax: isFiniteNumber(windMax) ? windMax : null,
      },
      source: "open-meteo",
    };

    if (normalizedTime) {
      const desiredMinutes = minutesSinceMidnight(normalizedTime);
      const hourlyTimes = data?.hourly?.time || [];
      const idx = pickClosestHourlyIndex(hourlyTimes, desiredMinutes);

      payload.hourlyUnits = {
        temperature: data?.hourly_units?.temperature_2m || "°C",
        precipitation: data?.hourly_units?.precipitation || "mm",
        precipitationProbability: data?.hourly_units?.precipitation_probability || "%",
        wind: data?.hourly_units?.wind_speed_10m || "km/h",
      };

      payload.hourlySelected = {
        requestedTime: normalizedTime,
        time: hourlyTimes?.[idx] ?? null,
        weatherCode: data?.hourly?.weather_code?.[idx] ?? null,
        temperature: isFiniteNumber(data?.hourly?.temperature_2m?.[idx])
          ? data.hourly.temperature_2m[idx]
          : null,
        precipitation: isFiniteNumber(data?.hourly?.precipitation?.[idx])
          ? data.hourly.precipitation[idx]
          : null,
        precipitationProbability: isFiniteNumber(data?.hourly?.precipitation_probability?.[idx])
          ? data.hourly.precipitation_probability[idx]
          : null,
        windSpeed: isFiniteNumber(data?.hourly?.wind_speed_10m?.[idx])
          ? data.hourly.wind_speed_10m[idx]
          : null,
      };
    }

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return res.json(payload);
  } catch (error) {
    console.error("Open-Meteo weather error:", error);
    return res.status(500).json({ message: "Server error while fetching weather" });
  }
};

export const getDiseaseStats = async (req, res) => {
  try {
    const cacheKey = "disease-stats|covid-global+bd-malaria+bd-measles+bd-rabies";
    const cached = cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return res.json({ source: "cache", ...cached.payload });
    }

    const covidUrl = "https://disease.sh/v3/covid-19/all";
    const covidHistoricalUrl = "https://disease.sh/v3/covid-19/historical/all?lastdays=3";
    const whoLatestUrl = (indicatorCode) =>
      `https://ghoapi.azureedge.net/api/${indicatorCode}?$filter=SpatialDim%20eq%20%27BGD%27&$orderby=TimeDim%20desc&$top=10`;

    const coerceWhoNumeric = (numericValue, rawValue) => {
      if (numericValue !== undefined && numericValue !== null) {
        const n = Number(numericValue);
        return Number.isFinite(n) ? n : null;
      }

      const raw = typeof rawValue === "string" ? rawValue.trim() : "";
      if (!raw) return null;
      const normalized = raw.replace(/,/g, "").replace(/\s+/g, "");
      const n = Number(normalized);
      return Number.isFinite(n) ? n : null;
    };

    const fetchWhoLatest = async (indicatorCode, kind) => {
      try {
        const response = await fetch(whoLatestUrl(indicatorCode));
        if (!response.ok) {
          const body = await response.text().catch(() => "");
          return { ok: false, error: { message: `Failed to fetch ${indicatorCode} from WHO GHO`, detail: body } };
        }

        const data = await response.json();
        const rows = Array.isArray(data?.value) ? data.value : [];

        let selectedRow = rows[0] || null;
        let numeric = selectedRow ? coerceWhoNumeric(selectedRow.NumericValue, selectedRow.Value) : null;

        if (numeric === null && rows.length > 1) {
          for (const r of rows) {
            const candidate = coerceWhoNumeric(r?.NumericValue, r?.Value);
            if (candidate !== null) {
              selectedRow = r;
              numeric = candidate;
              break;
            }
          }
        }

        return {
          ok: true,
          data: {
            source: "who-gho",
            indicator: indicatorCode,
            country: "Bangladesh",
            iso3: "BGD",
            year: selectedRow?.TimeDim ?? null,
            ...(kind === "deaths" ? { deaths: numeric } : { cases: numeric }),
          },
        };
      } catch (error) {
        return { ok: false, error: { message: `WHO GHO request failed for ${indicatorCode}` } };
      }
    };

    const [covidResult, malariaResult, measlesResult, rabiesDeathsResult] = await Promise.all([
      (async () => {
        try {
          const [currentRes, historicalRes] = await Promise.all([
            fetch(covidUrl),
            fetch(covidHistoricalUrl),
          ]);

          if (!currentRes.ok) {
            const body = await currentRes.text().catch(() => "");
            return { ok: false, error: { message: "Failed to fetch stats from disease.sh", detail: body } };
          }

          const data = await currentRes.json();

          const parseUsShortDateKey = (key) => {
            // disease.sh historical keys are typically M/D/YY
            const raw = typeof key === "string" ? key.trim() : "";
            const match = raw.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
            if (!match) return null;
            const m = Number(match[1]);
            const d = Number(match[2]);
            const yy = Number(match[3]);
            if (!Number.isFinite(m) || !Number.isFinite(d) || !Number.isFinite(yy)) return null;
            const year = 2000 + yy;
            return new Date(Date.UTC(year, m - 1, d));
          };

          const computeRecoveredDelta = async () => {
            if (!historicalRes.ok) return null;
            const historical = await historicalRes.json().catch(() => null);
            const recoveredSeries = historical?.recovered && typeof historical.recovered === "object" ? historical.recovered : null;
            if (!recoveredSeries) return null;

            const entries = Object.entries(recoveredSeries)
              .map(([k, v]) => ({
                key: k,
                date: parseUsShortDateKey(k),
                value: Number(v),
              }))
              .filter((e) => e.date instanceof Date && !Number.isNaN(e.date.getTime()) && Number.isFinite(e.value));

            if (entries.length < 2) return null;

            entries.sort((a, b) => a.date.getTime() - b.date.getTime());
            const last = entries[entries.length - 1];
            const prev = entries[entries.length - 2];
            const delta = last.value - prev.value;
            return Number.isFinite(delta) ? delta : null;
          };

          const computedTodayRecovered = await computeRecoveredDelta();
          const todayRecoveredRaw = data?.todayRecovered ?? null;
          const todayRecovered = Number.isFinite(Number(computedTodayRecovered))
            ? Number(computedTodayRecovered)
            : (todayRecoveredRaw ?? null);

          const casesNum = Number(data?.cases);
          const deathsNum = Number(data?.deaths);
          const recoveredNum = Number(data?.recovered);
          const activeComputed =
            Number.isFinite(casesNum) && Number.isFinite(deathsNum) && Number.isFinite(recoveredNum)
              ? Math.max(0, casesNum - deathsNum - recoveredNum)
              : null;

          const criticalRaw = data?.critical ?? null;
          const criticalNum = Number(criticalRaw);
          const criticalSanitized = (() => {
            if (!Number.isFinite(criticalNum) || criticalNum < 0) return null;
            if (Number.isFinite(activeComputed) && criticalNum > activeComputed) return null;
            return criticalNum;
          })();

          return {
            ok: true,
            data: {
              source: "disease.sh",
              updated: data?.updated ?? null,
              cases: data?.cases ?? null,
              todayCases: data?.todayCases ?? null,
              deaths: data?.deaths ?? null,
              todayDeaths: data?.todayDeaths ?? null,
              recovered: data?.recovered ?? null,
              todayRecovered,
              todayRecoveredComputed: computedTodayRecovered ?? null,
              active: activeComputed ?? (data?.active ?? null),
              activeComputed,
              critical: criticalSanitized,
              criticalRaw,
            },
          };
        } catch (error) {
          return { ok: false, error: { message: "Disease.sh request failed" } };
        }
      })(),
      fetchWhoLatest("MALARIA_CONF_CASES", "cases"),
      fetchWhoLatest("WHS3_62", "cases"),
      fetchWhoLatest("NTD_RAB2", "deaths"),
    ]);

    const payload = {
      source: "combined",
      covid: covidResult.ok ? covidResult.data : null,
      malariaBangladesh: malariaResult.ok ? malariaResult.data : null,
      measlesBangladesh: measlesResult.ok ? measlesResult.data : null,
      rabiesBangladeshDeaths: rabiesDeathsResult.ok ? rabiesDeathsResult.data : null,
      errors: {
        covid: covidResult.ok ? null : covidResult.error,
        malariaBangladesh: malariaResult.ok ? null : malariaResult.error,
        measlesBangladesh: measlesResult.ok ? null : measlesResult.error,
        rabiesBangladeshDeaths: rabiesDeathsResult.ok ? null : rabiesDeathsResult.error,
      },
    };

    if (
      !payload.covid &&
      !payload.malariaBangladesh &&
      !payload.measlesBangladesh &&
      !payload.rabiesBangladeshDeaths
    ) {
      return res.status(502).json({
        message: "Failed to fetch disease stats from upstream providers",
        errors: payload.errors,
      });
    }

    cache.set(cacheKey, { expiresAt: Date.now() + CACHE_TTL_MS, payload });
    return res.json(payload);
  } catch (error) {
    console.error("Disease stats error:", error);
    return res.status(500).json({ message: "Server error while fetching disease stats" });
  }
};

export const translateText = async (req, res) => {
  try {
    const { q, text, source, target, format } = req.body || {};

    const rawText = typeof q === "string" ? q : typeof text === "string" ? text : "";
    const trimmedText = rawText.trim();
    const sourceLang = typeof source === "string" && source.trim() ? source.trim() : "auto";
    const targetLang = typeof target === "string" ? target.trim() : "";
    const fmt = typeof format === "string" && format.trim() ? format.trim() : "text";

    if (!trimmedText) {
      return res.status(400).json({ message: "Missing text. Provide 'q' (or 'text')." });
    }

    if (!targetLang) {
      return res.status(400).json({ message: "Missing target language. Provide 'target'." });
    }

    // Apertium public API (no API key) - note: language support is limited.
    // Docs / examples: https://www.apertium.org/apy/translate?langpair=eng|spa&q=Hello
    const base = String(process.env.APERTIUM_URL || "https://www.apertium.org/apy").replace(/\/+$/, "");
    const endpoint = `${base}/translate`;

    // Map common 2-letter codes to Apertium codes when possible.
    const codeMap = {
      en: "eng",
      es: "spa",
      ca: "cat",
      gl: "glg",
      eo: "epo",
      sh: "hbs",
      hr: "hbs_HR",
      sr: "hbs_SR",
      bs: "hbs_BS",
    };

    const normalizeCode = (lang) => {
      const raw = typeof lang === "string" ? lang.trim() : "";
      if (!raw) return "";
      const lower = raw.toLowerCase();
      // Apertium does not support auto-detect.
      if (lower === "auto") return "";
      return codeMap[lower] || raw;
    };

    const src = normalizeCode(sourceLang);
    const tgt = normalizeCode(targetLang);

    if (!src) {
      return res.status(400).json({ message: "Missing source language for Apertium. Provide 'source' (e.g., en)." });
    }

    const url = new URL(endpoint);
    url.searchParams.set("langpair", `${src}|${tgt}`);
    url.searchParams.set("q", trimmedText);

    const response = await fetch(url);
    const contentType = String(response.headers.get("content-type") || "").toLowerCase();
    const bodyText = await response.text().catch(() => "");

    if (!response.ok) {
      return res.status(502).json({
        message: "Failed to translate text",
        providerUrl: base,
        detail: bodyText.slice(0, 500),
      });
    }

    if (!contentType.includes("application/json")) {
      return res.status(502).json({
        message: "Translation provider returned non-JSON response",
        providerUrl: base,
        detail: bodyText.slice(0, 500),
      });
    }

    const data = (() => {
      try {
        return JSON.parse(bodyText);
      } catch {
        return null;
      }
    })();

    const translatedText = data?.responseData?.translatedText;
    const responseStatus = data?.responseStatus;
    const responseDetails = data?.responseDetails;

    if (typeof translatedText !== "string") {
      const message =
        typeof responseDetails === "string" && responseDetails.trim()
          ? responseDetails
          : "Apertium returned an invalid response (possibly unsupported language pair)";

      return res.status(502).json({
        message,
        providerUrl: base,
        detail: { responseStatus, responseDetails, raw: data },
      });
    }

    return res.json({
      source: "apertium",
      providerUrl: base,
      format: fmt,
      translatedText,
      raw: data,
    });
  } catch (error) {
    console.error("Apertium translate error:", error);
    return res.status(500).json({ message: "Server error while translating" });
  }
};
