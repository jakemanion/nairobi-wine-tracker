import { useState } from 'react';
import { MapPin, Star, X, Bookmark, BookmarkCheck, Crown } from 'lucide-react';
import { ImageWithFallback } from './figma/ImageWithFallback';

export interface WineData {
  id: string;
  producer: string;
  name: string;
  country: string;
  region: string;
  colour: 'Red' | 'White' | 'Rosé' | 'Sparkling';
  grapes: string[];
  vivinoRating: number;
  prices: { shop: string; price: number }[];
  image: string;
}

interface UserReview {
  wishlist: 0 | 1 | 2 | 3 | 4;
  rating: number;
  notes: string;
}

const colourRibbonBg: Record<string, string> = {
  Red:      '#8F1A2B',
  White:    '#7A5A18',
  Rosé:     '#8A3828',
  Sparkling:'#1E4A6A',
};

const colourLabel: Record<string, string> = {
  Red:      'RED',
  White:    'WHITE',
  Rosé:     'ROSÉ',
  Sparkling:'SPAR',
};

// Wishlist cycle: not set → wishlist → expensive → very expensive → ignore → not set
const WISHLIST_CYCLE: Array<0 | 1 | 2 | 3 | 4> = [0, 2, 3, 4, 1];

// Panel background per wishlist state
function getPanelStyle(wishlist: number): React.CSSProperties {
  if (wishlist === 2) return { background: '#142010', borderLeft: '1px solid #2A4828' };
  if (wishlist === 3) return { background: 'linear-gradient(160deg, #28292E 0%, #3E4048 40%, #2C2D34 70%, #28292E 100%)', borderLeft: '1px solid #56585E' };
  if (wishlist === 4) return { background: 'linear-gradient(160deg, #1E1A0A 0%, #4A3C10 40%, #382E0C 70%, #1E1A0A 100%)', borderLeft: '1px solid #6A5C20' };
  return { background: '#1C1C24', borderLeft: '1px solid #2E2E3A' };
}

function WishlistButton({ state, onChange }: { state: UserReview['wishlist']; onChange: (v: UserReview['wishlist']) => void }) {
  const next = WISHLIST_CYCLE[(WISHLIST_CYCLE.indexOf(state) + 1) % WISHLIST_CYCLE.length];

  const configs = {
    0: { icon: <Star className="w-5 h-5" />,                         label: 'Not set',    border: '#3A3848', bg: '#22222C', color: '#54505E' },
    1: { icon: <X className="w-5 h-5" />,                            label: 'Ignore',     border: '#5A3030', bg: '#2A1C1C', color: '#A05050' },
    2: { icon: <Bookmark className="w-5 h-5 fill-current" />,        label: 'Wishlist',   border: '#2A5030', bg: '#162010', color: '#50A060' },
    3: { icon: <BookmarkCheck className="w-5 h-5 fill-current" />,   label: '$ Treat',    border: '#585A60', bg: '#2E3038', color: '#A0A8B8' },
    4: { icon: <Crown className="w-5 h-5 fill-current" />,           label: '$$ Treat',   border: '#7A6820', bg: '#2A2208', color: '#C8A830' },
  } as const;

  const cfg = configs[state];
  return (
    <button
      onClick={() => onChange(next)}
      title={cfg.label}
      className="w-10 h-10 rounded-full flex items-center justify-center transition-all hover:scale-105 flex-shrink-0"
      style={{ border: `2px solid ${cfg.border}`, background: cfg.bg, color: cfg.color, boxShadow: '0 2px 8px rgba(0,0,0,0.4)' }}
    >
      {cfg.icon}
    </button>
  );
}

function VivinoCircle({ rating }: { rating: number }) {
  return (
    <div className="w-10 h-10 rounded-full flex-shrink-0 flex flex-col items-center justify-center"
      style={{ background: 'linear-gradient(135deg, #3A2808, #6A4A14)', border: '2px solid #7A5A18', boxShadow: '0 2px 8px rgba(0,0,0,0.5)' }}>
      <span className="text-[12px] font-bold leading-none tabular-nums" style={{ color: '#D4A840', fontFamily: "'DM Sans', sans-serif" }}>
        {rating.toFixed(1)}
      </span>
      <span className="text-[7px] leading-none" style={{ color: '#907040' }}>vivino</span>
    </div>
  );
}

function RatingSlider({ value, onChange }: { value: number; onChange: (v: number) => void }) {
  return (
    <div className="flex items-center gap-2">
      <input
        type="range" min={0} max={5} step={0.1} value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="flex-1 h-1 cursor-pointer"
        style={{ accentColor: '#C93048' }}
      />
      <span className="text-xs font-bold w-7 text-right tabular-nums" style={{ color: '#C0BCB4', fontFamily: "'DM Sans', sans-serif" }}>
        {value.toFixed(1)}
      </span>
    </div>
  );
}

