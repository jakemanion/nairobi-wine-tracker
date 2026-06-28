import { WineCard, WineData } from './components/WineCard';
import { Wine, Filter } from 'lucide-react';

const wines: WineData[] = [
  {
    id: '1',
    producer: 'Château Margaux',
    name: 'Grand Vin 2015',
    country: 'France',
    region: 'Bordeaux, Margaux',
    colour: 'Red',
    grapes: ['Cabernet Sauvignon', 'Merlot', 'Petit Verdot'],
    vivinoRating: 4.6,
    prices: [
      { shop: 'Wine.com', price: 849.99 },
      { shop: 'Total Wine', price: 879.95 },
      { shop: 'K&L Wines', price: 825.00 },
    ],
    image: 'https://images.unsplash.com/photo-1602574923828-853dbbc27277?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxib3JkZWF1eCUyMHdpbmUlMjBGcmFuY2V8ZW58MXx8fHwxNzgyMzI5MjQ5fDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '2',
    producer: 'Domaine Leflaive',
    name: 'Puligny-Montrachet Premier Cru',
    country: 'France',
    region: 'Burgundy, Côte de Beaune',
    colour: 'White',
    grapes: ['Chardonnay'],
    vivinoRating: 4.4,
    prices: [
      { shop: 'Wine.com', price: 185.00 },
      { shop: 'Benchmark Wine', price: 195.99 },
      { shop: 'The Wine House', price: 179.95 },
    ],
    image: 'https://images.unsplash.com/photo-1634832296440-b5bac2df86c3?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aGl0ZSUyMHdpbmUlMjBnbGFzcyUyMGVsZWdhbnR8ZW58MXx8fHwxNzgyMzI5MjQ4fDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '3',
    producer: 'Whispering Angel',
    name: 'Côtes de Provence Rosé',
    country: 'France',
    region: 'Provence',
    colour: 'Rosé',
    grapes: ['Grenache', 'Cinsault', 'Rolle'],
    vivinoRating: 3.9,
    prices: [
      { shop: 'Wine.com', price: 24.99 },
      { shop: 'Total Wine', price: 22.95 },
      { shop: 'BevMo!', price: 25.99 },
    ],
    image: 'https://images.unsplash.com/photo-1660814807174-85a4ce3af9ea?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyb3NlJTIwd2luZSUyMHN1bW1lcnxlbnwxfHx8fDE3ODIzMjkyNDh8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '4',
    producer: 'Moët & Chandon',
    name: 'Impérial Brut',
    country: 'France',
    region: 'Champagne',
    colour: 'Sparkling',
    grapes: ['Pinot Noir', 'Chardonnay', 'Pinot Meunier'],
    vivinoRating: 3.7,
    prices: [
      { shop: 'Wine.com', price: 54.99 },
      { shop: 'Total Wine', price: 49.99 },
      { shop: 'Costco', price: 44.95 },
    ],
    image: 'https://images.unsplash.com/photo-1576481564650-61d2ed81f6d5?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxzcGFya2xpbmclMjB3aW5lJTIwY2VsZWJyYXRpb258ZW58MXx8fHwxNzgyMzI5MjQ5fDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '5',
    producer: 'Penfolds',
    name: 'Grange Shiraz 2016',
    country: 'Australia',
    region: 'South Australia, Barossa Valley',
    colour: 'Red',
    grapes: ['Shiraz', 'Cabernet Sauvignon'],
    vivinoRating: 4.5,
    prices: [
      { shop: 'Wine.com', price: 725.00 },
      { shop: 'The Wine House', price: 749.99 },
      { shop: 'Wine Searcher', price: 695.00 },
    ],
    image: 'https://images.unsplash.com/photo-1592119748016-a61c40a44320?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHxyZWQlMjB3aW5lJTIwYm90dGxlJTIwdmluZXlhcmR8ZW58MXx8fHwxNzgyMzI5MjQ3fDA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '6',
    producer: 'Opus One',
    name: 'Napa Valley Red Blend 2018',
    country: 'USA',
    region: 'California, Napa Valley',
    colour: 'Red',
    grapes: ['Cabernet Sauvignon', 'Blend'],
    vivinoRating: 4.3,
    prices: [
      { shop: 'Wine.com', price: 389.99 },
      { shop: 'Total Wine', price: 399.95 },
      { shop: 'K&L Wines', price: 375.00 },
    ],
    image: 'https://images.unsplash.com/photo-1562601579-599dec564e06?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&ixid=M3w3Nzg4Nzd8MHwxfHNlYXJjaHwxfHx3aW5lJTIwY2VsbGFyJTIwYm90dGxlc3xlbnwxfHx8fDE3ODIzMjkyNDl8MA&ixlib=rb-4.1.0&q=80&w=400',
  },
  {
    id: '7',
    producer: 'Clos de los Siete',
    name: 'Malbec 2020',
    country: 'Argentina',
    region: 'Mendoza, Valle de Uco',
    colour: 'Red',
    grapes: ['Malbec'],
    vivinoRating: 4.1,
    prices: [
      { shop: 'Wine.com', price: 19.99 },
      { shop: 'Total Wine', price: 17.95 },
    ],
    image: 'https://images.unsplash.com/photo-1602574923828-853dbbc27277?crop=entropy&cs=tinysrgb&fit=max&fm=jpg&q=80&w=400',
  },
];

