"use client";

import { useEffect, useRef, useState } from "react";
import type { Place, TemperatureUnit } from "@/lib/weather";

type SearchFieldProps = {
  onSelect: (place: Place) => void;
  className?: string;
};

export function SearchField({ onSelect, className = "" }: SearchFieldProps) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<Place[]>([]);
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [searched, setSearched] = useState(false);
  const [active, setActive] = useState(-1);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    const term = query.trim();

    if (term.length < 2) return;

    queueMicrotask(() => setPending(true));

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch(`/api/geocode?q=${encodeURIComponent(term)}`, {
          signal: controller.signal,
        });
        const data = (await response.json()) as { results?: Place[] };
        setResults(data.results ?? []);
        setActive(-1);
        setSearched(true);
      } catch {
        if (!controller.signal.aborted) {
          setResults([]);
          setSearched(true);
        }
      } finally {
        if (!controller.signal.aborted) setPending(false);
      }
    }, 220);

    return () => {
      controller.abort();
      window.clearTimeout(timer);
    };
  }, [query]);

  useEffect(() => {
    function handlePointerDown(event: PointerEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false);
      }
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => document.removeEventListener("pointerdown", handlePointerDown);
  }, []);

  function choose(place: Place) {
    onSelect(place);
    setQuery("");
    setResults([]);
    setOpen(false);
    setSearched(false);
    setActive(-1);
    inputRef.current?.blur();
  }

  function handleKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "Escape") {
      setQuery("");
      setOpen(false);
      inputRef.current?.blur();
      return;
    }

    if (!open || results.length === 0) return;

    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((index) => (index + 1) % results.length);
    } else if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((index) => (index <= 0 ? results.length - 1 : index - 1));
    } else if (event.key === "Enter") {
      event.preventDefault();
      const place = results[active] ?? results[0];
      if (place) choose(place);
    }
  }

  const showEmpty = searched && !pending && query.trim().length >= 2 && results.length === 0;

  return (
    <div ref={containerRef} className={`search ${className}`}>
      <div className="search-field">
        <input
          ref={inputRef}
          value={query}
          onChange={(event) => {
            const val = event.target.value;
            setQuery(val);
            setOpen(true);
            if (val.trim().length < 2) {
              setResults([]);
              setPending(false);
              setSearched(false);
              setActive(-1);
            }
          }}
          onFocus={() => {
            if (query.trim().length >= 2) setOpen(true);
          }}
          onKeyDown={handleKeyDown}
          placeholder="search a city"
          aria-label="Search for a city"
          role="combobox"
          aria-expanded={open && (results.length > 0 || showEmpty)}
          aria-controls="place-results"
          aria-autocomplete="list"
          aria-activedescendant={active >= 0 ? `place-option-${active}` : undefined}
          autoComplete="off"
          spellCheck={false}
        />
        {query.length > 0 ? (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setResults([]);
              setPending(false);
              setSearched(false);
              setActive(-1);
              inputRef.current?.focus();
            }}
            aria-label="Clear search"
            className="search-clear"
          >
            ×
          </button>
        ) : null}
      </div>

      {open && (results.length > 0 || showEmpty) ? (
        <div className="results">
          {showEmpty ? (
            <p className="empty">
              no places match “{query.trim()}”
            </p>
          ) : null}
          <ul id="place-results" role="listbox" aria-label="Matching places">
            {results.map((place, index) => (
              <li key={`${place.id ?? `${place.latitude},${place.longitude}`}`} role="presentation">
                <button
                  type="button"
                  id={`place-option-${index}`}
                  role="option"
                  aria-selected={index === active}
                  onMouseEnter={() => setActive(index)}
                  onClick={() => choose(place)}
                >
                  <span>
                    {place.name}
                    <small>
                      {[place.admin1, place.country].filter(Boolean).join(", ") || "—"}
                    </small>
                  </span>
                  {place.countryCode ? (
                    <small>{place.countryCode}</small>
                  ) : null}
                </button>
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </div>
  );
}

export function LocateButton({
  onClick,
  busy,
  className = "",
}: {
  onClick: () => void;
  busy: boolean;
  className?: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label="Use my current location"
      title="Use my current location"
      className={`control ${className}`}
    >
      {busy ? "locating…" : "use my location"}
    </button>
  );
}

export function UnitToggle({
  unit,
  onChange,
  className = "",
}: {
  unit: TemperatureUnit;
  onChange: (unit: TemperatureUnit) => void;
  className?: string;
}) {
  return (
    <div
      role="group"
      aria-label="Temperature unit"
      className={`units ${className}`}
    >
      {(["c", "f"] as const).map((option) => (
        <button
          key={option}
          type="button"
          onClick={() => onChange(option)}
          aria-pressed={unit === option}
          className="control"
        >
          °{option}
        </button>
      ))}
    </div>
  );
}