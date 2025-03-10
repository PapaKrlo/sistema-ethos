import { FileIcon, PaperclipIcon, Download, FileImage, FileText, FileArchive, FileAudio, FileVideo } from 'lucide-react';
import { cn } from '../../../lib/utils';

export interface AttachmentProps {
  id: string;
  name: string;
  url: string;
  size: number;
  mimeType: string;
}

interface AttachmentListProps {
  attachments: AttachmentProps[];
}

export function AttachmentList({ attachments }: AttachmentListProps) {
  if (!attachments || attachments.length === 0) {
    return null;
  }
  
  const formatSize = (bytes: number) => {
    if (bytes < 1024) {
      return `${bytes} B`;
    } else if (bytes < 1024 * 1024) {
      return `${(bytes / 1024).toFixed(1)} KB`;
    } else {
      return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
    }
  };

  // Función para obtener el icono adecuado según el tipo MIME
  const getFileIcon = (mimeType: string) => {
    if (mimeType.startsWith('image/')) {
      return <FileImage className="h-4 w-4 text-blue-500" />;
    } else if (mimeType.startsWith('text/') || mimeType === 'application/pdf') {
      return <FileText className="h-4 w-4 text-green-500" />;
    } else if (mimeType.startsWith('audio/')) {
      return <FileAudio className="h-4 w-4 text-purple-500" />;
    } else if (mimeType.startsWith('video/')) {
      return <FileVideo className="h-4 w-4 text-red-500" />;
    } else if (mimeType.includes('zip') || mimeType.includes('compressed') || mimeType.includes('archive')) {
      return <FileArchive className="h-4 w-4 text-amber-500" />;
    } else {
      return <FileIcon className="h-4 w-4 text-blue-500" />;
    }
  };

  return (
    <div className="mt-4 space-y-2">
      <div className="flex items-center text-sm text-muted-foreground">
        <PaperclipIcon className="mr-2 h-4 w-4" />
        <span>Adjuntos ({attachments.length})</span>
      </div>
      <div className="space-y-2">
        {attachments.map((attachment) => (
          <div
            key={attachment.id}
            className="flex items-center justify-between rounded-md border p-2 text-sm"
          >
            <div className="flex items-center space-x-2">
              {getFileIcon(attachment.mimeType)}
              <div>
                <p className="font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(attachment.size || 0)} • {attachment.mimeType.split('/')[1]}</p>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
} 