import { weatherSummary, type JournalFacts } from "./journal";

type Place = NonNullable<JournalFacts["place"]>;

async function getJson(url: string): Promise<unknown> {
  const res = await fetch(url, { signal: AbortSignal.timeout(6000), next: { revalidate: 3600 } });
  if (!res.ok) throw new Error(`weather ${res.status}`);
  return res.json();
}

// Looks a city name up (Open-Meteo's free geocoder, no key). Null when unknown.
export async function geocode(city: string): Promise<Place | null> {
  try {
    const data = (await getJson(
      `https://geocoding-api.open-meteo.com/v1/search?count=1&language=en&name=${encodeURIComponent(city)}`,
    )) as { results?: { name: string; latitude: number; longitude: number }[] };
    const hit = data.results?.[0];
    return hit ? { name: hit.name, lat: hit.latitude, lon: hit.longitude } : null;
  } catch {
    return null;
  }
}

// The day's weather for a place, in Fahrenheit. Null if the service is down.
export async function dayWeather(
  place: Place,
  tz: string,
  dateKey: string,
): Promise<NonNullable<JournalFacts["weather"]> | null> {
  try {
    const data = (await getJson(
      `https://api.open-meteo.com/v1/forecast?latitude=${place.lat}&longitude=${place.lon}` +
        `&daily=weather_code,temperature_2m_max,temperature_2m_min&temperature_unit=fahrenheit` +
        `&timezone=${encodeURIComponent(tz)}&start_date=${dateKey}&end_date=${dateKey}`,
    )) as { daily?: { weather_code: number[]; temperature_2m_max: number[]; temperature_2m_min: number[] } };
    const daily = data.daily;
    if (!daily || daily.weather_code?.[0] == null) return null;
    return {
      summary: weatherSummary(daily.weather_code[0]),
      high: daily.temperature_2m_max[0],
      low: daily.temperature_2m_min[0],
    };
  } catch {
    return null;
  }
}
