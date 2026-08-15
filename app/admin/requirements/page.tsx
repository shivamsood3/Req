import type { Metadata } from "next";
import Link from "next/link";
import { getAdminRequirements } from "@/lib/admin-data";
import { adminCloseRequirement } from "./actions";

export const metadata: Metadata = { title: "Admin requirements" };
export const dynamic = "force-dynamic";

export default async function AdminRequirementsPage() {
  const requirements = await getAdminRequirements();

  return (
    <>
      <div className="admin-heading">
        <div><h1>Requirements</h1><p>Inspect and close REQs that should leave the live network.</p></div>
      </div>
      <div className="broker-table">
        {requirements.length ? (
          <table>
            <thead><tr><th>REQ</th><th>Broker</th><th>Status</th><th>Created</th><th>Responses</th><th>Action</th></tr></thead>
            <tbody>
              {requirements.map((req) => (
                <tr key={req.id}>
                  <td><div className="broker-name">{req.localityNames.join(" + ") || "—"}</div><div className="broker-sub">{req.budgetLabel} · {req.propertyType}</div></td>
                  <td>{req.brokerName ?? "Unavailable"}<div className="broker-sub">{req.brokerage ?? "—"}</div></td>
                  <td><span className={`status-pill status-${req.effectiveStatus}`}>{req.effectiveStatus}</span><div className="broker-sub">Stored: {req.storedStatus}</div></td>
                  <td>{new Intl.DateTimeFormat("en-IN", { dateStyle: "medium" }).format(new Date(req.createdAt))}</td>
                  <td>{req.responseCount}</td>
                  <td>
                    <div className="review-actions">
                      <Link href={`/requirements/${req.id}`}>Open</Link>
                      {req.effectiveStatus === "live" ? (
                        <form action={adminCloseRequirement}>
                          <input type="hidden" name="requirement_id" value={req.id} />
                          <button className="reject-button" type="submit">Close REQ</button>
                        </form>
                      ) : null}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No requirements yet.</div>}
      </div>
    </>
  );
}
