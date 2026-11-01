// ?edit — hand-fix the word timings of a track's lyrics (loaded by main.js only with ?edit).
// A list of the sung lines sits on the right of the track view, every word with its start time.
// Play the track (slowed down if needed) and press S / TAP the moment each word starts: the
// selected word gets that time and the next one is selected. The lyrics on the stage follow at
// once. Edits are kept on this device (localStorage) until EXPORT, which downloads one file with
// every edited track; `python -I tools/align_lyrics.py manual lyrics_edit.json` puts it on the site.
const KEY = "xt-edit:";
const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const fmt = (t) => `${Math.floor(t / 60)}:${(t % 60).toFixed(2).padStart(5, "0")}`;
const copy = (o) => JSON.parse(JSON.stringify(o));

// the lyrics to edit: this device's edits if they were made on the same SoundCloud text,
// else a copy of the site's timings, else the bare text with rough times (3 s a line)
export function load(title, text, sync) {
  if (!text.length) return null;
  const same = (d) => d && d.src.join("\n") === text.join("\n");
  try {
    const mine = JSON.parse(localStorage.getItem(KEY + title));
    if (same(mine)) return mine;
  } catch {}
  if (same(sync)) return copy({ src: sync.src, lines: sync.lines, stanza: sync.stanza, words: sync.words });
  return { src: text, lines: text.slice(), stanza: text.map(() => 0),
    words: text.map((l, i) => l.split(" ").map((_, j) => [i * 3 + j * 0.4, i * 3 + j * 0.4 + 0.4])) };
}

let ed = null;

