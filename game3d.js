import * as THREE from './assets/vendor/three.module.js';

const canvas = document.querySelector('#game');
const start = document.querySelector('#start');
const scoreEl = document.querySelector('#score');
const healthEl = document.querySelector('#health');
const debugEl = document.querySelector('#debug');
const toast = document.querySelector('#toast');
const cardTitle=document.querySelector('.card h2'),cardText=document.querySelector('.card p'),playButton=document.querySelector('#play');
let W = 390, H = 844; const R = 10.5;
let audioCtx=null,audioMaster=null,masterLevel=Math.max(0,Math.min(1,Number(localStorage.getItem('bpVolume')??.65))),soundEnabled=localStorage.getItem('bpSound')!=='off'&&masterLevel>0,lastStepBeat=-1,soundCount=0;
const soundStatus=document.querySelector('#sound-status');
function showSoundStatus(text){if(!soundStatus)return;soundStatus.textContent=text;soundStatus.classList.add('visible');clearTimeout(showSoundStatus.timer);showSoundStatus.timer=setTimeout(()=>soundStatus.classList.remove('visible'),1700);}
async function ensureAudioContext(){if(!soundEnabled||masterLevel<=0){document.documentElement.dataset.audio='off';return false;}if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();audioMaster=audioCtx.createGain();audioMaster.gain.value=masterLevel*3.2;const limiter=audioCtx.createDynamicsCompressor();limiter.threshold.value=-10;limiter.knee.value=8;limiter.ratio.value=8;limiter.attack.value=.003;limiter.release.value=.16;audioMaster.connect(limiter).connect(audioCtx.destination);}else audioMaster.gain.setTargetAtTime(masterLevel*3.2,audioCtx.currentTime,.025);if(audioCtx.state==='suspended')await audioCtx.resume();document.documentElement.dataset.audio=audioCtx.state;return audioCtx.state==='running';}
async function startAudio(){const live=await ensureAudioContext();if(!live){showSoundStatus('🔇 Sound off');return;}playCue('start');showSoundStatus(`🔊 Sound ${Math.round(masterLevel*100)}%`);}
function tone(freq,duration=.12,type='sine',volume=.18,slide=1){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(audioMaster);o.start(now);o.stop(now+duration+.02);}
function noise(duration=.1,volume=.08,cutoff=900){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const frames=Math.max(1,Math.floor(audioCtx.sampleRate*duration)),buffer=audioCtx.createBuffer(1,frames,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;g.gain.value=volume;src.connect(filter).connect(g).connect(audioMaster);src.start();}
function playCue(name){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const root=document.documentElement,trail=(root.dataset.soundTrail||'').split(',').filter(Boolean);trail.push(name);root.dataset.soundTrail=trail.slice(-16).join(',');root.dataset.lastSound=name;root.dataset.soundCount=String(++soundCount);if(name==='start')tone(520,.1,'sine',.18,1.3);else if(name==='catch'){tone(660,.11,'sine',.16,1.35);setTimeout(()=>tone(880,.13,'sine',.13,1.15),65);}else if(name==='fall'){noise(.32,.035,1500);tone(360,.28,'sine',.045,.48);}else if(name==='land'){noise(.11,.085,650);tone(105,.12,'triangle',.12,.72);}else if(name==='hit'){tone(240,.11,'square',.16,.68);setTimeout(()=>tone(145,.19,'triangle',.17,.55),55);noise(.12,.09,1050);}else if(name==='bonk'){tone(280,.18,'sine',.17,.42);setTimeout(()=>tone(520,.1,'triangle',.08,.72),45);}else if(name==='trip'){noise(.14,.08,500);tone(125,.22,'triangle',.12,.58);}else if(name==='bees'){tone(185,.32,'sawtooth',.045,1.16);setTimeout(()=>tone(224,.28,'sawtooth',.04,.86),80);}else if(name==='sting'){tone(740,.07,'square',.11,.55);setTimeout(()=>tone(310,.13,'triangle',.12,.62),45);}else if(name==='boom'){noise(.3,.12,420);tone(82,.28,'sawtooth',.1,.42);}else if(name==='step'){noise(.035,.026,360);tone(78,.035,'sine',.032,.8);}}
addEventListener('bp-sound',e=>{soundEnabled=!!e.detail;localStorage.setItem('bpSound',soundEnabled?'on':'off');if(soundEnabled)startAudio();else{document.documentElement.dataset.audio='off';showSoundStatus('🔇 Sound off');if(audioCtx)audioCtx.suspend();}});
addEventListener('bp-volume',e=>{masterLevel=Math.max(0,Math.min(1,Number(e.detail)));localStorage.setItem('bpVolume',String(masterLevel));soundEnabled=masterLevel>0;localStorage.setItem('bpSound',soundEnabled?'on':'off');if(audioMaster&&audioCtx)audioMaster.gain.setTargetAtTime(masterLevel*3.2,audioCtx.currentTime,.025);if(soundEnabled)ensureAudioContext();else{document.documentElement.dataset.audio='off';showSoundStatus('🔇 Sound off');if(audioCtx)audioCtx.suspend();}});

const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W,H,false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.28;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x78aebf, .019);
const camera = new THREE.PerspectiveCamera(38, W/H, .1, 120);
// Close gameplay framing: the world remains a complete sphere, but the viewport
// concentrates on roughly one quarter of its surface around the camera-facing center.
camera.position.set(0,.55,11.25);
const CAMERA_LOOK = new THREE.Vector3(0,25.0,0);
camera.lookAt(CAMERA_LOOK);
const CLOSE_CAMERA_POSITION=camera.position.clone();
let cameraZoom=0;
// Compose the grounded gameplay target one quarter up from the bottom,
// leaving the upper three quarters available for sky-item telegraphing.
camera.updateProjectionMatrix();
camera.projectionMatrix.elements[9]=.5;
camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
const centerRay = CAMERA_LOOK.clone().sub(camera.position).normalize();
const rayDot = camera.position.dot(centerRay);
const centerHitDistance = -rayDot-Math.sqrt(rayDot*rayDot-(camera.position.lengthSq()-R*R));
const CAMERA_CENTER_NORMAL = camera.position.clone().addScaledVector(centerRay,centerHitDistance).normalize();
// Place the automatic chase point slightly lower on the visible ground while
// leaving the camera, horizon, and three-quarter-sky composition unchanged.
CAMERA_CENTER_NORMAL.applyAxisAngle(new THREE.Vector3(1,0,0),.025).normalize();
const CAMERA_ZOOM_FOCUS=CAMERA_CENTER_NORMAL.clone().multiplyScalar(R);
const CAMERA_ZOOM_DIRECTION=CLOSE_CAMERA_POSITION.clone().sub(CAMERA_ZOOM_FOCUS).normalize();
const OVERVIEW_CAMERA_POSITION=CAMERA_ZOOM_FOCUS.clone().addScaledVector(CAMERA_ZOOM_DIRECTION,58);
function applyCameraZoom(){
  const blend=THREE.MathUtils.smoothstep(cameraZoom,0,1);
  camera.position.lerpVectors(CLOSE_CAMERA_POSITION,OVERVIEW_CAMERA_POSITION,blend);
  camera.lookAt(CAMERA_ZOOM_FOCUS);
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[9]=.5;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  scene.fog.density=THREE.MathUtils.lerp(.019,.0038,blend);
  document.documentElement.dataset.zoom=(cameraZoom*100).toFixed(0);
}
function resizeGame(){
  const box=canvas.getBoundingClientRect();W=Math.max(1,Math.round(box.width));H=Math.max(1,Math.round(box.height));
  renderer.setSize(W,H,false);camera.aspect=W/H;camera.fov=camera.aspect<.7?52:38;applyCameraZoom();
}
resizeGame();addEventListener('resize',resizeGame);

scene.add(new THREE.HemisphereLight(0xb9dcff,0x102715,1.65));
const sun = new THREE.DirectionalLight(0xffd993,5.4);
sun.position.set(-5,8,9); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-20; sun.shadow.camera.right=20;
sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20;sun.shadow.bias=-.00015;sun.shadow.normalBias=.035; scene.add(sun);
const rim = new THREE.DirectionalLight(0x72bfff,1.55); rim.position.set(7,3,-6); scene.add(rim);

