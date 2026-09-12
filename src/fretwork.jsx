import React, { useState, useMemo, useEffect, useRef } from "react";
import { Sun, Moon, Pencil, Check, Minus, Plus, Fingerprint, MoreHorizontal, Music2, Ruler } from "lucide-react";
import logoMarkUrl from "./assets/icons/fretwork-icon/fretwork-mark.svg";

// ---------- Music data ----------
const NOTES = ["C", "C#", "D", "D#", "E", "F", "F#", "G", "G#", "A", "A#", "B"];

const SCALES = {
  "Major": { intervals: [0, 2, 4, 5, 7, 9, 11], degrees: ["1", "2", "3", "4", "5", "6", "7"] },
  "Dorian": { intervals: [0, 2, 3, 5, 7, 9, 10], degrees: ["1", "2", "b3", "4", "5", "6", "b7"] },
  "Phrygian": { intervals: [0, 1, 3, 5, 7, 8, 10], degrees: ["1", "b2", "b3", "4", "5", "b6", "b7"] },
  "Lydian": { intervals: [0, 2, 4, 6, 7, 9, 11], degrees: ["1", "2", "3", "#4", "5", "6", "7"] },
  "Mixolydian": { intervals: [0, 2, 4, 5, 7, 9, 10], degrees: ["1", "2", "3", "4", "5", "6", "b7"] },
  "Minor": { intervals: [0, 2, 3, 5, 7, 8, 10], degrees: ["1", "2", "b3", "4", "5", "b6", "b7"] },
  "Locrian": { intervals: [0, 1, 3, 5, 6, 8, 10], degrees: ["1", "b2", "b3", "4", "b5", "b6", "b7"] },
  "Major Pentatonic": { intervals: [0, 2, 4, 7, 9], degrees: ["1", "2", "3", "5", "6"] },
  "Minor Pentatonic": { intervals: [0, 3, 5, 7, 10], degrees: ["1", "b3", "4", "5", "b7"] },
  "Blues": { intervals: [0, 3, 5, 6, 7, 10], degrees: ["1", "b3", "4", "b5", "5", "b7"] },
  "Harmonic Minor": { intervals: [0, 2, 3, 5, 7, 8, 11], degrees: ["1", "2", "b3", "4", "5", "b6", "7"] },
  "Melodic Minor": { intervals: [0, 2, 3, 5, 7, 9, 11], degrees: ["1", "2", "b3", "4", "5", "6", "7"] },
};

const LABEL_MODES = [
  { key: "note", label: "Notes", icon: Music2 },
  { key: "degree", label: "Interval", icon: Ruler },
  { key: "finger", label: "Finger position", icon: Fingerprint },
];
// Finger position is experimental (see EXPERIMENTAL section in the ellipsis
// menu) and deliberately left out of the primary Labels menu until its
// per-instrument fingering logic is correct.
const PRIMARY_LABEL_MODES = LABEL_MODES.filter((m) => m.key !== "finger");

const INSTRUMENTS = {
  guitar: {
    label: "Guitar",
    frets: 15,
    tunings: {
      "Standard": ["E", "A", "D", "G", "B", "E"], // low -> high, left -> right
      "Drop D": ["D", "A", "D", "G", "B", "E"],
      "Open G": ["D", "G", "D", "G", "B", "D"],
      "Open D": ["D", "A", "D", "F#", "A", "D"],
      "DADGAD": ["D", "A", "D", "G", "A", "D"],
    },
  },
  mandolin: {
    label: "Mandolin",
    frets: 15,
    tunings: {
      "Standard (GDAE)": ["G", "D", "A", "E"],
      "Cross (AEAE)": ["A", "E", "A", "E"],
    },
  },
  ukulele: {
    label: "Ukulele",
    frets: 15,
    tunings: {
      "Standard (GCEA)": ["G", "C", "E", "A"],
      "Baritone (DGBE)": ["D", "G", "B", "E"],
    },
  },
};

const INLAY_FRETS = [3, 5, 7, 9, 12, 15];
const DEFAULT_VISIBLE_SCALES = ["Major", "Dorian", "Minor", "Major Pentatonic", "Minor Pentatonic", "Blues", "Mixolydian"];
// (box width is now user-chosen, see selectionStart/activeBox below)

// ---------- Helpers ----------
function noteAt(openNote, fret) {
  const start = NOTES.indexOf(openNote);
  return NOTES[(start + fret) % 12];
}

