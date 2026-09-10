// --- Firebase Database Real-time Integration, Auth & Clock Sync ---
let db = null;
let auth = null;
let currentUser = null;
let serverTimeOffsetMs = 0;
let userListeners = [];
let isOnline = true;
const tabDeviceId = 'dev_' + Math.random().toString(36).substring(2, 10);

function initFirebaseSync(){
  try {
    const firebaseConfig = {
      apiKey: "AIzaSyDRFwCUyZTQfar0-FInTlHVVf9xP4q5JVA",
      authDomain: "pomodoro-app-1e1b6.firebaseapp.com",
      databaseURL: "https://pomodoro-app-1e1b6-default-rtdb.europe-west1.firebasedatabase.app",
      projectId: "pomodoro-app-1e1b6",
      storageBucket: "pomodoro-app-1e1b6.firebasestorage.app",
      messagingSenderId: "444414573906",
      appId: "1:444414573906:web:3c6634f3deb44ea6c64e8b"
    };
    if(typeof firebase !== 'undefined' && firebase.apps){
      if(!firebase.apps.length){
        firebase.initializeApp(firebaseConfig);
      }
      db = firebase.database();
      auth = firebase.auth();

      // Set auth persistence to LOCAL
      auth.setPersistence(firebase.auth.Auth.Persistence.LOCAL).catch(e => console.warn("Auth persistence error:", e));

      // Connection state monitoring (.info/connected)
      const connectedRef = db.ref(".info/connected");
      connectedRef.on("value", (snap) => {
        isOnline = snap.val() === true;
        updateAuthStatusUI();
      });

      // Server time offset synchronization (.info/serverTimeOffset)
      const offsetRef = db.ref(".info/serverTimeOffset");
      offsetRef.on("value", (snap) => {
        serverTimeOffsetMs = snap.val() || 0;
      });

      // Auth state listener
      auth.onAuthStateChanged((user) => {
        currentUser = user;
        updateAuthStatusUI();
        if(user){
          setupUserListeners(user.uid);
        } else {
          detachUserListeners();
        }
      });
    }
  } catch(e) {
    console.warn("Firebase offline or initialization fallback", e);
  }
}

function getUserRef(path){
  if(db && currentUser){
    return db.ref("users/" + currentUser.uid + "/" + path);
  }
  return null;
}

function pushSettingsToCloud(settings){
  try {
    const ref = getUserRef("settings");
    if(ref) ref.set(settings);
  } catch(e){
    console.warn("pushSettingsToCloud error:", e);
  }
}

function pushStudyTotalToCloud(isoKey, mins){
  try {
    const ref = getUserRef("study_totals/selmer_focus_" + isoKey);
    if(ref){
      if(mins === 0 || mins === null){
        ref.remove();
      } else {
        ref.set(mins);
      }
    }
  } catch(e){
    console.warn("pushStudyTotalToCloud error:", e);
  }
}

function pushSessionRecordToCloud(isoKey, recordData){
  try {
    const ref = getUserRef("session_records/" + isoKey);
    if(ref){
      if(recordData === null){
        ref.remove();
      } else {
        ref.set(recordData);
      }
    }
  } catch(e){
    console.warn("pushSessionRecordToCloud error:", e);
  }
}

function pushTimelineToCloud(isoKey, timelineData){
  try {
    const ref = getUserRef("pomo_timeline/" + isoKey);
    if(ref) ref.set(timelineData);
  } catch(e){
    console.warn("pushTimelineToCloud error:", e);
  }
}

function checkHasLocalData(){
  for(let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('selmer_')){
      return true;
    }
  }
  return false;
}

function uploadAllLocalDataToCloud(uid){
  if(!db) return;
  const rawSettings = localStorage.getItem('selmer_app_settings');
  if(rawSettings){
    try { db.ref("users/" + uid + "/settings").set(JSON.parse(rawSettings)); } catch(e){}
  }
  for(let i=0; i<localStorage.length; i++){
    const key = localStorage.key(i);
    if(!key || !key.startsWith('selmer_')) continue;
    if(key.startsWith('selmer_focus_') && !key.endsWith('_timeline')){
      const mins = parseInt(localStorage.getItem(key) || '0', 10);
      db.ref("users/" + uid + "/study_totals/" + key).set(mins);
    } else if(key.startsWith('selmer_record_')){
      const isoKey = key.replace('selmer_record_', '');
      try {
        const rec = JSON.parse(localStorage.getItem(key));
        db.ref("users/" + uid + "/session_records/" + isoKey).set(rec);
      } catch(e){}
    } else if(key.endsWith('_timeline')){
      const isoKey = key.replace('selmer_focus_', '').replace('_timeline', '');
      try {
        const timeline = JSON.parse(localStorage.getItem(key));
        db.ref("users/" + uid + "/pomo_timeline/" + isoKey).set(timeline);
      } catch(e){}
    }
  }
}