const world = new THREE.Group(); scene.add(world);
function makeGroundTexture(){
  const c=document.createElement('canvas');c.width=c.height=1024;const q=c.getContext('2d');
  const grad=q.createLinearGradient(0,0,1024,1024);grad.addColorStop(0,'#68ad35');grad.addColorStop(.42,'#3f8c29');grad.addColorStop(1,'#1d5523');q.fillStyle=grad;q.fillRect(0,0,1024,1024);
  let seed=7391;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<90;i++){
    const x=rand()*1024,y=rand()*1024,rx=18+rand()*75,ry=8+rand()*34;q.globalAlpha=.045+rand()*.1;q.fillStyle=rand()>.55?'#b7d95a':'#092f1b';q.beginPath();q.ellipse(x,y,rx,ry,rand()*Math.PI,0,Math.PI*2);q.fill();
  }
  for(let i=0;i<6200;i++){
    const x=rand()*1024,y=rand()*1024,r=.5+rand()*4.2;
    q.globalAlpha=.1+rand()*.3;q.fillStyle=rand()>.48?'#9dcc4e':'#123c20';q.beginPath();q.arc(x,y,r,0,Math.PI*2);q.fill();
  }
  q.lineWidth=1;
  for(let i=0;i<3600;i++){
    const x=rand()*1024,y=rand()*1024,h=2+rand()*9;q.globalAlpha=.12+rand()*.28;q.strokeStyle=rand()>.5?'#c1df67':'#123b1c';q.beginPath();q.moveTo(x,y);q.lineTo(x+(rand()-.5)*4,y-h);q.stroke();
  }
  q.globalAlpha=1;
  const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(10,6);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;
}
const groundTexture=new THREE.TextureLoader().load('assets/jungle-ground-v2.png');
groundTexture.colorSpace=THREE.SRGBColorSpace;groundTexture.wrapS=groundTexture.wrapT=THREE.RepeatWrapping;groundTexture.repeat.set(8,5);groundTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();
const globeMat = new THREE.MeshPhysicalMaterial({color:0xffffff,map:groundTexture,bumpMap:groundTexture,bumpScale:.032,roughness:.88,metalness:0,clearcoat:.06,clearcoatRoughness:.82});
const globe = new THREE.Mesh(new THREE.SphereGeometry(R,96,64),globeMat);
globe.receiveShadow=true; world.add(globe);
const atmosphere = new THREE.Mesh(new THREE.SphereGeometry(R*1.016,64,40),new THREE.MeshBasicMaterial({color:0x9de7c5,transparent:true,opacity:.105,side:THREE.BackSide,blending:THREE.AdditiveBlending}));
world.add(atmosphere);

function makeBarkTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#7b4527';q.fillRect(0,0,256,256);
  let s=1927;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<150;i++){const x=r()*256,w=1+r()*5;q.globalAlpha=.15+r()*.3;q.fillStyle=r()>.5?'#2f1a13':'#bd7540';q.fillRect(x,0,w,256);}
  for(let i=0;i<90;i++){q.globalAlpha=.12;q.strokeStyle='#e19a59';q.beginPath();q.moveTo(r()*256,r()*256);q.lineTo(r()*256,r()*256);q.stroke();}
  q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,5);return t;
}
function makeLeafTexture(light=false){
  const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle=light?'#55a93d':'#24763a';q.fillRect(0,0,256,256);
  let s=light?811:449;const r=()=>((s=(s*1103515245+12345)>>>0)/4294967296);
  for(let i=0;i<900;i++){q.globalAlpha=.1+r()*.28;q.fillStyle=r()>.52?(light?'#a4d85e':'#50a747'):'#123e29';q.beginPath();q.ellipse(r()*256,r()*256,1+r()*6,1+r()*3,r()*Math.PI,0,Math.PI*2);q.fill();}
  q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,3);return t;
}
function makeRockTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#666b64';q.fillRect(0,0,256,256);
  let s=5317;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<1100;i++){const v=55+Math.floor(r()*105);q.globalAlpha=.08+r()*.24;q.fillStyle=`rgb(${v},${v+Math.floor(r()*9)},${v-4})`;q.beginPath();q.arc(r()*256,r()*256,.5+r()*5,0,Math.PI*2);q.fill();}
  q.lineWidth=.7;for(let i=0;i<85;i++){q.globalAlpha=.12+r()*.18;q.strokeStyle='#2f3532';q.beginPath();const x=r()*256,y=r()*256;q.moveTo(x,y);q.lineTo(x+(r()-.5)*35,y+(r()-.5)*18);q.stroke();}
  q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2.5,2.5);return t;
}
function makeDirtTexture(){
  const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#76502c';q.fillRect(0,0,256,256);
  let s=9923;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);
  for(let i=0;i<1200;i++){q.globalAlpha=.08+r()*.28;q.fillStyle=r()>.55?'#bd8550':'#38281d';q.beginPath();q.ellipse(r()*256,r()*256,.5+r()*4,.4+r()*2,r()*Math.PI,0,Math.PI*2);q.fill();}
  q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(2,2);return t;
}
function loadSurfaceTexture(path,repeatX=2,repeatY=2){const t=new THREE.TextureLoader().load(path);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(repeatX,repeatY);t.anisotropy=renderer.capabilities.getMaxAnisotropy();return t;}
const barkTexture=loadSurfaceTexture('assets/jungle-bark-v2.png',2,5),leafTexture=loadSurfaceTexture('assets/jungle-foliage-v2.png',3,3),leafTexture2=leafTexture.clone(),rockTexture=loadSurfaceTexture('assets/jungle-rock-v2.png',2.5,2.5),dirtTexture=loadSurfaceTexture('assets/jungle-dirt-v2.png',2,2);leafTexture2.needsUpdate=true;
const brown = new THREE.MeshPhysicalMaterial({color:0xffe2bd,map:barkTexture,bumpMap:barkTexture,bumpScale:.045,roughness:.9,clearcoat:.04,clearcoatRoughness:.85});
const bark = new THREE.MeshPhysicalMaterial({color:0xffddb0,map:barkTexture,bumpMap:barkTexture,bumpScale:.065,roughness:.94,clearcoat:.025,clearcoatRoughness:.9});
const leaf = new THREE.MeshPhysicalMaterial({color:0xf2ffe8,map:leafTexture,bumpMap:leafTexture,bumpScale:.026,roughness:.76,clearcoat:.12,clearcoatRoughness:.7});
const leaf2 = new THREE.MeshPhysicalMaterial({color:0xf7ffe8,map:leafTexture2,bumpMap:leafTexture2,bumpScale:.022,roughness:.72,clearcoat:.14,clearcoatRoughness:.66});
const rockMat = new THREE.MeshPhysicalMaterial({color:0xe7dfcb,map:rockTexture,bumpMap:rockTexture,bumpScale:.075,roughness:.93,flatShading:true,clearcoat:.035,clearcoatRoughness:.9});
const moss = new THREE.MeshStandardMaterial({color:0x719a45,map:leafTexture2,bumpMap:leafTexture2,bumpScale:.025,roughness:1});
const pathMat = new THREE.MeshStandardMaterial({color:0xffdfb5,map:dirtTexture,bumpMap:dirtTexture,bumpScale:.035,roughness:.98,transparent:true,opacity:.94});
const props=[];
const MAX_LANDED_PROPS=40;
const landedProps=[];
function addLandedProp(entry){props.push(entry);landedProps.push(entry);if(landedProps.length>MAX_LANDED_PROPS){const old=landedProps.shift();const idx=props.indexOf(old);if(idx>=0)props.splice(idx,1);world.remove(old.group);old.group.traverse(m=>{if(m.isMesh)m.geometry&&m.geometry.dispose();});}}
const UP = new THREE.Vector3(0,1,0);
const tmp = new THREE.Vector3();

