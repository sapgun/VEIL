import { clamp, renderScale, sceneProgress, settled, stepCloth, storyAt, type ClothState } from './physics';
import { sceneVertex, sceneFragment, clothVertex, clothFragment } from './shaders';

export type MotionStatus = 'active' | 'lite' | 'fallback';
/** One canvas, two draw calls. Nothing here reads app state or intercepts wheel/touch. */
export function createLivingVeil(host: HTMLElement, track: HTMLElement, report: (status: MotionStatus) => void) {
  const canvas = document.createElement('canvas');
  canvas.className = 'vl-living-canvas';
  canvas.setAttribute('aria-hidden', 'true');
  const gl = canvas.getContext('webgl2', { alpha: true, antialias: false, depth: false, stencil: false, powerPreference: 'low-power' });
  if (!gl) { report('fallback'); return { dispose() {} }; }
  let dead = false, raf = 0, visible = false, ready = false, last = 0, lastY = window.scrollY;
  let state: ClothState = { bend: 0, velocity: 0, input: 0 };
  let tier = 0, badSeconds = 0, warmup = 0, dirty = true, phase = -1;
  let width = 1, height = 1;
  const stickyInset = Number.parseFloat(getComputedStyle(host.parentElement!).top) || 0;
  const resources: (() => void)[] = [];
  const image = new Image();
  let loadTimer = 0;
  const stage = host.parentElement!;
  const labels = [...track.querySelectorAll<HTMLElement>('[data-story-phase]')];
  const progressBar = track.querySelector<HTMLElement>('.vl-living-progress-fill');

  function program(vertex: string, fragment: string) {
    const p = gl!.createProgram();
    if (!p) throw new Error('Program allocation failed');
    resources.push(() => gl!.deleteProgram(p));
    for (const [type, source] of [[gl!.VERTEX_SHADER, vertex], [gl!.FRAGMENT_SHADER, fragment]] as const) {
      const s = gl!.createShader(type);
      if (!s) throw new Error('Shader allocation failed');
      gl!.shaderSource(s, source); gl!.compileShader(s); gl!.attachShader(p, s);
      gl!.deleteShader(s);
    }
    gl!.linkProgram(p);
    if (!gl!.getProgramParameter(p, gl!.LINK_STATUS)) throw new Error(gl!.getProgramInfoLog(p) || 'Shader link failed');
    return p;
  }
  function mesh(p: WebGLProgram, vertices: Float32Array) {
    const vao = gl!.createVertexArray(), buffer = gl!.createBuffer();
    if (!vao || !buffer) throw new Error('Geometry allocation failed');
    resources.push(() => { gl!.deleteVertexArray(vao); gl!.deleteBuffer(buffer); });
    gl!.bindVertexArray(vao); gl!.bindBuffer(gl!.ARRAY_BUFFER, buffer);
    gl!.bufferData(gl!.ARRAY_BUFFER, vertices, gl!.STATIC_DRAW);
    const attr = gl!.getAttribLocation(p, 'aPosition');
    gl!.enableVertexAttribArray(attr); gl!.vertexAttribPointer(attr, 2, gl!.FLOAT, false, 0, 0);
    return { vao, count: vertices.length / 2 };
  }
  function makeCloth() {
    const nx = 96, ny = 56, points = new Float32Array(nx * ny * 12);
    let at = 0;
    for (let y = 0; y < ny; y++) for (let x = 0; x < nx; x++) {
      for (const [dx, dy] of [[0,0],[1,0],[0,1],[0,1],[1,0],[1,1]]) {
        points[at++] = (x + dx) / nx; points[at++] = (y + dy) / ny;
      }
    }
    return points;
  }
  function stop() { cancelAnimationFrame(raf); raf = 0; last = 0; }
  function dispose() {
    if (dead) return;
    dead = true; stop(); clearTimeout(loadTimer); image.onload = null; image.onerror = null;
    window.removeEventListener('scroll', wake); window.removeEventListener('resize', resize);
    document.removeEventListener('visibilitychange', visibility);
    observer.disconnect(); resizer.disconnect(); canvas.removeEventListener('webglcontextlost', lost);
    for (const release of resources.reverse()) release();
    gl!.getExtension('WEBGL_lose_context')?.loseContext();
    canvas.remove(); host.removeAttribute('data-rendered');
    progressBar?.style.removeProperty('transform');
  }
  function fail() { if (!dead) { dispose(); report('fallback'); } }
  function lost(event: Event) { event.preventDefault(); fail(); }
  function wake() {
    if (dead || !ready || !visible || document.hidden || raf) return;
    dirty = true; raf = requestAnimationFrame(frame);
  }
  function resize() { dirty = true; wake(); }
  function visibility() {
    lastY = window.scrollY; state = { bend: 0, velocity: 0, input: 0 };
    if (document.hidden) stop(); else { dirty = true; wake(); }
  }
  const observer = new IntersectionObserver(([entry]) => {
    visible = entry.isIntersecting; lastY = window.scrollY;
    if (visible) wake(); else { stop(); state = { bend: 0, velocity: 0, input: 0 }; }
  }, { rootMargin: '100px' });
  const resizer = new ResizeObserver(resize);
  let scene: WebGLProgram, cloth: WebGLProgram;
  let backgroundMesh: ReturnType<typeof mesh>, clothMesh: ReturnType<typeof mesh>;
  let texture: WebGLTexture;
  const locations = new Map<WebGLProgram, Map<string, WebGLUniformLocation | null>>();
  function location(p: WebGLProgram, name: string) {
    const cache = locations.get(p)!;
    if (!cache.has(name)) cache.set(name, gl!.getUniformLocation(p, name));
    return cache.get(name)!;
  }
  function uniform(p: WebGLProgram, name: string, value: number) { gl!.uniform1f(location(p, name), value); }
  function frame(time: number) {
    raf = 0;
    if (dead || !ready || !visible || document.hidden) return;
    const elapsed = last ? (time - last) / 1000 : 1 / 60;
    const dt = Math.min(.05, elapsed); last = time;
    const y = window.scrollY, speed = clamp((y - lastY) / Math.max(.001, dt), -4000, 4000); lastY = y;
    state = stepCloth(state, speed, dt);
    const rect = track.getBoundingClientRect();
    const p = sceneProgress(y + stickyInset, rect.top + y, track.offsetHeight - stage.offsetHeight);
    const story = storyAt(p);
    if (story.phase !== phase) {
      phase = story.phase;
      labels.forEach((label, index) => label.dataset.active = String(index === phase));
    }
    if (progressBar) progressBar.style.transform = `scaleX(${p})`;
    if (++warmup > 20 && elapsed < 1) {
      badSeconds = elapsed > .038 ? badSeconds + dt : Math.max(0, badSeconds - dt * .5);
      if (badSeconds > 1.5 && tier < 2) { tier++; badSeconds = 0; dirty = true; report('lite'); }
      else if (tier === 2 && badSeconds > 3.0) { fail(); return; }
    }
    if (dirty) {
      width = Math.max(1, host.clientWidth); height = Math.max(1, host.clientHeight);
      const ratio = renderScale(width, height, window.devicePixelRatio || 1, tier);
      const w = Math.round(width * ratio), h = Math.round(height * ratio);
      if (canvas.width !== w || canvas.height !== h) { canvas.width = w; canvas.height = h; }
      gl!.viewport(0, 0, w, h); dirty = false;
    }
    try {
      gl!.disable(gl!.BLEND); gl!.useProgram(scene); gl!.bindVertexArray(backgroundMesh.vao);
      gl!.activeTexture(gl!.TEXTURE0); gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.uniform1i(location(scene, 'uAtlas'), 0);
      uniform(scene,'uAspect',width/height); uniform(scene,'uSpread',story.spread);
      uniform(scene,'uMorph',story.morph); uniform(scene,'uDissolve',story.dissolve);
      gl!.drawArrays(gl!.TRIANGLES, 0, backgroundMesh.count);
      gl!.enable(gl!.BLEND); gl!.blendFunc(gl!.SRC_ALPHA, gl!.ONE_MINUS_SRC_ALPHA);
      gl!.useProgram(cloth); gl!.bindVertexArray(clothMesh.vao);
      uniform(cloth,'uAspect',width/height); uniform(cloth,'uBend',state.bend);
      uniform(cloth,'uVelocity',state.velocity); uniform(cloth,'uProgress',p); uniform(cloth,'uDissolve',story.dissolve);
      gl!.drawArrays(gl!.TRIANGLES, 0, clothMesh.count);
      if (!host.hasAttribute('data-rendered')) { host.dataset.rendered = 'true'; report(tier ? 'lite' : 'active'); }
    } catch { fail(); return; }
    if (!settled(state) || speed !== 0) raf = requestAnimationFrame(frame);
    else last = 0;
  }
  image.onload = () => {
    clearTimeout(loadTimer);
    if (dead) return;
    try {
      scene = program(sceneVertex, sceneFragment); cloth = program(clothVertex, clothFragment);
      locations.set(scene, new Map()); locations.set(cloth, new Map());
      backgroundMesh = mesh(scene, new Float32Array([-1,-1,1,-1,-1,1,-1,1,1,-1,1,1]));
      clothMesh = mesh(cloth, makeCloth());
      const tex = gl!.createTexture(); if (!tex) throw new Error('Texture allocation failed');
      texture = tex; resources.push(() => gl!.deleteTexture(texture));
      gl!.bindTexture(gl!.TEXTURE_2D, texture);
      gl!.texImage2D(gl!.TEXTURE_2D, 0, gl!.RGBA, gl!.RGBA, gl!.UNSIGNED_BYTE, image);
      gl!.generateMipmap(gl!.TEXTURE_2D);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MIN_FILTER, gl!.LINEAR_MIPMAP_LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_MAG_FILTER, gl!.LINEAR);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_S, gl!.CLAMP_TO_EDGE);
      gl!.texParameteri(gl!.TEXTURE_2D, gl!.TEXTURE_WRAP_T, gl!.CLAMP_TO_EDGE);
      if (gl!.getError() !== gl!.NO_ERROR) throw new Error('GPU allocation failed');
      host.appendChild(canvas); ready = true; observer.observe(track); resizer.observe(host);
      window.addEventListener('scroll', wake, { passive: true }); window.addEventListener('resize', resize, { passive: true });
      document.addEventListener('visibilitychange', visibility); canvas.addEventListener('webglcontextlost', lost);
      wake();
    } catch (error) { console.warn('[VEIL] Using still composition:', error instanceof Error ? error.message : 'GPU unavailable'); fail(); }
  };
  image.onerror = fail;
  loadTimer = window.setTimeout(fail, 10_000);
  image.src = '/veil/motion/silhouettes.svg';
  return { dispose };
}
