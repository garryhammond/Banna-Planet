import * as THREE from './node_modules/.pnpm/three@0.179.1/node_modules/three/build/three.module.js';
import { GLTFLoader } from './node_modules/.pnpm/three@0.179.1/node_modules/three/examples/jsm/loaders/GLTFLoader.js';
document.documentElement.dataset.gameModule='booting';

const canvas = document.querySelector('#game');
const start = document.querySelector('#start');
const scoreEl = document.querySelector('#score');
const levelEl = document.querySelector('#best');
const healthEl = document.querySelector('#health');
const livesEl = document.querySelector('#lives');
const debugEl = document.querySelector('#debug');
const toast = document.querySelector('#toast');
const cardTitle=document.querySelector('.card h2'),cardText=document.querySelector('.card p'),playButton=document.querySelector('#play');
let W = 390, H = 844;
const PLANET_SCALE = 1.3;
// Keep the camera increase smaller than the planet increase so the larger
// world is visibly larger/flatter in frame instead of cancelling itself out.
const CAMERA_FRAME_SCALE = 1.25;
const R = 10.5 * PLANET_SCALE;
let audioCtx=null,audioMaster=null,musicMaster=null,audioLimiter=null,musicTimer=null,musicStep=0,masterLevel=Math.max(0,Math.min(1,Number(localStorage.getItem('bpVolume')??.65))),musicLevel=Math.max(0,Math.min(1,Number(localStorage.getItem('bpMusicVolume')??.35))),soundEnabled=localStorage.getItem('bpSound')!=='off'&&masterLevel>0,musicEnabled=localStorage.getItem('bpMusic')!=='off'&&musicLevel>0,lastStepBeat=-1,soundCount=0;
const soundStatus=document.querySelector('#sound-status');
function showSoundStatus(text){if(!soundStatus)return;soundStatus.textContent=text;soundStatus.classList.add('visible');clearTimeout(showSoundStatus.timer);showSoundStatus.timer=setTimeout(()=>soundStatus.classList.remove('visible'),1700);}
async function ensureAudioContext(){if(!soundEnabled&&!musicEnabled){document.documentElement.dataset.audio='off';return false;}if(!audioCtx){audioCtx=new (window.AudioContext||window.webkitAudioContext)();audioMaster=audioCtx.createGain();musicMaster=audioCtx.createGain();audioLimiter=audioCtx.createDynamicsCompressor();audioLimiter.threshold.value=-10;audioLimiter.knee.value=8;audioLimiter.ratio.value=8;audioLimiter.attack.value=.003;audioLimiter.release.value=.16;audioMaster.connect(audioLimiter);musicMaster.connect(audioLimiter);audioLimiter.connect(audioCtx.destination);}audioMaster.gain.setTargetAtTime(soundEnabled?masterLevel*3.2:0,audioCtx.currentTime,.025);musicMaster.gain.setTargetAtTime(musicEnabled?musicLevel*1.35:0,audioCtx.currentTime,.08);if(audioCtx.state==='suspended')await audioCtx.resume();document.documentElement.dataset.audio=audioCtx.state;return audioCtx.state==='running';}
function playMusicNote(){if(!musicEnabled||!audioCtx||audioCtx.state!=='running'||!musicMaster)return;const melody=[261.63,329.63,392,329.63,293.66,349.23,440,349.23],bass=[130.81,146.83,174.61,146.83],now=audioCtx.currentTime,n=melody[musicStep%melody.length],o=audioCtx.createOscillator(),shimmer=audioCtx.createOscillator(),g=audioCtx.createGain(),sg=audioCtx.createGain();o.type='triangle';o.frequency.value=n;shimmer.type='sine';shimmer.frequency.value=n*2;g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(.13,now+.025);g.gain.exponentialRampToValueAtTime(.0001,now+.48);sg.gain.setValueAtTime(.0001,now);sg.gain.exponentialRampToValueAtTime(.032,now+.02);sg.gain.exponentialRampToValueAtTime(.0001,now+.25);o.connect(g).connect(musicMaster);shimmer.connect(sg).connect(musicMaster);o.start(now);shimmer.start(now);o.stop(now+.52);shimmer.stop(now+.28);if(musicStep%2===0){const b=audioCtx.createOscillator(),bg=audioCtx.createGain();b.type='sine';b.frequency.value=bass[(musicStep/2)%bass.length|0];bg.gain.setValueAtTime(.0001,now);bg.gain.exponentialRampToValueAtTime(.075,now+.04);bg.gain.exponentialRampToValueAtTime(.0001,now+.66);b.connect(bg).connect(musicMaster);b.start(now);b.stop(now+.7);}musicStep++;document.documentElement.dataset.music='playing';document.documentElement.dataset.musicLevel=String(musicLevel);}
function startMusicLoop(){if(!musicEnabled||musicTimer)return;playMusicNote();musicTimer=setInterval(playMusicNote,560);}
function stopMusicLoop(){if(musicTimer){clearInterval(musicTimer);musicTimer=null;}document.documentElement.dataset.music='off';}
async function startAudio(){const live=await ensureAudioContext();if(!live){showSoundStatus('🔇 Audio off');return;}if(soundEnabled)playCue('start');if(musicEnabled)startMusicLoop();showSoundStatus(`🔊 Effects ${Math.round(masterLevel*100)}% · Music ${Math.round(musicLevel*100)}%`);}
function tone(freq,duration=.12,type='sine',volume=.18,slide=1){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const now=audioCtx.currentTime,o=audioCtx.createOscillator(),g=audioCtx.createGain();o.type=type;o.frequency.setValueAtTime(freq,now);o.frequency.exponentialRampToValueAtTime(Math.max(30,freq*slide),now+duration);g.gain.setValueAtTime(.0001,now);g.gain.exponentialRampToValueAtTime(volume,now+.012);g.gain.exponentialRampToValueAtTime(.0001,now+duration);o.connect(g).connect(audioMaster);o.start(now);o.stop(now+duration+.02);}
function noise(duration=.1,volume=.08,cutoff=900){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const frames=Math.max(1,Math.floor(audioCtx.sampleRate*duration)),buffer=audioCtx.createBuffer(1,frames,audioCtx.sampleRate),data=buffer.getChannelData(0);for(let i=0;i<frames;i++)data[i]=(Math.random()*2-1)*(1-i/frames);const src=audioCtx.createBufferSource(),filter=audioCtx.createBiquadFilter(),g=audioCtx.createGain();src.buffer=buffer;filter.type='lowpass';filter.frequency.value=cutoff;g.gain.value=volume;src.connect(filter).connect(g).connect(audioMaster);src.start();}
function playCue(name){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const root=document.documentElement,trail=(root.dataset.soundTrail||'').split(',').filter(Boolean);trail.push(name);root.dataset.soundTrail=trail.slice(-16).join(',');root.dataset.lastSound=name;root.dataset.soundCount=String(++soundCount);if(name==='start')tone(520,.1,'sine',.18,1.3);else if(name==='catch'){tone(660,.11,'sine',.16,1.35);setTimeout(()=>tone(880,.13,'sine',.13,1.15),65);}else if(name==='fall'){noise(.32,.035,1500);tone(360,.28,'sine',.045,.48);}else if(name==='land'){noise(.11,.085,650);tone(105,.12,'triangle',.12,.72);}else if(name==='hit'){tone(240,.11,'square',.16,.68);setTimeout(()=>tone(145,.19,'triangle',.17,.55),55);noise(.12,.09,1050);}else if(name==='bonk'){tone(280,.18,'sine',.17,.42);setTimeout(()=>tone(520,.1,'triangle',.08,.72),45);}else if(name==='trip'){noise(.14,.08,500);tone(125,.22,'triangle',.12,.58);}else if(name==='bees'){tone(185,.32,'sawtooth',.045,1.16);setTimeout(()=>tone(224,.28,'sawtooth',.04,.86),80);}else if(name==='sting'){tone(740,.07,'square',.11,.55);setTimeout(()=>tone(310,.13,'triangle',.12,.62),45);}else if(name==='boom'){noise(.3,.12,420);tone(82,.28,'sawtooth',.1,.42);}else if(name==='step'){noise(.035,.026,360);tone(78,.035,'sine',.032,.8);}else if(name==='coconut'){noise(.12,.045,720);tone(170,.13,'triangle',.07,.75);}else if(name==='hiveWarning'){tone(145,.22,'sawtooth',.035,1.18);}else if(name==='yell'){tone(260,.1,'sawtooth',.12,1.35);setTimeout(()=>tone(190,.18,'square',.09,.7),90);}else if(name==='stomp'){noise(.1,.08,360);tone(72,.14,'triangle',.12,.62);}}
let lastRustle=0;
function playRustle(intensity){const now=performance.now();if(!soundEnabled||!audioCtx||audioCtx.state!=='running'||now-lastRustle<170)return;lastRustle=now;noise(.09,.012+Math.min(1,intensity)*.032,900+intensity*850);}
function startFallWhistle(drop){if(!soundEnabled||!audioCtx||audioCtx.state!=='running')return;const danger=['rock','log','bomb','hive'].includes(drop.type),now=audioCtx.currentTime,o=audioCtx.createOscillator(),air=audioCtx.createOscillator(),g=audioCtx.createGain(),filter=audioCtx.createBiquadFilter();o.type='sine';air.type='sine';const base=danger?2250:2550;o.frequency.value=base;air.frequency.value=base*1.018;filter.type='bandpass';filter.frequency.value=base*1.12;filter.Q.value=5.2;g.gain.value=.0001;o.connect(filter);air.connect(filter);filter.connect(g).connect(audioMaster);o.start(now);air.start(now);g.gain.exponentialRampToValueAtTime(danger?.028:.012,now+.1);drop.whistle={o,air,g,filter,danger,stopped:false};document.documentElement.dataset.lastWhistle=drop.type;}
const whistleWorldPosition=new THREE.Vector3();
function updateFallWhistle(drop){const w=drop.whistle;if(!w||w.stopped||!audioCtx)return;const now=audioCtx.currentTime,speed=Math.min(1.4,drop.vy),frequency=Math.max(w.danger?820:1020,(w.danger?2420:2720)-speed*(w.danger?1080:1200));drop.g.getWorldPosition(whistleWorldPosition);const distance=camera.position.distanceTo(whistleWorldPosition),proximity=THREE.MathUtils.clamp(1-(distance-1.1)/10.5,0,1),distanceGain=.18+Math.pow(proximity,1.35)*.82,baseGain=(w.danger?.014:.005)+speed*(w.danger?.018:.008);w.o.frequency.setTargetAtTime(frequency,now,.055);w.air.frequency.setTargetAtTime(frequency*1.018,now,.06);w.filter.frequency.setTargetAtTime(frequency*(.72+proximity*.4),now,.065);w.g.gain.setTargetAtTime(baseGain*distanceGain,now,.055);document.documentElement.dataset.whistleDistance=distance.toFixed(1);document.documentElement.dataset.whistleGain=distanceGain.toFixed(2);}
function stopFallWhistle(drop){const w=drop.whistle;if(!w||w.stopped||!audioCtx)return;w.stopped=true;const now=audioCtx.currentTime;w.g.gain.cancelScheduledValues(now);w.g.gain.setValueAtTime(Math.max(.0001,w.g.gain.value),now);w.g.gain.exponentialRampToValueAtTime(.0001,now+.12);w.o.stop(now+.14);w.air.stop(now+.14);}
addEventListener('bp-sound',e=>{soundEnabled=!!e.detail;localStorage.setItem('bpSound',soundEnabled?'on':'off');if(soundEnabled)startAudio();else if(audioMaster&&audioCtx)audioMaster.gain.setTargetAtTime(0,audioCtx.currentTime,.025);});
addEventListener('bp-volume',e=>{masterLevel=Math.max(0,Math.min(1,Number(e.detail)));localStorage.setItem('bpVolume',String(masterLevel));soundEnabled=masterLevel>0;localStorage.setItem('bpSound',soundEnabled?'on':'off');if(audioMaster&&audioCtx)audioMaster.gain.setTargetAtTime(soundEnabled?masterLevel*3.2:0,audioCtx.currentTime,.025);if(soundEnabled)ensureAudioContext();});
addEventListener('bp-music',e=>{musicEnabled=!!e.detail;localStorage.setItem('bpMusic',musicEnabled?'on':'off');if(musicEnabled){ensureAudioContext().then(ok=>{if(ok)startMusicLoop();});}else{stopMusicLoop();if(musicMaster&&audioCtx)musicMaster.gain.setTargetAtTime(0,audioCtx.currentTime,.08);}});
addEventListener('bp-music-volume',e=>{musicLevel=Math.max(0,Math.min(1,Number(e.detail)));localStorage.setItem('bpMusicVolume',String(musicLevel));musicEnabled=musicLevel>0;localStorage.setItem('bpMusic',musicEnabled?'on':'off');if(musicMaster&&audioCtx)musicMaster.gain.setTargetAtTime(musicEnabled?musicLevel*1.35:0,audioCtx.currentTime,.08);if(musicEnabled)ensureAudioContext().then(ok=>{if(ok)startMusicLoop();});else stopMusicLoop();});

const renderer = new THREE.WebGLRenderer({canvas, antialias:true, alpha:true});
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(W,H,false);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.18;

const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0x78aebf, .019);
const camera = new THREE.PerspectiveCamera(38, W/H, .1, 120);
// Close gameplay framing: the world remains a complete sphere, but the viewport
// concentrates on roughly one quarter of its surface around the camera-facing center.
camera.position.set(0,.55*CAMERA_FRAME_SCALE,11.25*CAMERA_FRAME_SCALE);
const CAMERA_LOOK = new THREE.Vector3(0,25.0*PLANET_SCALE,0);
camera.lookAt(CAMERA_LOOK);
const CLOSE_CAMERA_POSITION=camera.position.clone();
let cameraZoom=1,introZoomTimer=0,groundDetailMaterial=null;
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
const OVERVIEW_CAMERA_POSITION=CAMERA_ZOOM_FOCUS.clone().addScaledVector(CAMERA_ZOOM_DIRECTION,58*PLANET_SCALE);
document.documentElement.dataset.planetScale=String(PLANET_SCALE);
document.documentElement.dataset.cameraFrameScale=String(CAMERA_FRAME_SCALE);
function applyCameraZoom(){
  const blend=THREE.MathUtils.smoothstep(cameraZoom,0,1);
  camera.position.lerpVectors(CLOSE_CAMERA_POSITION,OVERVIEW_CAMERA_POSITION,blend);
  camera.lookAt(CAMERA_ZOOM_FOCUS);
  camera.updateProjectionMatrix();
  camera.projectionMatrix.elements[9]=.5;
  camera.projectionMatrixInverse.copy(camera.projectionMatrix).invert();
  scene.fog.density=THREE.MathUtils.lerp(.019,.0038,blend);
  if(groundDetailMaterial)groundDetailMaterial.opacity=THREE.MathUtils.lerp(.72,.08,blend);
  document.documentElement.dataset.zoom=(cameraZoom*100).toFixed(0);
}
function resizeGame(){
  const box=canvas.getBoundingClientRect();W=Math.max(1,Math.round(box.width));H=Math.max(1,Math.round(box.height));
  renderer.setSize(W,H,false);camera.aspect=W/H;camera.fov=camera.aspect<.7?52:38;applyCameraZoom();
}
resizeGame();addEventListener('resize',resizeGame);

scene.add(new THREE.HemisphereLight(0xb9dcff,0x173412,1.35));
const sun = new THREE.DirectionalLight(0xffd08a,3.7);
sun.position.set(-5,8,9); sun.castShadow=true;
sun.shadow.mapSize.set(2048,2048); sun.shadow.camera.left=-20; sun.shadow.camera.right=20;
sun.shadow.camera.top=20; sun.shadow.camera.bottom=-20;sun.shadow.bias=-.00015;sun.shadow.normalBias=.035; scene.add(sun);
const rim = new THREE.DirectionalLight(0x72bfff,1.55); rim.position.set(7,3,-6); scene.add(rim);
// A soft camera-side key keeps the hero and foreground props readable instead
// of becoming silhouettes against the bright storybook sky.
const heroKey = new THREE.DirectionalLight(0xffd2a0,3.25); heroKey.position.set(-1.5,4.5,10); scene.add(heroKey);
const faceFill = new THREE.PointLight(0xffe4c4,13,34,1.8); faceFill.position.set(0,3,9); scene.add(faceFill);

