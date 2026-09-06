const $=id=>document.getElementById(id);
let G=null,C=null;
let selectedMode='EASY';

/* ---------- AUDIO ENGINE ---------- */
const Sound={
  ctx:null, master:null, enabled:true,
  init(){
    try{
      if(!this.ctx){
        this.ctx=new (window.AudioContext||window.webkitAudioContext)();
        this.master=this.ctx.createGain();
        this.master.gain.value=0.55;
        this.master.connect(this.ctx.destination);
      }
      if(this.ctx.state==='suspended') this.ctx.resume();
    }catch(e){ console.warn('Audio unavailable',e); }
  },
  unlock(){this.init(); if(this.ctx && this.ctx.state==='suspended'){this.ctx.resume().catch(()=>{});}},
  tone(freq,dur,type='sine',gain=0.05,delay=0,cutoff=2200){
    if(!this.enabled)return;
    this.init(); if(!this.ctx||!this.master)return;
    const t=this.ctx.currentTime+delay;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
    f.type='lowpass'; f.frequency.value=cutoff; f.Q.value=0.7;
    o.type=type; o.frequency.setValueAtTime(freq,t);
    g.gain.setValueAtTime(0.0001,t);
    g.gain.exponentialRampToValueAtTime(gain,t+0.03);
    g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(f); f.connect(g); g.connect(this.master);
    o.start(t); o.stop(t+dur+0.03);
  },
  sweep(a,b,dur,type='sine',gain=0.04){
    if(!this.enabled)return;
    this.init(); if(!this.ctx||!this.master)return;
    const t=this.ctx.currentTime;
    const o=this.ctx.createOscillator(),g=this.ctx.createGain(),f=this.ctx.createBiquadFilter();
    f.type='lowpass'; f.frequency.value=1600;
    o.type=type; o.frequency.setValueAtTime(a,t); o.frequency.exponentialRampToValueAtTime(Math.max(20,b),t+dur);
    g.gain.setValueAtTime(0.0001,t); g.gain.exponentialRampToValueAtTime(gain,t+0.03); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    o.connect(f); f.connect(g); g.connect(this.master); o.start(t); o.stop(t+dur+0.03);
  },
  click(){this.tone(360,0.09,'sine',0.045);this.tone(540,0.07,'sine',0.018,0.01)},
  type(){if(Math.random()<0.65)this.tone(760+Math.random()*90,0.035,'sine',0.01,0,2000)},
  siren(){this.sweep(440,660,0.5);setTimeout(()=>this.sweep(660,440,0.5),450)},
  reveal(){this.tone(700,0.06,'sine',0.035,0,1800)},
  correct(){[523,659,784,1047].forEach((f,i)=>this.tone(f,0.32,'triangle',0.06,i*0.12,2400))},
  wrong(){this.sweep(300,170,0.3,'triangle',0.04)},
  unlock(){this.tone(392,0.1,'triangle',0.06);this.tone(587,0.14,'triangle',0.055,0.1);this.tone(784,0.24,'sine',0.05,0.2)},
  win(){this.correct()},
  lose(){[392,349,311].forEach((f,i)=>this.tone(f,0.48,'triangle',0.045,i*0.2,900))}
};

function typeWriter(el,text,speed=14,onDone){
  if(!el)return null;
  el.innerHTML='';
  const cursor=document.createElement('span'); cursor.className='cursor';
  let i=0,stopped=false;
  const node=document.createTextNode(''); el.appendChild(node); el.appendChild(cursor);
  function step(){
    if(stopped)return;
    if(i<text.length){ node.nodeValue+=text[i]; if(i%3===0)Sound.type(); i++; setTimeout(step,speed); }
    else { cursor.remove(); if(onDone)onDone(); }
  }
  step();
  return {skip(){if(stopped)return;stopped=true;node.nodeValue=text;cursor.remove();if(onDone)onDone();}};
}

