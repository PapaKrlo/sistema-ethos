"use client";

import PropiedadesAlquiler from "../../_components/shared/PropiedadesAlquiler";
import RoleProtectedRoute from "../_components/RoleProtectedRoute";

export default function MisPropiedadesPage() {
  return (
    <RoleProtectedRoute allowedRoles={["Propietario"]}>
      <PropiedadesAlquiler tipoVista="propiedades" />
    </RoleProtectedRoute>
  );
} 