function downloadCloudDataToLocal(userData){
  if(!userData) return;
  if(userData.settings){
    localStorage.setItem('selmer_app_settings', JSON.stringify(userData.settings));
    loadSettingsFromStorage();
  }
  if(userData.study_totals && typeof userData.study_totals === 'object'){
    Object.keys(userData.study_totals).forEach(k => {
      localStorage.setItem(k, userData.study_totals[k]);
    });
    const todayKey = getTodayStorageKey();
    if(userData.study_totals[todayKey] !== undefined){
      todayFocusMinutes = parseInt(userData.study_totals[todayKey], 10) || 0;
    }
  }
  if(userData.session_records && typeof userData.session_records === 'object'){
    Object.keys(userData.session_records).forEach(isoKey => {
      localStorage.setItem('selmer_record_' + isoKey, JSON.stringify(userData.session_records[isoKey]));
    });
  }
  if(userData.pomo_timeline && typeof userData.pomo_timeline === 'object'){
    const todayIsoKey = getTodayStorageKey().replace('selmer_focus_', '');
    if(userData.pomo_timeline[todayIsoKey]){
      const cloudTimeline = userData.pomo_timeline[todayIsoKey];
      localStorage.setItem(getTodayStorageKey() + '_timeline', JSON.stringify(cloudTimeline));
      pomodoroTimeline = cloudTimeline;
      const completed = pomodoroTimeline.filter(t => t.type === 'focus' && t.status === 'completed');
      focusIndex = completed.length + 1;
      renderPomodoroTimeline();
      renderPomodoro();
    }
  }
  renderDataPanel();
}

function mergeLocalAndCloudData(uid, userData){
  if(userData.settings){
    localStorage.setItem('selmer_app_settings', JSON.stringify(userData.settings));
    loadSettingsFromStorage();
  }

  const cloudTotals = userData.study_totals || {};
  const allTotalKeys = new Set([...Object.keys(cloudTotals)]);
  for(let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('selmer_focus_') && !k.endsWith('_timeline')){
      allTotalKeys.add(k);
    }
  }

  allTotalKeys.forEach(key => {
    const localVal = parseInt(localStorage.getItem(key) || '0', 10);
    const cloudVal = parseInt(cloudTotals[key] || '0', 10);
    const mergedVal = Math.max(localVal, cloudVal);
    localStorage.setItem(key, mergedVal);
    db.ref("users/" + uid + "/study_totals/" + key).set(mergedVal);
    if(key === getTodayStorageKey()){
      todayFocusMinutes = mergedVal;
    }
  });

  const cloudRecords = userData.session_records || {};
  const allRecordIsoKeys = new Set([...Object.keys(cloudRecords)]);
  for(let i=0; i<localStorage.length; i++){
    const k = localStorage.key(i);
    if(k && k.startsWith('selmer_record_')){
      allRecordIsoKeys.add(k.replace('selmer_record_', ''));
    }
  }

  allRecordIsoKeys.forEach(isoKey => {
    const cloudRec = cloudRecords[isoKey];
    let localRec = null;
    try { localRec = JSON.parse(localStorage.getItem('selmer_record_' + isoKey)); } catch(e){}

    let chosenRec = cloudRec;
    if(localRec && cloudRec){
      chosenRec = (localRec.totalMinutes || 0) >= (cloudRec.totalMinutes || 0) ? localRec : cloudRec;
    } else if(localRec){
      chosenRec = localRec;
    }

    if(chosenRec){
      localStorage.setItem('selmer_record_' + isoKey, JSON.stringify(chosenRec));
      db.ref("users/" + uid + "/session_records/" + isoKey).set(chosenRec);
    }
  });

  const todayIsoKey = getTodayStorageKey().replace('selmer_focus_', '');
  const cloudTimeline = (userData.pomo_timeline && userData.pomo_timeline[todayIsoKey]) ? userData.pomo_timeline[todayIsoKey] : null;
  let localTimeline = null;
  try { localTimeline = JSON.parse(localStorage.getItem(getTodayStorageKey() + '_timeline')); } catch(e){}

  const chosenTimeline = cloudTimeline || localTimeline;
  if(chosenTimeline){
    localStorage.setItem(getTodayStorageKey() + '_timeline', JSON.stringify(chosenTimeline));
    db.ref("users/" + uid + "/pomo_timeline/" + todayIsoKey).set(chosenTimeline);
    pomodoroTimeline = chosenTimeline;
    const completed = pomodoroTimeline.filter(t => t.type === 'focus' && t.status === 'completed');
    focusIndex = completed.length + 1;
    renderPomodoroTimeline();
    renderPomodoro();
  }

  renderDataPanel();
}