const world = new THREE.Group(); scene.add(world);
function makeGroundTexture(){
  const c=document.createElement('canvas');c.width=2048;c.height=1024;const q=c.getContext('2d'),W=c.width,H=c.height;
  let seed=7391;const rand=()=>((seed=(seed*1664525+1013904223)>>>0)/4294967296),blob=(cx,cy,rx,ry,points,color)=>{for(const ox of [-W,0,W]){q.beginPath();for(let i=0;i<points;i++){const a=i/points*Math.PI*2,j=.7+rand()*.45,x=cx+ox+Math.cos(a)*rx*j,y=cy+Math.sin(a)*ry*(.75+rand()*.4);if(i===0)q.moveTo(x,y);else q.lineTo(x,y);}q.closePath();q.fillStyle=color;q.fill();}};
  const grad=q.createLinearGradient(0,0,W,H);grad.addColorStop(0,'#75952a');grad.addColorStop(.38,'#5d7f22');grad.addColorStop(.72,'#45681d');grad.addColorStop(1,'#304d19');q.fillStyle=grad;q.fillRect(0,0,W,H);
  // Broad moss islands make the sphere organic without obvious texture tiling.
  q.globalAlpha=.08;for(let i=0;i<220;i++)blob(rand()*W,rand()*H,12+rand()*48,8+rand()*28,12,rand()>.5?'#a0b23e':'#294f1d');q.globalAlpha=1;
  // Embedded clearings and two worn winding routes, all painted into the globe.
  for(let i=0;i<9;i++){q.globalAlpha=.68+rand()*.16;blob(rand()*W,90+rand()*(H-180),34+rand()*78,20+rand()*52,16,rand()>.45?'#7c5935':'#68482d');}
  q.lineCap='round';q.lineJoin='round';for(let route=0;route<2;route++){q.strokeStyle=route?'#705033':'#80603a';q.globalAlpha=.72;q.lineWidth=18+route*8;q.beginPath();q.moveTo(-80,260+route*390);for(let x=0;x<=W+160;x+=170)q.lineTo(x,250+route*390+Math.sin(x*.007+route*2.1)*95+Math.sin(x*.019)*24);q.stroke();q.strokeStyle='#aa8851';q.globalAlpha=.18;q.lineWidth=7;q.stroke();}
  // Moss fringe softens every soil edge and keeps paths planted in the turf.
  q.globalAlpha=.54;for(let i=0;i<12000;i++){const x=rand()*W,y=rand()*H,r=1.5+rand()*6.5;q.fillStyle=rand()>.58?'#aabd42':'#28551b';q.beginPath();q.ellipse(x,y,r*1.7,r,.3+rand(),0,Math.PI*2);q.fill();}
  q.lineWidth=1.2;for(let i=0;i<7000;i++){const x=rand()*W,y=rand()*H,l=2+rand()*9;q.globalAlpha=.2+rand()*.38;q.strokeStyle=rand()>.52?'#b8cb4c':'#244f1a';q.beginPath();q.moveTo(x,y);q.lineTo(x+(rand()-.5)*4,y-l);q.stroke();}
  // Pebbles, clover flecks, sprouts and tiny flower color notes are baked into
  // the surface; existing hero flowers/grass remain as sparse 3D accents.
  q.globalAlpha=.9;for(let i=0;i<1600;i++){const x=rand()*W,y=rand()*H,r=1.4+rand()*4.2;q.fillStyle=rand()>.5?'#665c46':'#a08d61';q.beginPath();q.ellipse(x,y,r*1.25,r,.4+rand(),0,Math.PI*2);q.fill();}
  for(let i=0;i<520;i++){const x=rand()*W,y=rand()*H,s=1.5+rand()*3;q.fillStyle=rand()>.25?'#527d25':'#8fac3a';for(let k=0;k<3;k++){const a=k/3*Math.PI*2;q.beginPath();q.ellipse(x+Math.cos(a)*s,y+Math.sin(a)*s,s,s*.62,a,0,Math.PI*2);q.fill();}}
  const flowerColors=['#f5c64f','#ef8950','#dc79a2','#f4e5bd'];for(let i=0;i<130;i++){q.fillStyle=flowerColors[i%flowerColors.length];q.beginPath();q.arc(rand()*W,rand()*H,1.5+rand()*2,0,Math.PI*2);q.fill();}
  q.globalAlpha=1;const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.wrapS=THREE.RepeatWrapping;tex.wrapT=THREE.ClampToEdgeWrapping;tex.repeat.set(1,1);tex.anisotropy=renderer.capabilities.getMaxAnisotropy();return tex;
}
const groundTexture=new THREE.TextureLoader().load('assets/mossy-globe-ground-v1.png');groundTexture.colorSpace=THREE.SRGBColorSpace;groundTexture.wrapS=groundTexture.wrapT=THREE.RepeatWrapping;groundTexture.repeat.set(1.72,1.38);groundTexture.offset.set(.137,.083);groundTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();groundTexture.magFilter=THREE.LinearFilter;groundTexture.minFilter=THREE.LinearMipmapLinearFilter;
const globeMat = new THREE.MeshPhysicalMaterial({color:0xbddf9b,map:groundTexture,bumpMap:groundTexture,bumpScale:.052,roughness:.94,metalness:0,clearcoat:.02,clearcoatRoughness:.92});
const globe = new THREE.Mesh(new THREE.SphereGeometry(R,96,64),globeMat);
// Move the equirectangular texture poles away from the low gameplay camera;
// the sphere remains geometrically identical and gameplay coordinates do not change.
globe.rotation.x=.28;
globe.receiveShadow=true; world.add(globe);
const groundDetailTexture=groundTexture.clone();groundDetailTexture.needsUpdate=true;groundDetailTexture.wrapS=groundDetailTexture.wrapT=THREE.RepeatWrapping;groundDetailTexture.repeat.set(4.6,3.4);groundDetailTexture.offset.set(.271,.193);groundDetailTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();groundDetailTexture.minFilter=THREE.LinearMipmapLinearFilter;groundDetailTexture.magFilter=THREE.LinearFilter;
groundDetailMaterial=new THREE.MeshPhysicalMaterial({color:0xb9dd8b,map:groundDetailTexture,bumpMap:groundDetailTexture,bumpScale:.034,roughness:.92,transparent:true,opacity:.72,depthWrite:false,polygonOffset:true,polygonOffsetFactor:-1,polygonOffsetUnits:-1});
const groundDetail=new THREE.Mesh(new THREE.SphereGeometry(R+.004,96,64),groundDetailMaterial);groundDetail.rotation.copy(globe.rotation);groundDetail.receiveShadow=false;world.add(groundDetail);
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
const brown = new THREE.MeshPhysicalMaterial({color:0xb86b31,map:barkTexture,bumpMap:barkTexture,bumpScale:.045,roughness:.9,clearcoat:.04,clearcoatRoughness:.85});
const bark = new THREE.MeshPhysicalMaterial({color:0xa95c2b,map:barkTexture,bumpMap:barkTexture,bumpScale:.065,roughness:.94,clearcoat:.025,clearcoatRoughness:.9});
const leaf = new THREE.MeshPhysicalMaterial({color:0x86a92d,map:leafTexture,bumpMap:leafTexture,bumpScale:.018,roughness:.72,clearcoat:.16,clearcoatRoughness:.66,side:THREE.DoubleSide});
const leaf2 = new THREE.MeshPhysicalMaterial({color:0xa8c43b,map:leafTexture2,bumpMap:leafTexture2,bumpScale:.016,roughness:.68,clearcoat:.18,clearcoatRoughness:.62,side:THREE.DoubleSide});
const rockMat = new THREE.MeshPhysicalMaterial({color:0xe7dfcb,map:rockTexture,bumpMap:rockTexture,bumpScale:.075,roughness:.93,flatShading:true,clearcoat:.035,clearcoatRoughness:.9});
const moss = new THREE.MeshStandardMaterial({color:0x719a45,map:leafTexture2,bumpMap:leafTexture2,bumpScale:.025,roughness:1});
const pathMat = new THREE.MeshStandardMaterial({color:0x9a6537,map:dirtTexture,bumpMap:dirtTexture,bumpScale:.05,roughness:.98,transparent:true,opacity:.9});
const pathDarkMat = new THREE.MeshStandardMaterial({color:0x654126,map:dirtTexture,bumpMap:dirtTexture,bumpScale:.065,roughness:1,transparent:true,opacity:.76});
const modelTemplates=new Map(),modelSlots=new Map([['Palm',[]],['Rock',[]],['Log',[]]]);
function applyModelAsset(slot,name){const source=modelTemplates.get(name);if(!source)return;slot.clear();const model=source.clone(true);model.position.set(0,0,0);model.quaternion.identity();model.scale.set(1,1,1);model.traverse(o=>{if(!o.isMesh)return;o.castShadow=true;o.receiveShadow=true;const n=o.material?.name||'';if(n.startsWith('Leaf'))o.material=n==='LeafDark'?leaf:leaf2;else if(n==='Bark')o.material=bark;else if(n==='BarkBands')o.material=brown;else if(n.startsWith('Stone'))o.material=rockMat;else if(n==='CutWood')o.material=brown;});slot.add(model);}
function hydrateModelAsset(slot,name){modelSlots.get(name).push(slot);if(modelTemplates.has(name))applyModelAsset(slot,name);}
new GLTFLoader().load('assets/models/jungle-core.glb',gltf=>{for(const name of ['Palm','Rock','Log']){const found=gltf.scene.getObjectByName(name);if(found){modelTemplates.set(name,found);for(const slot of modelSlots.get(name))applyModelAsset(slot,name);}}document.documentElement.dataset.jungleAssets='ready';},error=>{console.warn('Jungle GLB fallback active',error);document.documentElement.dataset.jungleAssets='fallback';});
const props=[],foliageDecor=[];let foliageCullFrame=0;
const MAX_LANDED_PROPS=40;
const landedProps=[];
function removeLandedProp(entry){const landedIndex=landedProps.indexOf(entry),propIndex=props.indexOf(entry);if(landedIndex>=0)landedProps.splice(landedIndex,1);if(propIndex>=0)props.splice(propIndex,1);world.remove(entry.group);}
function addLandedProp(entry){entry.groundTime=0;entry.life=12;props.push(entry);landedProps.push(entry);if(landedProps.length>MAX_LANDED_PROPS)removeLandedProp(landedProps[0]);}
function updateLandedProps(dt){
  for(let i=landedProps.length-1;i>=0;i--){const p=landedProps[i];p.groundTime+=dt;
    if(p.kind==='log'&&p.rollDirection&&p.groundTime<1.8){
      const speed=.17*(1-p.groundTime/1.8),step=speed*dt,axis=new THREE.Vector3().crossVectors(p.n,p.rollDirection).normalize();p.n.applyAxisAngle(axis,step).normalize();p.rollDirection.addScaledVector(p.n,-p.rollDirection.dot(p.n)).normalize();p.rollAngle+=step/.09;
      const logAxis=new THREE.Vector3().crossVectors(p.n,p.rollDirection).normalize(),basis=new THREE.Matrix4().makeBasis(logAxis,p.n,p.rollDirection);p.group.position.copy(p.n).multiplyScalar(R+.015);p.group.quaternion.setFromRotationMatrix(basis);p.group.rotateX(p.rollAngle);
    }
    // Logs and rocks remain genuine obstacles for several seconds, then blink
    // quickly before cleanup so their removal never surprises the player.
    p.group.visible=p.groundTime<10.3||Math.floor((p.groundTime-10.3)*12)%2===0;
    if(p.baseScale&&p.groundTime>10.3)p.group.scale.copy(p.baseScale).multiplyScalar(Math.max(.05,1-(p.groundTime-10.3)/1.7));
    if(p.groundTime>=p.life)removeLandedProp(p);
  }
}
const UP = new THREE.Vector3(0,1,0);
const tmp = new THREE.Vector3();

