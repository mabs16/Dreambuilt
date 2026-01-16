'use client';

import dynamic from 'next/dynamic';

const MapPicker = dynamic(() => import('../../(dashboard)/properties/components/MapPicker'), {
  ssr: false,
  loading: () => <div className="h-full w-full bg-gray-100 animate-pulse rounded-xl" />
});

interface ClientMapProps {
  lat: number;
  lng: number;
  viewLat?: number;
  viewLng?: number;
  theme?: 'light' | 'dark';
  zoom?: number;
  cooperativeGestures?: boolean;
}

export default function ClientMap({ lat, lng, viewLat, viewLng, theme = 'light', zoom, cooperativeGestures = true }: ClientMapProps) {
  return <MapPicker lat={lat} lng={lng} viewLat={viewLat} viewLng={viewLng} theme={theme} zoom={zoom} cooperativeGestures={cooperativeGestures} />;
}
