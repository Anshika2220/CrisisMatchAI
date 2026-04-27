import React, { useState } from 'react';
import { addTask } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { MapPin, Loader2 } from 'lucide-react';

const AddTask = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    address: '',
    urgencyScore: 3,
    skills: ''
  });
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState('');

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (e.target.name === 'address') {
      setCoords(null);
      setLocationStatus('');
    }
  };

  // Auto-detect via GPS → reverse geocode to human-readable address
  const handleGetLocation = () => {
    if (!navigator.geolocation) {
      alert('Geolocation is not supported by your browser');
      return;
    }
    setIsLocating(true);
    setLocationStatus('Detecting your location…');
    navigator.geolocation.getCurrentPosition(
      async (position) => {
        const { latitude, longitude } = position.coords;
        setCoords({ lat: latitude, lng: longitude });
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`,
            { headers: { 'Accept-Language': 'en' } }
          );
          const data = await res.json();
          const address = data.display_name || `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`;
          setFormData(prev => ({ ...prev, address }));
          setLocationStatus('📍 Location detected');
        } catch {
          setFormData(prev => ({
            ...prev,
            address: `${latitude.toFixed(5)}, ${longitude.toFixed(5)}`
          }));
          setLocationStatus('📍 Location detected (coordinates)');
        }
        setIsLocating(false);
      },
      (error) => {
        alert('Unable to retrieve your location: ' + error.message);
        setIsLocating(false);
        setLocationStatus('');
      }
    );
  };

  // Forward geocode a typed address → lat/lng via Nominatim
  const geocodeAddress = async (address) => {
    setIsGeocoding(true);
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(address)}&format=json&limit=1`,
        { headers: { 'Accept-Language': 'en' } }
      );
      const data = await res.json();
      if (data.length > 0) {
        return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
      }
    } catch (e) {
      console.error('Geocoding failed:', e);
    } finally {
      setIsGeocoding(false);
    }
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    let location = coords;

    if (!location) {
      location = await geocodeAddress(formData.address);
      if (!location) {
        alert('Could not find coordinates for that address. Please use "Auto-Detect My Location" or enter a more specific address.');
        return;
      }
    }

    try {
      const taskPayload = {
        title: formData.title,
        description: formData.description,
        location,
        urgencyScore: parseInt(formData.urgencyScore),
        requiredSkills: formData.skills.split(',').map(s => s.trim()).filter(s => s)
      };
      await addTask(taskPayload);
      navigate('/');
    } catch (error) {
      alert('Error adding task: ' + error.message);
    }
  };

  const urgencyLabels = { 1: 'Minimal', 2: 'Low', 3: 'Medium', 4: 'High', 5: 'Critical' };
  const urgencyColors = { 1: 'text-gray-400', 2: 'text-blue-400', 3: 'text-yellow-400', 4: 'text-orange-400', 5: 'text-red-400' };

  return (
    <div className="max-w-2xl mx-auto bg-card border border-border p-8 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-2 text-foreground">Report a Crisis</h2>
      <p className="text-muted-foreground text-sm mb-6">Provide details about the situation so we can match the right volunteers.</p>

      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Title */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Crisis Title</label>
          <input
            type="text" name="title" required value={formData.title} onChange={handleChange}
            className="w-full p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="e.g. Medical assistance needed at shelter"
          />
        </div>

        {/* Description */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Description</label>
          <textarea
            name="description" required value={formData.description} onChange={handleChange} rows="3"
            className="w-full p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none resize-none"
            placeholder="Describe the situation in detail…"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Crisis Location / Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" name="address" required value={formData.address} onChange={handleChange}
              className="w-full pl-9 p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="e.g. 456 Oak Avenue, Chicago, IL"
            />
          </div>
          {locationStatus && (
            <p className="text-xs text-primary mt-1">{locationStatus}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Enter the address of the crisis or use the button below to use your current location.
          </p>
        </div>

        {/* Auto-detect button */}
        <button
          type="button"
          onClick={handleGetLocation}
          disabled={isLocating}
          className="w-full flex items-center justify-center gap-2 bg-secondary text-secondary-foreground py-2 rounded-md text-sm font-medium hover:bg-secondary/80 transition-colors disabled:opacity-60"
        >
          {isLocating ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Detecting location…</>
          ) : (
            '📍 Auto-Detect My Location'
          )}
        </button>

        {/* Urgency slider */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-2">
            Urgency Level —{' '}
            <span className={`font-bold ${urgencyColors[formData.urgencyScore]}`}>
              {urgencyLabels[formData.urgencyScore]}
            </span>
          </label>
          <input
            type="range" name="urgencyScore" min="1" max="5" step="1"
            value={formData.urgencyScore} onChange={handleChange}
            className="w-full accent-primary cursor-pointer"
          />
          <div className="flex justify-between text-xs text-muted-foreground mt-1">
            <span>1 – Minimal</span>
            <span>3 – Medium</span>
            <span>5 – Critical</span>
          </div>
        </div>

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Required Skills (comma separated)</label>
          <input
            type="text" name="skills" value={formData.skills} onChange={handleChange}
            className="w-full p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="e.g. First Aid, Driving, Translation"
          />
        </div>

        <button
          type="submit"
          disabled={isGeocoding}
          className="w-full flex items-center justify-center gap-2 bg-primary text-primary-foreground py-3 rounded-md font-medium hover:bg-primary/90 transition-colors disabled:opacity-60"
        >
          {isGeocoding ? (
            <><Loader2 className="w-4 h-4 animate-spin" /> Finding location…</>
          ) : 'Submit Crisis Report'}
        </button>
      </form>
    </div>
  );
};

export default AddTask;
