import {
  Building2,
  FileText,
  LayoutDashboard,
  Package,
  Settings,
  Users,
  type LucideIcon,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: LucideIcon;
};

export const navItems: NavItem[] = [
  { href: "/etusivu", label: "Etusivu", icon: LayoutDashboard },
  { href: "/laskut", label: "Laskut", icon: FileText },
  { href: "/asiakkaat", label: "Asiakkaat", icon: Users },
  { href: "/tuotteet", label: "Tuotteet", icon: Package },
  { href: "/yritys", label: "Yritys", icon: Building2 },
  { href: "/asetukset", label: "Asetukset", icon: Settings },
];

export function isNavItemActive(pathname: string, href: string): boolean {
  if (href === "/") {
    return pathname === "/";
  }

  return pathname === href || pathname.startsWith(`${href}/`);
}