function openMigrationModal(uid, userData){
  const modalBackdrop = document.getElementById('migrationModalBackdrop');
  if(!modalBackdrop) return;
  modalBackdrop.classList.add('open');

  const mergeBtn = document.getElementById('migrationMergeBtn');
  const useCloudBtn = document.getElementById('migrationUseCloudBtn');

  const onMerge = () => {
    localStorage.setItem('selmer_migrated_' + uid, 'true');
    mergeLocalAndCloudData(uid, userData);
    modalBackdrop.classList.remove('open');
    startUserRealtimeSync(uid);
    showToast('Veriler başarıyla birleştirildi!');
    cleanup();
  };

  const onUseCloud = () => {
    localStorage.setItem('selmer_migrated_' + uid, 'true');
    downloadCloudDataToLocal(userData);
    modalBackdrop.classList.remove('open');
    startUserRealtimeSync(uid);
    showToast('Bulut verisi yüklendi!');
    cleanup();
  };

  function cleanup(){
    if(mergeBtn) mergeBtn.removeEventListener('click', onMerge);
    if(useCloudBtn) useCloudBtn.removeEventListener('click', onUseCloud);
  }

  if(mergeBtn) mergeBtn.addEventListener('click', onMerge);
  if(useCloudBtn) useCloudBtn.addEventListener('click', onUseCloud);
}

function detachUserListeners(){
  userListeners.forEach(ref => {
    try { ref.off(); } catch(e){}
  });
  userListeners = [];
}

function setupUserListeners(uid){
  detachUserListeners();
  if(!db) return;

  const migrationKey = 'selmer_migrated_' + uid;
  const alreadyMigrated = localStorage.getItem(migrationKey) === 'true';

  const userRootRef = db.ref("users/" + uid);

  userRootRef.once("value", (snap) => {
    const userData = snap.val();
    const hasCloudData = userData && (userData.settings || userData.study_totals || userData.session_records || userData.pomo_timeline);
    const hasLocalData = checkHasLocalData();

    if(!alreadyMigrated && hasCloudData && hasLocalData){
      openMigrationModal(uid, userData);
    } else if(!hasCloudData && hasLocalData){
      uploadAllLocalDataToCloud(uid);
      localStorage.setItem(migrationKey, 'true');
      startUserRealtimeSync(uid);
    } else if(hasCloudData){
      downloadCloudDataToLocal(userData);
      localStorage.setItem(migrationKey, 'true');
      startUserRealtimeSync(uid);
    } else {
      localStorage.setItem(migrationKey, 'true');
      startUserRealtimeSync(uid);
    }
  });
}

