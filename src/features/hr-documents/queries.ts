import "server-only"

import { prisma } from "@/lib/prisma"
import { templateTypeValues, TEMPLATE_LABELS, DEFAULT_TEMPLATES, type TemplateType } from "@/features/hr-documents/templates"

/** The effective template for a type — the custom DB row if one exists,
 * otherwise the built-in default. Used both by the editor (to show what's
 * currently active) and by document generation. */
export async function getEffectiveTemplate(type: TemplateType) {
  const custom = await prisma.documentTemplate.findUnique({ where: { type } })
  if (custom) return { title: custom.title, bodyText: custom.bodyText, isCustomized: true }
  return { ...DEFAULT_TEMPLATES[type], isCustomized: false }
}

export async function listDocumentTemplates() {
  const customRows = await prisma.documentTemplate.findMany({
    include: { updatedBy: { select: { email: true } } },
  })
  const customByType = new Map(customRows.map((r) => [r.type, r]))

  return templateTypeValues.map((type) => {
    const custom = customByType.get(type)
    return {
      type,
      label: TEMPLATE_LABELS[type],
      title: custom?.title ?? DEFAULT_TEMPLATES[type].title,
      bodyText: custom?.bodyText ?? DEFAULT_TEMPLATES[type].bodyText,
      isCustomized: !!custom,
      updatedAt: custom?.updatedAt ?? null,
      updatedByEmail: custom?.updatedBy?.email ?? null,
    }
  })
}
