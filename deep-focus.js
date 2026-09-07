function applyDFCustomizations(){
  if(state.mode === 'pomodoro'){
    document.body.classList.remove('df-hide-icon', 'df-only-time', 'df-digital-only');
    document.body.classList.toggle('df-pomo-hide-icon', !state.dfPomoShowIcon);
    document.body.classList.toggle('df-pomo-hide-label', !state.dfPomoShowLabel);
    document.body.classList.toggle('df-pomo-hide-ring', !state.dfPomoShowRing);
  } else {
    document.body.classList.remove('df-pomo-hide-icon', 'df-pomo-hide-label', 'df-pomo-hide-ring');
    const hideIcon = !state.dfShowIcon || !!state.clockOnlyMode || !!state.dfDigitalOnly;
    document.body.classList.toggle('df-hide-icon', hideIcon);
    document.body.classList.toggle('df-only-time', !!state.dfOnlyTime);
    document.body.classList.toggle('df-digital-only', !!state.dfDigitalOnly);
  }

  if(dom.dfClockTypeSelect) dom.dfClockTypeSelect.value = state.dfClockType || '24h';
  if(dom.dfFontSelect) dom.dfFontSelect.value = state.dfFont || "'Orbitron', sans-serif";
  if(dom.dfPomoFontSelect) dom.dfPomoFontSelect.value = state.dfFont || "'Orbitron', sans-serif";
  if(dom.dfTime) dom.dfTime.style.fontFamily = state.dfFont || "'Orbitron', sans-serif";
  if(dom.pomoBigTimeLabel) dom.pomoBigTimeLabel.style.fontFamily = state.dfFont || "'Orbitron', sans-serif";
  if(dom.dfShowIconToggle) dom.dfShowIconToggle.checked = !!state.dfShowIcon;
  if(dom.dfOnlyTimeToggle) dom.dfOnlyTimeToggle.checked = !!state.dfOnlyTime;
  if(dom.dfDigitalOnlyToggle) dom.dfDigitalOnlyToggle.checked = !!state.dfDigitalOnly;

  if(dom.dfPomoShowRingToggle) dom.dfPomoShowRingToggle.checked = !!state.dfPomoShowRing;
  if(dom.dfPomoShowIconToggle) dom.dfPomoShowIconToggle.checked = !!state.dfPomoShowIcon;
  if(dom.dfPomoShowLabelToggle) dom.dfPomoShowLabelToggle.checked = !!state.dfPomoShowLabel;
  if(dom.dfPomoViewModeSelect) dom.dfPomoViewModeSelect.value = state.dfPomoViewMode || 'both';
  if(dom.dfPomoProgressStyleSelect) dom.dfPomoProgressStyleSelect.value = state.progressStyle || 'ring';
  if(dom.dfVolumeSlider && dom.volumeSlider) dom.dfVolumeSlider.value = dom.volumeSlider.value;

  // Toggle visible settings block in DF Customize panel based on mode
  if(dom.dfClockSettings) dom.dfClockSettings.style.display = (state.mode === 'pomodoro' ? 'none' : 'block');
  if(dom.dfPomoSettings) dom.dfPomoSettings.style.display = (state.mode === 'pomodoro' ? 'block' : 'none');
}

function _oldApplyDFCustomizations(){
  document.body.classList.toggle('df-hide-icon', !state.dfShowIcon);
  document.body.classList.toggle('df-only-time', !!state.dfOnlyTime);
  document.body.classList.toggle('df-digital-only', !!state.dfDigitalOnly);
  if(dom.dfShowIconToggle) dom.dfShowIconToggle.checked = !!state.dfShowIcon;
  if(dom.dfOnlyTimeToggle) dom.dfOnlyTimeToggle.checked = !!state.dfOnlyTime;
  if(dom.dfDigitalOnlyToggle) dom.dfDigitalOnlyToggle.checked = !!state.dfDigitalOnly;
}

function updateFocusLevel(){
  let target=10;
  if(pomodoro.running){
    const frac=1-(pomodoro.remainingMs/pomodoroTotalMs());
    target = pomodoro.sessionType==='focus' ? 28+frac*66 : 22-frac*12;
  }
  if(state.deepFocus) target=Math.max(target,86);
  focusLevel += (target-focusLevel)*0.12;
  focusLevel = Math.max(0,Math.min(100,focusLevel));
  bpm = 58+(focusLevel/100)*40;
  document.documentElement.style.setProperty('--beat-duration',(60/bpm).toFixed(3)+'s');
  document.documentElement.style.setProperty('--glow-intensity',(0.35+focusLevel/100*0.7).toFixed(3));
  if(dom.bpmReadout) dom.bpmReadout.textContent=Math.round(bpm);
  // dom.focusReadout removed
  renderDeepFocus();
}

function enterDeepFocus(){
  state.deepFocus=true;
  document.body.classList.add('deep-focus-active');
  dom.deepFocusBtn.classList.add('is-on');
  if(state.mode === 'pomodoro'){
    if(dom.pomoBigRingWrap && dom.dfMount){
      dom.dfMount.appendChild(dom.pomoBigRingWrap);
    }
  } else {
    if(dom.dfMount){
      if(state.clockOnlyMode || !state.dfShowIcon || state.dfDigitalOnly){
        dom.dfMount.innerHTML = '';
      } else if(dom.avatarRing){
        dom.dfMount.appendChild(dom.avatarRing);
      }
    }
  }
  if(typeof TimerVisuals !== 'undefined') TimerVisuals.resize();
  deepFocusStart=Date.now();
  closeSettingsDrawer();
  renderDeepFocus();
  showToast('DERİN ODAK AKTİF');
}
function exitDeepFocus(){
  state.deepFocus=false;
  document.body.classList.remove('deep-focus-active');
  dom.deepFocusBtn.classList.remove('is-on');
  const pomoRingCard = document.querySelector('.pomo-ring-card');
  if(pomoRingCard && dom.pomoBigRingWrap){
    const actionRow = pomoRingCard.querySelector('.pomo-action-row');
    if(actionRow) pomoRingCard.insertBefore(dom.pomoBigRingWrap, actionRow);
    else pomoRingCard.appendChild(dom.pomoBigRingWrap);
  }
  if(dom.layerFront && dom.avatarRing) dom.layerFront.appendChild(dom.avatarRing);
  if(typeof TimerVisuals !== 'undefined') TimerVisuals.resize();
}