// ---------- Themes ----------
const THEMES = {
  dark: {
    bg: "#100E0B",
    panel: "#1B1712",
    panelEdge: "#2A241E",
    fretWire: "#8f887a",
    nut: "#d8d2c4",
    string: "#a89f8c",
    inlay: "rgba(237,230,214,0.14)",
    root: "#C9973B",
    rootText: "#100E0B",
    toneText: "#EDE6D6",
    toneBorder: "#7FA093",
    muted: "#8b8375",
    text: "#EDE6D6",
    band: "rgba(201,151,59,0.10)",
    dsLine: "#8C8FC7",
    glow: "rgba(201,151,59,0.45)",
  },
  light: {
    bg: "#F1E9D8",
    panel: "#E7DCC3",
    panelEdge: "#D2C4A4",
    fretWire: "#8a7d68",
    nut: "#4a4136",
    string: "#7d7160",
    inlay: "rgba(42,35,24,0.16)",
    root: "#B4761F",
    rootText: "#F1E9D8",
    toneText: "#2A2318",
    toneBorder: "#4F7266",
    muted: "#8a7d68",
    text: "#2A2318",
    band: "rgba(180,118,31,0.12)",
    dsLine: "#5C5FA0",
    glow: "rgba(180,118,31,0.35)",
  },
};

const COL_W = 52;
const ROW_H = 44;
const OPEN_H = 40;
const NUT_H = 5;
const GUTTER_W = 34;
const FRET_TIP_TARGET = 3; // fret number the "tap a fret" tooltip points at

const PREF_KEY = "fretwork.prefs.v1";