function normalAt(lat,lon){ return new THREE.Vector3(Math.cos(lat)*Math.sin(lon),Math.sin(lat),Math.cos(lat)*Math.cos(lon)).normalize(); }
function plant(group,n,embed=.025){
  group.position.copy(n).multiplyScalar(R-embed);
  group.quaternion.setFromUnitVectors(UP,n);
  world.add(group);
}
function shadowify(o){o.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});return o;}
const referenceFrondShape=new THREE.Shape();referenceFrondShape.moveTo(0,0);for(const p of [[-.055,.08],[-.1,.16],[-.085,.23],[-.135,.32],[-.112,.4],[-.155,.5],[-.125,.58],[-.145,.68],[-.105,.76],[-.115,.84],[-.055,.91],[0,1.04],[.055,.91],[.115,.84],[.105,.76],[.145,.68],[.125,.58],[.155,.5],[.112,.4],[.135,.32],[.085,.23],[.1,.16],[.055,.08]])referenceFrondShape.lineTo(p[0],p[1]);referenceFrondShape.closePath();
function makePalmLeafTexture(){const c=document.createElement('canvas');c.width=c.height=256;const x=c.getContext('2d'),grad=x.createLinearGradient(0,256,0,0);grad.addColorStop(0,'#274b19');grad.addColorStop(.46,'#4f7520');grad.addColorStop(1,'#78952e');x.fillStyle=grad;x.fillRect(0,0,256,256);x.strokeStyle='rgba(24,55,14,.78)';x.lineWidth=7;x.beginPath();x.moveTo(128,256);x.lineTo(128,0);x.stroke();x.lineWidth=3;for(let y=34;y<235;y+=25){const half=42+Math.sin(y*.07)*10;x.beginPath();x.moveTo(128,y+13);x.lineTo(128-half,y-8);x.moveTo(128,y+13);x.lineTo(128+half,y-8);x.stroke();}x.strokeStyle='rgba(181,207,83,.2)';x.lineWidth=2;for(let y=18;y<240;y+=31){x.beginPath();x.moveTo(132,y+18);x.lineTo(205,y);x.stroke();}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
function makeCoconutHuskTexture(){const c=document.createElement('canvas');c.width=c.height=192;const x=c.getContext('2d'),grad=x.createRadialGradient(65,45,8,96,96,118);grad.addColorStop(0,'#b0a84c');grad.addColorStop(.48,'#6f7b2b');grad.addColorStop(1,'#3e451d');x.fillStyle=grad;x.fillRect(0,0,192,192);for(let i=0;i<38;i++){x.strokeStyle=`rgba(${72+i%3*18},${55+i%4*9},${21+i%2*8},${.12+(i%5)*.025})`;x.lineWidth=1+(i%3);x.beginPath();const px=(i*47)%192;x.moveTo(px,0);x.bezierCurveTo(px+18*Math.sin(i),55,px-13*Math.cos(i*.7),135,px+8,192);x.stroke();}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const palmLeafTexture=makePalmLeafTexture(),coconutHuskTexture=makeCoconutHuskTexture(),referenceFrondGeo=new THREE.ExtrudeGeometry(referenceFrondShape,{depth:.026,bevelEnabled:true,bevelSegments:2,bevelSize:.01,bevelThickness:.009});
{const pos=referenceFrondGeo.attributes.position;for(let i=0;i<pos.count;i++){const y=THREE.MathUtils.clamp(pos.getY(i),0,1.04),u=y/1.04,x=pos.getX(i),edge=Math.min(1,Math.abs(x)/.16);pos.setZ(i,pos.getZ(i)+Math.sin(u*Math.PI)*.055-u*u*.095+edge*.012);}pos.needsUpdate=true;referenceFrondGeo.computeVertexNormals();referenceFrondGeo.computeBoundingSphere();}
const palmLeafDark=new THREE.MeshPhysicalMaterial({color:0x53751d,map:palmLeafTexture,bumpMap:palmLeafTexture,bumpScale:.018,roughness:.78,clearcoat:.08,clearcoatRoughness:.76,sheen:.12,sheenColor:new THREE.Color(0x789532),side:THREE.DoubleSide}),palmLeafLight=new THREE.MeshPhysicalMaterial({color:0x789b28,map:palmLeafTexture,bumpMap:palmLeafTexture,bumpScale:.015,roughness:.74,clearcoat:.1,clearcoatRoughness:.72,sheen:.16,sheenColor:new THREE.Color(0xa4b950),side:THREE.DoubleSide}),palmVeinMat=new THREE.MeshStandardMaterial({color:0x395914,roughness:.9});
function enhancePalmCrown(crown){if(crown.userData.referenceEnhanced)return;crown.userData.referenceEnhanced=true;for(const child of crown.children)if(child.name.startsWith('Frond_'))child.visible=false;const layered=new THREE.Group();layered.name='ReferenceFronds';
  for(let i=0;i<19;i++){const lower=i<11,count=lower?11:8,j=lower?i:i-11,a=j/count*Math.PI*2+(lower?0:.17),frond=new THREE.Group(),blade=new THREE.Mesh(referenceFrondGeo,i%3?palmLeafDark:palmLeafLight);blade.castShadow=true;blade.receiveShadow=true;frond.add(blade);const vein=new THREE.Mesh(new THREE.CylinderGeometry(.011,.017,.91,6),palmVeinMat);vein.position.set(0,.455,.026);frond.add(vein);frond.rotation.order='YXZ';frond.rotation.y=-a;frond.rotation.x=lower?-.98-(i%3)*.06:-.58-(i%2)*.08;frond.rotation.z=(i%2?.08:-.08)+(i%4-1.5)*.025;const length=lower?.98+(i%4)*.06:.72+(i%3)*.055;frond.scale.set(lower?1.04:.9,length,1);layered.add(frond);}
  crown.add(layered);
}
function makeJungleLeafTexture(){const c=document.createElement('canvas');c.width=192;c.height=256;const x=c.getContext('2d'),grad=x.createLinearGradient(0,256,0,0);grad.addColorStop(0,'#214518');grad.addColorStop(.48,'#4e7d26');grad.addColorStop(1,'#88a83c');x.fillStyle=grad;x.fillRect(0,0,192,256);x.strokeStyle='rgba(25,58,17,.82)';x.lineWidth=7;x.beginPath();x.moveTo(96,256);x.lineTo(96,0);x.stroke();for(let y=28;y<235;y+=24){const width=70*Math.sin(y/256*Math.PI);x.lineWidth=2.4;x.beginPath();x.moveTo(96,y+10);x.lineTo(96-width,y-7);x.moveTo(96,y+10);x.lineTo(96+width,y-7);x.stroke();}for(let i=0;i<70;i++){x.fillStyle=`rgba(${125+i%3*18},${153+i%4*12},${48+i%2*9},${.035+(i%5)*.012})`;x.beginPath();x.arc((i*71)%192,(i*43)%256,1+(i%3),0,Math.PI*2);x.fill();}const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;return tex;}
const jungleLeafShape=new THREE.Shape();jungleLeafShape.moveTo(0,0);for(let i=1;i<=10;i++){const y=i/10,width=Math.sin(y*Math.PI)*(.18-(i%2)*.018);jungleLeafShape.lineTo(-width,y);}jungleLeafShape.lineTo(0,1.08);for(let i=9;i>=1;i--){const y=i/10,width=Math.sin(y*Math.PI)*(.18-(i%2)*.018);jungleLeafShape.lineTo(width,y);}jungleLeafShape.closePath();
const jungleLeafGeometry=new THREE.ExtrudeGeometry(jungleLeafShape,{depth:.018,bevelEnabled:true,bevelSegments:1,bevelSize:.008,bevelThickness:.007});{const pos=jungleLeafGeometry.attributes.position;for(let i=0;i<pos.count;i++){const y=THREE.MathUtils.clamp(pos.getY(i),0,1.08),u=y/1.08,x=pos.getX(i);pos.setZ(i,pos.getZ(i)+Math.sin(u*Math.PI)*.045+Math.abs(x)*.035-u*u*.035);}pos.needsUpdate=true;jungleLeafGeometry.computeVertexNormals();}
const jungleLeafTexture=makeJungleLeafTexture(),jungleLeafDark=new THREE.MeshPhysicalMaterial({color:0x496f25,map:jungleLeafTexture,bumpMap:jungleLeafTexture,bumpScale:.018,roughness:.8,clearcoat:.06,clearcoatRoughness:.82,sheen:.1,sheenColor:new THREE.Color(0x789843),side:THREE.DoubleSide}),jungleLeafLight=new THREE.MeshPhysicalMaterial({color:0x719534,map:jungleLeafTexture,bumpMap:jungleLeafTexture,bumpScale:.014,roughness:.76,clearcoat:.08,clearcoatRoughness:.78,sheen:.15,sheenColor:new THREE.Color(0xa3b95a),side:THREE.DoubleSide});
function makeBushLeafTexture(){const c=document.createElement('canvas');c.width=256;c.height=384;const x=c.getContext('2d'),grad=x.createLinearGradient(0,384,256,0);grad.addColorStop(0,'#173812');grad.addColorStop(.34,'#2e691e');grad.addColorStop(.72,'#5e982f');grad.addColorStop(1,'#9ac64c');x.fillStyle=grad;x.fillRect(0,0,256,384);const shine=x.createLinearGradient(0,0,256,0);shine.addColorStop(0,'rgba(205,240,132,.03)');shine.addColorStop(.38,'rgba(224,251,156,.22)');shine.addColorStop(.62,'rgba(255,255,210,.08)');shine.addColorStop(1,'rgba(12,48,12,.18)');x.fillStyle=shine;x.fillRect(0,0,256,384);x.strokeStyle='rgba(164,207,74,.95)';x.lineWidth=9;x.beginPath();x.moveTo(128,384);x.quadraticCurveTo(132,205,128,3);x.stroke();for(let y=42;y<357;y+=31){const w=91*Math.sin(y/384*Math.PI);x.strokeStyle='rgba(42,91,28,.72)';x.lineWidth=3;x.beginPath();x.moveTo(128,y+14);x.quadraticCurveTo(91,y+1,128-w,y-14);x.moveTo(128,y+14);x.quadraticCurveTo(165,y+1,128+w,y-14);x.stroke();x.strokeStyle='rgba(190,226,105,.16)';x.lineWidth=1.5;x.beginPath();x.moveTo(128,y+10);x.lineTo(128-w*.82,y-10);x.moveTo(128,y+10);x.lineTo(128+w*.82,y-10);x.stroke();}for(let i=0;i<95;i++){x.fillStyle=`rgba(218,241,143,${.018+(i%5)*.009})`;x.beginPath();x.ellipse((i*83)%256,(i*47)%384,1+i%3,3+i%5,(i%7)*.12,0,Math.PI*2);x.fill();}const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.anisotropy=4;return t;}
function makeCurvedBroadLeafGeometry(){const across=8,along=14,positions=[],uvs=[],indices=[];for(let j=0;j<=along;j++){const t=j/along,width=Math.pow(Math.sin(Math.PI*Math.pow(t,.88)),.72)*.38*(.94+.06*Math.sin(t*Math.PI*5)),centerY=t*1.16,arch=.18*Math.sin(t*Math.PI)-.13*t*t;for(let i=0;i<=across;i++){const s=i/across*2-1,x=s*width,edgeCurl=.075*Math.pow(Math.abs(s),1.75)*(1-.25*t),ripple=.012*Math.sin(t*Math.PI*6+s*2.2);positions.push(x,centerY,arch+edgeCurl+ripple);uvs.push(i/across,t);}}for(let j=0;j<along;j++)for(let i=0;i<across;i++){const a=j*(across+1)+i,b=a+1,c=a+across+1,d=c+1;indices.push(a,c,b,b,c,d);}const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.Float32BufferAttribute(positions,3));g.setAttribute('uv',new THREE.Float32BufferAttribute(uvs,2));g.setIndex(indices);g.computeVertexNormals();return g;}
const bushLeafGeometry=makeCurvedBroadLeafGeometry();
const bushLeafTexture=makeBushLeafTexture(),bushLeafDark=new THREE.MeshPhysicalMaterial({color:0x174510,map:bushLeafTexture,bumpMap:bushLeafTexture,bumpScale:.018,roughness:.58,clearcoat:.18,clearcoatRoughness:.58,sheen:.08,sheenColor:new THREE.Color(0x46772a),side:THREE.DoubleSide}),bushLeafLight=new THREE.MeshPhysicalMaterial({color:0x397b20,map:bushLeafTexture,bumpMap:bushLeafTexture,bumpScale:.016,roughness:.5,clearcoat:.24,clearcoatRoughness:.5,sheen:.12,sheenColor:new THREE.Color(0x8caf4e),side:THREE.DoubleSide});
const bushStemGeometry=new THREE.CylinderGeometry(.009,.017,1,5),bushStemMaterial=new THREE.MeshStandardMaterial({color:0x244416,roughness:.96}),bushVeinGeometry=new THREE.CylinderGeometry(.007,.014,1.03,5);bushVeinGeometry.translate(0,.515,.035);const bushVeinMaterial=new THREE.MeshStandardMaterial({color:0x4f7927,roughness:.76}),bushBudGeometry=new THREE.SphereGeometry(.025,7,5),bushBudPink=new THREE.MeshStandardMaterial({color:0xff799e,roughness:.75}),bushBudGold=new THREE.MeshStandardMaterial({color:0xffc84f,roughness:.75});
const bushCardTexture=new THREE.TextureLoader().load('assets/tropical-rosette-bush-v1.png');bushCardTexture.colorSpace=THREE.SRGBColorSpace;bushCardTexture.anisotropy=renderer.capabilities.getMaxAnisotropy();const bushCardGeometry=new THREE.PlaneGeometry(1.35,.9,1,1);bushCardGeometry.translate(0,.45,0);const bushCardMaterial=new THREE.MeshBasicMaterial({map:bushCardTexture,transparent:true,alphaTest:.08,side:THREE.DoubleSide,depthWrite:true,toneMapped:false});
function tree(n,s=1){
  const g=new THREE.Group();
  const trunk=new THREE.Mesh(new THREE.CylinderGeometry(.13,.23,1.5,9),bark); trunk.position.y=.68; g.add(trunk);
  for(let i=0;i<5;i++){const root=new THREE.Mesh(new THREE.ConeGeometry(.09,.46,6),bark),a=i/5*Math.PI*2;root.position.set(Math.cos(a)*.16,.05,Math.sin(a)*.16);root.rotation.z=Math.PI/2;root.rotation.y=-a;root.scale.z=.55;g.add(root);}
  const crown=new THREE.Group();crown.name='Jungle_Crown';crown.position.y=1.46;const anchors=[];
  // A broad, readable fork carries the canopy like the reference tree instead
  // of letting the foliage sit on a bundle of thin, invisible twigs.
  for(let i=0;i<3;i++){const side=i-1,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,-.3,side*.025),new THREE.Vector3(side*.08,-.08,side*.055),new THREE.Vector3(side*.2,.1,side*.075),new THREE.Vector3(side*.34,.25,side*.1)]),limb=new THREE.Mesh(new THREE.TubeGeometry(curve,12,.075-Math.abs(side)*.007,8,false),bark);limb.castShadow=limb.receiveShadow=true;crown.add(limb);}
  for(let i=0;i<21;i++){const a=i/20*Math.PI*2,top=i>=20,r=top?0:.73+(i%5)*.045,end=new THREE.Vector3(top?0:Math.cos(a)*r,top?.9:.1+(i%5)*.07,top?0:Math.sin(a)*r);anchors.push(end);const branchLength=end.length(),branch=new THREE.Mesh(new THREE.CylinderGeometry(.048,.09,branchLength,8),bark);branch.position.copy(end).multiplyScalar(.5);branch.quaternion.setFromUnitVectors(UP,end.clone().normalize());branch.castShadow=branch.receiveShadow=true;crown.add(branch);}
  const leafCount=320,darkLeaves=new THREE.InstancedMesh(jungleLeafGeometry,jungleLeafDark,leafCount/2),lightLeaves=new THREE.InstancedMesh(jungleLeafGeometry,jungleLeafLight,leafCount/2),dummy=new THREE.Object3D(),dir=new THREE.Vector3();let di=0,li=0;
  for(let i=0;i<leafCount;i++){const anchor=anchors[i%anchors.length],a=i*.73+(i%anchors.length)*.49,spread=.15+(i%8)*.02,tier=i%15<5?.19:i%15>10?-.17:0;dummy.position.copy(anchor).add(new THREE.Vector3(Math.cos(a)*spread,(i%11-5)*.029+tier,Math.sin(a)*spread));dir.set(Math.cos(a)*(.7+(i%3)*.12),.1+(i%6)*.052,Math.sin(a)*(.7+(i%3)*.12)).normalize();dummy.quaternion.setFromUnitVectors(UP,dir);dummy.rotateY((i%9-4)*.09);dummy.scale.set(.4+(i%4)*.037,.34+(i%6)*.028,.72+(i%3)*.076);dummy.updateMatrix();if(i%2)darkLeaves.setMatrixAt(di++,dummy.matrix);else lightLeaves.setMatrixAt(li++,dummy.matrix);}
  darkLeaves.castShadow=darkLeaves.receiveShadow=lightLeaves.castShadow=lightLeaves.receiveShadow=true;darkLeaves.instanceMatrix.needsUpdate=lightLeaves.instanceMatrix.needsUpdate=true;crown.add(darkLeaves,lightLeaves);
  g.add(crown); g.scale.setScalar(s); plant(shadowify(g),n,.08);
  props.push({kind:'tree',style:'jungle',n,radius:.28*s,group:g,baseQuaternion:g.quaternion.clone(),sway:new THREE.Vector2(),swayVelocity:new THREE.Vector2()});
}
function palm(n,s=.8){
  const g=new THREE.Group();
  const trunkCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.035,.5,0),new THREE.Vector3(.11,1.08,.015),new THREE.Vector3(.2,1.65,0)]),trunk=new THREE.Mesh(new THREE.TubeGeometry(trunkCurve,24,.09,9,false),bark);g.add(trunk);
  for(let i=0;i<10;i++){const band=new THREE.Mesh(new THREE.TorusGeometry(.098-i*.0022,.014,5,10),brown);band.position.copy(trunkCurve.getPoint(.055+i*.085));band.rotation.x=Math.PI/2;band.rotation.z=-.08;g.add(band);}
  const crown=new THREE.Group();crown.position.set(.2,1.65,0);
  const frondShape=new THREE.Shape();frondShape.moveTo(0,0);frondShape.lineTo(-.08,.1);frondShape.lineTo(-.19,.18);frondShape.lineTo(-.11,.24);frondShape.lineTo(-.22,.34);frondShape.lineTo(-.12,.4);frondShape.lineTo(-.2,.51);frondShape.lineTo(-.1,.57);frondShape.lineTo(-.16,.68);frondShape.lineTo(-.07,.73);frondShape.lineTo(-.1,.83);frondShape.lineTo(0,.98);frondShape.lineTo(.1,.83);frondShape.lineTo(.07,.73);frondShape.lineTo(.16,.68);frondShape.lineTo(.1,.57);frondShape.lineTo(.2,.51);frondShape.lineTo(.12,.4);frondShape.lineTo(.22,.34);frondShape.lineTo(.11,.24);frondShape.lineTo(.19,.18);frondShape.lineTo(.08,.1);frondShape.closePath();
  const frondGeo=new THREE.ShapeGeometry(frondShape,5);frondGeo.translate(0,.02,0);
  for(let i=0;i<13;i++){const a=i/13*Math.PI*2,frond=new THREE.Mesh(frondGeo,i%2?leaf:leaf2);frond.rotation.order='YXZ';frond.rotation.y=-a;frond.rotation.x=-Math.PI/2+.58+(i%3)*.065;frond.rotation.z=(i%2-.5)*.08;frond.scale.set(1.04+(i%4)*.05,1.02+(i%3)*.06,1);crown.add(frond);const vein=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.95,6),new THREE.MeshStandardMaterial({color:0x315f22,roughness:.92}));vein.position.set(Math.sin(a)*.43,.12,Math.cos(a)*.43);vein.rotation.z=Math.PI/2;vein.rotation.y=a;vein.rotation.x=.12;crown.add(vein);}
  for(let i=0;i<5;i++){const nut=new THREE.Mesh(new THREE.SphereGeometry(.082,12,9),new THREE.MeshPhysicalMaterial({color:0x789126,roughness:.78}));const a=i/5*Math.PI*2;nut.position.set(Math.cos(a)*.105,-.09,Math.sin(a)*.105);nut.scale.set(.82,1.12,.82);crown.add(nut);}g.add(crown);
  // Keep the replaceable GLB model in its own slot so a permanent planted base
  // survives asynchronous asset hydration.
  const modelSlot=new THREE.Group();for(const child of [...g.children])modelSlot.add(child);g.add(modelSlot);hydrateModelAsset(modelSlot,'Palm');
  const baseRockMat=rockMat.clone(),baseLeafMat=leaf.clone();for(let i=0;i<5;i++){const a=i/5*Math.PI*2,stone=new THREE.Mesh(new THREE.DodecahedronGeometry(.09+(i%2)*.025,0),baseRockMat);stone.position.set(Math.cos(a)*(.18+(i%2)*.04),.045,Math.sin(a)*(.18+(i%2)*.04));stone.scale.y=.72;g.add(stone);}for(let i=0;i<7;i++){const a=i/7*Math.PI*2,blade=new THREE.Mesh(new THREE.ConeGeometry(.025,.2+(i%3)*.035,5),baseLeafMat);blade.position.set(Math.cos(a)*.21,.1,Math.sin(a)*.21);blade.rotation.z=(i%2?1:-1)*.18;g.add(blade);}if(Math.floor(Math.abs(n.x+n.z)*100)%3===0){const bloom=new THREE.Mesh(new THREE.SphereGeometry(.035,8,6),new THREE.MeshStandardMaterial({color:0xff7fa5,roughness:.7}));bloom.position.set(.2,.11,.08);g.add(bloom);}
  g.scale.setScalar(s);plant(shadowify(g),n,.07);props.push({kind:'tree',style:'palm',n,radius:.2*s,group:g,baseQuaternion:g.quaternion.clone(),sway:new THREE.Vector2(),swayVelocity:new THREE.Vector2()});
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
  hydrateModelAsset(g,'Rock');g.scale.setScalar(s);plant(shadowify(g),n,.06);props.push({kind:'rock',n,radius:.18*s,group:g});
}
function log(n,s=.55){
  const g=new THREE.Group(); const m=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,1.45,12),brown);
  m.rotation.z=Math.PI/2;m.position.y=.22;g.add(m);
  const cutMat=new THREE.MeshStandardMaterial({color:0xc98745,roughness:.92}),ringMat=new THREE.MeshStandardMaterial({color:0x71401f,roughness:.95});
  for(const z of [-.73,.73]){const end=new THREE.Mesh(new THREE.CylinderGeometry(.225,.225,.018,12),cutMat);end.rotation.z=Math.PI/2;end.position.x=z;g.add(end);for(const rr of [.07,.13,.19]){const ring=new THREE.Mesh(new THREE.TorusGeometry(rr,.009,5,20),ringMat);ring.rotation.y=Math.PI/2;ring.position.x=z+(z>0?.012:-.012);g.add(ring);}}
  for(let i=0;i<3;i++){const knot=new THREE.Mesh(new THREE.CylinderGeometry(.035,.055,.07,7),ringMat);knot.position.set(-.3+i*.31,.42,(i%2-.5)*.18);knot.rotation.z=.3;g.add(knot);}
  hydrateModelAsset(g,'Log');g.scale.setScalar(s);plant(shadowify(g),n,.06);props.push({kind:'log',n,radius:.48*s,group:g});
}
function foliage(n,s=.3){
  const g=new THREE.Group(),cards=new THREE.InstancedMesh(bushCardGeometry,bushCardMaterial,3),dummy=new THREE.Object3D();
  // Three intersecting transparent cards preserve the reference silhouette
  // from changing globe angles while remaining a single draw-call bush asset.
  for(let i=0;i<3;i++){dummy.position.set(i===0?0:(i===1?.025:-.025),i===0?.015:0,i===0?.012:-.012);dummy.rotation.set(0,i===0?0:(i===1?1.03:-1.03),0);dummy.scale.set(i===0?1:0.91,i===0?1:0.94,1);dummy.updateMatrix();cards.setMatrixAt(i,dummy.matrix);}cards.instanceMatrix.needsUpdate=true;cards.castShadow=false;cards.receiveShadow=false;g.add(cards);g.scale.setScalar(s*(.94+(Math.abs(n.x*17+n.z*13)%1)*.18));plant(g,n,.018);foliageDecor.push({n:n.clone(),g});
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
// Dirt is now part of the globe's continuous material. Keeping this no-op
// preserves existing placement calls without creating detached decal meshes.
function dirtPatch(){dirtPatchId++;}

// Fibonacci coverage distributes geometry around the complete sphere, while leaving broad routes.
const MAIN_WORLD_PROP_COUNT=240;
for(let i=0;i<MAIN_WORLD_PROP_COUNT;i++){
  const y=1-(i+.5)/MAIN_WORLD_PROP_COUNT*2, lat=Math.asin(y), lon=i*2.399963;
  const n=normalAt(lat,lon), k=i%15;
  if(n.angleTo(CAMERA_CENTER_NORMAL)<.15) foliage(n,.55);
  else if(k===0||k===7){if(i%4===0)palm(n,.66+(i%4)*.045);else tree(n, .58+(i%5)*.05);}
  else if(k===3||k===10) rock(n,.42+(i%4)*.06);
  else if(k===5) log(n,.48+(i%3)*.07);
  else foliage(n,.55+(i%3)*.08);
}
const EXTRA_PALM_COUNT=32;
for(let i=0;i<EXTRA_PALM_COUNT;i++){const y=1-(i+.5)/EXTRA_PALM_COUNT*2;palm(normalAt(Math.asin(y),i*2.399963+1.1),.62+(i%5)*.055);}

// Non-blocking surface dressing is distributed over the complete planet.
const GROUND_DRESSING_COUNT=90;
for(let i=0;i<GROUND_DRESSING_COUNT;i++){
  const y=1-(i+.35)/GROUND_DRESSING_COUNT*2,n=normalAt(Math.asin(y),i*2.399963+.73);
  if(i%17===0)flower(n,i%34?0xff83a8:0xffc85c,.5);
  else if(i%11===0)dirtPatch(n,.55);
  else grassTuft(n,.38+(i%4)*.05);
}

// Rare lethal pits are true globe-surface hazards. Their dark recessed center
// and broken soil rim keep them readable without looking like floating decals.
function groundHole(n,s=1){
  const g=new THREE.Group(),pitMat=new THREE.MeshBasicMaterial({color:0x080604,side:THREE.DoubleSide}),soilMat=new THREE.MeshStandardMaterial({color:0x6a3b1e,roughness:1});
  const pitShape=new THREE.Shape();for(let i=0;i<18;i++){const a=i/18*Math.PI*2,r=.39*(.88+.13*Math.sin(i*4.7)+.07*Math.cos(i*7.3)),x=Math.cos(a)*r,z=Math.sin(a)*r;i?pitShape.lineTo(x,z):pitShape.moveTo(x,z);}pitShape.closePath();
  const pit=new THREE.Mesh(new THREE.ShapeGeometry(pitShape),pitMat);pit.rotation.x=-Math.PI/2;pit.position.y=.003;g.add(pit);
  for(let i=0;i<13;i++){const a=i/13*Math.PI*2+.12*Math.sin(i*2.1),r=.38+(i%3)*.012,clod=new THREE.Mesh(new THREE.DodecahedronGeometry(.055+(i%4)*.012,0),i%4===0?rockMat:soilMat);clod.position.set(Math.cos(a)*r,.018+(i%2)*.012,Math.sin(a)*r);clod.scale.set(1.3,.55,.85);clod.rotation.y=-a+i*.37;clod.castShadow=true;g.add(clod);}
  for(const a of [.28,2.55,4.72]){const root=new THREE.Mesh(new THREE.CylinderGeometry(.018,.028,.34,7),new THREE.MeshStandardMaterial({color:0x5a321b,roughness:1}));root.rotation.z=Math.PI/2;root.rotation.y=-a;root.position.set(Math.cos(a)*.32,.035,Math.sin(a)*.32);g.add(root);}
  g.scale.setScalar(s);plant(g,n,.002);props.push({kind:'hole',n:n.clone(),radius:.34*s,group:g});
}
for(let i=0;i<5;i++)groundHole(normalAt(-.42+i*.21,1.05+i*1.17),.88+(i%2)*.12);

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
document.documentElement.dataset.planetRadius=R.toFixed(2);
document.documentElement.dataset.mainWorldProps=String(MAIN_WORLD_PROP_COUNT);
document.documentElement.dataset.extraPalms=String(EXTRA_PALM_COUNT);
document.documentElement.dataset.groundDressing=String(GROUND_DRESSING_COUNT);
// Close-ground hero scatter uses two shared instanced meshes: crisp stones and
// clover remain readable near the ape without creating dozens of draw calls.
const detailStoneGeo=new THREE.DodecahedronGeometry(1,0),detailStones=new THREE.InstancedMesh(detailStoneGeo,rockMat,14),detailDummy=new THREE.Object3D();
for(let i=0;i<14;i++){const n=midNormal(.015+(i%7)*.018,-.19+(i%5)*.085);detailDummy.position.copy(n).multiplyScalar(R+.009);detailDummy.quaternion.setFromUnitVectors(UP,n);detailDummy.rotateY(i*.73);const s=.018+(i%4)*.007;detailDummy.scale.set(s*1.25,s*.72,s);detailDummy.updateMatrix();detailStones.setMatrixAt(i,detailDummy.matrix);}detailStones.instanceMatrix.needsUpdate=true;detailStones.castShadow=false;detailStones.receiveShadow=true;world.add(detailStones);
const cloverGeo=new THREE.SphereGeometry(1,8,5),cloverMat=new THREE.MeshStandardMaterial({color:0x5f962f,roughness:.84}),clovers=new THREE.InstancedMesh(cloverGeo,cloverMat,36),cloverBase=new THREE.Object3D(),cloverLeaf=new THREE.Object3D(),cloverMatrix=new THREE.Matrix4();
for(let i=0;i<12;i++){const n=midNormal(.02+(i%6)*.023,-.2+(i%4)*.13);cloverBase.position.copy(n).multiplyScalar(R+.008);cloverBase.quaternion.setFromUnitVectors(UP,n);cloverBase.rotateY(i*.91);cloverBase.updateMatrix();for(let k=0;k<3;k++){const a=k/3*Math.PI*2;cloverLeaf.position.set(Math.cos(a)*.025,.009,Math.sin(a)*.025);cloverLeaf.rotation.set(0,-a,0);cloverLeaf.scale.set(.028,.008,.038);cloverLeaf.updateMatrix();cloverMatrix.multiplyMatrices(cloverBase.matrix,cloverLeaf.matrix);clovers.setMatrixAt(i*3+k,cloverMatrix);}}clovers.instanceMatrix.needsUpdate=true;clovers.castShadow=false;clovers.receiveShadow=true;world.add(clovers);

function spherePart(geo,mat,pos,scale,parent){const m=new THREE.Mesh(geo,mat);m.position.set(...pos);m.scale.set(...scale);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function makeFurTexture(){const c=document.createElement('canvas');c.width=c.height=256;const q=c.getContext('2d');q.fillStyle='#6b351c';q.fillRect(0,0,256,256);let s=517;const r=()=>((s=(s*1664525+1013904223)>>>0)/4294967296);for(let i=0;i<2400;i++){const x=r()*256,y=r()*256,l=2+r()*7;q.globalAlpha=.12+r()*.32;q.strokeStyle=r()>.5?'#a15827':'#2d180f';q.beginPath();q.moveTo(x,y);q.lineTo(x+(r()-.5)*2,y+l);q.stroke();}q.globalAlpha=1;const t=new THREE.CanvasTexture(c);t.colorSpace=THREE.SRGBColorSpace;t.wrapS=t.wrapT=THREE.RepeatWrapping;t.repeat.set(3,4);return t;}
const furTexture=makeFurTexture();
const fur=new THREE.MeshPhysicalMaterial({color:0x8a4b25,map:furTexture,bumpMap:furTexture,bumpScale:.008,roughness:.94,sheen:.58,sheenColor:new THREE.Color(0xd79a63),emissive:0x160905,emissiveIntensity:.055});
const face=new THREE.MeshPhysicalMaterial({color:0xf0ae72,roughness:.7,clearcoat:.09,clearcoatRoughness:.8,emissive:0x281006,emissiveIntensity:.055});
const dark=new THREE.MeshStandardMaterial({color:0x20150f,roughness:.9});
const white=new THREE.MeshBasicMaterial({color:0xfffbef}),eyeBrown=new THREE.MeshBasicMaterial({color:0xa76425}),eyeBlack=new THREE.MeshBasicMaterial({color:0x160c08});
const apeRoot=new THREE.Group(), apeModel=new THREE.Group(); apeRoot.add(apeModel); world.add(apeRoot);
document.documentElement.dataset.heroAsset='custom-cute';
const apeContact=new THREE.Mesh(new THREE.CylinderGeometry(.16,.18,.009,20),new THREE.MeshBasicMaterial({color:0x173d18,transparent:true,opacity:.68,depthWrite:false}));
apeContact.scale.z=.55;world.add(apeContact);
const body=spherePart(new THREE.SphereGeometry(.24,22,18),fur,[0,.43,0],[.84,1.2,.74],apeModel);
const head=spherePart(new THREE.SphereGeometry(.295,28,22),fur,[0,.815,0],[1.28,1.18,1.08],apeModel);
spherePart(new THREE.SphereGeometry(.2,28,20),face,[0,.72,.33],[1.06,.78,.34],apeModel);
spherePart(new THREE.SphereGeometry(.175,24,18),face,[0,.43,.166],[.78,1.02,.17],apeModel);
const neckBlend=spherePart(new THREE.SphereGeometry(.15,22,16),fur,[0,.63,0],[1.15,.72,1.02],apeModel);neckBlend.renderOrder=-1;
const eyeWhites=[],irises=[],pupils=[],brows=[];
for(const side of [-1,1]){
  spherePart(new THREE.SphereGeometry(.11,16,12),face,[side*.315,.81,0],[.6,1,.48],apeModel);
  spherePart(new THREE.SphereGeometry(.07,14,10),new THREE.MeshStandardMaterial({color:0xb86f43,roughness:.82}),[side*.326,.81,.02],[.5,.76,.34],apeModel);
  eyeWhites.push(spherePart(new THREE.SphereGeometry(.083,18,14),white,[side*.098,.89,.34],[1,1.08,.46],apeModel));
  irises.push(spherePart(new THREE.SphereGeometry(.042,16,12),eyeBrown,[side*.09,.882,.36],[1,1,.43],apeModel));
  pupils.push(spherePart(new THREE.SphereGeometry(.023,12,9),eyeBlack,[side*.088,.892,.378],[1,1,.48],apeModel));
  spherePart(new THREE.SphereGeometry(.0075,8,6),white,[side*.088-side*.006,.902,.39],[1,1,.5],apeModel);
  const brow=spherePart(new THREE.CapsuleGeometry(.012,.085,4,8),fur,[side*.085,.954,.346],[1,1,1],apeModel);brow.rotation.z=Math.PI/2-side*.15;brows.push(brow);
  spherePart(new THREE.SphereGeometry(.014,8,6),dark,[side*.045,.745,.385],[1,.7,.5],apeModel);
}
const mouth=spherePart(new THREE.SphereGeometry(.065,14,10),dark,[0,.675,.397],[.78,.72,.2],apeModel);const tongue=spherePart(new THREE.SphereGeometry(.038,12,8),new THREE.MeshStandardMaterial({color:0xb75e4f,roughness:.75}),[0,.653,.412],[1,.34,.2],apeModel);
const smileCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.07,.688,.407),new THREE.Vector3(-.035,.669,.426),new THREE.Vector3(0,.662,.432),new THREE.Vector3(.035,.669,.426),new THREE.Vector3(.07,.688,.407)]),smile=new THREE.Mesh(new THREE.TubeGeometry(smileCurve,20,.009,7,false),dark);smile.visible=false;apeModel.add(smile);
for(let i=-1;i<=1;i++){const tuft=new THREE.Mesh(new THREE.ConeGeometry(.045,.14,7),fur);tuft.position.set(i*.04,1.065,-.01+Math.abs(i)*.012);tuft.rotation.z=-i*.22;tuft.castShadow=true;apeModel.add(tuft);}
// Reference-driven silhouette details: cheek fur, a readable nose and a curled
// tail give the hero a recognizable cartoon-ape profile from gameplay distance.
for(const side of [-1,1])for(let i=0;i<3;i++){const cheek=new THREE.Mesh(new THREE.ConeGeometry(.032,.105,6),fur);cheek.position.set(side*(.245+i*.012),.77-i*.055,.025);cheek.rotation.z=side*(1.15+i*.12);cheek.castShadow=true;apeModel.add(cheek);}
const nose=spherePart(new THREE.SphereGeometry(.054,14,10),new THREE.MeshPhysicalMaterial({color:0x7b3f27,roughness:.76}),[0,.755,.41],[1.15,.72,.7],apeModel);
for(const side of [-1,1])spherePart(new THREE.SphereGeometry(.012,8,6),dark,[side*.022,.758,.445],[.72,.5,.5],apeModel);
const tailCurve=new THREE.CatmullRomCurve3([new THREE.Vector3(.03,.48,-.16),new THREE.Vector3(.28,.5,-.24),new THREE.Vector3(.39,.65,-.18),new THREE.Vector3(.36,.79,-.1),new THREE.Vector3(.27,.79,-.07)]);
const tail=new THREE.Mesh(new THREE.TubeGeometry(tailCurve,22,.045,8,false),fur);tail.castShadow=true;apeModel.add(tail);
const limbs={};
function makeJointedLimb(name,x,y,isLeg){
  const upperLen=isLeg?.21:.2,lowerLen=isLeg?.2:.205,root=new THREE.Group(),joint=new THREE.Group(),end=new THREE.Group();
  root.position.set(x,y,0);apeModel.add(root);
  spherePart(new THREE.SphereGeometry(isLeg?.066:.056,16,12),fur,[0,0,0],[1.02,.9,1],root);
  spherePart(new THREE.CapsuleGeometry(isLeg?.066:.056,upperLen*.9,6,14),fur,[0,-upperLen*.5,0],[1.03,1,1],root);
  joint.position.y=-upperLen;root.add(joint);const bend=spherePart(new THREE.SphereGeometry(isLeg?.061:.051,16,12),fur,[0,0,.004],[1.02,.84,1],joint);bend.name=isLeg?'Knee':'Elbow';
  spherePart(new THREE.CapsuleGeometry(isLeg?.058:.048,lowerLen*.9,6,14),fur,[0,-lowerLen*.5,.004],[1,1,.98],joint);
  end.position.set(0,-lowerLen,isLeg?.045:.015);joint.add(end);
  if(isLeg){spherePart(new THREE.SphereGeometry(.057,16,12),fur,[0,.012,-.004],[1,.88,1],end);spherePart(new THREE.SphereGeometry(.086,18,12),face,[0,-.018,.074],[1.08,.48,1.68],end);}else{spherePart(new THREE.SphereGeometry(.071,16,12),face,[0,-.006,.037],[1,.7,1.18],end);}
  root.lower=joint;root.end=end;limbs[name]=root;
}
makeJointedLimb('armL',-.24,.53,false);makeJointedLimb('armR',.24,.53,false);
makeJointedLimb('legL',-.12,.24,true);makeJointedLimb('legR',.12,.24,true);
for(const side of [-1,1]){
  const hand=side<0?limbs.armL.end:limbs.armR.end,foot=side<0?limbs.legL.end:limbs.legR.end;
  for(let i=-1;i<=1;i++)spherePart(new THREE.SphereGeometry(.019,8,6),face,[i*.024,-.018,.07+Math.abs(i)*.008],[.72,.5,1.15],hand);
  for(let i=-1;i<=1;i++)spherePart(new THREE.SphereGeometry(.024,8,6),face,[i*.029,-.014,.105],[.8,.48,1.35],foot);
}
const dizzySpirals=new THREE.Group(),spiralMat=new THREE.MeshBasicMaterial({color:0x2b160b,depthWrite:false});
for(const side of [-1,1]){const points=[];for(let i=0;i<34;i++){const a=i*.58,r=.004+i*.00165;points.push(new THREE.Vector3(side*.098+Math.cos(a)*r,.89+Math.sin(a)*r,.405));}const spiral=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(points),46,.011,7,false),spiralMat);dizzySpirals.add(spiral);}dizzySpirals.visible=false;apeModel.add(dizzySpirals);
apeModel.scale.setScalar(.7); apeModel.traverse(m=>{if(m.isMesh){m.castShadow=true;m.receiveShadow=true;}});
const heroRig={root:apeModel,body,head,limbs,tail,eyes:eyeWhites,irises,pupils,brows,mouth,tongue,dizzySpirals};apeModel.userData.rig=heroRig;document.documentElement.dataset.heroRig='sheet-hero-v3';
function setApeExpression(state,t=0){
  document.documentElement.dataset.heroExpression=state;const surprised=state==='surprised',dizzy=state==='dizzy',angry=state==='angry',happy=state==='happy';
  for(let i=0;i<2;i++){const side=i?1:-1,eye=eyeWhites[i],iris=irises[i],pupil=pupils[i],brow=brows[i];eye.scale.set(1.02,surprised?1.24:angry?.78:1.06,.48);iris.visible=!dizzy;pupil.visible=!dizzy;const aimX=angry?side*.003:0;iris.position.set(side*.098+aimX,.89,.36);pupil.position.set(side*.098+aimX,.89,.378);brow.rotation.z=Math.PI/2+side*(angry?.38:surprised?-.04:-.15);brow.position.y=surprised?.982:angry?.938:.954;}
  smile.visible=happy;mouth.visible=!happy;mouth.scale.set(surprised?.62:angry?1.05:.78,surprised?1.32:angry?.28:.72,.2);mouth.position.y=surprised?.66:angry?.686:.675;mouth.rotation.z=dizzy?-.28:0;tongue.visible=dizzy||surprised;tongue.position.set(dizzy?.035:0,dizzy?.638:.653,.412);tongue.rotation.z=dizzy?.62:0;dizzySpirals.visible=dizzy;
  if(dizzy){for(let i=0;i<2;i++){irises[i].visible=false;pupils[i].visible=false;}mouth.scale.set(1.16,.82,.24);}
}
const stunBirds=new THREE.Group(),birdMat=new THREE.MeshStandardMaterial({color:0xffd43b,emissive:0x8a5600,emissiveIntensity:.5,roughness:.6});
for(let i=0;i<5;i++){const bird=new THREE.Group(),bodyBird=new THREE.Mesh(new THREE.SphereGeometry(.045,8,6),birdMat);bird.add(bodyBird);for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.ConeGeometry(.025,.09,5),birdMat);wing.position.x=side*.055;wing.rotation.z=side*Math.PI/2;bird.add(wing);}bird.userData.phase=i/5*Math.PI*2;stunBirds.add(bird);}stunBirds.visible=false;apeModel.add(stunBirds);
const dizzyStars=new THREE.Group(),dizzyMat=new THREE.MeshStandardMaterial({color:0xffd52f,emissive:0x9b5600,emissiveIntensity:.8,roughness:.45});
for(let i=0;i<5;i++){const shape=new THREE.Shape();for(let j=0;j<10;j++){const a=Math.PI/2+j*Math.PI/5,r=j%2?.025:.065;j?shape.lineTo(Math.cos(a)*r,Math.sin(a)*r):shape.moveTo(Math.cos(a)*r,Math.sin(a)*r);}shape.closePath();const star=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.018,bevelEnabled:true,bevelSegments:1,bevelSize:.006,bevelThickness:.005}),dizzyMat);star.userData.phase=i/5*Math.PI*2;dizzyStars.add(star);}dizzyStars.visible=false;apeModel.add(dizzyStars);
const equippedHelmet=new THREE.Group(),helmetMat=new THREE.MeshPhysicalMaterial({color:0x3f9de0,emissive:0x092f55,emissiveIntensity:.22,roughness:.3,metalness:.08,clearcoat:.9});
const helmetShell=new THREE.Mesh(new THREE.SphereGeometry(.33,28,16,0,Math.PI*2,0,Math.PI*.56),helmetMat);helmetShell.scale.set(1.12,.72,1.06);helmetShell.position.y=.965;helmetShell.castShadow=true;equippedHelmet.add(helmetShell);const helmetBrim=new THREE.Mesh(new THREE.BoxGeometry(.28,.035,.13),helmetMat);helmetBrim.position.set(0,.91,.285);helmetBrim.castShadow=true;equippedHelmet.add(helmetBrim);equippedHelmet.visible=false;apeModel.add(equippedHelmet);

