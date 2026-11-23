import React, { useState, useMemo, useEffect, useRef } from "react";
import { Sun, Moon, Pencil, Check, Minus, Plus, Fingerprint, MoreHorizontal, Music2, Ruler, Play, Square, SlidersHorizontal, X } from "lucide-react";
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
    inlays: [3, 5, 7, 9, 12, 15], // position-marker dots; 12 is drawn as a double dot
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
    inlays: [3, 5, 7, 10, 12, 15],
    tunings: {
      "Standard (GDAE)": ["G", "D", "A", "E"],
      "Cross (AEAE)": ["A", "E", "A", "E"],
    },
  },
  ukulele: {
    label: "Ukulele",
    frets: 15,
    inlays: [5, 7, 10, 12, 15],
    tunings: {
      "Standard (GCEA)": ["G", "C", "E", "A"],
      "Baritone (DGBE)": ["D", "G", "B", "E"],
    },
  },
  banjo: {
    label: "Banjo",
    frets: 15,
    inlays: [3, 5, 7, 10, 12, 15],
    // 5-string banjo: the short 5th (drone) string sits on the bass side, so it's
    // leftmost in the player's view even though it's pitched high, and it starts
    // at the 5th fret instead of the nut. A string can be a plain note name or
    // { note, startFret } for a string like this.
    tunings: {
      "Open G (gDGBD)": [{ note: "G", startFret: 5 }, "D", "G", "B", "D"],
      "Double C (gCGCD)": [{ note: "G", startFret: 5 }, "C", "G", "C", "D"],
      "Sawmill (gDGCD)": [{ note: "G", startFret: 5 }, "D", "G", "C", "D"],
      "Open D (f#DF#AD)": [{ note: "F#", startFret: 5 }, "D", "F#", "A", "D"],
      "Drop C (gCGBD)": [{ note: "G", startFret: 5 }, "C", "G", "B", "D"],
    },
  },
};

// ---------- PROTOTYPE: scale loop (throwaway, for a user interview) ----------
// Octave of each open string, low -> high, so the loop can play real pitches.
// The production data model has pitch classes only; see DECISIONS.md.
const TUNING_OCTAVES = {
  guitar: { default: [2, 2, 3, 3, 3, 4] },
  mandolin: { default: [3, 4, 4, 5] },
  ukulele: { default: [4, 4, 4, 4], "Baritone (DGBE)": [3, 3, 3, 4] }, // standard is re-entrant (G4 C4 E4 A4)
  banjo: { default: [4, 3, 3, 3, 4], "Double C (gCGCD)": [4, 3, 3, 4, 4], "Sawmill (gDGCD)": [4, 3, 3, 4, 4] },
};
const TIME_SIGS = [
  { key: "2/4", label: "2/4", beats: 2 },
  { key: "3/4", label: "3/4", beats: 3 },
  { key: "4/4", label: "4/4", beats: 4 },
  { key: "6/8", label: "6/8", beats: 6 },
];
const SUBDIVS = [
  { key: 1, label: "♩ 1/beat" },
  { key: 2, label: "♫ 2/beat" },
  { key: 3, label: "3 (triplets)" },
  { key: 4, label: "4 (16ths)" },
];
const DIRECTIONS = [
  { key: "up", label: "Up" },
  { key: "down", label: "Down" },
  { key: "updown", label: "Up & down" },
];

function loopOrder(n, direction) {
  const up = Array.from({ length: n }, (_, i) => i);
  if (direction === "down") return up.reverse();
  if (direction === "updown") return n > 1 ? [...up, ...up.slice(1, -1).reverse()] : up;
  return up;
}

// Karplus-Strong plucked string, rendered once per pitch and cached.
const pluckCache = new Map();
function pluckBuffer(ctx, midi) {
  if (pluckCache.has(midi)) return pluckCache.get(midi);
  const sr = ctx.sampleRate;
  const freq = 440 * Math.pow(2, (midi - 69) / 12);
  const len = Math.floor(sr * 1.5);
  const buf = ctx.createBuffer(1, len, sr);
  const d = buf.getChannelData(0);
  const N = Math.max(2, Math.round(sr / freq));
  const ring = new Float32Array(N);
  for (let i = 0; i < N; i++) ring[i] = Math.random() * 2 - 1;
  let idx = 0;
  for (let i = 0; i < len; i++) {
    const a = ring[idx];
    const b = ring[(idx + 1) % N];
    d[i] = a;
    ring[idx] = ((a + b) / 2) * 0.997;
    idx = (idx + 1) % N;
  }
  pluckCache.set(midi, buf);
  return buf;
}
function playPluck(ctx, midi, time) {
  const src = ctx.createBufferSource();
  src.buffer = pluckBuffer(ctx, midi);
  const g = ctx.createGain();
  g.gain.value = 0.5;
  src.connect(g).connect(ctx.destination);
  src.start(time);
}
function playClick(ctx, time, accent) {
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.frequency.value = accent ? 1600 : 1000;
  g.gain.setValueAtTime(accent ? 0.35 : 0.2, time);
  g.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  osc.connect(g).connect(ctx.destination);
  osc.start(time);
  osc.stop(time + 0.05);
}
// ---------- end PROTOTYPE data ----------

