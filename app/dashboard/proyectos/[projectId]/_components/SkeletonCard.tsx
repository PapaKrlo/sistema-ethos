import React from 'react';
import { Skeleton } from "../../../../_components/ui/skeleton";

export function SkeletonCard() {
  return (
    <div className="bg-white rounded-xl border overflow-hidden h-full flex flex-col">
      <div className="relative h-48 bg-gray-100 flex-shrink-0">
        <Skeleton className="h-full w-full" />
        <div className="absolute top-4 left-4 z-10">
          <Skeleton className="h-6 w-20 rounded-lg" />
        </div>
      </div>
      <div className="p-4 flex-grow flex flex-col">
        <div className="flex items-start justify-between mb-1.5">
          <div className="w-3/4">
            <Skeleton className="h-5 w-32 mb-1" />
            <Skeleton className="h-4 w-28" />
          </div>
          <div className="flex-shrink-0 ml-2">
            <Skeleton className="h-6 w-24 rounded-full" />
          </div>
        </div>
        
        <div className="flex-grow flex flex-col">
          <div className="flex items-start mt-1">
            <Skeleton className="h-4 w-3 mr-1 mt-0.5" />
            <Skeleton className="h-4 w-40" />
          </div>
          <div className="mt-3">
            <Skeleton className="h-3 w-24" />
          </div>
        </div>
      </div>
    </div>
  );
}

export default SkeletonCard; 