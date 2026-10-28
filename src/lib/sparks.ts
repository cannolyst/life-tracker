import bank from "@/data/sparks.json";

export const SPARK_TYPES = ["quote", "question", "thought", "word", "fact"] as const;
export type SparkType = (typeof SPARK_TYPES)[number];

export type Spark = {
  id: string;
  type: SparkType;
  text: string;
  /** Quote: the author. Word: its part of speech and meaning. Otherwise absent. */
  detail?: string;
};

export const SPARKS = bank as Spark[];
const BY_ID = new Map(SPARKS.map((s) => [s.id, s]));

export const SPARK_TYPE_LABEL: Record<SparkType, string> = {
  quote: "Quote",
  question: "Question",
  thought: "Thought experiment",
  word: "Word worth knowing",
  fact: "Surprising fact",
};

export function sparkById(id: string): Spark | undefined {
  return BY_ID.get(id);
}

// Sparks never repeat within this many days.
export const NO_REPEAT_DAYS = 365;

// Small deterministic hash + PRNG, so a user's pick for a given day is the
// same on every request and on every server, with no stored random state.
function hashString(input: string): number {
  let h = 1779033703 ^ input.length;
  for (let i = 0; i < input.length; i++) {
    h = Math.imul(h ^ input.charCodeAt(i), 3432918353);
    h = (h << 13) | (h >>> 19);
  }
  h = Math.imul(h ^ (h >>> 16), 2246822507);
  h = Math.imul(h ^ (h >>> 13), 3266489909);
  return (h ^ (h >>> 16)) >>> 0;
}

function mulberry32(seed: number): () => number {
  let a = seed;
  return () => {
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function seededShuffle<T>(items: T[], seed: number): T[] {
  const rng = mulberry32(seed);
  const out = [...items];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/** Every user walks each type's items in their own fixed order. */
function orderFor(userId: string, type: SparkType): Spark[] {
  return seededShuffle(
    SPARKS.filter((s) => s.type === type),
    hashString(`${userId}|order|${type}`),
  );
}

// Gentle: each save nudges a type's chance up a little, capped so a favorite
// type tops out at roughly twice a neglected one — never crowds the others out.
export function typeWeights(savedCounts: Partial<Record<SparkType, number>>): Record<SparkType, number> {
  const weights = {} as Record<SparkType, number>;
  for (const type of SPARK_TYPES) {
    weights[type] = 1 + Math.min(savedCounts[type] ?? 0, 10) * 0.12;
  }
  return weights;
}

/**
 * The spark for one user on one day. `usedIds` is what they were shown in the
 * previous year; anything in it is skipped, so nothing repeats within a year.
 * If a favored type runs out of unused items the pick moves to another type.
 */
export function pickSpark(opts: {
  userId: string;
  dateKey: string;
  savedCounts: Partial<Record<SparkType, number>>;
  usedIds: ReadonlySet<string>;
}): Spark {
  const { userId, dateKey, savedCounts, usedIds } = opts;
  const weights = typeWeights(savedCounts);

  let available = SPARK_TYPES.map((type) => ({
    type,
    items: orderFor(userId, type).filter((s) => !usedIds.has(s.id)),
  })).filter((entry) => entry.items.length > 0);

  // Only reachable if the whole bank was used inside the window.
  if (available.length === 0) {
    available = SPARK_TYPES.map((type) => ({ type, items: orderFor(userId, type) }));
  }

  const rng = mulberry32(hashString(`${userId}|${dateKey}`));
  const total = available.reduce((sum, entry) => sum + weights[entry.type], 0);
  let roll = rng() * total;
  for (const entry of available) {
    roll -= weights[entry.type];
    if (roll <= 0) return entry.items[0];
  }
  return available[available.length - 1].items[0];
}

export function countSavedByType(savedIds: string[]): Partial<Record<SparkType, number>> {
  const counts: Partial<Record<SparkType, number>> = {};
  for (const id of savedIds) {
    const spark = BY_ID.get(id);
    if (spark) counts[spark.type] = (counts[spark.type] ?? 0) + 1;
  }
  return counts;
}
