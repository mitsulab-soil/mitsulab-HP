// The original filmed forest remains intact. This layer follows its visible contours.
// Contours are analysed at 15 Hz and grouped into reusable paths, not stroked one by one.
export function buildContourPaths(pixels, Path = Path2D) {
 const paths = new Map(), W = 384, H = 216;
 const lum = i => pixels[i] * .2126 + pixels[i + 1] * .7152 + pixels[i + 2] * .0722;
 for (let py = 2; py < 204; py += 2) for (let px = 2; px < 382; px += 2) {
  if (px > 141 && px < 243 && py > 40) continue;
  const i = (py * W + px) * 4, gx = lum(i + 4) - lum(i - 4), gy = lum(i + W * 4) - lum(i - W * 4), strength = Math.hypot(gx, gy);
  if (strength < 19) continue;
  const alpha = Math.min(.85, (strength - 15) / 100), bin = Math.min(7, Math.floor(alpha / .85 * 8)), row = Math.floor(py / 8), key = row * 8 + bin;
  let group = paths.get(key);
  if (!group) { group = {lines: new Path(), dots: new Path(), alpha: (bin + .5) / 8 * .85, y: (row * 8 + 4) / H, count: 0}; paths.set(key, group); }
  const angle = Math.atan2(gy, gx) + Math.PI / 2, len = Math.min(5, 1 + strength / 25);
  group.lines.moveTo(px, py); group.lines.lineTo(px + Math.cos(angle) * len, py + Math.sin(angle) * len); group.count++;
  if ((px + py) % 12 === 0) group.dots.rect(px, py, .7, .7);
 }
 return [...paths.values()];
}

export function createDigitalOverlay(video, canvas) {
 const context = canvas.getContext('2d'), sample = document.createElement('canvas');
 sample.width = 384; sample.height = 216;
 const sampleContext = sample.getContext('2d', {willReadFrequently: true});
 if (!context || !sampleContext) return {dispose() {}};
 const reduced = matchMedia('(prefers-reduced-motion: reduce)');
 let pending = 0, pendingKind = '', lastSample = -Infinity, lastFrame = -Infinity;
 let paths = [], visible = true, width = 1, height = 1, ratio = 1, failed = false, destroyed = false;
 const stats = {frames: 0, analyses: 0, analysisMs: 0, renderMs: 0, groups: 0};
 const active = () => !destroyed && visible && !document.hidden && !video.paused && !video.ended;
 function cancel() {
  if (pendingKind === 'video') video.cancelVideoFrameCallback(pending);
  else if (pendingKind === 'raf') cancelAnimationFrame(pending);
  pending = 0; pendingKind = '';
 }
 function layout() {
  const vr = video.getBoundingClientRect(), fr = video.parentElement.getBoundingClientRect();
  width = Math.max(1, vr.width); height = Math.max(1, vr.height); ratio = Math.min(1.5, devicePixelRatio || 1);
  canvas.style.left = `${vr.left - fr.left}px`; canvas.style.top = `${vr.top - fr.top}px`;
  canvas.style.width = `${width}px`; canvas.style.height = `${height}px`;
  const rw = Math.round(width * ratio), rh = Math.round(height * ratio);
  if (canvas.width !== rw || canvas.height !== rh) {canvas.width = rw; canvas.height = rh;}
  if (visible && !document.hidden) render(video.currentTime, false);
 }
 function render(time, forceSample = false) {
  if (destroyed || !visible || document.hidden) return;
  const started = performance.now();
  if (!failed && video.readyState >= 2 && (forceSample || Math.floor(time * 15 + 1e-6) !== Math.floor(lastSample * 15 + 1e-6))) {
   const began = performance.now();
   try {
    sampleContext.drawImage(video, 0, 0, 384, 216);
    paths = buildContourPaths(sampleContext.getImageData(0, 0, 384, 216).data);
    stats.analyses++; stats.groups = paths.length;
   } catch (error) {
    // A failed contour read must never stop the movie itself.
    failed = true; paths = []; console.warn('Contour layer unavailable:', error.message);
   }
   lastSample = time; stats.analysisMs += performance.now() - began;
  }
  context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
  context.setTransform(width * ratio / 384, 0, 0, height * ratio / 216, 0, 0);
  context.lineWidth = Math.max(.65 / (width / 384), .45);
  context.strokeStyle = '#79f0d3'; context.fillStyle = '#d6f5e7';
  const t = reduced.matches ? 0 : time;
  for (const group of paths) {
   const band = .35 + .65 * Math.exp(-Math.pow((group.y - (t * .07 % 1)) / .16, 2));
   context.globalAlpha = group.alpha * band; context.stroke(group.lines);
   context.globalAlpha *= .9; context.fill(group.dots);
  }
  context.globalAlpha = 1; stats.frames++; stats.renderMs += performance.now() - started; lastFrame = time;
 }
 function schedule() {
  cancel(); if (!active()) return;
  if (video.requestVideoFrameCallback) {
   pendingKind = 'video';
   pending = video.requestVideoFrameCallback((_, metadata) => {pending = 0; pendingKind = ''; if (active()) render(metadata.mediaTime); schedule();});
  } else {
   pendingKind = 'raf';
   // Discrete media-time buckets retain fractional intervals on uneven RAF timing.
   pending = requestAnimationFrame(() => {pending = 0; pendingKind = ''; if (active() && Math.floor(video.currentTime * 30) !== Math.floor(lastFrame * 30)) render(video.currentTime); schedule();});
  }
 }
 function resume() {if (active()) {render(video.currentTime, true); schedule();} else cancel();}
 function stop(event) {
  cancel();
  if (event?.type === 'emptied' || event?.type === 'ended') {
   paths = []; lastSample = -Infinity;
   context.setTransform(1, 0, 0, 1, 0, 0); context.clearRect(0, 0, canvas.width, canvas.height);
  }
 }
 function seek() {lastSample = -Infinity; if (visible && !document.hidden) render(video.currentTime, true); schedule();}
 const resize = new ResizeObserver(layout); resize.observe(video); resize.observe(video.parentElement);
 const intersection = new IntersectionObserver(entries => {visible = entries[0].isIntersecting; if (visible) {layout(); resume();} else cancel();}, {threshold: .01}); intersection.observe(video);
 for (const name of ['play', 'playing']) video.addEventListener(name, resume);
 for (const name of ['pause', 'ended', 'emptied']) video.addEventListener(name, stop);
 video.addEventListener('seeked', seek); video.addEventListener('loadeddata', seek);
 document.addEventListener('visibilitychange', resume); document.addEventListener('fullscreenchange', layout);
 addEventListener('resize', layout); addEventListener('pagehide', stop); reduced.addEventListener('change', seek);
 layout();
 return {stats, dispose() {
  destroyed = true; cancel(); resize.disconnect(); intersection.disconnect();
  for (const name of ['play', 'playing']) video.removeEventListener(name, resume);
  for (const name of ['pause', 'ended', 'emptied']) video.removeEventListener(name, stop);
  video.removeEventListener('seeked', seek); video.removeEventListener('loadeddata', seek);
  document.removeEventListener('visibilitychange', resume); document.removeEventListener('fullscreenchange', layout);
  removeEventListener('resize', layout); removeEventListener('pagehide', stop); reduced.removeEventListener('change', seek);
 }};
}

if (typeof document !== 'undefined') {
 const video = document.getElementById('mv'), canvas = document.getElementById('digital');
 if (video && canvas) createDigitalOverlay(video, canvas);
}
