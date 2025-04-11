import { memo } from 'react';
import { motion } from 'framer-motion';
import Image from 'next/image';
import Link from 'next/link';
import { BuildingOffice2Icon, UserIcon } from "@heroicons/react/24/outline";
import { formatNumber } from "../../../../_lib/utils";
import type { Property } from '../../../../types';

interface PropertyCardProps {
  property: Property;
  projectId: string;
  projectImage?: string;
}

const PropertyCard = memo(function PropertyCard({ property, projectId, projectImage }: PropertyCardProps) {

  const getPropietarioNombre = () => {
    if (!property.ocupantes) return null;
    if (property.ocupantes[0]?.perfilCliente) {
      return property.ocupantes[0]?.perfilCliente.datosPersonaNatural?.razonSocial 
      ? property.ocupantes[0]?.perfilCliente?.datosPersonaNatural?.razonSocial 
      : property.ocupantes[0]?.perfilCliente?.datosPersonaJuridica?.razonSocial;
    }
    return property.ocupantes[0]?.datosPersonaNatural?.razonSocial 
      ? property.ocupantes[0]?.datosPersonaNatural?.razonSocial 
      : property.ocupantes[0]?.datosPersonaJuridica?.razonSocial;
  };

  const propietarioNombre = getPropietarioNombre();
  
  // Obtener identificadores seguros
  const getIdentificador = (tipo: 'superior' | 'idSuperior' | 'inferior' | 'idInferior') => {
    return property.identificadores?.[tipo] || '';
  };

  // Determinar el tipo de ocupación
  const tipoOcupacion = property.ocupantes?.some((ocupante: { tipoOcupante: string }) => 
    ocupante.tipoOcupante === "arrendatario"
  ) ? "Arrendado" : "Uso Propietario";

  const ocupacionClasses = tipoOcupacion === "Arrendado"
    ? "border border-orange-500 text-orange-700 bg-orange-50"
    : "border border-purple-500 text-purple-700 bg-purple-50";

  return (
    <Link 
      href={`/dashboard/proyectos/${projectId}/propiedades/${property.documentId}`}
    >
      <motion.div
        className="bg-white rounded-xl border overflow-hidden group cursor-pointer hover:scale-[1.02] transition-transform duration-200 h-full flex flex-col"
        initial={false}
      >
        <div className="relative h-48 bg-gray-100 flex-shrink-0">
          {projectImage ? (
            <Image
              src={projectImage}
              alt={`${getIdentificador('superior')} ${getIdentificador('idSuperior')}`}
              fill
              sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
              className="object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gray-50">
              <BuildingOffice2Icon className="w-16 h-16 text-gray-400" />
            </div>
          )}
          <div className="absolute top-4 left-4 z-10">
            <div className="bg-white/90 backdrop-blur-sm px-3 py-1.5 rounded-lg text-sm font-medium shadow-sm">
              {formatNumber(property.areaTotal, true)} m²
            </div>
          </div>
        </div>
        <div className="p-4 flex-grow flex flex-col">
          {/* Header con identificadores y pill */}
          <div className="flex items-start justify-between mb-1.5">
            <div>
              <h3 className="font-semibold text-gray-900 group-hover:text-[#008A4B] transition-colors truncate">
              {getIdentificador('inferior')} {getIdentificador('idInferior')}
              </h3>
              <p className="text-sm text-gray-500 truncate">
                {getIdentificador('superior')} {getIdentificador('idSuperior')}
              </p>
            </div>
            <div className="flex-shrink-0 ml-2">
              <span className={`px-2 py-1 rounded-full text-xs font-medium whitespace-nowrap ${ocupacionClasses}`}>
                {tipoOcupacion}
              </span>
            </div>
          </div>
          
          {/* Propietario y actividad */}
          <div className="flex-grow flex flex-col">
            {propietarioNombre ? (
              <div className="flex items-start mt-1 text-xs text-gray-600">
                <UserIcon className="w-3 h-3 mr-1 text-gray-500 flex-shrink-0 mt-0.5" />
                <span 
                  className="line-clamp-3" 
                  title={propietarioNombre}
                >
                  {propietarioNombre}
                </span>
              </div>
            ) : (
              // Espacio reservado cuando no hay propietario
              <div className="h-6"></div>
            )}
            {/* <p className="text-xs text-gray-400 mt-3 truncate">
              {property.actividad?.replaceAll("_", " ")}
            </p> */}
          </div>
        </div>
      </motion.div>
    </Link>
  );
});

export default PropertyCard; 