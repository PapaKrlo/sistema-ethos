import React from 'react';
import { SkeletonCard } from "../../proyectos/[projectId]/_components/SkeletonCard";

interface SkeletonProjectListProps {
  count: number;
}

export function SkeletonProjectList({ count }: SkeletonProjectListProps) {
  // Crear un array basado en el conteo proporcionado
  const skeletons = Array.from({ length: count }, (_, index) => index);
  
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
      {skeletons.map((index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
} 