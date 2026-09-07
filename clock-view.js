function buildTicks(){
  const ns='http://www.w3.org/2000/svg';
  const frag=document.createDocumentFragment();
  for(let i=0;i<60;i++){
    const angle=i*6*Math.PI/180;
    const isHour=i%5===0;
    const rOuter=96, rInner=isHour?83:90;
    const x1=100+rOuter*Math.sin(angle), y1=100-rOuter*Math.cos(angle);
    const x2=100+rInner*Math.sin(angle), y2=100-rInner*Math.cos(angle);
    const line=document.createElementNS(ns,'line');
    line.setAttribute('x1',x1.toFixed(2)); line.setAttribute('y1',y1.toFixed(2));
    line.setAttribute('x2',x2.toFixed(2)); line.setAttribute('y2',y2.toFixed(2));
    line.setAttribute('class', isHour?'tick tick-hour':'tick tick-minute');
    frag.appendChild(line);
  }
  dom.ticksGroup.appendChild(frag);
}
function setupRings(){
  dom.secondsProgress.setAttribute('stroke-dasharray', SEC_C.toFixed(2));
  dom.pomodoroProgress.setAttribute('stroke-dasharray', PRING_C.toFixed(2));
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
  state.mode=mode;
  document.querySelectorAll('#modeTabs button').forEach(b=>b.classList.toggle('active', b.dataset.mode===mode));

  const isPomo = (mode === 'pomodoro');
  document.body.classList.toggle('mode-pomodoro', isPomo);

  const targets = [dom.pomodoroWorkspace, dom.ringCluster, document.querySelector('.digital-time')].filter(Boolean);
  targets.forEach(el => {
    el.classList.add('mode-transition-view');
    el.style.opacity = '0';
    el.style.transform = 'scale(0.97)';
  });

  let handled = false;
  const onDone = () => {
    if(handled) return;
    handled = true;

    if(dom.pomodoroWorkspace) dom.pomodoroWorkspace.style.display = (isPomo ? 'flex' : 'none');
    if(isPomo){
      renderPomodoroTimeline();
      renderPomodoro();
    } else {
      renderClock();
    }

    requestAnimationFrame(() => {
      targets.forEach(el => {
        el.style.opacity = '1';
        el.style.transform = 'scale(1)';
      });
    });
  };

  if(targets.length > 0){
    targets[0].addEventListener('transitionend', onDone, {once: true});
    setTimeout(onDone, 380);
  } else {
    onDone();
  }

  if(state.deepFocus){
    enterDeepFocus();
  }
  if(!opts.skipSave) saveSettingsToStorage();
}