function startUserRealtimeSync(uid){
  if(!db) return;

  const settingsRef = db.ref("users/" + uid + "/settings");
  settingsRef.on("value", (snap) => {
    const cloudSettings = snap.val();
    if(cloudSettings){
      localStorage.setItem('selmer_app_settings', JSON.stringify(cloudSettings));
      loadSettingsFromStorage();
    }
  });
  userListeners.push(settingsRef);

  const totalsRef = db.ref("users/" + uid + "/study_totals");
  totalsRef.on("value", (snap) => {
    const totals = snap.val();
    if(totals && typeof totals === 'object'){
      Object.keys(totals).forEach(key => {
        if(totals[key] !== null && totals[key] !== undefined){
          const cloudVal = parseInt(totals[key], 10) || 0;
          const localVal = parseInt(localStorage.getItem(key) || '0', 10);
          const maxVal = Math.max(localVal, cloudVal);
          localStorage.setItem(key, maxVal.toString());

          if(localVal < cloudVal){
            // Cloud had higher value, accept it
          } else if(localVal > cloudVal){
            // Local was higher, heal cloud
            db.ref("users/" + uid + "/study_totals/" + key).set(localVal);
          }
        }
      });
      const todayKey = getTodayStorageKey();
      if(totals[todayKey] !== undefined){
        todayFocusMinutes = Math.max(todayFocusMinutes, parseInt(totals[todayKey], 10) || 0);
      }
      renderDataPanel();
    }
  });
  userListeners.push(totalsRef);

  const recordsRef = db.ref("users/" + uid + "/session_records");
  recordsRef.on("value", (snap) => {
    const records = snap.val();
    if(records && typeof records === 'object'){
      Object.keys(records).forEach(isoKey => {
        const cloudRec = records[isoKey];
        if(!cloudRec) return;

        let localRec = null;
        try { localRec = JSON.parse(localStorage.getItem('selmer_record_' + isoKey)); } catch(e){}

        let bestRec = cloudRec;
        if(localRec){
          const localMins = localRec.totalMinutes || 0;
          const cloudMins = cloudRec.totalMinutes || 0;
          const localCount = (localRec.completedEtuts && localRec.completedEtuts.length) || localRec.sessionCount || 0;
          const cloudCount = (cloudRec.completedEtuts && cloudRec.completedEtuts.length) || cloudRec.sessionCount || 0;

          if(localCount > cloudCount || (localCount === cloudCount && localMins > cloudMins)){
            bestRec = localRec;
            // Heal cloud with superior local record
            db.ref("users/" + uid + "/session_records/" + isoKey).set(localRec);
          }
        }

        localStorage.setItem('selmer_record_' + isoKey, JSON.stringify(bestRec));
      });
      renderDataPanel();
    }
  });
  userListeners.push(recordsRef);

  const todayIsoKey = getTodayStorageKey().replace('selmer_focus_', '');
  const timelineRef = db.ref("users/" + uid + "/pomo_timeline/" + todayIsoKey);
  timelineRef.on("value", (snap) => {
    const cloudTimeline = snap.val();
    if(Array.isArray(cloudTimeline)){
      const localCompleted = pomodoroTimeline.filter(t => t.type === 'focus' && t.status === 'completed').length;
      const cloudCompleted = cloudTimeline.filter(t => t.type === 'focus' && t.status === 'completed').length;

      // Only adopt cloud timeline if it does not lose completed local sessions
      if(cloudCompleted >= localCompleted){
        const todayKey = getTodayStorageKey() + '_timeline';
        localStorage.setItem(todayKey, JSON.stringify(cloudTimeline));
        pomodoroTimeline = cloudTimeline;
        focusIndex = cloudCompleted + 1;
        renderPomodoroTimeline();
        renderPomodoro();
      }
    }
  });
  userListeners.push(timelineRef);

  setupLiveSessionSync(uid);
}

let isApplyingRemoteLiveSession = false;
let lastHeartbeatTs = 0;

function pushLiveSessionToCloud(){
  if(!db || !currentUser || isApplyingRemoteLiveSession) return;
  try {
    const nowServerMs = Date.now() + serverTimeOffsetMs;
    const sessionData = {
      sessionType: pomodoro.sessionType || 'focus',
      running: !!pomodoro.running,
      focusMin: pomodoro.focusMin || 25,
      shortMin: pomodoro.shortMin || 5,
      sessionStartTs: pomodoro.sessionStartTs ? (pomodoro.sessionStartTs + serverTimeOffsetMs) : 0,
      sessionAccumulatedMs: pomodoro.sessionAccumulatedMs || 0,
      totalMs: pomodoroTotalMs(),
      isOvertime: !!pomodoro.isOvertime,
      overtimeSec: pomodoro.overtimeSec || 0,
      focusIndex: focusIndex || 1,
      lastUpdatedTs: nowServerMs,
      deviceId: tabDeviceId
    };
    db.ref("users/" + currentUser.uid + "/live_session").set(sessionData);
    lastHeartbeatTs = Date.now();
  } catch(e){
    console.warn("pushLiveSessionToCloud error:", e);
  }
}

