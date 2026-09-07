let pomodoroTimeline = [];
let focusIndex = 1;

function getCurrentSessionElapsedMs(){
  if(pomodoro.sessionType !== 'focus') return 0;
  let currentRunMs = 0;
  if(pomodoro.running && pomodoro.sessionStartTs > 0){
    currentRunMs = Math.max(0, Date.now() - pomodoro.sessionStartTs);
  }
  return (pomodoro.sessionAccumulatedMs || 0) + currentRunMs;
}

function getTotalWorkSeconds(){
  const completedSec = pomodoroTimeline
    .filter(t => t.type === 'focus' && t.status === 'completed')
    .reduce((acc, t) => acc + (typeof t.elapsedSec === 'number' ? t.elapsedSec : 0), 0);

  const activeSec = Math.floor(getCurrentSessionElapsedMs() / 1000);
  return completedSec + activeSec;
}

function checkDailyReset(){
  const todayKey = getTodayStorageKey() + '_timeline';
  const activeDateObj = getActiveDateObj();
  const activeDateStr = activeDateObj.toDateString();
  const savedDate = localStorage.getItem('selmer_last_active_date');

  // Check long absence (24+ hours since last activity or last active timestamp)
  const lastActiveTs = parseInt(localStorage.getItem('selmer_last_active_ts') || '0', 10);
  const nowMs = Date.now();

  if(lastActiveTs > 0 && (nowMs - lastActiveTs) >= 24 * 3600 * 1000){
    handleLongAbsenceAutoAssign(lastActiveTs, nowMs);
  }

  if(savedDate !== activeDateStr){
    pomodoroTimeline = [];
    focusIndex = 1;
    localStorage.setItem('selmer_last_active_date', activeDateStr);
    localStorage.setItem('selmer_last_active_ts', nowMs.toString());
    localStorage.setItem(todayKey, JSON.stringify([]));
  } else if(pomodoroTimeline.length === 0) {
    try {
      const savedTimeline = localStorage.getItem(todayKey);
      if(savedTimeline){
        const parsed = JSON.parse(savedTimeline);
        if(Array.isArray(parsed) && parsed.length > 0){
          pomodoroTimeline = parsed;
          const completed = pomodoroTimeline.filter(t => t.type === 'focus' && t.status === 'completed');
          focusIndex = completed.length + 1;
        }
      }
    } catch(e){}
  }
  localStorage.setItem('selmer_last_active_ts', Date.now().toString());
}