export function open({ tv, audio, sync, rebuild, retime }) {
  close();
  const el = document.createElement("div");
  el.className = "tv-edit";
  el.innerHTML = `<div class="te-bar">
      <button data-a="rate" data-v="1">1×</button><button data-a="rate" data-v=".75">.75×</button><button data-a="rate" data-v=".5">.5×</button>
      <button data-a="undo">UNDO</button><button data-a="export">EXPORT</button><button data-a="reset">RESET</button>
    </div>
    <button class="te-tap" data-a="tap">TAP — WORD STARTS NOW</button>
    <div class="te-help">click a word: select it, play from 1 s before · S / Enter / TAP: the selected word starts now, next word ·
      ← → move it 0.05 s (Shift 0.25) · ↑ ↓ previous / next word · Space play / pause · 1 2 3 speed ·
      D repeat the line after itself · X delete the line · B stanza break before the line · Ctrl+Z undo</div>
    <div class="te-list"></div>`;
  document.body.appendChild(el);                         // over the HUD's right panel (the stage sits under the HUD)
  const list = el.querySelector(".te-list");
  ed = { el, tv, audio, sync, sel: [0, 0], undo: [], raf: 0 };

  const save = () => { try { localStorage.setItem(KEY + tv.title, JSON.stringify(sync)); } catch {} };
  const snap = () => { ed.undo.push(copy(sync)); if (ed.undo.length > 100) ed.undo.shift(); };
  const flat = () => sync.words.flatMap((ws, i) => ws.map((w, j) => [i, j, w]));
  // a word lasts until the next one starts (1.5 s at most), the stage holds it lit at least 0.9 s
  const ends = () => {
    const f = flat();
    f.forEach(([, , w], k) => {
      const nx = f[k + 1]?.[2][0];
      w[1] = +(nx > w[0] ? Math.min(nx, w[0] + 1.5) : w[0] + 0.4).toFixed(2);
    });
  };
  const timed = () => { ends(); retime(); save(); };
  const shaped = () => { ends(); rebuild(); save(); render(); };

  function render() {
    list.innerHTML = sync.lines.map((l, i) => {
      const brk = i && sync.stanza[i] !== sync.stanza[i - 1];
      const ws = l.split(" ").map((w, j) => `<span class="te-w" data-i="${i}" data-j="${j}">${esc(w)}<i>${fmt(sync.words[i][j][0])}</i></span>`).join("");
      return `<div class="te-ln${brk ? " te-st" : ""}" data-i="${i}"><b>${i + 1}</b>${ws}</div>`;
    }).join("");
    mark();
  }
  const chip = (i, j) => list.querySelector(`.te-w[data-i="${i}"][data-j="${j}"]`);
  function mark(scroll) {
    list.querySelector(".te-w.sel")?.classList.remove("sel");
    const c = chip(...ed.sel);
    if (!c) return;
    c.classList.add("sel");
    if (scroll) {                                         // only the list scrolls (scrollIntoView would move the page too)
      const r = c.getBoundingClientRect(), box = list.getBoundingClientRect();
      if (r.top < box.top) list.scrollTop += r.top - box.top - 20;
      else if (r.bottom > box.bottom) list.scrollTop += r.bottom - box.bottom + 20;
    }
  }
  const select = (i, j, scroll = true) => { ed.sel = [i, j]; mark(scroll); };
  const step = (d) => {
    const f = flat(), k = f.findIndex(([i, j]) => i === ed.sel[0] && j === ed.sel[1]) + d;
    if (f[k]) select(f[k][0], f[k][1]);
  };
  const word = () => sync.words[ed.sel[0]]?.[ed.sel[1]];
  const from = (t) => { audio.currentTime = Math.max(0, t); audio.play().catch(() => {}); };

  const act = {
    tap() {
      const w = word();
      if (!w) return;
      snap();
      w[0] = +audio.currentTime.toFixed(2);
      chip(...ed.sel).querySelector("i").textContent = fmt(w[0]);
      timed();
      step(1);
    },
    nudge(d) {
      const w = word();
      if (!w) return;
      snap();
      w[0] = +Math.max(0, w[0] + d).toFixed(2);
      chip(...ed.sel).querySelector("i").textContent = fmt(w[0]);
      timed();
      from(w[0] - 0.6);                                   // hear it again from just before
    },
    dup() {                                               // the line once more right after itself, a little later
      snap();
      const i = ed.sel[0], ws = sync.words[i], len = ws[ws.length - 1][1] - ws[0][0] + 0.3;
      sync.lines.splice(i + 1, 0, sync.lines[i]);
      sync.words.splice(i + 1, 0, ws.map(([a, b]) => [+(a + len).toFixed(2), +(b + len).toFixed(2)]));
      sync.stanza.splice(i + 1, 0, sync.stanza[i]);
      ed.sel = [i + 1, 0];
      shaped();
    },
    del() {
      if (sync.lines.length < 2) return;
      snap();
      const i = ed.sel[0];
      sync.lines.splice(i, 1); sync.words.splice(i, 1); sync.stanza.splice(i, 1);
      ed.sel = [Math.min(i, sync.lines.length - 1), 0];
      shaped();
    },
    brk() {                                               // stanza break before the line: on / off
      const i = ed.sel[0];
      if (!i) return;
      snap();
      const cuts = sync.stanza.map((s, k) => k > 0 && s !== sync.stanza[k - 1]);
      cuts[i] = !cuts[i];
      let s = 0;
      sync.stanza = cuts.map((c) => (s += c ? 1 : 0));
      shaped();
    },
    undo() {
      const prev = ed.undo.pop();
      if (!prev) return;
      Object.assign(sync, prev);
      ed.sel = [Math.min(ed.sel[0], sync.lines.length - 1), 0];
      shaped();
    },
    rate(v) {
      audio.playbackRate = v;
      el.querySelectorAll('[data-a="rate"]').forEach((b) => b.classList.toggle("on", +b.dataset.v === v));
    },
    export() {
      const all = {};
      for (let k = 0; k < localStorage.length; k++) {
        const key = localStorage.key(k);
        if (key.startsWith(KEY)) try { all[key.slice(KEY.length)] = JSON.parse(localStorage.getItem(key)); } catch {}
      }
      all[tv.title] = sync;
      const a = document.createElement("a");
      a.href = URL.createObjectURL(new Blob([JSON.stringify(all)], { type: "application/json" }));
      a.download = "lyrics_edit.json";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    },
    reset() {
      if (!confirm(`Drop your edits of ${tv.title} and go back to the site's timings?`)) return;
      try { localStorage.removeItem(KEY + tv.title); } catch {}
      location.reload();
    },
  };

  el.addEventListener("pointerdown", (e) => {
    const b = e.target.closest("button");
    if (b) {
      e.preventDefault();                                 // keep the keyboard on the page, not the button
      const a = b.dataset.a;
      a === "rate" ? act.rate(+b.dataset.v) : act[a]?.();
      return;
    }
    const w = e.target.closest(".te-w");
    if (w) { select(+w.dataset.i, +w.dataset.j, false); from(word()[0] - 1); }
  });
  ed.keys = (e) => {
    if (!tv.el || e.target.closest?.("input, textarea") || e.altKey || e.metaKey) return;
    if (e.ctrlKey && e.code !== "KeyZ") return;
    const sh = e.shiftKey ? 0.25 : 0.05;
    const k = { KeyS: act.tap, Enter: act.tap, ArrowLeft: () => act.nudge(-sh), ArrowRight: () => act.nudge(sh),
      ArrowUp: () => step(-1), ArrowDown: () => step(1), KeyD: act.dup, KeyX: act.del, Delete: act.del, KeyB: act.brk,
      KeyZ: e.ctrlKey ? act.undo : null, Digit1: () => act.rate(1), Digit2: () => act.rate(0.75), Digit3: () => act.rate(0.5) }[e.code];
    if (!k) return;
    e.preventDefault(); e.stopImmediatePropagation();     // the player's own keys (wind, next track) stay out
    k();
  };
  addEventListener("keydown", ed.keys, true);
  // the word being sung, marked in the list
  const loop = () => {
    const t = audio.currentTime, f = flat();
    let now = null;
    for (const [i, j, w] of f) if (w[0] <= t) now = [i, j];
    const c = now && chip(...now);
    if (c !== ed.now) { ed.now?.classList.remove("now"); c?.classList.add("now"); ed.now = c; }
    ed.raf = requestAnimationFrame(loop);
  };
  render();
  act.rate(audio.playbackRate || 1);
  ed.raf = requestAnimationFrame(loop);
}

export function close() {
  if (!ed) return;
  cancelAnimationFrame(ed.raf);
  removeEventListener("keydown", ed.keys, true);
  ed.audio.playbackRate = 1;
  ed.el.remove();
  ed = null;
}
