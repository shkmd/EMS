import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { canManageHolidays } from "@/features/holidays/authorization";
import { listHolidays } from "@/features/holidays/queries";
import { HolidaysClient } from "@/features/holidays/components/holidays-client";

export const metadata: Metadata = { title: "Holidays | EMS" };

export default async function HolidaysPage({
  searchParams,
}: {
  searchParams: Promise<{ year?: string }>;
}) {
  const session = await requireSession();
  const { year: yearParam } = await searchParams;
  const year = Number(yearParam) || new Date().getFullYear();

  const holidays = await listHolidays(year);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Holidays</h1>
        <p className="text-sm text-muted-foreground">Public, company, and optional holidays.</p>
      </div>

      <HolidaysClient
        holidays={holidays.map((h) => ({
          id: h.id,
          name: h.name,
          date: h.date.toISOString(),
          type: h.type,
          description: h.description,
        }))}
        year={year}
        canManage={canManageHolidays(session.role)}
      />
    </div>
  );
}
