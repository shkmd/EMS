import type { Metadata } from "next";

import { requireSession } from "@/features/auth/session";
import { getCourseForLearner } from "@/features/learning/queries";
import { CourseLearnerView } from "@/features/learning/components/course-learner-view";
import { SetBreadcrumbLabel } from "@/components/layout/page-breadcrumb";

export const metadata: Metadata = { title: "Course | EMS" };

export default async function CourseLearnPage({ params }: { params: Promise<{ id: string }> }) {
  const session = await requireSession();
  const { id } = await params;
  const { course, enrollment } = await getCourseForLearner(id, session);

  return (
    <div className="flex flex-1 flex-col gap-6">
      <SetBreadcrumbLabel id={course.id} label={course.title} />
      <CourseLearnerView
        course={course}
        initialEnrollment={
          enrollment
            ? {
                id: enrollment.id,
                status: enrollment.status,
                progressPercent: enrollment.progressPercent,
                quizScore: enrollment.quizScore,
                quizPassed: enrollment.quizPassed,
                certificateIssuedAt: enrollment.certificateIssuedAt ? enrollment.certificateIssuedAt.toISOString() : null,
              }
            : null
        }
      />
    </div>
  );
}
