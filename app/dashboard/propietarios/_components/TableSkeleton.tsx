import React from 'react';
import { Skeleton } from "@/_components/ui/skeleton";

interface TableSkeletonProps {
  mode: 'properties' | 'owners';
  rows?: number;
}

export function TableSkeleton({ mode, rows = 6 }: TableSkeletonProps) {
  // Crear array de filas basado en el número solicitado
  const skeletonRows = Array.from({ length: rows }, (_, i) => i);
  
  return (
    <div className="bg-white rounded-lg shadow overflow-hidden">
      {/* Cabecera de tabla */}
      <div className="border-b border-gray-200 bg-gray-50 px-6 py-3 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
        {mode === 'properties' ? (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full hidden md:block" />
            <Skeleton className="h-4 w-full hidden lg:block" />
            <Skeleton className="h-4 w-full hidden xl:block" />
          </>
        ) : (
          <>
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full hidden md:block" />
            <Skeleton className="h-4 w-full hidden lg:block" />
            <Skeleton className="h-4 w-32 hidden xl:block" />
          </>
        )}
      </div>
      
      {/* Filas de tabla */}
      {skeletonRows.map((index) => (
        <div 
          key={index}
          className="px-6 py-4 border-b border-gray-200 grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4"
        >
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2 hidden md:block">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="space-y-2 hidden lg:block">
            <Skeleton className="h-5 w-3/4" />
            <Skeleton className="h-4 w-1/2" />
          </div>
          <div className="flex justify-end items-center xl:flex">
            <Skeleton className="h-8 w-8 rounded-full" />
          </div>
        </div>
      ))}
    </div>
  );
} 