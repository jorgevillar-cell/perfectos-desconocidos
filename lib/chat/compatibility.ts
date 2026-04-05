type RawProfile = {
  universidad: string | null;
  presupuesto: number | string;
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
};

function normalize(value: string | null | undefined) {
  return (value ?? "").trim().toLowerCase();
}

function parseNumber(value: number | string | null | undefined) {
  if (typeof value === "number") return value;
  if (typeof value === "string") return Number(value);
  return 0;
}

export function computeCompatibility(mine: RawProfile | null, other: RawProfile | null) {
  if (!mine || !other) {
    return 56;
  }

  let total = 0;

  if (mine.fumar === other.fumar) total += 20;
  if (normalize(mine.horario) === normalize(other.horario)) total += 20;
  if (normalize(mine.ambiente) === normalize(other.ambiente)) total += 15;
  if (mine.mascotas === other.mascotas) total += 15;

  const sameUniversity =
    !!mine.universidad &&
    !!other.universidad &&
    normalize(mine.universidad) === normalize(other.universidad);
  if (sameUniversity) total += 15;

  const mineBudget = parseNumber(mine.presupuesto);
  const otherBudget = parseNumber(other.presupuesto);
  const maxBudget = Math.max(mineBudget, otherBudget, 1);
  const diffRatio = Math.abs(mineBudget - otherBudget) / maxBudget;
  if (diffRatio <= 0.2) total += 10;

  const mineHobbies = new Set((mine.aficiones ?? []).map((item) => normalize(item)));
  const otherHobbies = (other.aficiones ?? []).map((item) => normalize(item));
  const sharedHobby = otherHobbies.some((item) => mineHobbies.has(item));
  const sameSport = normalize(mine.deporte) === normalize(other.deporte);
  if (sharedHobby || sameSport) total += 5;

  return Math.max(0, Math.min(100, Math.round(total)));
}