function handleLongAbsenceAutoAssign(lastActiveTs, nowMs){
  // Check if there was an unclosed or active/pending session in pomodoroTimeline
  let currentKey = getTodayStorageKey() + '_timeline';
  let timeline = pomodoroTimeline;
  if(!timeline || timeline.length === 0){
    try {
      const saved = localStorage.getItem(currentKey);
      if(saved) timeline = JSON.parse(saved);
    } catch(e){}
  }

  if(timeline && Array.isArray(timeline)){
    let unclosed = timeline.find(t => t.status === 'active' || (t.status === 'pending' && t.startTimeMs));
    if(unclosed){
      const startMs = unclosed.startTimeMs || lastActiveTs;
      const endMs = Math.min(nowMs, startMs + (unclosed.mins || 25) * 60000);
      const elapsedSec = Math.max(60, Math.floor((endMs - startMs) / 1000));
      const elapsedMins = Math.max(1, Math.round(elapsedSec / 60));

      // Determine which date (based on day boundary) holds the majority of minutes
      const startDateObj = getActiveDateObj(new Date(startMs));
      const endDateObj = getActiveDateObj(new Date(endMs));

      let targetDateObj = startDateObj;
      if(startDateObj.getTime() !== endDateObj.getTime()){
        // Find boundary timestamp
        const bParts = (state.dayBoundaryTime || '06:00').split(':');
        const bHour = parseInt(bParts[0], 10) || 6;
        const bMin = parseInt(bParts[1], 10) || 0;

        let boundaryDate = new Date(startDateObj);
        boundaryDate.setDate(boundaryDate.getDate() + 1);
        boundaryDate.setHours(bHour, bMin, 0, 0);

        const minsBeforeBoundary = Math.max(0, (boundaryDate.getTime() - startMs) / 60000);
        const minsAfterBoundary = Math.max(0, (endMs - boundaryDate.getTime()) / 60000);

        if(minsAfterBoundary > minsBeforeBoundary){
          targetDateObj = endDateObj;
        }
      }

      const isoKey = targetDateObj.getFullYear() + '_' + String(targetDateObj.getMonth()+1).padStart(2,'0') + '_' + String(targetDateObj.getDate()).padStart(2,'0');
      const monthNames = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
      const dateDisplayStr = targetDateObj.getDate() + ' ' + monthNames[targetDateObj.getMonth()];

      // Save to target day's study_totals and session_records
      const storageKey = 'selmer_focus_' + isoKey;
      const prevMins = parseInt(localStorage.getItem(storageKey) || '0', 10);
      const newMins = prevMins + elapsedMins;
      localStorage.setItem(storageKey, newMins);

      unclosed.status = 'completed';
      unclosed.endTimeMs = endMs;
      unclosed.elapsedSec = elapsedSec;

      const recordKey = 'selmer_record_' + isoKey;
      let recData = null;
      try { recData = JSON.parse(localStorage.getItem(recordKey)); } catch(e){}
      if(!recData){
        recData = { isoKey: isoKey, totalWorkSeconds: 0, totalMinutes: 0, sessionCount: 0, completedEtuts: [] };
      }
      recData.totalMinutes = (recData.totalMinutes || 0) + elapsedMins;
      recData.totalWorkSeconds = (recData.totalWorkSeconds || 0) + elapsedSec;
      recData.completedEtuts = recData.completedEtuts || [];
      recData.completedEtuts.push(unclosed);
      recData.sessionCount = recData.completedEtuts.length;

      localStorage.setItem(recordKey, JSON.stringify(recData));

      pushStudyTotalToCloud(isoKey, newMins);
      pushSessionRecordToCloud(isoKey, recData);

      // Show non-blocking toast with "Düzelt" link
      setTimeout(() => {
        showToastWithAction(
          `${dateDisplayStr} tarihli ${elapsedMins} dk'lık çalışma verisi otomatik olarak o güne kaydedildi.`,
          'Düzelt',
          () => {
            if(dom.analyticsModalBackdrop) dom.analyticsModalBackdrop.classList.add('open');
            renderDataPanel();
            const histEl = document.getElementById('historyListContainer');
            if(histEl) histEl.scrollIntoView({ behavior: 'smooth' });
          }
        );
      }, 1000);
    }
  }

  localStorage.setItem('selmer_last_active_ts', nowMs.toString());
}

function saveTimelineToStorage(){
  try {
    const todayKey = getTodayStorageKey() + '_timeline';
    const isoKey = getTodayStorageKey().replace('selmer_focus_', '');
    const activeDateStr = getActiveDateObj().toDateString();
    localStorage.setItem(todayKey, JSON.stringify(pomodoroTimeline));
    localStorage.setItem('selmer_last_active_date', activeDateStr);
    localStorage.setItem('selmer_last_active_ts', Date.now().toString());
    if(typeof pushTimelineToCloud === 'function') pushTimelineToCloud(isoKey, pomodoroTimeline);
  } catch(e){}
}

function formatHoursMinutesSeconds(sec){
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if(h > 0) return String(h).padStart(2,'0') + 's ' + String(m).padStart(2,'0') + 'dk ' + String(s).padStart(2,'0') + 'sn';
  return String(m).padStart(2,'0') + 'dk ' + String(s).padStart(2,'0') + 'sn';
}

function getAlarmGainNode(){
  return (typeof alarmGain !== 'undefined' && alarmGain) ? alarmGain : (masterGain || null);
}
function getAmbientGainNode(){
  return (typeof ambientGain !== 'undefined' && ambientGain) ? ambientGain : (masterGain || null);
}

