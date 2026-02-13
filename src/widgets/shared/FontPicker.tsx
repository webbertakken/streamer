import { useEffect, useState, useRef } from "react";
import { Fzf } from "fzf";

/** Lazy-load system font family names via the Local Font Access API. */
let fontCache: string[] | null = null;
async function loadSystemFonts(): Promise<string[]> {
  if (fontCache) return fontCache;
  if (!("queryLocalFonts" in window)) return [];
  try {
    const fonts = await (window as unknown as { queryLocalFonts(): Promise<{ family: string }[]> }).queryLocalFonts();
    fontCache = [...new Set(fonts.map((f) => f.family))].sort();
    return fontCache;
  } catch {
    return [];
  }
}

/** Font picker with fzf-style fuzzy autocomplete over system fonts. */
export function FontPicker({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [query, setQuery] = useState(value === "inherit" ? "" : value);
  const [fonts, setFonts] = useState<string[]>([]);
  const [results, setResults] = useState<string[]>([]);
  const [open, setOpen] = useState(false);
  const [highlighted, setHighlighted] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);

  // Defer font loading until the user focuses the input to avoid triggering a
  // browser permission dialog on mount (which can conflict with Tauri's
  // transparent always-on-top window).
  const fontsRequested = useRef(false);
  function requestFonts() {
    if (fontsRequested.current) return;
    fontsRequested.current = true;
    loadSystemFonts().then(setFonts).catch(() => {});
  }

  useEffect(() => {
    if (!query.trim() || fonts.length === 0) {
      setResults(fonts.slice(0, 12));
      return;
    }
    const fzf = new Fzf(fonts, { limit: 12 });
    setResults(fzf.find(query).map((r) => r.item));
    setHighlighted(0);
  }, [query, fonts]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("pointerdown", handleClickOutside);
    return () => document.removeEventListener("pointerdown", handleClickOutside);
  }, []);

  function select(font: string) {
    setQuery(font);
    onChange(font);
    setOpen(false);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHighlighted((h) => Math.min(h + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHighlighted((h) => Math.max(h - 1, 0));
    } else if (e.key === "Enter" && results[highlighted]) {
      e.preventDefault();
      select(results[highlighted]);
    } else if (e.key === "Escape") {
      setOpen(false);
    }
  }

  return (
    <div ref={containerRef} className="relative">
      <input
        type="text"
        value={query}
        onChange={(e) => { setQuery(e.target.value); setOpen(true); if (!e.target.value) onChange("inherit"); }}
        onFocus={() => { requestFonts(); setOpen(true); }}
        onKeyDown={handleKeyDown}
        placeholder="Default font"
        style={{ fontFamily: value !== "inherit" ? value : undefined }}
        className="w-full bg-white/10 text-white text-xs rounded px-2 py-1 outline-none focus:ring-1 focus:ring-blue-400"
      />
      {open && results.length > 0 && (
        <div className="absolute left-0 right-0 top-full mt-0.5 bg-black/90 border border-white/10 rounded max-h-36 overflow-y-auto z-50">
          {results.map((font, i) => (
            <button
              key={font}
              onPointerDown={(e) => { e.preventDefault(); select(font); }}
              className={`block w-full text-left text-xs px-2 py-1 transition-colors ${i === highlighted ? "bg-blue-600 text-white" : "text-white/80 hover:bg-white/10"}`}
              style={{ fontFamily: font }}
            >
              {font}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