function normalAt(lat,lon){ return new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)).normalize(); }
function plant(group,n,embed=.025){
  group.position.copy(n).multiplyScalar(R-embed);
  group.quaternion.setFromUnitVectors(UP,n);
  world.add(group);
}
function shadowify(o){o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return o;}
function tree(n,s=1){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.23,1.5,9),bark); trunk.position.y=.68; g.add(trunk);
  for(let i=0;i<5;i++){const root=new THREE.Mesh(new THREE.ConeGeometry(.09,.46,6),bark),a=i/5*Math.PI*2;root.position.set(Math.cos(a)*.16,.05,Math.sin(a)*.16);root.rotation.z=Math.PI/2;root.rotation.y=-a;root.scale.z=.55;g.add(root);}
  const crown=new THREE.Group(); crown.position.y=1.55;
  for(let i=0;i<7;i++){
    const a=i/7*Math.PI*2, rr=i? .43:.05;
    const b=new THREE.Mesh(new THREE.IcosahedronGeometry(i? .5:.64,1),i%2?leaf:leaf2);
    b.scale.set(1, .78, 1); b.position.set(Math.cos(a)*rr,(i%3)*.14,Math.sin(a)*rr); crown.add(b);
  }
  g.add(crown); g.scale.setScalar(s); plant(shadowify(g),n,.08);
  props.push({kind:'tree',n,radius:.28*s,group:g});
}
function palm(n,s=.8){
  const g=new THREE.Group();
  const trunkCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.035,.5,0),new THREE.Vector3(.11,1.08,.015),new THREE.Vector3(.2,1.65,0)]),trunk=new THREE.Mesh(new THREE.TubeGeometry(trunkCurve,24,.09,9,false),bark);g.add(trunk);
  for(let i=0;i<7;i++){const band=new THREE.Mesh(new THREE.TorusGeometry(.093-i*.002,.012,5,10),brown);band.position.copy(trunkCurve.getPoint(.1+i*.12));band.rotation.x=Math.PI/2;band.rotation.z=-.08;g.add(band);}
  const crown=new THREE.Group();crown.position.set(.2,1.65,0);
  for(let i=0;i<10;i++){const a=i/10*Math.PI*2,frond=new THREE.Group(),stem=new THREE.Mesh(new THREE.CylinderGeometry(.014,.022,.82,6),new THREE.MeshStandardMaterial({color:0x356c27,roughness:.9}));stem.position.y=.38;frond.add(stem);for(let j=0;j<8;j++){const y=.09+j*.085,width=.17*(1-Math.abs(j-3.5)/5),blade=new THREE.Mesh(new THREE.CapsuleGeometry(.018,Math.max(.08,width),3,6),j%2?leaf:leaf2);blade.position.set((j%2?-1:1)*(.04+width*.45),y,0);blade.rotation.z=(j%2?1:-1)*(1.08+.04*j);blade.scale.z=.35;frond.add(blade);}frond.rotation.order='YXZ';frond.rotation.y=-a;frond.rotation.z=1.02+(i%3)*.1;frond.rotation.x=(i%2-.5)*.14;crown.add(frond);}
  for(let i=0;i<3;i++){const nut=new THREE.Mesh(new THREE.SphereGeometry(.075,10,8),brown);nut.position.set((i-1)*.08,-.08,(i%2-.5)*.08);crown.add(nut);}g.add(crown);
  g.scale.setScalar(s);plant(shadowify(g),n,.07);props.push({kind:'tree',n,radius:.2*s,group:g});
}
let rockId=0;
function rock(n,s=.5){
  const g=new THREE.Group(),id=rockId++;
  const geo=id%3===0?new THREE.DodecahedronGeometry(.55,1):id%3===1?new THREE.IcosahedronGeometry(.57,1):new THREE.SphereGeometry(.55,8,6);
  const m=new THREE.Mesh(geo,rockMat),wide=.95+(id%5)*.11,tall=.58+(id%4)*.1,deep=.82+((id*3)%5)*.08;
  m.scale.set(wide,tall,deep);m.position.y=.2+.04*(id%3);m.rotation.set(.08*(id%4),.47*id,.06*((id%3)-1));g.add(m);
  // Only occasional stones carry moss, with varied off-center growth.
  if(id%4===0){const cap=new THREE.Mesh(new THREE.IcosahedronGeometry(.26+(id%3)*.025,1),moss);cap.scale.set(1.15+(id%2)*.25,.14+(id%3)*.025,.82+(id%2)*.15);cap.position.set((id%3-.8)*.07,.5+.04*(id%3),((id+1)%3-1)*.05);cap.rotation.y=id*.37;g.add(cap);}
  if(id%5===2){const chip=new THREE.Mesh(new THREE.DodecahedronGeometry(.18,0),rockMat);chip.position.set(.42,.08,-.08);chip.scale.set(1,.65,.85);g.add(chip);}
  g.scale.setScalar(s);plant(shadowify(g),n,.06);props.push({kind:'rock',n,radius:.18*s,group:g});
}
function log(n,s=.55){
  const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,1.45,12),brown);
  m.rotation.z=Math.PI/2;m.position.y=.22;g.add(m);
  const cutMat=new THREE.MeshStandardMaterial({color:0xc98745,roughness:.92}),ringMat=new THREE.MeshStandardMaterial({color:0x71401f,roughness:.95});
  for(const z of [-.73,.73]){const end=new THREE.Mesh(new THREE.CylinderGeometry(.225,.225,.018,12),cutMat);end.rotation.z=Math.PI/2;end.position.x=z;g.add(end);for(const rr of [.07,.13,.19]){const ring=new THREE.Mesh(new THREE.TorusGeometry(rr,.009,5,20),ringMat);ring.rotation.y=Math.PI/2;ring.position.x=z+(z>0?.012:-.012);g.add(ring);}}
  for(let i=0;i<3;i++){const knot=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.07,7),ringMat);knot.position.set(-.3+i*.31,.42,(i%2-.5)*.18);knot.rotation.z=.3;g.add(knot);}
  g.scale.setScalar(s);plant(shadowify(g),n,.06);props.push({kind:'log',n,radius:.48*s,group:g});
}
function foliage(n,s=.3){
  const g=new THREE.Group();for(let i=0;i<9;i++){const a=i/9*Math.PI*2,m=new THREE.Mesh(new THREE.CapsuleGeometry(.055,.38,4,7),i%2?leaf:leaf2);m.position.set(Math.cos(a)*.17,.12,Math.sin(a)*.17);m.rotation.order='YXZ';m.rotation.y=-a;m.rotation.z=Math.PI/2-.34;m.scale.set(1,.9,.38);g.add(m);}for(let i=0;i<3;i++){const heart=new THREE.Mesh(new THREE.IcosahedronGeometry(.16,1),i%2?leaf2:leaf);heart.position.set((i-1)*.11,.13,-.04);heart.scale.set(1,.48,.8);g.add(heart);}g.scale.setScalar(s);plant(shadowify(g),n,.02);
}
function grassTuft(n,s=.5){
  const g=new THREE.Group();for(let i=0;i<6;i++){const blade=new THREE.Mesh(new THREE.ConeGeometry(.025,.25,5),i%2?leaf:leaf2);blade.position.set((i-2.5)*.035,.12,(i%2-.5)*.06);blade.rotation.z=(i-2.5)*.1;g.add(blade);}g.scale.setScalar(s);plant(shadowify(g),n,.01);
}
function flower(n,color=0xff7b9c,s=.55){
  const g=new THREE.Group(),stemMat=new THREE.MeshStandardMaterial({color:0x337b34,roughness:.9}),petalMat=new THREE.MeshStandardMaterial({color,roughness:.72}),centerMat=new THREE.MeshStandardMaterial({color:0xffd75e,roughness:.75});
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.2,6),stemMat);stem.position.y=.1;g.add(stem);
  for(let i=0;i<6;i++){const p=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),petalMat);const a=i/6*Math.PI*2;p.position.set(Math.cos(a)*.055,.22,Math.sin(a)*.055);p.scale.set(1,.35,1);g.add(p);}const c=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),centerMat);c.position.y=.225;g.add(c);g.scale.setScalar(s);plant(shadowify(g),n,.006);
}
let dirtPatchId=0;
function dirtPatch(n,s=.7){
  const g=new THREE.Group(),id=dirtPatchId++;
  // Overlapping textured lobes create a soft, irregular soil boundary instead
  // of a single round game-token disc.
  for(let i=0;i<6;i++){
    const a=i/6*Math.PI*2+id*.73,r=.06+(i%3)*.025;
    const m=new THREE.Mesh(new THREE.CylinderGeometry(.11+(i%2)*.035,.13+(i%2)*.03,.008,12),pathMat);
    m.position.set(Math.cos(a)*r,.004+i*.0003,Math.sin(a)*r*.55);m.scale.set(1.25+(i%3)*.14,1,.65+(i%2)*.18);m.rotation.y=a*.7;m.receiveShadow=true;g.add(m);
  }
  g.scale.setScalar(s);plant(g,n,-.002);
}

// A broken jungle trail wraps around the sphere and reinforces travel into depth.
for(let i=0;i<90;i++){
  const lon=i/90*Math.PI*2,lat=.1*Math.sin(lon*2.2),n=normalAt(lat,lon);
  const g=new THREE.Group(),patch=new THREE.Mesh(new THREE.CylinderGeometry(.12,.14,.018,12),pathMat);
  patch.scale.set(.85,1,1.9);patch.position.y=.006;patch.receiveShadow=true;g.add(patch);plant(g,n,-.005);
}

// Fibonacci coverage distributes geometry around the complete sphere, while leaving broad routes.
for(let i=0;i<360;i++){
  const y=1-(i+.5)/360*2, lat=Math.asin(y), lon=i*2.399963;
  const n=normalAt(lat,lon), k=i%15;
  if(n.angleTo(CAMERA_CENTER_NORMAL)<.15) foliage(n,.55);
  else if(k===0||k===7) tree(n, .58+(i%5)*.05);
  else if(k===3||k===10) rock(n,.42+(i%4)*.06);
  else if(k===5) log(n,.48+(i%3)*.07);
  else foliage(n,.55+(i%3)*.08);
}
for(let i=0;i<22;i++){const y=1-(i+.5)/22*2;palm(normalAt(Math.asin(y),i*2.399963+1.1),.62+(i%4)*.06);}

// Non-blocking surface dressing is distributed over the complete planet.
for(let i=0;i<140;i++){
  const y=1-(i+.35)/140*2,n=normalAt(Math.asin(y),i*2.399963+.73);
  if(i%17===0)flower(n,i%34?0xff83a8:0xffc85c,.5);
  else if(i%11===0)dirtPatch(n,.55);
  else grassTuft(n,.38+(i%4)*.05);
}