function getSavedPrefs() {
  try {
    const raw = localStorage.getItem(PREF_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {}; // storage unavailable (e.g. the Claude artifact sandbox) — fall back to defaults
  }
}

export default function Fretwork() {
  const [savedPrefs] = useState(() => getSavedPrefs());
  const [instrumentKey, setInstrumentKey] = useState(savedPrefs.instrumentKey ?? "mandolin");
  const [tuningName, setTuningName] = useState(savedPrefs.tuningName ?? null);
  const [root, setRoot] = useState(savedPrefs.root ?? "C");
  const [scaleName, setScaleName] = useState(savedPrefs.scaleName ?? "Major");
  const [labelMode, setLabelMode] = useState(savedPrefs.labelMode ?? "note"); // note | degree | finger
  const [panel, setPanel] = useState(null); // null | "key" | "more" | "labels"
  const [theme, setTheme] = useState(savedPrefs.theme ?? "dark");
  const [selectionStart, setSelectionStart] = useState(null); // anchor fret while sizing
  const [activeBox, setActiveBox] = useState(null); // { start, end } or null
  const [hasUsedBox, setHasUsedBox] = useState(false);
  const [dsMode, setDsMode] = useState(savedPrefs.dsMode ?? "off"); // off | third | sixth
  const [hiddenScales, setHiddenScales] = useState(
    savedPrefs.hiddenScales ?? Object.keys(SCALES).filter((s) => !DEFAULT_VISIBLE_SCALES.includes(s))
  );
  const [scaleEditMode, setScaleEditMode] = useState(false);
  const [fitScale, setFitScale] = useState(1);
  const [dontShowFretTip, setDontShowFretTip] = useState(savedPrefs.dontShowFretTip ?? false);
  const [fretTipDismissed, setFretTipDismissed] = useState(false); // this-session-only dismissal
  const [fretTipCheckbox, setFretTipCheckbox] = useState(false);
  const scrollRef = useRef(null);

  const c = THEMES[theme];
  const instrument = INSTRUMENTS[instrumentKey];
  const tuningNames = Object.keys(instrument.tunings);
  const strings = instrument.tunings[tuningName] || instrument.tunings[tuningNames[0]];
  const scale = SCALES[scaleName];
  const rootIdx = NOTES.indexOf(root);

  // Only reset tuning if the current value isn't valid for this instrument —
  // preserves a restored saved tuning instead of overwriting it on every mount.
  useEffect(() => {
    const validTunings = Object.keys(INSTRUMENTS[instrumentKey].tunings);
    setTuningName((prev) => (validTunings.includes(prev) ? prev : validTunings[0]));
  }, [instrumentKey]);

  useEffect(() => {
    setActiveBox(null);
    setSelectionStart(null);
  }, [instrumentKey]);

  useEffect(() => {
    if (panel !== "key") setScaleEditMode(false);
  }, [panel]);

  // Persist preferences as they change. Silently no-ops if storage is unavailable.
  useEffect(() => {
    try {
      localStorage.setItem(
        PREF_KEY,
        JSON.stringify({
          instrumentKey,
          tuningName,
          root,
          scaleName,
          labelMode,
          theme,
          hiddenScales,
          dsMode,
          dontShowFretTip,
        })
      );
    } catch {
      // ignore — e.g. running inside the Claude artifact sandbox
    }
  }, [instrumentKey, tuningName, root, scaleName, labelMode, theme, hiddenScales, dsMode, dontShowFretTip]);

  // Scale the fretboard up to fill available vertical space on tall (desktop) viewports.
  // Clamped to a 1x floor so mobile keeps its existing scroll-based layout untouched.
  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const compute = () => {
      const totalW = strings.length * COL_W + GUTTER_W;
      const totalHeight = OPEN_H + NUT_H + instrument.frets * ROW_H;
      const availH = el.clientHeight - 14; // minus the container's paddingTop
      const availW = el.clientWidth;
      const next = Math.min(availH / totalHeight, availW / totalW);
      setFitScale(Number.isFinite(next) && next > 1 ? next : 1);
    };
    compute();
    const ro = new ResizeObserver(compute);
    ro.observe(el);
    return () => ro.disconnect();
  }, [strings.length, instrument.frets]);

  const inScaleMap = useMemo(() => {
    const map = new Map();
    scale.intervals.forEach((iv, i) => map.set((rootIdx + iv) % 12, i));
    return map;
  }, [scale, rootIdx]);

  const selectFret = (fret) => {
    setHasUsedBox(true);
    if (selectionStart === null) {
      // Step 1: drop an anchor and enter sizing mode.
      setActiveBox(null);
      setSelectionStart(fret);
    } else if (fret === selectionStart) {
      // Tapping the anchor again cancels.
      setSelectionStart(null);
      setActiveBox(null);
    } else {
      // Step 2: the second tap sets the width, in either direction.
      setActiveBox({ start: Math.min(selectionStart, fret), end: Math.max(selectionStart, fret) });
      setSelectionStart(null);
    }
  };

  // Diatonic double-stop pairs: adjacent-string note pairs a 3rd or 6th apart,
  // scoped to the active box so the overlay doesn't clutter the whole neck.
  const doubleStopPairs = useMemo(() => {
    if (activeBox === null || dsMode === "off") return [];
    const offsets = dsMode === "third" ? [4, 3] : [9, 8];
    const boxEnd = Math.min(instrument.frets, activeBox.end);
    const pairs = [];
    for (let i = 0; i < strings.length - 1; i++) {
      const openA = strings[i];
      const openB = strings[i + 1];
      for (let f = activeBox.start; f <= boxEnd; f++) {
        const pitchA = NOTES.indexOf(noteAt(openA, f));
        if (!inScaleMap.has(pitchA)) continue;
        let targetPitch = null;
        for (const off of offsets) {
          const cand = (pitchA + off) % 12;
          if (inScaleMap.has(cand)) {
            targetPitch = cand;
            break;
          }
        }
        if (targetPitch === null) continue;
        const targetNote = NOTES[targetPitch];
        for (const delta of [0, 1, -1, 2, -2, 3, -3]) {
          const f2 = f + delta;
          if (f2 < 1 || f2 > instrument.frets) continue;
          if (noteAt(openB, f2) === targetNote) {
            pairs.push({ sIdx: i, fret: f, fret2: f2 });
            break;
          }
        }
      }
    }
    return pairs;
  }, [activeBox, dsMode, strings, inScaleMap, instrument.frets]);

  const togglePanel = (name) => setPanel((p) => (p === name ? null : name));
  const visibleScaleNames = Object.keys(SCALES).filter((s) => !hiddenScales.includes(s));

  const hideScale = (name) => {
    if (visibleScaleNames.length <= 1) return; // keep at least one selectable
    setHiddenScales((prev) => (prev.includes(name) ? prev : [...prev, name]));
  };
  const restoreScale = (name) => {
    setHiddenScales((prev) => prev.filter((n) => n !== name));
  };
  const previewTap = (name) => {
    restoreScale(name);
    setScaleEditMode(true);
  };
  const dsDisplay = { off: "Off", third: "3rds", sixth: "6ths" };

  const gridW = strings.length * COL_W;
  const totalH = OPEN_H + NUT_H + instrument.frets * ROW_H;

  return (
    <div
      style={{
        background: c.bg,
        color: c.text,
        fontFamily: "'IBM Plex Sans', sans-serif",
        height: "100dvh",
        display: "flex",
        flexDirection: "column",
        overflow: "hidden",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500&display=swap');
        * { box-sizing: border-box; -webkit-tap-highlight-color: transparent; }
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: ${theme === "dark" ? "#3a332a" : "#cfc2a4"}; border-radius: 3px; }
        button { font-family: inherit; }
      `}</style>

      {/* Fretboard */}
      <div
        ref={scrollRef}
        data-testid="fretboard-scroll"
        style={{
          flex: 1,
          overflowY: "auto",
          overflowX: "hidden",
          display: "flex",
          justifyContent: "center",
          alignItems: "flex-start",
          WebkitOverflowScrolling: "touch",
          paddingTop: 14,
        }}
      >
        <div
          style={{
            display: "flex",
            transform: fitScale !== 1 ? `scale(${fitScale})` : undefined,
            transformOrigin: "top center",
          }}
        >
          {/* Fret number gutter */}
          <div style={{ width: GUTTER_W }}>
            <div style={{ height: OPEN_H }} />
            <div style={{ height: NUT_H }} />
            {Array.from({ length: instrument.frets }).map((_, i) => {
              const fret = i + 1;
              const isInlay = INLAY_FRETS.includes(fret);
              const isSizing = selectionStart !== null;
              const isAnchor = fret === selectionStart;
              const isBoundary = activeBox !== null && (fret === activeBox.start || fret === activeBox.end);

              let spanStyle;
              if (isAnchor) {
                spanStyle = {
                  background: c.root,
                  border: "none",
                  color: c.rootText,
                  fontWeight: 700,
                  opacity: 1,
                };
              } else if (isSizing) {
                // step 2: every other fret becomes a plain, unmistakable picker
                spanStyle = {
                  background: "#FFFFFF",
                  border: "none",
                  color: "#15130F",
                  fontWeight: 500,
                  opacity: 1,
                };
              } else if (isBoundary) {
                spanStyle = {
                  background: c.root,
                  border: "none",
                  color: c.rootText,
                  fontWeight: 700,
                  opacity: 1,
                };
              } else {
                spanStyle = {
                  background: "transparent",
                  border: `1px solid ${isInlay ? c.muted : c.panelEdge}`,
                  color: isInlay ? c.muted : c.text,
                  fontWeight: 400,
                  opacity: isInlay ? 0.85 : 0.55,
                };
              }

              return (
                <button
                  key={fret}
                  onClick={() => selectFret(fret)}
                  style={{
                    height: ROW_H,
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    background: "transparent",
                    border: "none",
                    padding: 0,
                  }}
                >
                  <span
                    style={{
                      minWidth: 20,
                      padding: "2px 5px",
                      borderRadius: 5,
                      textAlign: "center",
                      fontFamily: "'IBM Plex Mono', monospace",
                      fontSize: 10,
                      ...spanStyle,
                    }}
                  >
                    {fret}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{ position: "relative", width: gridW }}>
            {/* active box highlight band */}
            {activeBox !== null && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: gridW,
                  top: OPEN_H + NUT_H + (activeBox.start - 1) * ROW_H,
                  height: (activeBox.end - activeBox.start + 1) * ROW_H,
                  background: c.band,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* "tap a fret" onboarding tooltip — points at FRET_TIP_TARGET */}
            {!hasUsedBox && !fretTipDismissed && !dontShowFretTip && (
              <div
                style={{
                  position: "absolute",
                  left: 6,
                  top: OPEN_H + NUT_H + (FRET_TIP_TARGET - 1) * ROW_H + ROW_H / 2 - 20,
                  width: 190,
                  zIndex: 4,
                  background: c.panel,
                  border: `1px solid ${c.panelEdge}`,
                  borderRadius: 10,
                  boxShadow: `0 0 20px 3px ${c.glow}`,
                  padding: "10px 12px 12px",
                }}
              >
                <div
                  style={{
                    position: "absolute",
                    left: -6,
                    top: 20,
                    width: 11,
                    height: 11,
                    background: c.panel,
                    borderLeft: `1px solid ${c.panelEdge}`,
                    borderBottom: `1px solid ${c.panelEdge}`,
                    transform: "rotate(45deg)",
                  }}
                />
                <div style={{ fontSize: 12, color: c.text, lineHeight: 1.4, marginBottom: 10 }}>
                  Tap a fret to start a box, tap another to set its width
                </div>
                <label
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 6,
                    fontSize: 11,
                    color: c.muted,
                    marginBottom: 10,
                    cursor: "pointer",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={fretTipCheckbox}
                    onChange={(e) => setFretTipCheckbox(e.target.checked)}
                    style={{ accentColor: c.root }}
                  />
                  Don't show this again
                </label>
                <button
                  onClick={() => {
                    setFretTipDismissed(true);
                    if (fretTipCheckbox) setDontShowFretTip(true);
                  }}
                  style={{ ...pillStyle(true, c), width: "100%", textAlign: "center" }}
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* double-stop connectors */}
            {doubleStopPairs.length > 0 && (
              <svg
                width={gridW}
                height={totalH}
                style={{ position: "absolute", top: 0, left: 0, pointerEvents: "none" }}
              >
                {doubleStopPairs.map((p, idx) => {
                  const x1 = p.sIdx * COL_W + COL_W / 2;
                  const y1 = OPEN_H + NUT_H + (p.fret - 1) * ROW_H + ROW_H / 2;
                  const x2 = (p.sIdx + 1) * COL_W + COL_W / 2;
                  const y2 = OPEN_H + NUT_H + (p.fret2 - 1) * ROW_H + ROW_H / 2;
                  const dx = x2 - x1;
                  const dy = y2 - y1;
                  const dist = Math.sqrt(dx * dx + dy * dy) || 1;
                  const r = 15;
                  const ux = dx / dist;
                  const uy = dy / dist;
                  return (
                    <line
                      key={idx}
                      x1={x1 + ux * r}
                      y1={y1 + uy * r}
                      x2={x2 - ux * r}
                      y2={y2 - uy * r}
                      stroke={c.dsLine}
                      strokeWidth={2}
                      strokeLinecap="round"
                      opacity={0.65}
                    />
                  );
                })}
              </svg>
            )}

            {/* vertical string lines */}
            {strings.map((_, sIdx) => (
              <div
                key={sIdx}
                style={{
                  position: "absolute",
                  top: 0,
                  height: totalH,
                  left: sIdx * COL_W + COL_W / 2,
                  width: 1 + (strings.length - 1 - sIdx) * 0.3,
                  background: c.string,
                }}
              />
            ))}

            {/* open row */}
            <div style={{ height: OPEN_H, display: "flex", position: "relative" }}>
              {strings.map((openNote, sIdx) => {
                const note = noteAt(openNote, 0);
                return (
                  <div
                    key={sIdx}
                    style={{ width: COL_W, display: "flex", alignItems: "center", justifyContent: "center" }}
                  >
                    <NoteCell
                      note={note}
                      fret={0}
                      isOpen
                      inScaleMap={inScaleMap}
                      labelMode={labelMode}
                      scale={scale}
                      isRoot={NOTES.indexOf(note) === rootIdx}
                      colors={c}
                      activeBox={activeBox}
                    />
                  </div>
                );
              })}
            </div>

            {/* nut */}
            <div style={{ height: NUT_H, background: c.nut }} />

            {/* fret rows */}
            {Array.from({ length: instrument.frets }).map((_, i) => {
              const fret = i + 1;
              const isInlay = INLAY_FRETS.includes(fret);
              const isDouble = fret === 12;
              return (
                <div
                  key={fret}
                  style={{ height: ROW_H, display: "flex", position: "relative", borderBottom: `1px solid ${c.fretWire}` }}
                >
                  {isInlay && !isDouble && (
                    <div
                      style={{
                        position: "absolute",
                        left: "50%",
                        top: "50%",
                        transform: "translate(-50%,-50%)",
                        width: 7,
                        height: 7,
                        borderRadius: "50%",
                        background: c.inlay,
                      }}
                    />
                  )}
                  {isDouble && (
                    <>
                      <div
                        style={{
                          position: "absolute",
                          left: "33%",
                          top: "50%",
                          transform: "translate(-50%,-50%)",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: c.inlay,
                        }}
                      />
                      <div
                        style={{
                          position: "absolute",
                          left: "67%",
                          top: "50%",
                          transform: "translate(-50%,-50%)",
                          width: 7,
                          height: 7,
                          borderRadius: "50%",
                          background: c.inlay,
                        }}
                      />
                    </>
                  )}
                  {strings.map((openNote, sIdx) => {
                    const note = noteAt(openNote, fret);
                    return (
                      <div
                        key={sIdx}
                        style={{ width: COL_W, display: "flex", alignItems: "center", justifyContent: "center" }}
                      >
                        <NoteCell
                          note={note}
                          fret={fret}
                          inScaleMap={inScaleMap}
                          labelMode={labelMode}
                          scale={scale}
                          isRoot={NOTES.indexOf(note) === rootIdx}
                          colors={c}
                          activeBox={activeBox}
                        />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Backdrop */}
      {panel && <div onClick={() => setPanel(null)} style={{ position: "fixed", inset: 0, zIndex: 5 }} />}

      {/* Bottom control bar + option panel wrapper. The panel is positioned
          absolutely (anchored above the bar) so opening it never changes the
          height of the fretboard's scroll container above and re-triggers
          the fit-scale ResizeObserver. */}
      <div style={{ position: "relative", flexShrink: 0 }}>

      {/* Option panel */}
      {panel && (
        <div
          style={{
            position: "absolute",
            bottom: "100%",
            left: 0,
            right: 0,
            zIndex: 6,
            background: c.panel,
            borderTop: `1px solid ${c.panelEdge}`,
            maxHeight: "45vh",
            overflowY: "auto",
            display: "flex",
            justifyContent: "center",
          }}
        >
        <div style={{ width: "100%", maxWidth: 480, padding: "16px 16px 20px" }}>
          {panel === "key" && (
            <div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  marginBottom: 8,
                }}
              >
                ROOT
              </div>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(6, 1fr)", gap: 8, marginBottom: 16 }}>
                {NOTES.map((n) => (
                  <button key={n} onClick={() => setRoot(n)} style={pillStyle(n === root, c)}>
                    {n}
                  </button>
                ))}
              </div>

              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                  marginBottom: 10,
                }}
              >
                <span
                  style={{
                    fontFamily: "'IBM Plex Mono', monospace",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    color: c.muted,
                  }}
                >
                  SCALES
                </span>
                <button
                  onClick={() => setScaleEditMode((e) => !e)}
                  aria-label={scaleEditMode ? "Done editing" : "Edit scale list"}
                  style={{
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    border: `1px solid ${c.panelEdge}`,
                    background: scaleEditMode ? c.root : "transparent",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color: scaleEditMode ? c.rootText : c.text,
                  }}
                >
                  {scaleEditMode ? <Check size={14} /> : <Pencil size={14} />}
                </button>
              </div>

              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                {visibleScaleNames.map((s) => (
                  <div key={s} style={{ position: "relative" }}>
                    <button
                      onClick={() => {
                        if (scaleEditMode) {
                          hideScale(s);
                        } else {
                          setScaleName(s);
                          setPanel(null);
                        }
                      }}
                      style={pillStyle(s === scaleName, c)}
                    >
                      {s}
                    </button>
                    {scaleEditMode && (
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: "#B0413E",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <Minus size={10} color="#FFFFFF" />
                      </span>
                    )}
                  </div>
                ))}
                {!scaleEditMode &&
                  hiddenScales.slice(0, 2).map((s) => (
                    <div key={s} style={{ position: "relative" }}>
                      <button onClick={() => previewTap(s)} style={{ ...pillStyle(false, c), opacity: 0.6 }}>
                        {s}
                      </button>
                      <span
                        style={{
                          position: "absolute",
                          top: -6,
                          right: -6,
                          width: 16,
                          height: 16,
                          borderRadius: "50%",
                          background: c.toneBorder,
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          pointerEvents: "none",
                        }}
                      >
                        <Plus size={10} color={c.bg} />
                      </span>
                    </div>
                  ))}
              </div>

              {/* Hidden modes: only reachable in edit mode, collapses away on exit */}
              <div
                style={{
                  maxHeight: scaleEditMode ? 400 : 0,
                  opacity: scaleEditMode ? 1 : 0,
                  overflow: "hidden",
                  transition: "max-height 0.25s ease, opacity 0.2s ease",
                  marginTop: scaleEditMode && hiddenScales.length > 0 ? 14 : 0,
                }}
              >
                {hiddenScales.length > 0 && (
                  <>
                    <div
                      style={{
                        fontFamily: "'IBM Plex Mono', monospace",
                        fontSize: 10,
                        letterSpacing: "0.08em",
                        color: c.muted,
                        marginBottom: 8,
                      }}
                    >
                      HIDDEN
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                      {hiddenScales.map((s) => (
                        <div key={s} style={{ position: "relative" }}>
                          <button
                            onClick={() => restoreScale(s)}
                            style={{ ...pillStyle(false, c), opacity: 0.6 }}
                          >
                            {s}
                          </button>
                          <span
                            style={{
                              position: "absolute",
                              top: -6,
                              right: -6,
                              width: 16,
                              height: 16,
                              borderRadius: "50%",
                              background: c.toneBorder,
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              pointerEvents: "none",
                            }}
                          >
                            <Plus size={10} color={c.bg} />
                          </span>
                        </div>
                      ))}
                    </div>
                  </>
                )}
              </div>
            </div>
          )}

          {panel === "labels" && (
            <div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  marginBottom: 8,
                }}
              >
                LABELS
              </div>
              <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
                {PRIMARY_LABEL_MODES.map((m) => {
                  const Icon = m.icon;
                  const isActive = m.key === labelMode;
                  return (
                    <button
                      key={m.key}
                      onClick={() => {
                        setLabelMode(m.key);
                        setPanel(null);
                      }}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        width: "100%",
                        padding: "10px 14px",
                        borderRadius: 10,
                        border: `1px solid ${isActive ? c.root : c.panelEdge}`,
                        background: isActive ? "rgba(201,151,59,0.12)" : "transparent",
                        color: isActive ? c.root : c.text,
                        fontSize: 14,
                        fontFamily: "'IBM Plex Sans', sans-serif",
                        textAlign: "left",
                      }}
                    >
                      <Icon size={16} />
                      <span style={{ flex: 1 }}>{m.label}</span>
                      {isActive && <Check size={16} />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {panel === "more" && (
            <div>
              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  marginBottom: 8,
                }}
              >
                INSTRUMENT
              </div>
              <OptionGrid
                options={Object.keys(INSTRUMENTS).map((k) => ({ key: k, label: INSTRUMENTS[k].label }))}
                current={instrumentKey}
                onSelect={(k) => setInstrumentKey(k)}
                colors={c}
              />

              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  margin: "14px 0 8px",
                }}
              >
                TUNING
              </div>
              <OptionGrid
                options={tuningNames.map((t) => ({ key: t, label: t }))}
                current={tuningName}
                onSelect={(t) => setTuningName(t)}
                colors={c}
              />

              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  margin: "14px 0 8px",
                }}
              >
                DOUBLE STOPS
              </div>
              <div style={{ display: "flex", gap: 8 }}>
                {["off", "third", "sixth"].map((m) => (
                  <button key={m} onClick={() => setDsMode(m)} style={pillStyle(m === dsMode, c)}>
                    {dsDisplay[m]}
                  </button>
                ))}
              </div>

              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  margin: "14px 0 8px",
                }}
              >
                APPEARANCE
              </div>
              <button
                onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: `1px solid ${c.panelEdge}`,
                  background: "transparent",
                  color: c.text,
                  fontSize: 13,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                {theme === "dark" ? <Sun size={14} /> : <Moon size={14} />}
                {theme === "dark" ? "Dark" : "Light"}
              </button>

              <div
                style={{
                  fontFamily: "'IBM Plex Mono', monospace",
                  fontSize: 11,
                  letterSpacing: "0.08em",
                  color: c.muted,
                  margin: "14px 0 8px",
                }}
              >
                EXPERIMENTAL
              </div>
              <button
                onClick={() => setLabelMode((m) => (m === "finger" ? "note" : "finger"))}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "8px 14px",
                  borderRadius: 20,
                  border: `1px solid ${labelMode === "finger" ? c.root : c.panelEdge}`,
                  background: labelMode === "finger" ? "rgba(201,151,59,0.12)" : "transparent",
                  color: labelMode === "finger" ? c.root : c.text,
                  fontSize: 13,
                  fontFamily: "'IBM Plex Sans', sans-serif",
                }}
              >
                <Fingerprint size={14} />
                Finger position (beta)
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "10px 12px",
          borderTop: `1px solid ${c.panelEdge}`,
          background: c.panel,
          position: "relative",
          zIndex: 6,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 8,
            width: "100%",
            maxWidth: 480,
          }}
        >
          <div
            aria-hidden="true"
            title="Fretwork"
            style={{
              width: 22,
              height: 22,
              flexShrink: 0,
              backgroundColor: c.root,
              WebkitMaskImage: `url(${logoMarkUrl})`,
              maskImage: `url(${logoMarkUrl})`,
              WebkitMaskRepeat: "no-repeat",
              maskRepeat: "no-repeat",
              WebkitMaskPosition: "center",
              maskPosition: "center",
              WebkitMaskSize: "contain",
              maskSize: "contain",
            }}
          />
          <Chip
            label={`${root} · ${scaleName}`}
            active={panel === "key"}
            onClick={() => togglePanel("key")}
            accent
            colors={c}
          />
          <div style={{ flex: 1 }} />
          <LabelModeButton labelMode={labelMode} active={panel === "labels"} onClick={() => togglePanel("labels")} colors={c} />
          <button
            onClick={() => togglePanel("more")}
            aria-label="More settings"
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${panel === "more" ? c.root : c.panelEdge}`,
              background: panel === "more" ? "rgba(201,151,59,0.12)" : "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: panel === "more" ? c.root : c.text,
            }}
          >
            <MoreHorizontal size={16} />
          </button>
        </div>
      </div>
      </div>
    </div>
  );
}

