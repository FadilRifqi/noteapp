export type FontWeight = 400 | 500 | 600;

export interface FontSetting {
  mode: "system" | "family";
  family: string;
  weight: FontWeight;
  size: number;
}

export const FONT_KEY = "archnote.font";

export const DEFAULT_FONT: FontSetting = {
  mode: "system",
  family: "",
  weight: 600,
  size: 16.5,
};

export const MIN_FONT_SIZE = 12;
export const MAX_FONT_SIZE = 24;

export const SYSTEM_FAMILY_KEY = "archnote.systemFamily";

export function readSystemFamily(): string {
  return localStorage.getItem(SYSTEM_FAMILY_KEY) ?? "";
}

export function readFont(): FontSetting {
  try {
    const raw = localStorage.getItem(FONT_KEY);
    if (!raw) return { ...DEFAULT_FONT };
    const parsed = JSON.parse(raw) as Partial<FontSetting>;
    const weight = parsed.weight === 400 || parsed.weight === 500 || parsed.weight === 600 ? parsed.weight : DEFAULT_FONT.weight;
    const size = typeof parsed.size === "number" ? Math.min(MAX_FONT_SIZE, Math.max(MIN_FONT_SIZE, parsed.size)) : DEFAULT_FONT.size;
    return {
      mode: parsed.mode === "family" ? "family" : "system",
      family: typeof parsed.family === "string" ? parsed.family : "",
      weight,
      size,
    };
  } catch {
    return { ...DEFAULT_FONT };
  }
}

export function noteFamily(setting: FontSetting, systemFamily: string): string {
  const family = setting.mode === "system" ? systemFamily : setting.family;
  return family && family.length > 0 ? family : systemFamily || "system-ui";
}

export function applyFont(
  setting: FontSetting,
  systemFamily: string,
  target: HTMLElement = document.documentElement,
) {
  target.style.setProperty("--font-note-family", `"${noteFamily(setting, systemFamily)}", var(--font-ui)`);
  target.style.setProperty("--font-note-weight", String(setting.weight));
  target.style.setProperty("--font-note-size", `${setting.size}px`);
}

export function weightName(weight: FontWeight): string {
  if (weight === 600) return "SemiBold";
  if (weight === 500) return "Medium";
  return "Regular";
}
