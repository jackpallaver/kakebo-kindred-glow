import {
  ShoppingCart,
  Zap,
  Car,
  Home,
  Heart,
  Gamepad2,
  GraduationCap,
  Shirt,
  PiggyBank,
  MoreHorizontal,
  Banknote,
  type LucideIcon,
} from "lucide-react";

export const CATEGORIES = [
  "alimentari",
  "bollette",
  "trasporti",
  "casa",
  "salute",
  "svago",
  "educazione",
  "abbigliamento",
  "risparmio",
  "altro",
  "stipendio",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_ICONS: Record<Category, LucideIcon> = {
  alimentari: ShoppingCart,
  bollette: Zap,
  trasporti: Car,
  casa: Home,
  salute: Heart,
  svago: Gamepad2,
  educazione: GraduationCap,
  abbigliamento: Shirt,
  risparmio: PiggyBank,
  altro: MoreHorizontal,
  stipendio: Banknote,
};

export const CATEGORY_COLORS: Record<Category, string> = {
  alimentari: "oklch(0.65 0.15 45)",
  bollette: "oklch(0.70 0.15 80)",
  trasporti: "oklch(0.60 0.14 260)",
  casa: "oklch(0.55 0.12 180)",
  salute: "oklch(0.60 0.18 15)",
  svago: "oklch(0.62 0.18 320)",
  educazione: "oklch(0.55 0.15 230)",
  abbigliamento: "oklch(0.65 0.15 350)",
  risparmio: "oklch(0.60 0.14 155)",
  altro: "oklch(0.55 0.02 220)",
  stipendio: "oklch(0.60 0.15 145)",
};