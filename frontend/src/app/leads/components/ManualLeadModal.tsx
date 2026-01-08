import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Loader2 } from 'lucide-react';

interface ManualLeadModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

interface Advisor {
  id: number;
  name: string;
}

export function ManualLeadModal({ open, onClose, onSuccess }: ManualLeadModalProps) {
  const [loading, setLoading] = useState(false);
  const [advisors, setAdvisors] = useState<Advisor[]>([]);
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    context: '',
    source: 'MANUAL_INPUT',
    advisorId: '' // Empty string implies automatic assignment
  });

  useEffect(() => {
    if (open) {
      // Fetch advisors when modal opens
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      // Try with /api prefix first as per main.ts configuration
      fetch(`${apiUrl}/api/advisors`)
        .then(async (res) => {
            if (!res.ok) {
                // Fallback attempt without /api if prefix is not configured as expected
                const retry = await fetch(`${apiUrl}/advisors`);
                if (retry.ok) return retry.json();
                throw new Error('Failed to fetch advisors');
            }
            return res.json();
        })
        .then((data) => setAdvisors(data))
        .catch((err) => console.error('Error fetching advisors:', err));
    }
  }, [open]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);

    try {
      const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000';
      // Prepare payload
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const payload: any = { ...formData };
      if (payload.advisorId) {
        payload.advisorId = parseInt(payload.advisorId);
      } else {
        delete payload.advisorId; // Remove if empty string
      }

      const response = await fetch(`${apiUrl}/api/leads/manual`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) throw new Error('Error creating lead');
      
      onSuccess();
      onClose();
      setFormData({ name: '', phone: '', email: '', context: '', source: 'MANUAL_INPUT', advisorId: '' });
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
              <h2 className="text-xl font-bold text-white">Nuevo Lead Manual</h2>
              <button onClick={onClose} className="text-white/40 hover:text-white transition-colors">
                <X className="h-5 w-5" />
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Nombre</label>
                <input
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="Nombre completo"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Teléfono</label>
                <input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  required
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="521..."
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Asignación</label>
                <select
                  value={formData.advisorId}
                  onChange={(e) => setFormData({ ...formData, advisorId: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors [&>option]:bg-black"
                >
                  <option value="">🤖 Automática (Round Robin)</option>
                  {advisors.map((advisor) => (
                    <option key={advisor.id} value={advisor.id}>
                      👤 {advisor.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Email (Opcional)</label>
                <input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors"
                  placeholder="correo@ejemplo.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-white/60 uppercase tracking-wider">Contexto (IA)</label>
                <textarea
                  value={formData.context}
                  onChange={(e) => setFormData({ ...formData, context: e.target.value })}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-white placeholder:text-white/20 focus:outline-none focus:border-primary/50 transition-colors min-h-[100px] resize-none"
                  placeholder="Detalles clave para el resumen de IA..."
                />
              </div>

              <div className="pt-4 flex gap-3">
                <button
                  type="button"
                  onClick={onClose}
                  className="flex-1 px-4 py-3 rounded-xl bg-white/5 text-white/60 font-bold hover:bg-white/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 px-4 py-3 rounded-xl bg-primary text-primary-foreground font-bold hover:bg-primary/90 transition-colors flex items-center justify-center gap-2"
                >
                  {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                  Crear Lead
                </button>
              </div>
            </form>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
