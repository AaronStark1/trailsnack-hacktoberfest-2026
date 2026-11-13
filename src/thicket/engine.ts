/**
 * The night berry thicket — one small WebGL2 point-sprite engine shared by the
 * landing page (index.html) and the application shell (ThicketBackground.tsx).
 *
 * No library, no textures, no network. Geometry is generated once from a
 * seeded PRNG; everything that moves is computed in the vertex shader. The
 * engine is purely decorative: it owns a canvas and nothing else, reads no
 * application state, and can be throttled, paused or disposed at any time so
 * it never competes with the camera or with on-device inference.
 */

export interface ThicketOptions {
  /** Geometry density multiplier. Defaults to 1 on desktop, 0.62 on phones. */
  density?: number;
  /** Upper bound for the device pixel ratio the scene is rendered at. */
  maxDpr?: number;
  /** Frame-rate cap. */
  fps?: number;
  /** 0..1: how strongly clusters swell and glow on their own (touch devices get 1). */
  breathe?: number;
  /** Carry the position along the path from one document to the next (per tab). */
  resume?: boolean;
}

export interface Thicket {
  /** Pointer position in client pixels: pushes fruit aside and lights a wake. */
  pointer(clientX: number, clientY: number): void;
  release(): void;
  /** Device tilt, each axis -1..1. */
  tilt(x: number, y: number): void;
  /** Flight eases to a stop and the fruit disperses into embers. */
  setTransition(active: boolean): void;
  /** Page scroll in pixels: travels along the path. */
  setScroll(y: number): void;
  /** Freeze the scene on its current frame (and release the GPU) while held. */
  setPaused(paused: boolean): void;
  setFps(fps: number): void;
  /** Night Camp Mode: fold every colour into the amber band. */
  setEmber(active: boolean): void;
  dispose(): void;
}

/** One fruit of the thicket: offset from the path's centre line, and distance along it. */
export interface ThicketFruit {
  kind: "blackberry" | "strawberry" | "cloudberry" | "currant" | "elderberry";
  x: number;
  y: number;
  z: number;
  size: number;
}

/** A cluster of wild strawberries planted where a film wants its subject. */
export interface ThicketSprig {
  x: number;
  y: number;
  z: number;
  /** Number of strawberries (default 5). */
  fruits?: number;
  scale?: number;
}

export interface ThicketFilmOptions {
  /** Backing-store size in pixels; the film never reads the layout. */
  width: number;
  height: number;
  density?: number;
  /** Corridor proportions. Defaults to the live rule: tall in portrait, 1:1 otherwise. */
  shape?: readonly [number, number];
  sprigs?: readonly ThicketSprig[];
}

/** Everything one frame depends on. Two equal frames always paint the same picture. */
export interface ThicketFrame {
  /** Seconds: drives sway, breathing, spores and grain. */
  time: number;
  /** Position along the path, in world units. */
  travel: number;
  /** View direction (yaw, pitch) in radians: see `heading` and `aim`. */
  look: readonly [number, number];
  /** Lens multiplier; 1 is the live engine's lens. */
  zoom?: number;
  tilt?: readonly [number, number];
  /** 0..1: fruit let go and drift as embers. */
  disperse?: number;
  /** 0..1: Night Camp Mode. */
  ember?: number;
  /** 0..1: how strongly clusters swell and glow. */
  breathe?: number;
  /** 0..1: the vignette and fringing of fast travel. */
  rush?: number;
  /** Pointer wake, newest first: [ndc x, ndc y, strength 0..1], at most six points. */
  wake?: readonly (readonly [number, number, number])[];
}

/**
 * The thicket as a pure function of a frame description: no clock, no input
 * listeners, no state carried from one render to the next. For offline
 * rendering, where every frame must be reproducible from its timestamp.
 */
export interface ThicketFilm {
  /** Length of the looping path. */
  readonly length: number;
  readonly fruit: readonly ThicketFruit[];
  /** The view direction the live engine settles on at this point of the path. */
  heading(travel: number): [number, number];
  /** The view direction that centres a point of the thicket in the frame. */
  aim(travel: number, x: number, y: number, z: number): [number, number];
  render(frame: ThicketFrame): void;
  dispose(): void;
}

type Vec3 = readonly [number, number, number];

const LEN = 36; // length of the looping thicket, in world units
const TAU = Math.PI * 2;
const RESUME_KEY = "trailsnack:thicket-travel";
const TRAIL = 6;
const PORTRAIT_SHAPE = [0.7, 1.55] as const;
const SQUARE_SHAPE = [1, 1] as const;

const PATH = `
  vec2 path(float z){ return vec2(sin(z*0.105)*1.5 + sin(z*0.043+1.3)*0.8, sin(z*0.081+0.6)*0.42); }
  float hash(float n){ return fract(sin(n*12.9898)*43758.5453); }`;

function pathAt(z: number): readonly [number, number] {
  return [Math.sin(z * 0.105) * 1.5 + Math.sin(z * 0.043 + 1.3) * 0.8, Math.sin(z * 0.081 + 0.6) * 0.42];
}

const VS_SPRITE = `#version 300 es
  precision highp float;
  layout(location=0) in vec3 a_pos;
  layout(location=1) in vec3 a_col;
  layout(location=2) in vec4 a_misc;   // size, kind, cluster seed, glow (leaves: fixed rotation)
  uniform float u_time, u_travel, u_len, u_aspect, u_focal, u_px, u_disperse, u_breathe, u_maxPt;
  uniform vec2 u_look, u_tilt, u_shape;
  uniform vec3 u_trail[${TRAIL}];
  out vec3 v_col;
  out float v_kind, v_seed, v_glow, v_fade, v_wake, v_px, v_fog, v_id;
  ${PATH}
  void main(){
    float size=a_misc.x, kind=a_misc.y, seed=a_misc.z, glow=a_misc.w;
    float vid=float(gl_VertexID);
    float zr=mod(a_pos.z-u_travel,u_len);
    float wz=u_travel+zr;
    vec3 p=vec3(path(wz)-path(u_travel)+a_pos.xy*u_shape, zr);
    float ph=seed*6.2831;

    // Branch sway, plus the lean of the canes when the phone is tilted.
    p.x+=sin(u_time*0.6+ph+wz*0.35)*0.014+u_tilt.x*a_pos.y*0.11;
    p.y+=cos(u_time*0.47+ph*1.7)*0.010+u_tilt.y*a_pos.x*0.05;

    // Breathing: whole clusters swell and brighten together.
    float breath=smoothstep(0.5,1.0,0.5+0.5*sin(u_time*0.55+ph+wz*0.12))*u_breathe;
    if(kind<0.5){ size*=1.0+0.17*breath; glow+=0.40*breath*step(0.03,glow)+0.07*breath; }
    if(kind>4.5){ glow*=1.0+1.1*breath; }
    if(kind>3.5&&kind<4.5){
      p.xy+=vec2(sin(u_time*0.21+vid*1.3),cos(u_time*0.17+vid*2.1))*0.22;
      p.z+=sin(u_time*0.33+vid*0.37)*0.75*u_breathe;   // spores wash toward and away
    }

    // Transition: fruit lets go and floats off as embers.
    float dk=kind<0.5?1.0:(kind<1.5?0.10:(kind<3.5?0.03:0.6));
    vec3 dir=normalize(vec3(hash(vid)-0.5,hash(vid+7.1)-0.32,hash(vid+13.7)-0.5));
    float dl=u_disperse*dk;
    p+=dir*dl*(0.16+0.6*hash(vid+3.3));
    p.xy+=vec2(sin(u_time*0.7+vid),cos(u_time*0.6+vid*1.3))*0.05*dl;

    // Camera
    float cy=cos(u_look.x), sy=sin(u_look.x);
    p.xz=vec2(cy*p.x-sy*p.z, sy*p.x+cy*p.z);
    float cx=cos(u_look.y), sx=sin(u_look.y);
    p.yz=vec2(cx*p.y-sx*p.z, sx*p.y+cx*p.z);
    float z=max(p.z,0.001);
    vec2 ndc=vec2(p.x*u_focal/u_aspect, p.y*u_focal)/z;

    // Pointer wake: push away in screen space, and remember the light.
    float wake=0.0; vec2 push=vec2(0.0);
    for(int i=0;i<${TRAIL};i++){
      vec2 d=(ndc-u_trail[i].xy)*vec2(u_aspect,1.0);
      float l=length(d)+1e-4;
      float f=u_trail[i].z*exp(-l*l/0.05);
      push+=d/l*f; wake+=f;
    }
    float pk=kind<0.5?0.9:(kind<1.5?0.55:(kind<3.5?0.22:1.7));
    ndc+=push*vec2(1.0/u_aspect,1.0)*0.085*pk*clamp(2.5/z,0.25,1.6);
    wake=min(wake,1.5);

    v_fade=smoothstep(0.3,1.6,zr)*smoothstep(u_len*0.98,u_len*0.6,zr);
    v_fog=1.0-exp(-zr*0.085);
    float px=size*u_px/z*mix(1.0,0.62,u_disperse*step(kind,0.5));
    if(kind>3.5) px*=1.0+wake*0.8;
    px=min(px,u_maxPt);
    v_px=px;
    gl_PointSize=px;
    gl_Position=vec4(ndc, clamp(p.z/u_len,0.0,1.0)*2.0-1.0, 1.0);
    if(p.z<0.05) gl_Position=vec4(2.0,2.0,2.0,1.0);
    v_col=a_col; v_kind=kind; v_seed=seed; v_glow=glow; v_wake=wake; v_id=vid;
  }`;