const colourCounts = {
  Red: wines.filter((w) => w.colour === 'Red').length,
  White: wines.filter((w) => w.colour === 'White').length,
  Rosé: wines.filter((w) => w.colour === 'Rosé').length,
  Sparkling: wines.filter((w) => w.colour === 'Sparkling').length,
};

export default function App() {
  return (
    <div className="min-h-screen" style={{ background: '#14141A', fontFamily: "'DM Sans', sans-serif" }}>
      {/* Header */}
      <header className="sticky top-0 z-50" style={{ background: '#0E0E12', borderBottom: '1px solid #2A2A34', boxShadow: '0 2px 16px rgba(0,0,0,0.6)' }}>
        <div className="max-w-5xl mx-auto px-6 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: '#8F1A2B' }}>
              <Wine className="w-4 h-4 text-white" />
            </div>
            <div>
              <h1 className="text-sm font-semibold leading-none" style={{ color: '#EDE8E0', fontFamily: "'Playfair Display', serif" }}>
                Wine Collection
              </h1>
              <p className="text-[10px] mt-0.5" style={{ color: '#545060' }}>Personal cellar database</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden sm:flex items-center gap-4 text-[11px]" style={{ fontFamily: "'DM Sans', sans-serif" }}>
              <span style={{ color: '#C93048' }}>{colourCounts.Red} Red</span>
              <span style={{ color: '#C4A040' }}>{colourCounts.White} White</span>
              <span style={{ color: '#C07060' }}>{colourCounts.Rosé} Rosé</span>
              <span style={{ color: '#4A88B0' }}>{colourCounts.Sparkling} Sparkling</span>
            </div>
            <button className="flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all"
              style={{ background: '#1E1E26', border: '1px solid #3A3848', color: '#8A8898', fontFamily: "'DM Sans', sans-serif" }}>
              <Filter className="w-3.5 h-3.5" />
              Filter
            </button>
          </div>
        </div>
      </header>

      {/* Wine list */}
      <main className="max-w-5xl mx-auto px-6 py-5 space-y-2.5">
        {wines.map((wine) => (
          <WineCard key={wine.id} wine={wine} />
        ))}
      </main>

      <footer className="max-w-5xl mx-auto px-6 py-5 text-center text-[11px]" style={{ color: '#3A3848', fontFamily: "'DM Sans', sans-serif" }}>
        {wines.length} wines · {Object.values(colourCounts).filter(Boolean).length} types
      </footer>
    </div>
  );
}