const MAX_HEALTH=5,MAX_LIVES=3,BASE_LEVEL_GOAL=50;
let apeN=CAMERA_CENTER_NORMAL.clone(), targetN=apeN.clone(), runSpeed=0, gestureDrive=0, recognize=0, score=0, health=MAX_HEALTH,lives=MAX_LIVES,helmetEquipped=false,level=1,levelGoal=BASE_LEVEL_GOAL,levelCleared=false,running=false;
let trip=0, tripPhase='run', facing=1, lastTarget=new THREE.Vector3(),reversalFall=false,angryTimer=0,angryStompPlayed=false,holeFallTimer=0,holeRespawnPoint=null;
let tripObstacle=null, obstacleGrace=0,avoidObstacle=null,avoidTimer=0,avoidSide=1,stuckTime=0,lastGap=0;
let gaitPhase=0;
let hitTimer=0, startleTimer=0, stunTimer=0,logDizzyTimer=0, beeWaveTimer=0, pendingDamageTrip=false, knockedOut=false;
function placeApe(){
  // The root is the planted foot plane; keep it just above the terrain so the
  // animated feet touch the sphere instead of disappearing into it.
  apeRoot.position.copy(apeN).multiplyScalar(R+.02);
  apeRoot.quaternion.setFromUnitVectors(UP,apeN);
  apeContact.position.copy(apeN).multiplyScalar(R+.008);
  apeContact.quaternion.setFromUnitVectors(UP,apeN);
  // Turn the model within its tangent plane so its face follows its visible travel direction.
  const tangent=targetN.clone().addScaledVector(apeN,-targetN.dot(apeN));
  if(tangent.lengthSq()>.0001){const local=tangent.normalize().applyQuaternion(apeRoot.quaternion.clone().invert());apeModel.rotation.y=Math.atan2(local.x,local.z);}else{const cameraLocal=camera.position.clone().applyQuaternion(world.quaternion.clone().invert()),view=cameraLocal.addScaledVector(apeN,-cameraLocal.dot(apeN));if(view.lengthSq()>.0001){view.normalize().applyQuaternion(apeRoot.quaternion.clone().invert());apeModel.rotation.y=Math.atan2(view.x,view.z);}}
}
placeApe();
let authoredHero=null,authoredBones={},authoredBoneBase={};
const heroChoice=new URLSearchParams(location.search).get('hero');
const enableBlenderHero=heroChoice==='blender'||heroChoice==='sculpt';
const authoredHeroAsset=heroChoice==='sculpt'?'assets/hero/banana-planet-hero-sculpt-candidate.glb?v=2':'assets/hero/banana-planet-hero.glb?v=14';
const proceduralHeroVisuals=apeModel.children.filter(c=>![stunBirds,dizzyStars,dizzySpirals].includes(c));
new GLTFLoader().load(authoredHeroAsset,gltf=>{
  authoredHero=gltf.scene;authoredHero.name='BananaPlanetHero';authoredHero.scale.setScalar(heroChoice==='sculpt'?.27:.44);authoredHero.rotation.y=0;authoredHero.visible=enableBlenderHero;authoredHero.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;if(o.material){o.material=o.material.clone();if(heroChoice==='sculpt'){if(o.material.name.includes('Hero Unified Skin')){o.material.color.set(0xffffff);o.material.vertexColors=true;o.material.roughness=.9;}if(o.material.emissive)o.material.emissive.set(0x000000);o.material.emissiveIntensity=0;}else{if((o.name==='HeroBody'||o.material.name.includes('WarmBrownFurBreakup'))&&o.geometry?.attributes?.position){o.material.color.setRGB(o.material.map?.72:.40,o.material.map?.48:.17,o.material.map?.32:.055);o.material.roughness=.94;if(!o.material.map){const p=o.geometry.attributes.position,a=[];for(let i=0;i<p.count;i++){const q=p.getZ(i)*17+p.getX(i)*11+p.getY(i)*7,r=p.getZ(i)*37-p.getX(i)*23+p.getY(i)*19,n=.84+.10*(.5+.5*Math.sin(q))+.045*(.5+.5*Math.sin(r));a.push(n,n*.965,n*.91);}o.geometry.setAttribute('color',new THREE.Float32BufferAttribute(a,3));o.material.vertexColors=true;}}if(o.material.emissive&&o.material.color)o.material.emissive.copy(o.material.color).multiplyScalar(o.material.map?.04:.22);o.material.emissiveIntensity=o.material.map?.08:.75;}o.material.needsUpdate=true;}}if(o.isBone){authoredBones[o.name]=o;authoredBoneBase[o.name]=o.quaternion.clone();}});apeModel.add(authoredHero);if(enableBlenderHero)for(const o of proceduralHeroVisuals)o.visible=false;document.documentElement.dataset.heroAsset=enableBlenderHero?'blender-development':'procedural-stable';document.documentElement.dataset.heroRig='blender-armature-v1';document.documentElement.dataset.heroLoad='ready';
  document.documentElement.dataset.heroCandidate=heroChoice==='sculpt'?'sculpt-v1':'legacy-v14';
  },err=>{console.warn('Blender hero fallback active',err);document.documentElement.dataset.heroLoad='fallback';});
