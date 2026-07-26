import { Separator } from "@/components/ui/separator"
import { SidebarTrigger } from "@/components/ui/sidebar"
import { PageBreadcrumb } from "@/components/layout/page-breadcrumb"
import { GlobalSearch } from "@/components/layout/global-search"
import { NotificationsMenu } from "@/components/layout/notifications-menu"
import { UserMenu } from "@/components/layout/user-menu"
import { ThemeToggle } from "@/components/shared/theme-toggle"
import type { Role } from "@prisma/client"

type TopbarProps = {
  name: string
  email: string
  role: Role
  avatarUrl?: string | null
}

export function Topbar({ name, email, role, avatarUrl }: TopbarProps) {
  return (
    <header className="flex h-14 shrink-0 items-center gap-2 border-b bg-background px-4">
      <SidebarTrigger />
      <Separator orientation="vertical" className="h-5" />
      <PageBreadcrumb />
      <div className="ml-auto flex items-center gap-2">
        <GlobalSearch role={role} />
        <NotificationsMenu />
        <ThemeToggle />
        <UserMenu name={name} email={email} role={role} avatarUrl={avatarUrl} />
      </div>
    </header>
  )
}