function setupLiveSessionSync(uid){
  if(!db) return;
  const liveSessionRef = db.ref("users/" + uid + "/live_session");

  liveSessionRef.on("value", (snap) => {
    const remote = snap.val();
    if(!remote || typeof remote !== 'object') return;
    if(remote.deviceId === tabDeviceId) return; // Ignore own writes

    isApplyingRemoteLiveSession = true;

    const nowServerMs = Date.now() + serverTimeOffsetMs;
    pomodoro.sessionType = remote.sessionType || 'focus';
    pomodoro.focusMin = remote.focusMin || 25;
    pomodoro.shortMin = remote.shortMin || 5;
    pomodoro.isOvertime = !!remote.isOvertime;
    pomodoro.overtimeSec = remote.overtimeSec || 0;
    if(remote.focusIndex) focusIndex = remote.focusIndex;

    const totalMs = remote.totalMs || pomodoroTotalMs();
    let computedElapsed = remote.sessionAccumulatedMs || 0;
    if(remote.running && remote.sessionStartTs > 0){
      computedElapsed += Math.max(0, nowServerMs - remote.sessionStartTs);
      pomodoro.sessionStartTs = Date.now() - Math.max(0, nowServerMs - remote.sessionStartTs);
    } else {
      pomodoro.sessionStartTs = 0;
    }
    pomodoro.sessionAccumulatedMs = remote.sessionAccumulatedMs || 0;

    if(computedElapsed >= totalMs){
      pomodoro.remainingMs = 0;
      pomodoro.isOvertime = true;
      pomodoro.overtimeSec = Math.floor((computedElapsed - totalMs) / 1000);
    } else {
      pomodoro.remainingMs = totalMs - computedElapsed;
    }

    const wasRunning = pomodoro.running;
    pomodoro.running = !!remote.running;

    if(pomodoro.running){
      if(!wasRunning){
        if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);
        pomodoro.intervalId = setInterval(pomodoroTick, 100);
      }
    } else {
      if(pomodoro.intervalId) clearInterval(pomodoro.intervalId);
    }

    renderPomodoroTimeline();
    renderPomodoro();

    if(wasRunning !== pomodoro.running){
      showToast(pomodoro.running ? 'Sayaç diğer cihazdan başlatıldı' : 'Sayaç diğer cihazdan duraklatıldı');
    }

    setTimeout(() => { isApplyingRemoteLiveSession = false; }, 300);
  });

  userListeners.push(liveSessionRef);
}

function updateAuthStatusUI(){
  const dot = document.getElementById('authStatusDot');
  const loggedInView = document.getElementById('loggedInView');
  const loggedOutView = document.getElementById('loggedOutView');
  const userEmailDisplay = document.getElementById('userEmailDisplay');
  const userSyncStatus = document.getElementById('userSyncStatus');

  if(currentUser){
    if(dot){
      dot.className = 'auth-status-dot ' + (isOnline ? 'online' : 'offline');
      dot.title = isOnline ? 'Çevrimiçi (' + currentUser.email + ')' : 'Çevrimdışı (Hesaplı)';
    }
    if(loggedInView) loggedInView.style.display = 'flex';
    if(loggedOutView) loggedOutView.style.display = 'none';
    if(userEmailDisplay) userEmailDisplay.textContent = currentUser.email;
    if(userSyncStatus) userSyncStatus.textContent = isOnline ? '☁️ Bulut Senkronizasyonu Aktif' : '⚠️ Çevrimdışı Mod (Yerel Önbellek)';
  } else {
    if(dot){
      dot.className = 'auth-status-dot ' + (isOnline ? 'guest' : 'offline');
      dot.title = isOnline ? 'Misafir Modu' : 'Çevrimdışı Mod';
    }
    if(loggedInView) loggedInView.style.display = 'none';
    if(loggedOutView) loggedOutView.style.display = 'flex';
  }
}