const authoredDeltaEuler=new THREE.Euler(),authoredDeltaQuat=new THREE.Quaternion();
function setAuthoredBoneDelta(name,x=0,y=0,z=0){const b=authoredBones[name],base=authoredBoneBase[name];if(!b||!base)return;authoredDeltaEuler.set(x,y,z,'XYZ');authoredDeltaQuat.setFromEuler(authoredDeltaEuler);b.quaternion.copy(base).multiply(authoredDeltaQuat);}
function syncAuthoredHero(){if(!authoredHero)return;const cp=(name,source,lower=false)=>{const r=lower?source.lower.rotation:source.rotation;setAuthoredBoneDelta(name,r.x,r.y,r.z);};cp('upper_arm.L',limbs.armL);cp('upper_arm.R',limbs.armR);cp('forearm.L',limbs.armL,true);cp('forearm.R',limbs.armR,true);cp('thigh.L',limbs.legL);cp('thigh.R',limbs.legR);cp('shin.L',limbs.legL,true);cp('shin.R',limbs.legR,true);const state=document.documentElement.dataset.heroExpression||'focused',now=performance.now();setAuthoredBoneDelta('jaw',state==='surprised'?.34:state==='dizzy'?.28:state==='angry'?.06:.02,0,0);setAuthoredBoneDelta('head',state==='surprised'?-.05:0,0,state==='dizzy'?Math.sin(now*.012)*.14:state==='angry'?-.06:0);for(const side of ['L','R']){setAuthoredBoneDelta('eye.'+side,state==='dizzy'?(side==='L'?.12:-.12):0,0,state==='dizzy'?(side==='L'?-.1:.1):0);setAuthoredBoneDelta('brow.'+side,0,state==='angry'?(side==='L'?-.24:.24):state==='surprised'?(side==='L'?.1:-.1):0,0);}}

const bananaMat=new THREE.MeshStandardMaterial({color:0xffce27,emissive:0x8a4d00,emissiveIntensity:.7,roughness:.45});
const bombMat=new THREE.MeshStandardMaterial({color:0x22292b,roughness:.55,metalness:.28});
const hiveMat=new THREE.MeshStandardMaterial({color:0xe2a52c,emissive:0x4a2600,emissiveIntensity:.16,roughness:.78});
const hiveRidgeMat=new THREE.MeshStandardMaterial({color:0xf6c54a,emissive:0x593000,emissiveIntensity:.12,roughness:.72});
const HIVE_SWARM_RADIUS=.15, BEE_ATTACK_DISTANCE=HIVE_SWARM_RADIUS*10;
const drops=[], bees=[], planes=[];
function makeBanana(){
  const g=new THREE.Group(),tipMat=new THREE.MeshStandardMaterial({color:0x543016,roughness:.9});
  for(let j=-1;j<=2;j++){
    const offset=j-0.5,curve=new THREE.CatmullRomCurve3([new THREE.Vector3(-.13+offset*.038,.11,0),new THREE.Vector3(offset*.032,-.055,0),new THREE.Vector3(.13+offset*.038,.09,0)]);
    const b=new THREE.Mesh(new THREE.TubeGeometry(curve,28,.046,12,false),bananaMat);b.rotation.z=offset*.105;b.position.z=offset*.022;b.castShadow=true;g.add(b);
    for(const p of [curve.points[0],curve.points[curve.points.length-1]]){const tip=new THREE.Mesh(new THREE.SphereGeometry(.024,8,6),tipMat);tip.position.copy(p);tip.rotation.z=j*.12;g.add(tip);}
  }
  const crown=new THREE.Mesh(new THREE.SphereGeometry(.052,10,8),new THREE.MeshStandardMaterial({color:0x6e8d24,roughness:.78}));crown.position.set(.14,.13,0);crown.scale.set(1,.65,1);g.add(crown);const stem=new THREE.Mesh(new THREE.CylinderGeometry(.022,.032,.13,9),tipMat);stem.position.set(.16,.18,0);stem.rotation.z=-.28;g.add(stem);g.add(new THREE.PointLight(0xffd65a,1.4,2.4));return g;
}
function makeBomb(){
  const g=new THREE.Group(),b=new THREE.Mesh(new THREE.SphereGeometry(.225,18,14),bombMat);b.scale.set(1,.98,.96);b.castShadow=true;g.add(b);
  const bone=new THREE.MeshStandardMaterial({color:0xfff0cb,roughness:.72}),plate=spherePart(new THREE.SphereGeometry(.13,16,12),bone,[0,.025,.19],[.92,.82,.22],g);
  for(const x of [-.052,.052])spherePart(new THREE.SphereGeometry(.037,10,8),dark,[x,.055,.221],[1,1,.32],g);
  const noseHole=new THREE.Mesh(new THREE.ConeGeometry(.022,.045,3),dark);noseHole.position.set(0,.006,.228);noseHole.rotation.x=Math.PI/2;g.add(noseHole);
  for(const x of [-.045,-.015,.015,.045]){const tooth=new THREE.Mesh(new THREE.BoxGeometry(.025,.035,.016),bone);tooth.position.set(x,-.065,.225);g.add(tooth);}
  const studMat=new THREE.MeshPhysicalMaterial({color:0xe0a62d,metalness:.55,roughness:.34});for(let i=0;i<6;i++){const a=i/6*Math.PI*2,stud=new THREE.Mesh(new THREE.SphereGeometry(.025,8,6),studMat);stud.position.set(Math.cos(a)*.205,Math.sin(a)*.205,0);g.add(stud);}
  const cap=new THREE.Mesh(new THREE.CylinderGeometry(.06,.08,.06,10),studMat);cap.position.y=.235;g.add(cap);const fuse=new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3([new THREE.Vector3(0,.25,0),new THREE.Vector3(.04,.31,0),new THREE.Vector3(.08,.32,.015)]),8,.014,6,false),brown);g.add(fuse);const spark=new THREE.PointLight(0xff4b32,1.1,1.8);spark.position.set(.08,.33,.015);g.add(spark);return g;
}
function makeFallingLog(){
  // A dedicated clean cargo log avoids inheriting decorative roots/knots that
  // can read as loose pieces hanging below the airborne object.
  const g=new THREE.Group(),body=new THREE.Mesh(new THREE.CylinderGeometry(.2,.24,1.15,16),brown);body.rotation.z=Math.PI/2;body.castShadow=true;body.receiveShadow=true;g.add(body);
  const cut=new THREE.MeshStandardMaterial({color:0xc98745,roughness:.92});for(const x of [-.585,.585]){const end=new THREE.Mesh(new THREE.CylinderGeometry(.205,.205,.025,16),cut);end.rotation.z=Math.PI/2;end.position.x=x;end.castShadow=true;g.add(end);}return g;
}
function makeFallingRock(){const g=new THREE.Group();hydrateModelAsset(g,'Rock');if(!modelTemplates.has('Rock')){const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.25,1),rockMat);m.scale.set(1.15,.9,1);m.castShadow=true;m.receiveShadow=true;g.add(m);}return g;}
function makeHive(){
  const g=new THREE.Group(),tiers=[
    {y:-.19,r:.225,h:.105},{y:-.105,r:.25,h:.11},{y:-.015,r:.245,h:.105},
    {y:.075,r:.225,h:.1},{y:.16,r:.19,h:.095},{y:.235,r:.135,h:.085}
  ];
  for(const [i,o] of tiers.entries()){const tier=new THREE.Mesh(new THREE.SphereGeometry(o.r,20,12),i%2?hiveMat:hiveRidgeMat);tier.scale.set(1,o.h/o.r,.88);tier.position.y=o.y;tier.castShadow=true;tier.receiveShadow=true;g.add(tier);}
  const neck=new THREE.Mesh(new THREE.CylinderGeometry(.04,.07,.1,10),hiveMat);neck.position.y=.315;g.add(neck);const loop=new THREE.Mesh(new THREE.TorusGeometry(.045,.014,7,16),brown);loop.position.y=.39;loop.rotation.x=Math.PI/2;g.add(loop);
  const entranceRimMat=new THREE.MeshStandardMaterial({color:0x714015,roughness:.86}),holeRim=new THREE.Mesh(new THREE.TorusGeometry(.076,.021,8,20),entranceRimMat);holeRim.position.set(0,-.08,.226);g.add(holeRim);
  const hole=new THREE.Mesh(new THREE.CircleGeometry(.059,18),dark);hole.scale.y=.78;hole.position.set(0,-.08,.238);g.add(hole);const dropTip=new THREE.Mesh(new THREE.ConeGeometry(.09,.13,14),hiveMat);dropTip.position.y=-.29;dropTip.rotation.z=Math.PI;g.add(dropTip);return g;
}
const treeHives=[];
function installTreeHives(){
  const hosts=props.filter(p=>p.kind==='tree'&&p.style==='jungle');
  for(let i=4;i<hosts.length;i+=13){const tree=hosts[i],hive=makeHive();hive.scale.setScalar(.34);hive.position.set(i%2?.38:-.38,1.05,.08);hive.rotation.z=i%2?.16:-.16;tree.group.add(hive);treeHives.push({tree,g:hive,baseRotation:hive.rotation.clone(),aggression:0,cooldown:4,warned:false});}
}
installTreeHives();
// Full reference-board cargo roster. Bananas remain the most common reward,
// while the visually brighter premium pickups stay special and hazards retain
// enough frequency to keep each flight meaningful.
const DROP_WEIGHTS=[['banana',.40],['coconutDrink',.09],['star',.05],['gem',.09],['heart',.05],['helmet',.02],['rock',.11],['log',.08],['bomb',.06],['hive',.05]];
document.documentElement.dataset.goodDropChance='0.70';
const SMALL_PLANE_MODEL_SCALE=.42,CARGO_PLANE_MODEL_SCALE=.62,SMALL_PLANE_ROUTE_HEIGHT=4.2,CARGO_PLANE_ROUTE_HEIGHT=6.5,CARGO_PLANE_SKY_LIFT=9;
Object.assign(document.documentElement.dataset,{smallPlaneScale:SMALL_PLANE_MODEL_SCALE.toFixed(2),cargoPlaneScale:CARGO_PLANE_MODEL_SCALE.toFixed(2),smallPlaneRouteHeight:SMALL_PLANE_ROUTE_HEIGHT.toFixed(2),cargoPlaneRouteHeight:CARGO_PLANE_ROUTE_HEIGHT.toFixed(2),cargoHeightRatio:(CARGO_PLANE_ROUTE_HEIGHT/SMALL_PLANE_ROUTE_HEIGHT).toFixed(2)});
function pickDropType(){let r=Math.random();for(const [type,weight] of DROP_WEIGHTS){if(r<weight)return type;r-=weight;}return DROP_WEIGHTS[0][0];}
function makeCargoPlane(){
  const g=new THREE.Group(),paint=new THREE.MeshPhysicalMaterial({color:0xe9a923,roughness:.34,metalness:.14,clearcoat:.62,clearcoatRoughness:.28}),paintDark=new THREE.MeshPhysicalMaterial({color:0xa74427,roughness:.42,clearcoat:.45}),wingMat=new THREE.MeshPhysicalMaterial({color:0x236da2,roughness:.32,metalness:.08,clearcoat:.58}),cream=new THREE.MeshStandardMaterial({color:0xf5dfaa,roughness:.55}),metal=new THREE.MeshStandardMaterial({color:0x343b40,roughness:.3,metalness:.72}),rubber=new THREE.MeshStandardMaterial({color:0x17191b,roughness:.82}),fur=new THREE.MeshStandardMaterial({color:0x6b371e,roughness:.9}),muzzleMat=new THREE.MeshStandardMaterial({color:0xd49a63,roughness:.78}),glass=new THREE.MeshPhysicalMaterial({color:0x89d8f5,transparent:true,opacity:.62,roughness:.12,metalness:.05});
  const body=new THREE.Mesh(new THREE.CapsuleGeometry(.18,.82,10,24),paint);body.rotation.z=Math.PI/2;body.scale.y=.88;body.castShadow=true;g.add(body);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.19,24,16),paintDark);nose.scale.set(1.15,.9,.9);nose.position.x=.58;nose.castShadow=true;g.add(nose);
  const spinner=new THREE.Mesh(new THREE.ConeGeometry(.075,.18,18),metal);spinner.rotation.z=-Math.PI/2;spinner.position.x=.82;g.add(spinner);
  // Two complete wings, their struts, and rounded tips make the silhouette read
  // unmistakably as a biplane even at the portrait gameplay scale.
  for(const [y,width,depth] of [[.12,.11,1.38],[-.16,.12,1.23]]){
    const wing=new THREE.Mesh(new THREE.BoxGeometry(.52,width,depth,3,1,5),wingMat);wing.position.set(.02,y,0);wing.castShadow=true;wing.receiveShadow=true;g.add(wing);
    for(const z of [-depth*.5,depth*.5]){const tip=new THREE.Mesh(new THREE.SphereGeometry(width*.62,14,9),wingMat);tip.scale.set(2.2,.7,1);tip.position.set(.02,y,z);g.add(tip);}
  }
  for(const x of [-.13,.22])for(const z of [-.43,.43]){const strut=new THREE.Mesh(new THREE.CylinderGeometry(.018,.018,.31,8),cream);strut.position.set(x,-.015,z);strut.rotation.z=(x<0?-1:1)*.1;g.add(strut);}
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.34,.055,.62,2,1,3),wingMat);tail.position.set(-.5,.03,0);g.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.3,.34,.055,3,3,1),paintDark);fin.position.set(-.52,.19,0);fin.rotation.z=-.15;g.add(fin);
  // Exposed cockpit with a raised rim and small windscreen.
  const cockpitWell=new THREE.Mesh(new THREE.CylinderGeometry(.135,.15,.11,24),rubber);cockpitWell.position.set(-.1,.18,0);g.add(cockpitWell);
  const cockpitRim=new THREE.Mesh(new THREE.TorusGeometry(.15,.026,9,28),cream);cockpitRim.rotation.x=Math.PI/2;cockpitRim.position.set(-.1,.245,0);g.add(cockpitRim);
  const screen=new THREE.Mesh(new THREE.SphereGeometry(.12,18,10,0,Math.PI,0,Math.PI*.48),glass);screen.scale.set(.28,.72,1);screen.position.set(.09,.3,0);screen.rotation.z=-.15;g.add(screen);
  const pilot=new THREE.Group();pilot.position.set(-.1,.32,0);g.add(pilot);
  const torso=new THREE.Mesh(new THREE.SphereGeometry(.105,18,13),fur);torso.scale.set(.85,1.15,.8);pilot.add(torso);
  const head=new THREE.Mesh(new THREE.SphereGeometry(.115,22,16),fur);head.position.y=.18;head.castShadow=true;pilot.add(head);
  const muzzle=new THREE.Mesh(new THREE.SphereGeometry(.072,18,12),muzzleMat);muzzle.scale.set(.85,.68,.85);muzzle.position.set(.075,.16,0);pilot.add(muzzle);
  for(const z of [-.105,.105]){const ear=new THREE.Mesh(new THREE.SphereGeometry(.048,14,10),muzzleMat);ear.position.set(-.005,.2,z);ear.scale.x=.52;pilot.add(ear);}
  for(const z of [-.04,.04]){const eye=new THREE.Mesh(new THREE.SphereGeometry(.016,10,8),rubber);eye.position.set(.098,.215,z);pilot.add(eye);}
  const goggles=new THREE.Mesh(new THREE.TorusGeometry(.03,.008,6,14),metal);goggles.rotation.y=Math.PI/2;goggles.position.set(.098,.218,-.04);pilot.add(goggles);const goggles2=goggles.clone();goggles2.position.z=.04;pilot.add(goggles2);
  const scarf=new THREE.Mesh(new THREE.BoxGeometry(.3,.035,.055),paintDark);scarf.position.set(-.18,.1,0);scarf.rotation.z=.15;pilot.add(scarf);
  const arms=[];for(const z of [-.105,.105]){const arm=new THREE.Group(),upper=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.12,4,8),fur);upper.position.y=-.075;arm.add(upper);arm.position.set(.02,.08,z);arm.rotation.z=z<0?-.55:.55;pilot.add(arm);arms.push(arm);}pilot.userData.arms=arms;pilot.userData.head=head;g.userData.pilot=pilot;
  const axle=new THREE.Mesh(new THREE.CylinderGeometry(.025,.025,.54,10),metal);axle.rotation.x=Math.PI/2;axle.position.set(.12,-.31,0);g.add(axle);for(const z of [-.29,.29]){const wheel=new THREE.Mesh(new THREE.TorusGeometry(.085,.025,10,20),rubber);wheel.position.set(.12,-.31,z);wheel.rotation.y=Math.PI/2;g.add(wheel);}
  const prop=new THREE.Group();prop.position.x=.92;const bladeMat=new THREE.MeshPhysicalMaterial({color:0xd9b56a,roughness:.4,clearcoat:.35});for(const a of [0,Math.PI/2]){const blade=new THREE.Mesh(new THREE.CapsuleGeometry(.025,.52,5,10),bladeMat);blade.rotation.x=a;prop.add(blade);}g.add(prop);g.userData.prop=prop;g.userData.dropGesture=0;
  g.scale.setScalar(SMALL_PLANE_MODEL_SCALE);g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function makeHeavyCargoPlane(types){
  const g=new THREE.Group(),bodyMat=new THREE.MeshPhysicalMaterial({color:0x69a8c7,emissive:0x102d3b,emissiveIntensity:.16,roughness:.38,metalness:.15,clearcoat:.52}),accent=new THREE.MeshPhysicalMaterial({color:0xffbd2f,emissive:0x5f3100,emissiveIntensity:.18,roughness:.34,metalness:.1,clearcoat:.56}),darkMetal=new THREE.MeshStandardMaterial({color:0x263039,roughness:.54,metalness:.5}),bayMat=new THREE.MeshStandardMaterial({color:0x10171c,roughness:.82}),glass=new THREE.MeshPhysicalMaterial({color:0x9ee7ff,transparent:true,opacity:.76,roughness:.12});
  const fuselage=new THREE.Mesh(new THREE.CapsuleGeometry(.3,1.5,12,28),bodyMat);fuselage.rotation.z=Math.PI/2;fuselage.scale.y=.92;g.add(fuselage);
  const nose=new THREE.Mesh(new THREE.SphereGeometry(.31,24,16),bodyMat);nose.scale.set(1.18,.88,.9);nose.position.x=.95;g.add(nose);
  const windshield=new THREE.Mesh(new THREE.SphereGeometry(.23,20,12,0,Math.PI,0,Math.PI*.45),glass);windshield.scale.set(.32,.7,1.05);windshield.position.set(.94,.15,0);windshield.rotation.z=-.28;g.add(windshield);
  const wing=new THREE.Mesh(new THREE.BoxGeometry(.78,.09,2.25,4,1,7),bodyMat);wing.position.set(.05,.02,0);g.add(wing);
  const tail=new THREE.Mesh(new THREE.BoxGeometry(.55,.065,.95,3,1,4),accent);tail.position.set(-.86,.08,0);g.add(tail);
  const fin=new THREE.Mesh(new THREE.BoxGeometry(.5,.55,.07,4,4,1),accent);fin.position.set(-.88,.33,0);fin.rotation.z=-.17;g.add(fin);
  const props=[];for(const z of [-.66,.66]){const nacelle=new THREE.Mesh(new THREE.CapsuleGeometry(.13,.46,8,18),darkMetal);nacelle.rotation.z=Math.PI/2;nacelle.position.set(.22,-.06,z);g.add(nacelle);const prop=new THREE.Group();prop.position.set(.55,-.06,z);for(const a of [0,Math.PI/2]){const blade=new THREE.Mesh(new THREE.CapsuleGeometry(.018,.43,4,8),accent);blade.rotation.x=a;prop.add(blade);}g.add(prop);props.push(prop);}
  const opening=new THREE.Mesh(new THREE.BoxGeometry(.18,.45,.48),bayMat);opening.position.set(-.91,-.03,0);g.add(opening);
  const rampPivot=new THREE.Group();rampPivot.position.set(-1.01,-.2,0);const ramp=new THREE.Mesh(new THREE.BoxGeometry(.62,.055,.48),darkMetal);ramp.position.x=-.29;rampPivot.add(ramp);g.add(rampPivot);
  const previews=[];for(let i=0;i<3;i++){const preview=makeDropModel(types[i]);preview.scale.setScalar(.42);preview.position.set(-.58+i*.22,-.06,(i-1)*.11);g.add(preview);previews.push(preview);}
  g.scale.setScalar(CARGO_PLANE_MODEL_SCALE);g.userData={heavyCargo:true,props,rampPivot,cargoPreviews:previews};g.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});return g;
}
function releaseDrop(type,n,startHeight=3.15,startOffset=null){
  const g=makeDropModel(type);
  const isFastRock=type==='rock',drop={type,n:n.clone(),g,h:startHeight,initialHeight:startHeight,startOffset:startOffset?.clone()||null,vy:isFastRock?1.52:.62,gravity:isFastRock?1.38:.52,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);startFallWhistle(drop);
  document.documentElement.dataset.lastDropType=type;document.documentElement.dataset.lastDropSpeed=drop.vy.toFixed(2);document.documentElement.dataset.lastDropAim=apeN.angleTo(n).toFixed(3);
  const dangerous=['bomb','hive','rock','log'].includes(type);
  if(dangerous){const trailMat=new THREE.LineBasicMaterial({color:type==='bomb'||type==='hive'?0xff674d:0xc7e9ff,transparent:true,opacity:.62,depthWrite:false}),trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(),new THREE.Vector3()]),trailMat);world.add(trail);drop.fallTrail=trail;}
  playCue('fall');if(type==='hive')spawnBees(drop);
}
function finishAirDrop(drop){stopFallWhistle(drop);if(drop.fallTrail){world.remove(drop.fallTrail);drop.fallTrail.geometry.dispose();drop.fallTrail.material.dispose();drop.fallTrail=null;}}
function dropCoconut(tree){
  const looseNut=tree.group.getObjectByProperty('name','Coconut_0')?.parent?.children.find(o=>o.name.startsWith('Coconut_')&&o.visible);if(looseNut)looseNut.visible=false;
  const g=new THREE.Group(),shell=new THREE.Mesh(new THREE.SphereGeometry(.16,14,10),new THREE.MeshStandardMaterial({color:0x75401f,roughness:.94}));shell.scale.set(.82,1.08,.82);shell.castShadow=true;g.add(shell);
  for(let i=0;i<3;i++){const eye=new THREE.Mesh(new THREE.SphereGeometry(.018,7,5),dark),a=i/3*Math.PI*2;eye.position.set(Math.cos(a)*.055,.12,Math.sin(a)*.055);g.add(eye);}
  const n=offsetDropPoint(tree.n,.018),drop={type:'coconut',n,g,h:.78,vy:.2,gravity:.46,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);startFallWhistle(drop);document.documentElement.dataset.treeDrop='coconut';toast.textContent='COCONUT SHAKEN LOOSE!';setTimeout(()=>{if(!knockedOut&&toast.textContent==='COCONUT SHAKEN LOOSE!')toast.textContent='';},900);playCue('coconut');
}
function makeGem(){const g=new THREE.Group(),mat=new THREE.MeshPhysicalMaterial({color:0x35c8ff,emissive:0x075f9b,emissiveIntensity:.75,metalness:.08,roughness:.18,clearcoat:1,clearcoatRoughness:.12}),gem=new THREE.Mesh(new THREE.OctahedronGeometry(.18,0),mat);gem.scale.set(.78,1.25,.78);gem.castShadow=true;g.add(gem);g.add(new THREE.PointLight(0x39cfff,1.2,1.5));return g;}
function makeHeart(){const g=new THREE.Group(),mat=new THREE.MeshPhysicalMaterial({color:0xff4052,emissive:0x7d0716,emissiveIntensity:.45,roughness:.35,clearcoat:.75});for(const x of [-.07,.07]){const lobe=new THREE.Mesh(new THREE.SphereGeometry(.105,14,10),mat);lobe.position.set(x,.065,0);lobe.castShadow=true;g.add(lobe);}const tip=new THREE.Mesh(new THREE.ConeGeometry(.145,.24,16),mat);tip.position.y=-.09;tip.rotation.z=Math.PI;g.add(tip);g.add(new THREE.PointLight(0xff5266,1,1.3));return g;}
function makeHelmet(){const g=new THREE.Group(),mat=helmetMat.clone(),shell=new THREE.Mesh(new THREE.SphereGeometry(.22,22,13,0,Math.PI*2,0,Math.PI*.58),mat);shell.scale.y=.72;shell.castShadow=true;g.add(shell);const brim=new THREE.Mesh(new THREE.BoxGeometry(.2,.035,.12),mat);brim.position.set(0,-.02,.19);brim.castShadow=true;g.add(brim);g.add(new THREE.PointLight(0x5dbaff,.8,1.2));return g;}
function makeCoconutDrink(){const g=new THREE.Group(),shellMat=new THREE.MeshStandardMaterial({color:0x7b441f,roughness:.92}),milkMat=new THREE.MeshPhysicalMaterial({color:0xf5e4b7,roughness:.38,clearcoat:.45}),cup=new THREE.Mesh(new THREE.SphereGeometry(.17,16,12,0,Math.PI*2,.42,Math.PI*.58),shellMat);cup.scale.y=.9;cup.castShadow=true;g.add(cup);const rim=new THREE.Mesh(new THREE.TorusGeometry(.13,.018,7,18),milkMat);rim.rotation.x=Math.PI/2;rim.position.y=.09;g.add(rim);const straw=new THREE.Mesh(new THREE.CylinderGeometry(.012,.012,.32,7),new THREE.MeshStandardMaterial({color:0x3bc4dd,roughness:.48}));straw.position.set(.055,.23,0);straw.rotation.z=-.2;g.add(straw);const umbrella=new THREE.Mesh(new THREE.ConeGeometry(.12,.075,12),new THREE.MeshStandardMaterial({color:0xff7651,roughness:.62}));umbrella.position.set(-.05,.25,0);umbrella.rotation.z=.18;g.add(umbrella);return g;}
function makeStar(){const shape=new THREE.Shape();for(let i=0;i<10;i++){const a=Math.PI/2+i*Math.PI/5,r=i%2?.075:.18,x=Math.cos(a)*r,y=Math.sin(a)*r;i?shape.lineTo(x,y):shape.moveTo(x,y);}shape.closePath();const g=new THREE.Group(),mat=new THREE.MeshPhysicalMaterial({color:0xffc526,emissive:0xa75900,emissiveIntensity:.85,metalness:.28,roughness:.22,clearcoat:1}),star=new THREE.Mesh(new THREE.ExtrudeGeometry(shape,{depth:.07,bevelEnabled:true,bevelSegments:2,bevelSize:.025,bevelThickness:.022}),mat);star.position.z=-.035;star.castShadow=true;g.add(star);g.add(new THREE.PointLight(0xffd451,1.8,2));return g;}
function makeDropModel(type){return type==='banana'?makeBanana():type==='coconutDrink'?makeCoconutDrink():type==='star'?makeStar():type==='gem'?makeGem():type==='heart'?makeHeart():type==='helmet'?makeHelmet():type==='bomb'?makeBomb():type==='rock'?makeFallingRock():type==='log'?makeFallingLog():makeHive();}
function dropTreeReward(tree,type){const g=type==='heart'?makeHeart():type==='coconutDrink'?makeCoconutDrink():type==='star'?makeStar():makeGem(),n=offsetDropPoint(tree.n,.018),drop={type,n,g,h:.78,vy:.14,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);document.documentElement.dataset.treeDrop=type;playCue('fall');}
function dropTreeHive(entry){
  const worldPos=new THREE.Vector3();entry.g.getWorldPosition(worldPos);entry.tree.group.remove(entry.g);entry.g.position.set(0,0,0);entry.g.rotation.set(0,0,0);entry.g.scale.setScalar(1);
  const drop={type:'hive',n:entry.tree.n.clone(),g:entry.g,h:.8,vy:.2,landed:false,groundTime:0,triggered:false};world.add(entry.g);drops.push(drop);spawnBees(drop);entry.dropped=true;document.documentElement.dataset.treeDrop='hive';playCue('fall');
}
function offsetDropPoint(base,maxAngle){
  const axis=new THREE.Vector3().crossVectors(base,Math.abs(base.y)>.9?new THREE.Vector3(1,0,0):UP).normalize().applyAxisAngle(base,Math.random()*Math.PI*2);
  return base.clone().applyAxisAngle(axis,Math.sqrt(Math.random())*maxAngle).normalize();
}
function spawnDrop(forcedType){
  // Weighted random pick keeps bananas the common case; hazards stay a
  // minority mix instead of a fixed round-robin cycle.
  const type=forcedType||pickDropType();
  // Good cargo can land broadly across the playable view. Hazard pilots instead
  // lead the ape slightly and aim a tight scatter around its predicted route.
  const leadAmount=type==='rock'?Math.min(.62,.28+runSpeed*1.8):Math.min(.38,.12+runSpeed*1.35);
  const predictedApe=apeN.clone().lerp(targetN,leadAmount).normalize();
  const goodCargo=['banana','coconutDrink','star','gem','heart','helmet'].includes(type);
  // Rock pilots deliberately lead the moving ape and use a much tighter
  // scatter. Other hazards remain less precise, preserving readable variety.
  const n=goodCargo?offsetDropPoint(targetN,.68):offsetDropPoint(predictedApe,type==='rock'?.011:.026);
  const tangentA=new THREE.Vector3().crossVectors(n,Math.abs(n.y)>.9?new THREE.Vector3(1,0,0):UP).normalize();
  const tangentB=new THREE.Vector3().crossVectors(n,tangentA).normalize(),flightAngle=Math.random()*Math.PI*2;
  const tangent=tangentA.multiplyScalar(Math.cos(flightAngle)).addScaledVector(tangentB,Math.sin(flightAngle)).normalize();
  const planeUp=n.clone(),planeSide=new THREE.Vector3().crossVectors(tangent,planeUp).normalize();
  const orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,planeUp,planeSide));
  const g=makeCargoPlane();world.add(g);planes.push({g,type,n,tangent,orientation,progress:0,released:false});
}
function spawnCargoBurst(){
  const good=['banana','coconutDrink','gem','star'],hazards=['rock','log','bomb'],types=[good[Math.floor(Math.random()*good.length)],Math.random()<.58?good[Math.floor(Math.random()*good.length)]:hazards[Math.floor(Math.random()*hazards.length)],good[Math.floor(Math.random()*good.length)]];
  const n=offsetDropPoint(targetN,.045),tangent=new THREE.Vector3(1,0,0).addScaledVector(n,-n.x).normalize().multiplyScalar(Math.random()<.5?-1:1),skyLift=UP.clone().addScaledVector(n,-UP.dot(n)).normalize(),planeUp=n.clone(),planeSide=new THREE.Vector3().crossVectors(tangent,planeUp).normalize(),orientation=new THREE.Quaternion().setFromRotationMatrix(new THREE.Matrix4().makeBasis(tangent,planeUp,planeSide)),points=[offsetDropPoint(n,.055),offsetDropPoint(n,.04),offsetDropPoint(n,.055)],g=makeHeavyCargoPlane(types);world.add(g);planes.push({kind:'heavyCargo',g,types,points,n,tangent,skyLift,orientation,progress:0,releasedCount:0});document.documentElement.dataset.cargoPlane='spawned';toast.textContent='CARGO BURST INCOMING!';setTimeout(()=>{if(!knockedOut&&toast.textContent==='CARGO BURST INCOMING!')toast.textContent='';},1000);
}
function qaLandHive(){const n=apeN.clone().applyAxisAngle(new THREE.Vector3(0,1,0),.035).normalize(),g=makeHive(),drop={type:'hive',n,g,h:.015,vy:0,landed:true,groundTime:0,triggered:false};world.add(g);drops.push(drop);spawnBees(drop);}
function qaFallHive(){const n=apeN.clone().applyAxisAngle(new THREE.Vector3(0,1,0),.055).normalize(),g=makeHive(),drop={type:'hive',n,g,h:1.45,vy:.3,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);spawnBees(drop);}
function qaCatchBanana(){const g=makeBanana(),drop={type:'banana',n:apeN.clone(),g,h:.22,vy:.6,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);}
function qaLandBanana(){const g=makeBanana(),drop={type:'banana',n:offsetDropPoint(apeN,.2),g,h:.015,vy:0,landed:true,groundTime:0,triggered:false};world.add(g);drops.push(drop);}
function qaFinalLife(){health=1;lives=1;updateHUD();}
function qaLandLog(){const g=makeFallingLog(),drop={type:'log',n:offsetDropPoint(apeN,.055),g,h:.015,vy:0,landed:true,groundTime:0,triggered:false};world.add(g);drops.push(drop);}
function qaCatchReward(type){const g=makeDropModel(type),drop={type,n:apeN.clone(),g,h:.2,vy:.25,landed:false,groundTime:0,triggered:false};world.add(g);drops.push(drop);}

