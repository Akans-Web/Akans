/* ═══════════════════════════════════════════════════
   WEDDING INVITATION — app.js
   Sections:
   1. Door Open
   2. Scratch Card
   3. Confetti
   4. Congrats Overlay
   5. Slideshow
   6. Countdown
   7. Send Message / Toast
   8. WhatsApp
   9. Service Worker Registration
═══════════════════════════════════════════════════ */

'use strict';

/* ─── 1. DOOR OPEN ─── */
function openEnvelope() {
  const cover = document.getElementById('envelope-cover');
  cover.classList.add('opening');
  setTimeout(() => {
    cover.style.display = 'none';
    const main = document.getElementById('main-content');
    main.style.display = 'block';
    setTimeout(() => {
      main.classList.add('visible');
      // Init scratch AFTER layout is painted
      if (window._scratchInit) window._scratchInit();
    }, 10);
  }, 1400);
}

/* ─── 2. SCRATCH CARD ─── */
(function () {
  let revealed = false;
  const THRESHOLD = 0.70; // 70% scratched → auto-complete

  function initScratch() {
    const revealedEl = document.getElementById('scratch-revealed');
    const canvas     = document.getElementById('scratch-canvas');
    if (!canvas || !revealedEl) return;

    const ctx = canvas.getContext('2d');
    let lastX = null, lastY = null;
    let lastCheck = 0;

    /* Draw gold surface */
    function drawSurface() {
      const w = canvas.width, h = canvas.height;
      ctx.globalCompositeOperation = 'source-over';
      ctx.clearRect(0, 0, w, h);

      const grad = ctx.createLinearGradient(0, 0, w, h);
      grad.addColorStop(0,    '#e8c060');
      grad.addColorStop(0.35, '#c9a96e');
      grad.addColorStop(0.65, '#d4b060');
      grad.addColorStop(1,    '#b8903a');
      ctx.fillStyle = grad;
      ctx.fillRect(0, 0, w, h);

      // Subtle sheen — no circles
      const sheen = ctx.createLinearGradient(0, h * 0.3, 0, h * 0.5);
      sheen.addColorStop(0,   'rgba(255,255,255,0)');
      sheen.addColorStop(0.5, 'rgba(255,255,255,0.10)');
      sheen.addColorStop(1,   'rgba(255,255,255,0)');
      ctx.fillStyle = sheen;
      ctx.fillRect(0, 0, w, h);

      // Center label
      ctx.fillStyle = 'rgba(255,255,255,0.90)';
      ctx.font      = 'italic 17px "Cormorant Garamond", serif';
      ctx.textAlign = 'center';
      ctx.fillText('✦  Scratch to Reveal  ✦', w / 2, h / 2 + 6);
    }

    /* Resize canvas to match element */
    function resize() {
      const rect = revealedEl.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) return;
      canvas.width  = rect.width;
      canvas.height = rect.height;
      if (!revealed) {
        drawSurface();
        canvas.closest('.scratch-wrapper').classList.add('canvas-ready');
      }
    }

    /* Get canvas-relative coordinates */
    function getPos(e) {
      const rect  = canvas.getBoundingClientRect();
      const scaleX = canvas.width  / rect.width;
      const scaleY = canvas.height / rect.height;
      const clientX = e.touches ? e.touches[0].clientX : e.clientX;
      const clientY = e.touches ? e.touches[0].clientY : e.clientY;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top)  * scaleY,
      };
    }

    /* Smooth line erase */
    function scratchLine(x1, y1, x2, y2) {
      ctx.globalCompositeOperation = 'destination-out';
      ctx.lineWidth  = 60;
      ctx.lineCap    = 'round';
      ctx.lineJoin   = 'round';
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.stroke();
      ctx.beginPath();
      ctx.arc(x2, y2, 30, 0, Math.PI * 2);
      ctx.fill();
    }

    /* Haptic feedback */
    function vibrate() {
      if (navigator.vibrate) navigator.vibrate(8);
    }

    /* Check % scratched — throttled to every 150ms */
    function checkPercent() {
      if (revealed) return;
      const now = Date.now();
      if (now - lastCheck < 150) return;
      lastCheck = now;

      const data = ctx.getImageData(0, 0, canvas.width, canvas.height).data;
      let transparent = 0;
      for (let i = 3; i < data.length; i += 4) {
        if (data[i] < 128) transparent++;
      }
      const pct = transparent / (canvas.width * canvas.height);

      if (pct >= THRESHOLD) {
        revealed = true;
        // Auto-complete remaining surface
        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        canvas.style.transition = 'opacity 0.7s ease';
        canvas.style.opacity    = '0';
        if (navigator.vibrate) navigator.vibrate([30, 20, 30]);
        setTimeout(() => {
          canvas.style.display = 'none';
          triggerConfetti();
          setTimeout(showCongratsOverlay, 400);
        }, 700);
      }
    }

    /* ── Event listeners ── */
    let isDrawing = false;

    canvas.addEventListener('mousedown', e => {
      isDrawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      scratchLine(p.x, p.y, p.x, p.y);
      checkPercent();
    });
    canvas.addEventListener('mousemove', e => {
      if (!isDrawing) return;
      const p = getPos(e);
      scratchLine(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
      checkPercent();
    });
    canvas.addEventListener('mouseup',    () => { isDrawing = false; lastX = lastY = null; });
    canvas.addEventListener('mouseleave', () => { isDrawing = false; lastX = lastY = null; });

    canvas.addEventListener('touchstart', e => {
      e.preventDefault();
      isDrawing = true;
      const p = getPos(e);
      lastX = p.x; lastY = p.y;
      scratchLine(p.x, p.y, p.x, p.y);
      vibrate();
      checkPercent();
    }, { passive: false });

    canvas.addEventListener('touchmove', e => {
      e.preventDefault();
      if (!isDrawing) return;
      const p = getPos(e);
      scratchLine(lastX, lastY, p.x, p.y);
      lastX = p.x; lastY = p.y;
      vibrate();
      checkPercent();
    }, { passive: false });

    canvas.addEventListener('touchend', () => { isDrawing = false; lastX = lastY = null; });

    window.addEventListener('resize', () => { lastX = lastY = null; resize(); });

    // Initial draw
    resize();
  }

  // Called after door opens (layout settled)
  window._scratchInit = function () {
    initScratch();
    // Safety retry if element had no dimensions yet
    setTimeout(() => {
      const c = document.getElementById('scratch-canvas');
      if (c && (c.width === 0 || c.height === 0)) initScratch();
    }, 300);
  };
})();

