"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import type { FeedFilters as FeedFilterState } from "@/lib/feed-filters";
import { formatLocalitySummary } from "@/lib/requirement-format";
import type { LocalityOption, PublicRequirementPreview } from "@/lib/types";
import { Brand } from "./brand";
import { FeedFilters } from "./feed-filters";
import { RequirementCard } from "./requirement-card";

type PublicFeedBasePath = "/" | "/home";

export function PublicFeed({
  items,
  localities,
  filters,
  generatedAt,
  basePath = "/",
}: {
  items: PublicRequirementPreview[];
  localities: LocalityOption[];
  filters: FeedFilterState;
  generatedAt: number;
  basePath?: PublicFeedBasePath;
}) {
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
        <h1 className="market-heading">Live Market</h1>
        <p>South Delhi</p>
      </section>

      <FeedFilters
        key={JSON.stringify(filters)}
        basePath={basePath}
        localities={localities}
        filters={filters}
      />

      {items.length > 0 ? (
        <section className="requirement-list" aria-label="Live requirement previews">
          {items.map((item) => (
            <RequirementCard
              item={item}
              generatedAt={generatedAt}
              onPublicOpen={() => setSelected(item)}
              key={item.id}
            />
          ))}
        </section>
      ) : (
        <section className="feed-empty" aria-live="polite">
          <p>No live REQs right now.</p>
        </section>
      )}

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
            <button
              className="sheet-close"
              type="button"
              onClick={() => setSelected(null)}
              aria-label="Close"
            >
              ×
            </button>
            <p className="locality">{formatLocalitySummary(selected.localityNames)}</p>
            <h2 id="auth-sheet-title">{selected.budgetLabel}</h2>
            <p className="sheet-copy">
              Sign in to view the full REQ and respond with matching inventory.
            </p>
            <Link
              className="primary-button"
              href={`/request-access?next=/requirements/${selected.id}`}
            >
              Request access
            </Link>
            <p className="member-link">
              Already a member? <Link href="/login">Sign in</Link>
            </p>
          </section>
        </div>
      ) : null}
    </main>
  );
}
