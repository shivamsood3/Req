import type { Metadata } from "next";
import Link from "next/link";
import { getAdminReports } from "@/lib/admin-data";
import { formatElapsed, requestTimestamp } from "@/lib/requirement-format";
import { moderateReport } from "./actions";

export const metadata: Metadata = { title: "Reports" };
export const dynamic = "force-dynamic";

export default async function AdminReportsPage() {
  const reports = await getAdminReports();
  const now = requestTimestamp();

  return (
    <>
      <div className="admin-heading">
        <div><h1>Reports</h1><p>Review bad REQs or broker conduct without public scores.</p></div>
      </div>
      <section className="admin-card-list">
        {reports.length ? reports.map((report) => (
          <article className="admin-card" key={report.id}>
            <div className="admin-card-head">
              <div>
                <p className="settings-label">{report.reasonLabel}</p>
                <h2>{report.requirementLabel}</h2>
              </div>
              <span className={`status-pill status-${report.status}`}>{report.status}</span>
            </div>
            <p>Reported broker: <strong>{report.reportedBrokerName ?? "Unavailable"}</strong>{report.reportedBrokerage ? ` · ${report.reportedBrokerage}` : ""}</p>
            <p>Reporter: {report.reporterName ?? "Unavailable"}{report.reporterBrokerage ? ` · ${report.reporterBrokerage}` : ""}</p>
            {report.notes ? <p className="admin-note">{report.notes}</p> : null}
            <p className="broker-sub">{formatElapsed(report.createdAt, now)}</p>
            {report.requirementId ? <Link href={`/requirements/${report.requirementId}`}>Open REQ</Link> : null}
            {report.status === "open" ? (
              <form action={moderateReport} className="review-actions">
                <input type="hidden" name="report_id" value={report.id} />
                <button name="action" value="dismiss" type="submit">Dismiss</button>
                <button name="action" value="warn" type="submit">Warn</button>
                <button className="suspend-button" name="action" value="suspend_broker" type="submit">Suspend broker</button>
                <button className="reject-button" name="action" value="close_requirement" type="submit">Close REQ</button>
              </form>
            ) : <p className="broker-sub">Action: {report.adminAction ?? "—"}</p>}
          </article>
        )) : <div className="empty-state">No reports yet.</div>}
      </section>
    </>
  );
}
