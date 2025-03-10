import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

export const ourFileRouter = {
  propertyDocument: f({
    pdf: {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      // Aquí deberías implementar tu lógica de autenticación real
      // y verificar si el usuario es admin o directorio
      return { 
        documentType: req.headers.get("x-document-type"),
        propertyId: req.headers.get("x-property-id")
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      // Aquí podrías crear el registro en tu base de datos
      return { 
        url: file.ufsUrl,
        documentType: metadata.documentType,
        propertyId: metadata.propertyId
      };
    }),
    
  propertyImage: f({
    image: {
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      return { 
        propertyId: req.headers.get("x-property-id")
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        url: file.ufsUrl,
        propertyId: metadata.propertyId
      };
    }),

  // Nueva ruta para adjuntos de email
  emailAttachment: f({
    blob: { // Permite cualquier tipo de archivo
      maxFileSize: "32MB",
      maxFileCount: 1,
    },
  })
    .middleware(async ({ req }) => {
      return { 
        emailId: req.headers.get("x-email-id"),
        filename: req.headers.get("x-filename"),
        contentType: req.headers.get("x-content-type")
      };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      return { 
        url: file.ufsUrl,
        emailId: metadata.emailId,
        filename: metadata.filename,
        contentType: metadata.contentType
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter; 