function buildTicks(){
  const ns = 'http://www.w3.org/2000/svg';
  if(!dom.ticksGroup) return;
  dom.ticksGroup.innerHTML = '';
  const frag = document.createDocumentFragment();

  // Helper to generate SVG arc paths with gaps
  function createArc(startAngle, endAngle, color, strokeWidth = 3.5){
    const r = 88;
    const cx = 100, cy = 100;
    const rad = deg => (deg - 90) * Math.PI / 180.0;
    const pStart = { x: cx + r * Math.cos(rad(endAngle)), y: cy + r * Math.sin(rad(endAngle)) };
    const pEnd = { x: cx + r * Math.cos(rad(startAngle)), y: cy + r * Math.sin(rad(startAngle)) };
    const largeArc = (endAngle - startAngle) <= 180 ? '0' : '1';

    const path = document.createElementNS(ns, 'path');
    path.setAttribute('d', `M ${pStart.x.toFixed(2)} ${pStart.y.toFixed(2)} A ${r} ${r} 0 ${largeArc} 0 ${pEnd.x.toFixed(2)} ${pEnd.y.toFixed(2)}`);
    path.setAttribute('fill', 'none');
    path.setAttribute('stroke', color);
    path.setAttribute('stroke-width', strokeWidth);
    path.setAttribute('stroke-linecap', 'round');
    path.setAttribute('class', 'neon-logo-arc');
    path.style.filter = `drop-shadow(0 0 6px ${color})`;
    return path;
  }

  // 1. Four Segmented Neon Perimeter Arcs with Gaps (Matching Logo)
  // Top-Left: Red (274° -> 356°)
  frag.appendChild(createArc(274, 356, '#ff2a55', 4));
  // Top-Right: Cyan (4° -> 58°)
  frag.appendChild(createArc(4, 58, '#00e5ff', 4));
  // Mid-Right: Gold/Yellow (64° -> 132°)
  frag.appendChild(createArc(64, 132, '#ffb800', 4));
  // Bottom Arc: Purple/Magenta (138° -> 268°)
  frag.appendChild(createArc(138, 268, '#d946ef', 4));

  // 2. 12 Inward Neon Hour Ticks
  for(let i = 0; i < 12; i++){
    if(i === 6) continue; // 6 o'clock is replaced by the "S" glyph
    const angle = i * 30 * Math.PI / 180;
    const rOuter = 82;
    const rInner = 72;
    const x1 = 100 + rOuter * Math.sin(angle);
    const y1 = 100 - rOuter * Math.cos(angle);
    const x2 = 100 + rInner * Math.sin(angle);
    const y2 = 100 - rInner * Math.cos(angle);

    const tickColor = (i >= 11 || i === 0) ? '#ff2a55' : (i <= 2 ? '#00e5ff' : '#d946ef');

    const line = document.createElementNS(ns, 'line');
    line.setAttribute('x1', x1.toFixed(2)); line.setAttribute('y1', y1.toFixed(2));
    line.setAttribute('x2', x2.toFixed(2)); line.setAttribute('y2', y2.toFixed(2));
    line.setAttribute('stroke', tickColor);
    line.setAttribute('stroke-width', '2.2');
    line.setAttribute('stroke-linecap', 'round');
    line.setAttribute('class', 'neon-hour-tick');
    line.style.filter = `drop-shadow(0 0 4px ${tickColor})`;
    frag.appendChild(line);
  }

  // 3. Glowing "S" Logo Letter at 6 o'clock
  const sText = document.createElementNS(ns, 'text');
  sText.setAttribute('x', '100');
  sText.setAttribute('y', '178');
  sText.setAttribute('text-anchor', 'middle');
  sText.setAttribute('class', 'neon-s-mark');
  sText.textContent = 'S';
  frag.appendChild(sText);

  dom.ticksGroup.appendChild(frag);
}
function setupRings(){
  if(dom.secondsProgress) dom.secondsProgress.setAttribute('stroke-dasharray', SEC_C.toFixed(2));
  if(dom.pomodoroProgress) dom.pomodoroProgress.setAttribute('stroke-dasharray', PRING_C.toFixed(2));
}
function renderClock(){
  const now=getSyncedNow();
  const h=now.getHours()%12, m=now.getMinutes(), s=now.getSeconds(), ms=now.getMilliseconds();
  const secFrac=(s+ms/1000)/60;
  dom.secondsProgress.setAttribute('stroke-dashoffset', (SEC_C*(1-secFrac)).toFixed(2));
  const secAngle=secFrac*2*Math.PI;
  dom.secondsDot.setAttribute('cx',(100+SEC_R*Math.sin(secAngle)).toFixed(2));
  dom.secondsDot.setAttribute('cy',(100-SEC_R*Math.cos(secAngle)).toFixed(2));
  const minDeg=180+((m+s/60)/60)*360;
  const hourDeg=180+((h+m/60)/12)*360;
  const secDeg = 180 + secFrac * 360;
  if(dom.handSecond) dom.handSecond.style.transform = `rotate(${secDeg.toFixed(2)}deg)`;
  dom.handMinute.style.transform='rotate('+minDeg.toFixed(2)+'deg)';
  dom.handHour.style.transform='rotate('+hourDeg.toFixed(2)+'deg)';
  if(state.mode==='pomodoro'){
    if(pomodoro.timerMode==='stopwatch'){
      dom.digitalTime.textContent=formatMs(pomodoro.elapsedTimeMs);
    } else {
      dom.digitalTime.textContent=formatMs(pomodoro.remainingMs);
    }
  } else if(s!==lastDigitalSecond){
    lastDigitalSecond=s;
    dom.digitalTime.textContent=[now.getHours(),m,s].map(n=>String(n).padStart(2,'0')).join(':');
  }
}