export function WineCard({ wine }: { wine: WineData }) {
  const [review, setReview] = useState<UserReview>({ wishlist: 0, rating: 0, notes: '' });
  const patch = (p: Partial<UserReview>) => setReview((r) => ({ ...r, ...p }));
  const lowestPrice = Math.min(...wine.prices.map((p) => p.price));
  const isIgnored = review.wishlist === 1;

  return (
    <div
      className="relative flex overflow-hidden transition-opacity duration-300"
      style={{
        background: '#222228',
        border: '1px solid #343440',
        borderRadius: '0 12px 12px 12px',
        boxShadow: isIgnored ? 'none' : '0 6px 24px rgba(0,0,0,0.55), 0 1px 4px rgba(0,0,0,0.4)',
        opacity: isIgnored ? 0.4 : 1,
      }}
    >
      {/* Corner tab — square top-left, bigger */}
      <div className="absolute top-0 left-0 overflow-hidden z-10 pointer-events-none" style={{ width: 56, height: 56 }}>
        <div
          style={{
            position: 'absolute',
            top: -4,
            left: -16,
            width: 88,
            padding: '5px 0',
            transform: 'rotate(-45deg)',
            transformOrigin: 'center',
            background: colourRibbonBg[wine.colour],
            textAlign: 'center',
            boxShadow: '0 2px 6px rgba(0,0,0,0.6)',
          }}
        >
          <span style={{ color: '#fff', fontSize: 7, fontWeight: 700, letterSpacing: '0.12em', fontFamily: "'DM Sans', sans-serif" }}>
            {colourLabel[wine.colour]}
          </span>
        </div>
      </div>

      {/* Bottle image */}
      <div className="w-[68px] flex-shrink-0 flex items-center justify-center py-2 px-1.5"
        style={{ background: '#1A1A20' }}>
        <ImageWithFallback
          src={wine.image}
          alt={wine.name}
          className="h-28 w-full object-contain"
        />
      </div>

      {/* Main info */}
      <div className="flex-1 min-w-0 px-3.5 py-2.5 flex flex-col justify-between gap-1.5"
        style={{ borderRight: '1px solid #2E2E3A' }}>
        {/* Name row */}
        <div className="flex items-start gap-2">
          <div className="flex-1 min-w-0 pt-0.5">
            <p className="text-[9px] font-semibold uppercase tracking-[0.14em] leading-none mb-0.5"
              style={{ color: '#C93048', fontFamily: "'DM Sans', sans-serif" }}>
              {wine.producer}
            </p>
            <h3 className="text-sm font-semibold leading-snug" style={{ color: '#EDE8E0', fontFamily: "'Playfair Display', serif" }}>
              {wine.name}
            </h3>
          </div>
          <VivinoCircle rating={wine.vivinoRating} />
        </div>

        {/* Region */}
        <div className="flex items-center gap-1">
          <MapPin className="w-3 h-3 flex-shrink-0" style={{ color: '#5A5868' }} />
          <span className="text-[11px] truncate" style={{ color: '#7A7888', fontFamily: "'DM Sans', sans-serif" }}>
            {wine.region} · {wine.country}
          </span>
        </div>

        {/* Grapes */}
        <div className="flex flex-wrap gap-1">
          {wine.grapes.map((g) => (
            <span key={g} className="text-[10px] px-1.5 py-0.5 rounded"
              style={{ background: '#2A2A34', border: '1px solid #3A3A48', color: '#9A98A8', fontFamily: "'DM Sans', sans-serif" }}>
              {g}
            </span>
          ))}
        </div>

        {/* Prices */}
        <div className="flex flex-wrap gap-x-3 gap-y-0.5">
          {wine.prices.map((p, i) => (
            <span key={i} className="text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif", color: p.price === lowestPrice ? '#C93048' : '#606070', fontWeight: p.price === lowestPrice ? 700 : 400 }}>
              <span style={{ color: '#484858' }}>{p.shop}: </span>
              ${p.price.toFixed(2)}
            </span>
          ))}
        </div>
      </div>

      {/* User review panel — 45% */}
      <div className="flex-shrink-0 px-3.5 py-2.5 flex flex-col gap-2"
        style={{ width: '44%', ...getPanelStyle(review.wishlist) }}>
        {/* Wishlist + rating row */}
        <div className="flex items-center gap-2">
          <WishlistButton state={review.wishlist} onChange={(v) => patch({ wishlist: v })} />
          <div className="flex-1 min-w-0">
            <p className="text-[9px] uppercase tracking-wider mb-1" style={{ color: '#5A5868', fontFamily: "'DM Sans', sans-serif" }}>
              My Rating
            </p>
            <RatingSlider value={review.rating} onChange={(v) => patch({ rating: v })} />
          </div>
        </div>

        {/* Notes */}
        <textarea
          value={review.notes}
          onChange={(e) => patch({ notes: e.target.value })}
          placeholder="Tasting notes, pairings…"
          rows={2}
          className="w-full text-[11px] resize-none focus:outline-none transition-colors leading-relaxed rounded-lg px-2.5 py-1.5"
          style={{
            background: 'rgba(0,0,0,0.25)',
            border: '1px solid #3A3848',
            color: '#C0BCB4',
            fontFamily: "'DM Sans', sans-serif",
            caretColor: '#C93048',
          }}
        />
      </div>
    </div>
  );
}
