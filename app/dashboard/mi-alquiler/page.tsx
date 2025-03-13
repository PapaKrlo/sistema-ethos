"use client";

import PropiedadesAlquiler from "../../_components/shared/PropiedadesAlquiler";
import RoleProtectedRoute from "../_components/RoleProtectedRoute";

export default function MiAlquilerPage() {
  return (
    <RoleProtectedRoute allowedRoles={["Arrendatario"]}>
      <PropiedadesAlquiler tipoVista="alquiler" />
    </RoleProtectedRoute>
  );
} 