// Compose a readable mid-ground behind the starting chase lane, echoing the
// reference's layered jungle depth without blocking the ape's direct route.
const midX=new THREE.Vector3(1,0,0),midY=new THREE.Vector3(0,1,0);
function midNormal(depth,side){return CAMERA_CENTER_NORMAL.clone().applyAxisAngle(midX,-depth).applyAxisAngle(midY,side).normalize();}
tree(midNormal(.1,-.15),.64); tree(midNormal(.11,.15),.7);
palm(midNormal(.135,-.24),.72);palm(midNormal(.16,.25),.68);palm(midNormal(.19,.11),.64);
rock(midNormal(.065,-.075),.46); rock(midNormal(.08,.075),.5);
log(midNormal(.055,.16),.52);
foliage(midNormal(.045,-.13),.7); foliage(midNormal(.12,0),.62);
for(const [d,s] of [[.018,-.035],[.045,.018],[.075,-.012],[.11,.03]])dirtPatch(midNormal(d,s),.72-d*2);
dirtPatch(midNormal(-.055,-.11),.92);dirtPatch(midNormal(-.075,.1),.82);
grassTuft(midNormal(.04,-.09),.7);grassTuft(midNormal(.07,.11),.65);grassTuft(midNormal(.13,-.05),.6);
flower(midNormal(.055,-.13),0xff7fa5,.75);flower(midNormal(.095,.12),0xffcf62,.68);flower(midNormal(.14,.045),0xff8dbb,.6);

function spherePart(geo,mat,pos,scale,parent){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function makeFurTexture(){const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#6b351c';q.fillRect(0,0,256,256);let s=517;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<2400;i++){const x=r()*256,y=r()*256,l=2+r()*7;q.globalAlpha=.12+r()*.32;q.strokeStyle=r()>.5?'#a15827':'#2d180f';q.beginPath();q.moveTo(x,y);q.lineTo(x+(r()-.5)*2,y+l);q.stroke();}q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,4);return t;}
const furTexture=makeFurTexture();
const fur=new THREE.MeshPhysicalMaterial({color:0x7a3c1d,map:furTexture,bumpMap:furTexture,bumpScale:.018,roughness:.84,sheen:.16,sheenColor:new THREE.Color(0xb86c32)});
const face=new THREE.MeshPhysicalMaterial({color:0xd99a62,roughness:.72,clearcoat:.08,clearcoatRoughness:.82});
const dark=new THREE.MeshStandardMaterial({color:0x20150f,roughness:.9});
const white=new THREE.MeshStandardMaterial({color:0xfff4db,roughness:.65});
const apeRoot=new THREE.Group(), apeModel=new THREE.Group(); apeRoot.add(apeModel); world.add(apeRoot);
const apeContact=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.009,20),new THREE.MeshBasicMaterial({color:0x173d18,transparent:true,opacity:.68,depthWrite:false}));
apeContact.scale.z=.55;world.add(apeContact);
const body=spherePart(new THREE.SphereGeometry(.24,22,18),fur,[0,.43,0],[.84,1.2,.74],apeModel);
const head=spherePart(new THREE.SphereGeometry(.285,24,20),fur,[0,.8,0],[1.03,1.02,.94],apeModel);
spherePart(new THREE.SphereGeometry(.2,22,16),face,[0,.72,.215],[1.02,.76,.46],apeModel);
spherePart(new THREE.SphereGeometry(.17,18,12),face,[0,.43,.148],[.72,.92,.23],apeModel);
spherePart(new THREE.SphereGeometry(.13,18,12),face,[0,.42,.174],[.72,.82,.2],apeModel);
for(const side of [-1,1]){
  spherePart(new THREE.SphereGeometry(.1,14,10),face,[side*.28,.8,0],[.55,1,.45],apeModel);
  spherePart(new THREE.SphereGeometry(.065,12,8),new THREE.MeshStandardMaterial({color:0xb86f43,roughness:.82}),[side*.292,.8,.018],[.48,.75,.32],apeModel);
  spherePart(new THREE.SphereGeometry(.062,14,10),white,[side*.087,.87,.232],[1,.98,.45],apeModel);
  spherePart(new THREE.SphereGeometry(.034,12,9),new THREE.MeshStandardMaterial({color:0x7c451e,roughness:.55}),[side*.082,.882,.257],[1,1,.45],apeModel);
  spherePart(new THREE.SphereGeometry(.019,10,8),dark,[side*.08,.892,.27],[1,1,.5],apeModel);
  const brow=spherePart(new THREE.BoxGeometry(.105,.022,.028),fur,[side*.085,.925,.244],[1,1,1],apeModel);brow.rotation.z=-side*.15;
  spherePart(new THREE.SphereGeometry(.014,8,6),dark,[side*.045,.745,.29],[1,.7,.5],apeModel);
}
const mouth=spherePart(new THREE.SphereGeometry(.065,14,10),dark,[0,.675,.292],[.78,.72,.2],apeModel);const tongue=spherePart(new THREE.SphereGeometry(.038,12,8),new THREE.MeshStandardMaterial({color:0xb75e4f,roughness:.75}),[0,.653,.306],[1,.34,.2],apeModel);
for(let i=-1;i<=1;i++){const tuft=new THREE.Mesh(new THREE.ConeGeometry(.045,.14,7),fur);tuft.position.set(i*.04,1.065,-.01+Math.abs(i)*.012);tuft.rotation.z=-i*.22;tuft.castShadow=true;apeModel.add(tuft);}
const limbs={};
function makeJointedLimb(name,x,y,isLeg){
  const upperLen=isLeg?.2:.19,lowerLen=isLeg?.19:.2,root=new THREE.Group(),joint=new THREE.Group(),end=new THREE.Group();
  root.position.set(x,y,0);apeModel.add(root);
  spherePart(new THREE.CapsuleGeometry(isLeg?.069:.058,upperLen,5,10),fur,[0,-upperLen*.52,0],[1,1,1],root);
  joint.position.y=-upperLen;root.add(joint);spherePart(new THREE.SphereGeometry(isLeg?.07:.06,10,8),fur,[0,0,0],[1,.8,1],joint);
  spherePart(new THREE.CapsuleGeometry(isLeg?.062:.052,lowerLen,5,10),fur,[0,-lowerLen*.52,0],[1,1,1],joint);
  end.position.set(0,-lowerLen,isLeg?.045:.015);joint.add(end);
  spherePart(new THREE.SphereGeometry(isLeg?.082:.074,12,8),face,[0,0,isLeg?.045:.025],isLeg?[1,.48,1.55]:[1,.65,1.15],end);
  root.lower=joint;root.end=end;limbs[name]=root;
}
makeJointedLimb('armL',-.24,.53,false);makeJointedLimb('armR',.24,.53,false);
makeJointedLimb('legL',-.12,.24,true);makeJointedLimb('legR',.12,.24,true);
for(const side of [-1,1]){
  const hand=side<0?limbs.armL.end:limbs.armR.end,foot=side<0?limbs.legL.end:limbs.legR.end;
  for(let i=-1;i<=1;i++)spherePart(new THREE.SphereGeometry(.019,8,6),face,[i*.024,-.018,.07+Math.abs(i)*.008],[.72,.5,1.15],hand);
  for(let i=-1;i<=1;i++)spherePart(new THREE.SphereGeometry(.024,8,6),face,[i*.029,-.014,.105],[.8,.48,1.35],foot);
}
apeModel.scale.setScalar(.42); apeModel.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
const stunBirds=new THREE.Group(),birdMat=new THREE.MeshStandardMaterial({color:0xffd43b,emissive:0x8a5600,emissiveIntensity:.5,roughness:.6});
for(let i=0;i<5;i++){const bird=new THREE.Group(),bodyBird=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),birdMat);bird.add(bodyBird);for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.ConeGeometry(.025,.09,5),birdMat);wing.position.x=side*.055;wing.rotation.z=side*Math.PI/2;bird.add(wing);}bird.userData.phase=i/5*Math.PI*2;stunBirds.add(bird);}stunBirds.visible=false;apeModel.add(stunBirds);

let apeN=CAMERA_CENTER_NORMAL.clone(), targetN=apeN.clone(), runSpeed=0, recognize=0, score=0, health=3, running=false;
let trip=0, tripPhase='run', facing=1, lastTarget=new THREE.Vector3();
let tripObstacle=null, obstacleGrace=0,avoidObstacle=null,avoidTimer=0,avoidSide=1,stuckTime=0,lastGap=0;
let gaitPhase=0;
let hitTimer=0, startleTimer=0, stunTimer=0, beeWaveTimer=0, pendingDamageTrip=false, knockedOut=false;
function placeApe(){
  // The root is the planted foot plane; keep it just above the terrain so the
  // animated feet touch the sphere instead of disappearing into it.
  apeRoot.position.copy(apeN).multiplyScalar(R+.02);
  apeRoot.quaternion.setFromUnitVectors(UP,apeN);
  apeContact.position.copy(apeN).multiplyScalar(R+.008);
  apeContact.quaternion.setFromUnitVectors(UP,apeN);
  // Turn the model within its tangent plane so its face follows its visible travel direction.
  const tangent=targetN.clone().addScaledVector(apeN,-targetN.dot(apeN));
  if(tangent.lengthSq()>.0001){const local=tangent.normalize().applyQuaternion(apeRoot.quaternion.clone().invert());apeModel.rotation.y=Math.atan2(local.x,local.z);}
}
placeApe();

