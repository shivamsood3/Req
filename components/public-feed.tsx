"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { PublicRequirementPreview } from "@/lib/types";
import { Brand } from "./brand";

function freshness(iso: string) {
  const minutes = Math.max(1, Math.floor((Date.now() - new Date(iso).getTime()) / 60_000));
  if (minutes < 60) return `${minutes} MIN AGO`;
  return `${Math.floor(minutes / 60)} HR AGO`;
}

export function PublicFeed({ items }: { items: PublicRequirementPreview[] }) {
  const [selected, setSelected] = useState<PublicRequirementPreview | null>(null);

  useEffect(() => {
    if (!selected) return;
    const close = (event: KeyboardEvent) => {
      if (event.key === "Escape") setSelected(null);
    };
    document.addEventListener("keydown", close);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", close);
      document.body.style.overflow = "";
    };
  }, [selected]);

  return (
    <main className="public-shell">
      <header className="topbar">
        <Brand />
        <Link className="text-button" href="/login">
          Sign in
        </Link>
      </header>

      <section className="feed-intro">
        <p className="eyebrow live-label"><span className="live-dot" /> Live market</p>
        <h1>Live Requirements</h1>
        <p>South Delhi</p>
      </section>

      <div className="filter-row" aria-label="Preview filters">
        {['All Areas', 'Type', 'Budget'].map((label) => (
          <button className="filter-chip" type="button" disabled key={label}>
            {label} <span aria-hidden="true">⌄</span>
          </button>
        ))}
      </div>

      <section className="requirement-list" aria-label="Live requirement previews">
        {items.map((item) => (
          <article className="requirement-card" key={item.id}>
            <div className="card-meta">
              <span className="live-copy">LIVE</span>
              <span aria-hidden="true">·</span>
              <span>{freshness(item.liveSince)}</span>
            </div>
            <p className="locality">{item.locality}</p>
            <h2>{item.budgetLabel}</h2>
            <div className="requirement-details">
              <p>{item.propertyType}</p>
              <p>{item.sizeLabel}</p>
              {item.floorPreference ? <p>{item.floorPreference}</p> : null}
            </div>
            <div className="card-footer">
              <p>{item.responseCount} brokers responded</p>
              <button type="button" onClick={() => setSelected(item)}>
                View requirement <span aria-hidden="true">→</span>
              </button>
            </div>
          </article>
        ))}
      </section>

      <p className="feed-end">Showing a private preview of the live market.</p>

      {selected ? (
        <div className="sheet-backdrop">
          <button
            className="sheet-dismiss"
            type="button"
            aria-label="Close sign-in prompt"
            onClick={() => setSelected(null)}
          />
          <section
            className="auth-sheet"
            role="dialog"
            aria-modal="true"
            aria-labelledby="auth-sheet-title"
          >
            <div className="sheet-handle" />
            <button className="sheet-close" type="button" onClick={() => setSelected(null)} aria-label="Close">
              ×
            </button>
            <p className="locality">{selected.locality}</p>
            <h2 id="auth-sheet-title">{selected.budgetLabel}</h2>
            <p className="sheet-copy">
              Sign in to view the full REQ and respond with matching inventory.
            </p>
            <Link className="primary-button" href={`/request-access?next=/requirements/${selected.id}`}>
              Request access
            </Link>
            <p className="member-link">Already a member? <Link href="/login">Sign in</Link></p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