/* ─── 3. CONFETTI ─── */
function triggerConfetti() {
  const container = document.getElementById('confetti-container');
  container.style.display = 'block';
  const colors = ['#c5768a','#e8b4be','#c9a96e','#f5c4ce','#a85870','#fff','#f9c784'];
  for (let i = 0; i < 90; i++) {
    const p = document.createElement('div');
    p.className  = 'confetti-piece';
    p.style.cssText = `
      left: ${Math.random() * 100}%;
      top: -20px;
      background: ${colors[Math.floor(Math.random() * colors.length)]};
      width:  ${6 + Math.random() * 8}px;
      height: ${6 + Math.random() * 8}px;
      border-radius: ${Math.random() > 0.5 ? '50%' : '2px'};
      animation-delay:    ${Math.random() * 1.5}s;
      animation-duration: ${2 + Math.random() * 2}s;
    `;
    container.appendChild(p);
  }
  setTimeout(() => {
    container.style.display = 'none';
    container.innerHTML = '';
  }, 4500);
}

/* ─── 4. CONGRATS OVERLAY ─── */
function showCongratsOverlay() {
  const overlay = document.getElementById('congrats-overlay');
  if (overlay) overlay.classList.add('show');
}
function closeCongratsOverlay() {
  const overlay = document.getElementById('congrats-overlay');
  if (overlay) overlay.classList.remove('show');
}

/* ─── 5. SLIDESHOW ─── */
(function () {
  let current = 0;
  const total = 4;
  function nextSlide() {
    document.getElementById('slide-' + current).classList.remove('active');
    document.getElementById('dot-'   + current).classList.remove('active');
    current = (current + 1) % total;
    document.getElementById('slide-' + current).classList.add('active');
    document.getElementById('dot-'   + current).classList.add('active');
  }
  setInterval(nextSlide, 3000);
})();

/* ─── 6. COUNTDOWN ─── */
(function () {
  // Update this date/time to the actual wedding datetime
  const target = new Date('2026-06-15T17:00:00+05:30');

  function update() {
    const diff = target - new Date();
    if (diff <= 0) {
      ['cd-days','cd-hours','cd-mins','cd-secs'].forEach(id => {
        document.getElementById(id).textContent = '00';
      });
      return;
    }
    const d = Math.floor(diff / 86400000);
    const h = Math.floor((diff % 86400000) / 3600000);
    const m = Math.floor((diff % 3600000)  / 60000);
    const s = Math.floor((diff % 60000)    / 1000);
    document.getElementById('cd-days').textContent  = String(d).padStart(2, '0');
    document.getElementById('cd-hours').textContent = String(h).padStart(2, '0');
    document.getElementById('cd-mins').textContent  = String(m).padStart(2, '0');
    document.getElementById('cd-secs').textContent  = String(s).padStart(2, '0');
  }
  update();
  setInterval(update, 1000);
})();

/* ─── 7. SEND MESSAGE / TOAST ─── */
function sendMessage() {
  const name  = document.getElementById('msg-name').value.trim();
  const text  = document.getElementById('msg-text').value.trim();
  if (!name || !text) {
    showToast('Please fill in your name and message ♥');
    return;
  }
  showToast('Message sent! Thank you ♥');
  ['msg-name','msg-email','msg-attend','msg-text'].forEach(id => {
    document.getElementById(id).value = '';
  });
}

function showToast(msg) {
  const toast = document.getElementById('toast');
  toast.textContent = msg;
  toast.classList.add('show');
  setTimeout(() => toast.classList.remove('show'), 3000);
}

/* ─── 8. WHATSAPP ─── */
function openWhatsApp() {
  window.open(
    'https://wa.me/919673840137?text=Hi%2C+I+want+to+create+my+own+wedding+invitation!',
    '_blank'
  );
}

/* ─── 9. SERVICE WORKER REGISTRATION ─── */
if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('/sw.js')
      .then(reg  => console.log('[SW] Registered:', reg.scope))
      .catch(err => console.warn('[SW] Registration failed:', err));
  });
}