const LOCALE_CYCLE=['tr-TR','en-US','iso'];
let localeIdx=0;
function getISOWeek(date){
  const d=new Date(Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()));
  const dayNum=d.getUTCDay()||7;
  d.setUTCDate(d.getUTCDate()+4-dayNum);
  const yearStart=new Date(Date.UTC(d.getUTCFullYear(),0,1));
  return Math.ceil((((d-yearStart)/86400000)+1)/7);
}
function updateDateCluster(){
  const now=getSyncedNow();
  const loc=LOCALE_CYCLE[localeIdx];
  let text;
  if(loc==='iso'){ text=now.getFullYear()+'.'+String(now.getMonth()+1).padStart(2,'0')+'.'+String(now.getDate()).padStart(2,'0'); }
  else { text=now.toLocaleDateString(loc,{weekday:'long', day:'2-digit', month:'long', year:'numeric'}); }
  dom.dateLocaleText.style.opacity=0;
  setTimeout(()=>{ dom.dateLocaleText.textContent=text.toUpperCase(); dom.dateLocaleText.style.opacity=1; },260);
  localeIdx=(localeIdx+1)%LOCALE_CYCLE.length;
  const yks2027Target = new Date('2027-06-19T00:00:00');
  const diffMs = yks2027Target - now;
  const daysLeft = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
  if(dom.dateCycleText) dom.dateCycleText.textContent = 'YKS 2027 · ' + daysLeft + ' GÜN KALDI';
}

function onMouseMove(e){ mouseNX=(e.clientX/window.innerWidth)*2-1; mouseNY=(e.clientY/window.innerHeight)*2-1; }
function applyMode3D(on, opts){
  opts = opts || {};
  state.mode3D=on;
  document.body.setAttribute('data-mode3d', on?'on':'off');
  if(dom.mode3dValue) dom.mode3dValue.textContent=on?'3D':'2D';
  if(dom.mode3dToggle) dom.mode3dToggle.checked=on;
  if(!on){
    if(dom.ringCluster) dom.ringCluster.style.transform = 'rotateX(0deg) rotateY(0deg)';
    if(dom.layerBack) dom.layerBack.style.transform = 'translate3d(0px, 0px, 0px)';
    if(dom.layerMid) dom.layerMid.style.transform = 'translate3d(0px, 0px, 0px)';
    if(dom.layerFront) dom.layerFront.style.transform = 'translate3d(0px, 0px, 0px)';
  }
  if(!opts.skipSave) saveSettingsToStorage();
}
function updateParallax(){
  if(!state.mode3D || prefersReducedMotion) return;
  if(Math.abs(mouseNX - curNX) < 0.001 && Math.abs(mouseNY - curNY) < 0.001) return;

  curNX += (mouseNX-curNX)*0.06;
  curNY += (mouseNY-curNY)*0.06;

  const tiltX = (-curNY*6).toFixed(2);
  const tiltY = (curNX*8).toFixed(2);

  if(dom.ringCluster) dom.ringCluster.style.transform = `rotateX(${tiltX}deg) rotateY(${tiltY}deg)`;
  if(dom.layerBack) dom.layerBack.style.transform = `translate3d(${(curNX*7).toFixed(1)}px, ${(curNY*7).toFixed(1)}px, 0px)`;
  if(dom.layerMid) dom.layerMid.style.transform = `translate3d(${(curNX*13).toFixed(1)}px, ${(curNY*13).toFixed(1)}px, 0px)`;
  if(dom.layerFront) dom.layerFront.style.transform = `translate3d(0px, 0px, 0px)`;
}

function setMode(mode, opts){
  opts = opts || {};
  const prevMode = state.mode;

  // Prevent re-triggering slide animations if already in the same mode
  if(mode === prevMode && !opts.force){
    return;
  }

  state.mode = mode;
  document.querySelectorAll('#modeTabs button').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));

  const isPomo = (mode === 'pomodoro');
  document.body.classList.toggle('mode-pomodoro', isPomo);

  if(isPomo){
    if(dom.pomodoroWorkspace){
      dom.pomodoroWorkspace.style.display = 'flex';
      dom.pomodoroWorkspace.classList.remove('slide-in-left', 'slide-in-right');
      void dom.pomodoroWorkspace.offsetWidth;
      dom.pomodoroWorkspace.classList.add('slide-in-left');
    }
    renderPomodoroTimeline();
    renderPomodoro();
  } else {
    if(dom.pomodoroWorkspace){
      dom.pomodoroWorkspace.style.display = 'none';
    }
    const targets = [dom.ringCluster, dom.digitalTime || document.querySelector('.digital-time')].filter(Boolean);
    targets.forEach(el => {
      el.classList.remove('slide-in-left', 'slide-in-right');
      void el.offsetWidth;
      el.classList.add('slide-in-right');
    });
    renderClock();
  }

  if(state.deepFocus){
    enterDeepFocus();
  }
  if(!opts.skipSave) saveSettingsToStorage();
}
