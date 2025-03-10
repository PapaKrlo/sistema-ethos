import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../_components/ui/dialog";
import { Button } from "../../_components/ui/button";
import { useRouter } from 'next/navigation';
import { useAuth } from '../../_lib/auth/AuthContext';

export function ContactInfoReminder() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  useEffect(() => {
    // Verificar si es la primera vez que el usuario inicia sesión
    const hasSeenReminder = localStorage.getItem('hasSeenContactReminder');
    
    if (!hasSeenReminder && user?.perfil_cliente) {
      setIsOpen(true);
      localStorage.setItem('hasSeenContactReminder', 'true');
    }
  }, [user]);

  const handleComplete = () => {
    router.push('/dashboard/perfil');
    setIsOpen(false);
  };

  const handleLater = () => {
    setIsOpen(false);
  };

  // No renderizar nada si no es un perfil cliente
  if (!user?.perfil_cliente) {
    return null;
  }

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Información de contacto</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          <p className="text-sm text-gray-500">
            ¿Te gustaría configurar tu información de contacto ahora?
          </p>
        </div>
        <DialogFooter className="flex gap-2">
          <Button
            variant="outline"
            onClick={handleLater}
          >
            Lo haré luego
          </Button>
          <Button
            onClick={handleComplete}
            className="bg-[#008A4B] text-white hover:bg-[#006837]"
          >
            Configurar ahora
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
} 