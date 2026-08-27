import * as THREE from '../node_modules/.pnpm/three@0.179.1/node_modules/three/build/three.module.js';
import { GLTFExporter } from '../node_modules/.pnpm/three@0.179.1/node_modules/three/examples/jsm/exporters/GLTFExporter.js';
import { writeFile, mkdir } from 'node:fs/promises';

class NodeFileReader {
  readAsArrayBuffer(blob){blob.arrayBuffer().then(v=>{this.result=v;this.onloadend?.();this.onload?.();});}
  readAsDataURL(blob){blob.arrayBuffer().then(v=>{this.result=`data:${blob.type};base64,${Buffer.from(v).toString('base64')}`;this.onloadend?.();this.onload?.();});}
}
globalThis.FileReader=NodeFileReader;

const bark=new THREE.MeshStandardMaterial({name:'Bark',color:0x8b4a20,roughness:.9});
const barkLight=new THREE.MeshStandardMaterial({name:'BarkBands',color:0xc0712d,roughness:.86});
const leafA=new THREE.MeshStandardMaterial({name:'LeafDark',color:0x315f16,roughness:.76,side:THREE.DoubleSide});
const leafB=new THREE.MeshStandardMaterial({name:'LeafLight',color:0x6e9d22,roughness:.72,side:THREE.DoubleSide});
const stoneA=new THREE.MeshStandardMaterial({name:'StoneWarm',color:0x786f5c,roughness:.94,flatShading:true});
const cut=new THREE.MeshStandardMaterial({name:'CutWood',color:0xc78b4a,roughness:.9});

function palm(){
  const g=new THREE.Group();g.name='Palm';
  const curve=new THREE.CatmullRomCurve3([new THREE.Vector3(0,0,0),new THREE.Vector3(.03,.5,0),new THREE.Vector3(.1,1.1,.01),new THREE.Vector3(.2,1.7,0)]);
  const trunk=new THREE.Mesh(new THREE.TubeGeometry(curve,28,.1,10,false),bark);trunk.name='Palm_Trunk';g.add(trunk);
  for(let i=0;i<11;i++){const ring=new THREE.Mesh(new THREE.TorusGeometry(.102-i*.002,.015,6,14),barkLight);ring.position.copy(curve.getPoint(.04+i*.08));ring.rotation.x=Math.PI/2;g.add(ring);}
  const crown=new THREE.Group();crown.name='Palm_Crown';crown.position.set(.2,1.7,0);g.add(crown);
  const shape=new THREE.Shape();shape.moveTo(0,0);for(const [x,y] of [[-.09,.1],[-.2,.2],[-.11,.27],[-.23,.38],[-.12,.46],[-.2,.58],[-.09,.65],[-.14,.78],[0,1.02],[.14,.78],[.09,.65],[.2,.58],[.12,.46],[.23,.38],[.11,.27],[.2,.2],[.09,.1]])shape.lineTo(x,y);shape.closePath();
  const geo=new THREE.ShapeGeometry(shape,6);
  for(let i=0;i<14;i++){const a=i/14*Math.PI*2,m=new THREE.Mesh(geo,i%2?leafA:leafB);m.name=`Frond_${i}`;m.rotation.order='YXZ';m.rotation.y=-a;m.rotation.x=-Math.PI/2+.58+(i%3)*.06;m.scale.set(1.05+(i%4)*.04,1.04+(i%3)*.05,1);crown.add(m);}
  for(let i=0;i<5;i++){const a=i/5*Math.PI*2,nut=new THREE.Mesh(new THREE.SphereGeometry(.085,14,10),leafB);nut.name=`Coconut_${i}`;nut.position.set(Math.cos(a)*.11,-.1,Math.sin(a)*.11);nut.scale.set(.82,1.12,.82);crown.add(nut);}
  return g;
}

function rock(){const g=new THREE.Group();g.name='Rock';const m=new THREE.Mesh(new THREE.DodecahedronGeometry(.55,1),stoneA);m.name='Rock_Main';m.position.y=.22;m.scale.set(1.12,.7,.9);g.add(m);const chip=new THREE.Mesh(new THREE.DodecahedronGeometry(.17,0),stoneA);chip.name='Rock_Chip';chip.position.set(.42,.08,-.08);chip.scale.set(1,.62,.82);g.add(chip);return g;}
function log(){const g=new THREE.Group();g.name='Log';const m=new THREE.Mesh(new THREE.CylinderGeometry(.22,.28,1.45,16),bark);m.name='Log_Trunk';m.rotation.z=Math.PI/2;m.position.y=.22;g.add(m);for(const x of [-.73,.73]){const e=new THREE.Mesh(new THREE.CylinderGeometry(.225,.225,.02,16),cut);e.name='Log_Cut';e.rotation.z=Math.PI/2;e.position.x=x;g.add(e);for(const r of [.07,.13,.19]){const ring=new THREE.Mesh(new THREE.TorusGeometry(r,.009,5,24),bark);ring.rotation.y=Math.PI/2;ring.position.x=x+(x>0?.012:-.012);g.add(ring);}}return g;}

const root=new THREE.Group();root.name='BananaPlanet_Jungle_Set';const p=palm(),r=rock(),l=log();p.position.x=-2;r.position.x=0;l.position.x=2;root.add(p,r,l);
root.traverse(o=>{if(o.isMesh){o.castShadow=true;o.receiveShadow=true;}});
await mkdir(new URL('../assets/models/',import.meta.url),{recursive:true});
const data=await new Promise((resolve,reject)=>new GLTFExporter().parse(root,resolve,reject,{binary:true,onlyVisible:true}));
await writeFile(new URL('../assets/models/jungle-core.glb',import.meta.url),Buffer.from(data));
console.log('wrote assets/models/jungle-core.glb',data.byteLength);
