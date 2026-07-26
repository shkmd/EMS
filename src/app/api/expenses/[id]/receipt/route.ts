import { NextRequest, NextResponse } from "next/server"

import { apiError } from "@/lib/api-response"
import { requireSession } from "@/features/auth/session"
import { readUploadedFile, mimeTypeFromExtension } from "@/lib/storage"
import { getExpenseReceiptForDownload } from "@/features/expenses/queries"

export async function GET(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await requireSession()
    const { id } = await params
    const inline = req.nextUrl.searchParams.get("disposition") === "inline"

    const receipt = await getExpenseReceiptForDownload(id, session)
    const buffer = await readUploadedFile(receipt.receiptUrl)

    return new NextResponse(new Uint8Array(buffer), {
      headers: {
        "Content-Type": mimeTypeFromExtension(receipt.receiptUrl),
        "Content-Disposition": `${inline ? "inline" : "attachment"}; filename="${encodeURIComponent(receipt.receiptName)}"`,
      },
    })
  } catch (error) {
    return apiError(error)
  }
}