function spawnBees(hive){
  hive.triggered=true;const g=new THREE.Group(),beeMat=new THREE.MeshStandardMaterial({color:0xf5c532,emissive:0x6b4600,emissiveIntensity:.32,roughness:.65}),stripeMat=new THREE.MeshStandardMaterial({color:0x342414,roughness:.82}),wingMat=new THREE.MeshPhysicalMaterial({color:0xd9f5ff,transparent:true,opacity:.72,roughness:.22,depthWrite:false});
  for(let i=0;i<14;i++){
    const dot=new THREE.Group(),bodyBee=new THREE.Mesh(new THREE.SphereGeometry(.029,9,7),beeMat);bodyBee.scale.set(1.35,.82,.82);dot.add(bodyBee);for(const x of [-.012,.012]){const stripe=new THREE.Mesh(new THREE.TorusGeometry(.021,.005,5,10),stripeMat);stripe.rotation.y=Math.PI/2;stripe.position.x=x;dot.add(stripe);}for(const side of [-1,1]){const wing=new THREE.Mesh(new THREE.SphereGeometry(.018,8,6),wingMat);wing.position.set(0,.023,side*.022);wing.scale.set(1.35,.35,.85);dot.add(wing);}dot.userData={phase:i/14*Math.PI*2,radius:.09+(i%3)*.035,height:.14+(i%2)*.06,speed:3.8+(i%4)*.55};g.add(dot);
  }
  g.position.copy(hive.n).multiplyScalar(R+hive.h+.07);g.quaternion.setFromUnitVectors(UP,hive.n);world.add(g);
  const trailMat=new THREE.LineBasicMaterial({color:0xffd84d,transparent:true,opacity:0}),trail=new THREE.Line(new THREE.BufferGeometry().setFromPoints([g.position.clone(),g.position.clone()]),trailMat);trail.visible=false;world.add(trail);
  bees.push({g,trail,n:hive.n.clone(),origin:hive.n.clone(),target:apeN.clone(),source:hive,life:20,travel:0,mode:'orbit',hit:false,armed:true});
}
function makeHiveZone(hive){
  const mat=new THREE.MeshBasicMaterial({color:0xffd44f,transparent:true,opacity:.28,side:THREE.DoubleSide,depthWrite:false}),ring=new THREE.Mesh(new THREE.RingGeometry(BEE_ATTACK_DISTANCE-.018,BEE_ATTACK_DISTANCE+.018,40),mat),g=new THREE.Group();
  ring.rotation.x=-Math.PI/2;ring.position.y=.012;g.add(ring);plant(g,hive.n,-.01);hive.zoneRing=g;return g;
}

