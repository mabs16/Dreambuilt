'use client';

import { useEffect } from 'react';
import { MapContainer, TileLayer, Marker, useMapEvents, useMap } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default marker icon missing in React Leaflet
// @ts-expect-error - Fix for Leaflet icon issue
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
});

interface MapPickerProps {
  lat: number;
  lng: number;
  onChange?: (lat: number, lng: number) => void;
  theme?: 'light' | 'dark';
  zoom?: number;
  cooperativeGestures?: boolean;
}

function CooperativeGesturesHandler() {
  const map = useMap();

  useEffect(() => {
    map.scrollWheelZoom.disable();
    map.dragging.disable();

    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length > 1) {
        map.dragging.enable();
      } else {
        map.dragging.disable();
      }
    };

    const container = map.getContainer();
    // Allow vertical scroll on mobile when dragging is disabled
    if (L.Browser.mobile) {
      container.style.touchAction = 'pan-y';
    }
    
    container.addEventListener('touchstart', handleTouchStart, { capture: true });

    return () => {
      container.removeEventListener('touchstart', handleTouchStart, { capture: true });
      map.dragging.enable();
      map.scrollWheelZoom.enable();
      container.style.touchAction = '';
    };
  }, [map]);

  return null;
}

function LocationMarker({ position, onChange, zoom }: { position: [number, number]; onChange?: (lat: number, lng: number) => void; zoom?: number }) {
  const map = useMapEvents({
    click(e) {
      if (onChange) {
        onChange(e.latlng.lat, e.latlng.lng);
        map.flyTo(e.latlng, map.getZoom());
      }
    },
  });

  useEffect(() => {
    map.flyTo(position, zoom || map.getZoom());
  }, [position, map, zoom]);

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ lat, lng, onChange, theme = 'light', zoom = 13, cooperativeGestures = false }: MapPickerProps) {
  // Default to Mexico City if 0,0 provided or invalid
  const center: [number, number] = lat && lng ? [lat, lng] : [19.4326, -99.1332];

  const tileLayerUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const attribution = theme === 'dark'
    ? '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors &copy; <a href="https://carto.com/attributions">CARTO</a>'
    : '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors';

  return (
    <div className="h-full w-full z-0">
      <MapContainer 
        center={center} 
        zoom={zoom} 
        scrollWheelZoom={!cooperativeGestures} 
        style={{ height: '100%', width: '100%' }}
        attributionControl={false}
      >
        <TileLayer
          attribution={attribution}
          url={tileLayerUrl}
        />
        <LocationMarker position={center} onChange={onChange} zoom={zoom} />
        {cooperativeGestures && <CooperativeGesturesHandler />}
      </MapContainer>
    </div>
  );
}
