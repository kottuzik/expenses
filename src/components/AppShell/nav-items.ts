import {
  ChartColumn,
  ChartPie,
  DatabaseBackup,
  Ellipsis,
  House,
  List,
  Lock,
  Mail,
  Tag,
  Trash2,
  Upload,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  label: string;
  icon: LucideIcon;
  href?: string; // Items without href are not built yet ("בקרוב").
};

export const MAIN_NAV: NavItem[] = [
  { label: "לוח בקרה", icon: House, href: "/" },
  { label: "הוצאות", icon: List, href: "/expenses" },
  { label: "סיכומים", icon: ChartPie, href: "/reports" },
  { label: "עוד", icon: Ellipsis, href: "/more" },
];

export const DATA_NAV: NavItem[] = [
  { label: "קטגוריות", icon: Tag },
  { label: "השוואת תקופות", icon: ChartColumn },
  { label: "ייבוא מקובץ CSV", icon: Upload },
  { label: "סל מחזור", icon: Trash2 },
  { label: "גיבויים ושחזור", icon: DatabaseBackup },
];

export const ACCESS_NAV: NavItem[] = [
  { label: "שינוי סיסמה", icon: Lock },
  { label: "כתובת Email לשחזור", icon: Mail },
];

export function isActive(href: string, pathname: string): boolean {
  return href === "/" ? pathname === "/" : pathname === href || pathname.startsWith(`${href}/`);
}