const velocity=new THREE.Vector2(), dragPrev=new THREE.Vector2(),globeImpulse=new THREE.Vector2(),lastGestureVector=new THREE.Vector2();let dragging=false,lastMove=0,lastGestureAt=0,reversalCooldown=0,coconutCooldown=1.1,hiveDropCooldown=8,mildShakeCharge=0,aggressiveShakeTime=0,lastHiveBuzz=0,treeShakeDrops=0;
function triggerAggressiveReversal(prior){
  if(reversalCooldown>0||trip>0||hitTimer>0||knockedOut||Math.random()>.55)return;
  reversalCooldown=7.5;reversalFall=true;facing=prior.x>=0?1:-1;document.documentElement.dataset.shakeEvent='reversal-fall';tripApe();toast.textContent='WHOA!';
}
function rotateWorld(dx,dy,userGesture=false){
  if(Math.abs(dx)+Math.abs(dy)<.000001)return;
  const qx=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,1,0),dx);
  const qy=new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1,0,0),dy);
  world.quaternion.premultiply(qx).premultiply(qy).normalize();
  globeImpulse.x=THREE.MathUtils.clamp(globeImpulse.x+dx,-.08,.08);globeImpulse.y=THREE.MathUtils.clamp(globeImpulse.y+dy,-.08,.08);
  if(userGesture){
    // Keep the center target live under the player's thumb. Re-applying the
    // recognition delay on every pointermove made the ape wait until the drag
    // ended before beginning its chase.
    recognize=0;const now=performance.now(),mag=Math.hypot(dx,dy),lastMag=lastGestureVector.length();
    // Pointer motion is a direct run command: the ape begins a visible gait on
    // the same event that rotates the globe. Distance still controls where he
    // travels, so this adds responsiveness without snapping him to the target.
    gestureDrive=THREE.MathUtils.clamp(.12+mag*20,.12,.3);
    runSpeed=Math.max(runSpeed,gestureDrive);
    document.documentElement.dataset.gestureRunSpeed=runSpeed.toFixed(3);
    playRustle(Math.min(1,mag/.026));
    // Back-and-forth thumb steering is intentional control. Direction changes
    // no longer trigger a random reversal fall; real obstacle impacts still do.
    lastGestureVector.set(dx,dy);lastGestureAt=now;
  }
}
function updateShakeDynamics(dt,t){
  reversalCooldown=Math.max(0,reversalCooldown-dt);coconutCooldown=Math.max(0,coconutCooldown-dt);hiveDropCooldown=Math.max(0,hiveDropCooldown-dt);
  const intensity=globeImpulse.length();document.documentElement.dataset.shakeIntensity=intensity.toFixed(4);globeImpulse.multiplyScalar(Math.exp(-dt*7.5));
  for(const p of props){if(p.kind!=='tree'||!p.sway)continue;const palmBoost=p.style==='palm'?1.9:1.18,maxLean=p.style==='palm'?.27:.18,targetX=THREE.MathUtils.clamp(-globeImpulse.y*3.2*palmBoost,-maxLean,maxLean),targetZ=THREE.MathUtils.clamp(globeImpulse.x*3.2*palmBoost,-maxLean,maxLean);p.swayVelocity.x+=((targetX-p.sway.x)*27-p.swayVelocity.x*7.2)*dt;p.swayVelocity.y+=((targetZ-p.sway.y)*27-p.swayVelocity.y*7.2)*dt;p.sway.addScaledVector(p.swayVelocity,dt);const local=new THREE.Quaternion().setFromEuler(new THREE.Euler(p.sway.x,0,p.sway.y));p.group.quaternion.copy(p.baseQuaternion).multiply(local);
    if(p.style==='palm'){const crown=p.group.getObjectByName('Palm_Crown');if(crown){enhancePalmCrown(crown);if(!crown.userData.swayBase)crown.userData.swayBase=crown.rotation.clone();const base=crown.userData.swayBase;crown.rotation.set(base.x+p.sway.x*.42,base.y,base.z+p.sway.y*.62);for(const part of crown.children){if(part.name.startsWith('Frond_')){if(part.userData.baseZ===undefined)part.userData.baseZ=part.rotation.z;part.rotation.z=part.userData.baseZ+p.sway.y*.34+Math.sin(t*6+Number(part.name.slice(6)))*intensity*.42;}else if(part.name==='ReferenceFronds'){part.rotation.x=p.sway.x*.2+Math.sin(t*5.3)*intensity*.1;part.rotation.z=p.sway.y*.3+Math.sin(t*6.1)*intensity*.12;}else if(part.name.startsWith('Coconut_')&&!part.userData.styled){
          const id=Number(part.name.slice(8))||0,a=id/5*Math.PI*2;part.userData.styled=true;part.position.set(Math.cos(a)*(.12+(id%2)*.025),-.115-(id%3)*.034,Math.sin(a)*(.12+(id%2)*.025));part.scale.set(.76+(id%3)*.09,1.02+(id%2)*.13,.78+(id%3)*.07);part.material=new THREE.MeshPhysicalMaterial({color:[0x747d2d,0x8e8733,0x626d27,0x9b8b38,0x707427][id%5],map:coconutHuskTexture,bumpMap:coconutHuskTexture,bumpScale:.028,roughness:.82,clearcoat:.08,clearcoatRoughness:.8});
          const stem=new THREE.Mesh(new THREE.CylinderGeometry(.012,.018,.13,7),new THREE.MeshStandardMaterial({color:0x66511d,roughness:.9}));stem.position.set(0,.12,0);stem.rotation.z=(id%2?.16:-.16);part.add(stem);const cap=new THREE.Mesh(new THREE.CylinderGeometry(.027,.04,.025,9),new THREE.MeshStandardMaterial({color:0x54431b,roughness:.92}));cap.position.y=.078;part.add(cap);const shine=new THREE.Mesh(new THREE.SphereGeometry(.018,7,5),new THREE.MeshBasicMaterial({color:0xd9d66d,transparent:true,opacity:.55}));shine.position.set(-.038,.025,.072);part.add(shine);
        }}}}
  }
  mildShakeCharge=intensity>.0045?mildShakeCharge+dt:Math.max(0,mildShakeCharge-dt*.65);
  if(mildShakeCharge>.24){mildShakeCharge=0;if(coconutCooldown<=0&&Math.random()<.72){const trees=props.filter(p=>p.kind==='tree'),palms=trees.filter(p=>p.style==='palm'),visiblePalms=palms.filter(p=>p.n.clone().applyQuaternion(world.quaternion).angleTo(CAMERA_CENTER_NORMAL)<.75),hostPool=visiblePalms.length?visiblePalms:palms,host=hostPool[Math.floor(Math.random()*hostPool.length)]||trees[Math.floor(Math.random()*trees.length)],roll=Math.random(),forceFirstCoconut=treeShakeDrops===0;treeShakeDrops++;if(host&&(forceFirstCoconut||roll<.64))dropCoconut(host);else if(lives<MAX_LIVES&&roll<.72)dropTreeReward(host,'heart');else if(roll<.84)dropTreeReward(host,'gem');else if(roll<.94)dropTreeReward(host,'coconutDrink');else dropTreeReward(host,'star');coconutCooldown=4+Math.random()*2.5;}}
  aggressiveShakeTime=intensity>.022?aggressiveShakeTime+dt:Math.max(0,aggressiveShakeTime-dt*.7);
  const warning=aggressiveShakeTime>.22;
  for(const h of treeHives){if(h.dropped)continue;h.cooldown=Math.max(0,h.cooldown-dt);const wobble=warning?Math.sin(t*17)*Math.min(.2,aggressiveShakeTime*.22):0;h.g.rotation.set(h.baseRotation.x,h.baseRotation.y,h.baseRotation.z+wobble);}
  if(treeHives.some(h=>!h.dropped)&&t-lastHiveBuzz>3.4){lastHiveBuzz=t;playCue('hiveWarning');}
  if(warning&&t-lastHiveBuzz>.55){lastHiveBuzz=t;playCue('hiveWarning');}
  if(aggressiveShakeTime>.72&&hiveDropCooldown<=0){aggressiveShakeTime=0;const eligible=treeHives.filter(h=>!h.dropped&&h.cooldown<=0);if(eligible.length&&Math.random()<.32){dropTreeHive(eligible[Math.floor(Math.random()*eligible.length)]);hiveDropCooldown=16;}}
}
const activePointers=new Map();
let pinchDistance=0;
function pointerDistance(){const p=[...activePointers.values()];return p.length<2?0:Math.hypot(p[0].x-p[1].x,p[0].y-p[1].y);}
function finishPointer(e){activePointers.delete(e.pointerId);pinchDistance=0;if(activePointers.size===1){const p=[...activePointers.values()][0];dragPrev.set(p.x,p.y);dragging=true;}else dragging=false;}
canvas.addEventListener('pointerdown',e=>{canvas.setPointerCapture(e.pointerId);activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});velocity.set(0,0);if(activePointers.size===1){dragging=true;dragPrev.set(e.clientX,e.clientY);}else{dragging=false;pinchDistance=pointerDistance();}});
canvas.addEventListener('pointermove',e=>{if(!activePointers.has(e.pointerId))return;activePointers.set(e.pointerId,{x:e.clientX,y:e.clientY});if(activePointers.size>=2){const nextDistance=pointerDistance();if(pinchDistance>0&&nextDistance>0){cameraZoom=THREE.MathUtils.clamp(cameraZoom+Math.log(pinchDistance/nextDistance)*.3,0,1);applyCameraZoom();}pinchDistance=nextDistance;velocity.set(0,0);return;}if(!dragging)return;const dx=(e.clientX-dragPrev.x)*.0009,dy=(e.clientY-dragPrev.y)*.0009;rotateWorld(dx,dy,true);velocity.set(dx*.6,dy*.6);dragPrev.set(e.clientX,e.clientY);lastMove=performance.now();});
canvas.addEventListener('pointerup',finishPointer);canvas.addEventListener('pointercancel',finishPointer);
const heldKeys={};
const MOVE_KEYS=['arrowleft','arrowright','arrowup','arrowdown','a','d','w','s'];
const KEY_TURN_SPEED=.0017;
function keyboardVector(){let x=0,y=0;if(heldKeys.arrowleft||heldKeys.a)x+=1;if(heldKeys.arrowright||heldKeys.d)x-=1;if(heldKeys.arrowup||heldKeys.w)y+=1;if(heldKeys.arrowdown||heldKeys.s)y-=1;return{x,y};}

