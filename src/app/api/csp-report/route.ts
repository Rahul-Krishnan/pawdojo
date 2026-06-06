import { NextResponse } from "next/server";

// CSP violation sink (S4). The report-only policy in next.config.ts points its
// report-to/report-uri here so violations are actually delivered instead of
// computed-then-dropped. There is no aggregation backend yet, so reports are
// logged server-side; that is enough to review the report-only data before the
// eventual flip to an enforcing policy.
//
// Browsers POST reports as application/csp-report (report-uri, a single object)
// or application/reports+json (Reporting API, an array). We accept either,
// best-effort parse, and always ack with 204 so the browser stops retrying.
//
// S2: this endpoint is unauthenticated and public. Without a cap, a client can
// stream an arbitrarily large body that gets buffered, parsed, and re-stringified
// into the logs. Read the body as text and reject anything over the cap before
// parsing it, while still acking with 204 so the browser does not retry.
const MAX_REPORT_BYTES = 64 * 1024;

export async function POST(request: Request) {
  try {
    const body = await request.text();
    if (body.length > MAX_REPORT_BYTES) {
      return new NextResponse(null, { status: 204 });
    }
    const report = JSON.parse(body);
    console.warn("[csp-report]", JSON.stringify(report));
  } catch {
    // Empty or non-JSON body: still ack so the browser does not retry.
  }
  return new NextResponse(null, { status: 204 });
}
