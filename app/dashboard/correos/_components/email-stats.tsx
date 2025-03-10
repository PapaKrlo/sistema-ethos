"use client";

import { Card, CardContent } from "../../../_components/ui/card";
import { AlertCircle, CheckCircle, InfoIcon } from "lucide-react";

interface StatsProps {
  stats: {
    necesitaAtencion: number;
    informativo: number;
    respondido: number;
  };
}

export function EmailStats({ stats }: StatsProps) {
  return (
    <div className="grid gap-4 md:grid-cols-3">
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-red-100 rounded-full">
              <AlertCircle className="h-6 w-6 text-red-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Necesita Atención</p>
              <h3 className="text-3xl font-bold">{stats.necesitaAtencion}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-blue-100 rounded-full">
              <InfoIcon className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Informativos</p>
              <h3 className="text-3xl font-bold">{stats.informativo}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
      
      <Card>
        <CardContent className="p-6">
          <div className="flex items-center space-x-4">
            <div className="p-2 bg-green-100 rounded-full">
              <CheckCircle className="h-6 w-6 text-green-600" />
            </div>
            <div>
              <p className="text-sm font-medium text-gray-500">Respondidos</p>
              <h3 className="text-3xl font-bold">{stats.respondido}</h3>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
} 