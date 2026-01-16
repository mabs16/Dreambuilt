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
  viewLat?: number;
  viewLng?: number;
  onChange?: (lat: number, lng: number) => void;
  onZoomChange?: (zoom: number) => void;
  onViewChange?: (lat: number, lng: number) => void;
  theme?: 'light' | 'dark';
  zoom?: number;
  cooperativeGestures?: boolean;
}

function MapEventsHandler({ onZoomChange, onViewChange }: { onZoomChange?: (zoom: number) => void, onViewChange?: (lat: number, lng: number) => void }) {
  const map = useMapEvents({
    zoomend: () => {
      if (onZoomChange) {
        onZoomChange(map.getZoom());
      }
    },
    moveend: () => {
      if (onViewChange) {
        const center = map.getCenter();
        onViewChange(center.lat, center.lng);
      }
    }
  });
  return null;
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

function LocationMarker({ position, onChange }: { position: [number, number]; onChange?: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      if (onChange) {
        onChange(e.latlng.lat, e.latlng.lng);
        // Opcional: Centrar al hacer click. El usuario puede ajustar después.
        // map.flyTo(e.latlng, map.getZoom()); 
      }
    },
  });

  return position === null ? null : (
    <Marker position={position}></Marker>
  );
}

export default function MapPicker({ lat, lng, viewLat, viewLng, onChange, onZoomChange, onViewChange, theme = 'light', zoom = 13, cooperativeGestures = false }: MapPickerProps) {
  // Coordenadas del marcador
  const markerPosition: [number, number] = lat && lng ? [lat, lng] : [19.4326, -99.1332];
  
  // Centro inicial del mapa: Priorizar viewLat/viewLng, sino usar marcador
  const center: [number, number] = viewLat && viewLng ? [viewLat, viewLng] : markerPosition;

  const tileLayerUrl = theme === 'dark' 
    ? "https://{s}.basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}{r}.png"
    : "https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png";

  const tileLayerClass = theme === 'dark' ? 'map-tiles-blue-water' : '';

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
          className={tileLayerClass}
        />
        <LocationMarker position={markerPosition} onChange={onChange} />
        <MapEventsHandler onZoomChange={onZoomChange} onViewChange={onViewChange} />
        {cooperativeGestures && <CooperativeGesturesHandler />}
      </MapContainer>
    </div>
  );
}
