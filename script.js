import { startTunnel } from './scenes.js';

const reduced = matchMedia('(prefers-reduced-motion: reduce)').matches;
const $ = (s, r = document) => r.querySelector(s);
const $$ = (s, r = document) => [...r.querySelectorAll(s)];
const clamp = (v, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;
const ease = (t) => (t < .5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

// Progress through a pinned (sticky) section: 0 when it reaches the top, 1 when it lets go.
const pinProgress = (el) => {
  const r = el.getBoundingClientRect();
  return clamp(-r.top / (r.height - innerHeight));
};
// Progress of an element travelling up through the viewport.
const viewProgress = (el) => {
  const r = el.getBoundingClientRect();
  return clamp((innerHeight - r.top) / (innerHeight + r.height));
};

/* ── Scroll velocity (feeds the tunnel and the marquee) ── */
let lastY = scrollY, velocity = 0;
const tickVelocity = () => {
  const dy = scrollY - lastY; lastY = scrollY;
  velocity = lerp(velocity, Math.abs(dy) / 18, .12);
  requestAnimationFrame(tickVelocity);
};
requestAnimationFrame(tickVelocity);

/* ── Hero: the reach ──
   Fingertip positions inside each photo (fractions of width/height),
   so the two tips meet at the same point at any screen size. */
const hero = $('#home');
const hands = $('#hands');
const handH = $('.hand-h', hands), handR = $('.hand-r', hands), spark = $('.spark', hands);
const TIP_H = { x: .9985, y: .742, ratio: 771 / 1373 };
const TIP_R = { x: .001, y: .047, ratio: 539 / 1355 };
let mouseX = 0, mouseY = 0;
addEventListener('pointermove', (e) => {
  mouseX = e.clientX / innerWidth - .5; mouseY = e.clientY / innerHeight - .5;
}, { passive: true });
const placeHands = (p, t) => {
  const W = hands.clientWidth, H = hands.clientHeight;
  const narrow = W < 700;
  const cx = W / 2, cy = H * (narrow ? .6 : .57);
  const k = ease(clamp(p));
  const endGap = W * (narrow ? .012 : .008);
  const gap = lerp(W * .55, endGap, k);
  // each arm is sized so its cut end always sits past the screen edge
  const hw = (cx - endGap) / TIP_H.x * 1.05;
  const rw = (W - cx - endGap) / (1 - TIP_R.x) * 1.05;
  const bob = reduced ? 0 : Math.sin(t * 1.1) * 5;
  const tiltX = reduced ? 0 : mouseY * -6, tiltY = reduced ? 0 : mouseX * 8;
  // human: its fingertip sits at (cx - gap, cy)
  const hx = cx - gap - hw * TIP_H.x, hy = cy - hw * TIP_H.ratio * TIP_H.y;
  handH.style.width = `${hw}px`;
  handH.style.transform = `translate3d(${hx}px,${hy + bob}px,0) rotateY(${tiltY}deg) rotateX(${tiltX}deg) rotate(${(1 - k) * -6}deg)`;
  const rx = cx + gap - rw * TIP_R.x, ry = cy - rw * TIP_R.ratio * TIP_R.y;
  handR.style.width = `${rw}px`;
  handR.style.transform = `translate3d(${rx}px,${ry - bob * .8}px,0) rotateY(${tiltY}deg) rotateX(${tiltX}deg) rotate(${(1 - k) * 6}deg)`;
  const glow = clamp((k - .78) / .2);
  spark.style.transform = `translate3d(${cx}px,${cy}px,0) translate(-50%,-50%) scale(${.4 + glow * .6 + (reduced ? 0 : Math.sin(t * 6) * .06 * glow)})`;
  spark.style.opacity = glow;
};

/* ── Tunnel ── */
const tunnel = $('#about');
startTunnel($('#tunnel'), () => Math.min(velocity, 3), reduced);

const WORDS = ['VOICE', 'KNOWLEDGE', 'WORKFLOW'];
const tword = $('#tword');
const steps = $$('.tunnel-steps li');
let wordIdx = 0, scrambleRaf = 0;
const scramble = (target) => {
  cancelAnimationFrame(scrambleRaf);
  if (reduced) { tword.textContent = target; return; }
  const glyphs = 'ABCDEFGHIKLMNOPRSTUVWXYZ0123456789';
  const start = performance.now();
  const step = (now) => {
    const t = (now - start) / 650;
    tword.textContent = target.split('').map((c, i) => (t * target.length > i + 1 ? c : glyphs[(Math.random() * glyphs.length) | 0])).join('');
    if (t < 1.3) scrambleRaf = requestAnimationFrame(step); else tword.textContent = target;
  };
  scrambleRaf = requestAnimationFrame(step);
};

const splitWords = (el) => {
  el.innerHTML = el.textContent.trim().split(/\s+/).map((w) => `<span class="w">${w}</span>`).join(' ');
  return $$('.w', el);
};
const tcopyWords = splitWords($('#tcopy'));
const revealWords = splitWords($('#reveal'));
const lightWords = (words, p) => words.forEach((w, i) => w.classList.toggle('lit', i < p * words.length));

/* ── Header colour over dark sections ── */
const hdr = $('#hdr');
const darkSections = $$('[data-dark]');

/* ── Numbers: knobs slide through their glass tracks ── */
const stats = $$('.stat');
const counted = new WeakSet();
const runCount = (el) => {
  const to = parseFloat(el.dataset.count), dec = +(el.dataset.dec || 0);
  if (reduced) return;
  const t0 = performance.now();
  const step = (now) => {
    const t = clamp((now - t0) / 1400);
    el.textContent = (to * ease(t)).toFixed(dec);
    if (t < 1) requestAnimationFrame(step);
  };
  requestAnimationFrame(step);
};
const countIO = new IntersectionObserver((entries) => entries.forEach((e) => {
  const el = e.target;
  if (e.isIntersecting && !counted.has(el)) { counted.add(el); runCount(el); }
}), { threshold: .6 });
$$('[data-count]').forEach((el) => countIO.observe(el));

$$('.plus').forEach((b) => b.addEventListener('click', () => {
  const open = b.classList.toggle('open');
  $$('.plus.open').forEach((o) => o !== b && o.classList.remove('open'));
  b.setAttribute('aria-expanded', open);
}));

/* ── Work: the stack of cards fans out into a row ── */
const work = $('#work');
const stage = $('#stage');
const cards = $$('.card', stage);
const ROW_Y = [-14, 26, -30, 16, -4];
const placeCards = (p, t) => {
  const n = cards.length;
  const cw = cards[0].offsetWidth;
  const sw = stage.offsetWidth;
  const gap = Math.min(cw * 1.14, (sw - cw - 32) / (n - 1));
  const spin = reduced ? 0 : Math.sin(t * .5) * 8;
  cards.forEach((card, i) => {
    const c = i - (n - 1) / 2;
    // stagger: each card leaves the stack a little after the one before
    const k = ease(clamp((p - .18 - i * .07) / .42));
    const flip = Math.sin(k * Math.PI);
    const stack = { x: 0, y: c * cw * .2, z: 0, rx: 64, ry: -24 + p * 60 + spin, rz: 90 };
    const row = { x: c * gap, y: ROW_Y[i] * (cw / 170), z: 0, rx: 0, ry: c * -7, rz: c * 2.2 };
    const x = lerp(stack.x, row.x, k);
    const y = lerp(stack.y, row.y, k) - flip * cw * .35;
    const z = lerp(stack.z, row.z, k) + flip * 120;
    const rx = lerp(stack.rx, row.rx, k);
    const ry = lerp(stack.ry, row.ry, k) + flip * 40 * (c >= 0 ? 1 : -1);
    const rz = lerp(stack.rz, row.rz, k);
    card.style.transform = `translate3d(${x}px,${y}px,${z}px) rotateY(${ry}deg) rotateX(${rx}deg) rotateZ(${rz}deg)`;
    card.style.zIndex = Math.round(k > .5 ? 10 - Math.abs(c) : 10 - i);
  });
  const cap = clamp((p - .78) / .12);
  work.style.setProperty('--cap', cap);
  cards.forEach((card) => { card.tabIndex = cap > .5 ? 0 : -1; });
};

/* ── Footer marquee ── */
const marquee = $('#marquee');
let mx = 0;

/* ── Main loop ── */
const frame = (now) => {
  const t = now / 1000;

  // header
  const onDark = darkSections.some((s) => { const r = s.getBoundingClientRect(); return r.top <= 40 && r.bottom > 40; });
  hdr.classList.toggle('on-dark', onDark);

  // hero: the hands close the gap as the section scrolls
  const hr = hero.getBoundingClientRect();
  if (hr.bottom > 0) placeHands(reduced ? 1 : pinProgress(hero) * 1.12 + .04, t);

  // tunnel words
  const tp = pinProgress(tunnel);
  const idx = Math.min(WORDS.length - 1, Math.floor(tp * WORDS.length * .999));
  if (idx !== wordIdx) { wordIdx = idx; scramble(WORDS[idx]); steps.forEach((s, i) => s.classList.toggle('on', i === idx)); }
  lightWords(tcopyWords, clamp((tp - .1) / .75));

  // stat knobs
  stats.forEach((s, i) => {
    const vp = viewProgress(s);
    const x = 8 + 80 * clamp((vp - .15) / .6) * [1, .55, .85, .7][i];
    s.style.setProperty('--x', `${x}%`);
  });

  // cards
  const wr = work.getBoundingClientRect();
  if (wr.bottom > -100 && wr.top < innerHeight + 100) placeCards(reduced ? 1 : pinProgress(work), t);

  // marquee: steady drift, faster while scrolling
  if (!reduced) {
    const half = marquee.scrollWidth / 2;
    mx -= .6 + velocity * 6;
    if (-mx > half) mx += half;
    marquee.style.transform = `translate3d(${mx}px,0,0)`;
  }
  lightWords(revealWords, clamp((viewProgress($('#reveal')) - .2) / .45));

  requestAnimationFrame(frame);
};
requestAnimationFrame(frame);

/* ── Case-study summaries ── */
const CASES = {
  phonx: {
    img: 'img/voice-agent-ops.jpg', kicker: 'Voice infrastructure',
    title: 'Phonx AI: production voice AI for US insurance',
    facts: [['Industry', 'US insurance (Medicare, ACA)'], ['Role', 'Technical lead and architect'], ['Status', 'Outbound in production, inbound in pilot'], ['Latency', 'Under 1 s turn, p50']],
    body: [
      ['Problem', 'Enrollment volume is bursty, every statement about coverage is a potential audit finding, and a call that does not land in the CRM as a structured outcome effectively did not happen.'],
      ['What we built', 'Twilio and Krisp on the telephony leg, Groq for streaming speech-to-text and reasoning, ElevenLabs for voice, Redis for live session state and a Neo4j knowledge graph that encodes plans, eligibility and regulatory boundaries. CRM writes to GoHighLevel run out of band with retries, so the call never waits on them.'],
      ['Hard part', 'Holding a one-second turn budget end to end, including barge-in without losing context and compliance enforced at retrieval rather than filtered after generation.'],
    ],
  },
  vkg: {
    img: 'img/knowledge-compliance.jpg', kicker: 'Knowledge and compliance',
    title: 'Enterprise Vector Knowledge Graph',
    facts: [['Type', 'Knowledge graph architecture'], ['Role', 'Architect and builder'], ['Deployments', 'Insurance (production), research (pilot)'], ['Stack', 'Neo4j, Python, FastAPI, OpenAI embeddings']],
    body: [
      ['Problem', 'Flat vector search drifts on regulatory text, cannot reason across relationships like plan, benefit, rule and exception, and has no compliance boundary before generation.'],
      ['What we built', 'Neo4j as the retrieval layer, with embeddings on graph nodes and compliance rules modelled as edge types. Each query expands through typed relationships and is checked against boundary edges before anything reaches the model. Every answer is logged with the source nodes that grounded it.'],
      ['What we would change', 'Spend longer on the schema before ingesting production data, and build the evaluation set first.'],
    ],
  },
  kyc: {
    img: 'img/agri-forecasting.jpg', kicker: 'Agri-market intelligence',
    title: 'Know Your Commodity',
    facts: [['Product', 'KYC Agri, HnyB Tech Incubations'], ['Role', 'Dhairya Pareek, technology lead'], ['Year', '2026'], ['Status', 'Live at kycagri.com']],
    body: [
      ['Problem', 'Government mandi prices are public but hard to use, and a forecast that looks more certain than it is can do real damage.'],
      ['What we built', 'Scheduled ingestion from Agmarknet, a separate forecasting service that picks between 20 smoothing settings by walk-forward error and projects 14 days with a widening uncertainty band, Llama-based plain-language explanations, and a Next.js product with the predictor on a premium plan.'],
      ['Honest by design', 'Every forecast states the model used and how much of its input was backfilled where markets did not report.'],
    ],
  },
  sat: {
    img: 'img/satellite-ml.jpg', kicker: 'Prior work: satellite ML',
    title: 'Satellite ML Poppy Detection',
    facts: [['Client', 'Scanpoint Geomatics (ISRO technology partner)'], ['Role', 'Krish Shah, ML engineer'], ['Year', '2024'], ['Result', 'F1 0.87 on held-out test data']],
    body: [
      ['Question', 'Can a CNN trained on labelled Afghan Sentinel-2 imagery shift an analyst’s job from search to verification?'],
      ['What we built', 'Ingestion with geospatial metadata preserved, overlapping tiling, a CNN trained with class-balanced sampling, and shapefile output that opens directly in QGIS and SGL’s IGiS. A research proof of concept; it was never deployed.'],
      ['What we would change', 'Start from a pre-trained geospatial backbone and spend the time on data quality instead.'],
    ],
  },
  ecom: {
    img: 'img/ecommerce-support.jpg', kicker: 'Automation systems',
    title: 'E-commerce email automation for a Shopify brand',
    facts: [['Client', 'D2C beauty brand on Shopify'], ['Role', 'Design, build and handoff'], ['Year', '2023'], ['Stack', 'OpenAI, Shopify, Zapier, Python']],
    body: [
      ['Problem', 'Most support email fell into a few repeat categories, reply quality drifted between agents, and hiring was not economical.'],
      ['What we built', 'Shopify webhooks into OpenAI classification and drafting against the brand’s tone and policies, with a conservative confidence gate: anything uncertain goes to a person through Zapier. Repointable to a new brand by configuration.'],
      ['Since handoff', 'We have not operated it since 2023, so we do not quote current volumes.'],
    ],
  },
};

(() => {
  const dlg = $('#case-dialog');
  if (!dlg || typeof dlg.showModal !== 'function') return;
  const esc = (s) => s.replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
  $$('[data-case]').forEach((b) => b.addEventListener('click', () => {
    const c = CASES[b.dataset.case];
    $('#cd-img').src = c.img;
    $('#cd-kicker').textContent = c.kicker;
    $('#cd-title').textContent = c.title;
    $('#cd-facts').innerHTML = c.facts.map(([k, v]) => `<div><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('');
    $('#cd-text').innerHTML = c.body.map(([h, p]) => `<h3>${esc(h)}</h3><p>${esc(p)}</p>`).join('');
    dlg.showModal();
  }));
  $('#cd-cta').addEventListener('click', () => dlg.close());
  dlg.addEventListener('click', (e) => { if (e.target === dlg) dlg.close(); });
})();

/* ── Contact form redirect ── */
$$('input[data-next]').forEach((input) => {
  input.value = new URL(input.dataset.next, location.href).href;
});
