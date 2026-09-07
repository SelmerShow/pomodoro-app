/**
 * TimerVisuals - High-Performance Hi-DPI Visual Engine
 */
const TimerVisuals = (() => {
  let canvas = null;
  let ctx = null;
  let currentWidth = 0;
  let currentHeight = 0;
  let dpr = 1;

  // Particles state for 'particles' mode
  const particles = [];
  const TOTAL_PARTICLES = 45;

  function init(){
    canvas = document.getElementById('pomoVisualsCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    // Initialize cosmic particles
    particles.length = 0;
    for(let i = 0; i < TOTAL_PARTICLES; i++){
      particles.push({
        x: (Math.random() - 0.5) * 160,
        y: Math.random() * 180 - 90,
        r: Math.random() * 2 + 0.8,
        vy: Math.random() * 0.8 + 0.3,
        vx: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2
      });
    }
  }

  function resize(){
    if(!canvas) return;
    const parent = canvas.parentElement;
    if(!parent) return;
    const rect = parent.getBoundingClientRect();
    if(rect.width === 0 || rect.height === 0) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    currentWidth = rect.width;
    currentHeight = rect.height;

    canvas.width = Math.round(currentWidth * dpr);
    canvas.height = Math.round(currentHeight * dpr);
    canvas.style.width = currentWidth + 'px';
    canvas.style.height = currentHeight + 'px';
  }

  function render(ts, frac, elapsedFrac){
    if(!canvas || !ctx) return;
    if(canvas.width === 0 || canvas.height === 0) resize();

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, currentWidth, currentHeight);

    const style = state.progressStyle || 'ring';
    if(style === 'minimal' || style === 'ring' || style === 'linear') return;

    const cx = currentWidth / 2;
    const cy = currentHeight / 2;
    const radius = (Math.min(currentWidth, currentHeight) / 2) * 0.88;

    if(style === 'dotted'){
      renderCyberCapsules(ctx, cx, cy, radius, elapsedFrac);
    } else if(style === 'wave'){
      renderLiquidWave(ctx, cx, cy, radius, elapsedFrac, ts);
    } else if(style === 'particles'){
      renderCosmicFlow(ctx, cx, cy, radius, elapsedFrac, ts);
    } else if(style === 'arc'){
      renderDualPlasmaArc(ctx, cx, cy, radius, elapsedFrac, ts);
    } else if(style === 'fill'){
      renderRadialRadar(ctx, cx, cy, radius, elapsedFrac);
    }
  }

  // 1. SİBER KAPSÜL (40 Evenly Spaced Neon Pills - Zero Mask Artifacts)
  function renderCyberCapsules(ctx, cx, cy, radius, frac){
    const TOTAL_PILLS = 40;
    const activeCount = frac * TOTAL_PILLS;
    const pillRadius = radius * 0.98;

    for(let i = 0; i < TOTAL_PILLS; i++){
      const angle = (i / TOTAL_PILLS) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * pillRadius;
      const y = cy + Math.sin(angle) * pillRadius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      const isActive = i < Math.floor(activeCount);
      const isCurrent = i === Math.floor(activeCount);

      if(isActive){
        ctx.fillStyle = CACHED_C1;
        ctx.shadowColor = CACHED_C1;
        ctx.shadowBlur = 9;
        ctx.globalAlpha = 1.0;
      } else if(isCurrent){
        const rem = activeCount - Math.floor(activeCount);
        ctx.fillStyle = CACHED_C1;
        ctx.shadowColor = CACHED_C1;
        ctx.shadowBlur = 9 * rem;
        ctx.globalAlpha = Math.max(0.12, rem);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      // Rounded capsule shape
      const w = 4.2;
      const h = 12;
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, 2.5);
      ctx.fill();
      ctx.restore();
    }
  }

  // 2. PLAZMA DALGA (High-DPI Liquid Simulation Clipped to Circle)
  function renderLiquidWave(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.clip();

    const waterLevel = cy + radius - (radius * 2 * frac);

    // Primary wave gradient
    const grad1 = ctx.createLinearGradient(cx, waterLevel - 20, cx, cy + radius);
    grad1.addColorStop(0, CACHED_C1);
    grad1.addColorStop(1, 'rgba(10, 14, 28, 0.95)');

    ctx.fillStyle = grad1;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius);

    for(let x = cx - radius; x <= cx + radius; x += 3){
      const dx = x - cx;
      const y = waterLevel + Math.sin(dx * 0.035 + ts * 0.0035) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + radius, cy + radius);
    ctx.closePath();
    ctx.fill();

    // Secondary wave
    ctx.fillStyle = CACHED_C2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius);

    for(let x = cx - radius; x <= cx + radius; x += 3){
      const dx = x - cx;
      const y = waterLevel + Math.cos(dx * 0.045 + ts * 0.0028) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + radius, cy + radius);
    ctx.closePath();
    ctx.fill();

    // Crisp neon crest highlight line
    ctx.strokeStyle = CACHED_C1;
    ctx.lineWidth = 2.2;
    ctx.shadowColor = CACHED_C1;
    ctx.shadowBlur = 10;
    ctx.globalAlpha = 0.95;
    ctx.beginPath();
    for(let x = cx - radius; x <= cx + radius; x += 4){
      const dx = x - cx;
      const y = waterLevel + Math.sin(dx * 0.035 + ts * 0.0035) * 6;
      if(x === cx - radius) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    }
    ctx.stroke();

    ctx.restore();
  }

  // 3. KOZMİK AKIŞ (Ethereal Cosmic Stardust Core)
  function renderCosmicFlow(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 3, 0, Math.PI * 2);
    ctx.clip();

    const poolHeight = radius * 2 * frac;
    const poolTopY = cy + radius - poolHeight;

    // Background cosmic radiance pool
    if(frac > 0.01){
      const poolGrad = ctx.createRadialGradient(cx, cy + radius, 10, cx, cy + radius, poolHeight + 20);
      poolGrad.addColorStop(0, CACHED_C1);
      poolGrad.addColorStop(0.6, CACHED_C2);
      poolGrad.addColorStop(1, 'transparent');

      ctx.fillStyle = poolGrad;
      ctx.globalAlpha = 0.35 + frac * 0.25;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, 0, Math.PI * 2);
      ctx.fill();

      // Top energy threshold line
      ctx.strokeStyle = CACHED_C3;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = CACHED_C3;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(cx - radius, poolTopY);
      ctx.lineTo(cx + radius, poolTopY);
      ctx.stroke();
    }

    // Swirling stardust motes
    particles.forEach(p => {
      p.y -= p.vy;
      p.x += Math.sin(ts * 0.002 + p.pulse) * 0.5;

      // Recycle particles
      if(p.y < -radius * 0.85){
        p.y = radius * 0.85;
        p.x = (Math.random() - 0.5) * radius * 1.2;
      }

      const px = cx + p.x;
      const py = cy + p.y;
      const dist = Math.hypot(p.x, p.y);

      if(dist < radius - 8){
        ctx.fillStyle = CACHED_C1;
        ctx.shadowColor = CACHED_C1;
        ctx.shadowBlur = 6;
        ctx.globalAlpha = p.alpha * (0.4 + frac * 0.6);
        ctx.beginPath();
        ctx.arc(px, py, p.r, 0, Math.PI * 2);
        ctx.fill();
      }
    });

    ctx.restore();
  }

  // 4. ÇİFT SİBER YAY (Dual High-Speed Running Plasma Arcs)
  function renderDualPlasmaArc(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    const arcRadius = radius * 0.98;
    const startAngle = -Math.PI / 2;
    const progressAngle = startAngle + frac * Math.PI * 2;

    // Background track
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.06)';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.arc(cx, cy, arcRadius, 0, Math.PI * 2);
    ctx.stroke();

    // Active progress arc
    if(frac > 0.002){
      ctx.strokeStyle = CACHED_C1;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = CACHED_C1;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, arcRadius, startAngle, progressAngle);
      ctx.stroke();
    }

    // High-speed runner pulse comet
    const speed = ts * 0.0035;
    const runnerAngle = (speed % (Math.PI * 2)) - Math.PI / 2;
    const rx = cx + Math.cos(runnerAngle) * arcRadius;
    const ry = cy + Math.sin(runnerAngle) * arcRadius;

    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = CACHED_C1;
    ctx.shadowBlur = 16;
    ctx.beginPath();
    ctx.arc(rx, ry, 3.8, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }

  // 5. RADYAL DOLUM (Radar)
  function renderRadialRadar(ctx, cx, cy, radius, frac){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius - 2, 0, Math.PI * 2);
    ctx.clip();

    const startAngle = -Math.PI / 2;
    const endAngle = startAngle + frac * Math.PI * 2;

    ctx.fillStyle = CACHED_C1;
    ctx.globalAlpha = 0.22;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.arc(cx, cy, radius, startAngle, endAngle);
    ctx.closePath();
    ctx.fill();

    // Leading ray
    const rx = cx + Math.cos(endAngle) * radius;
    const ry = cy + Math.sin(endAngle) * radius;
    ctx.strokeStyle = CACHED_C1;
    ctx.lineWidth = 2.5;
    ctx.shadowColor = CACHED_C1;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.moveTo(cx, cy);
    ctx.lineTo(rx, ry);
    ctx.stroke();

    ctx.restore();
  }

  return { init, resize, render };
})();
