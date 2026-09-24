import Link from "next/link"
import { Download } from "lucide-react"

import { Button } from "@/components/ui/button"

export function DownloadReportButton() {
  return (
    <Button asChild>
      <Link href="/reports">
        <Download />
        Download Report
      </Link>
    </Button>
  )
}
