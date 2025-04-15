"use client";

import { Button } from "./ui/button";
import { CheckIcon, XMarkIcon } from "@heroicons/react/24/outline";
import { Dialog, DialogContent, DialogTitle } from "./ui/dialog";

export interface StatusModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  type: "success" | "error";
  title: string;
  message: string;
  onClose?: () => void;
  actionLabel?: string;
  onAction?: () => void;
}

export function StatusModal(props: StatusModalProps) {
  const handleClose = () => {
    if (props.onOpenChange) {
      props.onOpenChange(false);
    }
    if (props.onClose) {
      props.onClose();
    }
  };

  return (
    <Dialog open={props.open} onOpenChange={props.onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogTitle className="sr-only">{props.title}</DialogTitle>
        <div className="text-center">
          <div className={`w-12 h-12 ${
            props.type === 'success' ? 'bg-green-100' : 'bg-red-100'
          } rounded-full flex items-center justify-center mx-auto mb-4`}>
            {props.type === 'success' ? (
              <CheckIcon className="w-6 h-6 text-green-600" />
            ) : (
              <XMarkIcon className="w-6 h-6 text-red-600" />
            )}
          </div>
          <h3 className="text-lg font-medium text-gray-900 mb-2">
            {props.title}
          </h3>
          <p className="text-sm text-gray-500 mb-4">
            {props.message}
          </p>
          <div className="flex gap-3 justify-center">
            {props.onAction && props.actionLabel && (
              <Button
                className={`${
                  props.type === 'success' ? 'bg-[#008A4B] hover:bg-[#006837]' : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                onClick={props.onAction}
              >
                {props.actionLabel}
              </Button>
            )}
            {!props.onAction && (
              <Button
                variant="outline"
                onClick={handleClose}
              >
                Cerrar
              </Button>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
} 