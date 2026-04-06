import { useState, useEffect, useRef, useCallback, type ReactNode } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

/* ─── Color Schemes ─── */

export interface MuseumColorScheme {
  border: string;
  glow: string;
  bg: string;
  shine: [string, string]; // [bright, mid] — interpolated with position
  dot: string;
  dotGlow: string;
  headerText: string;
  itemText: string;
  itemMuted: string;
  separator: string;
  badge: { bg: string; border: string; text: string };
  shadow: string;
  fadeBg: string;
}

export const PURPLE_SCHEME: MuseumColorScheme = {
  border: 'linear-gradient(170deg, rgba(130,100,220,0.2) 0%, rgba(80,120,200,0.1) 40%, rgba(60,50,120,0.05) 100%)',
  glow: 'radial-gradient(ellipse at 50% 30%, rgba(120,80,200,0.07) 0%, transparent 70%)',
  bg: 'linear-gradient(170deg, rgba(14,12,28,0.95) 0%, rgba(18,14,36,0.93) 50%, rgba(30,22,52,0.9) 100%)',
  shine: ['rgba(160,140,255,0.12)', 'rgba(120,100,220,0.04)'],
  dot: '#34d399',
  dotGlow: 'rgba(52,211,153,0.4)',
  headerText: 'rgba(170,155,210,0.45)',
  itemText: 'rgba(240,235,255,0.9)',
  itemMuted: 'rgba(190,180,220,0.4)',
  separator: 'rgba(160,140,220,0.06)',
  badge: { bg: 'linear-gradient(135deg, rgba(120,100,200,0.08) 0%, rgba(80,60,160,0.04) 100%)', border: 'rgba(140,120,200,0.08)', text: 'rgba(160,140,220,0.4)' },
  shadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 80px rgba(100,70,180,0.05), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
  fadeBg: 'rgba(14,12,28,0.97)',
};

export const EARTHY_SCHEME: MuseumColorScheme = {
  border: 'linear-gradient(170deg, rgba(180,140,80,0.2) 0%, rgba(160,120,60,0.1) 40%, rgba(100,80,40,0.05) 100%)',
  glow: 'radial-gradient(ellipse at 50% 30%, rgba(180,140,60,0.07) 0%, transparent 70%)',
  bg: 'linear-gradient(170deg, rgba(18,16,12,0.95) 0%, rgba(22,18,12,0.93) 50%, rgba(36,28,16,0.9) 100%)',
  shine: ['rgba(200,170,100,0.12)', 'rgba(180,140,80,0.04)'],
  dot: '#d4a853',
  dotGlow: 'rgba(212,168,83,0.4)',
  headerText: 'rgba(190,170,130,0.5)',
  itemText: 'rgba(240,230,210,0.9)',
  itemMuted: 'rgba(190,170,130,0.4)',
  separator: 'rgba(180,140,80,0.06)',
  badge: { bg: 'linear-gradient(135deg, rgba(160,120,60,0.08) 0%, rgba(120,90,40,0.04) 100%)', border: 'rgba(180,140,80,0.08)', text: 'rgba(180,140,80,0.4)' },
  shadow: '0 20px 60px rgba(0,0,0,0.55), 0 0 80px rgba(160,120,60,0.05), 0 0 0 0.5px rgba(255,255,255,0.03) inset',
  fadeBg: 'rgba(18,16,12,0.97)',
};

/* ─── Expanded card color variants ─── */

const PURPLE_EXPANDED = {
  border: 'linear-gradient(170deg, rgba(130,100,220,0.25) 0%, rgba(80,120,200,0.1) 40%, rgba(60,50,120,0.05) 100%)',
  shine: ['rgba(160,140,255,0.1)', 'rgba(120,100,220,0.03)'],
  bg: 'linear-gradient(170deg, rgba(14,12,28,0.97) 0%, rgba(20,16,40,0.95) 50%, rgba(32,24,56,0.93) 100%)',
  shadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 100px rgba(100,70,180,0.06)',
  sourceText: 'rgba(170,155,210,0.45)',
  dateText: 'rgba(160,145,210,0.35)',
  titleText: 'rgba(240,235,255,0.92)',
  descText: 'rgba(190,180,220,0.5)',
  separatorGrad: 'linear-gradient(90deg, transparent, rgba(140,120,200,0.2), transparent)',
  iconColor: 'rgba(140,120,200,0.25)',
  heroBg: 'rgba(20,16,40,0.8)',
  fadeBg: 'rgba(14,12,28,0.97)',
};

