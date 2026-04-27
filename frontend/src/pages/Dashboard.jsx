import React, { useEffect, useState, useCallback } from 'react';
import { getTasks, getVolunteers, assignTask, getDemandAnalytics, completeTask } from '../services/api';
import { AlertCircle, CheckCircle2, Clock, MapPin, Search, Navigation, User, Timer, Loader2 } from 'lucide-react';
import { GoogleMap, useJsApiLoader, Marker, InfoWindow, Polyline, Circle } from '@react-google-maps/api';

const mapContainerStyle = {
  width: '100%',
  height: '100%'
};

const defaultCenter = {
  lat: 40.7128,
  lng: -74.0060
};

// Spotify-inspired Dark Mode Map Style
const darkMapStyle = [
  { "elementType": "geometry", "stylers": [{ "color": "#212121" }] },
  { "elementType": "labels.icon", "stylers": [{ "visibility": "off" }] },
  { "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "elementType": "labels.text.stroke", "stylers": [{ "color": "#212121" }] },
  { "featureType": "administrative", "elementType": "geometry", "stylers": [{ "color": "#757575" }] },
  { "featureType": "administrative.country", "elementType": "labels.text.fill", "stylers": [{ "color": "#9e9e9e" }] },
  { "featureType": "administrative.land_parcel", "stylers": [{ "visibility": "off" }] },
  { "featureType": "administrative.locality", "elementType": "labels.text.fill", "stylers": [{ "color": "#bdbdbd" }] },
  { "featureType": "poi", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "poi.park", "elementType": "geometry", "stylers": [{ "color": "#181818" }] },
  { "featureType": "poi.park", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "poi.park", "elementType": "labels.text.stroke", "stylers": [{ "color": "#1b1b1b" }] },
  { "featureType": "road", "elementType": "geometry.fill", "stylers": [{ "color": "#2c2c2c" }] },
  { "featureType": "road", "elementType": "labels.text.fill", "stylers": [{ "color": "#8a8a8a" }] },
  { "featureType": "road.arterial", "elementType": "geometry", "stylers": [{ "color": "#373737" }] },
  { "featureType": "road.highway", "elementType": "geometry", "stylers": [{ "color": "#3c3c3c" }] },
  { "featureType": "road.highway.controlled_access", "elementType": "geometry", "stylers": [{ "color": "#4e4e4e" }] },
  { "featureType": "road.local", "elementType": "labels.text.fill", "stylers": [{ "color": "#616161" }] },
  { "featureType": "transit", "elementType": "labels.text.fill", "stylers": [{ "color": "#757575" }] },
  { "featureType": "water", "elementType": "geometry", "stylers": [{ "color": "#000000" }] },
  { "featureType": "water", "elementType": "labels.text.fill", "stylers": [{ "color": "#3d3d3d" }] }
];

// Helper: Calculate distance in KM (Haversine)
const getDistanceKM = (loc1, loc2) => {
  if (!loc1 || !loc2) return 0;
  const R = 6371;
  const dLat = (loc2.lat - loc1.lat) * (Math.PI / 180);
  const dLon = (loc2.lng - loc1.lng) * (Math.PI / 180);
  const a = 
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos(loc1.lat * (Math.PI / 180)) * Math.cos(loc2.lat * (Math.PI / 180)) * 
    Math.sin(dLon / 2) * Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
};

const Dashboard = () => {
  const [tasks, setTasks] = useState([]);
  const [volunteers, setVolunteers] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [resolvingId, setResolvingId] = useState(null);
  const [selectedTaskId, setSelectedTaskId] = useState(null);
  const [mapCenter, setMapCenter] = useState(defaultCenter);
  const [mapZoom, setMapZoom] = useState(12);
  const [isFetching, setIsFetching] = useState(false);
  const [activeInfoWindow, setActiveInfoWindow] = useState(null);

  const { isLoaded } = useJsApiLoader({
    id: 'google-map-script',
    googleMapsApiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY
  });

  const fetchData = async () => {
    if (isFetching) return;
    setIsFetching(true);
    try {
      const [tasksRes, volsRes, demandRes] = await Promise.allSettled([
        getTasks(),
        getVolunteers(),
        getDemandAnalytics()
      ]);

      if (tasksRes.status === 'fulfilled') {
        setTasks(tasksRes.value.filter(t => t.status?.toLowerCase() !== 'completed'));
      }
      if (volsRes.status === 'fulfilled') {
        setVolunteers(volsRes.value);
      }
      if (demandRes.status === 'fulfilled') {
        setHotspots(demandRes.value.hotspots || []);
      }
    } catch (error) {
      console.error("Unexpected error in fetchData:", error);
    } finally {
      setLoading(false);
      setIsFetching(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 5000);
    return () => clearInterval(interval);
  }, []);

  const handleAssign = async (taskId) => {
    try {
      await assignTask(taskId);
      fetchData();
      setSelectedTaskId(taskId);
    } catch (error) {
      alert("Could not assign task: " + (error.response?.data?.error || error.message));
    }
  };

  const handleResolve = async (taskId) => {
    setResolvingId(taskId);
    try {
      await completeTask(taskId);
      await fetchData(); 
      if (selectedTaskId === taskId) setSelectedTaskId(null);
    } catch (error) {
      alert("Could not resolve task: " + (error.response?.data?.error || error.message));
    } finally {
      setResolvingId(null);
    }
  };

  const selectedTask = tasks.find(t => t.id === selectedTaskId);
  const assignedVolunteer = selectedTask?.assignedVolunteerId 
    ? volunteers.find(v => v.id === selectedTask.assignedVolunteerId)
    : null;

  const distance = assignedVolunteer && selectedTask 
    ? getDistanceKM(assignedVolunteer.location, selectedTask.location)
    : 0;
  const etaMinutes = Math.round((distance / 40) * 60);

  const getStatusColor = (status) => {
    switch (status) {
      case 'Unassigned': return 'bg-red-900/30 text-red-400 border-red-800/50';
      case 'Assigned': return 'bg-blue-900/30 text-blue-400 border-blue-800/50';
      case 'In Progress': return 'bg-yellow-900/30 text-yellow-400 border-yellow-800/50';
      case 'Completed': return 'bg-green-900/30 text-green-400 border-green-800/50';
      default: return 'bg-gray-900/30 text-gray-400';
    }
  };

  const handleFocusTask = (task) => {
    setSelectedTaskId(task.id);
    if (task.location) {
      setMapCenter({ lat: task.location.lat, lng: task.location.lng });
      setMapZoom(14);
    }
  };

  const locateUser = useCallback(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setMapCenter({
            lat: position.coords.latitude,
            lng: position.coords.longitude
          });
          setMapZoom(13);
        },
        (error) => {
          console.warn("Geolocation error:", error.message);
        }
      );
    }
  }, []);

  useEffect(() => {
    locateUser();
  }, [locateUser]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Left Column - List */}
      <div className="lg:col-span-1 border border-border bg-card rounded-xl flex flex-col overflow-hidden shadow-xl shadow-black/40">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center">
          <h2 className="font-bold flex items-center gap-2 text-white">
            <AlertCircle className="w-4 h-4 text-primary" /> Active Tasks
          </h2>
          <span className="text-xs text-muted-foreground">{tasks.length} reported</span>
        </div>
        
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {loading && tasks.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full text-muted-foreground gap-3">
              <Loader2 className="w-8 h-8 animate-spin text-primary" />
              <p>Loading situation room…</p>
            </div>
          ) : tasks.length === 0 ? (
            <div className="text-center text-muted-foreground py-8">No active tasks right now.</div>
          ) : (
            tasks.map(task => (
              <div 
                key={task.id} 
                onClick={() => handleFocusTask(task)}
                className={`p-4 rounded-xl border transition-all cursor-pointer group ${
                  selectedTaskId === task.id 
                    ? 'bg-primary/10 border-primary shadow-lg shadow-primary/5' 
                    : 'bg-background/50 border-border hover:border-primary/40'
                }`}
              >
                <div className="flex justify-between items-start mb-2">
                  <h3 className="font-bold text-sm text-white truncate pr-2 group-hover:text-primary transition-colors">{task.title}</h3>
                  <span className={`text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full border ${getStatusColor(task.status)}`}>
                    {task.status}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground mb-3 line-clamp-2">{task.description}</p>
                
                <div className="flex items-center gap-3 text-[10px] font-semibold text-muted-foreground mb-3">
                  <span className="flex items-center gap-1 bg-[#181818] px-2 py-1 rounded-md"><MapPin className="w-3 h-3 text-red-400" /> {task.location?.lat?.toFixed(3)}, {task.location?.lng?.toFixed(3)}</span>
                  <span className="flex items-center gap-1 bg-[#181818] px-2 py-1 rounded-md"><AlertCircle className="w-3 h-3 text-orange-400" /> Urgency: {task.urgencyScore}/5</span>
                </div>

                {task.status === 'Unassigned' && (
                  <button 
                    onClick={(e) => { e.stopPropagation(); handleAssign(task.id); }}
                    className="w-full bg-primary hover:bg-primary/90 text-black py-2 rounded-lg text-xs font-black transition-all flex justify-center items-center gap-2 hover:scale-[1.02] active:scale-[0.98]"
                  >
                    <Search className="w-3.5 h-3.5" /> Find Nearest Volunteer
                  </button>
                )}

                {task.status === 'Assigned' && (
                  <div className="space-y-2">
                    <div className="w-full bg-[#181818] text-white py-2 px-3 rounded-lg text-xs flex items-center justify-between border border-blue-900/30">
                      <div className="flex items-center gap-2">
                        <User className="w-3.5 h-3.5 text-blue-400" />
                        <span className="truncate max-w-[120px]">{volunteers.find(v => v.id === task.assignedVolunteerId)?.name || 'Volunteer'}</span>
                      </div>
                      <div className="flex items-center gap-1 text-blue-400 font-bold">
                        <Timer className="w-3.5 h-3.5" />
                        {selectedTaskId === task.id ? `${etaMinutes}m` : 'En route'}
                      </div>
                    </div>
                    <button 
                      onClick={(e) => { e.stopPropagation(); handleResolve(task.id); }}
                      disabled={resolvingId === task.id}
                      className="w-full bg-green-500 hover:bg-green-600 disabled:bg-green-800 disabled:cursor-not-allowed text-black py-2 rounded-lg text-xs font-black transition-all flex justify-center items-center gap-2"
                    >
                      {resolvingId === task.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                      {resolvingId === task.id ? 'Resolving...' : 'Mark as Resolved'}
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Right Column - Google Map */}
      <div className="lg:col-span-2 border border-border bg-card rounded-xl flex flex-col shadow-xl shadow-black/40 overflow-hidden relative">
        <div className="p-4 border-b border-border bg-muted/20 flex justify-between items-center z-10 relative backdrop-blur-md">
          <div className="flex items-center gap-4">
            <h2 className="font-bold flex items-center gap-2 text-white">
              <Navigation className="w-4 h-4 text-primary" /> Live Operations Tracking
            </h2>
            <button 
              onClick={locateUser}
              className="text-[10px] font-bold bg-primary/10 hover:bg-primary/20 text-primary px-3 py-1 rounded-full border border-primary/20 transition-all flex items-center gap-1.5"
            >
              <MapPin className="w-3 h-3" /> Locate Me
            </button>
          </div>
          <div className="flex gap-4 text-[10px] font-black uppercase tracking-widest text-muted-foreground">
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_5px_red]"></span> Crisis</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-blue-500 shadow-[0_0_5px_blue]"></span> Assigned</div>
            <div className="flex items-center gap-1.5"><span className="w-2 h-2 rounded-full bg-[#1DB954] shadow-[0_0_5px_#1DB954]"></span> Volunteer</div>
          </div>
        </div>
        
        <div className="flex-1 relative z-0">
          {isLoaded ? (
            <GoogleMap
              mapContainerStyle={mapContainerStyle}
              center={mapCenter}
              zoom={mapZoom}
              options={{ styles: darkMapStyle, disableDefaultUI: true, zoomControl: true }}
              onLoad={map => { /* store ref if needed */ }}
            >
              {/* Hotspots */}
              {hotspots.map((spot, i) => (
                <Circle
                  key={`spot-${i}`}
                  center={spot.location}
                  radius={spot.radius}
                  options={{
                    fillColor: '#ff4444',
                    fillOpacity: 0.1,
                    strokeColor: '#ff4444',
                    strokeOpacity: 0.5,
                    strokeWeight: 1
                  }}
                />
              ))}

              {/* Tasks */}
              {tasks.map(task => (
                <Marker
                  key={task.id}
                  position={task.location}
                  onClick={() => setActiveInfoWindow({ type: 'task', id: task.id })}
                  icon={{
                    url: task.status === 'Unassigned' 
                      ? 'https://maps.google.com/mapfiles/ms/icons/red-dot.png' 
                      : 'https://maps.google.com/mapfiles/ms/icons/blue-dot.png'
                  }}
                />
              ))}

              {/* Volunteers */}
              {volunteers.map(vol => (
                <Marker
                  key={vol.id}
                  position={vol.location}
                  onClick={() => setActiveInfoWindow({ type: 'vol', id: vol.id })}
                  icon={{ url: 'https://maps.google.com/mapfiles/ms/icons/green-dot.png' }}
                />
              ))}

              {/* Path and ETA if selected */}
              {selectedTask && assignedVolunteer && (
                <>
                  <Polyline
                    path={[assignedVolunteer.location, selectedTask.location]}
                    options={{
                      strokeColor: '#1DB954',
                      strokeOpacity: 0.8,
                      strokeWeight: 4,
                      icons: [{ icon: { path: 'M 0,-1 0,1', strokeOpacity: 1, scale: 4 }, offset: '0', repeat: '20px' }]
                    }}
                  />
                </>
              )}

              {/* Info Windows */}
              {activeInfoWindow && (
                <InfoWindow
                  position={activeInfoWindow.type === 'task' 
                    ? tasks.find(t => t.id === activeInfoWindow.id)?.location 
                    : volunteers.find(v => v.id === activeInfoWindow.id)?.location
                  }
                  onCloseClick={() => setActiveInfoWindow(null)}
                >
                  <div className="p-2 text-black min-w-[150px]">
                    <p className="font-bold text-sm">
                      {activeInfoWindow.type === 'task' 
                        ? tasks.find(t => t.id === activeInfoWindow.id)?.title 
                        : volunteers.find(v => v.id === activeInfoWindow.id)?.name
                      }
                    </p>
                    <p className="text-xs text-gray-600">
                      {activeInfoWindow.type === 'task' 
                        ? tasks.find(t => t.id === activeInfoWindow.id)?.status 
                        : (volunteers.find(v => v.id === activeInfoWindow.id)?.availability ? 'Available' : 'Busy')
                      }
                    </p>
                  </div>
                </InfoWindow>
              )}
            </GoogleMap>
          ) : (
            <div className="flex items-center justify-center h-full bg-[#121212] text-muted-foreground gap-2">
              <Loader2 className="w-5 h-5 animate-spin" /> Loading Google Maps…
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
