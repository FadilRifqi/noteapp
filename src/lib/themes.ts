export type ThemeId = "frappe" | "latte" | "macchiato" | "mocha" | "paper";

export interface Theme {
  id: ThemeId;
  name: string;
  swatches: [string, string, string];
}

export const THEMES: Theme[] = [
  { id: "frappe", name: "Frappe", swatches: ["#303446", "#eebebe", "#c6d0f5"] },
  { id: "latte", name: "Latte", swatches: ["#eff1f5", "#dd7878", "#4c4f69"] },
  { id: "macchiato", name: "Macchiato", swatches: ["#24273a", "#f0c6c6", "#cad3f5"] },
  { id: "mocha", name: "Mocha", swatches: ["#1e1e2e", "#f2cdcd", "#cdd6f4"] },
  { id: "paper", name: "Paper", swatches: ["#f4efe4", "#b4552d", "#332e28"] },
];

export const DEFAULT_THEME: ThemeId = "frappe";

export function isThemeId(value: string | null): value is ThemeId {
  return THEMES.some((theme) => theme.id === value);
}