function renderDeepFocus(){
  if(!state.deepFocus) return;
  applyDFCustomizations();

  const totalSec = getTotalWorkSeconds();

  if(state.mode === 'pomodoro'){
    const totalStr = 'TOPLAM ÇALIŞMA: ' + formatHoursMinutesSeconds(totalSec);
    if(dom.dfTotalWorkSub) dom.dfTotalWorkSub.textContent = totalStr;

    const dfSessionElapsed = getCurrentSessionElapsedMs();
    const sessionLabel = (focusIndex + '. ETÜT') + (pomodoro.running ? ' (ÇALIŞIYOR)' : (dfSessionElapsed > 0 ? ' (DURAKLATILDI)' : ' (HAZIR)'));
    if(dom.dfSessionLabel) dom.dfSessionLabel.textContent = sessionLabel;

    let timeDisplayStr = '';
    if(pomodoro.isOvertime){
      timeDisplayStr = '+ ' + formatMs(pomodoro.overtimeSec * 1000);
    } else {
      timeDisplayStr = formatMs(pomodoro.remainingMs);
    }

    if(state.dfPomoViewMode === 'total'){
      // Directly update the active big timer display with total work time
      if(dom.pomoBigTimeLabel) dom.pomoBigTimeLabel.textContent = formatHoursMinutesSeconds(totalSec);
      if(dom.dfTotalWorkSub) dom.dfTotalWorkSub.style.display = 'none';
      if(dom.pomoSessionBadge) dom.pomoSessionBadge.style.display = 'none';
      if(dom.pomoStatusSub) dom.pomoStatusSub.style.display = 'none';
      if(dom.dfSessionLabel) dom.dfSessionLabel.style.display = 'none';
    } else if(state.dfPomoViewMode === 'countdown'){
      if(dom.pomoBigTimeLabel) dom.pomoBigTimeLabel.textContent = timeDisplayStr;
      if(dom.dfTotalWorkSub) dom.dfTotalWorkSub.style.display = 'none';
      if(dom.pomoSessionBadge && state.dfPomoShowIcon) dom.pomoSessionBadge.style.display = '';
      if(dom.pomoStatusSub && state.dfPomoShowLabel) dom.pomoStatusSub.style.display = '';
      if(dom.dfSessionLabel && state.dfPomoShowLabel) dom.dfSessionLabel.style.display = '';
    } else {
      // both
      if(dom.pomoBigTimeLabel) dom.pomoBigTimeLabel.textContent = timeDisplayStr;
      if(dom.dfTotalWorkSub) dom.dfTotalWorkSub.style.display = 'block';
      if(dom.pomoSessionBadge && state.dfPomoShowIcon) dom.pomoSessionBadge.style.display = '';
      if(dom.pomoStatusSub && state.dfPomoShowLabel) dom.pomoStatusSub.style.display = '';
      if(dom.dfSessionLabel && state.dfPomoShowLabel) dom.dfSessionLabel.style.display = '';
    }
  } else {
    if(dom.dfTotalWorkSub) dom.dfTotalWorkSub.style.display = 'none';
    const now = new Date();
    let clockStr = '';
    const h24 = now.getHours();
    const h12 = h24 % 12 || 12;
    const m = String(now.getMinutes()).padStart(2, '0');
    const s = String(now.getSeconds()).padStart(2, '0');
    const ampm = h24 >= 12 ? 'PM' : 'AM';

    if(state.dfClockType === '12h'){
      clockStr = String(h12).padStart(2, '0') + ':' + m + ':' + s + ' ' + ampm;
    } else if(state.dfClockType === 'minimal'){
      clockStr = String(h24).padStart(2, '0') + ':' + m;
    } else {
      clockStr = String(h24).padStart(2, '0') + ':' + m + ':' + s;
    }
    dom.dfTime.textContent = clockStr;
    if(dom.dfSessionLabel) dom.dfSessionLabel.textContent = 'CANLI SAAT';
  }
}

function _oldRenderDeepFocus(){
  if(!state.deepFocus) return;
  if(pomodoro.timerMode==='stopwatch' && pomodoro.running){
    dom.dfTime.textContent=formatMs(pomodoro.elapsedTimeMs);
    dom.dfSessionLabel.textContent='KRONOMETRE';
  } else if(pomodoro.running){
    dom.dfTime.textContent=formatMs(pomodoro.remainingMs);
    dom.dfSessionLabel.textContent=sessionTypeLabel(pomodoro.sessionType);
  } else {
    const totalSec=Math.floor((Date.now()-deepFocusStart)/1000);
    dom.dfTime.textContent=String(Math.floor(totalSec/60)).padStart(2,'0')+':'+String(totalSec%60).padStart(2,'0');
    dom.dfSessionLabel.textContent='SERBEST ODAK';
  }
  // dom.dfFocus removed
}
