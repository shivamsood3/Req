"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import type { FeedFilters } from "@/lib/feed-filters";
import { PROPERTY_TYPE_OPTIONS, propertyTypeLabel } from "@/lib/requirement-format";
import type { LocalityOption, PropertyTypeKey } from "@/lib/types";

type FilterPanel = "location" | "type" | "budget" | null;

function budgetSummary(filters: FeedFilters) {
  if (filters.budgetMin !== null && filters.budgetMax !== null) {
    return `₹${filters.budgetMin}–${filters.budgetMax} Cr`;
  }
  if (filters.budgetMin !== null) return `₹${filters.budgetMin}+ Cr`;
  if (filters.budgetMax !== null) return `Up to ₹${filters.budgetMax} Cr`;
  return "Budget";
}

export function FeedFilters({
  basePath,
  localities,
  filters,
}: {
  basePath: "/" | "/home";
  localities: LocalityOption[];
  filters: FeedFilters;
}) {
  const router = useRouter();
  const [panel, setPanel] = useState<FilterPanel>(null);
  const [selectedLocalities, setSelectedLocalities] = useState(filters.localities);
  const [propertyType, setPropertyType] = useState<PropertyTypeKey | "">(
    filters.propertyType ?? "",
  );
  const [budgetMin, setBudgetMin] = useState(
    filters.budgetMin?.toString() ?? "",
  );
  const [budgetMax, setBudgetMax] = useState(
    filters.budgetMax?.toString() ?? "",
  );

  function applyFilters() {
    const params = new URLSearchParams();
    selectedLocalities.forEach((slug) => params.append("locality", slug));
    if (propertyType) params.set("type", propertyType);
    if (budgetMin) params.set("budgetMin", budgetMin);
    if (budgetMax) params.set("budgetMax", budgetMax);
    const query = params.toString();
    router.push(query ? `${basePath}?${query}` : basePath);
  }

  function clearFilters() {
    setSelectedLocalities([]);
    setPropertyType("");
    setBudgetMin("");
    setBudgetMax("");
    setPanel(null);
    router.push(basePath);
  }

  const hasFilters =
    filters.localities.length > 0 ||
    filters.propertyType !== null ||
    filters.budgetMin !== null ||
    filters.budgetMax !== null;

  return (
    <section className="filters" aria-label="Filter live requirements">
      <div className="filter-row">
        <button
          className={`filter-chip ${filters.localities.length ? "filter-chip-active" : ""}`}
          type="button"
          aria-expanded={panel === "location"}
          onClick={() => setPanel(panel === "location" ? null : "location")}
        >
          {filters.localities.length
            ? `${filters.localities.length} ${filters.localities.length === 1 ? "Area" : "Areas"}`
            : "Location"}
          <span aria-hidden="true">⌄</span>
        </button>
        <button
          className={`filter-chip ${filters.propertyType ? "filter-chip-active" : ""}`}
          type="button"
          aria-expanded={panel === "type"}
          onClick={() => setPanel(panel === "type" ? null : "type")}
        >
          {filters.propertyType ? propertyTypeLabel(filters.propertyType) : "Property Type"}
          <span aria-hidden="true">⌄</span>
        </button>
        <button
          className={`filter-chip ${filters.budgetMin !== null || filters.budgetMax !== null ? "filter-chip-active" : ""}`}
          type="button"
          aria-expanded={panel === "budget"}
          onClick={() => setPanel(panel === "budget" ? null : "budget")}
        >
          {budgetSummary(filters)} <span aria-hidden="true">⌄</span>
        </button>
      </div>

      {panel ? (
        <div className="filter-panel">
          {panel === "location" ? (
            <fieldset className="filter-options">
              <legend>South Delhi localities</legend>
              {localities.map((locality) => (
                <label key={locality.slug}>
                  <input
                    type="checkbox"
                    checked={selectedLocalities.includes(locality.slug)}
                    onChange={(event) =>
                      setSelectedLocalities((current) =>
                        event.target.checked
                          ? [...current, locality.slug]
                          : current.filter((slug) => slug !== locality.slug),
                      )
                    }
                  />
                  <span>{locality.name}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {panel === "type" ? (
            <fieldset className="filter-options">
              <legend>Property type</legend>
              <label>
                <input
                  type="radio"
                  name="property-type"
                  checked={propertyType === ""}
                  onChange={() => setPropertyType("")}
                />
                <span>All property types</span>
              </label>
              {PROPERTY_TYPE_OPTIONS.map((option) => (
                <label key={option.key}>
                  <input
                    type="radio"
                    name="property-type"
                    checked={propertyType === option.key}
                    onChange={() => setPropertyType(option.key)}
                  />
                  <span>{option.label}</span>
                </label>
              ))}
            </fieldset>
          ) : null}

          {panel === "budget" ? (
            <fieldset className="budget-fields">
              <legend>Budget in crore</legend>
              <label>
                Minimum
                <input
                  inputMode="decimal"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  type="number"
                  value={budgetMin}
                  placeholder="10"
                  onChange={(event) => setBudgetMin(event.target.value)}
                />
              </label>
              <label>
                Maximum
                <input
                  inputMode="decimal"
                  min="0.1"
                  max="1000"
                  step="0.1"
                  type="number"
                  value={budgetMax}
                  placeholder="20"
                  onChange={(event) => setBudgetMax(event.target.value)}
                />
              </label>
            </fieldset>
          ) : null}

          <div className="filter-actions">
            <button type="button" className="filter-clear" onClick={clearFilters}>
              Clear
            </button>
            <button type="button" className="filter-apply" onClick={applyFilters}>
              Apply filters
            </button>
          </div>
        </div>
      ) : null}

      {hasFilters && !panel ? (
        <button type="button" className="clear-all" onClick={clearFilters}>
          Clear all filters
        </button>
      ) : null}
    </section>
  );
}
