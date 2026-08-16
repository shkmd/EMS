import type { LucideIcon } from "lucide-react"
import {
  LayoutDashboard,
  Users,
  Building2,
  IdCard,
  Clock,
  CalendarDays,
  PartyPopper,
  Wallet,
  Target,
  Laptop,
  Megaphone,
  FileBarChart,
  Settings,
  History,
  Receipt,
  MessageSquare,
  FolderKanban,
  BellRing,
  LogIn,
  LogOut,
} from "lucide-react"

import type { Role } from "@prisma/client"

export type NavItem = {
  label: string
  href: string
  icon: LucideIcon
  /** Omit to allow every role. */
  roles?: Role[]
  /** Modules not yet built — rendered disabled with a "Soon" badge. */
  comingSoon?: boolean
}

export type NavGroup = {
  label: string
  items: NavItem[]
}

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [{ label: "Dashboard", href: "/dashboard", icon: LayoutDashboard }],
  },
  {
    label: "Workforce",
    items: [
      { label: "Employees", href: "/employees", icon: Users, roles: ["SUPER_ADMIN", "HR", "MANAGER"] },
      { label: "Departments", href: "/departments", icon: Building2, roles: ["SUPER_ADMIN", "HR"] },
      { label: "Designations", href: "/designations", icon: IdCard, roles: ["SUPER_ADMIN", "HR"] },
      { label: "Onboarding", href: "/onboarding", icon: LogIn, roles: ["SUPER_ADMIN", "HR"] },
      { label: "Offboarding", href: "/offboarding", icon: LogOut, roles: ["SUPER_ADMIN", "HR"] },
    ],
  },
  {
    label: "Time & Leave",
    items: [
      { label: "Attendance", href: "/attendance", icon: Clock },
      { label: "Leave", href: "/leave", icon: CalendarDays },
      { label: "Holidays", href: "/holidays", icon: PartyPopper },
    ],
  },
  {
    label: "Payroll & Performance",
    items: [
      { label: "Payroll", href: "/payroll", icon: Wallet },
      { label: "Expenses", href: "/expenses", icon: Receipt },
      { label: "Performance", href: "/performance", icon: Target },
    ],
  },
  {
    label: "Projects",
    items: [{ label: "Projects", href: "/projects", icon: FolderKanban }],
  },
  {
    label: "Resources",
    items: [
      { label: "Assets", href: "/assets", icon: Laptop },
      { label: "Announcements", href: "/announcements", icon: Megaphone },
      { label: "Messages", href: "/messages", icon: MessageSquare },
      { label: "Subscriptions", href: "/subscriptions", icon: BellRing, roles: ["SUPER_ADMIN", "HR"] },
    ],
  },
  {
    label: "Insights",
    items: [{ label: "Reports", href: "/reports", icon: FileBarChart, roles: ["SUPER_ADMIN", "HR"] }],
  },
  {
    label: "Administration",
    items: [
      { label: "Settings", href: "/settings", icon: Settings, roles: ["SUPER_ADMIN", "HR"] },
      { label: "Audit Logs", href: "/audit-logs", icon: History, roles: ["SUPER_ADMIN"] },
    ],
  },
]