const EARTHY_EXPANDED = {
  border: 'linear-gradient(170deg, rgba(180,140,80,0.25) 0%, rgba(160,120,60,0.1) 40%, rgba(100,80,40,0.05) 100%)',
  shine: ['rgba(200,170,100,0.1)', 'rgba(180,140,80,0.03)'],
  bg: 'linear-gradient(170deg, rgba(18,16,12,0.97) 0%, rgba(24,20,14,0.95) 50%, rgba(40,32,18,0.93) 100%)',
  shadow: '0 24px 70px rgba(0,0,0,0.6), 0 0 100px rgba(160,120,60,0.06)',
  sourceText: 'rgba(190,170,130,0.45)',
  dateText: 'rgba(190,170,130,0.35)',
  titleText: 'rgba(240,230,210,0.92)',
  descText: 'rgba(190,170,130,0.5)',
  separatorGrad: 'linear-gradient(90deg, transparent, rgba(180,140,80,0.2), transparent)',
  iconColor: 'rgba(180,140,80,0.25)',
  heroBg: 'rgba(18,16,12,0.8)',
  fadeBg: 'rgba(18,16,12,0.97)',
};

const EXPANDED_SCHEMES = { purple: PURPLE_EXPANDED, earthy: EARTHY_EXPANDED };

/* ─── Tilt State ─── */

interface TiltState { rx: number; ry: number; shineX: number; shineY: number }
const TILT_ZERO: TiltState = { rx: 0, ry: 0, shineX: 50, shineY: 50 };

function useProximityTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>(TILT_ZERO);
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      const el = ref.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      const dist = Math.sqrt((e.clientX - cx) ** 2 + (e.clientY - cy) ** 2);
      const factor = Math.max(0, 1 - dist / 400);
      const dx = Math.max(-1, Math.min(1, (e.clientX - cx) / (rect.width / 2)));
      const dy = Math.max(-1, Math.min(1, (e.clientY - cy) / (rect.height / 2)));
      setTilt({
        rx: -dy * 10 * factor,
        ry: dx * 10 * factor,
        shineX: ((e.clientX - rect.left) / rect.width) * 100,
        shineY: ((e.clientY - rect.top) / rect.height) * 100,
      });
    };
    window.addEventListener('mousemove', onMove);
    return () => window.removeEventListener('mousemove', onMove);
  }, []);
  return { ref, tilt };
}

function useDirectTilt() {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState<TiltState>(TILT_ZERO);
  const onMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const dx = (e.clientX - (rect.left + rect.width / 2)) / (rect.width / 2);
    const dy = (e.clientY - (rect.top + rect.height / 2)) / (rect.height / 2);
    setTilt({ rx: -dy * 8, ry: dx * 8, shineX: ((e.clientX - rect.left) / rect.width) * 100, shineY: ((e.clientY - rect.top) / rect.height) * 100 });
  }, []);
  const onMouseLeave = useCallback(() => setTilt(TILT_ZERO), []);
  const reset = useCallback(() => setTilt(TILT_ZERO), []);
  return { ref, tilt, onMouseMove, onMouseLeave, reset };
}

/* ─── Legend Item ─── */

export interface LegendItem {
  key: string;
  label: string;
  note: string;
  source: string;
  date?: string;
  icon?: ReactNode;
  /** If icon is provided, indent note/badge by this amount */
  iconIndent?: number;
}

/* ─── MuseumLegend ─── */

interface MuseumLegendProps {
  colorScheme: MuseumColorScheme;
  motionKey: string;
  headerLabel: string;
  items: LegendItem[];
  onItemClick: (key: string) => void;
  controls?: ReactNode;
  loading?: ReactNode;
  scrollClassName: string;
}