const bananaMat=new THREE.MeshStandardMaterial({color:0xffce27,emissive:0x8a4d00,emissiveIntensity:.7,roughness:.45});
const bombMat=new THREE.MeshStandardMaterial({color:0x22292b,roughness:.55,metalness:.28});
const hiveMat=new THREE.MeshStandardMaterial({color:0xe2a52c,emissive:0x4a2600,emissiveIntensity:.16,roughness:.78});
const hiveRidgeMat=new THREE.MeshStandardMaterial({color:0xf6c54a,emissive:0x593000,emissiveIntensity:.12,roughness:.72});
const HIVE_SWARM_RADIUS=.15, BEE_ATTACK_DISTANCE=HIVE_SWARM_RADIUS*5;
const drops=[], bees=[], planes=[];
function makeBanana(){
  const g=new THREE.Group(),tipMat=new THREE.MeshStandardMaterial({color:0x543016,roughness:.9});
  for(let j=-1;j<=1;j++){
    const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.12+j*.045,.1,0),new THREE.Vector3(j*.035,-.045,0),new THREE.Vector3(.12+j*.045,.085,0)]);
    const b=new THREE.Mesh(new THREE.TubeGeometry(curve,24,.043,10,false),bananaMat);b.rotation.z=j*.12;b.position.z=j*.025;b.castShadow=true;g.add(b);
    for(const p of [curve.points[0],curve.points[curve.points.length-1]]){const tip=new THREE.Mesh(new THREE.SphereGeometry(.024,8,6),tipMat);tip.position.copy(p);tip.rotation.z=j*.12;g.add(tip);}
  }
  const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.032,.12,8),tipMat);stem.position.set(.12,.15,0);stem.rotation.z=-.28;g.add(stem);g.add(new THREE.PointLight(0xffd65a,1.25,2.2));return g;
}
function makeBomb(){
  const g=new THREE.Group(),b=new THREE.Mesh(new THREE.DodecahedronGeometry(.22,1),bombMat);b.castShadow=true;g.add(b);
  const eyeMat=new THREE.MeshBasicMaterial({color:0xf6f1dd});for(const x of [-.07,.07])spherePart(new THREE.SphereGeometry(.035,8,6),eyeMat,[x,.04,.19],[1,1,.35],g);
  const fuse=new THREE.Mesh(new THREE.CylinderGeometry(.018,.024,.18,8),brown);fuse.position.y=.24;g.add(fuse);const warning=new THREE.PointLight(0xff4b32,.55,1.4);warning.position.y=.18;g.add(warning);return g;
}
function makeFallingLog(){const g=new THREE.Group(),m=new THREE.Mesh(new THREE.CylinderGeometry(.2,.25,1.2,12),brown);m.rotation.z=Math.PI/2;m.castShadow=true;g.add(m);return g;}
function makeFallingRock(){const g=new THREE.Group(),m=new THREE.Mesh(new THREE.DodecahedronGeometry(.25,1),rockMat);m.scale.set(1.15,.9,1);m.castShadow=true;m.receiveShadow=true;g.add(m);return g;}
function makeHive(){
  const g=new THREE.Group(),tiers=[
    {y:-.19,r:.225,h:.105},{y:-.105,r:.25,h:.11},{y:-.015,r:.245,h:.105},
    {y:.075,r:.225,h:.1},{y:.16,r:.19,h:.095},{y:.235,r:.135,h:.085}
  ];
  for(const [i,o] of tiers.entries()){const tier=new THREE.Mesh(new THREE.SphereGeometry(o.r,20,12),i%2?hiveMat:hiveRidgeMat);tier.scale.set(1,o.h/o.r,.88);tier.position.y=o.y;tier.castShadow=true;tier.receiveShadow=true;g.add(tier);}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.04,.07,.1,10),hiveMat);neck.position.y=.315;g.add(neck);const loop=new THREE.Mesh(new THREE.TorusGeometry(.045,.014,7,16),brown);loop.position.y=.39;loop.rotation.x=Math.PI/2;g.add(loop);
  const entranceRimMat=new THREE.MeshStandardMaterial({color:0x714015,roughness:.86}),holeRim=new THREE.Mesh(new THREE.TorusGeometry(.076,.021,8,20),entranceRimMat);holeRim.position.set(0,-.08,.226);g.add(holeRim);
  const hole=new THREE.Mesh(new THREE.CircleGeometry(.059,18),dark);hole.scale.y=.78;hole.position.set(0,-.08,.238);g.add(hole);return g;
}
const DROP_WEIGHTS=[['banana',.55],['rock',.15],['log',.12],['bomb',.1],['hive',.08]];
function pickDropType(){let r=Math.random();for(const [type,weight] of DROP_WEIGHTS){if(r<weight)return type;r-=weight;}return DROP_WEIGHTS[0][0];}
function makeCargoPlane(){
  const g=new THREE.Group(),bodyMat=new THREE.MeshStandardMaterial({color:0xf2c445,roughness:.48,metalness:.08}),wingMat=new THREE.MeshStandardMaterial({color:0x276da8,roughness:.5});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.14,.72,6,12),bodyMat);body.rotation.z=Math.PI/2;body.castShadow=true;g.add(body);
  const nose=new THREE.Mesh(new THREE.ConeGeometry(.14,.28,12),bodyMat);nose.rotation.z=-Math.PI/2;nose.position.x=.58;g.add(nose);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(.32,.055,1.15),wingMat);wing.position.x=.02;wing.castShadow=true;g.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.24,.045,.5),wingMat);tail.position.x=-.43;g.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.2,.28,.045),wingMat);fin.position.set(-.42,.15,0);g.add(fin);
  const prop=new THREE.Mesh(new THREE.BoxGeometry(.025,.62,.04),new THREE.MeshStandardMaterial({color:0x3b4145,metalness:.5}));prop.position.x=.74;g.add(prop);g.userData.prop=prop;
  g.scale.setScalar(.72);return g;
}
function releaseDrop(type,n){
  const g=type==='banana'?makeBanana():type==='bomb'?makeBomb():type==='rock'?makeFallingRock():type==='log'?makeFallingLog():makeHive();
  const drop={type,n:n.clone(),g,h:1.45,vy:.3,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);playCue('fall');if(type==='hive')spawnBees(drop);
}
function spawnDrop(){
  // Weighted random pick keeps bananas the common case; hazards stay a
  // minority mix instead of a fixed round-robin cycle.
  const type=pickDropType();
  // Hive drops land within a reproducible band around the ape's current lane;
  // the visible 5× radius ring then makes entry/exit testable by normal rotation.
  const spread=type==='hive'?.085:.65;
  const n=targetN.clone().applyAxisAngle(new THREE.Vector3(0,1,0),(Math.random()-.5)*spread).normalize();
  const tangentA=new THREE.Vector3().crossVectors(n,Math.abs(n.y)>.9?new THREE.Vector3(1,0,0):UP).normalize();
  const tangentB=new THREE.Vector3().crossVectors(n,tangentA).normalize(),flightAngle=Math.random()*Math.PI*2;
  const tangent=tangentA.multiplyScalar(Math.cos(flightAngle)).addScaledVector(tangentB,Math.sin(flightAngle)).normalize();
  const planeUp=n.clone(),planeSide=new THREE.Vector3().crossVectors(tangent,planeUp).normalize();
  const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,planeUp,planeSide));
  const g=makeCargoPlane();world.add(g);planes.push({g,type,n,tangent,orientation,progress:0,released:false});
}
function qaLandHive(){const n=apeN.clone().applyAxisAngle(new THREE.Vector3(0,1,0),.035).normalize(),g=makeHive(),drop={type:'hive',n,g,h:.015,vy:0,landed:true,groundTime:0,triggered:false};world.add(g);drops.push(drop);spawnBees(drop);}
function qaFallHive(){const n=apeN.clone().applyAxisAngle(new THREE.Vector3(0,1,0),.055).normalize(),g=makeHive(),drop={type:'hive',n,g,h:1.45,vy:.3,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);spawnBees(drop);}
function qaCatchBanana(){const g=makeBanana(),drop={type:'banana',n:apeN.clone(),g,h:.22,vy:.6,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);}

