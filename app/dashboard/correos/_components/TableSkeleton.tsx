import React from 'react';
import { Skeleton } from "../../../_components/ui/skeleton";

interface TableSkeletonProps {
  rows?: number;
}

export function TableSkeleton({ rows = 6 }: TableSkeletonProps) {
  // Crear array de filas basado en el número solicitado
  const skeletonRows = Array.from({ length: rows }, (_, i) => i);
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden w-full">
      {/* Cabecera de tabla */}
      <div className="px-6 py-3 flex border-b">
        <div className="w-[220px] text-xs font-medium text-gray-500 uppercase tracking-wider">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="flex-1 text-xs font-medium text-gray-500 uppercase tracking-wider">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="w-[400px] text-xs font-medium text-gray-500 uppercase tracking-wider text-center">
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
        <div className="w-[180px] text-xs font-medium text-gray-500 uppercase tracking-wider text-right">
          <Skeleton className="h-4 w-24 ml-auto" />
        </div>
      </div>
      
      {/* Filas de tabla */}
      {skeletonRows.map((index) => (
        <div 
          key={index}
          className="px-6 py-4 border-b border-gray-200 flex items-center hover:bg-gray-50 w-full"
        >
          <div className="w-[220px]">
            <div>
              <Skeleton className="h-5 w-32" />
              <Skeleton className="h-4 w-24 mt-1" />
            </div>
          </div>
          
          <div className="flex-1">
            <div className="flex flex-col">
              <Skeleton className="h-5 w-3/4" />
              <Skeleton className="h-4 w-1/2 mt-1" />
            </div>
          </div>
          
          <div className="w-[400px] text-center">
            <Skeleton className="h-4 w-32 mx-auto" />
          </div>
          
          <div className="w-[180px] flex justify-end gap-2">
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
} 