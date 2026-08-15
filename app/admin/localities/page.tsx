import type { Metadata } from "next";
import { getAdminLocalities } from "@/lib/admin-data";
import { createLocality, updateLocality } from "./actions";

export const metadata: Metadata = { title: "Localities" };
export const dynamic = "force-dynamic";

export default async function AdminLocalitiesPage() {
  const localities = await getAdminLocalities();

  return (
    <>
      <div className="admin-heading">
        <div><h1>Localities</h1><p>Add or disable selectable South Delhi locations. Historical records remain.</p></div>
      </div>

      <section className="settings-panel">
        <div>
          <p className="settings-label">Add locality</p>
          <h2>New market location</h2>
        </div>
        <form action={createLocality} className="locality-form">
          <input name="name" placeholder="Anand Lok" required minLength={2} />
          <input name="slug" placeholder="anand-lok" required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
          <input name="sort_order" type="number" defaultValue={0} />
          <button className="primary-button" type="submit">Add</button>
        </form>
      </section>

      <div className="broker-table">
        {localities.length ? (
          <table>
            <thead><tr><th>Name</th><th>Slug</th><th>Sort</th><th>Status</th><th>Historical REQs</th><th>Save</th></tr></thead>
            <tbody>
              {localities.map((locality) => (
                <tr key={locality.id}>
                  <td colSpan={6}>
                    <form action={updateLocality} className="locality-row-form">
                      <input type="hidden" name="locality_id" value={locality.id} />
                      <input name="name" defaultValue={locality.name} required minLength={2} />
                      <input name="slug" defaultValue={locality.slug} required pattern="[a-z0-9]+(-[a-z0-9]+)*" />
                      <input name="sort_order" type="number" defaultValue={locality.sortOrder} />
                      <label className="inline-check">
                        <input name="is_active" type="checkbox" defaultChecked={locality.isActive} />
                        Active
                      </label>
                      <span>{locality.requirementCount}</span>
                      <button type="submit">Save</button>
                    </form>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : <div className="empty-state">No localities yet.</div>}
      </div>
    </>
  );
}