function playAlarmSound(soundType){
  ensureAudio();
  if(!audioCtx) return;
  const t = audioCtx.currentTime;
  const outGain = getAlarmGainNode();
  if(soundType === 'beep') {
    [0, 0.1, 0.2, 0.3].forEach(dt => {
      const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(1046.5, t + dt); o.frequency.setValueAtTime(1318.5, t + dt + 0.04);
      const g = audioCtx.createGain(); g.gain.setValueAtTime(0.12, t + dt); g.gain.exponentialRampToValueAtTime(0.001, t + dt + 0.075);
      o.connect(g); g.connect(outGain); o.start(t + dt); o.stop(t + dt + 0.08);
    });
  } else if(soundType === 'gong') {
    const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(220, t); o.frequency.exponentialRampToValueAtTime(110, t + 1.2);
    const filter = audioCtx.createBiquadFilter(); filter.type = 'lowpass'; filter.frequency.setValueAtTime(2400, t); filter.frequency.exponentialRampToValueAtTime(200, t + 1.2);
    const g = audioCtx.createGain(); g.gain.setValueAtTime(0.2, t); g.gain.exponentialRampToValueAtTime(0.0001, t + 1.5);
    o.connect(filter); filter.connect(g); g.connect(outGain);
    o.start(t); o.stop(t + 1.5);
  } else if(soundType === 'bell') {
    [523.25, 659.25, 783.99, 1046.50].forEach((f, i) => {
      const o = audioCtx.createOscillator(); o.type = 'square'; o.frequency.setValueAtTime(f, t + i*0.08);
      const g = audioCtx.createGain(); g.gain.setValueAtTime(0.12, t + i*0.08); g.gain.exponentialRampToValueAtTime(0.001, t + i*0.08 + 0.5);
      o.connect(g); g.connect(outGain); o.start(t + i*0.08); o.stop(t + i*0.08 + 0.55);
    });
  } else if(soundType === 'synth') {
    [440, 554.37, 659.25, 880].forEach((f, i) => {
      const o = audioCtx.createOscillator(); o.type = 'sawtooth'; o.frequency.setValueAtTime(f, t + i*0.08);
      const filter = audioCtx.createBiquadFilter(); filter.type = 'bandpass'; filter.frequency.value = f * 2; filter.Q.value = 4;
      const g = audioCtx.createGain(); g.gain.setValueAtTime(0.12, t + i*0.08); g.gain.exponentialRampToValueAtTime(0.0001, t + i*0.08 + 0.35);
      o.connect(filter); filter.connect(g); g.connect(outGain); o.start(t + i*0.08); o.stop(t + i*0.08 + 0.38);
    });
  } else {
    playChime('focus');
  }
}

function renderPomodoroTimeline(justCompletedIdx){
  if(!dom.pomoTimelineTrack) return;
  dom.pomoTimelineTrack.innerHTML = '';
  checkDailyReset();

  if(pomodoroTimeline.length === 0){
    // Seed initial upcoming etüt
    const now = new Date();
    const end = new Date(now.getTime() + pomodoro.focusMin * 60000);
    const startStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
    const endStr = String(end.getHours()).padStart(2,'0') + ':' + String(end.getMinutes()).padStart(2,'0');
    pomodoroTimeline.push({
      type: 'focus',
      idx: 1,
      name: '1. Etüt',
      mins: pomodoro.focusMin,
      timeSpan: startStr + ' - ' + endStr,
      status: 'pending'
    });
  }

  let completedCnt = 0;
  pomodoroTimeline.forEach((item, index) => {
    if(item.status === 'completed') completedCnt++;
    const node = document.createElement('div');
    const isAnim = (justCompletedIdx !== undefined && item.idx === justCompletedIdx);
    node.className = 'pomo-node ' + item.status + (isAnim ? ' just-completed' : '');

    let statusText = 'HAZIR';
    if(item.status === 'completed'){
      statusText = 'TAMAMLANDI';
    } else if(item.status === 'active'){
      const sessionElapsed = getCurrentSessionElapsedMs();
      statusText = pomodoro.running ? 'ÇALIŞIYOR' : (sessionElapsed > 0 ? 'DURAKLATILDI' : 'HAZIR');
    }
    let durText = item.elapsedSec ? Math.round(item.elapsedSec / 60) + ' dk' : item.mins + ' dk';

    node.innerHTML = `
      <div class="pomo-node-info">
        <div class="pomo-node-title">${item.name}</div>
        <div class="pomo-node-meta">${durText} · ${item.timeSpan}</div>
      </div>
      <div class="pomo-node-right">
        <span class="pomo-node-status">${statusText}</span>
      </div>
    `;

    dom.pomoTimelineTrack.appendChild(node);

    if(index < pomodoroTimeline.length - 1){
      const nextItem = pomodoroTimeline[index + 1];
      const line = document.createElement('div');
      line.className = 'pomo-line-connector';

      let breakMins = 0;
      if(nextItem.breakBeforeMins !== undefined){
        breakMins = nextItem.breakBeforeMins;
      } else if(item.endTimeMs && nextItem.startTimeMs){
        breakMins = Math.max(0, Math.round((nextItem.startTimeMs - item.endTimeMs)/60000));
      }

      if(breakMins > 0){
        line.innerHTML = `<span class="break-badge">☕ ${breakMins} dk Mola</span>`;
      }
      dom.pomoTimelineTrack.appendChild(line);
    }
  });

  if(dom.pomoCompletedCount) dom.pomoCompletedCount.textContent = completedCnt + ' Etüt Tamamlandı';
}


