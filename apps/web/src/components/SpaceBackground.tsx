import { useEffect, useRef, memo } from 'react';

interface ShootingStar {
  x: number;
  y: number;
  len: number;
  speed: number;
  angle: number;
  alpha: number;
  life: number;
  maxLife: number;
  thickness: number;
  color: string;
}

const SHOOTING_COLORS = [
  'rgba(180,200,255,',
  'rgba(200,220,255,',
  'rgba(160,180,255,',
  'rgba(140,160,255,',
];

function spawnShootingStar(w: number, h: number): ShootingStar {
  const side = Math.random();
  let x: number, y: number;
  if (side < 0.4) { x = Math.random() * w; y = -10; }
  else if (side < 0.7) { x = w + 10; y = Math.random() * h * 0.5; }
  else if (side < 0.9) { x = Math.random() * w * 0.5 + w * 0.5; y = -10; }
  else { x = -10; y = Math.random() * h * 0.3; }

  const angle = (Math.PI / 6) + Math.random() * (Math.PI / 3);
  const maxLife = 40 + Math.random() * 60;

  return {
    x, y,
    len: 60 + Math.random() * 120,
    speed: 6 + Math.random() * 10,
    angle: side < 0.7 ? angle + Math.PI * 0.5 : angle,
    alpha: 0.6 + Math.random() * 0.4,
    life: 0,
    maxLife,
    thickness: 1 + Math.random() * 1.5,
    color: SHOOTING_COLORS[Math.floor(Math.random() * SHOOTING_COLORS.length)],
  };
}

interface SpaceBackgroundProps {
  active: boolean;
}

export default memo(function SpaceBackground({ active }: SpaceBackgroundProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const stateRef = useRef<{
    shootingStars: ShootingStar[];
    lastShootingTime: number;
    fadeIn: number;
  }>({ shootingStars: [], lastShootingTime: 0, fadeIn: 0 });

  useEffect(() => {
    if (!active) {
      stateRef.current.fadeIn = 0;
      return;
    }

    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d', { alpha: true });
    if (!ctx) return;

    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio, 2);
      canvas.width = window.innerWidth * dpr;
      canvas.height = window.innerHeight * dpr;
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    resize();
    window.addEventListener('resize', resize);

    let raf: number;

    const draw = (now: number) => {
      const state = stateRef.current;
      const w = window.innerWidth;
      const h = window.innerHeight;

      // Fade in over 1.5s
      state.fadeIn = Math.min(state.fadeIn + 0.02, 1);
      const globalAlpha = state.fadeIn;

      ctx.clearRect(0, 0, w, h);

      // ── Shooting stars ──
      if (now - state.lastShootingTime > (3000 + Math.random() * 5000)) {
        state.shootingStars.push(spawnShootingStar(w, h));
        if (Math.random() < 0.2) {
          setTimeout(() => {
            state.shootingStars.push(spawnShootingStar(w, h));
          }, 200 + Math.random() * 600);
        }
        state.lastShootingTime = now;
      }

      for (let i = state.shootingStars.length - 1; i >= 0; i--) {
        const ss = state.shootingStars[i];
        ss.life++;
        ss.x += Math.cos(ss.angle) * ss.speed;
        ss.y += Math.sin(ss.angle) * ss.speed;

        const lifeRatio = ss.life / ss.maxLife;
        let alpha: number;
        if (lifeRatio < 0.2) alpha = lifeRatio / 0.2;
        else if (lifeRatio > 0.7) alpha = (1 - lifeRatio) / 0.3;
        else alpha = 1;
        alpha *= ss.alpha * globalAlpha;

        // Trail
        const tailX = ss.x - Math.cos(ss.angle) * ss.len * Math.min(lifeRatio * 3, 1);
        const tailY = ss.y - Math.sin(ss.angle) * ss.len * Math.min(lifeRatio * 3, 1);

        const gradient = ctx.createLinearGradient(tailX, tailY, ss.x, ss.y);
        gradient.addColorStop(0, ss.color + '0)');
        gradient.addColorStop(0.6, ss.color + (alpha * 0.4).toFixed(3) + ')');
        gradient.addColorStop(1, ss.color + alpha.toFixed(3) + ')');

        ctx.strokeStyle = gradient;
        ctx.lineWidth = ss.thickness;
        ctx.lineCap = 'round';
        ctx.beginPath();
        ctx.moveTo(tailX, tailY);
        ctx.lineTo(ss.x, ss.y);
        ctx.stroke();

        // Bright head
        const headGlow = ctx.createRadialGradient(ss.x, ss.y, 0, ss.x, ss.y, 3);
        headGlow.addColorStop(0, ss.color + (alpha * 0.9).toFixed(3) + ')');
        headGlow.addColorStop(1, ss.color + '0)');
        ctx.fillStyle = headGlow;
        ctx.beginPath();
        ctx.arc(ss.x, ss.y, 3, 0, Math.PI * 2);
        ctx.fill();

        if (ss.life >= ss.maxLife || ss.x < -200 || ss.x > w + 200 || ss.y > h + 200) {
          state.shootingStars.splice(i, 1);
        }
      }

      raf = requestAnimationFrame(draw);
    };

    raf = requestAnimationFrame(draw);

    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
    };
  }, [active]);

  return (
    <canvas
      ref={canvasRef}
      className="space-background-canvas"
      style={{ opacity: active ? 1 : 0 }}
    />
  );
});