function updateHUD(){
  scoreEl.textContent=`⭐ ${score}/${levelGoal}`;levelEl.textContent=`LV ${level}`;
  healthEl.textContent=`HP ${'●'.repeat(health)}${'○'.repeat(MAX_HEALTH-health)}`;livesEl.textContent=`♥ ×${lives}`;
  Object.assign(document.documentElement.dataset,{score:String(score),level:String(level),levelGoal:String(levelGoal),health:String(health),lives:String(lives)});
}
function loseHealth(amount=1){
  if(knockedOut)return 'blocked';health=Math.max(0,health-amount);
  if(health>0){updateHUD();return 'hurt';}
  lives=Math.max(0,lives-1);
  if(lives<=0){updateHUD();knockedOut=true;running=false;trip=0;runSpeed=0;tripPhase='knocked-out';toast.textContent='KNOCKED OUT!';
    setTimeout(()=>{cardTitle.textContent='Game Over';cardText.textContent=`Level ${level} · ${score} points. Ready for another run?`;playButton.textContent='NEW GAME';start.hidden=false;},900);return 'gameover';}
  health=MAX_HEALTH;updateHUD();return 'life-lost';
}
function healHealth(amount=1){const before=health;health=Math.min(MAX_HEALTH,health+amount);updateHUD();return health-before;}
function checkLevelClear(){
  if(levelCleared||score<levelGoal)return;levelCleared=true;running=false;toast.textContent='LEVEL CLEARED!';playCue('catch');
  setTimeout(()=>{cardTitle.textContent=`Level ${level} Cleared!`;cardText.textContent=`You reached ${score} points. Next goal: ${levelGoal+25}.`;playButton.textContent='NEXT LEVEL';start.hidden=false;},650);
}
function tripApe(obstacle=null,costsHealth=true){if(obstacle&&obstacleGrace>0)return;if(trip<=0){const result=costsHealth?loseHealth(1):'hurt';if(result==='gameover'||result==='blocked')return;playCue('trip');trip=2.15;tripPhase='stumble';tripObstacle=obstacle;toast.textContent=result==='life-lost'?'LOST A LIFE!':'OOF!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},700);}}
function damageApe(){
  if(knockedOut||hitTimer>0)return;const result=loseHealth(1);if(result==='gameover'||result==='blocked')return;playCue('hit');
  hitTimer=.48;pendingDamageTrip=true;tripPhase='hit';toast.textContent=result==='life-lost'?'LOST A LIFE!':'WHACK!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},650);
}
function fallInHole(hole){
  if(knockedOut||holeFallTimer>0)return;playCue('trip');lives=Math.max(0,lives-1);updateHUD();runSpeed=0;trip=0;tripPhase='hole-fall';
  if(lives<=0){knockedOut=true;running=false;toast.textContent='GAME OVER!';setTimeout(()=>{cardTitle.textContent='Game Over';cardText.textContent=`Level ${level} · ${score} points. Ready for another run?`;playButton.textContent='NEW GAME';start.hidden=false;},900);return;}
  const respawnAxis=new THREE.Vector3().crossVectors(targetN,UP);if(respawnAxis.lengthSq()<.001)respawnAxis.set(1,0,0);respawnAxis.normalize();
  holeFallTimer=1.2;holeRespawnPoint=clearRecoveryPoint(targetN.clone().applyAxisAngle(respawnAxis,.08),targetN);toast.textContent='FELL IN A HOLE!';document.documentElement.dataset.lastHazard='hole';
}
updateHUD();
function useHelmet(){if(!helmetEquipped)return false;helmetEquipped=false;equippedHelmet.visible=false;playCue('bonk');toast.textContent='HELMET SAVE!';document.documentElement.dataset.helmet='used';setTimeout(()=>{if(!knockedOut&&toast.textContent==='HELMET SAVE!')toast.textContent='';},800);return true;}
function rockHitApe(){if(useHelmet())return;playCue('bonk');stunTimer=2;stunBirds.visible=true;damageApe();toast.textContent='BONK!';}
function logHeadHitApe(){if(useHelmet())return;playCue('bonk');logDizzyTimer=2.15;dizzyStars.visible=true;tripApe();toast.textContent='KLONK!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},700);}
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
  gestureDrive=Math.max(0,gestureDrive-dt*1.8);
  obstacleGrace=Math.max(0,obstacleGrace-dt);
  avoidTimer=Math.max(0,avoidTimer-dt);if(avoidTimer<=0)avoidObstacle=null;
  const inv=world.quaternion.clone().invert();targetN.copy(CAMERA_CENTER_NORMAL).applyQuaternion(inv).normalize();
  const gap=apeN.angleTo(targetN),distanceMode=gap>=.19?'RUN OFFSCREEN':gap>=.08?'RUN FAR':'WALK NEAR';debugEl.textContent=`${distanceMode} · ${tripPhase.toUpperCase()} · GAP ${(gap*57.3).toFixed(1)}°`;
  let heroExpression='focused';if(knockedOut||stunTimer>0||logDizzyTimer>0||(trip>0&&trip<1.53&&trip>.43))heroExpression='dizzy';else if(angryTimer>0||beeWaveTimer>0)heroExpression='angry';else if(hitTimer>0||startleTimer>0||trip>1.53)heroExpression='surprised';else if(gap<.05)heroExpression='happy';setApeExpression(heroExpression,t);
  if(stunTimer>0){stunTimer-=dt;stunBirds.visible=true;for(const bird of stunBirds.children){const a=t*5.5+bird.userData.phase;bird.position.set(Math.cos(a)*.48,1.25+Math.sin(a*2)*.08,Math.sin(a)*.34);bird.rotation.y=-a;}if(stunTimer<=0)stunBirds.visible=false;}
  if(logDizzyTimer>0){logDizzyTimer-=dt;dizzyStars.visible=true;for(const star of dizzyStars.children){const a=t*5.8+star.userData.phase;star.position.set(Math.cos(a)*.42,1.25+Math.sin(a*2)*.045,Math.sin(a)*.28);star.rotation.set(0,-a,t*4+star.userData.phase);}if(logDizzyTimer<=0)dizzyStars.visible=false;}
  if(knockedOut){
    apeModel.rotation.z=1.52;apeModel.rotation.x=.16;apeModel.position.y=.015;head.rotation.z=-.28;limbs.armL.rotation.x=-1;limbs.armR.rotation.x=.8;limbs.legL.rotation.x=.35;limbs.legR.rotation.x=-.35;placeApe();return;
  }
  if(holeFallTimer>0){holeFallTimer-=dt;const p=THREE.MathUtils.clamp(holeFallTimer/1.2,0,1);apeModel.scale.setScalar(.7*Math.max(.05,p));apeModel.position.y=-(1-p)*.25;apeModel.rotation.y+=dt*5;placeApe();if(holeFallTimer<=0){apeN.copy(holeRespawnPoint||targetN);apeModel.scale.setScalar(.7);apeModel.position.y=0;apeModel.rotation.set(0,0,0);holeRespawnPoint=null;tripPhase='run';obstacleGrace=1;toast.textContent='BACK IN THE RUN!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},700);}return;}
  if(hitTimer>0){
    hitTimer-=dt;runSpeed=0;apeModel.rotation.z=Math.sin(t*45)*.22;apeModel.rotation.x=-.18;apeModel.position.y=.035;head.rotation.z=stunTimer>0?-.34+Math.sin(t*8)*.09:Math.sin(t*38)*.18;limbs.armL.rotation.x=stunTimer>0?-.35:-1.65;limbs.armR.rotation.x=stunTimer>0?.48:-1.65;limbs.armL.lower.rotation.x=stunTimer>0?.72:0;limbs.armR.lower.rotation.x=stunTimer>0?.58:0;limbs.legL.rotation.x=stunTimer>0?.22:0;limbs.legR.rotation.x=stunTimer>0?-.18:0;
    if(hitTimer<=0&&pendingDamageTrip){pendingDamageTrip=false;apeModel.rotation.z=0;tripApe(null,false);}
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
    const distanceWanted=gap>=.19?.48:gap>=.08?THREE.MathUtils.lerp(.22,.44,(gap-.08)/.11):Math.min(.11,Math.max(0,(gap-.012)*1.75));
    const wanted=Math.max(distanceWanted,gestureDrive);runSpeed+=THREE.MathUtils.clamp(wanted-runSpeed,-dt*.72,dt*.72);
    if(gap>.005){
      const previous=apeN.clone();
      const desired=tangentToward(apeN,targetN);let moveDir=desired.clone();
      const fastCatchup=(gap>=.19||runSpeed>.12)&&obstacleGrace<=0;
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
        if(p.kind==='hole')continue;
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
          if(p.kind==='hole'&&apeN.angleTo(p.n)<propHitAngle(p)){fallInHole(p);break;}
          if(p.kind==='tree')continue;
          const hitRadius=propHitAngle(p);
          if(apeN.angleTo(p.n)<hitRadius&&!(obstacleGrace>0&&p===tripObstacle)){
            if(!fastCatchup){avoidObstacle=p;avoidTimer=1.15;apeN.copy(localDetour(previous,p,targetN,step*1.15));runSpeed*=.92;}
            else {apeN.copy(previous);runSpeed=0;tripApe(p);}break;
          }
        }
        if(holeFallTimer>0){placeApe();return;}
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
  else if(angryTimer>0){angryTimer-=dt;runSpeed=0;tripPhase='angry';const p=1-angryTimer/1.15;apeModel.rotation.x=-.1;apeModel.rotation.z=Math.sin(t*18)*.025;head.rotation.x=-.13;limbs.armL.rotation.x=-1.65;limbs.armR.rotation.x=-1.65;limbs.armL.lower.rotation.x=-1.05;limbs.armR.lower.rotation.x=-1.05;limbs.legL.rotation.x=0;limbs.legR.rotation.x=p<.48?-.45*Math.sin(p/0.48*Math.PI):0;if(!angryStompPlayed&&p>.52){angryStompPlayed=true;playCue('stomp');toast.textContent='HEY!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},500);}if(angryTimer<=0){tripPhase='run';apeModel.rotation.set(0,apeModel.rotation.y,0);head.rotation.set(0,head.rotation.y,0);}}
  else if(trip>0){trip-=dt;const elapsed=2.15-trip;
    if(elapsed<.28){const p=elapsed/.28;tripPhase='stumble';apeModel.rotation.x=p*.32;apeModel.rotation.z=facing*Math.sin(p*Math.PI)*(reversalFall?.16:.035);limbs.armL.rotation.x=-p*1.15;limbs.armR.rotation.x=-p*.9;limbs.armL.lower.rotation.x=-p*.55;limbs.armR.lower.rotation.x=-p*.7;limbs.legL.rotation.x=.34*p;limbs.legR.rotation.x=-.22*p;limbs.legL.lower.rotation.x=.8*p;limbs.legR.lower.rotation.x=.32*p;}
    else if(elapsed<.62){const p=(elapsed-.28)/.34;tripPhase='fall';apeModel.rotation.x=.32+p*1.02;apeModel.rotation.z=facing*(reversalFall?.12:.025)*(1-p);apeModel.position.y=.012*(1-p);limbs.armL.rotation.x=-1.55;limbs.armR.rotation.x=-1.42;limbs.armL.lower.rotation.x=-.25;limbs.armR.lower.rotation.x=-.18;limbs.legL.rotation.x=.46;limbs.legR.rotation.x=.22;limbs.legL.lower.rotation.x=1.05;limbs.legR.lower.rotation.x=.85;head.rotation.x=-.18;}
    else if(elapsed<1.28){tripPhase='down';apeModel.rotation.x=1.34;apeModel.rotation.z=0;apeModel.position.y=.002;head.rotation.x=-.2;limbs.armL.rotation.x=-1.48;limbs.armR.rotation.x=-1.48;limbs.armL.lower.rotation.x=-.12;limbs.armR.lower.rotation.x=-.12;limbs.legL.rotation.x=.5;limbs.legR.rotation.x=.34;limbs.legL.lower.rotation.x=1.08;limbs.legR.lower.rotation.x=.92;}
    else if(elapsed<1.72){const p=(elapsed-1.28)/.44;tripPhase='push-up';apeModel.rotation.x=1.34-p*.72;apeModel.rotation.z=0;apeModel.position.y=.002+p*.012;head.rotation.x=-.2+p*.16;limbs.armL.rotation.x=-1.48+p*.68;limbs.armR.rotation.x=-1.48+p*.68;limbs.armL.lower.rotation.x=-.12-p*.42;limbs.armR.lower.rotation.x=-.12-p*.42;limbs.legL.rotation.x=.5-p*.22;limbs.legR.rotation.x=.34-p*.18;limbs.legL.lower.rotation.x=1.08-p*.65;limbs.legR.lower.rotation.x=.92-p*.55;}
    else {const p=Math.min(1,(elapsed-1.72)/.43);tripPhase='stand';apeModel.rotation.x=.62*(1-p);apeModel.rotation.z=0;apeModel.position.y=.014*(1-p);head.rotation.x=-.04*(1-p);limbs.armL.rotation.x=-.8*(1-p);limbs.armR.rotation.x=-.8*(1-p);limbs.armL.lower.rotation.x=-.54*(1-p);limbs.armR.lower.rotation.x=-.54*(1-p);limbs.legL.rotation.x=.28*(1-p);limbs.legR.rotation.x=.16*(1-p);limbs.legL.lower.rotation.x=.43*(1-p);limbs.legR.lower.rotation.x=.37*(1-p);}
    if(trip<=0){apeModel.rotation.set(0,apeModel.rotation.y,0);apeModel.position.y=0;tripPhase='run';if(reversalFall){reversalFall=false;angryTimer=1.15;angryStompPlayed=false;playCue('yell');}if(tripObstacle){obstacleGrace=3;avoidObstacle=tripObstacle;avoidTimer=1.8;apeN.copy(clearRecoveryPoint(apeN,targetN));}}
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
  placeApe();syncAuthoredHero();
}

const effects=[];
function explodeBomb(d){
  playCue('boom');
  const blast=new THREE.Group();
  blast.position.copy(d.n).multiplyScalar(R+.025);
  blast.quaternion.setFromUnitVectors(UP,d.n);
  const coreMat=new THREE.MeshBasicMaterial({color:0xfff2a0,transparent:true,opacity:1,depthWrite:false,blending:THREE.AdditiveBlending});
  const fireMat=new THREE.MeshBasicMaterial({color:0xff681c,transparent:true,opacity:.92,depthWrite:false,blending:THREE.AdditiveBlending});
  const smokeMat=new THREE.MeshStandardMaterial({color:0x292d31,roughness:1,transparent:true,opacity:.82,depthWrite:false});
  const core=new THREE.Mesh(new THREE.SphereGeometry(.12,18,14),coreMat);core.position.y=.12;blast.add(core);
  const fire=new THREE.Mesh(new THREE.SphereGeometry(.2,18,14),fireMat);fire.position.y=.13;fire.scale.set(1.15,.8,1.15);blast.add(fire);
  const ring=new THREE.Mesh(new THREE.RingGeometry(.12,.18,32),new THREE.MeshBasicMaterial({color:0xffbd42,side:THREE.DoubleSide,transparent:true,opacity:.9,depthWrite:false,blending:THREE.AdditiveBlending}));
  ring.rotation.x=-Math.PI/2;ring.position.y=.018;blast.add(ring);
  const smoke=[],sparks=[];
  for(let i=0;i<7;i++){
    const puff=new THREE.Mesh(new THREE.DodecahedronGeometry(.075+Math.random()*.035,1),smokeMat.clone());
    const a=i/7*Math.PI*2;puff.position.set(Math.cos(a)*.055,.12+i%3*.045,Math.sin(a)*.055);puff.userData.drift=new THREE.Vector3(Math.cos(a)*(.08+Math.random()*.08),.18+Math.random()*.12,Math.sin(a)*(.08+Math.random()*.08));blast.add(puff);smoke.push(puff);
  }
  for(let i=0;i<14;i++){
    const spark=new THREE.Mesh(new THREE.SphereGeometry(.012,6,4),new THREE.MeshBasicMaterial({color:i%3?0xffa21f:0xffffb4,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending}));
    const a=Math.random()*Math.PI*2,s=.25+Math.random()*.32;spark.position.set(0,.13,0);spark.userData.velocity=new THREE.Vector3(Math.cos(a)*s,.2+Math.random()*.35,Math.sin(a)*s);blast.add(spark);sparks.push(spark);
  }
  const light=new THREE.PointLight(0xff7a28,4.5,2.3,2);light.position.y=.22;blast.add(light);
  world.add(blast);
  effects.push({g:blast,life:.9,maxLife:.9,update(dt,e){
    const age=e.maxLife-e.life,p=Math.min(1,age/e.maxLife);
    core.scale.setScalar(1+p*3.1);coreMat.opacity=Math.max(0,1-p*2.5);
    fire.scale.set(1.15+p*2.4,.8+p*1.5,1.15+p*2.4);fireMat.opacity=Math.max(0,.92-p*1.45);
    ring.scale.setScalar(1+p*5.2);ring.material.opacity=Math.max(0,.9-p*1.25);light.intensity=Math.max(0,4.5-p*8);
    for(const puff of smoke){puff.position.addScaledVector(puff.userData.drift,dt);puff.scale.multiplyScalar(1+dt*1.8);puff.material.opacity=Math.max(0,.78-p*.8);}
    for(const spark of sparks){spark.userData.velocity.y-=dt*.55;spark.position.addScaledVector(spark.userData.velocity,dt);spark.material.opacity=Math.max(0,1-p*1.18);}
  }});
  // Tight local blast: roughly half a metre on this globe, rather than the
  // previous broad area that could hit an ape standing visibly far away.
  const blastGap=apeN.angleTo(d.n);
  if(blastGap<.09)damageApe();
  else if(blastGap<.18&&!knockedOut){startleTimer=.55;tripPhase='startled';toast.textContent='YIKES!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},500);}
  toast.textContent='BOOM!';setTimeout(()=>{if(!knockedOut)toast.textContent='';},450);
}
let dropTimer=1.35,firstCargoScheduled=false,last=performance.now();
function frame(now){
  const dt=Math.min(.033,(now-last)/1000);last=now;const t=now/1000;
  if(running){
    if(introZoomTimer>0){introZoomTimer=Math.max(0,introZoomTimer-dt);const p=1-introZoomTimer/2.2,cubic=1-Math.pow(1-p,3);cameraZoom=THREE.MathUtils.lerp(1,.14,cubic);applyCameraZoom();if(introZoomTimer<=0)document.documentElement.dataset.introZoom='complete';}
    if(!dragging){const kv=keyboardVector();if(kv.x||kv.y){velocity.set(kv.x*KEY_TURN_SPEED,kv.y*KEY_TURN_SPEED);recognize=0;}rotateWorld(velocity.x,velocity.y);velocity.multiplyScalar(Math.pow(.12,dt));if(velocity.length()<.000018)velocity.set(0,0);}
    updateShakeDynamics(dt,t);updateLandedProps(dt);updateApe(dt,t);if(++foliageCullFrame%6===0){for(const d of foliageDecor)d.g.visible=d.n.clone().applyQuaternion(world.quaternion).dot(CAMERA_CENTER_NORMAL)>-.12;}dropTimer-=dt;if(dropTimer<=0){if(planes.length<3){if(!firstCargoScheduled){firstCargoScheduled=true;spawnCargoBurst();}else if(Math.random()<.22)spawnCargoBurst();else spawnDrop();}dropTimer=2.8+Math.random()*2;}
    for(let i=planes.length-1;i>=0;i--){const p=planes[i],heavy=p.kind==='heavyCargo';p.progress+=dt*(heavy?.255:.36);p.g.position.copy(p.n).multiplyScalar(R+(heavy?CARGO_PLANE_ROUTE_HEIGHT:SMALL_PLANE_ROUTE_HEIGHT)).addScaledVector(p.tangent,(p.progress-.5)*(heavy?5.8:5.2));if(heavy)p.g.position.addScaledVector(p.skyLift,CARGO_PLANE_SKY_LIFT);p.g.quaternion.copy(p.orientation);const actualAltitude=p.g.position.length()-R;if(heavy)document.documentElement.dataset.cargoActualAltitude=actualAltitude.toFixed(2);else document.documentElement.dataset.smallActualAltitude=actualAltitude.toFixed(2);
      if(heavy){for(const prop of p.g.userData.props)prop.rotation.x+=dt*27;const open=THREE.MathUtils.smoothstep(p.progress,.25,.43)*(1-THREE.MathUtils.smoothstep(p.progress,.74,.91));p.g.userData.rampPivot.rotation.z=-open*.7;for(let j=0;j<3;j++){const preview=p.g.userData.cargoPreviews[j];if(preview.visible)preview.position.x-=dt*open*(.1+j*.035);const threshold=.45+j*.045;if(p.releasedCount===j&&p.progress>=threshold){preview.visible=false;p.releasedCount++;const dropHeight=6.25-j*.12,origin=p.g.position.clone().addScaledVector(p.tangent,-.82-j*.08),offset=origin.clone().addScaledVector(p.points[j],-(R+dropHeight));releaseDrop(p.types[j],p.points[j],dropHeight,offset);document.documentElement.dataset.cargoBurst=String(p.releasedCount);document.documentElement.dataset.cargoAltitude=(p.g.position.length()-R).toFixed(2);playCue('fall');}}
      }else{p.g.userData.prop.rotation.x+=dt*24;const pilot=p.g.userData.pilot;if(pilot){const bob=Math.sin(t*8+p.progress*5);pilot.position.y=.32+bob*.008;pilot.userData.head.rotation.z=bob*.045;const gesture=p.g.userData.dropGesture||0;if(gesture>0){p.g.userData.dropGesture=Math.max(0,gesture-dt);const wave=Math.sin((.58-gesture)*Math.PI*5);pilot.userData.arms[0].rotation.z=-1.35+wave*.28;pilot.userData.arms[0].rotation.x=-.4;pilot.userData.arms[1].rotation.z=.85;}else{pilot.userData.arms[0].rotation.set(0,0,-.55+bob*.08);pilot.userData.arms[1].rotation.set(0,0,.55-bob*.08);}}if(!p.released&&p.progress>=.48){p.released=true;p.g.userData.dropGesture=.58;releaseDrop(p.type,p.n);}}
      if(p.progress>(heavy?1.18:1.12)){world.remove(p.g);planes.splice(i,1);}}
    for(let i=drops.length-1;i>=0;i--){const d=drops[i];
      if(!d.landed){d.h-=d.vy*dt;d.vy+=(d.gravity??.52)*dt;if(d.h<=.015){d.h=.015;d.landed=true;d.groundTime=0;finishAirDrop(d);if(d.type!=='banana')playCue('land');}}
      else d.groundTime+=dt;
      if(d.landed&&d.type==='hive'&&!d.zoneRing)makeHiveZone(d);
      d.g.position.copy(d.n).multiplyScalar(R+d.h);if(d.startOffset&&!d.landed)d.g.position.addScaledVector(d.startOffset,THREE.MathUtils.clamp(d.h/d.initialHeight,0,1));d.g.quaternion.setFromUnitVectors(UP,d.n);if(!d.landed){d.g.rotateY(dt*2.4);updateFallWhistle(d);}
      if(d.fallTrail){const attr=d.fallTrail.geometry.attributes.position,p=d.g.position;attr.setXYZ(0,p.x,p.y,p.z);attr.setXYZ(1,p.x+d.n.x*(.42+d.vy*.28),p.y+d.n.y*(.42+d.vy*.28),p.z+d.n.z*(.42+d.vy*.28));attr.needsUpdate=true;d.fallTrail.material.opacity=Math.min(.82,.36+d.vy*.28);}
      // Telegraph a grounded object's removal with a fast, readable blink.
      // Timing and collision behavior remain unchanged; only visibility pulses.
      const flashStart=d.type==='hive'?19.2:['banana','coconut','coconutDrink','gem','star','heart','helmet'].includes(d.type)?3.35:1.35,willDisappear=['banana','coconut','coconutDrink','gem','star','heart','helmet','bomb','hive'].includes(d.type);
      d.g.visible=!d.landed||!willDisappear||d.groundTime<flashStart||Math.floor((d.groundTime-flashStart)*12)%2===0;
      const closeness=Math.max(0,1-d.h/2.15);
      // Keep drops proportional to the small ape: distant items are tiny, and
      // landed bananas/bombs remain hand-to-head sized rather than oversized.
      d.g.scale.setScalar((.2+closeness*.22)*(d.type==='hive'?1.55:1));
      // Resolve a catch/hit only when the descending mesh overlaps the ape's
      // actual body volume. A nearby ground impact is a miss, not a collision.
      const apeCatchPoint=apeN.clone().multiplyScalar(R+.2);
      const apeHeadPoint=apeN.clone().multiplyScalar(R+.43);
      const goodDrop=['banana','coconut','coconutDrink','gem','star','heart','helmet'].includes(d.type);
      if(goodDrop&&d.g.position.distanceTo(apeCatchPoint)<.22&&!(d.type==='heart'&&lives>=MAX_LIVES)&&!(d.type==='helmet'&&helmetEquipped)){
        finishAirDrop(d);playCue('catch');
        if(d.type==='heart'){
          lives=Math.min(MAX_LIVES,lives+1);updateHUD();toast.textContent='+1 LIFE!';
        }else if(d.type==='helmet'){
          helmetEquipped=true;equippedHelmet.visible=true;document.documentElement.dataset.helmet='equipped';toast.textContent='HELMET READY!';
        }else{
          const reward=d.type==='star'?10:d.type==='gem'?5:d.type==='coconutDrink'?3:d.type==='coconut'?2:1;
          score+=reward;const foodHeal=d.type==='coconutDrink'?2:(d.type==='banana'||d.type==='coconut'?1:0),healed=foodHeal?healHealth(foodHeal):0;updateHUD();
          toast.textContent=d.type==='star'?'+10 GOLD STAR!':d.type==='gem'?'+5 GEM!':d.type==='coconutDrink'?`+3 DRINK${healed?' · +2 HP':''}`:d.type==='coconut'?`+2 COCONUT${healed?' · +1 HP':''}`:`+1 BANANA${healed?' · +1 HP':''}`;
          checkLevelClear();
        }
        setTimeout(()=>{if(!knockedOut&&!levelCleared)toast.textContent='';},650);world.remove(d.g);drops.splice(i,1);continue;
      }
      if(!d.landed&&d.type==='log'&&d.g.position.distanceTo(apeHeadPoint)<.2){logHeadHitApe();finishAirDrop(d);world.remove(d.g);drops.splice(i,1);continue;}
      if(!d.landed&&!goodDrop&&d.g.position.distanceTo(apeCatchPoint)<.19){
        if(d.type==='bomb')damageApe();else if(d.type==='rock')rockHitApe();else if(d.type==='log')tripApe();
        finishAirDrop(d);world.remove(d.g);drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='log'){
        const away=d.n.clone().addScaledVector(targetN,-d.n.dot(targetN));if(away.lengthSq()<.0001)away.crossVectors(d.n,UP);away.normalize();addLandedProp({kind:'log',n:d.n.clone(),radius:.28,group:d.g,rollDirection:away,rollAngle:0,baseScale:d.g.scale.clone()});drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='rock'){
        addLandedProp({kind:'rock',n:d.n.clone(),radius:.13,group:d.g});drops.splice(i,1);continue;
      }
      if(d.landed&&d.type==='hive'&&!d.triggered)spawnBees(d);
      if(d.landed&&d.type==='bomb'&&d.groundTime>=2){explodeBomb(d);world.remove(d.g);drops.splice(i,1);continue;}
      if(d.landed&&goodDrop&&d.groundTime>=4){document.documentElement.dataset.lastExpiredDrop=`${d.type}:${d.groundTime.toFixed(2)}`;world.remove(d.g);drops.splice(i,1);continue;}
      if(d.landed&&d.type==='hive'&&d.groundTime>=20){world.remove(d.g);if(d.zoneRing)world.remove(d.zoneRing);drops.splice(i,1);continue;}
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
    for(let i=effects.length-1;i>=0;i--){const e=effects[i];e.life-=dt;if(e.update)e.update(dt,e);else{e.g.scale.multiplyScalar(1+dt*7);if(e.g.material)e.g.material.opacity=Math.max(0,e.life*1.7);}if(e.life<=0){world.remove(e.g);effects.splice(i,1);}}
  }
  renderer.render(scene,camera);requestAnimationFrame(frame);
}
playButton.addEventListener('click',()=>{
  startAudio();
  if(knockedOut){sessionStorage.setItem('apeAutoStart','1');location.reload();return;}
  if(levelCleared){level++;score=0;levelGoal=BASE_LEVEL_GOAL+(level-1)*25;levelCleared=false;cardTitle.textContent='BANANA';cardText.textContent='Spin the jungle. Catch the good stuff. Avoid everything else!';playButton.textContent='START GAME';updateHUD();toast.textContent='';}
  if(playButton.textContent.includes('START')){cameraZoom=1;applyCameraZoom();introZoomTimer=2.2;document.documentElement.dataset.introZoom='running';}
  start.hidden=true;running=true;
});
let pausedByMenu=false;
addEventListener('bp-pause',e=>{pausedByMenu=!!e.detail;if(pausedByMenu)running=false;else if(start.hidden&&!knockedOut)running=true;});
if(sessionStorage.getItem('apeAutoStart')==='1'){sessionStorage.removeItem('apeAutoStart');start.hidden=true;running=true;}
addEventListener('keydown',e=>{const k=e.key.toLowerCase(),qa=new URLSearchParams(location.search).has('qa');if(k==='r')location.reload();if(k==='k'&&qa)damageApe();if(k==='c'&&qa)qaCatchBanana();if(k==='m'&&qa)qaLandBanana();if(k==='n'&&qa)qaFinalLife();if(k==='h'&&qa)qaLandHive();if(k==='f'&&qa)qaFallHive();if(k==='j'&&qa)rockHitApe();if(k==='b'&&qa)logHeadHitApe();if(k==='t'&&qa)tripApe();if(k==='g'&&qa)rotateWorld(.065,.018,true);if(k==='l'&&qa)qaLandLog();if(k==='u'&&qa)qaCatchReward('gem');if(k==='y'&&qa)qaCatchReward('heart');if(k==='o'&&qa)qaCatchReward('coconutDrink');if(k==='x'&&qa)qaCatchReward('star');if(k==='e'&&qa)qaCatchReward('helmet');if(k==='d'&&qa){const hole=props.find(p=>p.kind==='hole');if(hole){apeN.copy(hole.n);fallInHole(hole);}}if(k==='p'&&qa)spawnDrop('rock');if(k==='q'&&qa)spawnCargoBurst();if(k==='w'&&qa)spawnDrop('banana');if(k==='z'&&qa){cameraZoom=.48;applyCameraZoom();}if(k==='v'&&qa){reversalCooldown=0;reversalFall=true;facing=1;tripApe();document.documentElement.dataset.shakeEvent='qa-reversal-fall';}if(MOVE_KEYS.includes(k))heldKeys[k]=true;});
addEventListener('keyup',e=>{const k=e.key.toLowerCase();if(MOVE_KEYS.includes(k))heldKeys[k]=false;});
addEventListener('blur',()=>{for(const k of MOVE_KEYS)heldKeys[k]=false;});
requestAnimationFrame(frame);
document.documentElement.dataset.gameModule='ready';
