// Runs once when the Next.js server process starts (both `next dev` and the
// standalone production server) — this app runs as a long-lived container,
// not serverless functions, so a cron job registered here persists for the
// container's lifetime.
//
// The node-only logic lives in a separate module (instrumentation-node.ts)
// dynamically imported only under the nodejs runtime check, per Next's
// documented pattern — Next also compiles this file for the Edge bundle,
// and node-cron/web-push pull in Node built-ins (`stream`, etc.) that don't
// exist there. An inline dynamic import in this same file still gets
// resolved during that Edge compilation and fails the build; delegating to
// a wholly separate file is what actually keeps it out of the Edge bundle.
export async function register() {
  if (process.env.NEXT_RUNTIME === "nodejs") {
    const { registerSubscriptionReminderScheduler } = await import("./instrumentation-node")
    registerSubscriptionReminderScheduler()
  }
}
