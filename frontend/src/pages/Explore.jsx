import React, { useEffect, useState } from 'react';
import { getTasks } from '../services/api';
import { Link } from 'react-router-dom';
import {
  Search, MapPin, AlertCircle, Clock, Flame, CheckCircle2,
  Filter, RefreshCw, ChevronRight, Zap, Heart, Truck, Stethoscope, ShieldAlert
} from 'lucide-react';

// Urgency config
const urgencyConfig = {
  5: { label: 'Critical', color: 'text-red-400', bg: 'bg-red-900/30', border: 'border-red-700/50', pulse: true },
  4: { label: 'High',     color: 'text-orange-400', bg: 'bg-orange-900/30', border: 'border-orange-700/50', pulse: false },
  3: { label: 'Medium',   color: 'text-yellow-400', bg: 'bg-yellow-900/30', border: 'border-yellow-700/50', pulse: false },
  2: { label: 'Low',      color: 'text-blue-400',   bg: 'bg-blue-900/30',   border: 'border-blue-700/50',   pulse: false },
  1: { label: 'Minimal',  color: 'text-gray-400',   bg: 'bg-gray-900/30',   border: 'border-gray-700/50',   pulse: false },
};

const statusConfig = {
  'Unassigned': { icon: AlertCircle,    color: 'text-red-400',   bg: 'bg-red-900/20' },
  'Assigned':   { icon: CheckCircle2,   color: 'text-blue-400',  bg: 'bg-blue-900/20' },
  'In Progress':{ icon: Clock,          color: 'text-yellow-400',bg: 'bg-yellow-900/20' },
  'Completed':  { icon: CheckCircle2,   color: 'text-green-400', bg: 'bg-green-900/20' },
};

const skillIcons = {
  'First Aid': Stethoscope,
  'Medical':   Stethoscope,
  'Driving':   Truck,
  'Transport': Truck,
  'Rescue':    ShieldAlert,
  'Food':      Heart,
  default:     Zap,
};

const SkillIcon = ({ skill }) => {
  const match = Object.keys(skillIcons).find(k => skill.toLowerCase().includes(k.toLowerCase()));
  const Icon = match ? skillIcons[match] : skillIcons.default;
  return <Icon className="w-3 h-3" />;
};

const FILTERS = ['All', 'Unassigned', 'Assigned', 'In Progress', 'Completed'];
const URGENCY_FILTERS = ['Any', '5', '4', '3', '2', '1'];