function applyProgressStyle(styleName, opts){
  opts = opts || {};
  state.progressStyle = styleName;
  pomoNeedsRender = true;
  const styles = ['ring', 'linear', 'wave', 'arc', 'particles', 'dotted', 'fill', 'minimal'];
  styles.forEach(s => document.body.classList.remove('progress-style-' + s));
  document.body.classList.add('progress-style-' + styleName);

  if(dom.mainProgressStyleSelect) dom.mainProgressStyleSelect.value = styleName;
  if(dom.dfPomoProgressStyleSelect) dom.dfPomoProgressStyleSelect.value = styleName;
  renderPomodoro();
  if(!opts.skipSave) saveSettingsToStorage();
}

function drawPomoVisuals(ts, frac){
  if(dom.pomoLinearBarFill){
    const isDeplete = state.progressDirection === 'deplete';
    const fillPct = isDeplete ? (1 - frac) * 100 : frac * 100;
    dom.pomoLinearBarFill.style.width = fillPct.toFixed(1) + '%';
  }
  if(typeof TimerVisuals !== 'undefined'){
    const remFrac = pomodoro.isOvertime ? 0 : (pomodoro.remainingMs / pomodoroTotalMs());
    TimerVisuals.render(ts, remFrac, frac);
  }
}

function pomodoroTotalMs(){
  const map={focus:pomodoro.focusMin, short:pomodoro.shortMin, long:pomodoro.longMin};
  return (map[pomodoro.sessionType]||25)*60000;
}
function sessionTypeLabel(type){ return type==='focus'?'ODAK':(type==='short'?'KISA MOLA':'UZUN MOLA'); }
function formatMs(ms){
  const total=Math.max(0,Math.round(ms/1000));
  const m=Math.floor(total/60), s=total%60;
  return String(m).padStart(2,'0')+':'+String(s).padStart(2,'0');
}

let pomoNeedsRender = true;
let lastPomoState = {};
const PRING_BIG_C = 2 * Math.PI * 98;