function NoteCell({ note, fret, inScaleMap, labelMode, scale, isRoot, isOpen, colors, activeBox }) {
  const pitchClass = NOTES.indexOf(note);
  const degreeIdx = inScaleMap.get(pitchClass);
  const inScale = degreeIdx !== undefined;

  if (!inScale) {
    if (!isOpen) return null;
    return (
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: colors.muted,
          background: colors.bg,
          padding: "2px 5px",
          borderRadius: 4,
        }}
      >
        {note}
      </div>
    );
  }

  let label = note;
  if (labelMode === "degree") {
    label = scale.degrees[degreeIdx];
  } else if (labelMode === "finger") {
    if (isOpen) {
      label = "O";
    } else {
      const inWindow = activeBox !== null && fret >= activeBox.start && fret <= activeBox.end;
      label = inWindow ? String(fret - activeBox.start + 1) : scale.degrees[degreeIdx];
    }
  }

  return (
    <div
      style={{
        width: 27,
        height: 27,
        borderRadius: "50%",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        fontFamily: "'IBM Plex Mono', monospace",
        fontSize: 11,
        fontWeight: 500,
        background: isRoot ? colors.root : colors.bg,
        color: isRoot ? colors.rootText : colors.toneText,
        border: isRoot ? "none" : `1.5px solid ${colors.toneBorder}`,
      }}
    >
      {label}
    </div>
  );
}