export function MuseumLegend({ colorScheme: c, motionKey, headerLabel, items, onItemClick, controls, loading, scrollClassName }: MuseumLegendProps) {
  const { ref, tilt } = useProximityTilt();
  if (items.length === 0) return null;
  return (
    <motion.div
      ref={ref}
      key={motionKey}
      initial={{ opacity: 0, scale: 0.88, y: 24 }}
      animate={{ opacity: 1, scale: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.88, y: 24 }}
      transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      style={{
        position: 'fixed', bottom: 28, right: 20, zIndex: 50, pointerEvents: 'none',
        transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: 'transform 0.2s cubic-bezier(0.23, 1, 0.32, 1)',
        transformStyle: 'preserve-3d', willChange: 'transform',
      }}
    >
      <div style={{ position: 'relative', borderRadius: 24, padding: 1, background: c.border }}>
        {/* Ambient glow */}
        <div style={{ position: 'absolute', inset: -6, borderRadius: 30, background: c.glow, filter: 'blur(12px)', pointerEvents: 'none' }} />
        {/* Main card */}
        <div style={{
          position: 'relative', background: c.bg, backdropFilter: 'blur(40px) saturate(1.3)',
          borderRadius: 23, padding: '20px 24px 18px', minWidth: 250, maxWidth: 310,
          boxShadow: c.shadow, overflow: 'hidden', textAlign: 'center',
        }}>
          {/* Shine */}
          <div style={{
            position: 'absolute', inset: 0, borderRadius: 'inherit',
            background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, ${c.shine[0]} 0%, ${c.shine[1]} 40%, transparent 65%)`,
            pointerEvents: 'none', transition: 'background 0.15s ease-out',
          }} />
          {/* Header */}
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8, marginBottom: 16, paddingBottom: 12, borderBottom: `1px solid ${c.separator}` }}>
            <div style={{ position: 'relative', width: 5, height: 5 }}>
              <div style={{ position: 'absolute', inset: -3, borderRadius: '50%', background: c.dot.replace(')', ',0.12)').replace('rgb', 'rgba').replace('##', '#'), animation: 'pulse 3s ease-in-out infinite' }} />
              <div style={{ width: 5, height: 5, borderRadius: '50%', background: c.dot, boxShadow: `0 0 8px ${c.dotGlow}` }} />
            </div>
            <span style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.24em', textTransform: 'uppercase', color: c.headerText }}>{headerLabel}</span>
          </div>
          {/* Loading */}
          {loading}
          {/* Controls */}
          {controls}
          {/* Items */}
          <div className={scrollClassName} style={{ maxHeight: 260, overflowY: 'auto', overflowX: 'hidden', marginRight: -8, paddingRight: 8 }}>
            {items.map((item, i) => (
              <div
                key={item.key}
                onClick={() => onItemClick(item.key)}
                style={{
                  position: 'relative',
                  marginBottom: i < items.length - 1 ? 14 : 0,
                  paddingBottom: i < items.length - 1 ? 14 : 0,
                  borderBottom: i < items.length - 1 ? `1px solid ${c.separator.replace('0.06', '0.04')}` : 'none',
                  cursor: 'pointer', pointerEvents: 'auto', transition: 'opacity 0.15s',
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '0.75'; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.opacity = '1'; }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: item.icon ? 10 : 0, marginBottom: 4 }}>
                  {item.icon}
                  <div style={{ fontSize: 12, fontWeight: 200, color: c.itemText, letterSpacing: '0.06em' }}>{item.label}</div>
                </div>
                <div style={{ fontSize: 10, fontWeight: 200, color: c.itemMuted, lineHeight: 1.55, letterSpacing: '0.015em', marginBottom: 6, paddingLeft: item.iconIndent || 0 }}>{item.note}</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, paddingLeft: item.iconIndent || 0 }}>
                  <span style={{ display: 'inline-block', fontSize: 7, fontWeight: 400, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.badge.text, background: c.badge.bg, padding: '3px 10px', borderRadius: 20, border: `1px solid ${c.badge.border}` }}>{item.source}</span>
                  {item.date && <span style={{ fontSize: 7, fontWeight: 300, letterSpacing: '0.08em', color: c.itemMuted.replace('0.4', '0.3') }}>{item.date}</span>}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ─── MuseumExpandedCard ─── */

interface HeroImage { type: 'image'; url?: string; shimmer?: boolean }
interface HeroSvg { type: 'svg'; svgDataUri: string }
type HeroContent = HeroImage | HeroSvg;

interface MuseumExpandedCardProps {
  variant: 'purple' | 'earthy';
  motionKey: string;
  heroContent?: HeroContent;
  sourceLabel: string;
  date?: string;
  title: string;
  description: string;
  footerIcon: ReactNode;
  onClose: () => void;
  children?: ReactNode;
}

export function MuseumExpandedCard({ variant, motionKey, heroContent, sourceLabel, date, title, description, footerIcon, onClose, children }: MuseumExpandedCardProps) {
  const { ref, tilt, onMouseMove, onMouseLeave } = useDirectTilt();
  const e = EXPANDED_SCHEMES[variant];

  const heroStyle: React.CSSProperties = {
    width: '100%', height: 180, position: 'relative', overflow: 'hidden',
    backgroundSize: 'cover', backgroundPosition: 'center', backgroundColor: e.heroBg,
  };
  if (heroContent?.type === 'image' && heroContent.url) {
    heroStyle.backgroundImage = `url("${heroContent.url}")`;
  } else if (heroContent?.type === 'svg') {
    heroStyle.backgroundImage = `url("${heroContent.svgDataUri}")`;
  }

  return (
    <>
      <motion.div
        key={`${motionKey}-overlay`}
        initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
        transition={{ duration: 0.25 }}
        onClick={onClose}
        style={{ position: 'fixed', inset: 0, zIndex: 55, background: 'rgba(0,0,0,0.35)', backdropFilter: 'blur(6px)' }}
      />
      <div
        ref={ref} onMouseMove={onMouseMove} onMouseLeave={onMouseLeave}
        style={{
          position: 'fixed', bottom: 40, right: 24, zIndex: 60, width: 340,
          transform: `perspective(800px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
          transition: 'transform 0.18s cubic-bezier(0.23, 1, 0.32, 1)',
          transformStyle: 'preserve-3d', willChange: 'transform',
        }}
      >
        <motion.div
          key={motionKey}
          initial={{ opacity: 0, scale: 0.85, y: 40 }} animate={{ opacity: 1, scale: 1, y: 0 }} exit={{ opacity: 0, scale: 0.85, y: 40 }}
          transition={{ type: 'spring', stiffness: 300, damping: 28 }}
        >
          <div style={{ borderRadius: 24, padding: 1, background: e.border, position: 'relative' }}>
            {/* Shine */}
            <div style={{
              position: 'absolute', inset: 0, borderRadius: 'inherit',
              background: `radial-gradient(circle at ${tilt.shineX}% ${tilt.shineY}%, ${e.shine[0]} 0%, ${e.shine[1]} 40%, transparent 65%)`,
              pointerEvents: 'none', transition: 'background 0.15s ease-out', zIndex: 1,
            }} />
            {/* Main card */}
            <div style={{ borderRadius: 23, background: e.bg, backdropFilter: 'blur(40px) saturate(1.3)', overflow: 'hidden', boxShadow: e.shadow, maxHeight: 'calc(100vh - 100px)', overflowY: 'auto' }}>
              {/* Hero */}
              <div style={heroContent ? heroStyle : { ...heroStyle, height: 60 }}>
                {heroContent?.type === 'image' && heroContent.shimmer && (
                  <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(110deg, rgba(20,16,40,0) 30%, rgba(80,60,140,0.08) 50%, rgba(20,16,40,0) 70%)', backgroundSize: '200% 100%', animation: 'satShimmer 1.5s ease-in-out infinite' }} />
                )}
                <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: 70, background: `linear-gradient(to top, ${e.fadeBg}, transparent)` }} />
                <button onClick={onClose} style={{ position: 'absolute', top: 12, right: 12, width: 28, height: 28, borderRadius: '50%', background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(8px)', border: '1px solid rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, lineHeight: 1, padding: 0 }}>{'\u2715'}</button>
              </div>
              {/* Content */}
              <div style={{ padding: '14px 26px 22px', textAlign: 'center' }}>
                <div style={{ fontSize: 8, fontWeight: 400, letterSpacing: '0.22em', textTransform: 'uppercase', color: e.sourceText, marginBottom: date ? 4 : 12 }}>{sourceLabel}</div>
                {date && <div style={{ fontSize: 9, fontWeight: 300, letterSpacing: '0.06em', color: e.dateText, marginBottom: 12 }}>Last observation — {date}</div>}
                <div style={{ fontSize: 22, fontWeight: 200, color: e.titleText, letterSpacing: '0.02em', lineHeight: 1.2, marginBottom: 14 }}>{title}</div>
                <div style={{ fontSize: 12, fontWeight: 300, color: e.descText, lineHeight: 1.75, letterSpacing: '0.01em', marginBottom: children ? 14 : 18 }}>{description}</div>
                {children && <div style={{ textAlign: 'left', marginBottom: 14 }}>{children}</div>}
                <div style={{ width: 28, height: 1, background: e.separatorGrad, margin: '0 auto 12px' }} />
                <div style={{ color: e.iconColor }}>{footerIcon}</div>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  );
}