function spawnBees(hive){
  hive.triggered=true;const g=new THREE.Group(),beeMat=new THREE.MeshStandardMaterial({color:0xf5c532,emissive:0x6b4600,emissiveIntensity:.4,roughness:.65});
  for(let i=0;i<14;i++){
    const dot=new THREE.Mesh(new THREE.SphereGeometry(.03,7,5),beeMat);
    dot.userData={phase:i/14*Math.PI*2,radius:.09+(i%3)*.035,height:.14+(i%2)*.06,speed:3.8+(i%4)*.55};g.add(dot);
  }
  g.position.copy(hive.n).multiplyScalar(R+hive.h+.07);g.quaternion.setFromUnitVectors(UP,hive.n);world.add(g);
  const trailMat=new THREE.LineBasicMaterial({color:0xffd84d,transparent:true,opacity:0}),trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([g.position.clone(),g.position.clone()]),trailMat);trail.visible=false;world.add(trail);
  bees.push({g,trail,n:hive.n.clone(),origin:hive.n.clone(),target:apeN.clone(),source:hive,life:10,travel:0,mode:'orbit',hit:false,armed:true});
}
function makeHiveZone(hive){
  const mat=new THREE.MeshBasicMaterial({color:0xffd44f,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(BEE_ATTACK_DISTANCE-.018,BEE_ATTACK_DISTANCE+.018,40),mat),g=new THREE.Group();
  ring.rotation.x=-Math.PI/2;ring.position.y=.012;g.add(ring);plant(g,hive.n,-.01);hive.zoneRing=g;return g;
}

const velocity=new THREE.Vector2(), dragPrev=new THREE.Vector2();let dragging=false,lastMove=0;
function rotateWorld(dx,dy,userGesture=false){
  if(Math.abs(dx)+Math.abs(dy)<.000001)return;
  const qx=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),dx);
  const qy=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),dy);
  world.quaternion.premultiply(qx).premultiply(qy).normalize();
  if(userGesture)recognize=.22;
}
const activePointers=new Map();
let pinchDistance=0;
function pointerDistance(){const p=[...activePointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
function finishPointer(e){activePointers.delete(e.pointerId);pinchDistance=0;if(activePointers.size===1){const p=[...activePointers.values()][0];dragPrev.set(p.x,p.y);dragging=true;}else dragging=false;}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});velocity.set(0,0);if(activePointers.size===1){dragging=true;dragPrev.set(e.clientX,e.clientY);}else{dragging=false;pinchDistance=pointerDistance();}});
canvas.addEventListener('pointermove',e=>{if(!activePointers.has(e.pointerId))return;activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const nextDistance=pointerDistance();if(pinchDistance>0&&nextDistance>0){cameraZoom=THREE.MathUtils.clamp(cameraZoom+Math.log(pinchDistance/nextDistance)*.38,0,1);applyCameraZoom();}pinchDistance=nextDistance;velocity.set(0,0);return;}if(!dragging)return;const dx=(e.clientX-dragPrev.x)*.00115,dy=(e.clientY-dragPrev.y)*.00115;rotateWorld(dx,dy,true);velocity.set(dx*.3,dy*.3);dragPrev.set(e.clientX,e.clientY);lastMove=performance.now();});
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);
const heldKeys={};
const MOVE_KEYS=['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'];
const KEY_TURN_SPEED=.0022;
function keyboardVector(){let x=0,y=0;if(heldKeys.arrowleft||heldKeys.a)x+=1;if(heldKeys.arrowright||heldKeys.d)x-=1;if(heldKeys.arrowup||heldKeys.w)y+=1;if(heldKeys.arrowdown||heldKeys.s)y-=1;return{x,y};}

