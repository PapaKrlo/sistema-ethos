import { FileIcon, PaperclipIcon, Download } from 'lucide-react';
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
              <FileIcon className="h-4 w-4 text-blue-500" />
              <div>
                <p className="font-medium">{attachment.name}</p>
                <p className="text-xs text-muted-foreground">{formatSize(attachment.size)}</p>
              </div>
            </div>
            <a
              href={attachment.url}
              target="_blank"
              rel="noopener noreferrer"
              className={cn(
                "flex items-center rounded-md border px-2 py-1 text-xs font-medium",
                "hover:bg-muted transition-colors"
              )}
              download
            >
              <Download className="mr-1 h-3.5 w-3.5" />
              <span>Descargar</span>
            </a>
          </div>
        ))}
      </div>
    </div>
  );
} 