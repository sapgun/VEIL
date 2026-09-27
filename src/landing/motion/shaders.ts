export const sceneVertex = `#version 300 es
in vec2 aPosition;
out vec2 vUv;
void main(){ vUv=aPosition*.5+.5; gl_Position=vec4(aPosition,0.,1.); }
`;
export const sceneFragment = `#version 300 es
precision highp float;
in vec2 vUv;
out vec4 color;
uniform sampler2D uAtlas;
uniform float uAspect, uSpread, uMorph, uDissolve;
float hash(vec2 p){ return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453); }
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float shape(vec2 uv, float index){
  if(uv.x<=0.||uv.x>=1.||uv.y<=0.||uv.y>=1.)return 0.;
  return texture(uAtlas,vec2((uv.x+index)/3.,1.-uv.y)).a;
}
void main(){
  vec2 q=(vUv-.5)*vec2(uAspect*2.,2.);
  float light=exp(-dot(q-vec2(-.14,.18),q-vec2(-.14,.18))*1.3);
  vec3 bg=vec3(.06667)+vec3(.125)*light;
  float coverage=0.;float edge=0.;
  for(int j=0;j<3;j++){
    float i=float(j), side=i-1.;
    vec2 center=vec2(side*.74*uSpread,-.08-abs(side)*.035*uSpread);
    float scale=1.-abs(side)*.11*min(1.,uSpread);
    vec2 uv=(q-center)/vec2(.88*scale,1.66*scale)+.5;
    float own=shape(uv,i);float front=shape(uv,1.);
    float a=mix(own,front,uMorph);
    float n=noise(uv*42.+i*5.);
    float erosion=smoothstep(uDissolve-.035,uDissolve+.13,n*.64+uv.y*.31+.05);
    float keep=(1.-smoothstep(.95,1.,uDissolve))*erosion;
    a*=keep;
    coverage=max(coverage,a);
    float rim=mix(shape(uv+vec2(.006,0),i),shape(uv+vec2(.006,0),1.),uMorph);
    edge=max(edge,max(0.,rim-a)*keep);
  }
  bg*=1.-coverage*.73;
  bg+=vec3(edge*.045);
  // Seeded spatial grain; no per-frame randomness or flicker.
  bg+=vec3((hash(floor(vUv*vec2(1100,720)))-.5)*.007)*light;
  float margin=smoothstep(0.,.14,vUv.x)*smoothstep(0.,.14,1.-vUv.x)*smoothstep(0.,.12,vUv.y)*smoothstep(0.,.10,1.-vUv.y);
  color=vec4(mix(vec3(.06667),bg,margin),1.);
}
`;
export const clothVertex = `#version 300 es
precision highp float;
in vec2 aPosition;
out vec2 vUv;
out vec3 vNormal;
uniform float uAspect,uBend,uVelocity,uProgress;
vec3 sheet(vec2 uv){
  float freeEdge=pow(1.-uv.y,1.7);
  float fold=.042*sin(uv.x*30.+sin(uv.y*4.)*.8)+.027*sin(uv.x*57.-uv.y*2.4)+.062*sin(uv.x*12.+uv.y*3.);
  float flutter=freeEdge*(uBend*.22*sin(uv.x*8.+uv.y*5.-uProgress*3.)+uVelocity*.009*sin(uv.x*39.+uv.y*15.));
  float x=(uv.x*2.-1.)*uAspect*.96+freeEdge*uBend*.19;
  float y=(uv.y*2.-1.)*.94+freeEdge*uBend*.085*sin(uv.x*6.);
  return vec3(x,y,fold+flutter+freeEdge*uBend*.17);
}
void main(){
  vUv=aPosition;
  vec3 p=sheet(vUv);
  vNormal=normalize(cross(sheet(vUv+vec2(.001,0))-p,sheet(vUv+vec2(0,.001))-p));
  gl_Position=vec4(p.x/uAspect,p.y,p.z*.06,1.+p.z*.12);
}
`;
export const clothFragment = `#version 300 es
precision highp float;
in vec2 vUv;
in vec3 vNormal;
out vec4 color;
uniform float uDissolve;
void main(){
  vec3 n=normalize(vNormal);
  vec3 light=normalize(vec3(-.72,.35,.8));
  float diffuse=max(0.,dot(n,light));
  float sheen=pow(max(0.,dot(reflect(-light,n),vec3(0,0,1))),24.);
  float grazing=pow(1.-abs(n.z),1.8);
  float threads=sin(vUv.x*2900.)*sin(vUv.y*1800.);
  float threadAA=1.-smoothstep(.3,1.5,fwidth(vUv.x)*2900.);
  float hem=smoothstep(0.,.016,vUv.x)*smoothstep(0.,.016,1.-vUv.x)*smoothstep(0.,.018,vUv.y)*smoothstep(0.,.008,1.-vUv.y);
  float sideFade=smoothstep(0.,.08,vUv.x)*smoothstep(0.,.08,1.-vUv.x);
  float alpha=(.055+diffuse*.07+sheen*.24+grazing*.14+threads*.014*threadAA)*hem*sideFade*(1.-uDissolve*.82);
  color=vec4(vec3(.62+diffuse*.23),alpha);
}
`;