function getAuthErrorMessage(errorCode){
  switch(errorCode){
    case 'auth/user-not-found':
      return "Bu e-posta adresiyle kayıtlı bir hesap bulunamadı. Hesabınız yoksa 'Kayıt Ol' sekmesinden oluşturabilirsiniz.";
    case 'auth/wrong-password':
    case 'auth/invalid-credential':
    case 'auth/invalid-login-credentials':
      return "Şifreniz hatalı. Lütfen tekrar deneyin veya 'Şifremi Unuttum'u kullanın.";
    case 'auth/invalid-email':
      return "Geçerli bir e-posta adresi girin (örn. adiniz@gmail.com).";
    case 'auth/email-already-in-use':
      return "Bu e-posta adresiyle zaten bir hesap var. Giriş yapmayı deneyin.";
    case 'auth/weak-password':
      return "Şifreniz en az 6 karakter olmalı.";
    case 'auth/too-many-requests':
      return "Çok fazla başarısız deneme yapıldı. Lütfen birkaç dakika sonra tekrar deneyin.";
    case 'auth/network-request-failed':
      return "İnternet bağlantınızı kontrol edin.";
    default:
      return "Bir şeyler ters gitti, lütfen tekrar deneyin.";
  }
}

function handleAuthSubmit(e){
  e.preventDefault();
  const emailInput = document.getElementById('authEmailInput');
  const passInput = document.getElementById('authPasswordInput');
  const email = emailInput ? emailInput.value.trim() : '';
  const password = passInput ? passInput.value : '';
  const errEl = document.getElementById('authErrorMsg');
  const succEl = document.getElementById('authSuccessMsg');
  const tabRegister = document.getElementById('authTabRegister');
  const isRegister = tabRegister && tabRegister.classList.contains('active');

  if(errEl) errEl.style.display = 'none';
  if(succEl) succEl.style.display = 'none';

  if(!auth){
    if(errEl){ errEl.textContent = 'Firebase Kimlik Doğrulama başlatılamadı.'; errEl.style.display = 'block'; }
    return;
  }

  if(isRegister){
    auth.createUserWithEmailAndPassword(email, password)
      .then((userCredential) => {
        if(succEl){ succEl.textContent = 'Kayıt başarılı! Giriş yapıldı.'; succEl.style.display = 'block'; }
        setTimeout(() => {
          const authBackdrop = document.getElementById('authModalBackdrop');
          if(authBackdrop) authBackdrop.classList.remove('open');
        }, 1000);
      })
      .catch((error) => {
        console.error('AUTH ERROR CODE:', error.code, error.message);
        if(errEl){ errEl.textContent = getAuthErrorMessage(error.code); errEl.style.display = 'block'; }
      });
  } else {
    auth.signInWithEmailAndPassword(email, password)
      .then((userCredential) => {
        if(succEl){ succEl.textContent = 'Giriş başarılı!'; succEl.style.display = 'block'; }
        setTimeout(() => {
          const authBackdrop = document.getElementById('authModalBackdrop');
          if(authBackdrop) authBackdrop.classList.remove('open');
        }, 800);
      })
      .catch((error) => {
        console.error('AUTH ERROR CODE:', error.code, error.message);
        if(errEl){ errEl.textContent = getAuthErrorMessage(error.code); errEl.style.display = 'block'; }
      });
  }
}

function handleForgotPassword(){
  const emailInput = document.getElementById('authEmailInput');
  const email = emailInput ? emailInput.value.trim() : '';
  const errEl = document.getElementById('authErrorMsg');
  const succEl = document.getElementById('authSuccessMsg');

  if(errEl) errEl.style.display = 'none';
  if(succEl) succEl.style.display = 'none';

  if(!email){
    if(errEl){ errEl.textContent = 'Lütfen e-posta adresinizi yukarıdaki alana giriniz.'; errEl.style.display = 'block'; }
    return;
  }

  if(!auth) return;

  auth.sendPasswordResetEmail(email)
    .then(() => {
      if(succEl){ succEl.textContent = 'Şifre sıfırlama e-postası gönderildi. Kutunuzu kontrol ediniz.'; succEl.style.display = 'block'; }
    })
    .catch((error) => {
      let msg = 'E-posta gönderilemedi.';
      if(error.code === 'auth/user-not-found') msg = 'Bu e-posta adresiyle kayıtlı kullanıcı bulunamadı.';
      else if(error.code === 'auth/invalid-email') msg = 'Geçersiz e-posta adresi.';
      if(errEl){ errEl.textContent = msg; errEl.style.display = 'block'; }
    });
}

function handleLogout(){
  if(auth){
    auth.signOut().then(() => {
      detachUserListeners();
      currentUser = null;
      updateAuthStatusUI();
      showToast('Çıkış yapıldı. Misafir moduna geçildi.');
      const authBackdrop = document.getElementById('authModalBackdrop');
      if(authBackdrop) authBackdrop.classList.remove('open');
    });
  }
}
