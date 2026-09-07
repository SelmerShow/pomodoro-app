/**
 * TimerVisuals - High-Performance Hi-DPI Visual Engine
 */
const TimerVisuals = (() => {
  let canvas = null;
  let ctx = null;
  let currentWidth = 0;
  let currentHeight = 0;
  let dpr = 1;

  const particles = [];
  const TOTAL_PARTICLES = 40;

  function init(){
    canvas = document.getElementById('pomoVisualsCanvas');
    if(!canvas) return;
    ctx = canvas.getContext('2d');
    resize();
    window.addEventListener('resize', resize);

    particles.length = 0;
    for(let i = 0; i < TOTAL_PARTICLES; i++){
      particles.push({
        x: (Math.random() - 0.5) * 160,
        y: Math.random() * 180 - 90,
        r: Math.random() * 1.8 + 0.8,
        vy: Math.random() * 0.7 + 0.3,
        pulse: Math.random() * Math.PI * 2,
        alpha: Math.random() * 0.6 + 0.3
      });
    }
  }

  function resize(){
    if(!canvas) return;
    const parent = canvas.parentElement;
    if(!parent) return;
    const w = parent.clientWidth;
    const h = parent.clientHeight;
    if(w === 0 || h === 0) return;

    dpr = Math.min(window.devicePixelRatio || 1, 2.5);
    currentWidth = w;
    currentHeight = h;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
  }

  function render(ts, remainingFrac, elapsedFrac){
    if(!canvas || !ctx) return;
    const parent = canvas.parentElement;
    if(parent && (parent.clientWidth !== currentWidth || parent.clientHeight !== currentHeight)){
      resize();
    }
    if(canvas.width === 0 || canvas.height === 0) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, currentWidth, currentHeight);

    const style = state.progressStyle || 'ring';
    if(style === 'minimal' || style === 'ring' || style === 'linear') return;

    const cx = currentWidth / 2;
    const cy = currentHeight / 2;
    // Exactly matches SVG viewBox 220 circle r=98
    const radius = currentWidth * (98 / 220);

    const isDeplete = state.progressDirection === 'deplete';
    const activeFrac = isDeplete ? remainingFrac : elapsedFrac;

    if(style === 'dotted'){
      renderCyberCapsules(ctx, cx, cy, radius, activeFrac);
    } else if(style === 'wave'){
      renderLiquidWave(ctx, cx, cy, radius, activeFrac, ts);
    } else if(style === 'particles'){
      renderCosmicFlow(ctx, cx, cy, radius, activeFrac, ts);
    } else if(style === 'arc'){
      renderDualPlasmaArc(ctx, cx, cy, radius, activeFrac, ts);
    } else if(style === 'fill'){
      renderRadialRadar(ctx, cx, cy, radius, activeFrac);
    }
  }

  function renderCyberCapsules(ctx, cx, cy, radius, frac){
    const TOTAL_PILLS = 40;
    const activeCount = frac * TOTAL_PILLS;

    for(let i = 0; i < TOTAL_PILLS; i++){
      const angle = (i / TOTAL_PILLS) * Math.PI * 2 - Math.PI / 2;
      const x = cx + Math.cos(angle) * radius;
      const y = cy + Math.sin(angle) * radius;

      ctx.save();
      ctx.translate(x, y);
      ctx.rotate(angle + Math.PI / 2);

      const isActive = i < Math.floor(activeCount);
      const isCurrent = i === Math.floor(activeCount);

      if(isActive){
        ctx.fillStyle = CACHED_C1;
        ctx.shadowColor = CACHED_C1;
        ctx.shadowBlur = 10;
        ctx.globalAlpha = 1.0;
      } else if(isCurrent){
        const rem = activeCount - Math.floor(activeCount);
        ctx.fillStyle = CACHED_C1;
        ctx.shadowColor = CACHED_C1;
        ctx.shadowBlur = 10 * rem;
        ctx.globalAlpha = Math.max(0.15, rem);
      } else {
        ctx.fillStyle = 'rgba(255, 255, 255, 0.08)';
        ctx.shadowBlur = 0;
        ctx.globalAlpha = 1.0;
      }

      const w = Math.max(3, currentWidth * 0.016);
      const h = Math.max(8, currentWidth * 0.048);
      ctx.beginPath();
      ctx.roundRect(-w / 2, -h / 2, w, h, w / 2);
      ctx.fill();
      ctx.restore();
    }
  }

  function renderLiquidWave(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const waterLevel = cy + radius - (radius * 2 * frac);

    const grad1 = ctx.createLinearGradient(cx, waterLevel - 20, cx, cy + radius);
    grad1.addColorStop(0, CACHED_C1);
    grad1.addColorStop(1, 'rgba(10, 14, 28, 0.95)');

    ctx.fillStyle = grad1;
    ctx.globalAlpha = 0.45;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius);

    for(let x = cx - radius; x <= cx + radius; x += 4){
      const dx = x - cx;
      const y = waterLevel + Math.sin(dx * 0.035 + ts * 0.0035) * 6;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + radius, cy + radius);
    ctx.closePath();
    ctx.fill();

    ctx.fillStyle = CACHED_C2;
    ctx.globalAlpha = 0.3;
    ctx.beginPath();
    ctx.moveTo(cx - radius, cy + radius);
    for(let x = cx - radius; x <= cx + radius; x += 4){
      const dx = x - cx;
      const y = waterLevel + Math.cos(dx * 0.045 + ts * 0.0028) * 5;
      ctx.lineTo(x, y);
    }
    ctx.lineTo(cx + radius, cy + radius);
    ctx.closePath();
    ctx.fill();

    ctx.strokeStyle = CACHED_C1;
    ctx.lineWidth = 2.4;
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

  function renderCosmicFlow(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.clip();

    const poolHeight = radius * 2 * frac;
    const poolTopY = cy + radius - poolHeight;

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

      ctx.strokeStyle = CACHED_C3;
      ctx.lineWidth = 2;
      ctx.shadowColor = CACHED_C3;
      ctx.shadowBlur = 10;
      ctx.globalAlpha = 0.85;
      ctx.beginPath();
      ctx.moveTo(cx - radius, poolTopY);
      ctx.lineTo(cx + radius, poolTopY);
      ctx.stroke();
    }

    particles.forEach(p => {
      p.y -= p.vy;
      p.x += Math.sin(ts * 0.002 + p.pulse) * 0.5;

      if(p.y < -radius * 0.85){
        p.y = radius * 0.85;
        p.x = (Math.random() - 0.5) * radius * 1.2;
      }

      const px = cx + p.x;
      const py = cy + p.y;
      const dist = Math.hypot(p.x, p.y);

      if(dist < radius - 6){
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

  function renderDualPlasmaArc(ctx, cx, cy, radius, frac, ts){
    ctx.save();
    const startAngle = -Math.PI / 2;
    const progressAngle = startAngle + frac * Math.PI * 2;

    ctx.strokeStyle = 'rgba(255, 255, 255, 0.07)';
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
    ctx.stroke();

    if(frac > 0.002){
      ctx.strokeStyle = CACHED_C1;
      ctx.lineWidth = 5;
      ctx.lineCap = 'round';
      ctx.shadowColor = CACHED_C1;
      ctx.shadowBlur = 12;
      ctx.beginPath();
      ctx.arc(cx, cy, radius, startAngle, progressAngle);
      ctx.stroke();

      const tipX = cx + Math.cos(progressAngle) * radius;
      const tipY = cy + Math.sin(progressAngle) * radius;
      ctx.fillStyle = '#ffffff';
      ctx.shadowColor = CACHED_C1;
      ctx.shadowBlur = 14;
      ctx.beginPath();
      ctx.arc(tipX, tipY, 4.2, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  function renderRadialRadar(ctx, cx, cy, radius, frac){
    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, radius, 0, Math.PI * 2);
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