const DEFAULT_VISIBLE_SCALES =["Major", "Dorian", "Minor", "Major Pentatonic", "Minor Pentatonic", "Blues", "Mixolydian"];
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
    band: "rgba(201,151,59,0.20)", // stronger than light's 0.12: faint tints vanish on near-black screens
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

// Vertical position of a fret row; fret 0 is the open-string row above the nut.
function rowTop(fret) {
  return fret === 0 ? 0 : OPEN_H + NUT_H + (fret - 1) * ROW_H;
}
function rowBottom(fret) {
  return fret === 0 ? OPEN_H : OPEN_H + NUT_H + fret * ROW_H;
}
function rowCenter(fret) {
  return fret === 0 ? OPEN_H / 2 : OPEN_H + NUT_H + (fret - 1) * ROW_H + ROW_H / 2;
}

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
  const [hasSetBoxWidth, setHasSetBoxWidth] = useState(false);
  const [selectedStrings, setSelectedStrings] = useState([]); // string indices highlighted via the open-string row
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
  const strings = useMemo(
    () =>
      (instrument.tunings[tuningName] || instrument.tunings[tuningNames[0]]).map((st) =>
        typeof st === "string" ? { note: st, startFret: 0 } : st
      ),
    [instrument, tuningName]
  );
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
    setSelectedStrings([]);
  }, [instrumentKey]);

  useEffect(() => {
    if (panel !== "key") setScaleEditMode(false);
  }, [panel]);

  // Keep the page behind the app in sync with the in-app theme (see index.html),
  // so nothing lighter/darker shows through while iOS re-lays out on rotation.
  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

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
      setHasSetBoxWidth(true);
    }
  };

  // Highlight by string: selected strings narrow the focus area to their columns,
  // within the active box if there is one, or along the whole neck if not.
  const toggleString = (sIdx) =>
    setSelectedStrings((prev) => (prev.includes(sIdx) ? prev.filter((i) => i !== sIdx) : [...prev, sIdx]));

  // Notes outside the focus area fade so it stands out. Open-string notes double
  // as the string toggles, so they only fade lightly, and only when strings are
  // selected.
  // Both ends of a drawn double stop stay at full strength, even when the
  // partner note sits just outside the box.
  const noteOpacity = (sIdx, fret, isOpenRow) => {
    const hasStrings = selectedStrings.length > 0;
    if (activeBox === null && !hasStrings) return 1;
    const inStrings = !hasStrings || selectedStrings.includes(sIdx);
    if (isOpenRow) return inStrings ? 1 : 0.6;
    const inFrets = activeBox === null || (fret >= activeBox.start && fret <= activeBox.end);
    if ((inFrets && inStrings) || doubleStopNotes.has(`${sIdx}:${fret}`)) return 1;
    return 0.3;
  };

  // Diatonic double-stop pairs: adjacent-string note pairs a 3rd or 6th apart,
  // scoped to the focus area (active box rows × selected strings) so the overlay
  // doesn't clutter the whole neck. With no box and no selected strings: none.
  const doubleStopPairs = useMemo(() => {
    if (dsMode === "off" || (activeBox === null && selectedStrings.length === 0)) return [];
    const offsets = dsMode === "third" ? [4, 3] : [9, 8];
    const rangeStart = activeBox ? activeBox.start : 1;
    const rangeEnd = activeBox ? Math.min(instrument.frets, activeBox.end) : instrument.frets;
    const pairs = [];
    for (let i = 0; i < strings.length - 1; i++) {
      if (selectedStrings.length > 0 && !(selectedStrings.includes(i) && selectedStrings.includes(i + 1))) continue;
      // Skip pairs with a short drone string (banjo's 5th): it's a drone, not a
      // double-stop partner, and it doesn't exist below its start fret anyway.
      if (strings[i].startFret > 0 || strings[i + 1].startFret > 0) continue;
      const openA = strings[i].note;
      const openB = strings[i + 1].note;
      for (let f = rangeStart; f <= rangeEnd; f++) {
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
          if (f2 < (rangeStart === 0 ? 0 : 1) || f2 > instrument.frets) continue;
          if (noteAt(openB, f2) === targetNote) {
            pairs.push({ sIdx: i, fret: f, fret2: f2 });
            break;
          }
        }
      }
    }
    return pairs;
  }, [activeBox, selectedStrings, dsMode, strings, inScaleMap, instrument.frets]);

  const doubleStopNotes = useMemo(
    () => new Set(doubleStopPairs.flatMap((p) => [`${p.sIdx}:${p.fret}`, `${p.sIdx + 1}:${p.fret2}`])),
    [doubleStopPairs]
  );

  // ---------- PROTOTYPE: scale loop ----------
  // The notes in the focus area (fret box × selected strings), each pitch once
  // (on the lowest string that has it), low to high.
  const loopSequence = useMemo(() => {
    if (activeBox === null && selectedStrings.length === 0) return [];
    const octs = TUNING_OCTAVES[instrumentKey];
    const oct = octs[tuningName] || octs.default;
    const fStart = activeBox ? activeBox.start : 0;
    const fEnd = activeBox ? activeBox.end : instrument.frets;
    const byMidi = new Map();
    strings.forEach((st, sIdx) => {
      if (selectedStrings.length > 0 && !selectedStrings.includes(sIdx)) return;
      const openMidi = 12 * (oct[sIdx] + 1) + NOTES.indexOf(st.note);
      for (let f = Math.max(fStart, st.startFret); f <= fEnd; f++) {
        const midi = openMidi + (f - st.startFret);
        if (!inScaleMap.has(midi % 12) || byMidi.has(midi)) continue;
        byMidi.set(midi, { sIdx, fret: f, midi });
      }
    });
    return [...byMidi.values()].sort((a, b) => a.midi - b.midi);
  }, [activeBox, selectedStrings, strings, inScaleMap, instrumentKey, tuningName, instrument.frets]);

  const [loopOn, setLoopOn] = useState(false);
  const [playing, setPlaying] = useState(false);
  const [bpm, setBpm] = useState(80);
  const [beatsPerBar, setBeatsPerBar] = useState(4);
  const [subdiv, setSubdiv] = useState(2);
  const [direction, setDirection] = useState("updown");
  const [clickOn, setClickOn] = useState(true);
  const [countIn, setCountIn] = useState(true);
  const [trainer, setTrainer] = useState(false);
  const [playingKey, setPlayingKey] = useState(null);
  const [beatNow, setBeatNow] = useState(-1);
  const [loopCount, setLoopCount] = useState(0);
  const engine = useRef({ ctx: null, timer: null, raf: null, queue: [], wake: null, taps: [] });
  const live = useRef({});
  live.current = { seq: loopSequence, bpm, beatsPerBar, subdiv, direction, clickOn, trainer };

  const stopLoop = () => {
    const e = engine.current;
    clearInterval(e.timer);
    cancelAnimationFrame(e.raf);
    e.timer = null;
    e.queue = [];
    e.wake?.release?.().catch(() => {});
    e.wake = null;
    setPlaying(false);
    setPlayingKey(null);
    setBeatNow(-1);
  };

  const startLoop = () => {
    const e = engine.current;
    if (!e.ctx) e.ctx = new (window.AudioContext || window.webkitAudioContext)();
    const ctx = e.ctx;
    ctx.resume();
    navigator.wakeLock?.request("screen").then((w) => (e.wake = w)).catch(() => {});
    const L0 = live.current;
    const st = { next: ctx.currentTime + 0.1, tick: 0, step: 0, countLeft: countIn ? L0.beatsPerBar * L0.subdiv : 0, loops: 0 };
    setLoopCount(0);
    const schedule = () => {
      while (st.next < ctx.currentTime + 0.12) {
        const L = live.current;
        const tickDur = 60 / L.bpm / L.subdiv;
        const isBeat = st.tick % L.subdiv === 0;
        const beatIdx = Math.floor(st.tick / L.subdiv) % L.beatsPerBar;
        const counting = st.countLeft > 0;
        if (isBeat && (L.clickOn || counting)) playClick(ctx, st.next, beatIdx === 0);
        let key = null;
        if (counting) {
          st.countLeft--;
        } else if (L.seq.length > 0) {
          const order = loopOrder(L.seq.length, L.direction);
          const pos = order[st.step % order.length];
          const n = L.seq[pos];
          if (n) {
            playPluck(ctx, n.midi, st.next);
            key = `${n.sIdx}:${n.fret}`;
          }
          st.step++;
          if (st.step % order.length === 0) {
            st.loops++;
            const loops = st.loops;
            setLoopCount(loops);
            if (L.trainer && loops % 2 === 0) setBpm((b) => Math.min(300, b + 5));
          }
        }
        e.queue.push({ time: st.next, key, beat: isBeat ? beatIdx : null, counting });
        st.next += tickDur;
        st.tick++;
      }
    };
    schedule();
    e.timer = setInterval(schedule, 25);
    const draw = () => {
      const now = ctx.currentTime;
      let last = null;
      while (e.queue.length && e.queue[0].time <= now) last = e.queue.shift();
      if (last) {
        setPlayingKey(last.key);
        if (last.beat !== null) setBeatNow(last.counting ? -2 - last.beat : last.beat);
      }
      e.raf = requestAnimationFrame(draw);
    };
    e.raf = requestAnimationFrame(draw);
    setPlaying(true);
  };

  // Tap a note on the neck to hear it (while the scale loop is on).
  const openMidiFor = (sIdx) => {
    const octs = TUNING_OCTAVES[instrumentKey];
    const oct = (octs[tuningName] || octs.default)[sIdx];
    return 12 * (oct + 1) + NOTES.indexOf(strings[sIdx].note);
  };
  const tapNote = (sIdx, fret) => {
    if (!loopOn) return;
    const e = engine.current;
    if (!e.ctx) e.ctx = new (window.AudioContext || window.webkitAudioContext)();
    e.ctx.resume();
    playPluck(e.ctx, openMidiFor(sIdx) + (fret - strings[sIdx].startFret), e.ctx.currentTime + 0.01);
    if (!playing) {
      const key = `${sIdx}:${fret}`;
      setPlayingKey(key);
      clearTimeout(e.tapFlash);
      e.tapFlash = setTimeout(() => setPlayingKey((k) => (k === key ? null : k)), 250);
    }
  };

  const tapTempo = () => {
    const e = engine.current;
    const now = performance.now();
    e.taps = [...e.taps.filter((t) => now - t < 2500), now].slice(-5);
    if (e.taps.length >= 2) {
      const gaps = e.taps.slice(1).map((t, i) => t - e.taps[i]);
      const avg = gaps.reduce((a, b) => a + b, 0) / gaps.length;
      setBpm(Math.max(30, Math.min(300, Math.round(60000 / avg))));
    }
  };

  useEffect(() => () => stopLoop(), []);
  useEffect(() => {
    if (!loopOn) stopLoop();
  }, [loopOn]);
  // ---------- end PROTOTYPE ----------

  const dismissFretTip = () => {
    setFretTipDismissed(true);
    if (fretTipCheckbox) setDontShowFretTip(true);
  };

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

  // Inlay dots are centered on the full-length strings, so a short string
  // (banjo's 5th) doesn't pull them onto the middle string. With no short
  // string these are the usual 50% / 33% / 67%.
  const inlayPos = useMemo(() => {
    const full = strings.map((st, i) => (st.startFret === 0 ? i : -1)).filter((i) => i >= 0);
    if (full.length === strings.length) return { center: "50%", left: "33%", right: "67%" };
    const center = ((full[0] + full[full.length - 1] + 1) / 2 / strings.length) * 100;
    const offset = (17 * full.length) / strings.length;
    return { center: `${center}%`, left: `${center - offset}%`, right: `${center + offset}%` };
  }, [strings]);
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
        paddingTop: "env(safe-area-inset-top)",
        transition: "background 0.2s ease, color 0.2s ease",
      }}
    >
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Mono:wght@400;500;700&display=swap');
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
            {/* Fret 0 selects the open strings, so a box can start at the nut. */}
            {Array.from({ length: instrument.frets + 1 }).map((_, fret) => {
              const isInlay = instrument.inlays.includes(fret);
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
                <React.Fragment key={fret}>
                <button
                  onClick={() => selectFret(fret)}
                  aria-label={fret === 0 ? "Open strings" : `Fret ${fret}`}
                  style={{
                    height: fret === 0 ? OPEN_H : ROW_H,
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
                {fret === 0 && <div style={{ height: NUT_H }} />}
                </React.Fragment>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{ position: "relative", width: gridW }}>
            {/* active box highlight band (full width when no strings are selected) */}
            {activeBox !== null && selectedStrings.length === 0 && (
              <div
                style={{
                  position: "absolute",
                  left: 0,
                  width: gridW,
                  top: rowTop(activeBox.start),
                  height: rowBottom(activeBox.end) - rowTop(activeBox.start),
                  background: c.band,
                  pointerEvents: "none",
                }}
              />
            )}

            {/* selected-string bands: the open-string cell marks the selection, and the
                column is highlighted within the box, or down the whole neck without one */}
            {selectedStrings.map((sIdx) => (
              <React.Fragment key={`str-${sIdx}`}>
                {!(activeBox && activeBox.start === 0) && (
                <div
                  style={{
                    position: "absolute",
                    left: sIdx * COL_W,
                    width: COL_W,
                    top: 0,
                    height: activeBox ? OPEN_H : totalH,
                    background: c.band,
                    pointerEvents: "none",
                  }}
                />
                )}
                {activeBox && (
                  <div
                    style={{
                      position: "absolute",
                      left: sIdx * COL_W,
                      width: COL_W,
                      top: rowTop(activeBox.start),
                      height: rowBottom(activeBox.end) - rowTop(activeBox.start),
                      background: c.band,
                      pointerEvents: "none",
                    }}
                  />
                )}
              </React.Fragment>
            ))}

            {/* Two-step onboarding tooltip: step 1 points at FRET_TIP_TARGET ("start a
                box"); once that first tap drops an anchor, step 2 points at a nearby
                fret ("set its width"). One dismissal / don't-show-again covers both. */}
            {!fretTipDismissed && !dontShowFretTip && !hasUsedBox && (
              <OnboardingTip
                fret={FRET_TIP_TARGET}
                text="Tap a fret to start a box, tap another to set its width"
                colors={c}
                checked={fretTipCheckbox}
                onCheck={setFretTipCheckbox}
                onDismiss={dismissFretTip}
              />
            )}
            {!fretTipDismissed && !dontShowFretTip && selectionStart !== null && !hasSetBoxWidth && (
              <OnboardingTip
                fret={widthTipFret(selectionStart, instrument.frets)}
                text="Now tap another fret to set the box's width"
                colors={c}
                checked={fretTipCheckbox}
                onCheck={setFretTipCheckbox}
                onDismiss={dismissFretTip}
              />
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
                  const y1 = rowCenter(p.fret);
                  const x2 = (p.sIdx + 1) * COL_W + COL_W / 2;
                  const y2 = rowCenter(p.fret2);
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
            {strings.map((st, sIdx) => {
              // A short string (banjo's 5th) starts at its open-note position on
              // the neck instead of the nut, and is the thinnest string.
              const top = st.startFret > 0 ? OPEN_H + NUT_H + (st.startFret - 1) * ROW_H + ROW_H / 2 : 0;
              return (
                <div
                  key={sIdx}
                  style={{
                    position: "absolute",
                    top,
                    height: totalH - top,
                    left: sIdx * COL_W + COL_W / 2,
                    width: st.startFret > 0 ? 1 : 1 + (strings.length - 1 - sIdx) * 0.3,
                    background: c.string,
                  }}
                />
              );
            })}

            {/* mini nut for a short string, just below its open-note position */}
            {strings.map((st, sIdx) =>
              st.startFret > 0 ? (
                <div
                  key={`nut-${sIdx}`}
                  style={{
                    position: "absolute",
                    top: OPEN_H + NUT_H + st.startFret * ROW_H - NUT_H,
                    left: sIdx * COL_W + COL_W * 0.2,
                    width: COL_W * 0.6,
                    height: NUT_H,
                    background: c.nut,
                    borderRadius: 1,
                  }}
                />
              ) : null
            )}

            {/* open row */}
            <div style={{ height: OPEN_H, display: "flex", position: "relative" }}>
              {strings.map((st, sIdx) => {
                const note = st.note;
                return (
                  <button
                    key={sIdx}
                    onClick={() => {
                      toggleString(sIdx);
                      if (st.startFret === 0) tapNote(sIdx, 0);
                    }}
                    aria-label={`Highlight string ${strings.length - sIdx} (${note})`}
                    aria-pressed={selectedStrings.includes(sIdx)}
                    style={{
                      width: COL_W,
                      height: OPEN_H,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "transparent",
                      border: "none",
                      padding: 0,
                      cursor: "pointer",
                    }}
                  >
                    {st.startFret === 0 && (
                      <NoteCell
                        note={note}
                        fret={0}
                        isOpen
                        opacity={noteOpacity(sIdx, 0, true)}
                        playing={playingKey === `${sIdx}:0`}
                        inScaleMap={inScaleMap}
                        labelMode={labelMode}
                        scale={scale}
                        isRoot={NOTES.indexOf(note) === rootIdx}
                        colors={c}
                        activeBox={activeBox}
                        instrumentKey={instrumentKey}
                      />
                    )}
                  </button>
                );
              })}
            </div>

            {/* nut */}
            <div style={{ height: NUT_H, background: c.nut }} />

            {/* fret rows */}
            {Array.from({ length: instrument.frets }).map((_, i) => {
              const fret = i + 1;
              const isInlay = instrument.inlays.includes(fret);
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
                        left: inlayPos.center,
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
                          left: inlayPos.left,
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
                          left: inlayPos.right,
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
                  {strings.map((st, sIdx) => {
                    // Fret relative to where this string starts (0 = its open note);
                    // a short string has nothing to show above its start fret.
                    const localFret = fret - st.startFret;
                    const note = noteAt(st.note, localFret);
                    return (
                      <div
                        key={sIdx}
                        onClick={localFret >= 0 && (inScaleMap.has(NOTES.indexOf(note)) || localFret === 0) ? () => tapNote(sIdx, fret) : undefined}
                        style={{ width: COL_W, display: "flex", alignItems: "center", justifyContent: "center", cursor: loopOn ? "pointer" : undefined }}
                      >
                        {localFret >= 0 && (
                          <NoteCell
                            note={note}
                            fret={fret}
                            isOpen={localFret === 0}
                            opacity={noteOpacity(sIdx, fret, false)}
                            playing={playingKey === `${sIdx}:${fret}`}
                            inScaleMap={inScaleMap}
                            labelMode={labelMode}
                            scale={scale}
                            isRoot={NOTES.indexOf(note) === rootIdx}
                            colors={c}
                            activeBox={activeBox}
                            instrumentKey={instrumentKey}
                          />
                        )}
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

          {panel === "loop" && (
            <div>
              <SectionLabel colors={c}>TIME SIGNATURE</SectionLabel>
              <OptionGrid options={TIME_SIGS} current={TIME_SIGS.find((t) => t.beats === beatsPerBar)?.key}
                onSelect={(k) => setBeatsPerBar(TIME_SIGS.find((t) => t.key === k).beats)} colors={c} />
              <SectionLabel colors={c} top>NOTES PER BEAT</SectionLabel>
              <OptionGrid options={SUBDIVS} current={subdiv} onSelect={setSubdiv} colors={c} />
              <SectionLabel colors={c} top>DIRECTION</SectionLabel>
              <OptionGrid options={DIRECTIONS} current={direction} onSelect={setDirection} colors={c} />
              <SectionLabel colors={c} top>OPTIONS</SectionLabel>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 8 }}>
                <button onClick={() => setClickOn((v) => !v)} style={pillStyle(clickOn, c)}>Click</button>
                <button onClick={() => setCountIn((v) => !v)} style={pillStyle(countIn, c)}>1-bar count-in</button>
                <button onClick={() => setTrainer((v) => !v)} style={pillStyle(trainer, c)}>Speed trainer: +5 BPM every 2 loops</button>
              </div>
              <div style={{ marginTop: 14, fontSize: 11, color: c.muted, fontFamily: "'IBM Plex Mono', monospace", lineHeight: 1.6 }}>
                {loopSequence.length > 0
                  ? `${loopSequence.length} notes: ` + loopSequence.map((n) => NOTES[n.midi % 12] + (Math.floor(n.midi / 12) - 1)).join(" ")
                  : "No notes yet: tap two fret numbers to make a box."}
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
                EXPERIMENTAL
              </div>
              <button
                onClick={() => {
                  setLoopOn((v) => !v);
                  setPanel(null);
                }}
                style={{ ...pillStyle(loopOn, c), display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}
              >
                <Play size={14} />
                Scale loop (prototype)
              </button>
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
                Finger position labels (beta)
              </button>
            </div>
          )}
        </div>
        </div>
      )}

      {/* PROTOTYPE: scale loop transport */}
      {loopOn && (
        <div style={{ display: "flex", justifyContent: "center", padding: "8px 12px", borderTop: `1px solid ${c.panelEdge}`, background: c.panel, position: "relative", zIndex: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, width: "100%", maxWidth: 480 }}>
            <button
              onClick={() => (playing ? stopLoop() : startLoop())}
              disabled={!playing && loopSequence.length === 0}
              aria-label={playing ? "Stop" : "Play"}
              style={{ ...roundBtn(c, true), width: 40, height: 40, opacity: !playing && loopSequence.length === 0 ? 0.4 : 1 }}
            >
              {playing ? <Square size={16} fill="currentColor" /> : <Play size={18} fill="currentColor" />}
            </button>
            <button onClick={() => setBpm((b) => Math.max(30, b - 5))} aria-label="Slower" style={roundBtn(c)}><Minus size={14} /></button>
            <div style={{ textAlign: "center", minWidth: 44, fontFamily: "'IBM Plex Mono', monospace" }}>
              <div style={{ fontSize: 17, fontWeight: 700, color: c.text, lineHeight: 1 }}>{bpm}</div>
              <div style={{ fontSize: 9, color: c.muted, letterSpacing: "0.08em" }}>BPM</div>
            </div>
            <button onClick={() => setBpm((b) => Math.min(300, b + 5))} aria-label="Faster" style={roundBtn(c)}><Plus size={14} /></button>
            <button onClick={tapTempo} style={{ ...pillStyle(false, c), padding: "6px 10px", fontSize: 12 }}>Tap</button>
            <div style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 3, minWidth: 0 }}>
              <div style={{ display: "flex", gap: 4 }}>
                {Array.from({ length: beatsPerBar }).map((_, i) => {
                  const counting = beatNow <= -2;
                  const on = counting ? -2 - beatNow === i : beatNow === i;
                  return <div key={i} style={{ width: 7, height: 7, borderRadius: "50%", background: on ? (counting ? c.toneBorder : c.root) : c.panelEdge }} />;
                })}
              </div>
              <div style={{ fontSize: 9, color: c.muted, fontFamily: "'IBM Plex Mono', monospace", whiteSpace: "nowrap" }}>
                {loopSequence.length === 0 ? "make a fret box" : beatNow <= -2 ? "count-in" : `${TIME_SIGS.find((t) => t.beats === beatsPerBar).key} · loop ${loopCount}`}
              </div>
            </div>
            <button onClick={() => togglePanel("loop")} aria-label="Loop settings" style={{ ...roundBtn(c), borderColor: panel === "loop" ? c.root : c.panelEdge, color: panel === "loop" ? c.root : c.text }}>
              <SlidersHorizontal size={14} />
            </button>
            <button onClick={() => setLoopOn(false)} aria-label="Close scale loop" style={roundBtn(c)}><X size={14} /></button>
          </div>
        </div>
      )}

      {/* Bottom control bar */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          padding: "10px 12px",
          paddingBottom: "calc(10px + env(safe-area-inset-bottom))",
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
            onClick={() => setTheme((t) => (t === "dark" ? "light" : "dark"))}
            aria-label={theme === "dark" ? "Switch to light theme" : "Switch to dark theme"}
            style={{
              flexShrink: 0,
              width: 32,
              height: 32,
              borderRadius: "50%",
              border: `1px solid ${c.panelEdge}`,
              background: "transparent",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: c.text,
            }}
          >
            {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
          </button>
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

// Finger position (beta): assumes a 4-finger hand and a single, unshifted
// position within the user-selected reference box. Guitar/ukulele use a
// fixed one-finger-per-fret position (CAGED-style), independent of which
// frets are actually diatonic. Mandolin follows the "next scale note, next
// finger" convention instead: fingers are assigned in order to the in-scale
// frets on a given string within the box, skipping non-scale frets entirely
// rather than counting fret distance. Anything outside the box, or beyond a
// 4-finger reach within it, is unknown rather than guessed, so it shows a
// dash.
function fingerLabel(note, fret, activeBox, inScaleMap, instrumentKey) {
  if (activeBox === null || fret < activeBox.start || fret > activeBox.end) return "–";
  // Banjo fingering conventions haven't been researched yet (see DECISIONS.md),
  // so it shows "unknown" rather than borrowing another instrument's rule.
  if (instrumentKey === "banjo") return "–";

  if (instrumentKey === "mandolin") {
    const pitchClass = NOTES.indexOf(note);
    const openPitch = (((pitchClass - fret) % 12) + 12) % 12;
    let rank = 0;
    for (let f = Math.max(1, activeBox.start); f <= fret; f++) {
      if (inScaleMap.has((openPitch + f) % 12)) rank++;
    }
    return rank <= 4 ? String(rank) : "–";
  }

  const offset = fret - Math.max(1, activeBox.start); // open position: fret 1 is finger 1
  return offset <= 3 ? String(offset + 1) : "–";
}

function NoteCell({ note, fret, inScaleMap, labelMode, scale, isRoot, isOpen, colors, activeBox, instrumentKey, opacity = 1, playing = false }) {
  // PROTOTYPE: the note the scale loop is sounding right now pops and glows.
  const fade = playing
    ? { opacity: 1, transform: "scale(1.3)", boxShadow: `0 0 0 3px ${colors.root}, 0 0 16px 4px ${colors.glow}`, transition: "transform 0.05s ease" }
    : { opacity, transition: "opacity 0.15s ease, transform 0.15s ease" };
  // A faded token sits on an opaque backing in the page color, so the string
  // line doesn't show through it — only the token itself fades.
  const backed = (token, radius) =>
    opacity < 1 && !playing ? <div style={{ background: colors.bg, borderRadius: radius }}>{token}</div> : token;
  const pitchClass = NOTES.indexOf(note);
  const degreeIdx = inScaleMap.get(pitchClass);
  const inScale = degreeIdx !== undefined;

  if (!inScale) {
    if (!isOpen) return null;
    return backed(
      <div
        style={{
          fontFamily: "'IBM Plex Mono', monospace",
          fontSize: 11,
          color: colors.muted,
          background: colors.bg,
          padding: "2px 5px",
          borderRadius: 4,
          ...fade,
        }}
      >
        {note}
      </div>,
      4
    );
  }

  let label = note;
  if (labelMode === "degree") {
    label = scale.degrees[degreeIdx];
  } else if (labelMode === "finger") {
    label = isOpen ? "O" : fingerLabel(note, fret, activeBox, inScaleMap, instrumentKey);
  }

  return backed(
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
        fontWeight: isRoot ? 700 : 500, // bold so the label reads against the brass fill
        background: isRoot ? colors.root : colors.bg,
        color: isRoot ? colors.rootText : colors.toneText,
        border: isRoot ? "none" : `1.5px solid ${colors.toneBorder}`,
        ...fade,
      }}
    >
      {label}
    </div>,
    "50%"
  );
}

// Fret the step-2 ("set its width") tooltip points at: two frets past the
// anchor, or two before it near the end of the neck so the tooltip stays on it.
function widthTipFret(anchor, frets) {
  return anchor + 2 <= frets - 2 ? anchor + 2 : anchor - 2;
}

function OnboardingTip({ fret, text, colors, checked, onCheck, onDismiss }) {
  return (
    <div
      style={{
        position: "absolute",
        left: 6,
        top: OPEN_H + NUT_H + (fret - 1) * ROW_H + ROW_H / 2 - 20,
        width: 190,
        zIndex: 4,
        background: colors.panel,
        border: `1px solid ${colors.panelEdge}`,
        borderRadius: 10,
        boxShadow: `0 0 20px 3px ${colors.glow}`,
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
          background: colors.panel,
          borderLeft: `1px solid ${colors.panelEdge}`,
          borderBottom: `1px solid ${colors.panelEdge}`,
          transform: "rotate(45deg)",
        }}
      />
      <div style={{ fontSize: 12, color: colors.text, lineHeight: 1.4, marginBottom: 10 }}>{text}</div>
      <label
        style={{
          display: "flex",
          alignItems: "center",
          gap: 6,
          fontSize: 11,
          color: colors.muted,
          marginBottom: 10,
          cursor: "pointer",
        }}
      >
        <input
          type="checkbox"
          checked={checked}
          onChange={(e) => onCheck(e.target.checked)}
          style={{ accentColor: colors.root }}
        />
        Don't show this again
      </label>
      <button onClick={onDismiss} style={{ ...pillStyle(true, colors), width: "100%", textAlign: "center" }}>
        Dismiss
      </button>
    </div>
  );
}

// PROTOTYPE helpers
function SectionLabel({ children, colors, top }) {
  return (
    <div style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 11, letterSpacing: "0.08em", color: colors.muted, margin: top ? "14px 0 8px" : "0 0 8px" }}>
      {children}
    </div>
  );
}
function roundBtn(colors, accent) {
  return {
    flexShrink: 0, width: 32, height: 32, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center",
    border: `1px solid ${accent ? colors.root : colors.panelEdge}`,
    background: accent ? colors.root : "transparent",
    color: accent ? colors.rootText : colors.text,
  };
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

// Service worker: with registerType 'autoUpdate', the page reloads once a new
// version takes control. Installed apps resumed from the background don't
// navigate, so also check for updates on return to view and hourly.
import { registerSW } from 'virtual:pwa-register';

registerSW({
  immediate: true,
  onRegisteredSW(swUrl, registration) {
    if (!registration) return;
    const check = () => navigator.onLine && registration.update();
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') check();
    });
    setInterval(check, 60 * 60 * 1000);
  },
});
