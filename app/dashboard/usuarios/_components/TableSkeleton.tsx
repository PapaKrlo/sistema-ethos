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
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden sm:block">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden md:block">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider hidden lg:block">
          <Skeleton className="h-4 w-full" />
        </div>
        <div className="text-xs font-medium text-gray-500 uppercase tracking-wider text-center hidden xl:block">
          <Skeleton className="h-4 w-24 mx-auto" />
        </div>
      </div>
      
      {/* Filas de tabla */}
      {skeletonRows.map((index) => (
        <div 
          key={index}
          className="px-6 py-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 w-full"
        >
          <div>
            <div className="flex items-center">
              <Skeleton className="h-8 w-8 rounded-full flex-shrink-0" />
              <div className="ml-3 flex-1">
                <Skeleton className="h-5 w-24" />
              </div>
            </div>
          </div>
          
          <div className="hidden sm:block">
            <div className="flex items-center">
              <Skeleton className="h-4 w-4 mr-1 flex-shrink-0" />
              <Skeleton className="h-4 w-32 flex-1" />
            </div>
          </div>
          
          <div className="hidden md:block">
            <Skeleton className="h-5 w-20" />
          </div>
          
          <div className="hidden lg:block">
            <Skeleton className="h-5 w-28" />
            <Skeleton className="h-4 w-36 mt-1" />
          </div>
          
          <div className="hidden xl:flex justify-center items-center">
            <Skeleton className="h-6 w-20 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
} 