function renderPomodoro(ts, force){
  const running = pomodoro.running;
  const currentTotal = pomodoroTotalMs();
  const elapsedMs = getCurrentSessionElapsedMs();

  let frac = 0;
  let timeStr = '';

  if(pomodoro.isOvertime){
    frac = 1;
    timeStr = '+ ' + formatMs(pomodoro.overtimeSec * 1000);
  } else {
    frac = Math.max(0, Math.min(1, pomodoro.remainingMs / currentTotal));
    timeStr = formatMs(pomodoro.remainingMs);
  }

  const elapsedFrac = pomodoro.isOvertime ? 1 : (1 - frac);
  const totalWorkSec = getTotalWorkSeconds();

  if(!running && !force && !pomoNeedsRender){
    if(
      lastPomoState.running === running &&
      lastPomoState.timeStr === timeStr &&
      lastPomoState.elapsedFrac === elapsedFrac &&
      lastPomoState.sessionType === pomodoro.sessionType &&
      lastPomoState.focusIndex === focusIndex &&
      lastPomoState.isOvertime === pomodoro.isOvertime &&
      lastPomoState.progressStyle === state.progressStyle &&
      lastPomoState.deepFocus === state.deepFocus &&
      lastPomoState.totalWorkSec === totalWorkSec
    ){
      return;
    }
  }

  pomoNeedsRender = false;
  lastPomoState = {
    running,
    timeStr,
    elapsedFrac,
    sessionType: pomodoro.sessionType,
    focusIndex,
    isOvertime: pomodoro.isOvertime,
    progressStyle: state.progressStyle,
    deepFocus: state.deepFocus,
    totalWorkSec
  };

  const isDeplete = state.progressDirection === 'deplete';
  const svgOffsetFrac = isDeplete ? elapsedFrac : (1 - elapsedFrac);
  const dashOffset = (PRING_BIG_C * svgOffsetFrac).toFixed(2);

  if(dom.pomoBigProgress){
    dom.pomoBigProgress.setAttribute('stroke-dasharray', PRING_BIG_C.toFixed(2));
    dom.pomoBigProgress.setAttribute('stroke-dashoffset', dashOffset);
  }
  if(dom.pomodoroProgress){
    dom.pomodoroProgress.setAttribute('stroke-dashoffset', (PRING_C * elapsedFrac).toFixed(2));
  }

  drawPomoVisuals(ts || performance.now(), elapsedFrac);

  if(dom.pomodoroTimeLabel) dom.pomodoroTimeLabel.textContent = timeStr;
  if(dom.pomoBigTimeLabel){
    dom.pomoBigTimeLabel.classList.toggle('is-overtime', !!pomodoro.isOvertime);
    dom.pomoBigTimeLabel.textContent = timeStr;
  }

  const typeName = pomodoro.sessionType === 'focus' ? (focusIndex + '. ETÜT') : 'MOLA';
  if(dom.pomoSessionBadge) dom.pomoSessionBadge.textContent = typeName;
  if(dom.pomodoroSessionType) dom.pomodoroSessionType.textContent = sessionTypeLabel(pomodoro.sessionType);

  const sessionElapsed = getCurrentSessionElapsedMs();
  const statusStr = pomodoro.isOvertime ? 'FAZLA ÇALIŞMA (+)' : (pomodoro.running ? 'ÇALIŞIYOR' : (sessionElapsed > 0 ? 'DURAKLATILDI' : 'HAZIR'));
  if(dom.pomoStatusSub) dom.pomoStatusSub.textContent = statusStr;

  const btnText = pomodoro.running ? 'DURAKLAT' : 'BAŞLAT';
  if(dom.pomodoroStartPause) dom.pomodoroStartPause.textContent = btnText;
  if(dom.pomoMainStartPause) dom.pomoMainStartPause.textContent = btnText;

  const showFinish = (pomodoro.sessionType === 'focus') && (pomodoro.running || elapsedMs > 0 || pomodoro.isOvertime);
  if(dom.pomoFinishBtn) dom.pomoFinishBtn.style.display = showFinish ? 'inline-block' : 'none';
  if(dom.dfFinishBtn) dom.dfFinishBtn.style.display = (showFinish && state.deepFocus) ? 'inline-block' : 'none';

  if(dom.pomoTotalWorkTime) dom.pomoTotalWorkTime.textContent = formatHoursMinutesSeconds(getTotalWorkSeconds());
}

