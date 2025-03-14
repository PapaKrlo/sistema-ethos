import { useEffect, useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "../../_components/ui/dialog";
import { Button } from "../../_components/ui/button";
import { useRouter } from 'next/navigation';
import { useAuth } from '../../_lib/auth/AuthContext';
import { gql, useQuery } from '@apollo/client';

interface ContactoAccesos {
  nombreCompleto?: string;
  telefono?: string;
  email?: string;
}

interface OtrosContactos {
  telefono?: string;
  email?: string;
}

interface PerfilCliente {
  id: number;
  documentId: string;
  rol: "Propietario" | "Arrendatario";
  tipoPersona: "Natural" | "Juridica";
  esEmpresaRepresentante: boolean;
  contactoAccesos?: ContactoAccesos;
  contactoAdministrativo?: OtrosContactos;
  contactoGerente?: OtrosContactos;
  contactoProveedores?: OtrosContactos;
}

const GET_PERFIL_CLIENTE = gql`
  query GetPerfilCliente($documentId: ID!) {
    perfilCliente(documentId: $documentId) {
      documentId
      tipoPersona
      rol
      contactoAccesos {
        nombreCompleto
        telefono
        email
      }
      contactoAdministrativo {
        telefono
        email
      }
      contactoGerente {
        telefono
        email
      }
      contactoProveedores {
        telefono
        email
      }
    }
  }
`;

export function ContactInfoReminder() {
  const [isOpen, setIsOpen] = useState(false);
  const router = useRouter();
  const { user } = useAuth();

  // Consulta para obtener la información completa del perfil cliente
  const { data: perfilData } = useQuery(GET_PERFIL_CLIENTE, {
    variables: { documentId: user?.perfil_cliente?.documentId },
    skip: !user?.perfil_cliente?.documentId
  });

  useEffect(() => {
    // Solo mostrar para perfiles cliente
    if (!user?.perfil_cliente || !perfilData?.perfilCliente) {
      return;
    }

    const perfilCliente = perfilData.perfilCliente;

    // Verificar si tiene todos los contactos completos
    const isContactoAccesosComplete = perfilCliente.contactoAccesos?.nombreCompleto && 
                                   perfilCliente.contactoAccesos?.telefono && 
                                   perfilCliente.contactoAccesos?.email;
                                   
    const isContactoAdministrativoComplete = perfilCliente.contactoAdministrativo?.telefono && 
                                         perfilCliente.contactoAdministrativo?.email;
                                         
    const isContactoGerenteComplete = perfilCliente.contactoGerente?.telefono && 
                                   perfilCliente.contactoGerente?.email;
                                   
    const isContactoProveedoresComplete = perfilCliente.contactoProveedores?.telefono && 
                                       perfilCliente.contactoProveedores?.email;

    // Si alguno de los contactos no está completo, mostrar el recordatorio
    if (!isContactoAccesosComplete || 
        !isContactoAdministrativoComplete || 
        !isContactoGerenteComplete || 
        !isContactoProveedoresComplete) {
      setIsOpen(true);
    }
  }, [user, perfilData]);

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
            Para una mejor experiencia, necesitamos que completes toda tu información de contacto.
          </p>
          {perfilData?.perfilCliente && (
            <div className="mt-3 text-xs text-gray-600">
              <p>Estado de tus contactos:</p>
              <ul className="mt-1 list-disc list-inside space-y-1">
                <li className={perfilData.perfilCliente.contactoAccesos?.nombreCompleto && 
                              perfilData.perfilCliente.contactoAccesos?.telefono && 
                              perfilData.perfilCliente.contactoAccesos?.email ? "text-green-600" : "text-red-600"}>
                  Contacto de accesos: {perfilData.perfilCliente.contactoAccesos?.nombreCompleto && 
                                    perfilData.perfilCliente.contactoAccesos?.telefono && 
                                    perfilData.perfilCliente.contactoAccesos?.email ? "Completo" : "Incompleto"}
                </li>
                <li className={perfilData.perfilCliente.contactoAdministrativo?.telefono && 
                              perfilData.perfilCliente.contactoAdministrativo?.email ? "text-green-600" : "text-red-600"}>
                  Contacto administrativo: {perfilData.perfilCliente.contactoAdministrativo?.telefono && 
                                         perfilData.perfilCliente.contactoAdministrativo?.email ? "Completo" : "Incompleto"}
                </li>
                <li className={perfilData.perfilCliente.contactoGerente?.telefono && 
                              perfilData.perfilCliente.contactoGerente?.email ? "text-green-600" : "text-red-600"}>
                  Contacto gerente: {perfilData.perfilCliente.contactoGerente?.telefono && 
                                  perfilData.perfilCliente.contactoGerente?.email ? "Completo" : "Incompleto"}
                </li>
                <li className={perfilData.perfilCliente.contactoProveedores?.telefono && 
                              perfilData.perfilCliente.contactoProveedores?.email ? "text-green-600" : "text-red-600"}>
                  Contacto proveedores: {perfilData.perfilCliente.contactoProveedores?.telefono && 
                                      perfilData.perfilCliente.contactoProveedores?.email ? "Completo" : "Incompleto"}
                </li>
              </ul>
            </div>
          )}
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