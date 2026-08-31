import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { requireSession } from "@/features/auth/session";
import { canManageLearning } from "@/features/learning/authorization";
import { getCourseForManage, listEnrollmentsForCourse } from "@/features/learning/queries";
import { CourseManageDetail } from "@/features/learning/components/course-manage-detail";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "Manage Course | EMS" };

export default async function CourseManagePage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  if (!canManageLearning(session.role)) notFound();

  const { id } = await params;
  const course = await getCourseForManage(id, session);
  const enrollments = await listEnrollmentsForCourse(id, session);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={course.id} label={course.title} />
      <CourseManageDetail
        initialCourse={course}
        initialEnrollments={enrollments.map((e) => ({
          id: e.id,
          status: e.status,
          progressPercent: e.progressPercent,
          quizScore: e.quizScore,
          quizPassed: e.quizPassed,
          employee: e.employee,
        }))}
      />
    </div>
  );
}