function _oldRenderPomodoro(){
  if(pomodoro.timerMode==='stopwatch'){
    dom.pomodoroTimeLabel.textContent=formatMs(pomodoro.elapsedTimeMs);
    dom.pomodoroSessionType.textContent='KRONOMETRE';
    const swFrac = (pomodoro.elapsedTimeMs % 60000) / 60000;
    dom.pomodoroProgress.setAttribute('stroke-dashoffset', (PRING_C * (1 - swFrac)).toFixed(2));
  } else {
    const frac=Math.max(0,Math.min(1, pomodoro.remainingMs/pomodoroTotalMs()));
    dom.pomodoroProgress.setAttribute('stroke-dashoffset', (PRING_C*(1-frac)).toFixed(2));
    dom.pomodoroTimeLabel.textContent=formatMs(pomodoro.remainingMs);
    dom.pomodoroSessionType.textContent=sessionTypeLabel(pomodoro.sessionType);
  }
  dom.pomodoroStartPause.textContent=pomodoro.running?'DURAKLAT':'BAŞLAT';
}
function renderSessionDots(){
  if(!dom.sessionDots) return;
  dom.sessionDots.innerHTML='';
  const n=pomodoro.sessionsBeforeLong;
  const filled=pomodoro.sessionsCompleted % n;
  for(let i=0;i<n;i++){
    const d=document.createElement('div');
    d.className='session-dot'+(i<filled?' filled':'');
    dom.sessionDots.appendChild(d);
  }
}
function pomodoroStart(){
  pomoNeedsRender = true;
  if(pomodoro.running) return;
  ensureAudio();
  playUiSound('start');

  const nowMs = Date.now();
  const now = new Date(nowMs);
  const end = new Date(nowMs + (pomodoro.remainingMs || (pomodoro.focusMin * 60000)));
  const startStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const endStr = String(end.getHours()).padStart(2,'0') + ':' + String(end.getMinutes()).padStart(2,'0');

  // Find or create current active item in timeline
  const lastItem = pomodoroTimeline.length > 0 ? pomodoroTimeline[pomodoroTimeline.length - 1] : null;
  const completedItems = pomodoroTimeline.filter(t => t.status === 'completed');
  const prevCompleted = completedItems.length > 0 ? completedItems[completedItems.length - 1] : null;

  let breakMins = 0;
  if(prevCompleted && prevCompleted.endTimeMs){
    breakMins = Math.max(0, Math.round((nowMs - prevCompleted.endTimeMs) / 60000));
  }

  if(!lastItem || lastItem.status === 'completed'){
    const currentEtutIdx = completedItems.length + 1;
    pomodoroTimeline.push({
      type: 'focus',
      idx: currentEtutIdx,
      name: currentEtutIdx + '. Etüt',
      mins: pomodoro.focusMin,
      startTimeMs: nowMs,
      timeSpan: startStr + ' - ' + endStr,
      status: 'active',
      breakBeforeMins: breakMins
    });
  } else if(lastItem.status === 'pending'){
    lastItem.status = 'active';
    lastItem.startTimeMs = nowMs;
    lastItem.mins = pomodoro.focusMin;
    lastItem.timeSpan = startStr + ' - ' + endStr;
    lastItem.breakBeforeMins = breakMins;
  }

  pomodoro.running = true;
  pomodoro.sessionStartTs = nowMs;

  saveTimelineToStorage();
  renderPomodoroTimeline();

  if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);
  pomodoro.intervalId = setInterval(pomodoroTick, 100);
  renderPomodoro();

  pushLiveSessionToCloud();
}

function pomodoroPause(){
  pomoNeedsRender = true;
  if(!pomodoro.running) return;
  const nowMs = Date.now();
  if(pomodoro.sessionStartTs > 0){
    pomodoro.sessionAccumulatedMs = (pomodoro.sessionAccumulatedMs || 0) + (nowMs - pomodoro.sessionStartTs);
  }
  pomodoro.sessionStartTs = 0;
  pomodoro.running = false;
  if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);

  playUiSound('pause');
  renderPomodoroTimeline();
  renderPomodoro();

  pushLiveSessionToCloud();
}

function pomodoroReset(){
  pomoNeedsRender = true;
  playUiSound('reset');
  if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);
  pomodoro.running = false;
  pomodoro.isOvertime = false;
  pomodoro.overtimeSec = 0;
  pomodoro.sessionAccumulatedMs = 0;
  pomodoro.sessionStartTs = 0;
  pomodoro.remainingMs = pomodoroTotalMs();

  pomodoroTimeline.forEach(t => {
    if(t.status === 'active') t.status = 'pending';
  });
  saveTimelineToStorage();
  renderPomodoroTimeline();
  renderPomodoro();

  pushLiveSessionToCloud();
}

