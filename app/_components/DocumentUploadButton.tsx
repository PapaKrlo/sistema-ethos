"use client";

import { useState, useEffect } from "react";
import { Button } from "./ui/button";
import { DocumentArrowDownIcon, DocumentArrowUpIcon, CheckCircleIcon, XCircleIcon } from "@heroicons/react/24/outline";
import { UploadButton } from "../utils/uploadthing";
import type { OurFileRouter } from "../api/uploadthing/core";
import { EyeIcon, EllipsisHorizontalIcon } from "@heroicons/react/24/outline";

interface DocumentUploadButtonProps {
  documentType: string;
  propertyId: string;
  onUploadComplete: (url: string, name: string) => Promise<void>;
  disabled?: boolean;
  currentDocument?: {
    url?: string;
    nombre?: string;
    fechaSubida?: string;
    id: string;
  };
  uploadId?: string; // Identificador único para cada botón de upload
  onDeleteDocument?: () => void;
}

export function DocumentUploadButton({
  documentType,
  propertyId,
  onUploadComplete,
  disabled,
  currentDocument,
  uploadId = Math.random().toString(36).substring(7),
  onDeleteDocument
}: DocumentUploadButtonProps) {
  const [uploadStatus, setUploadStatus] = useState<'idle' | 'uploading' | 'success' | 'error'>('idle');
  const [showFeedback, setShowFeedback] = useState(false);
  const [showUploadButton, setShowUploadButton] = useState(false);

  const handleUploadComplete = async (res: { url: string; name: string }[]) => {
    try {
      setUploadStatus('uploading');
      setShowFeedback(true);
      
      await onUploadComplete(res[0].url, res[0].name);
      
      setUploadStatus('success');
      setShowUploadButton(false);
    } catch (error) {
      console.error('Error en la subida:', error);
      setUploadStatus('error');
      setTimeout(() => {
        setShowFeedback(false);
        setUploadStatus('idle');
      }, 3000);
    }
  };

  useEffect(() => {
    if (currentDocument?.url && uploadStatus === 'success') {
      setTimeout(() => {
        setShowFeedback(false);
        setUploadStatus('idle');
      }, 1000);
    }
  }, [currentDocument, uploadStatus]);

  return (
    <div className="flex items-center justify-between p-4 border rounded-lg">
      <div className="flex items-center gap-3">
        <DocumentArrowDownIcon className="w-6 h-6 text-gray-500" />
        <div>
          <h4 className="text-base font-semibold text-gray-900">
            {documentType}
          </h4>
          {currentDocument?.url ? (
            <p className="text-sm text-gray-500">
              {currentDocument.nombre}
              {currentDocument.fechaSubida && 
                ` - Subido el ${new Date(currentDocument.fechaSubida).toLocaleDateString()}`
              }
            </p>
          ) : (
            <p className="text-sm text-amber-600">
              {uploadStatus === 'uploading' ? "Subiendo..." : 
               uploadStatus === 'success' ? "Procesando..." : 
               disabled ? "No disponible - Sin permisos de carga" :
               "Pendiente de subir"}
            </p>
          )}
        </div>
      </div>
      
      <div className="flex gap-2">
        {currentDocument?.url ? (
          <>
            <Button
              variant="ghost"
              className="text-[#008A4B] hover:text-[#006837]"
              onClick={() => window.open(currentDocument.url, "_blank")}
            >
              <DocumentArrowDownIcon className="w-4 h-4 mr-1" />
              Visualizar
            </Button>
            
            {/* Menú de opciones para el documento */}
            {!disabled && (
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
                        className="flex w-full items-center px-4 py-2 text-sm text-gray-700 hover:bg-gray-100 rounded-md"
                        onClick={() => {
                          setShowUploadButton(true);
                          setUploadStatus('idle');
                          setShowFeedback(false);
                        }}
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                        </svg>
                        Cambiar documento
                      </button>
                    )}
                    
                    {onDeleteDocument && (
                      <button 
                        className="flex w-full items-center px-4 py-2 text-sm text-red-600 hover:bg-gray-100 rounded-md"
                        onClick={onDeleteDocument}
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
            )}
          </>
        ) : disabled ? (
          <span className="text-xs text-gray-500 italic px-3 py-1.5 bg-gray-100 rounded-md">
            Solo lectura
          </span>
        ) : (
          <div className="relative">
            <UploadButton
              endpoint="propertyDocument"
              onClientUploadComplete={handleUploadComplete}
              onUploadError={(error: Error) => {
                console.error('Error uploading:', error);
                setUploadStatus('error');
                setShowFeedback(true);
                setTimeout(() => {
                  setShowFeedback(false);
                  setUploadStatus('idle');
                }, 3000);
              }}
              onUploadBegin={() => {
                setUploadStatus('uploading');
                setShowFeedback(true);
              }}
              appearance={{
                button: `border border-[#008A4B] !text-[#008A4B] hover:bg-[#008A4B] hover:!text-white text-sm font-medium px-5 py-2.5 rounded-md transition-all flex items-center gap-3 min-h-[38px] min-w-[120px] justify-center ${
                  uploadStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''
                }`,
                allowedContent: "hidden"
              }}
              content={{
                button({ ready }) {
                  if (ready) {
                    return (
                      <>
                        <DocumentArrowUpIcon className="w-4 h-4 flex-shrink-0" />
                        <span className="whitespace-nowrap">Subir archivo</span>
                      </>
                    );
                  }
                  return 'Cargando...';
                }
              }}
              disabled={uploadStatus !== 'idle'}
            />
            
            {showFeedback && (
              <div className={`
                absolute inset-0 flex items-center justify-center rounded-md
                ${uploadStatus === 'success' ? 'bg-green-50' : 
                  uploadStatus === 'error' ? 'bg-red-50' : 
                  'bg-gray-50'}
              `}>
                {uploadStatus === 'success' && (
                  <div className="flex items-center gap-2">
                    <CheckCircleIcon className="w-5 h-5 text-green-600" />
                    <span className="text-sm text-green-600">¡Subido!</span>
                  </div>
                )}
                {uploadStatus === 'error' && (
                  <div className="flex items-center gap-2">
                    <XCircleIcon className="w-5 h-5 text-red-600" />
                    <span className="text-sm text-red-600">Error al subir</span>
                  </div>
                )}
                {uploadStatus === 'uploading' && (
                  <div className="flex items-center gap-2">
                    <div className="w-5 h-5 border-2 border-[#008A4B] border-t-transparent rounded-full animate-spin" />
                    <span className="text-sm text-gray-600">Subiendo...</span>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Botón de subida para reemplazar documento existente */}
        {showUploadButton && currentDocument?.url && (
          <div className="fixed inset-0 flex items-center justify-center z-50">
            {/* Overlay oscuro de fondo */}
            <div 
              className="absolute inset-0 bg-black bg-opacity-30"
              onClick={() => setShowUploadButton(false)}
            ></div>
            
            {/* Modal de cambio de documento */}
            <div className="bg-white rounded-lg shadow-xl p-6 max-w-md w-full mx-4 relative z-10">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-medium text-gray-900">Subir nuevo documento</h3>
                <button 
                  className="text-gray-500 hover:text-gray-700"
                  onClick={() => setShowUploadButton(false)}
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
              </div>
              
              <div className="mb-4 text-sm text-gray-600">Selecciona un nuevo archivo para reemplazar el documento actual.</div>
              <div className="relative">
                <UploadButton
                  endpoint="propertyDocument"
                  onClientUploadComplete={handleUploadComplete}
                  onUploadError={(error: Error) => {
                    console.error('Error uploading:', error);
                    setUploadStatus('error');
                    setShowFeedback(true);
                    setTimeout(() => {
                      setShowFeedback(false);
                      setUploadStatus('idle');
                    }, 3000);
                  }}
                  onUploadBegin={() => {
                    setUploadStatus('uploading');
                    setShowFeedback(true);
                  }}
                  appearance={{
                    button: `border border-[#008A4B] !text-[#008A4B] hover:bg-[#008A4B] hover:!text-white text-sm font-medium px-5 py-2.5 rounded-md transition-all flex items-center gap-3 min-h-[38px] min-w-[190px] justify-center ${
                      uploadStatus !== 'idle' ? 'opacity-50 cursor-not-allowed' : ''
                    }`,
                    allowedContent: "hidden"
                  }}
                  content={{
                    button({ ready }) {
                      if (ready) {
                        if (uploadStatus === 'uploading') {
                          return (
                            <>
                              <div className="animate-spin rounded-full h-4 w-4 border-2 border-[#008A4B] border-t-transparent flex-shrink-0" />
                              <span className="whitespace-nowrap">Subiendo...</span>
                            </>
                          );
                        }
                        return (
                          <>
                            <DocumentArrowUpIcon className="w-4 h-4 flex-shrink-0" />
                            <span className="whitespace-nowrap">Seleccionar archivo</span>
                          </>
                        );
                      }
                      return 'Cargando...';
                    }
                  }}
                  disabled={uploadStatus !== 'idle'}
                />

                {showFeedback && (
                  <div className={`
                    absolute inset-0 flex items-center justify-center rounded-md
                    ${uploadStatus === 'success' ? 'bg-green-50' : 
                      uploadStatus === 'error' ? 'bg-red-50' : 
                      'bg-gray-50'}
                  `}>
                    {uploadStatus === 'success' && (
                      <div className="flex items-center gap-2">
                        <CheckCircleIcon className="w-5 h-5 text-green-600" />
                        <span className="text-sm text-green-600">¡Documento actualizado!</span>
                      </div>
                    )}
                    {uploadStatus === 'error' && (
                      <div className="flex items-center gap-2">
                        <XCircleIcon className="w-5 h-5 text-red-600" />
                        <span className="text-sm text-red-600">Error al subir</span>
                      </div>
                    )}
                    {uploadStatus === 'uploading' && (
                      <div className="flex items-center gap-2">
                        <div className="w-5 h-5 border-2 border-[#008A4B] border-t-transparent rounded-full animate-spin" />
                        <span className="text-sm text-gray-600">Subiendo...</span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 