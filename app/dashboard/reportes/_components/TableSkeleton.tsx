import React from 'react';
import { Skeleton } from "../../../_components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
  mode?: 'documentos' | 'general';
}

export function TableSkeleton({ rows = 8, mode = 'documentos' }: TableSkeletonProps) {
  // Crear array de filas basado en el número solicitado
  const skeletonRows = Array.from({ length: rows }, (_, i) => i);
  
  // Verificar el modo para determinar la estructura del skeleton
  if (mode === 'documentos') {
    return (
      <div className="w-full">
        {/* Header del reporte */}
        <div className="mb-6">
          <Skeleton className="h-8 w-48 mb-2" />
          <Skeleton className="h-4 w-64" />
        </div>
        
        {/* Filtros */}
        <div className="flex flex-wrap gap-4 mb-6">
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-40" />
          <Skeleton className="h-10 w-48" />
        </div>
        
        {/* Tabla */}
        <div className="bg-white rounded-lg shadow overflow-hidden w-full">
          {/* Cabecera de tabla */}
          <div className="px-6 py-3 flex border-b bg-gray-50">
            <div className="w-[30%] text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="w-[20%] text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-full" />
            </div>
            <div className="w-[15%] text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
              <Skeleton className="h-4 w-24 ml-auto" />
            </div>
          </div>
          
          {/* Filas de tabla */}
          {skeletonRows.map((index) => (
            <div 
              key={index}
              className="px-6 py-4 border-b border-gray-200 flex items-center hover:bg-gray-50 w-full"
            >
              <div className="w-[30%]">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2 mt-1" />
              </div>
              
              <div className="w-[20%]">
                <Skeleton className="h-5 w-full" />
              </div>
              
              <div className="w-[20%]">
                <Skeleton className="h-5 w-3/4" />
              </div>
              
              <div className="w-[15%]">
                <Skeleton className="h-5 w-16" />
              </div>
              
              <div className="w-[15%] flex justify-end gap-2">
                <Skeleton className="h-8 w-8 rounded-md" />
                <Skeleton className="h-8 w-8 rounded-md" />
              </div>
            </div>
          ))}
        </div>
        
        {/* Footer con paginación */}
        <div className="mt-4 flex justify-between items-center">
          <Skeleton className="h-4 w-40" />
          <div className="flex gap-2">
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
            <Skeleton className="h-8 w-8 rounded-md" />
          </div>
        </div>
      </div>
    );
  }
  
  // Para otros tipos de reportes (modo general)
  return (
    <div className="w-full">
      {/* Header del reporte */}
      <div className="mb-6">
        <Skeleton className="h-8 w-48 mb-2" />
        <Skeleton className="h-4 w-64" />
      </div>
      
      {/* Tabla simplificada */}
      <div className="bg-white rounded-lg shadow overflow-hidden w-full">
        {/* Cabecera de tabla */}
        <div className="grid grid-cols-4 gap-4 px-6 py-3 border-b bg-gray-50">
          {Array.from({ length: 4 }).map((_, idx) => (
            <div key={idx} className="text-xs font-medium text-gray-500 uppercase tracking-wider">
              <Skeleton className="h-4 w-full" />
            </div>
          ))}
        </div>
        
        {/* Filas de tabla */}
        {skeletonRows.map((index) => (
          <div 
            key={index}
            className="grid grid-cols-4 gap-4 px-6 py-4 border-b border-gray-200 hover:bg-gray-50 w-full"
          >
            {Array.from({ length: 4 }).map((_, idx) => (
              <div key={idx}>
                <Skeleton className="h-5 w-full" />
                {idx === 0 && <Skeleton className="h-4 w-1/2 mt-1" />}
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
} 