const FS_SPRITE = `#version 300 es
  precision highp float;
  in vec3 v_col;
  in float v_kind, v_seed, v_glow, v_fade, v_wake, v_px, v_fog, v_id;
  uniform float u_time, u_disperse;
  out vec4 o;
  const vec3 FOG=vec3(0.010,0.028,0.022);
  const vec3 L=vec3(-0.46,0.60,0.655);
  float hash(float n){ return fract(sin(n*12.9898)*43758.5453); }
  void main(){
    vec2 uv=gl_PointCoord*2.0-1.0; uv.y=-uv.y;
    float r2=dot(uv,uv);
    float aa=2.5/max(v_px,1.0);

    if(v_kind<0.5){                       // drupelet / berry / seed: a lit, translucent bead
      if(r2>1.0) discard;
      float r=sqrt(r2);
      vec3 n=vec3(uv,sqrt(1.0-r2));
      float dif=max(dot(n,L),0.0);
      float rim=pow(1.0-n.z,2.2);
      float spec=pow(max(dot(n,normalize(L+vec3(0.0,0.0,1.0))),0.0),64.0);
      vec3 c=v_col*(0.10+0.95*dif);
      c+=v_col*rim*0.9*(0.3+v_glow);
      c+=v_col*v_glow*(1.0+1.0*n.z)*2.2;
      c+=vec3(1.0,0.97,0.9)*spec*(1.0+v_glow);
      c+=v_col*v_wake*1.4+vec3(0.9,0.6,0.25)*v_wake*0.25;
      c=mix(c,FOG,v_fog*0.9*(1.0-min(v_glow,1.0)*0.55));
      float soft=exp(-r2*3.2);
      vec3 ember=mix(v_col,vec3(1.0,0.5,0.14),0.65)*(1.7+v_glow)*soft*2.0;
      c=mix(c,ember,u_disperse);
      float edge=1.0-smoothstep(1.0-aa,1.0,r);
      o=vec4(c,mix(edge,soft,u_disperse)*v_fade);

    } else if(v_kind<1.5){                // serrated, dew-coated leaf (or a calyx sepal)
      bool fixedRot=v_glow>0.0005;
      float rot=fixedRot?v_glow:hash(v_id)*6.2831+sin(u_time*0.5+v_seed*20.0)*0.12;
      float cr=cos(rot), sr=sin(rot);
      vec2 q=vec2(cr*uv.x-sr*uv.y, sr*uv.x+cr*uv.y);
      float turn=fixedRot?0.9:0.42+0.58*hash(v_id+5.0);
      q.x/=turn;
      float t=q.y*0.5+0.5;
      if(t<0.0||t>1.0) discard;
      float w=0.60*pow(sin(3.14159*pow(t,0.8)),0.9)*(1.0-0.35*t);
      w*=1.0-0.20*fract(t*11.0);          // saw-tooth margin
      float ax=abs(q.x);
      if(ax>w) discard;
      float side=q.x>0.0?1.0:0.55;
      float f=fract((t-ax*0.9)*7.0);
      float vein=1.0-smoothstep(0.0,0.07,min(f,1.0-f));
      float rib=1.0-smoothstep(0.0,0.035,ax);
      vec3 c=v_col*(0.22+0.9*side);
      c+=vec3(0.22,0.36,0.18)*(vein*0.16+rib*0.26);
      for(int k=0;k<3;k++){               // dew
        float fk=float(k);
        vec2 dc=vec2((hash(v_id+fk*3.1)-0.5)*0.5,hash(v_id+fk*5.7)*1.2-0.6);
        float d=length((q-dc)*vec2(turn,1.0));
        c+=vec3(0.85,1.0,0.95)*smoothstep(0.075,0.02,d)*(fixedRot?0.0:0.75);
      }
      c+=v_col*v_wake*0.9;
      c=mix(c,FOG,v_fog*0.93);
      c*=1.0-0.45*u_disperse;
      o=vec4(c,(1.0-smoothstep(w-aa*1.5,w,ax))*v_fade);

    } else if(v_kind<2.5){                // bramble cane, drawn bead by bead
      if(r2>1.0) discard;
      vec3 n=vec3(uv,sqrt(1.0-r2));
      vec3 c=v_col*(0.25+0.85*max(dot(n,L),0.0))+vec3(0.03,0.07,0.05)*pow(1.0-n.z,2.0);
      c=mix(c,FOG,v_fog*0.93);
      c*=1.0-0.4*u_disperse;
      o=vec4(c,(1.0-smoothstep(1.0-aa,1.0,sqrt(r2)))*v_fade);

    } else if(v_kind<3.5){                // thorn
      float rot=hash(v_id)*6.2831;
      float cr=cos(rot), sr=sin(rot);
      vec2 q=vec2(cr*uv.x-sr*uv.y, sr*uv.x+cr*uv.y);
      float t=q.y*0.5+0.5;
      float w=0.42*(1.0-t);
      if(t<0.0||t>1.0||abs(q.x)>w) discard;
      vec3 c=mix(v_col*(0.5+0.6*t),FOG,v_fog*0.93);
      o=vec4(c,v_fade);

    } else if(v_kind<4.5){                // spore or firefly (additive)
      if(r2>1.0) discard;
      float core=exp(-r2*9.0), halo=exp(-r2*2.6)*0.35;
      float tw=0.6+0.4*sin(u_time*(1.0+hash(v_id)*2.0)+v_id);
      float blink=v_glow>0.5?smoothstep(0.15,1.0,sin(u_time*0.9+v_id*1.7))*2.4:1.0;
      o=vec4(v_col*(core+halo)*tw*blink*(0.75+v_wake*1.7)*v_fade*(1.0-v_fog*0.55),1.0);

    } else {                              // light pooling around glowing fruit (additive)
      if(r2>1.0) discard;
      float h=exp(-r2*3.4);
      // 0.34: ripe fruit casts its light onto the leaves and mist around it.
      o=vec4(v_col*h*v_glow*0.34*(1.0+v_wake)*v_fade*(1.0-v_fog*0.5)*(1.0+u_disperse*0.9),1.0);
    }
  }`;