function timeAgo(ts) {
  if (!ts) return '';
  const diff = (Date.now() - new Date(ts).getTime()) / 1000;
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

export default function Explore() {
  const [tasks, setTasks]           = useState([]);
  const [loading, setLoading]       = useState(true);
  const [search, setSearch]         = useState('');
  const [statusFilter, setStatus]   = useState('All');
  const [urgencyFilter, setUrgency] = useState('Any');
  const [refreshing, setRefreshing] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(new Date());

  const fetchTasks = async (showSpin = false) => {
    if (showSpin) setRefreshing(true);
    try {
      const data = await getTasks();
      setTasks(data);
      setLastRefresh(new Date());
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => {
    fetchTasks();
    const interval = setInterval(() => fetchTasks(), 10000);
    return () => clearInterval(interval);
  }, []);

  const filtered = tasks.filter(t => {
    const matchSearch = !search ||
      t.title?.toLowerCase().includes(search.toLowerCase()) ||
      t.description?.toLowerCase().includes(search.toLowerCase());
    const matchStatus  = statusFilter === 'All' || t.status === statusFilter;
    const matchUrgency = urgencyFilter === 'Any' || String(t.urgencyScore) === urgencyFilter;
    return matchSearch && matchStatus && matchUrgency;
  });

  const counts = FILTERS.slice(1).reduce((acc, s) => {
    acc[s] = tasks.filter(t => t.status === s).length;
    return acc;
  }, {});

  return (
    <div className="min-h-full pb-10">
      {/* Hero header */}
      <div className="relative mb-8">
        <div className="absolute inset-0 bg-gradient-to-b from-[#1DB954]/25 to-transparent rounded-xl pointer-events-none" />
        <div className="relative pt-10 pb-6 px-2">
          <p className="text-[#1DB954] text-xs font-bold tracking-widest uppercase mb-2">Live Feed</p>
          <h1 className="text-4xl font-black text-white mb-1">Explore Crises</h1>
          <p className="text-[#b3b3b3]">
            {tasks.length} active situations · Updated {timeAgo(lastRefresh)}
          </p>
        </div>
      </div>

      {/* Stats bar */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Total',       value: tasks.length,          color: 'text-white',        icon: Filter },
          { label: 'Unassigned',  value: counts['Unassigned']  || 0, color: 'text-red-400',    icon: AlertCircle },
          { label: 'In Progress', value: counts['In Progress']  || 0, color: 'text-yellow-400', icon: Clock },
          { label: 'Resolved',    value: counts['Completed']   || 0, color: 'text-green-400',  icon: CheckCircle2 },
        ].map(({ label, value, color, icon: Icon }) => (
          <div key={label} className="bg-[#181818] border border-[#282828] rounded-xl p-4 flex items-center gap-3 hover:border-[#1DB954]/40 transition-colors">
            <Icon className={`w-5 h-5 ${color}`} />
            <div>
              <p className={`text-2xl font-black ${color}`}>{value}</p>
              <p className="text-[#b3b3b3] text-xs">{label}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Search + filters */}
      <div className="flex flex-col sm:flex-row gap-3 mb-6">
        {/* Search bar */}
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#535353]" />
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by title or description…"
            className="w-full pl-10 pr-4 py-2.5 bg-[#121212] border border-[#282828] rounded-full text-white placeholder-[#535353] focus:outline-none focus:ring-2 focus:ring-[#1DB954] focus:border-transparent transition-all text-sm"
          />
        </div>

        {/* Refresh */}
        <button
          onClick={() => fetchTasks(true)}
          disabled={refreshing}
          className="flex items-center gap-2 bg-[#282828] hover:bg-[#333] border border-[#333] text-[#b3b3b3] hover:text-white px-4 py-2.5 rounded-full text-sm font-semibold transition-all disabled:opacity-50"
        >
          <RefreshCw className={`w-4 h-4 ${refreshing ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Status filter pills */}
      <div className="flex gap-2 flex-wrap mb-3">
        {FILTERS.map(f => (
          <button
            key={f}
            onClick={() => setStatus(f)}
            className={`px-4 py-1.5 rounded-full text-sm font-bold transition-all border ${
              statusFilter === f
                ? 'bg-[#1DB954] text-black border-[#1DB954]'
                : 'bg-transparent text-[#b3b3b3] border-[#282828] hover:border-[#535353] hover:text-white'
            }`}
          >
            {f} {f !== 'All' && counts[f] !== undefined ? `(${counts[f]})` : ''}
          </button>
        ))}
      </div>

      {/* Urgency filter pills */}
      <div className="flex gap-2 flex-wrap mb-8 items-center">
        <span className="text-[#535353] text-xs font-bold uppercase tracking-wider flex items-center gap-1">
          <Flame className="w-3 h-3" /> Urgency:
        </span>
        {URGENCY_FILTERS.map(u => {
          const cfg = urgencyConfig[u];
          return (
            <button
              key={u}
              onClick={() => setUrgency(u)}
              className={`px-3 py-1 rounded-full text-xs font-bold transition-all border ${
                urgencyFilter === u
                  ? (cfg ? `${cfg.bg} ${cfg.color} ${cfg.border}` : 'bg-[#1DB954] text-black border-[#1DB954]')
                  : 'bg-transparent text-[#b3b3b3] border-[#282828] hover:border-[#535353]'
              }`}
            >
              {u === 'Any' ? 'Any' : `${u} – ${urgencyConfig[u]?.label}`}
            </button>
          );
        })}
      </div>

      {/* Task grid */}
      {loading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="bg-[#181818] rounded-xl p-5 animate-pulse border border-[#282828]">
              <div className="h-4 bg-[#282828] rounded w-2/3 mb-3" />
              <div className="h-3 bg-[#282828] rounded w-full mb-2" />
              <div className="h-3 bg-[#282828] rounded w-4/5 mb-4" />
              <div className="flex gap-2">
                <div className="h-6 bg-[#282828] rounded-full w-16" />
                <div className="h-6 bg-[#282828] rounded-full w-20" />
              </div>
            </div>
          ))}
        </div>
      ) : filtered.length === 0 ? (
        <div className="text-center py-24">
          <AlertCircle className="w-12 h-12 text-[#535353] mx-auto mb-4" />
          <p className="text-white font-bold text-xl mb-1">No crises found</p>
          <p className="text-[#b3b3b3]">Try adjusting your filters or check back later</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {filtered.map(task => {
            const urg = urgencyConfig[task.urgencyScore] || urgencyConfig[1];
            const stat = statusConfig[task.status] || statusConfig['Unassigned'];
            const StatIcon = stat.icon;
            return (
              <div
                key={task.id}
                className={`group bg-[#181818] border rounded-xl p-5 flex flex-col gap-3 transition-all duration-200 hover:bg-[#1e1e1e] hover:scale-[1.01] hover:shadow-xl hover:shadow-black/60 cursor-pointer ${urg.border} border-opacity-50 hover:border-opacity-100`}
              >
                {/* Top row */}
                <div className="flex items-start justify-between gap-2">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      {/* Urgency pulse dot */}
                      {urg.pulse && (
                        <span className="relative flex h-2.5 w-2.5 flex-shrink-0">
                          <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75" />
                          <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-red-500" />
                        </span>
                      )}
                      <h3 className="font-bold text-white text-sm leading-snug truncate group-hover:text-[#1DB954] transition-colors">
                        {task.title}
                      </h3>
                    </div>
                    <p className="text-[#b3b3b3] text-xs line-clamp-2 leading-relaxed">
                      {task.description}
                    </p>
                  </div>

                  {/* Urgency badge */}
                  <span className={`flex-shrink-0 text-xs font-bold px-2.5 py-1 rounded-full ${urg.bg} ${urg.color} border ${urg.border}`}>
                    {urg.label}
                  </span>
                </div>

                {/* Meta row */}
                <div className="flex items-center gap-3 text-xs text-[#535353]">
                  <span className="flex items-center gap-1">
                    <MapPin className="w-3 h-3" />
                    {task.location
                      ? `${task.location.lat?.toFixed(3)}, ${task.location.lng?.toFixed(3)}`
                      : 'Location unknown'}
                  </span>
                  <span className="flex items-center gap-1">
                    <Flame className={`w-3 h-3 ${urg.color}`} />
                    {task.urgencyScore}/5
                  </span>
                </div>

                {/* Skills */}
                {task.requiredSkills?.length > 0 && (
                  <div className="flex gap-1.5 flex-wrap">
                    {task.requiredSkills.slice(0, 4).map(skill => (
                      <span
                        key={skill}
                        className="flex items-center gap-1 text-[10px] font-semibold bg-[#282828] text-[#b3b3b3] px-2 py-0.5 rounded-full"
                      >
                        <SkillIcon skill={skill} />
                        {skill}
                      </span>
                    ))}
                    {task.requiredSkills.length > 4 && (
                      <span className="text-[10px] text-[#535353] px-1 self-center">
                        +{task.requiredSkills.length - 4} more
                      </span>
                    )}
                  </div>
                )}

                {/* Footer row */}
                <div className="flex items-center justify-between pt-1 border-t border-[#282828] mt-auto">
                  <span className={`flex items-center gap-1.5 text-xs font-semibold px-2.5 py-1 rounded-full ${stat.bg} ${stat.color}`}>
                    <StatIcon className="w-3 h-3" />
                    {task.status}
                  </span>
                  <Link
                    to="/add-volunteer"
                    className="flex items-center gap-1 text-xs text-[#1DB954] font-bold hover:text-[#1ed760] transition-colors opacity-0 group-hover:opacity-100"
                    onClick={e => e.stopPropagation()}
                  >
                    Volunteer <ChevronRight className="w-3 h-3" />
                  </Link>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
