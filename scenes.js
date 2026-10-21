/* Avara Labs: the light tunnel, a WebGL scene with no libraries.
   A mirrored tunnel whose speed follows the scroll. */

const VERT = `attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}`;

const TUNNEL_FRAG = `
precision highp float;
uniform vec2 uRes;
uniform float uTime;   // integrated travel, driven by scroll
uniform float uClock;
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
void main(){
  vec2 uv=(gl_FragCoord.xy-.5*uRes)/uRes.y;
  vec2 m=abs(uv);                              // four-way mirror
  float r=length(uv);
  float ang=atan(m.y,m.x)/1.5708;              // 0..1 across a quadrant
  float z=.32/(r+.02)+uTime;
  vec3 col=vec3(0.);

  // wall panels: a grid of lit cells running past
  vec2 g=vec2(ang*14.,z*1.6);
  vec2 id=floor(g),f=fract(g);
  float hv=h21(id);
  float cell=smoothstep(.5,.38,abs(f.x-.5))*smoothstep(.5,.3,abs(f.y-.5));
  float lit=step(.76,hv);
  vec3 tint=mix(vec3(.12,.35,1.),vec3(.0,.65,.75),h21(id+3.1));
  col+=tint*cell*lit*(.35+.65*h21(id+7.))*1.4;
  col+=vec3(.03,.06,.16)*cell;

  // white strips that streak past
  vec2 g2=vec2(ang*38.,z*.55);
  vec2 id2=floor(g2),f2=fract(g2);
  float s=step(.86,h21(id2+11.))*smoothstep(.5,.0,abs(f2.x-.5)-.18)*pow(f2.y,6.);
  col+=vec3(.85,.92,1.)*s*2.2;

  // bokeh lights
  for(int i=0;i<3;i++){
    vec2 g3=vec2(ang*6.+float(i)*.37,z*.4+float(i)*.21);
    vec2 i3=floor(g3),f3=fract(g3)-.5;
    float on=step(.6,h21(i3+float(i)*9.));
    col+=vec3(.9,.95,1.)*on*smoothstep(.22,.05,length(f3*vec2(1.,1.6)))*.8;
  }

  // horizon band and a vertical beam of blue light
  col+=vec3(.75,.85,1.)*exp(-m.y*55.)*smoothstep(.03,.45,m.x)*1.6;
  float beam=exp(-m.x*70.)*(.55+.45*step(.4,fract(uv.y*9.-uClock*1.5)));
  col+=vec3(.15,.55,1.)*beam*1.8;

  // depth: dark core, falloff toward the far end
  col*=smoothstep(.02,.4,r);
  col*=1.-.35*smoothstep(.5,1.1,r);
  col=col/(1.+col*.6);
  gl_FragColor=vec4(pow(col,vec3(.9)),1.);
}`;

function makeGL(canvas, frag) {
  const gl = canvas.getContext('webgl', { premultipliedAlpha: false, alpha: true, antialias: false });
  if (!gl) return null;
  const sh = (type, src) => {
    const s = gl.createShader(type); gl.shaderSource(s, src); gl.compileShader(s);
    if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) { console.error(gl.getShaderInfoLog(s)); return null; }
    return s;
  };
  const prog = gl.createProgram();
  const v = sh(gl.VERTEX_SHADER, VERT), f = sh(gl.FRAGMENT_SHADER, frag);
  if (!v || !f) return null;
  gl.attachShader(prog, v); gl.attachShader(prog, f); gl.linkProgram(prog);
  gl.useProgram(prog);
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 3, -1, -1, 3]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p');
  gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const u = (n) => gl.getUniformLocation(prog, n);
  return { gl, u };
}

// Renders a scene only while its canvas is on screen; drops resolution if frames run slow.
function runScene(canvas, frag, setUniforms, baseScale) {
  const ctx = makeGL(canvas, frag);
  if (!ctx) { canvas.closest('[data-scene]')?.classList.add('no-gl'); return; }
  const { gl, u } = ctx;
  let scale = baseScale, visible = false, raf = 0, last = 0, slow = 0;
  const resize = () => {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.round(canvas.clientWidth * dpr * scale);
    canvas.height = Math.round(canvas.clientHeight * dpr * scale);
    gl.viewport(0, 0, canvas.width, canvas.height);
  };
  const frame = (now) => {
    raf = 0;
    if (!visible) return;
    const dt = last ? now - last : 16; last = now;
    if (dt > 28 && scale > .45) { if (++slow > 20) { scale -= .1; slow = 0; resize(); } } else slow = 0;
    gl.uniform2f(u('uRes'), canvas.width, canvas.height);
    setUniforms(gl, u, now / 1000, canvas);
    gl.drawArrays(gl.TRIANGLES, 0, 3);
    raf = requestAnimationFrame(frame);
  };
  new ResizeObserver(resize).observe(canvas);
  new IntersectionObserver(([e]) => {
    visible = e.isIntersecting;
    if (visible && !raf) { last = 0; raf = requestAnimationFrame(frame); }
  }).observe(canvas);
  resize();
}

export function startTunnel(canvas, getVelocity, reduced) {
  let travel = 0, prev = 0;
  runScene(canvas, TUNNEL_FRAG, (gl, u, t) => {
    const dt = prev ? Math.min(t - prev, .05) : 0; prev = t;
    travel += dt * (reduced ? 0 : .35 + getVelocity());
    gl.uniform1f(u('uTime'), travel);
    gl.uniform1f(u('uClock'), reduced ? 0 : t);
  }, 0.6);
}
