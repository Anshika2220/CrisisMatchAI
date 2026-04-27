import React, { useState } from 'react';
import { addVolunteer } from '../services/api';
import { useNavigate } from 'react-router-dom';
import { MapPin, Loader2 } from 'lucide-react';

const AddVolunteer = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    skills: ''
  });
  const [coords, setCoords] = useState(null); // { lat, lng }
  const [isLocating, setIsLocating] = useState(false);
  const [isGeocoding, setIsGeocoding] = useState(false);
  const [locationStatus, setLocationStatus] = useState(''); // feedback text

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    // Clear auto-detected coords if user manually edits address
    if (e.target.name === 'address') {
      setCoords(null);
      setLocationStatus('');
    }
  };

  // Auto-detect via GPS → reverse geocode to a human-readable address
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
        // Reverse geocode with Nominatim (free, no key needed)
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
      // Try to geocode the typed address
      location = await geocodeAddress(formData.address);
      if (!location) {
        alert('Could not find coordinates for that address. Please use "Auto-Detect My Location" or enter a more specific address.');
        return;
      }
    }

    try {
      const volPayload = {
        name: formData.name,
        location,
        skills: formData.skills.split(',').map(s => s.trim()).filter(s => s),
        availability: true
      };
      await addVolunteer(volPayload);
      navigate('/');
    } catch (error) {
      alert('Error adding volunteer: ' + error.message);
    }
  };

  return (
    <div className="max-w-2xl mx-auto bg-card border border-border p-8 rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold mb-6 text-foreground">Register as Volunteer</h2>
      <form onSubmit={handleSubmit} className="space-y-6">

        {/* Name */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Full Name</label>
          <input
            type="text" name="name" required value={formData.name} onChange={handleChange}
            className="w-full p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
            placeholder="John Doe"
          />
        </div>

        {/* Address */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">
            Your Location / Address
          </label>
          <div className="relative">
            <MapPin className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <input
              type="text" name="address" required value={formData.address} onChange={handleChange}
              className="w-full pl-9 p-2 border border-border rounded-md bg-background focus:ring-2 focus:ring-primary focus:outline-none"
              placeholder="e.g. 123 Main St, New York, NY"
            />
          </div>
          {locationStatus && (
            <p className="text-xs text-primary mt-1">{locationStatus}</p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Enter your address manually or use the button below to auto-detect.
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

        {/* Skills */}
        <div>
          <label className="block text-sm font-medium text-foreground mb-1">Skills (comma separated)</label>
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
          ) : 'Register'}
        </button>
      </form>
    </div>
  );
};

export default AddVolunteer;
