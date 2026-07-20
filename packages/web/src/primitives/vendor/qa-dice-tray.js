/* Questra — <qa-dice-tray>
   The table's one 3D object. Results IN, animation OUT — never the reverse:
   show({dice:['d20','d20'], results:[14,6], keep:0}) tumbles and lands on the
   decided faces in a fixed settle time (settleMs, default 1100ms + 70ms per
   extra die). Properties: material ('bone'|'smoke'|'iron'), soundOn, still
   (reduced motion), settleMs. Methods: show(spec), clear().
   Landing is scripted (decaying two-axis spin that ends exactly on the target
   quaternion), so a cocked or off-tray die cannot happen.

   ── VENDORED from the Claude Design artifact (ADR-0014), byte-for-byte EXCEPT
   the single change below: the CDN `import(THREE_URL)` is replaced with a bare
   `import('three')` so Vite bundles our LOCAL three@0.161.0 (the artifact host's
   CSP — and ours — blocks jsdelivr; offline/supply-chain hygiene). Still lazy:
   the dynamic import means three is code-split and only fetched on first roll.
   Do not hand-edit the rest — re-sync from the artifact if the design changes. */
(function(){
'use strict';
if(window.customElements&&customElements.get('qa-dice-tray'))return;
const TAU=Math.PI*2;
let T3=null,DEFS=null,MAXANISO=4;
const TEX=new Map(),PLANE=new Map();
const MATS={
  bone:{body:0xD8C7A0,rough:.52,metal:.03,alpha:1,ink:'#2E2214',hi:'rgba(250,243,226,.55)',edge:0x6B5B40,edgeA:.35},
  smoke:{body:0x241C11,rough:.16,metal:.08,alpha:.97,ink:'#EFE4C8',hi:'rgba(0,0,0,.5)',edge:0xE6DCC4,edgeA:.16},
  iron:{body:0x8D867B,rough:.46,metal:.82,alpha:1,ink:'#1D1812',hi:'rgba(255,244,224,.38)',edge:0x2C2822,edgeA:.4},
  secret:{body:0x171208,rough:.2,metal:.1,alpha:.97,ink:'#EFE4C8',hi:'rgba(0,0,0,.5)',edge:0xD6965A,edgeA:.3}
};
const FOOT={d4:.62,d6:.72,d8:.6,d10:.62,d12:.7,d20:.78};
const eoc=u=>1-Math.pow(1-u,3);
function bounceY(u){
  if(u<.36){const p=u/.36;return 1-p*p}
  if(u<.64){const p=(u-.36)/.28;return .42*4*p*(1-p)}
  if(u<.84){const p=(u-.64)/.2;return .16*4*p*(1-p)}
  const p=(u-.84)/.16;return .05*4*p*(1-p);
}
function rndAxis(T){return new T.Vector3(Math.random()-.5,Math.random()-.5,Math.random()-.5).normalize()}
function planeQuat(T,up,normal){
  const x=new T.Vector3().crossVectors(up,normal);
  return new T.Quaternion().setFromRotationMatrix(new T.Matrix4().makeBasis(x,up.clone(),normal.clone()));
}
function targetQuat(T,land,heading){
  const up=new T.Vector3(0,1,0);
  const hb=new T.Vector3(Math.sin(heading),0,-Math.cos(heading)); // numeral-up reads upright from the camera
  const MA=new T.Matrix4().makeBasis(land.north.clone(),land.n.clone(),new T.Vector3().crossVectors(land.north,land.n));
  const MB=new T.Matrix4().makeBasis(hb,up,new T.Vector3().crossVectors(hb,up));
  return new T.Quaternion().setFromRotationMatrix(MB.multiply(MA.transpose()));
}
function extractFaces(T,geo){
  const pos=geo.getAttribute('position'),faces=[];
  for(let i=0;i<pos.count;i+=3){
    const a=new T.Vector3().fromBufferAttribute(pos,i),b=new T.Vector3().fromBufferAttribute(pos,i+1),c=new T.Vector3().fromBufferAttribute(pos,i+2);
    const n=new T.Vector3().subVectors(b,a).cross(new T.Vector3().subVectors(c,a)).normalize();
    let f=faces.find(f=>f.n.dot(n)>.995);
    if(!f){f={n,verts:[]};faces.push(f)}
    f.verts.push(a,b,c);
  }
  for(const f of faces){
    const uniq=[];for(const p of f.verts)if(!uniq.some(q=>q.distanceToSquared(p)<1e-8))uniq.push(p);
    const c=new T.Vector3();uniq.forEach(p=>c.add(p));c.multiplyScalar(1/uniq.length);
    f.center=c;f.uniq=uniq;
    f.inr=Math.abs(c.dot(f.n));
    f.size=uniq.reduce((s,p)=>s+p.distanceTo(c),0)/uniq.length;
    const ref=Math.abs(f.n.y)>.9?new T.Vector3(0,0,1):new T.Vector3(0,1,0);
    f.north=ref.addScaledVector(f.n,-ref.dot(f.n)).normalize();
  }
  return faces;
}
function assignValues(faces){
  const n=faces.length,used=new Array(n).fill(false);let lo=1;
  for(let i=0;i<n;i++){
    if(used[i])continue;used[i]=true;faces[i].value=lo;
    for(let k=i+1;k<n;k++){if(!used[k]&&faces[i].n.dot(faces[k].n)<-.995){used[k]=true;faces[k].value=n+1-lo;break}}
    lo++;
  }
}
function d10Geo(T,r){
  const a=TAU/10,h=.10557;
  const eq=[];for(let i=0;i<10;i++)eq.push(new T.Vector3(Math.cos(i*a),Math.sin(i*a),i%2?h:-h));
  const top=new T.Vector3(0,0,1),bot=new T.Vector3(0,0,-1);
  const tris=[];
  for(let m=0;m<10;m+=2){tris.push([top,eq[(m+9)%10],eq[m]],[top,eq[m],eq[(m+1)%10]])}
  for(let m=1;m<10;m+=2){tris.push([bot,eq[(m+9)%10],eq[m]],[bot,eq[m],eq[(m+1)%10]])}
  const pos=[];
  for(const t of tris){
    const nv=new T.Vector3().subVectors(t[1],t[0]).cross(new T.Vector3().subVectors(t[2],t[0]));
    const c=new T.Vector3().add(t[0]).add(t[1]).add(t[2]);
    const o=nv.dot(c)<0?[t[0],t[2],t[1]]:t;
    for(const v of o)pos.push(v.x*r,v.y*r,v.z*r);
  }
  const g=new T.BufferGeometry();
  g.setAttribute('position',new T.Float32BufferAttribute(pos,3));
  g.computeVertexNormals();return g;
}
function buildDefs(T){
  const defs={};
  const face=(type,geo,numK)=>{
    geo=geo.index?geo.toNonIndexed():geo;geo.computeVertexNormals();
    const faces=extractFaces(T,geo);assignValues(faces);
    const numerals=[],lands=[];
    for(const f of faces){
      numerals.push({value:f.value,pos:f.center.clone().addScaledVector(f.n,.02),quat:planeQuat(T,f.north,f.n),size:f.size*numK});
      lands.push({value:f.value,n:f.n,north:f.north,restH:f.inr});
    }
    defs[type]={geo,edges:new T.EdgesGeometry(geo,12),numerals,lands};
  };
  face('d6',new T.BoxGeometry(1.02,1.02,1.02),1.02);
  face('d8',new T.OctahedronGeometry(.78),.8);
  face('d10',d10Geo(T,.76),.8);
  face('d12',new T.DodecahedronGeometry(.76),.74);
  face('d20',new T.IcosahedronGeometry(.82),.95);
  {// d4 — numbers live at the corners; the result is the vertex pointing up
    let geo=new T.TetrahedronGeometry(.9).toNonIndexed();geo.computeVertexNormals();
    const faces=extractFaces(T,geo);
    const pos=geo.getAttribute('position'),vs=[];
    for(let i=0;i<pos.count;i++){const p=new T.Vector3().fromBufferAttribute(pos,i);if(!vs.some(q=>q.distanceToSquared(p)<1e-8))vs.push(p)}
    const numerals=[],lands=[];
    vs.forEach((v,vi)=>{
      const n=v.clone().normalize();
      const ref=Math.abs(n.y)>.9?new T.Vector3(0,0,1):new T.Vector3(0,1,0);
      lands.push({value:vi+1,n,north:ref.addScaledVector(n,-ref.dot(n)).normalize(),restH:faces[0].inr});
    });
    for(const f of faces)for(const corner of f.uniq){
      const vi=vs.findIndex(q=>q.distanceToSquared(corner)<1e-8);
      const up=corner.clone().sub(f.center).normalize();
      numerals.push({value:vi+1,pos:f.center.clone().lerp(corner,.5).addScaledVector(f.n,.02),quat:planeQuat(T,up,f.n),size:f.size*.42});
    }
    defs.d4={geo,edges:new T.EdgesGeometry(geo,12),numerals,lands};
  }
  return defs;
}
function planeGeo(T,s){
  const k=s.toFixed(3);let g=PLANE.get(k);
  if(!g){g=new T.PlaneGeometry(s,s);PLANE.set(k,g)}
  return g;
}

class QaDiceTray extends HTMLElement{
  constructor(){super();
    this._dice=[];this._tweens=[];this._pending=null;this._matName='bone';
    this.soundOn=true;this.still=false;this.settleMs=1100;
  }
  connectedCallback(){
    if(this._boot)return;this._boot=true;
    this.style.display='block';this.style.width='100%';this.style.height='100%';
    if(getComputedStyle(this).position==='static')this.style.position='relative';
    this._start().catch(e=>{console.warn('qa-dice-tray: 3D unavailable, using flat fallback.',e);this._fail=true;
      if(this._pending){const p=this._pending;this._pending=null;this.show(p)}});
  }
  disconnectedCallback(){cancelAnimationFrame(this._raf);clearTimeout(this._st)}
  set material(v){if(v&&MATS[v]&&v!==this._matName){this._matName=v;this._applyMaterials()}}
  get material(){return this._matName}
  async _start(){
    const THREE=await import('three');T3=THREE;
    try{await Promise.race([document.fonts.ready,new Promise(r=>setTimeout(r,1600))])}catch(e){}
    const renderer=new THREE.WebGLRenderer({antialias:true,alpha:true});
    renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;
    renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.15;
    MAXANISO=Math.min(8,renderer.capabilities.getMaxAnisotropy()||4);
    renderer.domElement.style.cssText='position:absolute;inset:0;width:100%;height:100%';
    this.appendChild(renderer.domElement);
    const scene=new THREE.Scene();
    const cam=new THREE.PerspectiveCamera(30,2,.1,60);
    cam.position.set(0,8.6,5.4);cam.lookAt(0,0,-.2);
    scene.add(new THREE.HemisphereLight(0xCDB890,0x090705,.55));
    const key=new THREE.PointLight(0xFFC98A,40,0,2);key.position.set(2.4,4.6,2.2);scene.add(key);
    const fill=new THREE.DirectionalLight(0x8FA3B8,.4);fill.position.set(-3,2.5,-2);scene.add(fill);
    const flare=new THREE.PointLight(0xC05B41,0,7,2);flare.position.set(0,1.2,0);scene.add(flare);
    Object.assign(this,{renderer,scene,cam,flare});
    if(!DEFS)DEFS=buildDefs(THREE);
    // soft blob shadow texture
    const sc=document.createElement('canvas');sc.width=sc.height=128;
    const sg=sc.getContext('2d'),grad=sg.createRadialGradient(64,64,4,64,64,62);
    grad.addColorStop(0,'rgba(0,0,0,.85)');grad.addColorStop(.55,'rgba(0,0,0,.4)');grad.addColorStop(1,'rgba(0,0,0,0)');
    sg.fillStyle=grad;sg.fillRect(0,0,128,128);
    this._shadowTex=new THREE.CanvasTexture(sc);
    this._shadowGeo=new THREE.PlaneGeometry(1.9,1.9);
    this._ro=new ResizeObserver(()=>this._resize());this._ro.observe(this);this._resize();
    this._ready=true;this._dirty=true;
    const loop=()=>{this._raf=requestAnimationFrame(loop);this._tick(performance.now())};loop();
    if(this._pending){const p=this._pending;this._pending=null;this.show(p)}
    this.dispatchEvent(new CustomEvent('ready'));
  }
  _resize(){
    const w=this.clientWidth||600,h=this.clientHeight||300;
    this.renderer.setSize(w,h,false);this.cam.aspect=w/h;
    this.cam.zoom=Math.max(.6,Math.min(1.12,(w/h)/1.9));
    this.cam.updateProjectionMatrix();this._dirty=true;
  }
  /* ---- expansion: d100 becomes tens + ones; d10 shows 0-9 ---- */
  _items(spec){
    const items=[];
    spec.dice.forEach((d,idx)=>{
      const r=spec.results[idx];
      if(d==='d100'){
        const t=Math.floor(r/10)%10,o=r%10;
        items.push({type:'d10',land:t===0?10:t,labelFn:v=>v===10?'00':String(v*10),origIndex:idx,big:1.07,secret:spec.secret});
        items.push({type:'d10',land:o===0?10:o,labelFn:v=>v===10?'0':String(v),origIndex:idx,secret:spec.secret});
      }else if(d==='d10'){
        items.push({type:'d10',land:(r===0||r===10)?10:r,labelFn:v=>v===10?'0':String(v),origIndex:idx,secret:spec.secret});
      }else{
        const n=+d.slice(1);
        items.push({type:DEFS&&DEFS[d]?d:'d6',land:Math.max(1,Math.min(n,r)),origIndex:idx,secret:spec.secret});
      }
    });
    return items;
  }
  _numTex(label,m){
    const key=label+'|'+m.ink;let t=TEX.get(key);if(t)return t;
    const c=document.createElement('canvas');c.width=c.height=160;
    const g=c.getContext('2d');
    const fs=label.length>1?84:112;
    g.font='600 '+fs+'px "EB Garamond",Georgia,serif';
    g.textAlign='center';g.textBaseline='alphabetic';
    const y=80+fs*.34;
    g.fillStyle=m.hi;g.fillText(label,80,y+4);
    g.fillStyle=m.ink;g.fillText(label,80,y);
    if(label==='6'||label==='9'){g.fillRect(80-fs*.2,y+fs*.13,fs*.4,6)}
    t=new T3.CanvasTexture(c);t.anisotropy=MAXANISO;t.colorSpace=T3.SRGBColorSpace;
    TEX.set(key,t);return t;
  }
  _makeDie(it){
    const T=T3,def=DEFS[it.type],m=it.secret?MATS.secret:MATS[this._matName];
    const group=new T.Group();
    const body=new T.Mesh(def.geo,new T.MeshStandardMaterial({color:m.body,roughness:m.rough,metalness:m.metal,flatShading:true,transparent:true,opacity:m.alpha}));
    group.add(body);
    const edges=new T.LineSegments(def.edges,new T.LineBasicMaterial({color:m.edge,transparent:true,opacity:m.edgeA}));
    group.add(edges);
    const numMats=[];
    if(!it.secret){
      for(const np of def.numerals){
        const label=it.labelFn?it.labelFn(np.value):String(np.value);
        const mt=new T.MeshBasicMaterial({map:this._numTex(label,m),transparent:true,depthWrite:false});
        mt._label=label;
        const p=new T.Mesh(planeGeo(T,np.size),mt);
        p.position.copy(np.pos);p.quaternion.copy(np.quat);
        group.add(p);numMats.push(mt);
      }
    }
    const shadow=new T.Mesh(this._shadowGeo,new T.MeshBasicMaterial({map:this._shadowTex,transparent:true,opacity:.5,depthWrite:false}));
    shadow.rotation.x=-Math.PI/2;shadow.position.y=.012;shadow.renderOrder=-1;
    this.scene.add(shadow);this.scene.add(group);
    return {group,body,edges,numMats,shadow};
  }
  _parts(d){
    const parts=[{m:d.body.material,o:d.body.material.opacity},{m:d.edges.material,o:d.edges.material.opacity},{m:d.shadow.material,o:.5}];
    d.numMats.forEach(nm=>parts.push({m:nm,o:1}));
    return parts;
  }
  show(spec){
    if(this._fail){this._flat(spec);return}
    if(!this._ready){this._pending=spec;return}
    this._disposeNow();
    const T=T3,items=this._items(spec),n=items.length,still=this.still;
    const sp=Math.max(...items.map(i=>FOOT[i.type]))*2.2;
    const cols=n<=4?n:(n<=8?4:5),rows=Math.ceil(n/cols);
    const now=performance.now();
    items.forEach((it,i)=>{
      const row=Math.floor(i/cols),inRow=Math.min(cols,n-row*cols),col=i%cols;
      const x=(col-(inRow-1)/2)*sp+(Math.random()-.5)*.14;
      const z=(row-(rows-1)/2)*sp*.92+(Math.random()-.5)*.12;
      const d=this._makeDie(it);
      const def=DEFS[it.type];
      const land=def.lands.find(l=>l.value===it.land)||def.lands[0];
      const qT=targetQuat(T,land,(Math.random()-.5)*.6);
      const sc=it.big||1;d.group.scale.setScalar(sc);
      const restH=land.restH*sc+.02;
      if(still){
        d.group.position.set(x,restH,z);d.group.quaternion.copy(qT);
        d.shadow.position.set(x,.012,z);
        const parts=this._parts(d);
        parts.forEach(p=>p.m.opacity=0);
        this._tw(240,k=>{parts.forEach(p=>p.m.opacity=p.o*k)},i*40);
        if(i===n-1)setTimeout(()=>this._thock(.22),260+i*40);
      }else{
        d.group.visible=false;
        d.anim={start:now+i*70,dur:this.settleMs,restH,qT,
          x0:x+2.5+Math.random()*.7,z0:z+1.5+Math.random()*.5,x1:x,z1:z,
          h0:1.5+Math.random()*.5,last:0,
          ax1:rndAxis(T),th1:(2.2+Math.random()*1.4)*TAU*(Math.random()<.5?-1:1),
          ax2:rndAxis(T),th2:(1.1+Math.random()*.8)*TAU*(Math.random()<.5?-1:1)};
      }
      d.it=it;d.slot={x,z,restH};
      this._dice.push(d);
    });
    clearTimeout(this._st);
    const total=still?300+n*40:this.settleMs+(n-1)*70+40;
    this._st=setTimeout(()=>this._settle(spec),total);
    this._dirty=true;
  }
  _settle(spec){
    const T=T3,keep=spec.keep!=null?spec.keep:null;
    let critDie=null;
    this._dice.forEach(d=>{
      if(d.it.secret)return;
      const dropped=keep!=null&&d.it.origIndex!==keep;
      const isCrit=d.it.type==='d20'&&d.it.land===20&&!dropped;
      const isFumble=d.it.type==='d20'&&d.it.land===1&&!dropped;
      if(dropped){// swept aside: goes dark, slides out of the way — never deleted
        const c0=d.body.material.color.clone(),c1=c0.clone().multiplyScalar(.42);
        const x0=d.group.position.x,dir=Math.sign(x0)||1;
        const e0=d.edges.material.opacity;
        this._tw(420,k=>{
          d.body.material.color.lerpColors(c0,c1,k);
          d.numMats.forEach(nm=>nm.opacity=1-k*.68);
          d.edges.material.opacity=e0*(1-k*.6);
          d.group.position.x=x0+dir*.55*k;
          d.shadow.position.x=d.group.position.x;
          d.shadow.material.opacity=.5-k*.22;
        },380);
      }else if(isCrit){// the ember lives inside the die
        critDie=d;
        d.body.material.emissive=new T.Color(0xC05B41);
        this._crit=d;this._swell();
      }else if(isFumble){// the die goes cold
        const c0=d.body.material.color.clone(),c1=new T.Color(0x59554C);
        const e0=d.edges.material.opacity;
        this._tw(650,k=>{d.body.material.color.lerpColors(c0,c1,k);d.edges.material.opacity=e0*(1-k*.5)});
      }else if(keep!=null&&d.it.origIndex===keep){// the kept die takes one warm breath
        d.body.material.emissive=new T.Color(0xC05B41);
        this._tw(800,k=>{d.body.material.emissiveIntensity=k<.35?(k/.35)*.4:.4*(1-(k-.35)/.65)});
      }
    });
    if(critDie)this.flare.position.set(critDie.group.position.x,1.1,critDie.group.position.z);
    this._dirty=true;
    this.dispatchEvent(new CustomEvent('dice-settled'));
  }
  clear(){
    if(this._fail){if(this._flatEl){this._flatEl.remove();this._flatEl=null}return}
    if(!this._dice.length)return;
    clearTimeout(this._st);
    const list=this._dice;this._dice=[];this._crit=null;
    const T=T3,fl=this.flare;
    const f0=fl.intensity;
    const parts=[];list.forEach(d=>{d._y0=d.group.position.y;parts.push({d,ps:this._parts(d)})});
    this._tw(280,k=>{
      fl.intensity=f0*(1-k);
      parts.forEach(({d,ps})=>{ps.forEach(p=>p.m.opacity=p.o*(1-k));d.group.position.y=d._y0-k*.22});
    });
    setTimeout(()=>this._dispose(list),320);
  }
  _disposeNow(){
    clearTimeout(this._st);this._crit=null;if(this.flare)this.flare.intensity=0;
    if(this._dice.length){this._dispose(this._dice);this._dice=[]}
    if(this._flatEl){this._flatEl.remove();this._flatEl=null}
    this._tweens=[];
  }
  _dispose(list){
    list.forEach(d=>{
      this.scene.remove(d.group);this.scene.remove(d.shadow);
      d.body.material.dispose();d.edges.material.dispose();
      d.numMats.forEach(nm=>nm.dispose());d.shadow.material.dispose();
    });
    this._dirty=true;
  }
  _applyMaterials(){
    if(!this._ready)return;
    this._dice.forEach(d=>{
      if(d.it&&d.it.secret)return;
      const m=MATS[this._matName];
      d.body.material.color.set(m.body);d.body.material.roughness=m.rough;
      d.body.material.metalness=m.metal;d.body.material.opacity=m.alpha;
      d.edges.material.color.set(m.edge);d.edges.material.opacity=m.edgeA;
      d.numMats.forEach(nm=>{nm.map=this._numTex(nm._label,m)});
    });
    this._dirty=true;
  }
  _tw(dur,fn,delay){this._tweens.push({t0:performance.now()+(delay||0),dur,fn})}
  _tick(now){
    if(!this._ready)return;
    let active=false;
    const T=T3,q1=new T.Quaternion(),q2=new T.Quaternion();
    for(const d of this._dice){
      const a=d.anim;if(!a)continue;
      if(now<a.start){d.group.visible=false;active=true;continue}
      let u=(now-a.start)/a.dur;
      if(u>=1){u=1;if(!a.landed){a.landed=true;this._thock(.42)}}
      else active=true;
      d.group.visible=true;
      const e=1-Math.pow(1-u,2.1);
      const x=a.x0+(a.x1-a.x0)*e,z=a.z0+(a.z1-a.z0)*e;
      d.group.position.set(x,a.restH+bounceY(u)*a.h0,z);
      q1.setFromAxisAngle(a.ax1,a.th1*(1-eoc(u)));
      q2.setFromAxisAngle(a.ax2,a.th2*(1-(1-Math.pow(1-u,4))));
      d.group.quaternion.copy(a.qT).multiply(q1).multiply(q2);
      const lift=d.group.position.y-a.restH;
      d.shadow.position.set(x,.012,z);
      d.shadow.material.opacity=.5*Math.max(.14,1-lift*.5);
      d.shadow.scale.setScalar(1+lift*.4);
      for(const[b,v]of[[.36,.4],[.64,.24],[.84,.13]])if(a.last<b&&u>=b)this._click(v);
      a.last=u;
      if(u>=1)d.anim=null;
    }
    if(this._tweens.length){
      this._tweens=this._tweens.filter(tw=>{
        let k=(now-tw.t0)/tw.dur;
        if(k<0){active=true;return true}
        k=Math.min(1,k);tw.fn(1-Math.pow(1-k,3));
        if(k>=1)return false;
        active=true;return true;
      });
      this._dirty=true;
    }
    if(this._crit){// sustained inner ember while a natural 20 sits on the table
      this._crit.body.material.emissiveIntensity=.42+.2*Math.sin(now/240);
      this.flare.intensity=4.5+2*Math.sin(now/240);
      active=true;
    }
    if(active||this._dirty){this.renderer.render(this.scene,this.cam);this._dirty=false}
  }
  /* ---- flat fallback: no WebGL → bone tiles, same information ---- */
  _flat(spec){
    const items=this._itemsFlat(spec);
    const keep=spec.keep!=null?spec.keep:null;
    const CLIP={d4:'polygon(50% 4%,96% 92%,4% 92%)',d6:'none',d8:'polygon(50% 0,100% 50%,50% 100%,0 50%)',d10:'polygon(50% 0,95% 38%,78% 100%,22% 100%,5% 38%)',d12:'polygon(50% 0,95% 38%,78% 100%,22% 100%,5% 38%)',d20:'polygon(25% 6%,75% 6%,100% 50%,75% 94%,25% 94%,0 50%)'};
    const wrap=document.createElement('div');
    wrap.style.cssText='position:absolute;inset:0;display:flex;align-items:center;justify-content:center;gap:12px;flex-wrap:wrap;padding:12px';
    items.forEach(it=>{
      const el=document.createElement('div');
      const dropped=keep!=null&&it.origIndex!==keep;
      el.style.cssText='width:56px;height:56px;display:flex;align-items:center;justify-content:center;background:linear-gradient(160deg,#E0D2AC,#C7B68D);clip-path:'+CLIP[it.type]+';border-radius:'+(it.type==='d6'?'9px':'0')+';font:600 21px "EB Garamond",Georgia,serif;color:#2E2214;'+(dropped?'opacity:.4;':'')+(spec.secret?'background:#171208;color:transparent;border:1px solid rgba(214,150,90,.4);':'');
      el.textContent=it.label;
      wrap.appendChild(el);
    });
    if(this._flatEl)this._flatEl.remove();
    this._flatEl=wrap;this.appendChild(wrap);
  }
  _itemsFlat(spec){
    const out=[];
    spec.dice.forEach((d,idx)=>{
      const r=spec.results[idx];
      if(d==='d100'){const t=Math.floor(r/10)%10,o=r%10;
        out.push({type:'d10',label:t===0?'00':String(t*10),origIndex:idx});
        out.push({type:'d10',label:String(o),origIndex:idx});
      }else out.push({type:d,label:String(r),origIndex:idx});
    });
    return out;
  }
  /* ---- sound: felt-on-wood clicks that follow the bounces, one knock to land.
     Pitch drifts every roll so the hundredth sounds like the first. ---- */
  _ac(){
    if(!this.soundOn)return null;
    if(!this._audio){try{this._audio=new(window.AudioContext||window.webkitAudioContext)()}catch(e){return null}}
    if(this._audio.state==='suspended')this._audio.resume().catch(()=>{});
    return this._audio;
  }
  _noise(ac){
    if(!this._nbuf){
      const b=ac.createBuffer(1,ac.sampleRate*.1,ac.sampleRate),d=b.getChannelData(0);
      for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;
      this._nbuf=b;
    }
    return this._nbuf;
  }
  _click(vol){
    const ac=this._ac();if(!ac)return;
    const t=ac.currentTime,dur=.04+Math.random()*.02;
    const src=ac.createBufferSource();src.buffer=this._noise(ac);
    const bp=ac.createBiquadFilter();bp.type='bandpass';
    bp.frequency.value=1700+Math.random()*900;bp.Q.value=1.6;
    const g=ac.createGain();
    g.gain.setValueAtTime(vol*.5,t);g.gain.exponentialRampToValueAtTime(.001,t+dur);
    src.connect(bp);bp.connect(g);g.connect(ac.destination);
    src.start(t);src.stop(t+dur+.02);
  }
  _thock(vol){
    const ac=this._ac();if(!ac)return;
    const t=ac.currentTime;
    const o=ac.createOscillator();o.type='sine';
    o.frequency.setValueAtTime(150+Math.random()*20,t);
    o.frequency.exponentialRampToValueAtTime(66,t+.1);
    const g=ac.createGain();
    g.gain.setValueAtTime(vol*.6,t);g.gain.exponentialRampToValueAtTime(.001,t+.13);
    o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+.15);
    this._click(vol*.5);
  }
  _swell(){// one warm swell, crits only
    const ac=this._ac();if(!ac)return;
    const t=ac.currentTime;
    [196,294].forEach((f,i)=>{
      const o=ac.createOscillator();o.type='sine';o.frequency.value=f;
      const g=ac.createGain();
      g.gain.setValueAtTime(.0001,t);
      g.gain.exponentialRampToValueAtTime(.07/(i+1),t+.28);
      g.gain.exponentialRampToValueAtTime(.001,t+.9);
      o.connect(g);g.connect(ac.destination);o.start(t);o.stop(t+1);
    });
  }
}
customElements.define('qa-dice-tray',QaDiceTray);
})();
