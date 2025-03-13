"use client";

import { useState } from "react";
import { Button } from "./ui/button";
import { DocumentIcon, EyeIcon } from "@heroicons/react/24/outline";
import { UploadButton } from "../utils/uploadthing";
import { gql, useMutation } from "@apollo/client";

const CREATE_ARCHIVO = gql`
  mutation CreateArchivo($data: ArchivoInput!) {
    createArchivo(data: $data) {
      documentId
      nombre
      url
      tipoArchivo
    }
  }
`;

interface SimpleDocumentUploadProps {
  onUploadComplete: (documentId: string, url: string, name: string) => void;
  currentDocument?: {
    url?: string;
    nombre?: string;
  };
  label?: string;
  onDelete?: () => void;
}

export function SimpleDocumentUpload({
  onUploadComplete,
  currentDocument,
  label = "documento",
  onDelete
}: SimpleDocumentUploadProps) {
  const [isUploading, setIsUploading] = useState(false);
  const [showUploadButton, setShowUploadButton] = useState(false);
  const [createArchivo] = useMutation(CREATE_ARCHIVO);

  const handleUploadComplete = async (res: { url: string; name: string }[]) => {
    try {
      const { data: archivoData } = await createArchivo({
        variables: {
          data: {
            nombre: res[0].name,
            url: res[0].url,
            tipoArchivo: "pdf",
            fechaSubida: new Date().toISOString()
          }
        }
      });

      console.log('Archivo creado:', archivoData);

      onUploadComplete(
        archivoData.createArchivo.documentId,
        res[0].url,
        res[0].name
      );
    } catch (error) {
      console.error('Error al crear archivo:', error);
    } finally {
      setIsUploading(false);
      setShowUploadButton(false);
    }
  };

  return (
    <div className="flex justify-center">
      {currentDocument?.url ? (
        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            className="flex items-center gap-2 text-blue-500 text-sm min-w-[100px] whitespace-nowrap px-3"
            onClick={() => window.open(currentDocument.url, "_blank")}
          >
            <EyeIcon className="w-5 h-5 text-blue-500 flex-shrink-0" />
            <span className="whitespace-nowrap">Ver {label}</span>
          </Button>

          {/* Menú de opciones */}
          <div className="relative group">
            <Button
              variant="ghost"
              className="text-gray-500 hover:text-gray-800"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 5v.01M12 12v.01M12 19v.01M12 6a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2zm0 7a1 1 0 110-2 1 1 0 010 2z" />
              </svg>
            </Button>
            <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all z-10">
              <div className="p-1">
                {!showUploadButton && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-xs text-gray-700 hover:bg-gray-100 rounded-md"
                    onClick={() => setShowUploadButton(true)}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                    </svg>
                    Cambiar documento
                  </button>
                )}
                
                {onDelete && (
                  <button 
                    className="flex w-full items-center px-4 py-2 text-xs text-red-600 hover:bg-gray-100 rounded-md"
                    onClick={onDelete}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Eliminar documento
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Botón de subida para reemplazar documento */}
          {showUploadButton && (
            <div className="absolute mt-2 bg-white rounded-lg shadow-lg p-4 z-20">
              <div className="mb-2 text-sm text-gray-600">Subir nuevo documento</div>
              <div className="relative">
                <UploadButton
                  endpoint="propertyDocument"
                  onUploadBegin={() => setIsUploading(true)}
                  onClientUploadComplete={handleUploadComplete}
                  onUploadError={(error: Error) => {
                    console.error('Error uploading:', error);
                    setIsUploading(false);
                    setShowUploadButton(false);
                  }}
                  appearance={{
                    button: `border border-gray-300 text-gray-700 hover:bg-gray-50 !text-[#008A4B] text-sm font-medium px-4 py-2 rounded-md transition-all flex items-center gap-2 ${
                      isUploading ? 'opacity-50 cursor-not-allowed' : ''
                    }`,
                    allowedContent: "hidden"
                  }}
                  content={{
                    button({ ready }) {
                      if (!ready) return 'Cargando...';
                      if (isUploading) {
                        return (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent" />
                            <span>Subiendo...</span>
                          </>
                        );
                      }
                      return (
                        <>
                          <DocumentIcon className="w-5 h-5" />
                          <span>Seleccionar archivo</span>
                        </>
                      );
                    }
                  }}
                />
              </div>
              
              {!isUploading && (
                <button
                  className="mt-2 text-sm text-gray-500 hover:text-gray-700"
                  onClick={() => setShowUploadButton(false)}
                >
                  Cancelar
                </button>
              )}
            </div>
          )}
        </div>
      ) : (
        <UploadButton
          endpoint="propertyDocument"
          onUploadBegin={() => setIsUploading(true)}
          onClientUploadComplete={handleUploadComplete}
          onUploadError={(error: Error) => {
            console.error('Error uploading:', error);
            setIsUploading(false);
          }}
          appearance={{
            button: `border border-gray-300 text-gray-700 hover:bg-gray-50 !text-[#008A4B] text-sm font-medium px-5 py-2.5 rounded-md transition-all flex items-center gap-3 min-h-[38px] min-w-[150px] w-full justify-center ${
              isUploading ? 'opacity-50 cursor-not-allowed' : ''
            }`,
            allowedContent: "hidden"
          }}
          content={{
            button({ ready }) {
              if (!ready) return 'Cargando...';
              if (isUploading) {
                return (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-2 border-gray-500 border-t-transparent flex-shrink-0" />
                    <span className="whitespace-nowrap">Subiendo...</span>
                  </>
                );
              }
              return (
                <>
                  <DocumentIcon className="w-5 h-5 flex-shrink-0" />
                  <span className="whitespace-nowrap">Subir {label}</span>
                </>
              );
            }
          }}
        />
      )}
    </div>
  );
}