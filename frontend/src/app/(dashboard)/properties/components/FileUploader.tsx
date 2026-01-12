'use client';

import { useState, useRef } from 'react';
import { FileVideo, Image as ImageIcon, Loader2 } from 'lucide-react';
import { PropertiesService } from '@/services/properties.service';

interface FileUploaderProps {
  accept: string; // 'image/*' or 'video/*' or both
  onUpload: (url: string, type: 'image' | 'video' | 'document', videoId?: string) => void;
  label?: string;
  maxSizeMB?: number;
}

export function FileUploader({ accept, onUpload, label = 'Subir archivo', maxSizeMB = 10 }: FileUploaderProps) {
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > maxSizeMB * 1024 * 1024) {
      setError(`El archivo es demasiado grande (Máx ${maxSizeMB}MB)`);
      return;
    }

    setError(null);
    setUploading(true);

    try {
      if (file.type.startsWith('video/')) {
        const result = await PropertiesService.uploadVideo(file);
        onUpload(result.url, 'video', result.videoId);
      } else {
        const result = await PropertiesService.uploadFile(file);
        onUpload(result.url, result.type as 'image' | 'document');
      }
    } catch (err) {
      console.error(err);
      setError('Error al subir el archivo. Inténtalo de nuevo.');
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  };

  return (
    <div className="w-full">
      <div 
        className="border-2 border-dashed border-white/20 rounded-lg p-6 flex flex-col items-center justify-center cursor-pointer hover:border-white/40 transition-colors bg-white/5"
        onClick={() => !uploading && inputRef.current?.click()}
      >
        {uploading ? (
          <Loader2 className="w-8 h-8 text-blue-500 animate-spin mb-2" />
        ) : (
          <>
            {accept.includes('video') ? <FileVideo className="w-8 h-8 text-gray-400 mb-2" /> : <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />}
          </>
        )}
        <span className="text-sm text-gray-400">{uploading ? 'Subiendo...' : label}</span>
        <input 
          ref={inputRef}
          type="file" 
          className="hidden" 
          accept={accept} 
          onChange={handleFileChange}
          disabled={uploading}
        />
      </div>
      {error && <p className="text-red-500 text-xs mt-2">{error}</p>}
    </div>
  );
}
