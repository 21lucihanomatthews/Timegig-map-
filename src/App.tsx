import { useState, useEffect, useCallback } from 'react';
import { MapContainer, TileLayer, Marker, Popup, useMap, useMapEvents, Circle } from 'react-leaflet';
import L from 'leaflet';
import { 
  MapPin, 
  Navigation, 
  Search, 
  Crosshair, 
  Home, 
  Users, 
  Zap, 
  Target, 
  User,
  Plus,
  Minus,
  Globe,
  Settings,
  Volume2,
  VolumeX
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

// Fix for default marker icons in Leaflet with React/Vite
import markerIcon2x from 'leaflet/dist/images/marker-icon-2x.png';
import markerIcon from 'leaflet/dist/images/marker-icon.png';
import markerShadow from 'leaflet/dist/images/marker-shadow.png';

delete (L.Icon.Default.prototype as any)._getIconUrl;
L.Icon.Default.mergeOptions({
  iconUrl: markerIcon,
  iconRetinaUrl: markerIcon2x,
  shadowUrl: markerShadow,
});

// Custom Blue Dot Icon for Device Location
const deviceLocationIcon = L.divIcon({
  className: 'custom-div-icon',
  html: `<div class="relative flex items-center justify-center">
          <div class="absolute w-6 h-6 bg-blue-500 rounded-full animate-ping opacity-25"></div>
          <div class="relative w-4 h-4 bg-blue-600 border-2 border-white rounded-full shadow-lg"></div>
        </div>`,
  iconSize: [24, 24],
  iconAnchor: [12, 12],
});

// Component to handle map centering and view updates
function MapController({ center, zoom }: { center: [number, number], zoom: number }) {
  const map = useMap();
  useEffect(() => {
    map.setView(center, zoom, { animate: true });
  }, [center, zoom, map]);
  return null;
}

// Component to handle clicks and other map events
function MapEvents({ onLocationFound }: { onLocationFound: (lat: number, lng: number) => void }) {
  useMapEvents({
    locationfound(e) {
      onLocationFound(e.latlng.lat, e.latlng.lng);
    },
  });
  return null;
}

export default function App() {
  const [userLocation, setUserLocation] = useState<[number, number] | null>(null);
  const [accuracy, setAccuracy] = useState<number | null>(null);
  const [mapCenter, setMapCenter] = useState<[number, number]>([20, 0]);
  const [zoom, setZoom] = useState(3);
  const [isLocating, setIsLocating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [mapType, setMapType] = useState<'standard' | 'satellite'>('standard');
  const [activeTab, setActiveTab] = useState('gigs');
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [showSettings, setShowSettings] = useState(false);
  
  // Search state
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  useEffect(() => {
    handleLocate();
  }, []);

  const playClickSound = useCallback(() => {
    if (!soundEnabled) return;
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      const oscillator = audioCtx.createOscillator();
      const gainNode = audioCtx.createGain();

      oscillator.type = 'sine';
      oscillator.frequency.setValueAtTime(600, audioCtx.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(300, audioCtx.currentTime + 0.1);

      gainNode.gain.setValueAtTime(0.05, audioCtx.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.1);

      oscillator.connect(gainNode);
      gainNode.connect(audioCtx.destination);

      oscillator.start();
      oscillator.stop(audioCtx.currentTime + 0.1);
    } catch (e) {
      console.warn('Audio context failed to start:', e);
    }
  }, [soundEnabled]);

  const handleTabChange = (id: string) => {
    playClickSound();
    setActiveTab(id);
  };

  // Handle search suggestions with debounce
  useEffect(() => {
    if (searchQuery.length < 3) {
      setSuggestions([]);
      return;
    }

    const timer = setTimeout(async () => {
      try {
        const response = await fetch(
          `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`
        );
        const data = await response.json();
        setSuggestions(data);
      } catch (err) {
        console.error('Search error:', err);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const handleSelectLocation = (lat: string, lon: string, displayName: string) => {
    const coords: [number, number] = [parseFloat(lat), parseFloat(lon)];
    setMapCenter(coords);
    setZoom(15);
    setSearchQuery(displayName);
    setSuggestions([]);
    setShowSuggestions(false);
    playClickSound();
  };

  const handleLocate = () => {
    setIsLocating(true);
    setError(null);
    
    if (!navigator.geolocation) {
      setError('Geolocation is not supported by your browser');
      setIsLocating(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const { latitude, longitude, accuracy } = position.coords;
        setUserLocation([latitude, longitude]);
        setAccuracy(accuracy);
        setMapCenter([latitude, longitude]);
        setZoom(15);
        setIsLocating(false);
        setError(null);
      },
      (err) => {
        console.error('Geolocation error:', err.code, err.message);
        let message = 'Unable to retrieve your location.';
        setError(message);
        setIsLocating(false);
      },
      { enableHighAccuracy: true, timeout: 5000, maximumAge: 0 }
    );
  };

  const menuItems = [
    { id: 'tenant', label: 'Tenant', icon: Home },
    { id: 'referrals', label: 'Referrals', icon: Users },
    { id: 'gigs', label: 'GiGs', icon: Zap },
    { id: 'seekers', label: 'Seekers', icon: Target },
    { id: 'profile', label: 'Profile', icon: User },
  ];

  return (
    <div className="h-screen w-screen bg-white flex flex-col font-sans text-slate-900 overflow-hidden relative">
      
      {/* Dynamic View Container */}
      <main className="flex-1 relative overflow-hidden bg-slate-50">
        
        {/* GIGS VIEW (The Map) */}
        <div className={`absolute inset-0 transition-opacity duration-300 ${activeTab === 'gigs' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          {/* Floating Search Bar Overlay */}
          <div className="absolute top-6 left-1/2 -translate-x-1/2 z-[2000] w-full max-w-xl px-6">
            <div className="relative">
              <div className="bg-white/95 backdrop-blur-xl rounded-2xl shadow-2xl border border-slate-200 flex items-center p-1 overflow-hidden transition-all focus-within:ring-2 focus-within:ring-blue-500/20">
                <div className="pl-4 text-slate-400">
                  <Search className="w-5 h-5" />
                </div>
                <input
                  type="text"
                  value={searchQuery}
                  onChange={(e) => {
                    setSearchQuery(e.target.value);
                    setShowSuggestions(true);
                  }}
                  onFocus={() => setShowSuggestions(true)}
                  placeholder="Search map..."
                  className="flex-1 px-4 py-3 text-sm focus:outline-none bg-transparent"
                />
                <button 
                  onClick={() => { handleLocate(); playClickSound(); }}
                  disabled={isLocating}
                  className="p-2 mr-1 text-slate-400 hover:text-blue-600 transition-colors rounded-xl hover:bg-slate-50 disabled:opacity-50"
                >
                  {isLocating ? (
                    <div className="w-5 h-5 border-2 border-blue-600/30 border-t-blue-600 rounded-full animate-spin" />
                  ) : (
                    <Crosshair className="w-5 h-5" />
                  )}
                </button>
              </div>
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    className="absolute top-full left-0 right-0 mt-2 bg-white rounded-2xl shadow-2xl border border-slate-200 overflow-hidden"
                  >
                    {suggestions.map((suggestion, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSelectLocation(suggestion.lat, suggestion.lon, suggestion.display_name)}
                        className="w-full flex items-start gap-4 p-4 text-left hover:bg-slate-50 transition-colors border-b border-slate-50 last:border-0"
                      >
                        <MapPin className="w-5 h-5 text-slate-400 mt-0.5 shrink-0" />
                        <div>
                          <div className="text-sm font-medium text-slate-900 line-clamp-1">{suggestion.display_name.split(',')[0]}</div>
                          <div className="text-xs text-slate-500 line-clamp-2">{suggestion.display_name}</div>
                        </div>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          <MapContainer center={mapCenter} zoom={zoom} scrollWheelZoom={true} className="w-full h-full" zoomControl={false} attributionControl={false}>
            {mapType === 'standard' ? <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" /> : <TileLayer url="https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}" />}
            <MapController center={mapCenter} zoom={zoom} />
            <MapEvents onLocationFound={(lat, lng) => setUserLocation([lat, lng])} />
            {userLocation && (
              <>
                <Marker position={userLocation} icon={deviceLocationIcon}>
                  <Popup>
                    <div className="p-1 text-center">
                      <h3 className="font-bold text-slate-900">Your Device</h3>
                      <p className="text-[10px] text-slate-500 uppercase tracking-tighter mt-1">Live Tracking</p>
                    </div>
                  </Popup>
                </Marker>
                {accuracy && accuracy < 500 && <Circle center={userLocation} radius={accuracy} pathOptions={{ color: '#3b82f6', fillColor: '#3b82f6', fillOpacity: 0.1, weight: 1 }} />}
              </>
            )}
            <div className="absolute top-1/2 -translate-y-1/2 right-6 z-[1000] flex flex-col gap-3">
              <button onClick={() => { setMapType(m => m === 'standard' ? 'satellite' : 'standard'); playClickSound(); }} className={`w-14 h-14 rounded-full shadow-2xl border border-slate-200 flex items-center justify-center transition-all active:scale-90 ${mapType === 'satellite' ? 'bg-blue-600 text-white' : 'bg-white/90 backdrop-blur-md text-slate-600 hover:text-blue-600'}`} title="Toggle Satellite View"><Globe className="w-6 h-6" /></button>
              <div className="w-px h-4 bg-slate-200/50 self-center" />
              <button onClick={() => { setZoom(z => Math.min(z + 1, 18)); playClickSound(); }} className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all active:scale-90 text-slate-600 hover:text-blue-600"><Plus className="w-6 h-6" /></button>
              <button onClick={() => { setZoom(z => Math.max(z - 1, 2)); playClickSound(); }} className="w-14 h-14 bg-white/90 backdrop-blur-md rounded-full shadow-2xl border border-slate-200 flex items-center justify-center hover:bg-white transition-all active:scale-90 text-slate-600 hover:text-blue-600"><Minus className="w-6 h-6" /></button>
            </div>
          </MapContainer>
        </div>

        {/* TENANT VIEW */}
        <div className={`absolute inset-0 bg-white p-8 overflow-y-auto transition-opacity duration-300 ${activeTab === 'tenant' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-2xl mx-auto space-y-8">
            <h2 className="text-3xl font-black tracking-tight">Tenant Dashboard</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="p-6 bg-slate-900 rounded-3xl text-white">
                <p className="text-xs font-bold uppercase tracking-widest text-slate-400 mb-2">Total Profit Balance</p>
                <p className="text-4xl font-black tabular-nums">R0.00</p>
              </div>
              <div className="space-y-4">
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">Tenant Sub Profit</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900">R0.00</p>
                </div>
                <div className="p-4 bg-slate-50 rounded-2xl border border-slate-100">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-1">User Sub Profit</p>
                  <p className="text-xl font-bold tabular-nums text-slate-900">R0.00</p>
                </div>
              </div>
            </div>
            <div className="p-6 bg-blue-50 rounded-3xl border border-blue-100">
              <p className="text-sm font-bold text-blue-900 mb-3">Your Referral Link</p>
              <div className="flex items-center gap-2 p-3 bg-white rounded-xl border border-blue-200">
                <input readOnly value="https://geoexplorer.app/ref/johndoe123" className="flex-1 bg-transparent text-sm text-blue-700 outline-none" />
                <button onClick={playClickSound} className="text-xs font-bold text-blue-600 hover:text-blue-800 uppercase tracking-wider">Copy</button>
              </div>
            </div>
          </div>
        </div>

        {/* SEEKERS & REFERRALS VIEW */}
        <div className={`absolute inset-0 bg-slate-50 p-6 transition-opacity duration-300 ${['seekers', 'referrals'].includes(activeTab) ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-full max-w-xl px-6">
            <div className="relative">
              <div className="bg-white rounded-2xl shadow-xl border border-slate-200 flex items-center p-1">
                <div className="pl-4 text-slate-400"><Search className="w-5 h-5" /></div>
                <input onFocus={playClickSound} type="text" placeholder={`Search for ${activeTab}...`} className="flex-1 px-4 py-4 text-sm focus:outline-none bg-transparent" />
              </div>
            </div>
          </div>
        </div>

        {/* PROFILE VIEW */}
        <div className={`absolute inset-0 bg-white p-8 overflow-y-auto transition-opacity duration-300 ${activeTab === 'profile' ? 'opacity-100 z-10' : 'opacity-0 z-0 pointer-events-none'}`}>
          <div className="max-w-md mx-auto flex flex-col items-center py-12 relative">
            
            {/* Settings Icon Feature */}
            <button 
              onClick={() => { setShowSettings(!showSettings); playClickSound(); }}
              className="absolute top-0 right-0 p-3 text-slate-400 hover:text-slate-900 transition-colors"
            >
              <Settings className="w-6 h-6" />
            </button>

            {/* Settings Overlay */}
            <AnimatePresence>
              {showSettings && (
                <motion.div
                  initial={{ opacity: 0, scale: 0.95, y: -10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.95, y: -10 }}
                  className="absolute top-12 right-0 w-64 bg-white rounded-2xl shadow-2xl border border-slate-200 p-4 z-50"
                >
                  <h3 className="text-xs font-black uppercase tracking-widest text-slate-400 mb-4 px-2">Settings</h3>
                  <button 
                    onClick={() => { setSoundEnabled(!soundEnabled); playClickSound(); }}
                    className="w-full flex items-center justify-between p-3 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      {soundEnabled ? <Volume2 className="w-5 h-5 text-blue-600" /> : <VolumeX className="w-5 h-5 text-slate-400" />}
                      <span className="text-sm font-bold text-slate-900">App Sound</span>
                    </div>
                    <div className={`w-10 h-6 rounded-full transition-colors relative ${soundEnabled ? 'bg-blue-600' : 'bg-slate-200'}`}>
                      <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-all ${soundEnabled ? 'left-5' : 'left-1'}`} />
                    </div>
                  </button>
                </motion.div>
              )}
            </AnimatePresence>

            <div className="w-32 h-32 bg-slate-900 rounded-full flex items-center justify-center mb-8 shadow-2xl">
              <User className="w-16 h-16 text-white" />
            </div>
            <div className="w-full space-y-6">
              <div className="space-y-4">
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Full Name</label>
                  <p className="text-lg font-bold border-b border-slate-100 pb-2 text-slate-900">John Doe</p>
                </div>
                <div>
                  <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Email Address</label>
                  <p className="text-lg font-bold border-b border-slate-100 pb-2 text-slate-900">john.doe@example.com</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Name</label>
                    <p className="text-lg font-bold border-b border-slate-100 pb-2 text-slate-900">John</p>
                  </div>
                  <div>
                    <label className="text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1 block">Surname</label>
                    <p className="text-lg font-bold border-b border-slate-100 pb-2 text-slate-900">Doe</p>
                  </div>
                </div>
              </div>
              <button onClick={playClickSound} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-black uppercase tracking-widest hover:bg-slate-800 transition-colors shadow-lg active:scale-95 mt-8">
                Edit Profile
              </button>
            </div>
          </div>
        </div>

        {/* Error Overlay */}
        <AnimatePresence>
          {error && activeTab === 'gigs' && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.9 }} className="absolute inset-0 z-[3000] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm px-6">
              <div className="bg-white rounded-3xl shadow-2xl p-8 max-w-sm w-full text-center">
                <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6"><Navigation className="w-8 h-8 text-red-500" /></div>
                <h4 className="text-xl font-bold text-slate-900 mb-2">Location Error</h4>
                <p className="text-slate-500 mb-8">{error}</p>
                <button onClick={() => { setError(null); playClickSound(); }} className="w-full py-4 bg-slate-900 text-white rounded-2xl font-bold hover:bg-slate-800 transition-colors">Dismiss</button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Attached Bottom Menu Bar */}
      <nav className="h-20 bg-white border-t border-slate-200 flex items-center justify-between px-2 shrink-0 z-[2000] relative shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.05)]">
        {menuItems.map((item) => (
          <button
            key={item.id}
            onClick={() => handleTabChange(item.id)}
            className={`flex-1 flex flex-col items-center justify-center gap-1.5 h-full transition-all active:scale-95 group ${activeTab === item.id ? 'bg-slate-50' : ''}`}
          >
            <div className="relative">
              <item.icon 
                className={`${item.id === 'gigs' ? 'w-8 h-8' : 'w-6 h-6'} ${activeTab === item.id ? 'text-blue-600' : 'text-black'} transition-colors`} 
                strokeWidth={item.id === 'gigs' ? 3 : 2.5} 
              />
            </div>
            <span className={`text-[10px] font-black uppercase tracking-tighter transition-colors ${activeTab === item.id ? 'text-blue-600' : 'text-black'}`}>
              {item.label}
            </span>
          </button>
        ))}
      </nav>
    </div>
  );
}
