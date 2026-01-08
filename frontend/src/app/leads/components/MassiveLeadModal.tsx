import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2, Upload, FileText } from 'lucide-react';

interface MassiveLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function MassiveLeadModal({ open, onClose, onSuccess }: MassiveLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [file, setFile] = useState<File | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file) return;

    setLoading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000'}/leads/upload-csv`, {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) throw new Error('Error uploading CSV');
      
      onSuccess();
      onClose();
      setFile(null);
    } catch (error) {
      console.error('Error:', error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
          />
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            className="fixed left-[50%] top-[50%] translate-x-[-50%] translate-y-[-50%] w-full max-w-md bg-[#0a0a0a] border border-white/10 rounded-2xl shadow-2xl z-50 p-6"
          >
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Carga Masiva (CSV)</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div 
                className={`border-2 border-dashed rounded-2xl p-8 flex flex-col items-center justify-center text-center transition-colors cursor-pointer
                  ${file ? 'border-primary/50 bg-primary/5' : 'border-white/10 hover:border-white/20 hover:bg-white/5'}`}
              >
                <input 
                  type="file" 
                  accept=".csv"
                  onChange={handleFileChange}
                  className="hidden" 
                  id="csv-upload"
                />
                <label htmlFor="csv-upload" className="cursor-pointer w-full h-full flex flex-col items-center">
                  {file ? (
                    <>
                      <FileText className="h-10 w-10 text-primary mb-3" />
                      <p className="text-sm font-bold text-white">{file.name}</p>
                      <p className="text-xs text-white/40 mt-1">{(file.size / 1024).toFixed(2)} KB</p>
                    </>
                  ) : (
                    <>
                      <Upload className="h-10 w-10 text-white/20 mb-3" />
                      <p className="text-sm font-bold text-white">Click para seleccionar CSV</p>
                      <p className="text-xs text-white/40 mt-1">Formato: Nombre, Telefono, Email, Contexto</p>
                    </>
                  )}
                </label>
              </div>

              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading || !file}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Subir Leads
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
