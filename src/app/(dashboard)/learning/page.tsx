import type { Metadata } from "next";

import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { requireSession } from "@/features/auth/session";
import { canManageLearning } from "@/features/learning/authorization";
import { listAssignableEmployees } from "@/features/projects/queries";
import { listCourses, listMyEnrollments, listSkillMatrix } from "@/features/learning/queries";
import { CoursesManageList } from "@/features/learning/components/courses-manage-list";
import { CourseCatalog } from "@/features/learning/components/course-catalog";
import { MyLearningList } from "@/features/learning/components/my-learning-list";
import { SkillMatrix } from "@/features/learning/components/skill-matrix";

export const metadata: Metadata = { title: "Learning & Development | EMS" };

export default async function LearningPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const session = await requireSession();
  const { tab } = await searchParams;
  const canManage = canManageLearning(session.role);
  const hasEmployeeProfile = !!session.employeeId;

  const visibleTabs = [...(canManage ? ["manage"] : []), "catalog", ...(hasEmployeeProfile ? ["my-learning"] : []), ...(canManage ? ["skills"] : [])];
  const defaultTab = tab && visibleTabs.includes(tab) ? tab : canManage ? "manage" : "catalog";

  const [catalogCourses, myEnrollments] = await Promise.all([
    listCourses(session),
    hasEmployeeProfile ? listMyEnrollments(session) : Promise.resolve([]),
  ]);

  const skills = canManage ? await listSkillMatrix(session) : [];
  const employees = canManage ? await listAssignableEmployees() : [];

  const catalog = catalogCourses.map((c) => ({
    id: c.id,
    title: c.title,
    description: c.description,
    category: c.category,
    durationMinutes: c.durationMinutes,
    quiz: c.quiz,
  }));
  const myCourseIds = myEnrollments.map((e) => e.courseId);
  const myLearning = myEnrollments.map((e) => ({
    id: e.id,
    status: e.status,
    progressPercent: e.progressPercent,
    quizScore: e.quizScore,
    quizPassed: e.quizPassed,
    certificateIssuedAt: e.certificateIssuedAt ? e.certificateIssuedAt.toISOString() : null,
    course: e.course,
  }));
  const skillRows = skills.map((s) => ({
    id: s.id,
    name: s.name,
    proficiency: s.proficiency,
    notes: s.notes,
    employee: s.employee,
  }));

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Learning & Development</h1>
        <p className="text-sm text-muted-foreground">Course catalog, assigned training, and the company skill matrix.</p>
      </div>

      <Tabs defaultValue={defaultTab}>
        <TabsList>
          {canManage && <TabsTrigger value="manage">Manage Courses</TabsTrigger>}
          <TabsTrigger value="catalog">Catalog</TabsTrigger>
          {hasEmployeeProfile && <TabsTrigger value="my-learning">My Learning</TabsTrigger>}
          {canManage && <TabsTrigger value="skills">Skill Matrix</TabsTrigger>}
        </TabsList>

        {canManage && (
          <TabsContent value="manage" className="mt-4">
            <CoursesManageList />
          </TabsContent>
        )}
        <TabsContent value="catalog" className="mt-4">
          <CourseCatalog initialCourses={catalog} myCourseIds={myCourseIds} />
        </TabsContent>
        {hasEmployeeProfile && (
          <TabsContent value="my-learning" className="mt-4">
            <MyLearningList enrollments={myLearning} />
          </TabsContent>
        )}
        {canManage && (
          <TabsContent value="skills" className="mt-4">
            <SkillMatrix initialSkills={skillRows} employees={employees} />
          </TabsContent>
        )}
      </Tabs>
    </div>
  );
}