async function api(path,data){
  const opts=data===undefined
    ? {cache:'no-store'}
    : {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(data)};
  const r=await fetch(path,opts);
  if(!r.ok) throw new Error(`${r.status} ${r.statusText}`);
  return r.json();
}
const esc=s=>String(s??'').replace(/[&<>\"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;',"'":'&#39;'}[c]));
function avatarMarkup(name,small=false){
  const palette={Raven:'#46d7d1',Zephyr:'#edb04e',Luca:'#8fd473',Marinette:'#ff8a5c',Adrien:'#a78bfa'};
  const color=palette[name]||'#9aa89d';
  const initials=String(name||'?').slice(0,2).toUpperCase();
  return `<div class="avatar${small?' avatar-sm':''}" style="background:${color}22;border:2px solid ${color}"><svg viewBox="0 0 56 56" aria-hidden="true"><circle cx="28" cy="21" r="10" fill="${color}" opacity=".9"/><path d="M11 50c2-11 9-17 17-17s15 6 17 17" fill="${color}" opacity=".7"/><text x="28" y="54" text-anchor="middle" fill="#08110a" font-family="monospace" font-size="8" font-weight="700">${esc(initials)}</text></svg></div>`;
}
function show(id){document.querySelectorAll('.screen').forEach(x=>x.classList.remove('active'));const el=$(id);if(el)el.classList.add('active');}
function openModal(id){$(id)?.classList.add('active');}
function closeModal(id){$(id)?.classList.remove('active');}
function closeAll(){document.querySelectorAll('.modal-backdrop').forEach(x=>x.classList.remove('active'));}

const ROOM_ICON = {
  Laboratory: `<svg class="icon" viewBox="0 0 40 40" fill="none"><path d="M15 6h10v9l7 15a3 3 0 01-3 4H11a3 3 0 01-3-4l7-15V6z" stroke="#46d7d1" stroke-width="1.6"/><path d="M13 6h14" stroke="#46d7d1" stroke-width="1.6" stroke-linecap="round"/><path d="M14 24h12" stroke="#edb04e" stroke-width="1.4"/><circle cx="18" cy="29" r="1.4" fill="#46d7d1"/><circle cx="23" cy="31" r="1" fill="#edb04e"/></svg>`,
  Storage: `<svg class="icon" viewBox="0 0 40 40" fill="none"><rect x="7" y="12" width="26" height="20" rx="1" stroke="#edb04e" stroke-width="1.6"/><path d="M7 18h26" stroke="#edb04e" stroke-width="1.2"/><path d="M15 12v6M25 12v6" stroke="#ff8a5c" stroke-width="1.2"/><path d="M7 12l6-4h14l6 4" stroke="#edb04e" stroke-width="1.4"/></svg>`,
  Cafeteria: `<svg class="icon" viewBox="0 0 40 40" fill="none"><rect x="8" y="10" width="24" height="16" rx="2" stroke="#ff8a5c" stroke-width="1.6"/><path d="M8 16h24" stroke="#ff8a5c" stroke-width="1.2"/><rect x="12" y="19" width="6" height="4" stroke="#edb04e" stroke-width="1.2"/><rect x="21" y="19" width="6" height="4" stroke="#edb04e" stroke-width="1.2"/><path d="M14 26v4M26 26v4" stroke="#ff8a5c" stroke-width="1.4"/></svg>`
};

/* ---------- ROOM SCENES — richer illustrations shown when a room is opened ---------- */
const ROOM_SCENE = {
  /* Each scene is a full walk-in "diorama": back wall, receding floor, ceiling
     light, midground furniture and a foreground prop — built with basic
     perspective so it reads as a real room, not a row of icons. */
  Laboratory: `<div class="scene-full lab"><svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="labWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#123331"/><stop offset="100%" stop-color="#0a1c1a"/></linearGradient>
      <linearGradient id="labFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#0e211f"/><stop offset="100%" stop-color="#060f0e"/></linearGradient>
      <radialGradient id="labGlow" cx="50%" cy="10%" r="70%"><stop offset="0%" stop-color="rgba(140,255,235,0.30)"/><stop offset="100%" stop-color="rgba(140,255,235,0)"/></radialGradient>
    </defs>
    <rect width="640" height="360" fill="url(#labWall)"/>
    <polygon points="0,246 640,246 640,360 0,360" fill="url(#labFloor)"/>
    <g stroke="#1c3d3a" stroke-width="1" opacity="0.55">
      <line x1="70" y1="246" x2="0" y2="330"/><line x1="230" y1="246" x2="190" y2="360"/>
      <line x1="410" y1="246" x2="450" y2="360"/><line x1="570" y1="246" x2="640" y2="330"/>
      <line x1="0" y1="278" x2="640" y2="278"/><line x1="40" y1="312" x2="600" y2="312"/>
    </g>
    <rect x="574" y="118" width="60" height="128" fill="#050b0a" stroke="#1c3d3a" stroke-width="2"/>
    <rect x="0" y="0" width="640" height="360" fill="url(#labGlow)"/>
    <g transform="translate(26,34)">
      <rect width="196" height="150" rx="3" fill="#0d2422" stroke="#2fa39b" stroke-width="1.5"/>
      <text x="10" y="20" fill="#8fe9e1" font-family="monospace" font-size="12">PERIODIC REFERENCE</text>
      <g stroke="#2fa39b" stroke-width="0.7" opacity="0.7">
        <line x1="10" y1="30" x2="186" y2="30"/><line x1="10" y1="56" x2="186" y2="56"/>
        <line x1="10" y1="82" x2="186" y2="82"/><line x1="10" y1="108" x2="186" y2="108"/><line x1="10" y1="134" x2="186" y2="134"/>
      </g>
      <text x="14" y="46" fill="#46d7d1" font-family="monospace" font-size="11">H                    He</text>
      <text x="14" y="72" fill="#46d7d1" font-family="monospace" font-size="11">Li Be  B  C  N  O  F  Ne</text>
      <text x="14" y="98" fill="#46d7d1" font-family="monospace" font-size="11">Na Mg Al Si  P  S Cl Ar</text>
      <text x="14" y="124" fill="#46d7d1" font-family="monospace" font-size="11">K  Ca Sc Ti  V Cr Mn Fe</text>
      <text x="14" y="146" fill="#46d7d1" font-family="monospace" font-size="11">Co Ni Cu Zn Ga Ge As Se</text>
    </g>
    <g transform="translate(252,54)">
      <rect x="-6" y="66" width="150" height="10" fill="#173836"/>
      <rect x="10" y="16" width="18" height="52" rx="4" fill="#0e2624" stroke="#46d7d1" stroke-width="1.4"/>
      <rect x="13" y="38" width="12" height="26" fill="#46d7d1" class="tube-flicker"/>
      <rect x="42" y="10" width="18" height="58" rx="4" fill="#0e2624" stroke="#edb04e" stroke-width="1.4"/>
      <rect x="45" y="32" width="12" height="32" fill="#edb04e" class="tube-flicker"/>
      <rect x="74" y="20" width="18" height="48" rx="4" fill="#0e2624" stroke="#8fd473" stroke-width="1.4"/>
      <rect x="77" y="38" width="12" height="26" fill="#8fd473" class="tube-flicker"/>
      <rect x="106" y="14" width="18" height="54" rx="4" fill="#0e2624" stroke="#ff6a45" stroke-width="1.4"/>
      <rect x="109" y="34" width="12" height="30" fill="#ff6a45" class="tube-flicker"/>
      <text x="0" y="94" fill="#7fd9d1" font-family="monospace" font-size="10">REAGENT SHELF</text>
    </g>
    <g class="bulb-swing" transform="translate(360,0)">
      <line x1="0" y1="0" x2="0" y2="58" stroke="#173836" stroke-width="3"/>
      <ellipse cx="0" cy="64" rx="28" ry="10" fill="#0e2624" stroke="#2fa39b" stroke-width="2"/>
      <circle cx="0" cy="68" r="9" fill="#c8fff2" class="blink-slow"/>
    </g>
    <g transform="translate(300,196)">
      <rect x="-100" y="42" width="230" height="66" rx="4" fill="#12302d" stroke="#2fa39b" stroke-width="2"/>
      <rect x="-100" y="32" width="230" height="14" fill="#173836"/>
      <circle cx="18" cy="24" r="36" fill="#0d2423" stroke="#46d7d1" stroke-width="3"/>
      <circle cx="18" cy="24" r="36" fill="none" stroke="#ff6a45" stroke-width="2.5" stroke-dasharray="5 9" class="blink-fast"/>
      <circle cx="18" cy="24" r="5" fill="#ff6a45" class="blink-fast"/>
      <text x="-92" y="66" fill="#7fd9d1" font-family="monospace" font-size="11">CENTRIFUGE — UNIT 4</text>
      <rect x="80" y="8" width="40" height="34" rx="2" fill="#0e2624" stroke="#2fa39b" stroke-width="1.3"/>
      <text x="86" y="29" fill="#8fe9e1" font-family="monospace" font-size="9">11:52</text>
    </g>
    <circle class="dust" cx="140" cy="120" r="2" fill="#8fe9e1" opacity="0.4"/>
    <circle class="dust" cx="420" cy="90" r="1.6" fill="#8fe9e1" opacity="0.3" style="animation-delay:1.2s"/>
    <circle class="dust" cx="500" cy="160" r="2.2" fill="#8fe9e1" opacity="0.35" style="animation-delay:2.4s"/>
  </svg><span class="scene-tag">LABORATORY · workstation of Raven, Head Chemist</span></div>`,

  Storage: `<div class="scene-full storage"><svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="stoWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#332711"/><stop offset="100%" stop-color="#160f08"/></linearGradient>
      <linearGradient id="stoFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#1c1509"/><stop offset="100%" stop-color="#0d0904"/></linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#stoWall)"/>
    <polygon points="0,246 640,246 640,360 0,360" fill="url(#stoFloor)"/>
    <g stroke="#3a2c14" stroke-width="1" opacity="0.6">
      <line x1="0" y1="278" x2="640" y2="278"/><line x1="30" y1="312" x2="610" y2="312"/>
      <line x1="90" y1="246" x2="20" y2="360"/><line x1="260" y1="246" x2="220" y2="360"/>
      <line x1="420" y1="246" x2="460" y2="360"/><line x1="560" y1="246" x2="620" y2="360"/>
    </g>
    <g transform="translate(20,26)">
      <rect width="600" height="34" fill="#241b0c" stroke="#a87825" stroke-width="2"/>
      <rect y="52" width="600" height="34" fill="#241b0c" stroke="#a87825" stroke-width="2"/>
      <rect y="104" width="600" height="34" fill="#241b0c" stroke="#a87825" stroke-width="2"/>
      <rect x="18" y="4" width="46" height="26" fill="#4a3719" stroke="#edb04e"/>
      <rect x="70" y="4" width="46" height="26" fill="#4a3719" stroke="#edb04e"/>
      <rect x="122" y="4" width="46" height="26" fill="#241b0c" stroke="#ff6a45" stroke-dasharray="4 4"/>
      <text x="26" y="21" fill="#f2c98a" font-family="monospace" font-size="9">FILTER</text>
      <text x="78" y="21" fill="#f2c98a" font-family="monospace" font-size="9">FILTER</text>
      <text x="126" y="21" fill="#ff8a5c" font-family="monospace" font-size="9">GONE</text>
      <rect x="18" y="56" width="46" height="26" fill="#4a3719" stroke="#edb04e"/>
      <rect x="70" y="56" width="46" height="26" fill="#241b0c" stroke="#ff6a45" stroke-dasharray="4 4"/>
      <rect x="122" y="56" width="46" height="26" fill="#4a3719" stroke="#edb04e"/>
      <text x="26" y="73" fill="#f2c98a" font-family="monospace" font-size="9">FILTER</text>
      <text x="78" y="73" fill="#ff8a5c" font-family="monospace" font-size="9">GONE</text>
      <text x="130" y="73" fill="#f2c98a" font-family="monospace" font-size="9">FILTER</text>
      <rect x="220" y="8" width="70" height="120" fill="#1e1608" stroke="#a87825" stroke-width="1.5"/>
      <text x="228" y="26" fill="#f2c98a" font-family="monospace" font-size="10">RESTRICTED</text>
      <line x1="228" y1="34" x2="282" y2="34" stroke="#a87825"/>
      <line x1="228" y1="60" x2="282" y2="60" stroke="#a87825" opacity="0.5"/>
      <line x1="228" y1="86" x2="282" y2="86" stroke="#a87825" opacity="0.5"/>
      <line x1="228" y1="112" x2="282" y2="112" stroke="#a87825" opacity="0.5"/>
    </g>
    <g transform="translate(360,60)">
      <rect width="90" height="140" rx="3" fill="#100c05" stroke="#edb04e" stroke-width="2"/>
      <g stroke="#edb04e" stroke-width="2" opacity="0.85">
        <line x1="12" y1="20" x2="78" y2="20"/><line x1="12" y1="38" x2="78" y2="38"/>
        <line x1="12" y1="56" x2="78" y2="56"/><line x1="12" y1="74" x2="78" y2="74"/>
        <line x1="12" y1="92" x2="78" y2="92"/><line x1="12" y1="110" x2="78" y2="110"/>
      </g>
      <rect width="90" height="140" fill="#edb04e" opacity="0.14" class="blink-slow"/>
      <text x="10" y="130" fill="#f2c98a" font-family="monospace" font-size="10">VENT GRATE</text>
    </g>
    <g transform="translate(480,90)" stroke="#ff8a5c" stroke-width="2.5" fill="none">
      <circle cx="30" cy="30" r="28"/>
      <path d="M30 6v48M6 30h48M14 14l32 32M46 14l-32 32"/>
      <circle cx="30" cy="30" r="6" fill="#ff8a5c" stroke="none" class="blink-fast"/>
    </g>
    <text x="470" y="150" fill="#ffb98f" font-family="monospace" font-size="10">OVERRIDE PANEL</text>
    <g class="bulb-swing" transform="translate(150,0)">
      <line x1="0" y1="0" x2="0" y2="46" stroke="#4a3719" stroke-width="3"/>
      <ellipse cx="0" cy="52" rx="22" ry="8" fill="#241b0c" stroke="#edb04e" stroke-width="2"/>
      <circle cx="0" cy="56" r="7" fill="#ffe6b0" class="blink-slow"/>
    </g>
    <circle class="dust" cx="200" cy="180" r="1.8" fill="#f2c98a" opacity="0.3"/>
    <circle class="dust" cx="420" cy="200" r="2" fill="#f2c98a" opacity="0.28" style="animation-delay:1.6s"/>
  </svg><span class="scene-tag">STORAGE · shelving bay, sublevel — Zephyr's station</span></div>`,

  Cafeteria: `<div class="scene-full cafeteria"><svg viewBox="0 0 640 360" xmlns="http://www.w3.org/2000/svg">
    <defs>
      <linearGradient id="cafWall" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#33200f"/><stop offset="100%" stop-color="#180f08"/></linearGradient>
      <linearGradient id="cafFloor" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#201408"/><stop offset="100%" stop-color="#0e0805"/></linearGradient>
    </defs>
    <rect width="640" height="360" fill="url(#cafWall)"/>
    <polygon points="0,246 640,246 640,360 0,360" fill="url(#cafFloor)"/>
    <g stroke="#5a3a20" stroke-width="1" opacity="0.5">
      <line x1="0" y1="278" x2="640" y2="278"/><line x1="40" y1="312" x2="600" y2="312"/>
      <line x1="100" y1="246" x2="40" y2="360"/><line x1="260" y1="246" x2="240" y2="360"/>
      <line x1="420" y1="246" x2="440" y2="360"/><line x1="580" y1="246" x2="640" y2="360"/>
    </g>
    <g transform="translate(0,10)"><rect x="60" y="0" width="220" height="10" fill="#2a1c10"/>
      <rect x="70" y="2" width="200" height="5" fill="#ffdca8" opacity="0.5" class="tile-flicker"/></g>
    <g transform="translate(46,52)">
      <rect width="160" height="150" rx="5" fill="#241609" stroke="#ff8a5c" stroke-width="2.2"/>
      <rect x="8" y="10" width="144" height="60" rx="3" fill="#150c05" stroke="#a87825"/>
      <text x="16" y="26" fill="#ffb98f" font-family="monospace" font-size="11">MACHINE #3</text>
      <text x="16" y="42" fill="#ffb98f" font-family="monospace" font-size="10">RESTOCK: ACTIVE</text>
      <rect x="16" y="50" width="60" height="14" rx="2" fill="#0e0803"/>
      <circle cx="26" cy="57" r="4" fill="#8fd473" class="blink-slow"/>
      <circle cx="40" cy="57" r="4" fill="#edb04e" class="blink-fast"/>
      <circle cx="54" cy="57" r="4" fill="#ff6a45" class="blink-slow"/>
      <rect x="14" y="82" width="60" height="58" rx="3" fill="#150c05" stroke="#a87825" stroke-width="1.4"/>
      <rect x="86" y="82" width="60" height="58" rx="3" fill="#150c05" stroke="#a87825" stroke-width="1.4"/>
      <circle cx="44" cy="111" r="14" fill="none" stroke="#edb04e" stroke-width="1.6"/>
      <circle cx="116" cy="111" r="14" fill="none" stroke="#edb04e" stroke-width="1.6"/>
    </g>
    <g transform="translate(250,86)">
      <rect width="140" height="70" rx="3" fill="#241609" stroke="#a87825" stroke-width="1.6"/>
      <line x1="0" y1="34" x2="140" y2="34" stroke="#a87825"/>
      <rect x="14" y="12" width="26" height="18" fill="#3a2c14"/>
      <rect x="52" y="12" width="26" height="18" fill="#3a2c14"/>
      <rect x="90" y="12" width="26" height="18" fill="#3a2c14"/>
      <text x="12" y="60" fill="#f2c98a" font-family="monospace" font-size="10">SERVING TRAYS</text>
    </g>
    <g transform="translate(430,60)">
      <rect width="150" height="150" rx="4" fill="#241609" stroke="#ff8a5c" stroke-width="2.2"/>
      <line x1="14" y1="38" x2="136" y2="38" stroke="#a87825"/>
      <text x="14" y="26" fill="#ffb98f" font-family="monospace" font-size="12">SHIFT LOG</text>
      <text x="14" y="60" fill="#ffe6b0" font-family="monospace" font-size="24" letter-spacing="4">? ? 1 9</text>
      <text x="14" y="128" fill="#f2c98a" font-family="monospace" font-size="9">MACHINE #3 · SUPPLY</text>
      <text x="14" y="140" fill="#f2c98a" font-family="monospace" font-size="9">COORDINATOR SHIFT</text>
    </g>
    <g transform="translate(150,220)" stroke="#5a3a20" stroke-width="2" fill="none">
      <ellipse cx="0" cy="0" rx="46" ry="14"/>
      <circle cx="-64" cy="10" r="10"/><circle cx="64" cy="10" r="10"/>
    </g>
  </svg><span class="scene-tag">CAFETERIA · overnight restocking cycle</span></div>`
};




async function renderBrief(){
  if(!C) return;
  show('screen-brief');

  const intro=$('introType');
  const tabs=$('briefTabs');
  const panel=$('briefPanel');
  const enter=$('btnEnter');

  const keys=Object.keys(C.background||{});
  tabs.innerHTML=keys.map((k,i)=>
    `<div class="tab ${i?'':'active'}" data-k="${esc(k)}">${esc(k)}</div>`
  ).join('');

  const renderPanel=(key)=>{
    panel.innerHTML=(C.background?.[key]||[])
      .map(row=>`<div class="entry"><div class="k">${esc(row[0])}</div><div class="v">${esc(row[1])}</div></div>`)
      .join('');
  };

  renderPanel(keys[0]||'');
  tabs.querySelectorAll('.tab').forEach(tab=>{
    tab.onclick=()=>{
      Sound.click();
      tabs.querySelectorAll('.tab').forEach(x=>x.classList.remove('active'));
      tab.classList.add('active');
      renderPanel(tab.dataset.k);
    };
  });

  enter.disabled=true;
  const text=String(C.intro||'');
  typeWriter(intro,text,12,()=>{
    enter.disabled=false;
    Sound.reveal();
  });
}

function renderHub(){
  const grid=$('roomsGrid'); grid.innerHTML='';
  C.rooms.forEach(room=>{
    const done=G.visited_rooms.includes(room),d=document.createElement('div');
    d.className='room '+room.toLowerCase()+(done?' done':'');
    let status=room==='Storage'&&G.storage_riddle_solved?(G.storage_evidence_found?'Evidence recovered':'Search completed'):(room==='Cafeteria'&&done?(G.cafeteria_evidence_found?'Full clue recovered':'Partial clue recovered'):(done?'Investigated':'Not investigated'));
    d.innerHTML=`<span class="badge"></span>${ROOM_ICON[room]}<div class="name">${room.toUpperCase()}</div><div class="status">${status}</div>`;
    d.onclick=()=>openRoom(room);grid.appendChild(d);
  });
  const clues=[['lab_acrostic','Laboratory note recovered'],['cafeteria_pin','Cafeteria receipt recovered'],['storage_ventilation','Ventilation override log recovered']];
  $('clueList').innerHTML=clues.map(([k,l])=>{const on=G.clues.includes(k);return `<div class="clue-item ${on?'on':''}"><span class="chk">${on?'✓':''}</span><span>${l}</span></div>`}).join('');
  $('clueList').innerHTML+=`<div class="clue-item ${G.pin_cracked?'on':''}"><span class="chk">${G.pin_cracked?'✓':''}</span><span>Terminal PIN cracked</span></div>`;
  $('logFeed').innerHTML=G.log.slice(-14).map((x,i,a)=>`<div class="row ${i===a.length-1?'new':''}">&gt; ${esc(x)}</div>`).join('')||'<div class="empty">Field log is empty.</div>';
  const interrogationUnlocked=true;
  $('btnSuspects').disabled=!interrogationUnlocked;
  $('btnSuspects').textContent='🎙 Interrogation Room';
  const accusationUnlocked=Boolean(C && Array.isArray(G.asked) && C.characters.every(name=>G.asked.includes(name)));
  $('btnAccuse').disabled=!accusationUnlocked;
  $('btnAccuse').textContent=accusationUnlocked?'⚖ Make Accusation':'🔒 Question Everyone First';
}

async function openRoom(room){
  Sound.click();
  const body=$('roomModalBody');
  if(!G.visited_rooms.includes(room)){
    const z=await api('/api/room',{room});G=z.state;
    if(!z.ok){body.innerHTML=`<div class="room-content"><p>${esc(z.result)}</p></div>`;openModal('modalRoom');return;}
  }
  if(room==='Laboratory'){
    body.innerHTML=`${ROOM_SCENE.Laboratory}<div class="room-content lab"><div class="stamp">FOUND ON WORKSTATION</div><h2>THE LABORATORY NOTE</h2><div class="type-out" id="labType"></div></div>`;
    typeWriter($('labType'),'Filter pressure was stable before midnight.\nOne centrifuge cycle was interrupted manually.\nUp and active Raven\'s workstation.\nRecorded interruption at 11:52 PM.',12);
  } else if(room==='Storage'){
    if(G.storage_riddle_solved){
      body.innerHTML=`${ROOM_SCENE.Storage}<div class="room-content storage"><div class="stamp">SEARCH RESULT</div><h2>THE STORAGE RIDDLE</h2><div class="handwritten-note">${C.storage_riddle.map(esc).join('<br>')}</div>${G.storage_evidence_found?'<div class="term-msg ok"><b>VENTILATION OVERRIDE FOUND</b><br>Override access registered in Storage at 11:50 PM. The Storage ventilation override can only be used by Supply and Maintenance. Maintenance is out right now.</div>':''}</div>`;
    } else {
      body.innerHTML=`${ROOM_SCENE.Storage}<div class="room-content storage"><div class="stamp">HANDWRITTEN, PINNED TO A SHELF</div><h2>THE STORAGE RIDDLE</h2><div class="handwritten-note" id="storageType"></div><div style="margin-top:18px;display:flex;gap:10px;flex-wrap:wrap"><input id="riddleInput" class="term-input" style="color:var(--ink);background:rgba(230,220,190,0.9);border-color:var(--storage-dim);text-transform:uppercase" placeholder="Your answer…"><button class="btn-primary" id="riddleSubmit" style="padding:10px 18px">Solve</button></div><div class="term-msg" id="riddleMsg"></div></div>`;
      typeWriter($('storageType'),C.storage_riddle.join('\n'),18);
      const submit=async()=>{Sound.click();const z=await api('/api/storage',{answer:$('riddleInput').value});G=z.state;if(!z.ok){$('riddleMsg').textContent=z.result;Sound.wrong();return;}Sound.reveal();renderHub();openRoom('Storage');};
      $('riddleSubmit').onclick=submit;$('riddleInput').onkeydown=e=>{if(e.key==='Enter')submit()};
    }
  } else {
    const cafeClue = G.cafeteria_evidence_found ? C.cafeteria_clues.found : C.cafeteria_clues.partial;
    body.innerHTML=`${ROOM_SCENE.Cafeteria}<div class="room-content cafeteria"><div class="stamp">${esc(cafeClue.title)}</div><h2>${esc(cafeClue.title)}</h2><p style="font-size:30px;letter-spacing:.3em;font-family:var(--mono);margin:14px 0;color:var(--cafe)">${esc(cafeClue.pin_fragment)}</p><p>${esc(cafeClue.note)}</p></div>`;
  }
  openModal('modalRoom');
}

function terminal(){
  Sound.click();
  if(G.security_challenge_active){wordle();return;}
  if(G.pin_cracked){
    const mode = G.security_mode || (G.security_challenge_active ? 'HARD' : 'EASY');
    const securityLine = mode==='HARD'
      ? (G.security_failed ? '⚠ SECONDARY CHECK FAILED' : (G.security_challenge_complete ? '✓ SECONDARY CHECK PASSED' : 'HARD MODE — WORDLE ACTIVE'))
      : (G.security_failed ? '⚠ SECONDARY CHECK FAILED' : '✓ SECONDARY CHECK PASSED');
    $('terminalBody').innerHTML=`<div class="terminal-ok"><div class="stamp">ACCESS VERIFIED</div><h2>Restricted Access Terminal</h2><div class="term-msg ok" style="font-size:18px;margin-top:14px"><b>✓ PIN VERIFIED</b></div><p class="sub" style="margin-top:12px">${securityLine}</p><p class="sub">Interrogation is available. The audit clue is recorded in Evidence &amp; Notes.</p><div style="margin-top:18px"><button class="btn-term" id="tc">CLOSE TERMINAL</button></div></div>`;
    openModal('modalTerminal');$('tc').onclick=()=>closeModal('modalTerminal');return;
  }
  $('terminalBody').innerHTML=`<div class="stamp">RESTRICTED TERMINAL</div><h2>Access Control</h2><p>Assemble the four-digit access code from the Laboratory, Storage, and Cafeteria clues.</p><div class="terminal-code"><input id="pi" maxlength="4" inputmode="numeric" placeholder="••••"><button class="btn-primary" id="pv">VERIFY</button></div><div id="pr" class="term-msg"></div>`;
  openModal('modalTerminal');
  $('pv').onclick=async()=>{const z=await api('/api/pin',{guess:$('pi').value});G=z.state;if(!z.ok){Sound.wrong();$('pr').textContent=z.result;return;}Sound.unlock();closeModal('modalTerminal');renderHub();if(G.security_challenge_active)wordle();};
  $('pi').onkeydown=e=>{if(e.key==='Enter')$('pv').click()};
}

function wordle(){
  Sound.click();
  const rows=Array.isArray(G.wordle_results)?G.wordle_results:[];
  const board=()=>Array.from({length:6},(_,r)=>{const row=rows[r];return `<div class="wordle-row">${Array.from({length:5},(_,c)=>{const letter=row?(row.guess[c]||''):'';const cls=row?(row.result[c]||''):'';return `<div class="wcell ${cls}">${esc(letter)}</div>`}).join('')}</div>`}).join('');
  $('terminalBody').innerHTML=`<div class="stamp">HARD MODE · SECONDARY SECURITY</div><h2>Security Lock</h2><p>Hard Mode is active because Storage and Cafeteria evidence were both recovered. Complete the 5-letter security check to continue to interrogation. The lock episode ends after 6 attempts, whether you solve it or not.</p><div id="wordleBoard" class="wordle-grid">${board()}</div><div style="display:flex;gap:10px;flex-wrap:wrap;margin-top:16px"><input class="term-input" id="wi" maxlength="5" autocomplete="off" spellcheck="false" placeholder="5 LETTERS"><button class="btn-primary" id="wv">SUBMIT</button></div><div id="wr" class="term-msg" style="margin-top:14px"></div><div style="font-family:var(--mono);font-size:12px;color:var(--text-faint);margin-top:10px">${rows.length}/6 attempts used</div>`;
  openModal('modalTerminal');$('wi').focus();
  $('wv').onclick=async()=>{
    const guess=$('wi').value.trim().toUpperCase();
    if(guess.length!==5){$('wr').textContent='ENTER A 5-LETTER WORD.';return;}
    const z=await api('/api/wordle',{guess});G=z.state;
    const latest=G.wordle_results||[];
    $('wordleBoard').innerHTML=Array.from({length:6},(_,r)=>{const row=latest[r];return `<div class="wordle-row">${Array.from({length:5},(_,c)=>{const letter=row?(row.guess[c]||''):'';const cls=row?(row.result[c]||''):'';return `<div class="wcell ${cls}">${esc(letter)}</div>`}).join('')}</div>`}).join('');
    const d=z.result;
    if(d&&typeof d==='object'&&d.status==='CORRECT'){
      Sound.correct();
      $('wordleBoard').innerHTML=`<div class="wordle-row">${['V','E','N','T','S'].map(x=>`<div class="wcell green">${x}</div>`).join('')}</div>`;
      $('wr').innerHTML='<span style="color:var(--toxic)">✓ SECURITY LOCK DEFEATED</span>';
      setTimeout(()=>{closeModal('modalTerminal');renderHub();},1100);return;
    }
    if(d&&typeof d==='object'){$('wr').textContent=d.status==='FAILED'?'SECURITY LOCK FAILED.':`ATTEMPTS REMAINING: ${d.attempts_remaining}`;if(d.status==='FAILED')Sound.wrong();else Sound.reveal();}
    else $('wr').textContent=String(d||'');
    if(d?.status!=='FAILED'){$('wi').value='';$('wi').focus();}
    else {closeModal('modalTerminal');renderHub();}
  };
  $('wi').onkeydown=e=>{if(e.key==='Enter')$('wv').click()};
}

function eyesOnly(){
  Sound.click();
  $('caseFileIntro').textContent=C.intro;
  const keys=Object.keys(C.background);
  $('caseFileTabs').innerHTML=keys.map((k,i)=>`<div class="tab ${i?'':'active'}" data-k="${esc(k)}">${esc(k)}</div>`).join('');
  const panel=k=>{$('caseFilePanel').innerHTML=(C.background[k]||[]).map(r=>`<div class="entry"><div class="k">${esc(r[0])}</div><div class="v">${esc(r[1])}</div></div>`).join('');};
  panel(keys[0]);
  document.querySelectorAll('#caseFileTabs .tab').forEach(b=>b.onclick=()=>{Sound.click();document.querySelectorAll('#caseFileTabs .tab').forEach(x=>x.classList.remove('active'));b.classList.add('active');panel(b.dataset.k);});
  openModal('modalCaseFile');
}

function notes(){
  Sound.click();
  const clues=G.clues.length?G.clues.map(esc).join('<br>'):'No evidence logged yet.';
  const statements=(G.evidence_notes||[]).map(n=>`<div style="margin-top:10px;padding:10px 12px;border-left:2px solid var(--line);background:rgba(0,0,0,.03);line-height:1.55">${esc(n)}</div>`).join('')||'<div class="empty">No interrogation statements recorded yet.</div>';
  $('notesBody').innerHTML=`<div class="stamp">EVIDENCE & NOTES</div><h2>Case File</h2><div class="paper"><b>RECOVERED EVIDENCE</b><br><br>${clues}</div><div class="paper" style="margin-top:14px"><b>INTERROGATION TRANSCRIPTS</b>${statements}</div>`;
  openModal('modalNotes');
}

async function suspects(){
  // Direct-access safety: if the hub handler fires before startup state has loaded, load it now.
  if(!C) C=await api('/api/case');
  if(!G) G=await api('/api/state');
  $('suspectsBody').innerHTML=`<div class="stamp">AUDIO TRANSCRIPTS</div><h2>Interrogation Room</h2><p>One question, once each — <b>${esc(G.detective_name||'DETECTIVE')}</b>: <i>“${esc(C.question)}”</i></p><div class="suspect-list" id="sl"></div><div id="ta"></div>`;
  $('sl').innerHTML=C.characters.map(n=>{const p=C.profiles[n],asked=G.asked.includes(n);return `<div class="suspect-card ${asked?'asked':''}" data-n="${esc(n)}">${avatarMarkup(n)}<div class="sinfo"><div class="name">${esc(n.toUpperCase())}</div><div class="role">${esc(p.role)} · ${esc(p.location)}</div><div class="tag">${asked?'Statement recorded':esc(p.personality)}</div></div></div>`}).join('');
  document.querySelectorAll('#sl .suspect-card').forEach(c=>c.onclick=async()=>{if(c.classList.contains('asked'))return;Sound.click();const z=await api('/api/question',{character:c.dataset.n});G=z.state;if(z.ok){Sound.reveal();$('ta').innerHTML=`<div class="transcript"><div style="display:flex;gap:12px;align-items:center;margin-bottom:10px">${avatarMarkup(c.dataset.n,true)}<div class="q">${esc(G.detective_name||'DETECTIVE').toUpperCase()}: “${esc(C.question)}”</div></div><div class="a">${esc(c.dataset.n.toUpperCase())}: “${esc(z.result)}”</div></div>`;c.classList.add('asked');}else $('ta').innerHTML=`<div class="transcript"><div class="a" style="color:var(--rust)">${esc(z.result)}</div></div>`;renderHub();});
  openModal('modalSuspects');
}

async function accuse(){
  Sound.click();
  // Direct-access safety: accusation must not depend on terminal/PIN state.
  if(!C) C=await api('/api/case');
  if(!G) G=await api('/api/state');
  if(G && G.game_over){return;}
  $('accuseBody').innerHTML=`<div class="stamp">FINAL DECISION</div><h2>Name the Mole</h2><p style="font-size:15px;color:rgba(0,0,0,.6)">This ends the investigation. Choose carefully.</p><div class="accuse-grid" id="ag"></div><p style="font-size:15px;color:rgba(0,0,0,.6);margin-bottom:6px">Your reasoning (optional):</p><textarea class="reason" id="ar" placeholder="Explain why this person is the mole…"></textarea><div id="accuseError" class="term-msg" style="color:var(--rust)"></div><div class="brief-actions" style="margin-top:16px"><button class="btn-primary btn-danger" id="ab" disabled>SUBMIT ACCUSATION</button></div>`;
  let pick=null;$('ag').innerHTML=C.characters.map(n=>`<div class="accuse-opt" data-n="${esc(n)}">${avatarMarkup(n,false)}<div style="margin-top:8px">${esc(n)}</div></div>`).join('');
  document.querySelectorAll('#ag .accuse-opt').forEach(x=>x.onclick=()=>{Sound.click();document.querySelectorAll('#ag .accuse-opt').forEach(y=>y.classList.remove('sel'));x.classList.add('sel');pick=x.dataset.n;$('ab').disabled=false;});
  $('ab').onclick=async()=>{if(!pick)return;$('ab').disabled=true;try{const z=await api('/api/accuse',{character:pick,reasoning:$('ar').value});G=z.state;if(!z.ok){$('accuseError').textContent=String(z.result||'Accusation failed.');$('ab').disabled=false;return;}closeAll();if(G.result==='win')Sound.win();else Sound.lose();finish();}catch(e){$('accuseError').textContent='Unable to submit accusation.';$('ab').disabled=false;}};
  openModal('modalAccuse');
}

function finish(){
  const win=G.result==='win';
  const end=$('screen-end');
  $('verdictText').textContent=win?'✓ MOLE CORRECTLY FOUND':'✕ WRONG ACCUSATION';
  $('verdictText').className='verdict '+(win?'win':'lose');
  $('verdictSub').innerHTML=win?'<b>YES — ZEPHYR IS THE MOLE.</b><br>THE MOLE WAS CAUGHT.':'<b>NO — '+esc((G.accused||'UNKNOWN').toUpperCase())+' IS NOT THE MOLE.</b><br>The real mole was <b>ZEPHYR</b>, the Supply Coordinator.';
  $('endReport').innerHTML=`<div class="stat-line"><span>Case result</span><b>${win?'MOLE CAUGHT':'MOLE ESCAPED'}</b></div><div class="stat-line"><span>Accused</span><b>${esc(G.accused||'—')}</b></div><div class="stat-line"><span>Security mode</span><b>${esc(G.security_mode||'—')}</b></div><div class="stat-line"><span>Security status</span><b>${G.security_failed?'FAILED':G.security_challenge_complete?'COMPLETED':'ACTIVE'}</b></div><div class="stat-line"><span>Actions taken</span><b>${G.actions_used}</b></div><div style="margin-top:18px;padding:16px;border-left:3px solid ${win?'var(--toxic-dim)':'var(--rust)'};background:rgba(0,0,0,.06);line-height:1.65"><b>${win?'THE MOLE WAS CAUGHT.':'THE MOLE ESCAPED.'}</b><br><br>${win?'The Laboratory, Cafeteria, Storage and interrogation evidence pointed to Zephyr.':'The actual mole was Zephyr.'}</div>`;
  show('screen-end');
  $('btnRestart').onclick=async()=>{Sound.click();try{await api('/api/new',{});}finally{window.location.href=window.location.pathname+'?new='+Date.now();}};
}

async function boot(){
  show('screen-boot');
  const begin=$('btnBegin');
  document.querySelectorAll('.mode-option').forEach(option=>{
    option.onclick=()=>{
      Sound.click();
      selectedMode=option.dataset.mode;
      document.querySelectorAll('.mode-option').forEach(x=>x.classList.toggle('active',x===option));
    };
  });
  if(begin){
    begin.onclick=async()=>{
      Sound.init();
      Sound.click();
      const nameInput=$('detectiveName');
      const name=String(nameInput?.value||'').trim();
      if(!name){
        if(nameInput){nameInput.focus();nameInput.classList.add('invalid');}
        return;
      }
      if(nameInput)nameInput.classList.remove('invalid');
      try{
        const player=await api('/api/player',{name,mode:selectedMode});
        if(!player.ok){alert(player.result||'Enter a detective name.');return;}
        G=player.state;
        if(!C)C=await api('/api/case');
      }catch(e){alert('Could not load the case. Make sure app.py is running.');return;}
      renderBrief();
    };
  }
  try{C=await api('/api/case');G=await api('/api/state');}catch(e){console.error('Startup load failed:',e);}
  const bind=(id,fn)=>{const el=$(id);if(el)el.onclick=fn;};
  bind('btnEnter',()=>{Sound.init();Sound.unlock();show('screen-hub');renderHub();});
  bind('btnEyesOnly',eyesOnly); bind('btnTerminal',terminal); bind('btnNotes',notes);
  bind('btnSuspects',()=>{suspects().catch(e=>console.error('Interrogation error:',e));});
  bind('btnAccuse',()=>{accuse().catch(e=>console.error('Accusation error:',e));});
  bind('closeRoom',()=>closeModal('modalRoom')); bind('closeTerminal',()=>closeModal('modalTerminal')); bind('closeSuspects',()=>closeModal('modalSuspects')); bind('closeNotes',()=>closeModal('modalNotes')); bind('closeAccuse',()=>closeModal('modalAccuse')); bind('closeCaseFile',()=>closeModal('modalCaseFile'));
  bind('soundToggle',()=>{Sound.enabled=!Sound.enabled;if(Sound.enabled){Sound.init();$('soundToggle').textContent='🔊 SOUND ON';Sound.click();}else $('soundToggle').textContent='🔇 SOUND OFF';});
  document.querySelectorAll('.modal-backdrop').forEach(m=>m.onclick=e=>{if(e.target===m)closeModal(m.id);});
  document.onkeydown=e=>{if(e.key==='Escape')closeAll();};
  if(G)renderHub();
}
boot();