function tripApe(obstacle=null){if(obstacle&&obstacleGrace>0)return;if(trip<=0){playCue('trip');trip=2.15;tripPhase='stumble';tripObstacle=obstacle;toast.textContent='OOF!';setTimeout(()=>toast.textContent='',700);}}
function updateHealth(){healthEl.textContent='♥ '.repeat(Math.max(0,health)).trim()+' ♡'.repeat(Math.max(0,3-health));}
function damageApe(){
  if(knockedOut||hitTimer>0)return;health--;updateHealth();
  playCue('hit');
  if(health<=0){knockedOut=true;running=false;trip=0;runSpeed=0;tripPhase='knocked-out';toast.textContent='KNOCKED OUT!';
    setTimeout(()=>{cardTitle.textContent='Game Over';cardText.textContent=`You caught ${score} banana${score===1?'':'s'}. Ready for another run?`;playButton.textContent='NEW GAME';start.hidden=false;},900);
  }
  else {hitTimer=.48;pendingDamageTrip=true;tripPhase='hit';toast.textContent='WHACK!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},650);}
}
function rockHitApe(){playCue('bonk');stunTimer=2;stunBirds.visible=true;damageApe();toast.textContent='BONK!';}
function propHitAngle(p){return (p.radius+.105)/R;}
function tangentToward(from,to){return to.clone().addScaledVector(from,-to.dot(from)).normalize();}
function localDetour(from,obstacle,target,step){
  const toward=tangentToward(from,obstacle.n),side=from.clone().cross(toward).normalize(),a=from.clone().addScaledVector(side,step).normalize(),b=from.clone().addScaledVector(side,-step).normalize();return a.angleTo(target)<=b.angleTo(target)?a:b;
}
function clearRecoveryPoint(from,target){
  const forward=tangentToward(from,target),side=from.clone().cross(forward).normalize();let best=from.clone(),bestScore=1e9;
  for(const dist of [.035,.06,.09,.125,.18,.24,.3])for(const lateral of [-2,-1.6,-1,-.55,.55,1,1.6,2]){
    const c=from.clone().addScaledVector(forward,dist*.45).addScaledVector(side,dist*lateral).normalize();
    if(props.some(p=>c.angleTo(p.n)<propHitAngle(p)*1.18))continue;
    const score=c.angleTo(target)+dist*.08;if(score<bestScore){best=c;bestScore=score;}
  }
  return best;
}
function updateApe(dt,t){
  obstacleGrace=Math.max(0,obstacleGrace-dt);
  avoidTimer=Math.max(0,avoidTimer-dt);if(avoidTimer<=0)avoidObstacle=null;
  const inv=world.quaternion.clone().invert();targetN.copy(CAMERA_CENTER_NORMAL).applyQuaternion(inv).normalize();
  const gap=apeN.angleTo(targetN),distanceMode=gap>=.19?'RUN OFFSCREEN':gap>=.08?'RUN FAR':'WALK NEAR';debugEl.textContent=`${distanceMode} · ${tripPhase.toUpperCase()} · GAP ${(gap*57.3).toFixed(1)}°`;
  if(stunTimer>0){stunTimer-=dt;stunBirds.visible=true;for(const bird of stunBirds.children){const a=t*5.5+bird.userData.phase;bird.position.set(Math.cos(a)*.48,1.25+Math.sin(a*2)*.08,Math.sin(a)*.34);bird.rotation.y=-a;}if(stunTimer<=0)stunBirds.visible=false;}
  if(knockedOut){
    apeModel.rotation.z=1.52;apeModel.rotation.x=.16;apeModel.position.y=.015;head.rotation.z=-.28;limbs.armL.rotation.x=-1;limbs.armR.rotation.x=.8;limbs.legL.rotation.x=.35;limbs.legR.rotation.x=-.35;placeApe();return;
  }
  if(hitTimer>0){
    hitTimer-=dt;runSpeed=0;apeModel.rotation.z=Math.sin(t*45)*.22;apeModel.rotation.x=-.18;apeModel.position.y=.035;head.rotation.z=Math.sin(t*38)*.18;limbs.armL.rotation.x=-1.65;limbs.armR.rotation.x=-1.65;
    if(hitTimer<=0&&pendingDamageTrip){pendingDamageTrip=false;apeModel.rotation.z=0;tripApe();}
  }
  else if(startleTimer>0){
    startleTimer-=dt;runSpeed=Math.max(0,runSpeed-dt*1.8);apeModel.rotation.x=-.12;apeModel.rotation.z=Math.sin(t*28)*.08;head.rotation.z=Math.sin(t*22)*.12;limbs.armL.rotation.x=-1.25;limbs.armR.rotation.x=-1.25;
  }
  else if(beeWaveTimer>0){
    beeWaveTimer-=dt;runSpeed=Math.max(0,runSpeed-dt*1.2);apeModel.rotation.x=-.08;apeModel.rotation.z=Math.sin(t*15)*.09;head.rotation.z=Math.sin(t*18)*.14;
    limbs.armL.rotation.x=-1.35+Math.sin(t*23)*.55;limbs.armR.rotation.x=-1.35-Math.sin(t*23)*.55;
  }
  else if(recognize>0){recognize-=dt;runSpeed=Math.max(0,runSpeed-dt*.9);}
  else if(trip<=0){
    // Spherical travel speed is capped to what the short legs can physically
    // support. This keeps root motion matched to visible steps instead of skating.
    const wanted=gap>=.19?.245:gap>=.08?THREE.MathUtils.lerp(.11,.21,(gap-.08)/.11):Math.min(.072,Math.max(0,(gap-.012)*1.12));runSpeed+=THREE.MathUtils.clamp(wanted-runSpeed,-dt*.24,dt*.24);
    if(gap>.005){
      const previous=apeN.clone();
      const desired=tangentToward(apeN,targetN);let moveDir=desired.clone();
      const fastCatchup=(gap>=.19||runSpeed>.145)&&obstacleGrace<=0;
      if(lastGap>0&&gap>lastGap-.00035&&runSpeed>.025)stuckTime+=dt;else stuckTime=Math.max(0,stuckTime-dt*2);lastGap=gap;
      if(stuckTime>.65){avoidTimer=1.25;avoidObstacle=avoidObstacle||tripObstacle||props.reduce((best,p)=>apeN.angleTo(p.n)<apeN.angleTo(best.n)?p:best,props[0]);avoidSide*=-1;apeN.copy(clearRecoveryPoint(apeN,targetN));stuckTime=0;}
      if(avoidTimer>0&&avoidObstacle){const toward=tangentToward(apeN,avoidObstacle.n),side=apeN.clone().cross(toward).normalize().multiplyScalar(avoidSide);moveDir.multiplyScalar(.32).addScaledVector(side,2.8);}
      // After recovering from a real obstacle hit, remember that obstacle long
      // enough to choose a visible tangent detour instead of tripping in place.
      if(obstacleGrace>0&&tripObstacle){
        const away=tangentToward(apeN,tripObstacle.n);
        const detour=apeN.clone().cross(away).normalize();
        const side=detour.dot(desired.clone().cross(apeN))>0?1:-1;
        moveDir.addScaledVector(detour,side*2.4);
      }
      // Steer in the local tangent plane. Trees get a generous hard-clearance route;
      // low props are avoided when seen in time and only trip the ape on actual contact.
      for(const p of props){
        const d=apeN.angleTo(p.n), towardProp=tangentToward(apeN,p.n);
        if(d<.25&&desired.dot(towardProp)>.18){
          const clearance=propHitAngle(p);
          if(d<clearance&&p.kind!=='tree'&&fastCatchup&&!(obstacleGrace>0&&p===tripObstacle)){apeN.copy(previous);runSpeed=0;tripApe(p);break;}
          const sideA=apeN.clone().cross(towardProp).normalize();
          const sign=sideA.dot(tangentToward(apeN,targetN).cross(apeN))>0?1:-1;
          moveDir.addScaledVector(sideA,sign*(p.kind==='tree'?1.7:.8)*Math.max(0,(.25-d)/.25));
        }
      }
      if(trip<=0){
        moveDir.addScaledVector(apeN,-moveDir.dot(apeN)).normalize();
        const step=runSpeed*dt;apeN.addScaledVector(moveDir,step).normalize();
        // Test the position actually reached this frame. Logs have a long solid
        // footprint, so their trip clearance is deliberately wider than rocks.
        // This prevents a quick or diagonal chase step from slipping through.
        for(const p of props){
          if(p.kind==='tree')continue;
          const hitRadius=propHitAngle(p);
          if(apeN.angleTo(p.n)<hitRadius&&!(obstacleGrace>0&&p===tripObstacle)){
            if(!fastCatchup){avoidObstacle=p;avoidTimer=1.15;apeN.copy(localDetour(previous,p,targetN,step*1.15));runSpeed*=.92;}
            else {apeN.copy(previous);runSpeed=0;tripApe(p);}break;
          }
        }
        // Trees are absolute solid blockers, even if steering could not find clearance.
        if(trip<=0)for(const p of props){if(p.kind==='tree'&&apeN.angleTo(p.n)<propHitAngle(p)){if(!fastCatchup){avoidObstacle=p;avoidTimer=1.25;apeN.copy(localDetour(previous,p,targetN,step*1.2));runSpeed*=.9;}else{apeN.copy(previous);runSpeed=0;tripApe(p);}break;}}
        // A valid detour may be lateral, but never let avoidance run away from center.
        if(trip<=0&&avoidTimer<=0&&apeN.angleTo(targetN)>gap+.003){
          apeN.copy(previous).addScaledVector(desired,step).normalize();
          for(const p of props){if(p.kind==='tree'&&apeN.angleTo(p.n)<propHitAngle(p)){if(!fastCatchup){avoidObstacle=p;avoidTimer=1.25;apeN.copy(localDetour(previous,p,targetN,step*1.2));runSpeed*=.9;}else{apeN.copy(previous);runSpeed=0;tripApe(p);}break;}}
        }
      }
    }
  }
  if(lastTarget.lengthSq()&&lastTarget.angleTo(targetN)>.42&&runSpeed>.12)tripApe();lastTarget.copy(targetN);
  if(hitTimer>0||startleTimer>0||beeWaveTimer>0){/* preserve the distinct reaction pose set above */}
  else if(trip>0){trip-=dt;const elapsed=2.15-trip;
    if(elapsed<.28){const p=elapsed/.28;tripPhase='stumble';apeModel.rotation.x=p*.32;apeModel.rotation.z=facing*Math.sin(p*Math.PI)*.035;limbs.armL.rotation.x=-p*1.15;limbs.armR.rotation.x=-p*.9;limbs.armL.lower.rotation.x=-p*.55;limbs.armR.lower.rotation.x=-p*.7;limbs.legL.rotation.x=.34*p;limbs.legR.rotation.x=-.22*p;limbs.legL.lower.rotation.x=.8*p;limbs.legR.lower.rotation.x=.32*p;}
    else if(elapsed<.62){const p=(elapsed-.28)/.34;tripPhase='fall';apeModel.rotation.x=.32+p*1.02;apeModel.rotation.z=facing*.025*(1-p);apeModel.position.y=.012*(1-p);limbs.armL.rotation.x=-1.55;limbs.armR.rotation.x=-1.42;limbs.armL.lower.rotation.x=-.25;limbs.armR.lower.rotation.x=-.18;limbs.legL.rotation.x=.46;limbs.legR.rotation.x=.22;limbs.legL.lower.rotation.x=1.05;limbs.legR.lower.rotation.x=.85;head.rotation.x=-.18;}
    else if(elapsed<1.28){tripPhase='down';apeModel.rotation.x=1.34;apeModel.rotation.z=0;apeModel.position.y=.002;head.rotation.x=-.2;limbs.armL.rotation.x=-1.48;limbs.armR.rotation.x=-1.48;limbs.armL.lower.rotation.x=-.12;limbs.armR.lower.rotation.x=-.12;limbs.legL.rotation.x=.5;limbs.legR.rotation.x=.34;limbs.legL.lower.rotation.x=1.08;limbs.legR.lower.rotation.x=.92;}
    else if(elapsed<1.72){const p=(elapsed-1.28)/.44;tripPhase='push-up';apeModel.rotation.x=1.34-p*.72;apeModel.rotation.z=0;apeModel.position.y=.002+p*.012;head.rotation.x=-.2+p*.16;limbs.armL.rotation.x=-1.48+p*.68;limbs.armR.rotation.x=-1.48+p*.68;limbs.armL.lower.rotation.x=-.12-p*.42;limbs.armR.lower.rotation.x=-.12-p*.42;limbs.legL.rotation.x=.5-p*.22;limbs.legR.rotation.x=.34-p*.18;limbs.legL.lower.rotation.x=1.08-p*.65;limbs.legR.lower.rotation.x=.92-p*.55;}
    else {const p=Math.min(1,(elapsed-1.72)/.43);tripPhase='stand';apeModel.rotation.x=.62*(1-p);apeModel.rotation.z=0;apeModel.position.y=.014*(1-p);head.rotation.x=-.04*(1-p);limbs.armL.rotation.x=-.8*(1-p);limbs.armR.rotation.x=-.8*(1-p);limbs.armL.lower.rotation.x=-.54*(1-p);limbs.armR.lower.rotation.x=-.54*(1-p);limbs.legL.rotation.x=.28*(1-p);limbs.legR.rotation.x=.16*(1-p);limbs.legL.lower.rotation.x=.43*(1-p);limbs.legR.lower.rotation.x=.37*(1-p);}
    if(trip<=0){apeModel.rotation.set(0,apeModel.rotation.y,0);apeModel.position.y=0;tripPhase='run';if(tripObstacle){obstacleGrace=3;avoidObstacle=tripObstacle;avoidTimer=1.8;apeN.copy(clearRecoveryPoint(apeN,targetN));}}
  } else {
    const moving=Math.min(1,runSpeed/.025),sprint=THREE.MathUtils.smoothstep(runSpeed,.065,.19),linearSpeed=runSpeed*R,strideLength=THREE.MathUtils.lerp(.22,.43,sprint);
    gaitPhase+=(linearSpeed/strideLength)*Math.PI*dt;const phase=gaitPhase,amp=THREE.MathUtils.lerp(.34,.7,sprint)*moving;const stepBeat=Math.floor(gaitPhase/Math.PI);if(moving>.35&&stepBeat!==lastStepBeat){lastStepBeat=stepBeat;playCue('step');}
    const plantedLeg=p=>{p=((p%(Math.PI*2))+Math.PI*2)%(Math.PI*2);if(p<Math.PI)return amp*(1-2*p/Math.PI);const q=(p-Math.PI)/Math.PI,s=q*q*(3-2*q);return -amp+2*amp*s;};
    limbs.legL.rotation.x=plantedLeg(phase);limbs.legR.rotation.x=plantedLeg(phase+Math.PI);
    limbs.legL.lower.rotation.x=Math.max(0,-Math.sin(phase))*THREE.MathUtils.lerp(.55,1.0,sprint)*moving;
    limbs.legR.lower.rotation.x=Math.max(0,-Math.sin(phase+Math.PI))*THREE.MathUtils.lerp(.55,1.0,sprint)*moving;
    limbs.legL.end.rotation.x=-limbs.legL.rotation.x*.32-limbs.legL.lower.rotation.x*.2;limbs.legR.end.rotation.x=-limbs.legR.rotation.x*.32-limbs.legR.lower.rotation.x*.2;
    limbs.armL.rotation.x=-Math.sin(phase)*amp*.78;limbs.armR.rotation.x=Math.sin(phase)*amp*.78;
    limbs.armL.lower.rotation.x=-.22-Math.max(0,Math.sin(phase))*.62*moving;limbs.armR.lower.rotation.x=-.22-Math.max(0,-Math.sin(phase))*.62*moving;
    apeModel.rotation.x=-THREE.MathUtils.lerp(.025,.17,sprint)*moving;apeModel.rotation.z=Math.sin(phase*.5)*THREE.MathUtils.lerp(.018,.04,sprint)*moving;head.rotation.x=-apeModel.rotation.x*.25;head.rotation.z=-apeModel.rotation.z*.65;
    const support=Math.min(Math.abs(Math.sin(phase)),Math.abs(Math.sin(phase+Math.PI)));apeModel.position.y=support*THREE.MathUtils.lerp(.004,.009,sprint)*moving;
  }
  placeApe();
}

const effects=[];
function explodeBomb(d){
  playCue('boom');
  const flash=new THREE.Mesh(new THREE.SphereGeometry(.18,16,12),new THREE.MeshBasicMaterial({color:0xff6a20,transparent:true,opacity:.85,depthWrite:false}));
  flash.position.copy(d.n).multiplyScalar(R+.18);world.add(flash);effects.push({g:flash,life:.5});
  // Tight local blast: roughly half a metre on this globe, rather than the
  // previous broad area that could hit an ape standing visibly far away.
  const blastGap=apeN.angleTo(d.n);
  if(blastGap<.045)damageApe();
  else if(blastGap<.09&&!knockedOut){startleTimer=.55;tripPhase='startled';toast.textContent='YIKES!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},500);}
  toast.textContent='BOOM!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},450);
}
let dropTimer=4,last=performance.now();
function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;const t=now/1000;
  if(running){
    if(!dragging){const kv=keyboardVector();if(kv.x||kv.y){velocity.set(kv.x*KEY_TURN_SPEED,kv.y*KEY_TURN_SPEED);recognize=.22;}rotateWorld(velocity.x,velocity.y);velocity.multiplyScalar(Math.pow(.0008,dt));if(velocity.length()<.000025)velocity.set(0,0);}
    updateApe(dt,t);dropTimer-=dt;if(dropTimer<=0){spawnDrop();dropTimer=2.8+Math.random()*2;}
    for(let i=planes.length-1;i>=0;i--){const p=planes[i];p.progress+=dt*.42;p.g.position.copy(p.n).multiplyScalar(R+2.05).addScaledVector(p.tangent,(p.progress-.5)*5.2);p.g.quaternion.copy(p.orientation);p.g.userData.prop.rotation.x+=dt*24;if(!p.released&&p.progress>=.48){p.released=true;releaseDrop(p.type,p.n);}if(p.progress>1.12){world.remove(p.g);planes.splice(i,1);}}
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];
      if(!d.landed){d.h-=d.vy*dt;d.vy+=.28*dt;if(d.h<=.015){d.h=.015;d.landed=true;d.groundTime=0;if(d.type!=='banana')playCue('land');}}
      else d.groundTime+=dt;
      if(d.landed&&d.type==='hive'&&!d.zoneRing)makeHiveZone(d);
      d.g.position.copy(d.n).multiplyScalar(R+d.h);d.g.quaternion.setFromUnitVectors(UP,d.n);if(!d.landed)d.g.rotateY(dt*2.4);
      const closeness=Math.max(0,1-d.h/1.45);
      // Keep drops proportional to the small ape: distant items are tiny, and
      // landed bananas/bombs remain hand-to-head sized rather than oversized.
      d.g.scale.setScalar((.2+closeness*.22)*(d.type==='hive'?1.55:1));
      // Resolve a catch/hit only when the descending mesh overlaps the ape's
      // actual body volume. A nearby ground impact is a miss, not a collision.
      const apeCatchPoint=apeN.clone().multiplyScalar(R+.2);
      if(d.type==='banana'&&d.g.position.distanceTo(apeCatchPoint)<.22){
        playCue('catch');score++;scoreEl.textContent=`🍌 ${score}`;world.remove(d.g);drops.splice(i,1);continue;
      }
      if(!d.landed&&d.type!=='banana'&&d.g.position.distanceTo(apeCatchPoint)<.19){
        if(d.type==='bomb')damageApe();else if(d.type==='rock')rockHitApe();else if(d.type==='log')tripApe();
        world.remove(d.g);drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='log'){
        addLandedProp({kind:'log',n:d.n.clone(),radius:.28,group:d.g});drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='rock'){
        addLandedProp({kind:'rock',n:d.n.clone(),radius:.13,group:d.g});drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='hive'&&!d.triggered)spawnBees(d);
      if(d.landed&&d.type==='bomb'&&d.groundTime>=2){explodeBomb(d);world.remove(d.g);drops.splice(i,1);continue;}
      if(d.landed&&d.type==='banana'&&d.groundTime>=2){world.remove(d.g);drops.splice(i,1);continue;}
      if(d.landed&&d.type==='hive'&&d.groundTime>=10){world.remove(d.g);if(d.zoneRing)world.remove(d.zoneRing);drops.splice(i,1);continue;}
    }
    for(let i=bees.length-1;i>=0;i--){const b=bees[i];b.life-=dt;const falling=!b.source.landed,originGap=b.origin.angleTo(apeN),surfaceDistance=originGap*R,inZone=!falling&&surfaceDistance<=BEE_ATTACK_DISTANCE;if(!inZone)b.armed=true;
      if(falling){b.mode='orbit';b.travel=0;}
      else if(b.mode==='orbit'&&inZone&&b.armed){playCue('bees');b.mode='launch';b.target.copy(apeN);b.hit=false;toast.textContent='BEES!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},650);}
      else if((b.mode==='launch'||b.mode==='attack')&&inZone){b.target.copy(apeN);b.travel=Math.min(1,b.travel+dt*1.35);if(b.travel>=.92)b.mode='attack';}
      else if(b.mode!=='orbit'){b.mode='return';b.travel=Math.max(0,b.travel-dt*1.8);if(b.travel<=0)b.mode='orbit';}
      b.n.copy(b.origin).lerp(b.target,b.travel).normalize();const swarmHeight=falling?b.source.h+.07:.05;b.g.position.copy(b.n).multiplyScalar(R+swarmHeight);b.g.quaternion.setFromUnitVectors(UP,b.n);
      const trailPositions=b.trail.geometry.attributes.position;const trailStart=b.origin.clone().multiplyScalar(R+(falling?b.source.h+.07:.05));trailPositions.setXYZ(0,trailStart.x,trailStart.y,trailStart.z);trailPositions.setXYZ(1,b.g.position.x,b.g.position.y,b.g.position.z);trailPositions.needsUpdate=true;b.trail.visible=!falling&&b.travel>.035;b.trail.material.opacity=Math.sin(Math.min(1,b.travel)*Math.PI)*.8;
      if(b.source.zoneRing){b.source.zoneRing.children[0].material.color.setHex(inZone?0xff7045:0xffd44f);b.source.zoneRing.children[0].material.opacity=inZone?.5:.28;}
      // The compact flock visibly leaves the hive, tightens during the strike,
      // then rides the same spherical path back instead of chasing indefinitely.
      const tighten=THREE.MathUtils.lerp(1,.55,b.travel);for(const dot of b.g.children){const u=dot.userData,a=t*u.speed+u.phase;dot.position.set(Math.cos(a)*u.radius*tighten,u.height+Math.sin(a*1.7)*.03,Math.sin(a)*u.radius*tighten);}
      if((b.mode==='launch'||b.mode==='attack')&&!knockedOut)beeWaveTimer=.22;
      if(!b.hit&&b.mode==='attack'&&b.n.angleTo(apeN)<.018){playCue('sting');b.hit=true;b.armed=false;damageApe();b.mode='return';}
      if(b.life<=0){world.remove(b.g);world.remove(b.trail);bees.splice(i,1);}
    }
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;e.g.scale.multiplyScalar(1+dt*7);e.g.material.opacity=Math.max(0,e.life*1.7);if(e.life<=0){world.remove(e.g);effects.splice(i,1);}}
  }
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
playButton.addEventListener('click',()=>{
  startAudio();
  if(knockedOut){sessionStorage.setItem('apeAutoStart','1');location.reload();return;}
  start.hidden=true;running=true;
});
let pausedByMenu=false;
addEventListener('bp-pause',e=>{pausedByMenu=!!e.detail;if(pausedByMenu)running=false;else if(start.hidden&&!knockedOut)running=true;});
if(sessionStorage.getItem('apeAutoStart')==='1'){sessionStorage.removeItem('apeAutoStart');start.hidden=true;running=true;}
addEventListener('keydown',e=>{const k=e.key.toLowerCase(),qa=new URLSearchParams(location.search).has('qa');if(k==='r')location.reload();if(k==='k'&&qa)damageApe();if(k==='c'&&qa)qaCatchBanana();if(k==='h'&&qa)qaLandHive();if(k==='f'&&qa)qaFallHive();if(k==='j'&&qa)rockHitApe();if(k==='t'&&qa)tripApe();if(k==='g'&&qa)rotateWorld(.065,.018,true);if(MOVE_KEYS.includes(k))heldKeys[k]=true;});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(MOVE_KEYS.includes(k))heldKeys[k]=false;});
addEventListener('blur',()=>{for(const k of MOVE_KEYS)heldKeys[k]=false;});
requestAnimationFrame(frame);