const VS_QUAD = `#version 300 es
  out vec2 v_uv;
  void main(){
    vec2 p=vec2(float((gl_VertexID<<1)&2),float(gl_VertexID&2));
    v_uv=p; gl_Position=vec4(p*2.0-1.0,0.0,1.0);
  }`;

const NOISE = `
  float h2(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
  float vnoise(vec2 p){
    vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
    return mix(mix(h2(i),h2(i+vec2(1.0,0.0)),f.x),mix(h2(i+vec2(0.0,1.0)),h2(i+vec2(1.0,1.0)),f.x),f.y);
  }
  float fbm(vec2 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vnoise(p); p=p*2.03+7.1; a*=0.5; } return s; }`;

const FS_BG = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 o;
  uniform float u_aspect; uniform vec2 u_look;
  ${NOISE}
  void main(){
    float y=v_uv.y+u_look.y*0.6;
    vec2 p=vec2((v_uv.x-0.5)*u_aspect-u_look.x*1.3, y);
    // Canopy baseline: lifted so the forest reads as night, not as a black void.
    vec3 c=mix(vec3(0.008,0.020,0.014),vec3(0.026,0.075,0.058),smoothstep(0.0,0.55,y));
    c=mix(c,vec3(0.014,0.038,0.052),smoothstep(0.5,1.05,y));
    vec2 a=p-vec2(0.62,0.9), b=p-vec2(0.0,0.5), e=p-vec2(-0.7,0.12);
    c+=vec3(0.12,0.06,0.24)*0.45*exp(-dot(a,a)*2.2);     // elderberry haze in the canopy
    c+=vec3(0.07,0.20,0.13)*0.65*exp(-dot(b,b)*3.2);     // faint light where the path leads
    c+=vec3(0.24,0.12,0.03)*0.35*exp(-dot(e,e)*3.0);     // a cloudberry ember low in the brush
    float n=fbm(vec2(p.x*2.2,y*2.6)+3.0);
    c*=mix(0.3,1.2,smoothstep(0.32,0.72,n));             // far foliage, only as darkness
    o=vec4(c,1.0);
  }`;

const FS_BRIGHT = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 o; uniform sampler2D u_tex;
  void main(){
    vec3 c=texture(u_tex,v_uv).rgb;
    float l=max(c.r,max(c.g,c.b));
    o=vec4(c*smoothstep(0.42,1.05,l),1.0);
  }`;