function pomodoroTick(){
  if(!pomodoro.running) return;
  const targetMs = pomodoroTotalMs();
  const elapsedMs = getCurrentSessionElapsedMs();

  if(elapsedMs >= targetMs){
    if(!pomodoro.isOvertime){
      pomodoro.isOvertime = true;
      playAlarmSound((dom.dfAlarmSelect && dom.dfAlarmSelect.value) || (dom.pomoAlarmSelect ? dom.pomoAlarmSelect.value : 'chime'));
      showToast('Etüt Süresi Doldu! Overtime (+00:00) Başladı.');
      pushLiveSessionToCloud();
    }
    pomodoro.remainingMs = 0;
    pomodoro.overtimeSec = Math.floor((elapsedMs - targetMs) / 1000);
  } else {
    pomodoro.isOvertime = false;
    pomodoro.overtimeSec = 0;
    pomodoro.remainingMs = Math.max(0, targetMs - elapsedMs);
  }

  // Periodic heartbeat every 8 seconds when running
  if(Date.now() - lastHeartbeatTs > 8000){
    pushLiveSessionToCloud();
  }

  renderPomodoro();
}

function handleFinishClick(){
  pomoNeedsRender = true;
  const wasDeepFocus = state.deepFocus;

  // 1. Calculate final elapsed seconds for this session
  const elapsedMs = getCurrentSessionElapsedMs();
  const totalElapsedSec = Math.floor(elapsedMs / 1000);

  // 2. Stop timer and clear active session timing
  if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);
  pomodoro.running = false;
  pomodoro.isOvertime = false;
  pomodoro.overtimeSec = 0;
  pomodoro.sessionAccumulatedMs = 0;
  pomodoro.sessionStartTs = 0;

  // 3. Update active timeline node
  let completedEtutName = 'Etüt';
  let completedEtutIdx = null;

  let activeItem = pomodoroTimeline.find(t => t.status === 'active');
  if(!activeItem) {
    activeItem = pomodoroTimeline.find(t => t.status === 'pending');
  }
  if(!activeItem && pomodoroTimeline.length > 0) {
    activeItem = pomodoroTimeline[pomodoroTimeline.length - 1];
  }

  if(activeItem){
    activeItem.status = 'completed';
    activeItem.endTimeMs = Date.now();
    activeItem.elapsedSec = totalElapsedSec;
    activeItem.mins = Math.max(1, Math.round(totalElapsedSec / 60));

    const startD = new Date(activeItem.startTimeMs || (activeItem.endTimeMs - totalElapsedSec * 1000));
    const endD = new Date(activeItem.endTimeMs);
    activeItem.timeSpan = String(startD.getHours()).padStart(2,'0') + ':' + String(startD.getMinutes()).padStart(2,'0') + ' - ' + String(endD.getHours()).padStart(2,'0') + ':' + String(endD.getMinutes()).padStart(2,'0');

    completedEtutName = activeItem.name;
    completedEtutIdx = activeItem.idx;
  }

  // 4. Record work minutes for statistics panel if > 0
  const totalElapsedMins = Math.max(1, Math.round(totalElapsedSec / 60));
  if(totalElapsedSec > 0){
    recordWorkMinutes(totalElapsedMins);
  }

  // 5. Update focusIndex for next session
  const completedCount = pomodoroTimeline.filter(t => t.status === 'completed').length;
  focusIndex = completedCount + 1;

  // 6. Push next pending etüt node to timeline
  const now = new Date();
  const end = new Date(now.getTime() + pomodoro.focusMin * 60000);
  const startStr = String(now.getHours()).padStart(2,'0') + ':' + String(now.getMinutes()).padStart(2,'0');
  const endStr = String(end.getHours()).padStart(2,'0') + ':' + String(end.getMinutes()).padStart(2,'0');
  pomodoroTimeline.push({
    type: 'focus',
    idx: focusIndex,
    name: focusIndex + '. Etüt',
    mins: pomodoro.focusMin,
    timeSpan: startStr + ' - ' + endStr,
    status: 'pending'
  });

  // 7. Exit Deep Focus mode if active, and switch tab to Pomodoro
  if(wasDeepFocus){
    exitDeepFocus();
  }
  setMode('pomodoro');

  // 8. Save timeline and re-render with completion pulse animation
  saveTimelineToStorage();
  renderPomodoroTimeline(completedEtutIdx);

  // 9. Play audio & celebration feedback
  playUiSound('finish');
  triggerCelebrationEffects();
  showToast(completedEtutName + ' Başarıyla Bitirildi! 🎉');

  // 10. Reset remaining time for next session
  pomodoro.remainingMs = pomodoroTotalMs();
  renderPomodoro();

  pushLiveSessionToCloud();
}
