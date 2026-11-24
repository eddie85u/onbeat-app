// Onbeat's landing page: the motion and the sound. No libraries, nothing from other sites.
// Everything here is an extra: without this file the page is still, with every word and picture in place.
// Motion runs only when <html> has the class "anim" (set below unless the device asks for less motion).
(function () {
  'use strict';
  const doc = document, root = doc.documentElement;
  const $ = (s, r) => (r || doc).querySelector(s);
  const $$ = (s, r) => Array.from((r || doc).querySelectorAll(s));
  const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
  const lerp = (a, b, t) => a + (b - a) * t;
  const ease = (t) => (t < .5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2);
  const now = () => performance.now() / 1000;
  const SVG = 'http://www.w3.org/2000/svg';
  const svgEl = (tag, at, parent) => { const e = doc.createElementNS(SVG, tag); for (const k in at) e.setAttribute(k, at[k]); if (parent) parent.append(e); return e; };
  const barH = () => { const t = $('.top'); return t ? t.offsetHeight : 0; };

  const less = matchMedia('(prefers-reduced-motion: reduce)');
  let calm = less.matches;

  /* ---------- Headings settle in word by word; blocks rise once ---------- */
  $$('.settle').forEach((h) => {
    const parts = Array.from(h.childNodes), text = h.textContent.trim().replace(/\s+/g, ' ');
    h.setAttribute('aria-label', text);
    h.textContent = '';
    let i = 0;
    parts.forEach((node) => {
      if (node.nodeType !== 3) { h.append(node); return; } // a line break stays where it was written
      node.textContent.trim().split(/\s+/).filter(Boolean).forEach((word) => {
        const w = doc.createElement('span'), inner = doc.createElement('span');
        w.className = 'w'; w.setAttribute('aria-hidden', 'true');
        inner.style.setProperty('--i', i++); inner.textContent = word;
        w.append(inner); h.append(w, ' ');
      });
    });
  });
  const seen = 'IntersectionObserver' in window
    ? new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) { e.target.classList.add('in'); seen.unobserve(e.target); } }), { threshold: .12, rootMargin: '0px 0px -6% 0px' })
    : null;
  $$('.settle, .rv').forEach((el) => (seen ? seen.observe(el) : el.classList.add('in')));

  /* ---------- The drums: made here, no sound files. Only ever starts from a click, tap or key ---------- */
  function makeKit(ctx) {
    const bus = ctx.createGain(), comp = ctx.createDynamicsCompressor(), out = ctx.createGain();
    comp.threshold.value = -18; comp.knee.value = 12; comp.ratio.value = 4; comp.attack.value = .003; comp.release.value = .16;
    out.gain.value = .72;
    // A little room, so the kit sounds like one instrument.
    const len = Math.floor(ctx.sampleRate * .6), ir = ctx.createBuffer(2, len, ctx.sampleRate);
    for (let c = 0; c < 2; c++) { const d = ir.getChannelData(c); for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / len, 3.4); }
    const room = ctx.createConvolver(), wet = ctx.createGain(), dull = ctx.createBiquadFilter();
    room.buffer = ir; wet.gain.value = .14; dull.type = 'lowpass'; dull.frequency.value = 5200;
    bus.connect(comp); bus.connect(dull); dull.connect(room); room.connect(wet); wet.connect(comp); comp.connect(out);
    const nb = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = Math.random() * 2 - 1;

    const env = (t, peak, dur, attack = .002) => { const g = ctx.createGain(); g.gain.setValueAtTime(.0001, t); g.gain.exponentialRampToValueAtTime(Math.max(peak, .0002), t + attack); g.gain.exponentialRampToValueAtTime(.0001, t + dur); g.connect(bus); return g; };
    const tone = (type, f0, f1, sweep, t, dur, peak) => { const o = ctx.createOscillator(); o.type = type; o.frequency.setValueAtTime(f0, t); o.frequency.exponentialRampToValueAtTime(f1, t + sweep); o.connect(env(t, peak, dur)); o.start(t); o.stop(t + dur + .03); };
    const hiss = (type, freq, q, t, dur, peak) => { const s = ctx.createBufferSource(), f = ctx.createBiquadFilter(); s.buffer = nb; f.type = type; f.frequency.value = freq; f.Q.value = q; s.connect(f).connect(env(t, peak, dur, .001)); s.start(t, Math.random() * 1.4); s.stop(t + dur + .03); };
    // Six square waves at clashing pitches, filtered high: the ring of a cymbal.
    const metal = (t, dur, peak, cut) => { const hp = ctx.createBiquadFilter(), bp = ctx.createBiquadFilter(); hp.type = 'highpass'; hp.frequency.value = cut; bp.type = 'bandpass'; bp.frequency.value = 10000; bp.Q.value = .5; bp.connect(hp).connect(env(t, peak, dur, .001)); [263, 400, 421, 474, 587, 845].forEach((f) => { const o = ctx.createOscillator(); o.type = 'square'; o.frequency.value = f * 1.34; o.connect(bp); o.start(t); o.stop(t + dur + .03); }); };
    const tom = (f, t, v) => { tone('sine', f * 1.7, f, .08, t, .4, .9 * v); tone('triangle', f * 2.6, f * 1.4, .03, t, .07, .22 * v); hiss('lowpass', 1500, .7, t, .04, .25 * v); };
    const voices = {
      kick: (t, v) => { tone('sine', 155, 46, .11, t, .36, 1.1 * v); tone('triangle', 330, 90, .03, t, .05, .35 * v); hiss('lowpass', 2000, .7, t, .014, .3 * v); },
      snare: (t, v) => { tone('triangle', 198, 172, .06, t, .13, .55 * v); tone('sine', 332, 285, .04, t, .07, .25 * v); hiss('highpass', 1900, .7, t, .21, .6 * v); hiss('bandpass', 4300, 1.2, t, .12, .4 * v); },
      hihat: (t, v) => { metal(t, .045 + .035 * v, .2 * v, 7200); hiss('highpass', 9000, .7, t, .04, .05 * v); },
      crash: (t, v) => { metal(t, 1.5, .3 * v, 3800); hiss('highpass', 5200, .7, t, 1.25, .16 * v); hiss('bandpass', 9000, 1, t, .5, .1 * v); },
      ride: (t, v) => { metal(t, .7, .16 * v, 5600); tone('sine', 4180, 4170, .1, t, .35, .04 * v); },
      tom1: (t, v) => tom(172, t, v), tom2: (t, v) => tom(132, t, v), floor: (t, v) => tom(94, t, v),
      click: (t, v) => { tone('sine', 1760, 1700, .012, t, .035, .2 * v); tone('sine', 2480, 2400, .012, t, .028, .12 * v); hiss('bandpass', 3200, 2, t, .022, .3 * v); },
    };
    return { ctx, out, drum: (name, at, v = 1) => voices[name] && voices[name](Math.max(at || 0, ctx.currentTime), v) };
  }
  let kitLive = null;
  /** The kit, made on first use. Call only from a click, tap or key press: browsers allow sound no other way. */
  function kit() {
    if (kitLive) { if (kitLive.ctx.state === 'suspended') kitLive.ctx.resume(); return kitLive; }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    const ctx = new AC({ latencyHint: 'interactive' });
    kitLive = makeKit(ctx);
    kitLive.out.connect(ctx.destination);
    return kitLive;
  }
  const soundReady = () => !!kitLive && kitLive.ctx.state === 'running';

  /* ---------- The hero: one groove and fill, with the line, the sticks and the sound on one clock ---------- */
  const hero = (function () {
    const live = $('#live'), dataEl = $('#staff-data'), svg = $('#sheet svg');
    if (!live || !dataEl || !svg) return null;
    const data = JSON.parse(dataEl.textContent), slots = data.slots;
    const BEAT = 60 / 96, COUNT = 4, END = data.beats, LEAD = .7;
    const sheet = $('#sheet'), pan = $('#pan'), countin = $('#countin'), play = $('#play'), mute = $('#mute'), tip = $('#live-tip');
    const groups = slots.map((s) => svg.querySelector('[data-b="' + s.b + '"]'));
    const counts = slots.map((s) => svg.querySelector('[data-c="' + s.b + '"]'));
    const line = svgEl('line', { class: 'playhead', x1: slots[0].x, x2: slots[0].x, y1: 18, y2: 150 }, svg);
    const pulses = [0, 1, 2, 3, 4].map(() => ({ el: svgEl('circle', { class: 'pulse', r: 8 }, svg), t: -9 }));
    const dots = $$('.dots i', live);
    // Each hit shows as a mark in the strip under the staff, as in the app: a tick under its note, shifted left if early and
    // right if late (same colours as the app). The written notes keep their ink colour, like printed music.
    const marks = svgEl('g', { class: 'marks' }, svg);
    const MARK_Y = 181, MARK_CAP = 12, MARK_FULL_MS = 80;
    // How the demo player lands: on time almost everywhere, one hit a little early and one a little late.
    const OFFSET_MS = { 5: -38, 14: 52 };
    function mark(i) {
      const ms = OFFSET_MS[i] || 0, tone = ms === 0 ? 'ok' : ms < 0 ? 'early' : 'late';
      const x = slots[i].x + Math.max(-MARK_CAP, Math.min(MARK_CAP, Math.round(ms / MARK_FULL_MS * MARK_CAP * 10) / 10));
      const g = svgEl('g', { class: 'mark-sym tone-' + tone }, marks);
      svgEl('path', { d: 'M' + x + ' ' + (MARK_Y - 7) + 'L' + x + ' ' + (MARK_Y + 7) }, g);
    }
    const stR = $('#stR'), stL = $('#stL'), shR = $('#shR'), shL = $('#shL'), kickGlow = $('#kglow'), spark = $('#spark');
    const flashes = {}; $$('#scene [data-kit]').forEach((g) => { flashes[g.dataset.kit] = { el: $('.fl', g), t: -9, slow: g.dataset.kit === 'crash' || g.dataset.kit === 'ride' }; });
    const rings = [0, 1, 2, 3, 4, 5].map(() => ({ el: svgEl('ellipse', { opacity: 0 }, $('#rings')), t: -9, x: 320, y: 180, big: 1 }));
    const label = { pause: play.dataset.pause, again: play.dataset.again, play: play.dataset.play, silent: tip.dataset.silent, idle: tip.dataset.idle, done: tip.dataset.done, mOn: mute.dataset.on, mOff: mute.dataset.off };
    // The groove plays one pass at a time: by itself the first time the card is on screen (silent), once more with sound
    // after the first click, tap or key, and then once per press of the button.
    // audio: a click, tap or key has allowed sound. muted: the visitor turned it off with the speaker button.
    let audio = false, muted = false;

    // What sounds, and which hand plays it. The right hand keeps the hi-hat, the left takes the snare; the fill alternates.
    const sounds = [], seen = [], hitsR = [], hitsL = [];
    for (let k = 0; k < COUNT; k++) { sounds.push({ b: k - COUNT, pad: 'click', v: k ? .8 : 1 }); seen.push({ b: k - COUNT, what: 'click', n: k + 1 }); }
    // Where a stick lands on each drum of the picture (the right-hand tip a little to the right of the left).
    const SPOT = { hihat: [112, 157], snare: [227, 183], tom1: [268, 89], tom2: [372, 89], floor: [454, 183], crash: [150, 68] };
    const at = (pad, hand, b, v) => ({ b, v, x: SPOT[pad][0] + (hand === 'R' ? 9 : -9), y: SPOT[pad][1] });
    slots.forEach((s, i) => {
      const fill = !!s.stick, j = Math.round((s.b - 6) * 4);
      const v = fill ? (j % 2 ? .74 : .96) + j * .012 : 1;
      s.pads.forEach((p) => sounds.push({ b: s.b, pad: p, v: p === 'hihat' ? (s.b % 1 ? .5 : .85) : p === 'kick' ? .95 : v }));
      seen.push({ b: s.b, what: 'note', i });
      if (s.pads.includes('kick')) seen.push({ b: s.b, what: 'kick' });
      const hit = (hand, pad, vel) => { const h = at(pad, hand, s.b, vel); (hand === 'R' ? hitsR : hitsL).push(h); seen.push({ b: s.b, what: hand, v: vel, x: h.x, y: h.y }); };
      if (fill) hit(s.stick, s.pads.find((p) => p !== 'kick'), v);
      else { hit('R', 'hihat', s.b % 1 ? .5 : .9); if (s.pads.includes('snare')) hit('L', 'snare', 1); }
    });
    sounds.push({ b: END, pad: 'crash', v: 1 }, { b: END, pad: 'kick', v: 1 });
    sounds.sort((a, b) => a.b - b.b);
    const last = at('crash', 'R', END, 1.2);
    hitsR.push(last);
    seen.push({ b: END, what: 'R', v: 1.3, x: last.x, y: last.y }, { b: END, what: 'kick' }, { b: END, what: 'end' });
    seen.sort((a, b) => a.b - b.b);
    const clicks = [-4, -3, -2, -1].map((b) => ({ b, v: 1 }));

    // A stick runs from its tip toward the drummer's arm, off the bottom of the picture. At rest both tips sit on the snare;
    // to count in, the arms come up and the sticks cross and click.
    const REST = { R: { x: 236, y: 183 }, L: { x: 218, y: 183 } }, ARM = { R: [400, 430], L: [240, 430] };
    const CLICK = { R: { x: 290, y: 90, arm: [470, 300] }, L: { x: 350, y: 90, arm: [170, 300] } };
    /** Where a stick's tip is over the kit at beat bp: it travels to the next drum in the last moment before the hit. */
    function tipAt(hits, bp, rest) {
      let n = 0; while (n < hits.length && hits[n].b <= bp) n++;
      const p = hits[n - 1], q = hits[n];
      if (!q) { const back = p ? ease(clamp((bp - p.b - .9) / 1.1)) : 1; return p ? { x: lerp(p.x, rest.x, back), y: lerp(p.y, rest.y, back) } : rest; }
      const from = p || rest, gap = (p ? q.b - p.b : 1.2) * BEAT, e = ease(clamp(1 - (q.b - bp) * BEAT / Math.min(gap, .42)));
      return { x: lerp(from.x, q.x, e), y: lerp(from.y, q.y, e) };
    }
    const strike = (u) => (u < .4 ? 1 - Math.pow(1 - u / .4, 2) : 1 - Math.pow((u - .4) / .6, 2.6));
    /** How far a stick is lifted, in degrees, at beat bp: it leaves the pad after a hit and comes down exactly on the next. */
    function lift(hits, bp, top) {
      let n = 0; while (n < hits.length && hits[n].b <= bp) n++;
      const prev = hits[n - 1], next = hits[n];
      const since = prev ? (bp - prev.b) * BEAT : 9, until = next ? (next.b - bp) * BEAT : 9;
      const size = (h) => top * (.5 + .5 * Math.min(h.v, 1.2));
      if (prev && next && since + until <= .7) return clamp((since + until) * 78, 8, top) / top * size(next) * strike(since / (since + until));
      let h = 0;
      if (prev && since < .26) h = top * .22 * Math.sin(Math.PI * since / .26);
      if (next && until < .42) h = Math.max(h, size(next) * strike(1 - until / .42));
      return h;
    }

    let run = null, started = false, sizes = null, lastNote = -1, fxUntil = 0, looping = false;
    const manual = { R: -9, L: -9, next: 'L' };
    let tKick = -9, tSpark = -9, ringI = 0, pulseI = 0;

    function measure() { const w = pan.clientWidth, view = sheet.clientWidth; sizes = { scale: w / data.width, view, over: Math.max(0, w - view) }; }
    function xAt(bp) {
      if (bp <= 0) return slots[0].x;
      let i = slots.length - 1; while (i > 0 && slots[i].b > bp) i--;
      const a = slots[i], b = slots[i + 1], nb = b ? b.b : END, nx = b ? b.x : data.endX;
      return a.x + (nx - a.x) * clamp((bp - a.b) / (nb - a.b));
    }
    const ring = (x, y, big) => { const r = rings[ringI++ % rings.length]; r.t = now(); r.x = x; r.y = y; r.big = big; };
    const light = (pad, t) => { if (flashes[pad]) flashes[pad].t = t; };
    function fire(e, t) {
      if (e.what === 'click') { tSpark = t; countin.hidden = false; countin.textContent = e.n; countin.classList.remove('pop'); void countin.offsetWidth; countin.classList.add('pop'); }
      else if (e.what === 'note') {
        mark(e.i);
        slots[e.i].pads.forEach((p) => light(p, t));
        if (lastNote >= 0) counts[lastNote].classList.remove('now');
        counts[e.i].classList.add('now'); lastNote = e.i;
        const p = pulses[pulseI++ % pulses.length]; p.t = t; p.el.setAttribute('cx', slots[e.i].x); p.el.setAttribute('cy', slots[e.i].ys[0]);
      }
      else if (e.what === 'R' || e.what === 'L') { if (!calm) ring(e.x, e.y, .35 + .3 * e.v); }
      else if (e.what === 'kick') { tKick = t; light('kick', t); }
      else if (e.what === 'end') { light('crash', t); sheet.classList.add('crash'); setTimeout(() => sheet.classList.remove('crash'), 140); tip.textContent = label.done; tip.classList.add('ok'); }
    }
    const lag = () => (run && run.sound ? clamp((kitLive.ctx.outputLatency || 0) + (kitLive.ctx.baseLatency || 0), 0, .2) : 0);

    function draw() {
      const t = now();
      pump();
      let bp = -99, c = 0;
      if (run) {
        bp = (t - lag() - run.t0) / BEAT;
        while (run.vi < seen.length && seen[run.vi].b <= bp) fire(seen[run.vi++], t);
        if (bp > -.15 && !countin.hidden) countin.hidden = true;
        // The line, and on a narrow screen the music slides under it.
        const x = xAt(Math.min(bp, END));
        line.setAttribute('x1', x); line.setAttribute('x2', x);
        if (sizes.over > 0) pan.style.transform = 'translateX(' + -clamp(x * sizes.scale - sizes.view * .36, 0, sizes.over).toFixed(1) + 'px)';
        const beat = Math.floor(bp + COUNT + 1e-6), frac = bp + COUNT - beat;
        dots.forEach((d, k) => d.classList.toggle('on', bp < END && bp >= -COUNT && k === beat % 4 && frac < .45));
        // Sticks crossed for the count-in, then down to the pad just before the first note.
        c = bp < -COUNT ? ease(clamp((bp + COUNT + .95) / .7)) : 1 - ease(clamp((bp + .88) / .58));
        if (bp >= END + 1.7 / BEAT) finish();
      }
      if (!calm) {
        const man = (h) => { const a = t - manual[h]; return a < .2 ? 14 * Math.sin(Math.PI * a / .2) : 0; };
        const tap = run ? lift(clicks, bp, 11) : 0;
        [['R', stR, shR, hitsR, 1], ['L', stL, shL, hitsL, -1]].forEach(([h, st, sh, hits, side]) => {
          const up = Math.max(run ? lift(hits, bp, 30) : 0, man(h)) * 1.5;
          const g = run ? tipAt(hits, bp, REST[h]) : REST[h], k = CLICK[h];
          const x = lerp(g.x, k.x - side * tap, c), y = lerp(g.y - up, k.y - tap * .5, c);
          const ax = lerp(ARM[h][0], k.arm[0], c), ay = lerp(ARM[h][1], k.arm[1], c);
          st.setAttribute('transform', 'translate(' + x.toFixed(1) + ' ' + y.toFixed(1) + ') rotate(' + (Math.atan2(ay - y, ax - x) * 180 / Math.PI).toFixed(2) + ')');
          const high = up + c * 60;
          sh.setAttribute('cx', g.x.toFixed(1)); sh.setAttribute('cy', (g.y + 2).toFixed(1));
          sh.setAttribute('rx', (10 + high * .25).toFixed(1));
          sh.setAttribute('opacity', clamp(.5 - high * .012, 0, .5).toFixed(2));
        });
        for (const pad in flashes) { const f = flashes[pad]; f.el.setAttribute('opacity', (.85 * Math.exp(-(t - f.t) / (f.slow ? .3 : .09))).toFixed(3)); }
        kickGlow.setAttribute('opacity', Math.exp(-(t - tKick) / .16).toFixed(3));
        rings.forEach((r) => { const q = (t - r.t) / .4; if (q > 1) { r.el.setAttribute('opacity', 0); return; } const rx = 8 + 44 * q * r.big; r.el.setAttribute('cx', r.x); r.el.setAttribute('cy', r.y); r.el.setAttribute('rx', rx.toFixed(1)); r.el.setAttribute('ry', (rx * .45).toFixed(1)); r.el.setAttribute('opacity', ((1 - q) * .8).toFixed(2)); });
        const sq = (t - tSpark) / .3;
        spark.setAttribute('opacity', sq < 1 ? (1 - sq).toFixed(2) : 0); spark.setAttribute('r', (5 + 24 * clamp(sq)).toFixed(1));
        pulses.forEach((p) => { const q = (t - p.t) / .42; p.el.setAttribute('opacity', q < 1 ? ((1 - q) * .75).toFixed(2) : 0); p.el.setAttribute('r', (7 + 16 * clamp(q)).toFixed(1)); });
      }
      if (run || t < fxUntil) requestAnimationFrame(draw); else looping = false;
    }
    const wake = (secs) => { fxUntil = Math.max(fxUntil, now() + secs); if (!looping) { looping = true; requestAnimationFrame(draw); } };

    /** The sounds are handed to the audio clock a moment ahead, so a pause can stop them right away. */
    function pump() {
      if (!run || !run.sound) return;
      const k = kitLive;
      if (!k || k.ctx.state !== 'running') return;
      const off = k.ctx.currentTime - now(), t = now();
      if (run.si < 0) { run.si = 0; while (run.si < sounds.length && run.t0 + sounds[run.si].b * BEAT <= t + .05) run.si++; }
      while (run.si < sounds.length) {
        const s = sounds[run.si], at = run.t0 + s.b * BEAT;
        if (at > t + .12) break;
        run.si++;
        if (at > t) k.drum(s.pad, at + off, s.v);
      }
    }
    const level = () => { if (kitLive) kitLive.out.gain.setTargetAtTime(muted ? 0 : .72, kitLive.ctx.currentTime, .012); };
    function paint() {
      play.textContent = run ? label.pause : started ? label.again : label.play;
      play.setAttribute('aria-pressed', run ? 'true' : 'false');
      const on = audio && !muted;
      mute.classList.toggle('off', !on);
      mute.setAttribute('aria-label', on ? label.mOn : label.mOff);
      if (!tip.classList.contains('ok')) tip.textContent = audio ? label.idle : label.silent;
    }
    paint();
    /** Allow sound. From a click, tap or key only. */
    function unlock() {
      if (audio) return;
      const k = kit();
      if (!k) return;
      audio = true;
      if (run) { run.sound = true; run.si = -1; }
      level(); paint();
    }
    function start(again) {
      if (run) return;
      started = true;
      measure();
      marks.replaceChildren();
      if (lastNote >= 0) counts[lastNote].classList.remove('now');
      lastNote = -1;
      tip.classList.remove('ok');
      // The first time there is a count-in; each time round after that goes straight back in.
      run = { t0: now() + (again ? .6 : LEAD + COUNT * BEAT), vi: 0, si: -1, sound: audio };
      if (again) while (run.vi < seen.length && seen[run.vi].b < 0) run.vi++;
      live.classList.add('playing');
      paint(); wake(1);
    }
    function reset() {
      live.classList.remove('playing');
      pan.style.transform = '';
      countin.hidden = true;
      dots.forEach((d) => d.classList.remove('on'));
      line.setAttribute('x1', slots[0].x); line.setAttribute('x2', slots[0].x);
    }
    /** Stop now: the line, the sticks and, within a moment, the sound. */
    function stop() {
      if (!run) return;
      run = null; reset();
      marks.replaceChildren();
      if (lastNote >= 0) counts[lastNote].classList.remove('now');
      lastNote = -1; tip.classList.remove('ok');
      if (kitLive) { kitLive.out.gain.setTargetAtTime(0, kitLive.ctx.currentTime, .008); setTimeout(level, 300); }
      paint(); wake(.8);
    }
    function finish() {
      run = null; reset(); paint();
    }

    play.addEventListener('click', () => { unlock(); if (run) stop(); else start(false); paint(); });
    mute.addEventListener('click', () => { if (!audio) { muted = false; unlock(); } else muted = !muted; level(); paint(); });
    // The first click, tap or key anywhere on the page allows sound (browsers do not allow it sooner).
    const inView = () => { const r = sheet.getBoundingClientRect(); return r.bottom > barH() && r.top < innerHeight; };
    const allow = (e) => {
      if (e.target && e.target.closest && e.target.closest('#mute, #play')) return;
      const first = !audio;
      unlock();
      // The very first one also plays a pass with sound, if the card is there to be seen.
      if (first && audio && !calm && inView()) { stop(); start(false); }
    };
    doc.addEventListener('pointerdown', allow, true);
    doc.addEventListener('keydown', allow, true);
    // The pointer is a stick, all over the page: a click that lands on nothing else hits the snare.
    // On a phone only the hero card answers to a tap.
    const heroEl = $('#hero'), holder = doc.body;
    doc.addEventListener('click', (e) => {
      if (e.target.closest('a, button, summary, [data-pad]')) return;
      if (!heroEl.contains(e.target) && !matchMedia('(pointer: fine)').matches) return;
      const k = kit();
      if (k) k.drum('snare', 0, .9);
      const h = manual.next; manual[h] = now(); manual.next = h === 'L' ? 'R' : 'L';
      light('snare', now());
      wake(.6);
    });
    // On a computer the pointer is a drumstick: it hovers a little above where you point and strikes there on a click,
    // with the same ring the sticks leave on the drums.
    if (matchMedia('(pointer: fine)').matches) {
      const cur = doc.createElementNS(SVG, 'svg');
      cur.setAttribute('class', 'stickcur'); cur.setAttribute('viewBox', '0 0 120 120'); cur.setAttribute('aria-hidden', 'true');
      // A whole drumstick: acorn tip, a neck that widens to the shoulder, the shaft, a rounded butt.
      cur.innerHTML = '<defs><linearGradient id="g-cur" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f7e3b9"/><stop offset=".5" stop-color="#dcb571"/><stop offset="1" stop-color="#a5762f"/></linearGradient></defs>'
        + '<g><g transform="translate(10 10) rotate(45)"><path d="M9 -2 50 -4.3 124 -4.7Q130 -4.7 130 0 130 4.7 124 4.7L50 4.3 9 2Z" fill="url(#g-cur)"/><ellipse cx="5.5" cy="0" rx="6.5" ry="4.1" fill="#f6dfb0"/><path d="M50 -4.3 124 -4.7" stroke="#fff" stroke-opacity=".4" stroke-width=".8" fill="none"/></g></g>';
      holder.append(cur);
      const TIP = 96 * 10 / 120; // where the tip sits inside the drawing, at the size site.css gives it
      holder.addEventListener('pointermove', (e) => {
        const on = !calm && e.pointerType === 'mouse';
        root.classList.toggle('stick', on); cur.classList.toggle('show', on);
        cur.style.transform = 'translate(' + (e.clientX - TIP) + 'px,' + (e.clientY - TIP) + 'px)';
      });
      root.addEventListener('pointerleave', () => cur.classList.remove('show'));
      holder.addEventListener('pointerdown', (e) => {
        if (!cur.classList.contains('show')) return;
        cur.classList.add('down'); setTimeout(() => cur.classList.remove('down'), 70);
        for (const cls of ['tap', 'tap flash']) { const dot = doc.createElement('span'); dot.className = cls; dot.style.left = e.clientX + 'px'; dot.style.top = e.clientY + 'px'; holder.append(dot); setTimeout(() => dot.remove(), 460); }
      });
    }
    // A little depth: the card leans toward the pointer.
    if (matchMedia('(pointer: fine)').matches) {
      heroEl.addEventListener('pointermove', (e) => {
        if (calm) return;
        const b = heroEl.getBoundingClientRect();
        live.style.setProperty('--rx', ((e.clientX - b.left) / b.width - .5) * 5);
        live.style.setProperty('--ry', -((e.clientY - b.top) / b.height - .5) * 4);
      });
      heroEl.addEventListener('pointerleave', () => { live.style.setProperty('--rx', 0); live.style.setProperty('--ry', 0); });
    }
    // The groove plays one pass by itself, once: as soon as the music is on screen and the headline has settled.
    // On a phone that is when you scroll down to it. It is silent until a click, tap or key allows sound.
    const opened = now();
    function tryStart() {
      if (started || calm || doc.visibilityState !== 'visible' || now() - opened < 1.3) return;
      const r = sheet.getBoundingClientRect();
      if (r.top >= barH() && r.bottom <= innerHeight) start(false);
    }
    setTimeout(tryStart, 1400);
    // A hidden tab, or scrolling away, pauses the pass; it does not start again by itself.
    doc.addEventListener('visibilitychange', () => { if (doc.visibilityState === 'hidden') stop(); else tryStart(); });
    function onScrollHero() { if (run && !inView()) stop(); else tryStart(); }
    return { el: heroEl, onScroll: onScrollHero, measure() { if (run) measure(); } };
  })();

  /* ---------- One screen that changes shape: phone, iPad, computer, TV ---------- */
  const stage = (function () {
    const pin = $('#pin');
    if (!pin) return null;
    const box = $('#stage'), dev = $('#dev'), steps = $('#steps'), imgs = $$('.dev-screen img', dev), stand = $('.dev-stand', dev), base = $('.dev-base', dev);
    const glow = $('.stage-glow', box), stepEls = $$('.step', steps), rail = $('.rail', box), railEls = $$('li', rail);
    // a: width over height; r: corner; pad: bezel; mw, mh: the most of the stage it may take on a wide screen
    const SHAPES = [
      { a: 360 / 780, r: 40, pad: 9, mw: .5, mh: .84, hold: .75 },
      { a: 960 / 668, r: 26, pad: 14, mw: .5, mh: .7, hold: 1 },
      { a: 1280 / 652, r: 14, pad: 10, mw: .5, mh: .64, hold: 1, base: 1 },
      { a: 16 / 9, r: 12, pad: 7, mw: .54, mh: .74, hold: .75, stand: 1 },
    ];
    const MORPH = .7, TOTAL = SHAPES.reduce((s, x) => s + x.hold, 0) + (SHAPES.length - 1) * MORPH;
    let S = [];
    function shapeAt(p) {
      let u = p * TOTAL;
      for (let k = 0; k < SHAPES.length; k++) {
        if (u < SHAPES[k].hold) return k;
        u -= SHAPES[k].hold;
        if (k < SHAPES.length - 1) { if (u < MORPH) return k + ease(u / MORPH); u -= MORPH; }
      }
      return SHAPES.length - 1;
    }
    function layout() {
      if (calm) { steps.style.marginTop = ''; return; }
      const H = box.clientHeight, W = box.clientWidth, wide = W >= 900;
      steps.style.marginTop = -H + 'px';
      S = SHAPES.map((s) => {
        const mw = wide ? W * s.mw : W - 40, mh = wide ? H * s.mh : H * .46;
        let w = mw, h = w / s.a; if (h > mh) { h = mh; w = h * s.a; }
        return { w, h };
      });
      dev.style.setProperty('--dx', wide ? '70%' : '50%');
      dev.style.setProperty('--dy', wide ? '47%' : '27%');
    }
    function update() {
      if (calm) return;
      if (!S.length) layout();
      const r = pin.getBoundingClientRect(), top = barH(), room = r.height - (innerHeight - top);
      if (r.top > innerHeight * 1.2 || r.bottom < -innerHeight * .2) return;
      const p = room > 0 ? clamp((top - r.top) / room) : 0, s = shapeAt(p), i = Math.min(SHAPES.length - 2, Math.floor(s)), f = s - i;
      const mix = (key, from) => lerp(from[i][key], from[i + 1][key], f);
      dev.style.setProperty('--w', mix('w', S).toFixed(1) + 'px');
      dev.style.setProperty('--h', mix('h', S).toFixed(1) + 'px');
      dev.style.setProperty('--r', mix('r', SHAPES).toFixed(1) + 'px');
      dev.style.setProperty('--pad', mix('pad', SHAPES).toFixed(1) + 'px');
      dev.style.setProperty('--in', ease(clamp((innerHeight - r.top) / (innerHeight - top))).toFixed(3));
      imgs.forEach((im, k) => { im.style.opacity = clamp(1.5 - Math.abs(s - k) * 2).toFixed(3); });
      const near = (key) => SHAPES.reduce((v, sh, k) => (sh[key] ? Math.max(v, clamp(1 - Math.abs(s - k) * 3)) : v), 0);
      stand.style.opacity = near('stand'); base.style.opacity = near('base');
      glow.style.setProperty('--gx', (72 - s * 2) + '%');
      const at = Math.round(s);
      stepEls.forEach((el, k) => el.classList.toggle('on', k === at));
      railEls.forEach((el, k) => el.classList.toggle('on', k === at));
      rail.style.setProperty('--sp', (s / (SHAPES.length - 1)).toFixed(3));
    }
    return { layout, update };
  })();

  /* ---------- Scrolling: the page's own moving line, and layers that drift at different speeds ---------- */
  const layers = $$('.layers');
  layers.forEach((l) => $$('[data-sp]', l).forEach((el) => el.style.setProperty('--sp', el.dataset.sp)));
  let ticking = false;
  function onScroll() {
    ticking = false;
    const max = root.scrollHeight - innerHeight;
    root.style.setProperty('--page', max > 0 ? clamp(scrollY / max).toFixed(4) : 0);
    if (hero) {
      const r = hero.el.getBoundingClientRect();
      hero.el.style.setProperty('--hp', calm ? 0 : clamp(-r.top / Math.max(1, r.height)).toFixed(4));
      hero.onScroll();
    }
    if (stage) stage.update();
    milestones();
    if (!calm) layers.forEach((l) => { const r = l.getBoundingClientRect(); if (r.bottom > -200 && r.top < innerHeight + 200) l.style.setProperty('--v', clamp((innerHeight - r.top) / (innerHeight + r.height)).toFixed(4)); });
  }
  const queue = () => { if (!ticking) { ticking = true; requestAnimationFrame(onScroll); } };
  addEventListener('scroll', queue, { passive: true });
  addEventListener('resize', () => { root.style.setProperty('--top', barH() + 'px'); if (stage) stage.layout(); if (hero) hero.measure(); queue(); });

  /* ---------- "What do you want to play?": a style lights its paths; the basics stay lit ---------- */
  const paths = $('#paths'), note = $('#pick-note');
  if (paths) {
    const trunk = (paths.dataset.trunk || '').split(' '), items = $$('li', paths), chips = $$('.chips button');
    chips.forEach((chip) => chip.addEventListener('click', () => {
      const on = chip.getAttribute('aria-pressed') !== 'true';
      chips.forEach((c) => c.setAttribute('aria-pressed', String(on && c === chip)));
      const lit = on ? trunk.concat(chip.dataset.paths.split(' ')) : null;
      items.forEach((li) => { li.classList.toggle('on', !!lit && lit.includes(li.dataset.id)); li.classList.toggle('dim', !!lit && !lit.includes(li.dataset.id)); });
      if (note) note.textContent = on ? note.dataset.on : note.dataset.all;
    }));
  }
  /** The milestones light one by one as their line comes up the screen. */
  const miles = $('#miles'), mileEls = miles ? $$('li', miles) : [];
  function milestones() {
    if (!miles) return;
    const r = miles.getBoundingClientRect(), v = calm ? 1 : clamp((innerHeight * .9 - r.top) / (innerHeight * .5 + r.height));
    miles.style.setProperty('--v', v.toFixed(3));
    mileEls.forEach((li, k) => li.classList.toggle('on', v >= (k + .3) / mileEls.length));
  }

  /* ---------- The practice-pad card: a click plays a paradiddle (R L R R · L R L L), the first of each four louder,
     for about 3 seconds, with the sticking written under the pad as it goes. The sticks swing about the hands. ---------- */
  const padRoll = (() => {
    const BUTT = { L: [34, 14], R: [166, 14] }, TIP = { L: [92, 52], R: [108, 52] }, LEN = 69.3, REST = .3, SWING = 30;
    const PAT = 'RLRRLRLL', STEP = 60 / 112 / 4; // sixteenths at 112 bpm
    let busy = false;
    const place = (g, hand, lift) => {
      const [bx, by] = BUTT[hand], [tx, ty] = TIP[hand];
      const a = Math.atan2(ty - by, tx - bx) * 180 / Math.PI + (hand === 'L' ? -1 : 1) * lift * SWING;
      g.setAttribute('transform', `translate(${bx} ${by}) rotate(${a.toFixed(2)}) translate(${LEN} 0) rotate(180)`);
    };
    // How high a hand's stick is at time t: up between its own hits, down exactly on each, back to rest after the last.
    const lift = (hits, t) => {
      let prev = null, next = null;
      for (const h of hits) { if (h.t <= t) prev = h; else { next = h; break; } }
      if (!next) return REST * Math.min(1, (t - (prev ? prev.t : 0)) / .35);
      const t0 = prev ? prev.t : next.t - .35, gap = next.t - t0, x = (t - t0) / gap;
      const top = Math.min(1, .25 + gap * 3.2) * (.55 + .45 * next.vel), from = prev ? 0 : REST;
      return x < .5 ? from + (top - from) * Math.sin(Math.PI * x) : top * Math.sin(Math.PI * x);
    };
    return (svg) => {
      if (busy) return;
      busy = true;
      const sticks = { L: $('.pstick[data-hand="L"]', svg), R: $('.pstick[data-hand="R"]', svg) };
      const rings = $('.prings', svg), label = $('.psticking', svg);
      const hits = [];
      for (let i = 0; i * STEP < 2.75; i++) hits.push({ t: .15 + i * STEP, hand: PAT[i % 8], vel: i % 4 === 0 ? 1 : .5, i });
      const last = hits[hits.length - 1].t + STEP;
      hits.push({ t: last, hand: 'R', vel: 1 }, { t: last + .015, hand: 'L', vel: 1 });
      const k = kit(), start = k ? k.ctx.currentTime + .03 : 0;
      if (k) hits.forEach((h) => k.drum('snare', start + h.t, .35 + .6 * h.vel));
      const byHand = { L: hits.filter((h) => h.hand === 'L'), R: hits.filter((h) => h.hand === 'R') };
      const t0 = performance.now() + 30, end = last + .5;
      let n = 0;
      const ring = (h) => {
        const e = doc.createElementNS('http://www.w3.org/2000/svg', 'ellipse'), s0 = performance.now(), big = 10 + 22 * h.vel;
        e.setAttribute('cx', TIP[h.hand][0]); e.setAttribute('cy', 55); e.setAttribute('fill', 'none'); e.setAttribute('stroke', '#d9a441'); e.setAttribute('stroke-width', 1.4);
        rings.append(e);
        (function grow() {
          const q = (performance.now() - s0) / 380;
          if (q >= 1) { rings.removeChild(e); return; }
          e.setAttribute('rx', 3 + big * q); e.setAttribute('ry', 1 + big * q * .26); e.setAttribute('opacity', (1 - q) * (.4 + .6 * h.vel));
          requestAnimationFrame(grow);
        })();
      };
      (function frame() {
        const t = (performance.now() - t0) / 1000;
        place(sticks.L, 'L', lift(byHand.L, t)); place(sticks.R, 'R', lift(byHand.R, t));
        while (n < hits.length && hits[n].t <= t) {
          const h = hits[n++];
          ring(h);
          if (h.i !== undefined) {
            const w = PAT.split('').map((c, j) => (j === h.i % 8 ? `<tspan class="on">${c}</tspan>` : c));
            label.innerHTML = w.slice(0, 4).join(' ') + ' · ' + w.slice(4).join(' ');
          }
        }
        if (t < end) requestAnimationFrame(frame);
        else { place(sticks.L, 'L', REST); place(sticks.R, 'R', REST); label.textContent = ''; busy = false; }
      })();
    };
  })();
  $$('.pstick').forEach((g) => { const svg = g.ownerSVGElement; if (svg) svg.dataset.roll = '1'; });

  /* ---------- Anything marked data-pad plays that drum when pressed ---------- */
  doc.addEventListener('click', (e) => {
    const el = e.target.closest('[data-pad]');
    if (!el) return;
    if (el.dataset.roll && !calm) { padRoll(el); return; }
    const k = kit(), name = el.dataset.pad;
    if (k) k.drum(name, 0, .95);
    const group = el.closest('.legend');
    (group ? $$('[data-pad="' + name + '"]', group) : [el]).forEach((x) => { x.classList.add('hit'); setTimeout(() => x.classList.remove('hit'), 190); });
  });

  /* ---------- Motion on or off ---------- */
  function motion(on) {
    calm = !on;
    root.classList.toggle('anim', on);
    if (stage) stage.layout();
    onScroll();
  }
  less.addEventListener && less.addEventListener('change', (e) => motion(!e.matches));
  root.style.setProperty('--top', barH() + 'px');
  motion(!calm);
  addEventListener('load', () => { if (stage) stage.layout(); queue(); });
})();