const FS_BLUR = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 o; uniform sampler2D u_tex; uniform vec2 u_dir;
  void main(){
    vec3 c=texture(u_tex,v_uv).rgb*0.2270270;
    c+=(texture(u_tex,v_uv+u_dir*1.3846154).rgb+texture(u_tex,v_uv-u_dir*1.3846154).rgb)*0.3162162;
    c+=(texture(u_tex,v_uv+u_dir*3.2307692).rgb+texture(u_tex,v_uv-u_dir*3.2307692).rgb)*0.0702703;
    o=vec4(c,1.0);
  }`;

const FS_FINAL = `#version 300 es
  precision highp float;
  in vec2 v_uv; out vec4 o;
  uniform sampler2D u_scene, u_bloomA, u_bloomB;
  uniform float u_time, u_aspect, u_vig, u_ca, u_disperse, u_ember;
  uniform vec2 u_look;
  uniform vec3 u_trail[${TRAIL}];
  ${NOISE}
  void main(){
    vec2 d=v_uv-0.5;
    float ca=u_ca*dot(d,d);
    vec3 c=vec3(texture(u_scene,v_uv+d*ca).r,texture(u_scene,v_uv).g,texture(u_scene,v_uv-d*ca).b);
    c+=texture(u_bloomA,v_uv).rgb*0.75+texture(u_bloomB,v_uv).rgb*1.20;

    // Ground mist, drifting.
    float m=smoothstep(0.62,0.0,v_uv.y+u_look.y*0.5);
    float n=fbm(vec2(v_uv.x*3.0*u_aspect-u_look.x*2.0+u_time*0.035,v_uv.y*5.0-u_time*0.02));
    c+=vec3(0.060,0.105,0.092)*m*m*(0.3+0.9*n);

    // The lit wake of a finger or cursor.
    vec2 ndc=v_uv*2.0-1.0;
    for(int i=0;i<${TRAIL};i++){
      vec2 w=(ndc-u_trail[i].xy)*vec2(u_aspect,1.0);
      c+=vec3(0.95,0.62,0.26)*u_trail[i].z*exp(-dot(w,w)/0.03)*0.05;
    }

    c*=1.0+0.12*u_disperse;
    c=1.0-exp(-c*1.65);
    // Night Camp Mode: every hue folds into firelight.
    float lum=dot(c,vec3(0.30,0.59,0.11));
    c=mix(c,lum*vec3(1.28,0.74,0.26),u_ember);
    float v=smoothstep(1.02,0.22,length(d*vec2(1.0,1.12))*1.25);
    c*=mix(1.0,v,u_vig);
    // Chromatic grain: each channel gets its own noise.
    vec2 g=gl_FragCoord.xy+fract(u_time)*61.0;
    vec3 grain=vec3(h2(g),h2(g*1.31+17.0),h2(g*0.73+41.0))-0.5;
    c+=mix(grain,vec3(grain.r),u_ember)*0.034;
    o=vec4(c,1.0);
  }`;

/* ------------------------------------------------------------------------- */
/* Geometry                                                                   */
/* ------------------------------------------------------------------------- */

function prng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s + 0x6d2b79f5) >>> 0;
    let t = Math.imul(s ^ (s >>> 15), 1 | s);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Sprite kinds understood by the shaders.
const BEAD = 0;
const LEAF = 1;
const CANE = 2;
const THORN = 3;
const SPORE = 4;
const HALO = 5;

function grow(
  density: number,
  sprigs: readonly ThicketSprig[] = [],
): { solid: Float32Array; light: Float32Array; fruit: ThicketFruit[] } {
  const fruitLog: ThicketFruit[] = [];
  const R = prng(20261113);
  const solid: number[] = [];
  const light: number[] = [];
  const put = (
    list: number[], x: number, y: number, z: number, c: Vec3, size: number, kind: number, seed: number, glow: number,
  ) => {
    list.push(x, y, ((z % LEN) + LEN) % LEN, c[0], c[1], c[2], size, kind, seed, glow);
  };
  const tint = (c: Vec3, v: number): Vec3 => [c[0] * v, c[1] * v, c[2] * v];

  // Points spread evenly over a sphere: the beads of an aggregate fruit.
  const beads = (n: number, fn: (x: number, y: number, z: number, i: number) => void) => {
    for (let i = 0; i < n; i++) {
      const y = 1 - (i / (n - 1)) * 2;
      const r = Math.sqrt(1 - y * y);
      const a = i * 2.39996;
      fn(Math.cos(a) * r, y, Math.sin(a) * r, i);
    }
  };

  // Ripe blackberry: deep midnight indigo drupelets with a specular sheen.
  function blackberry(x: number, y: number, z: number, s: number) {
    const seed = R();
    const lit = R() < 0.3;
    const k = s * (0.9 + R() * 0.7);
    beads(22, (bx, by, bz) => {
      const unripe = R() < 0.07;
      const c: Vec3 = unripe ? [0.42, 0.05, 0.12] : tint([0.085, 0.06, 0.27], 0.75 + R() * 0.6);
      put(solid, x + bx * 0.062 * k, y + by * 0.082 * k, z + bz * 0.062 * k, c, 0.046 * k, BEAD, seed, lit ? 0.16 + R() * 0.14 : 0.03);
    });
    put(light, x, y, z, lit ? [0.42, 0.24, 1.0] : [0.2, 0.14, 0.55], 0.62 * k, HALO, seed, lit ? 1.0 : 0.35);
  }

  // Wild strawberry (Fragaria vesca): a ruby cone, golden achenes, a green calyx crown.
  // `lum` scales the fruit's own light: a film subject is lit softly so its skin and seeds stay readable.
  function strawberry(x: number, y: number, z: number, s: number, lum = 1) {
    const seed = R();
    const k = s * (0.95 + R() * 0.45);
    const body = 0.058 * k;
    const shape = (by: number) => 0.26 + 0.74 * Math.pow((by + 1) / 2, 0.62); // narrow tip, full shoulders
    beads(26, (bx, by, bz) => {
      const w = shape(by);
      put(solid, x + bx * body * w, y + by * body * 1.35, z + bz * body * w,
        tint([0.92, 0.12, 0.16], 0.82 + R() * 0.3), 0.05 * k, BEAD, seed, (0.2 + R() * 0.16) * lum);
    });
    // Achenes sit on the skin of the side that faces the walker, so they read as seeds, not sparks.
    const achenes = 8 + Math.floor(R() * 5);
    for (let i = 0; i < achenes; i++) {
      const by = -0.8 + R() * 1.45;
      const a = Math.PI * (0.12 + R() * 0.76); // front hemisphere only
      const w = shape(by) * 1.08;
      put(solid, x + Math.cos(a) * body * w, y + by * body * 1.35, z - Math.sin(a) * body * w - 0.035 * k,
        [0.96, 0.85, 0.28], 0.016 * s, BEAD, seed, 0.5);
    }
    // Calyx: four or five sepals fanned out from where the stem meets the fruit.
    const sepals = 4 + Math.floor(R() * 2);
    const top = y + body * 1.35 * 0.92;
    for (let i = 0; i < sepals; i++) {
      const theta = Math.PI * (0.08 + (0.84 * (i + 0.5)) / sepals) + (R() - 0.5) * 0.2;
      const reach = 0.04 * s;
      const rot = (((Math.PI / 2 - theta) % TAU) + TAU) % TAU;
      put(solid, x + Math.cos(theta) * reach, top + Math.sin(theta) * reach * 0.55, z - 0.05 * k,
        [0.12, 0.42, 0.16], 0.1 * s, LEAF, seed, rot + 0.001);
    }
    put(solid, x, top + 0.035 * s, z, [0.1, 0.3, 0.12], 0.014 * s, CANE, seed, 0);
    put(light, x, y, z, [1.0, 0.2, 0.22], 0.75 * s, HALO, seed, 1.05 * lum);
  }

  // Cloudberry: a small, glowing, translucent amber aggregate.
  function cloudberry(x: number, y: number, z: number, s: number) {
    const seed = R();
    const k = s * (0.9 + R() * 0.5);
    beads(11, (bx, by, bz) => {
      put(solid, x + bx * 0.05 * k, y + by * 0.05 * k, z + bz * 0.05 * k,
        tint([0.95, 0.56 + R() * 0.1, 0.15], 0.8 + R() * 0.35), 0.056 * k, BEAD, seed, 0.42 + R() * 0.25);
    });
    put(light, x, y, z, [1.0, 0.6, 0.2], 0.7 * k, HALO, seed, 1.25);
  }

  // Alpine currants: translucent ruby jewels on a hanging strig.
  function currants(x: number, y: number, z: number, s: number) {
    const seed = R();
    const n = 6 + Math.floor(R() * 5);
    for (let i = 0; i < n; i++) {
      const t = i / n;
      const k = s * (1 - t * 0.35);
      put(solid, x + Math.sin(i * 2.4) * 0.03 + (R() - 0.5) * 0.02, y - t * 0.3 * s, z + Math.cos(i * 2.4) * 0.03,
        tint([0.86, 0.09, 0.12], 0.8 + R() * 0.4), 0.058 * k, BEAD, seed, 0.32 + R() * 0.22);
      put(solid, x, y - t * 0.3 * s + 0.03, z, [0.09, 0.12, 0.07], 0.012, CANE, seed, 0);
    }
    put(light, x, y - 0.14 * s, z, [1.0, 0.16, 0.16], 0.7 * s, HALO, seed, 1.0);
  }

  // Elderberry: a wide, flat umbel of tiny violet-indigo drupes.
  function elderberry(x: number, y: number, z: number, s: number) {
    const seed = R();
    for (let i = 0; i < 46; i++) {
      const a = R() * TAU;
      const r = Math.sqrt(R()) * 0.17 * s;
      put(solid, x + Math.cos(a) * r, y - r * r * 2.2 + (R() - 0.5) * 0.02, z + Math.sin(a) * r * 0.8,
        tint([0.27, 0.19, 0.74], 0.7 + R() * 0.6), 0.024 * s, BEAD, seed, 0.2 + R() * 0.2);
    }
    put(light, x, y, z, [0.42, 0.3, 1.0], 0.8 * s, HALO, seed, 1.0);
  }

  const canes = Math.round(72 * density);
  for (let c = 0; c < canes; c++) {
    const arch = R() < 0.55;
    const z0 = R() * LEN;
    const zl = arch ? 0.6 + R() * 2.2 : 3 + R() * 6;
    const th0 = R() * TAU;
    const thv = arch ? (R() < 0.5 ? -1 : 1) * (1.2 + R() * 2.0) : (R() - 0.5) * 1.2;
    const r0 = 0.72 + Math.pow(R(), 0.75) * 3.2;
    const rv = (R() - 0.5) * (arch ? 1.2 : 0.8);
    const wob = R() * TAU;
    const wf = 0.5 + R() * 1.5;
    const seed = R();
    const steps = Math.max(24, Math.ceil(Math.hypot(zl, r0 * thv) / 0.03));
    const thick = 0.03 + R() * 0.028;
    const bark = tint([0.115, 0.095, 0.085], 0.7 + R() * 0.7);
    const fruit = R();
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      const a = th0 + thv * t + Math.sin(t * wf * TAU + wob) * 0.18;
      const rr = Math.max(0.62, r0 + rv * t + Math.sin(t * 4 + wob) * 0.12);
      const x = Math.cos(a) * rr * 1.3;
      const y = Math.sin(a) * rr * 0.82;
      const z = z0 + t * zl;
      put(solid, x, y, z, bark, thick * (1 - 0.5 * t), CANE, seed, 0);
      if (i % 8 === 3) {
        put(solid, x + (R() - 0.5) * 0.05, y + (R() - 0.5) * 0.05, z, tint(bark, 1.5), 0.06 + R() * 0.04, THORN, seed, 0);
      }
      if (i % 7 === 0 && R() < 0.8) {
        put(solid, x + (R() - 0.5) * 0.24, y + (R() - 0.5) * 0.24, z + (R() - 0.5) * 0.1,
          [0.04 + R() * 0.05, 0.19 + R() * 0.15, 0.09 + R() * 0.07], 0.17 + R() * 0.21, LEAF, seed, 0);
      }
      if (i % 36 === 18 && R() < 0.72) {
        const bx = x + (R() - 0.5) * 0.1;
        const by = y - 0.07 - R() * 0.1;
        const s = 0.95 + R() * 0.5;
        // Five fruits: 25% blackberry · 20% strawberry · 20% cloudberry · 20% currant · 15% elderberry.
        const kind: ThicketFruit["kind"] =
          fruit < 0.25 ? "blackberry" : fruit < 0.45 ? "strawberry" : fruit < 0.65 ? "cloudberry" : fruit < 0.85 ? "currant" : "elderberry";
        if (kind === "blackberry") blackberry(bx, by, z, s);
        else if (kind === "strawberry") strawberry(bx, by, z, s);
        else if (kind === "cloudberry") cloudberry(bx, by, z, s);
        else if (kind === "currant") currants(bx, by, z, s);
        else elderberry(bx, by, z, s);
        fruitLog.push({ kind, x: bx, y: by, z: ((z % LEN) + LEN) % LEN, size: s });
      }
    }
  }

  // Forest spores; about one in eight is a firefly that blinks golden-green or cloudberry amber.
  const spores = Math.round(980 * density);
  for (let i = 0; i < spores; i++) {
    const a = R() * TAU;
    const rr = 0.15 + Math.pow(R(), 0.8) * 4.4;
    const roll = R();
    const fly = R() < 0.12;
    const c: Vec3 = fly
      ? R() < 0.55 ? [0.74, 0.96, 0.34] : [0.98, 0.62, 0.2]
      : roll < 0.55 ? [0.92, 0.86, 0.7] : roll < 0.8 ? [0.2, 0.9, 0.55] : roll < 0.94 ? [0.95, 0.62, 0.22] : [0.6, 0.45, 1.0];
    put(light, Math.cos(a) * rr * 1.3, Math.sin(a) * rr * 0.85, R() * LEN, c, fly ? 0.075 : 0.02 + R() * 0.035, SPORE, R(), fly ? 1 : 0);
  }

  // Film subjects: a crown of leaves with strawberries hanging from it on fine
  // pedicels. Planted last, so the thicket itself is the same with or without them.
  for (const spec of sprigs) {
    const k = spec.scale ?? 1;
    const count = spec.fruits ?? 5;
    const seed = R();
    const crown = spec.y + 0.36 * k;
    for (let i = 0; i < 5; i++) {
      const a = Math.PI * (0.08 + 0.84 * (i / 4));
      put(solid, spec.x + Math.cos(a) * 0.2 * k, crown + Math.sin(a) * 0.1 * k, spec.z + 0.05 + i * 0.012,
        [0.05 + R() * 0.04, 0.24 + R() * 0.12, 0.1 + R() * 0.05], (0.2 + R() * 0.08) * k, LEAF, seed, 0);
    }
    for (let i = 0; i < count; i++) {
      const t = count > 1 ? i / (count - 1) : 0.5;
      const s = k * (0.95 + R() * 0.4);
      const fx = spec.x + (t - 0.5) * 0.62 * k + (R() - 0.5) * 0.04 * k;
      const fy = spec.y - Math.sin(t * Math.PI) * 0.1 * k + (i % 2) * 0.17 * k;
      const fz = spec.z + (R() - 0.5) * 0.12 * k;
      strawberry(fx, fy, fz, s, 0.22);
      const top = fy + 0.11 * s;
      for (let j = 1; j < 14; j++) {
        const u = j / 14;
        const v = 1 - u;
        put(solid, v * v * spec.x + 2 * u * v * fx + u * u * fx, v * v * crown + 2 * u * v * crown + u * u * top,
          spec.z + (fz - spec.z) * u + 0.01, [0.1, 0.24, 0.1], 0.011 * k, CANE, seed, 0);
      }
    }
  }
  return { solid: new Float32Array(solid), light: new Float32Array(light), fruit: fruitLog };
}

/* ------------------------------------------------------------------------- */
/* Stage: the GL pipeline                                                     */
/* ------------------------------------------------------------------------- */

interface Program {
  prog: WebGLProgram;
  u: Map<string, WebGLUniformLocation>;
}
interface Target {
  fbo: WebGLFramebuffer;
  tex: WebGLTexture;
  rb: WebGLRenderbuffer | null;
  w: number;
  h: number;
}
interface Targets {
  scene: Target;
  a1: Target;
  a2: Target;
  b1: Target;
  b2: Target;
}

/** Everything a painted frame depends on. The stage keeps nothing between paints. */
interface View {
  time: number;
  travel: number;
  lookX: number;
  lookY: number;
  tiltX: number;
  tiltY: number;
  disperse: number;
  ember: number;
  breathe: number;
  rush: number;
  zoom: number;
  /** Corridor proportions, or null for the live rule (tall in portrait). */
  shape: readonly [number, number] | null;
  /** TRAIL × (ndc x, ndc y, strength). */
  trail: Float32Array;
}

interface Stage {
  g: WebGL2RenderingContext;
  fruit: ThicketFruit[];
  /** Sizes the canvas and its render targets, in backing-store pixels. */
  setSize(w: number, h: number): void;
  paint(view: View): void;
  /** Releases GPU objects but keeps the context: the same canvas may be started again. */
  dispose(): void;
}

function headingAt(travel: number): [number, number] {
  const here = pathAt(travel);
  const ahead = pathAt(travel + 3.2);
  return [Math.atan2(ahead[0] - here[0], 3.2) * 0.85, Math.atan2(ahead[1] - here[1], 3.2) * 0.85];
}

/**
 * Compiles the shaders and uploads the geometry. Returns null — and leaves the
 * canvas blank — when WebGL2 or its shaders are unavailable.
 */
function createStage(canvas: HTMLCanvasElement, density: number, sprigs: readonly ThicketSprig[] = []): Stage | null {
  const context = (() => {
    try {
      return canvas.getContext("webgl2", { antialias: false, alpha: false, depth: false, powerPreference: "high-performance" });
    } catch {
      return null;
    }
  })();
  if (!context || context.isContextLost()) return null;
  const g: WebGL2RenderingContext = context;

  function compile(type: number, source: string): WebGLShader {
    const shader = g.createShader(type);
    if (!shader) throw new Error("shader");
    g.shaderSource(shader, source);
    g.compileShader(shader);
    if (!g.getShaderParameter(shader, g.COMPILE_STATUS)) throw new Error(g.getShaderInfoLog(shader) ?? "shader");
    return shader;
  }
  function program(vs: string, fs: string): Program {
    const prog = g.createProgram();
    if (!prog) throw new Error("program");
    const v = compile(g.VERTEX_SHADER, vs);
    const f = compile(g.FRAGMENT_SHADER, fs);
    g.attachShader(prog, v);
    g.attachShader(prog, f);
    g.linkProgram(prog);
    g.deleteShader(v);
    g.deleteShader(f);
    if (!g.getProgramParameter(prog, g.LINK_STATUS)) throw new Error(g.getProgramInfoLog(prog) ?? "link");
    const u = new Map<string, WebGLUniformLocation>();
    const count = g.getProgramParameter(prog, g.ACTIVE_UNIFORMS) as number;
    for (let i = 0; i < count; i++) {
      const info = g.getActiveUniform(prog, i);
      if (!info) continue;
      const name = info.name.replace(/\[0\]$/, "");
      const location = g.getUniformLocation(prog, name);
      if (location) u.set(name, location);
    }
    return { prog, u };
  }

  let P: { sprite: Program; bg: Program; bright: Program; blur: Program; final: Program };
  try {
    P = {
      sprite: program(VS_SPRITE, FS_SPRITE),
      bg: program(VS_QUAD, FS_BG),
      bright: program(VS_QUAD, FS_BRIGHT),
      blur: program(VS_QUAD, FS_BLUR),
      final: program(VS_QUAD, FS_FINAL),
    };
  } catch (err) {
    console.warn("TrailSnack thicket: shaders unavailable, using the static backdrop.", err);
    return null;
  }
  const loc = (p: Program, name: string): WebGLUniformLocation | null => p.u.get(name) ?? null;

  const buffers: WebGLBuffer[] = [];
  function upload(data: Float32Array): { vao: WebGLVertexArrayObject; count: number } {
    const vao = g.createVertexArray();
    const buffer = g.createBuffer();
    g.bindVertexArray(vao);
    g.bindBuffer(g.ARRAY_BUFFER, buffer);
    g.bufferData(g.ARRAY_BUFFER, data, g.STATIC_DRAW);
    const stride = 40;
    g.enableVertexAttribArray(0);
    g.vertexAttribPointer(0, 3, g.FLOAT, false, stride, 0);
    g.enableVertexAttribArray(1);
    g.vertexAttribPointer(1, 3, g.FLOAT, false, stride, 12);
    g.enableVertexAttribArray(2);
    g.vertexAttribPointer(2, 4, g.FLOAT, false, stride, 24);
    g.bindVertexArray(null);
    buffers.push(buffer);
    return { vao, count: data.length / 10 };
  }
  const geometry = grow(density, sprigs);
  const solid = upload(geometry.solid);
  const light = upload(geometry.light);
  const quad = g.createVertexArray();

  const floatTargets = !!g.getExtension("EXT_color_buffer_float");
  g.getExtension("OES_texture_float_linear");
  const pointRange = g.getParameter(g.ALIASED_POINT_SIZE_RANGE) as Float32Array | null;
  const maxPoint = pointRange?.[1] ?? 256;

  let targets: Targets | null = null;
  let width = 0;
  let height = 0;

  function target(w: number, h: number, depth: boolean): Target {
    const tex = g.createTexture();
    g.bindTexture(g.TEXTURE_2D, tex);
    if (floatTargets) g.texImage2D(g.TEXTURE_2D, 0, g.RGBA16F, w, h, 0, g.RGBA, g.HALF_FLOAT, null);
    else g.texImage2D(g.TEXTURE_2D, 0, g.RGBA8, w, h, 0, g.RGBA, g.UNSIGNED_BYTE, null);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MIN_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_MAG_FILTER, g.LINEAR);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_S, g.CLAMP_TO_EDGE);
    g.texParameteri(g.TEXTURE_2D, g.TEXTURE_WRAP_T, g.CLAMP_TO_EDGE);
    const fbo = g.createFramebuffer();
    g.bindFramebuffer(g.FRAMEBUFFER, fbo);
    g.framebufferTexture2D(g.FRAMEBUFFER, g.COLOR_ATTACHMENT0, g.TEXTURE_2D, tex, 0);
    let rb: WebGLRenderbuffer | null = null;
    if (depth) {
      rb = g.createRenderbuffer();
      g.bindRenderbuffer(g.RENDERBUFFER, rb);
      g.renderbufferStorage(g.RENDERBUFFER, g.DEPTH_COMPONENT16, w, h);
      g.framebufferRenderbuffer(g.FRAMEBUFFER, g.DEPTH_ATTACHMENT, g.RENDERBUFFER, rb);
    }
    return { fbo, tex, rb, w, h };
  }
  function freeTargets() {
    if (!targets) return;
    for (const t of Object.values(targets) as Target[]) {
      g.deleteFramebuffer(t.fbo);
      g.deleteTexture(t.tex);
      if (t.rb) g.deleteRenderbuffer(t.rb);
    }
    targets = null;
  }
  function setSize(w: number, h: number) {
    if (w === width && h === height && targets) return;
    width = w;
    height = h;
    canvas.width = w;
    canvas.height = h;
    freeTargets();
    const hw = Math.max(2, w >> 1);
    const hh = Math.max(2, h >> 1);
    const qw = Math.max(2, w >> 2);
    const qh = Math.max(2, h >> 2);
    targets = {
      scene: target(w, h, true),
      a1: target(hw, hh, false),
      a2: target(hw, hh, false),
      b1: target(qw, qh, false),
      b2: target(qw, qh, false),
    };
  }

  function pass(prog: Program, out: WebGLFramebuffer | null, w: number, h: number) {
    g.bindFramebuffer(g.FRAMEBUFFER, out);
    g.viewport(0, 0, w, h);
    g.useProgram(prog.prog);
  }
  function bindTex(unit: number, tex: WebGLTexture, location: WebGLUniformLocation | null) {
    g.activeTexture(g.TEXTURE0 + unit);
    g.bindTexture(g.TEXTURE_2D, tex);
    g.uniform1i(location, unit);
  }
  function blur(src: Target, dst: Target, dx: number, dy: number) {
    pass(P.blur, dst.fbo, dst.w, dst.h);
    bindTex(0, src.tex, loc(P.blur, "u_tex"));
    g.uniform2f(loc(P.blur, "u_dir"), dx, dy);
    g.drawArrays(g.TRIANGLES, 0, 3);
  }

  function paint(view: View) {
    const S = targets;
    if (!S) return;
    const aspect = width / height;
    const focal = (aspect < 1 ? 1.22 : 1.66) * view.zoom;
    // Portrait: the corridor becomes tall instead of wide so the thicket fills a phone.
    const shape = view.shape ?? (aspect < 1 ? PORTRAIT_SHAPE : SQUARE_SHAPE);

    // 1 · Scene
    pass(P.bg, S.scene.fbo, width, height);
    g.disable(g.DEPTH_TEST);
    g.disable(g.BLEND);
    g.depthMask(true);
    g.clearDepth(1);
    g.clear(g.DEPTH_BUFFER_BIT);
    g.uniform1f(loc(P.bg, "u_aspect"), aspect);
    g.uniform2f(loc(P.bg, "u_look"), view.lookX, view.lookY);
    g.bindVertexArray(quad);
    g.drawArrays(g.TRIANGLES, 0, 3);

    g.useProgram(P.sprite.prog);
    const sp = P.sprite;
    g.uniform1f(loc(sp, "u_time"), view.time);
    g.uniform1f(loc(sp, "u_travel"), view.travel);
    g.uniform1f(loc(sp, "u_len"), LEN);
    g.uniform1f(loc(sp, "u_aspect"), aspect);
    g.uniform1f(loc(sp, "u_focal"), focal);
    g.uniform1f(loc(sp, "u_px"), height * focal * 0.5);
    g.uniform1f(loc(sp, "u_disperse"), view.disperse);
    g.uniform1f(loc(sp, "u_breathe"), view.breathe);
    g.uniform1f(loc(sp, "u_maxPt"), maxPoint);
    g.uniform2f(loc(sp, "u_look"), view.lookX, view.lookY);
    g.uniform2f(loc(sp, "u_tilt"), view.tiltX, view.tiltY);
    g.uniform2f(loc(sp, "u_shape"), shape[0], shape[1]);
    g.uniform3fv(loc(sp, "u_trail"), view.trail);

    g.enable(g.DEPTH_TEST);
    g.depthFunc(g.LEQUAL);
    g.enable(g.BLEND);
    g.blendFuncSeparate(g.SRC_ALPHA, g.ONE_MINUS_SRC_ALPHA, g.ONE, g.ONE_MINUS_SRC_ALPHA);
    g.bindVertexArray(solid.vao);
    g.drawArrays(g.POINTS, 0, solid.count);

    g.depthMask(false);
    g.blendFunc(g.ONE, g.ONE);
    g.bindVertexArray(light.vao);
    g.drawArrays(g.POINTS, 0, light.count);
    g.depthMask(true);
    g.disable(g.DEPTH_TEST);
    g.disable(g.BLEND);

    // 2 · Bloom
    g.bindVertexArray(quad);
    pass(P.bright, S.a1.fbo, S.a1.w, S.a1.h);
    bindTex(0, S.scene.tex, loc(P.bright, "u_tex"));
    g.drawArrays(g.TRIANGLES, 0, 3);
    blur(S.a1, S.a2, 1 / S.a1.w, 0);
    blur(S.a2, S.a1, 0, 1 / S.a1.h);
    blur(S.a1, S.b1, 1.6 / S.b1.w, 0);
    blur(S.b1, S.b2, 0, 1.6 / S.b1.h);
    blur(S.b2, S.b1, 2.4 / S.b1.w, 0);
    blur(S.b1, S.b2, 0, 2.4 / S.b1.h);

    // 3 · Final: bloom, mist, wake light, vignette, chromatic grain
    pass(P.final, null, width, height);
    const fin = P.final;
    bindTex(0, S.scene.tex, loc(fin, "u_scene"));
    bindTex(1, S.a1.tex, loc(fin, "u_bloomA"));
    bindTex(2, S.b2.tex, loc(fin, "u_bloomB"));
    g.uniform1f(loc(fin, "u_time"), view.time);
    g.uniform1f(loc(fin, "u_aspect"), aspect);
    g.uniform1f(loc(fin, "u_vig"), 0.5 + 0.45 * view.rush);
    g.uniform1f(loc(fin, "u_ca"), 0.012 + 0.06 * view.rush);
    g.uniform1f(loc(fin, "u_disperse"), view.disperse);
    g.uniform1f(loc(fin, "u_ember"), view.ember);
    g.uniform2f(loc(fin, "u_look"), view.lookX, view.lookY);
    g.uniform3fv(loc(fin, "u_trail"), view.trail);
    g.drawArrays(g.TRIANGLES, 0, 3);
    g.bindVertexArray(null);
  }

  function dispose() {
    freeTargets();
    for (const buffer of buffers) g.deleteBuffer(buffer);
    g.deleteVertexArray(solid.vao);
    g.deleteVertexArray(light.vao);
    g.deleteVertexArray(quad);
    for (const p of Object.values(P)) g.deleteProgram(p.prog);
  }

  return { g, fruit: geometry.fruit, setSize, paint, dispose };
}

/* ------------------------------------------------------------------------- */
/* Engine: the live thicket                                                   */
/* ------------------------------------------------------------------------- */

/**
 * Starts the thicket on `canvas`. Returns null — and leaves the canvas blank,
 * so the page's static backdrop shows through — when WebGL2 or its shaders are
 * unavailable.
 */
export function createThicket(canvas: HTMLCanvasElement, options: ThicketOptions = {}): Thicket | null {
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const touchFirst = window.matchMedia("(hover: none)").matches;
  const compact = touchFirst || Math.min(window.innerWidth, window.innerHeight) < 700;
  const maxDpr = options.maxDpr ?? (compact ? 1.5 : 2);
  const breathe = options.breathe ?? (touchFirst ? 1 : 0.35);
  let fps = options.fps ?? 60;

  const stage = createStage(canvas, options.density ?? (compact ? 0.62 : 1));
  if (!stage) return null;
  const g = stage.g;

  let quality = 1;
  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, maxDpr) * quality;
    stage?.setSize(Math.max(2, Math.round(canvas.clientWidth * dpr)), Math.max(2, Math.round(canvas.clientHeight * dpr)));
  }

  /* ------------------------------ state ------------------------------ */
  const wake = Array.from({ length: TRAIL }, () => ({ x: 9, y: 9, s: 0 }));
  const trail = new Float32Array(TRAIL * 3);
  let head = 0;
  let pointerX = 0;
  let pointerY = 0;
  let pointerLive = false;
  let lookX = 0;
  let lookY = 0;
  let tiltX = 0;
  let tiltY = 0;
  let tiltGoalX = 0;
  let tiltGoalY = 0;
  let time = 0;
  let idle = 0;
  let travel = 0;
  let scroll = 0;
  let speed = 0;
  let disperse = 0;
  let disperseGoal = 0;
  let ember = 0;
  let emberGoal = 0;
  let last = 0;
  let lastSaved = 0;
  let raf = 0;
  let paused = false;
  let hidden = document.visibilityState !== "visible";
  let disposed = false;
  let slowFrames = 0;
  let frames = 0;

  if (options.resume) {
    try {
      const saved = Number(sessionStorage.getItem(RESUME_KEY));
      if (Number.isFinite(saved) && saved > 0) {
        idle = saved;
        travel = saved;
      }
    } catch {
      // Storage unavailable: start from the trailhead.
    }
  }
  function remember() {
    if (!options.resume) return;
    try {
      sessionStorage.setItem(RESUME_KEY, travel.toFixed(2));
    } catch {
      // ignore
    }
  }

  function draw(dt: number) {
    const still = reducedMotion.matches;
    if (!still) time += dt;

    disperse += (disperseGoal - disperse) * (1 - Math.exp(-dt * 2.6));
    ember += (emberGoal - ember) * (1 - Math.exp(-dt * 3));
    if (!still) idle += dt * 0.34 * (1 - disperse);
    const before = travel;
    travel += (idle + scroll * 0.011 - travel) * (1 - Math.exp(-dt * 5));
    speed += (Math.abs(travel - before) / Math.max(dt, 0.001) - speed) * (1 - Math.exp(-dt * 4));
    const rush = Math.min(1, Math.max(0, (speed - 0.5) / 9));

    // Wake: the head follows the pointer, older points fade behind it.
    const fade = Math.exp(-dt * 2.4);
    for (const point of wake) point.s *= fade;
    if (pointerLive) {
      const current = wake[head];
      if (current && Math.hypot(pointerX - current.x, pointerY - current.y) > 0.07) head = (head + 1) % TRAIL;
      const lead = wake[head];
      if (lead) {
        lead.x = pointerX;
        lead.y = pointerY;
        lead.s = Math.min(1, lead.s + dt * 7);
      }
    }
    wake.forEach((point, i) => {
      trail[i * 3] = point.x;
      trail[i * 3 + 1] = point.y;
      trail[i * 3 + 2] = point.s;
    });

    // Heading follows the path; pointer and gyroscope lean the view.
    const [headX, headY] = headingAt(travel);
    tiltX += (tiltGoalX - tiltX) * (1 - Math.exp(-dt * 3));
    tiltY += (tiltGoalY - tiltY) * (1 - Math.exp(-dt * 3));
    const lean = pointerLive && !touchFirst;
    const goalX = headX + (lean ? pointerX * 0.09 : 0) + tiltX * 0.16;
    const goalY = headY + (lean ? pointerY * 0.05 : 0) + tiltY * 0.1;
    lookX += (goalX - lookX) * (1 - Math.exp(-dt * 2.5));
    lookY += (goalY - lookY) * (1 - Math.exp(-dt * 2.5));

    resize();
    stage?.paint({
      time,
      travel,
      lookX,
      lookY,
      tiltX,
      tiltY,
      disperse,
      ember,
      breathe: still ? 0 : breathe,
      rush,
      zoom: 1,
      shape: null,
      trail,
    });
  }

  function frame(now: number) {
    raf = requestAnimationFrame(frame);
    // Reduced motion keeps the scene still, so a slow refresh is all scrolling needs.
    const interval = 1000 / (reducedMotion.matches ? Math.min(fps, 12) : fps);
    if (last && now - last < interval - 2) return;
    const dt = Math.min(0.1, last ? (now - last) / 1000 : 1 / 60);
    last = now;

    // Adaptive quality: if the device cannot keep up, render fewer pixels.
    if (++frames > 60) {
      if (dt > (1 / fps) * 1.55) slowFrames++;
      if (frames > 180) {
        if (slowFrames > 60 && quality > 0.55) quality *= 0.8;
        frames = 60;
        slowFrames = 0;
      }
    }
    draw(dt);
    if (now - lastSaved > 2000) {
      lastSaved = now;
      remember();
    }
  }

  function sync() {
    const shouldRun = !disposed && !paused && !hidden;
    if (shouldRun && raf === 0) {
      last = 0;
      frames = 0;
      slowFrames = 0;
      raf = requestAnimationFrame(frame);
    } else if (!shouldRun && raf !== 0) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
  }

  const onVisibility = () => {
    hidden = document.visibilityState !== "visible";
    if (hidden) remember();
    sync();
  };
  const onContextLost = (event: Event) => {
    event.preventDefault();
    paused = true;
    sync();
  };
  const onResize = () => {
    // While frozen there is no loop to pick the new size up: redraw once.
    if (raf === 0 && !disposed && !g.isContextLost()) draw(0);
  };
  document.addEventListener("visibilitychange", onVisibility);
  window.addEventListener("pagehide", remember);
  window.addEventListener("resize", onResize);
  canvas.addEventListener("webglcontextlost", onContextLost);

  // Start already facing down the path, so nothing swings into place on load.
  [lookX, lookY] = headingAt(travel);

  // Always put one frame on screen, even if the caller pauses straight away.
  draw(0);
  sync();

  return {
    pointer(clientX, clientY) {
      pointerX = (clientX / window.innerWidth) * 2 - 1;
      pointerY = 1 - (clientY / window.innerHeight) * 2;
      pointerLive = true;
    },
    release() {
      pointerLive = false;
    },
    tilt(x, y) {
      tiltGoalX = x;
      tiltGoalY = y;
    },
    setTransition(active) {
      disperseGoal = active ? 1 : 0;
    },
    setScroll(y) {
      scroll = y;
    },
    setPaused(next) {
      paused = next;
      sync();
    },
    setFps(next) {
      fps = Math.max(1, next);
    },
    setEmber(active) {
      emberGoal = active ? 1 : 0;
      if (raf === 0 && !disposed && !g.isContextLost()) {
        ember = emberGoal;
        draw(0);
      }
    },
    dispose() {
      if (disposed) return;
      remember();
      disposed = true;
      sync();
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", remember);
      window.removeEventListener("resize", onResize);
      canvas.removeEventListener("webglcontextlost", onContextLost);
      stage.dispose();
    },
  };
}

/* ------------------------------------------------------------------------- */
/* Film: the thicket as a pure function of a frame                            */
/* ------------------------------------------------------------------------- */

/**
 * Prepares `canvas` for offline rendering at a fixed pixel size. Nothing runs
 * until `render` is called, and a render reads only the frame it is given — the
 * same frame always paints the same picture, in any order. Returns null when
 * WebGL2 or its shaders are unavailable.
 */
export function createThicketFilm(canvas: HTMLCanvasElement, options: ThicketFilmOptions): ThicketFilm | null {
  const stage = createStage(canvas, options.density ?? 1, options.sprigs);
  if (!stage) return null;
  stage.setSize(Math.max(2, Math.round(options.width)), Math.max(2, Math.round(options.height)));
  const shape = options.shape ?? (options.width < options.height ? PORTRAIT_SHAPE : SQUARE_SHAPE);
  const trail = new Float32Array(TRAIL * 3);

  return {
    length: LEN,
    fruit: stage.fruit,
    heading: headingAt,
    aim(travel, x, y, z) {
      const ahead = (((z - travel) % LEN) + LEN) % LEN;
      const here = pathAt(travel);
      const there = pathAt(travel + ahead);
      const px = there[0] - here[0] + x * shape[0];
      const py = there[1] - here[1] + y * shape[1];
      return [Math.atan2(px, ahead), Math.atan2(py, Math.hypot(px, ahead))];
    },
    render(frame) {
      for (let i = 0; i < TRAIL; i++) {
        const point = frame.wake?.[i];
        trail[i * 3] = point ? point[0] : 9;
        trail[i * 3 + 1] = point ? point[1] : 9;
        trail[i * 3 + 2] = point ? point[2] : 0;
      }
      stage.paint({
        time: frame.time,
        travel: frame.travel,
        lookX: frame.look[0],
        lookY: frame.look[1],
        tiltX: frame.tilt?.[0] ?? 0,
        tiltY: frame.tilt?.[1] ?? 0,
        disperse: frame.disperse ?? 0,
        ember: frame.ember ?? 0,
        breathe: frame.breathe ?? 0.35,
        rush: frame.rush ?? 0,
        zoom: frame.zoom ?? 1,
        shape,
        trail,
      });
    },
    dispose: stage.dispose,
  };
}

/**
 * Wires the page's scroll position and pointer to a thicket: mouse or pen
 * movement, and touch drags that keep working while the page scrolls. Returns
 * a function that removes every listener.
 */
export function bindThicketInput(thicket: Thicket, onScroll?: (y: number) => void): () => void {
  const scroll = () => {
    const y = window.scrollY || 0;
    thicket.setScroll(y);
    onScroll?.(y);
  };
  const move = (event: PointerEvent) => {
    if (event.pointerType !== "touch") thicket.pointer(event.clientX, event.clientY);
  };
  const touch = (event: TouchEvent) => {
    const first = event.touches[0];
    if (first) thicket.pointer(first.clientX, first.clientY);
  };
  const release = () => thicket.release();
  const passive = { passive: true } as const;
  window.addEventListener("scroll", scroll, passive);
  window.addEventListener("pointermove", move, passive);
  window.addEventListener("touchstart", touch, passive);
  window.addEventListener("touchmove", touch, passive);
  window.addEventListener("touchend", release, passive);
  window.addEventListener("touchcancel", release, passive);
  document.documentElement.addEventListener("pointerleave", release);
  scroll();
  return () => {
    window.removeEventListener("scroll", scroll);
    window.removeEventListener("pointermove", move);
    window.removeEventListener("touchstart", touch);
    window.removeEventListener("touchmove", touch);
    window.removeEventListener("touchend", release);
    window.removeEventListener("touchcancel", release);
    document.documentElement.removeEventListener("pointerleave", release);
  };
}