function OptionGrid({ options, current, onSelect, colors }) {
  return (
    <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
      {options.map((o) => (
        <button key={o.key} onClick={() => onSelect(o.key)} style={pillStyle(o.key === current, colors)}>
          {o.label}
        </button>
      ))}
    </div>
  );
}

function pillStyle(active, colors) {
  return {
    padding: "8px 14px",
    borderRadius: 20,
    border: `1px solid ${active ? colors.root : colors.panelEdge}`,
    background: active ? "rgba(201,151,59,0.12)" : "transparent",
    color: active ? colors.root : colors.text,
    fontSize: 13,
    fontFamily: "'IBM Plex Sans', sans-serif",
    whiteSpace: "nowrap",
  };
}

function LabelModeButton({ labelMode, active, onClick, colors }) {
  const current = LABEL_MODES.find((m) => m.key === labelMode);
  const Icon = current.icon;
  return (
    <button
      onClick={onClick}
      aria-label="Label mode"
      style={{
        flexShrink: 0,
        display: "flex",
        alignItems: "center",
        gap: 6,
        padding: "8px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? colors.root : colors.panelEdge}`,
        background: active ? "rgba(201,151,59,0.12)" : "transparent",
        color: active ? colors.root : colors.text,
        fontFamily: "'IBM Plex Sans', sans-serif",
        fontSize: 12,
        whiteSpace: "nowrap",
      }}
    >
      Labels
      <Icon size={14} />
    </button>
  );
}

function Chip({ label, onClick, active, accent, mono, colors }) {
  return (
    <button
      onClick={onClick}
      style={{
        flexShrink: 0,
        padding: "8px 12px",
        borderRadius: 20,
        border: `1px solid ${active ? colors.root : colors.panelEdge}`,
        background: active ? "rgba(201,151,59,0.12)" : "transparent",
        color: accent ? colors.root : colors.text,
        fontFamily: mono ? "'IBM Plex Mono', monospace" : "'IBM Plex Sans', sans-serif",
        fontSize: 12,
        letterSpacing: mono ? "0.04em" : 0,
        whiteSpace: "nowrap",
      }}
    >
      {label}
    </button>
  );
}

// Mount to the DOM
import { createRoot } from 'react-dom/client';

const container = document.getElementById('root');
const root = createRoot(container);
root.render(<Fretwork />);
