export const templateTypeValues = ["RELIEVING_LETTER", "EXPERIENCE_CERTIFICATE", "SALARY_CERTIFICATE", "OFFER_LETTER"] as const
export type TemplateType = (typeof templateTypeValues)[number]

export const TEMPLATE_LABELS: Record<TemplateType, string> = {
  RELIEVING_LETTER: "Relieving Letter",
  EXPERIENCE_CERTIFICATE: "Experience Certificate",
  SALARY_CERTIFICATE: "Salary Certificate",
  OFFER_LETTER: "Offer Letter",
}

export type PlaceholderInfo = { key: string; description: string }

export const TEMPLATE_PLACEHOLDERS: Record<TemplateType, PlaceholderInfo[]> = {
  RELIEVING_LETTER: [
    { key: "employeeName", description: "Full name" },
    { key: "employeeFirstName", description: "First name only" },
    { key: "employeeCode", description: "Employee code" },
    { key: "designation", description: "Job title" },
    { key: "departmentClause", description: '" in the X department" (blank if none set)' },
    { key: "dateOfJoining", description: "Date joined" },
    { key: "lastWorkingDay", description: "Last working day" },
    { key: "companyName", description: "Company name" },
    { key: "currentDate", description: "Today's date" },
  ],
  EXPERIENCE_CERTIFICATE: [
    { key: "employeeName", description: "Full name" },
    { key: "employeeFirstName", description: "First name only" },
    { key: "employeeCode", description: "Employee code" },
    { key: "designation", description: "Job title" },
    { key: "departmentClause", description: '" in the X department" (blank if none set)' },
    { key: "dateOfJoining", description: "Date joined" },
    { key: "tenureClause", description: '"from X to Y" if offboarded, "since X" if still with the company' },
    { key: "companyName", description: "Company name" },
    { key: "currentDate", description: "Today's date" },
  ],
  SALARY_CERTIFICATE: [
    { key: "employeeName", description: "Full name" },
    { key: "employeeCode", description: "Employee code" },
    { key: "designation", description: "Job title" },
    { key: "departmentClause", description: '" in the X department" (blank if none set)' },
    { key: "dateOfJoining", description: "Date joined" },
    { key: "basicSalary", description: "Basic salary, formatted with currency" },
    { key: "grossSalary", description: "Gross salary, formatted with currency" },
    { key: "companyName", description: "Company name" },
    { key: "currentDate", description: "Today's date" },
  ],
  OFFER_LETTER: [
    { key: "candidateName", description: "Candidate name" },
    { key: "position", description: "Position offered" },
    { key: "departmentClause", description: '" in the X department" (blank if none set)' },
    { key: "proposedSalary", description: "Proposed salary, formatted with currency" },
    { key: "joiningDate", description: "Proposed joining date" },
    { key: "validUntilClause", description: '" This offer is valid until X." (blank if no expiry set)' },
    { key: "companyName", description: "Company name" },
    { key: "currentDate", description: "Today's date" },
  ],
}

export const DEFAULT_TEMPLATES: Record<TemplateType, { title: string; bodyText: string }> = {
  RELIEVING_LETTER: {
    title: "RELIEVING LETTER",
    bodyText: `This is to certify that {{employeeName}} (Employee Code: {{employeeCode}}), who was working with {{companyName}} as {{designation}}{{departmentClause}}, has been relieved of their duties and responsibilities with effect from {{lastWorkingDay}}.

{{employeeName}} was associated with {{companyName}} from {{dateOfJoining}} to {{lastWorkingDay}}. During this period, all dues have been settled and the exit formalities have been duly completed.

We wish {{employeeFirstName}} success in all future endeavors.`,
  },
  EXPERIENCE_CERTIFICATE: {
    title: "EXPERIENCE CERTIFICATE",
    bodyText: `TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{employeeName}} (Employee Code: {{employeeCode}}) has been associated with {{companyName}}{{departmentClause}} as {{designation}}, {{tenureClause}}.

During this period, we found {{employeeFirstName}} to be sincere, hardworking, and professional in conduct. We wish {{employeeFirstName}} all the best for future endeavors.`,
  },
  SALARY_CERTIFICATE: {
    title: "SALARY CERTIFICATE",
    bodyText: `TO WHOMSOEVER IT MAY CONCERN

This is to certify that {{employeeName}} (Employee Code: {{employeeCode}}) is currently employed with {{companyName}}{{departmentClause}} as {{designation}}, since {{dateOfJoining}}.

Basic Salary: {{basicSalary}} per month
Gross Salary: {{grossSalary}} per month

This certificate is issued upon the employee's request for whatever purpose it may serve.`,
  },
  OFFER_LETTER: {
    title: "OFFER OF EMPLOYMENT",
    bodyText: `Dear {{candidateName}},

We are pleased to offer you the position of {{position}}{{departmentClause}} at {{companyName}}. We were impressed with your background and are confident you will be a valuable addition to our team.

Proposed Compensation: {{proposedSalary}} per month
Proposed Joining Date: {{joiningDate}}

This offer, along with detailed terms of employment, will be formalized in your appointment letter upon joining.{{validUntilClause}}

Please confirm your acceptance of this offer at your earliest convenience. We look forward to welcoming you to {{companyName}}.`,
  },
}

/** Simple {{key}} mail-merge substitution — unknown/missing keys resolve to
 * an empty string rather than leaving the raw token in the output. */
export function renderTemplateText(template: string, data: Record<string, string>) {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? "")
}
