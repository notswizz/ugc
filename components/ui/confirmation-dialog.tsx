import * as React from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { AlertTriangle, Info } from 'lucide-react';

interface ConfirmationDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  confirmText?: string;
  cancelText?: string;
  onConfirm: () => void | Promise<void>;
  variant?: 'default' | 'destructive' | 'warning';
  icon?: 'warning' | 'info' | 'none';
  details?: React.ReactNode;
  confirmDisabled?: boolean;
}

export function ConfirmationDialog({
  open,
  onOpenChange,
  title,
  description,
  confirmText = 'Confirm',
  cancelText = 'Cancel',
  onConfirm,
  variant = 'default',
  icon = 'none',
  details,
  confirmDisabled = false,
}: ConfirmationDialogProps) {
  const [isLoading, setIsLoading] = React.useState(false);

  const handleConfirm = async () => {
    setIsLoading(true);
    try {
      await onConfirm();
      onOpenChange(false);
    } catch (error) {
      console.error('Confirmation action failed:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const getButtonVariant = () => {
    if (variant === 'destructive') return 'destructive';
    if (variant === 'warning') return 'default';
    return 'primary';
  };

  const getIcon = () => {
    if (icon === 'warning') {
      return <AlertTriangle className="w-6 h-6 text-yellow-600" />;
    }
    if (icon === 'info') {
      return <Info className="w-6 h-6 text-blue-600" />;
    }
    return null;
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          {icon !== 'none' && (
            <div className="flex justify-center mb-4">
              <div className="w-12 h-12 rounded-full bg-zinc-100 flex items-center justify-center">
                {getIcon()}
              </div>
            </div>
          )}
          <DialogTitle className="text-center">{title}</DialogTitle>
          <DialogDescription className="text-center">
            {description}
          </DialogDescription>
        </DialogHeader>

        {details && (
          <div className="rounded-lg bg-zinc-50 p-4 border border-zinc-200 text-sm">
            {details}
          </div>
        )}

        <DialogFooter className="flex-col sm:flex-row gap-2">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            disabled={isLoading}
            className="w-full sm:w-auto"
          >
            {cancelText}
          </Button>
          <Button
            type="button"
            variant={getButtonVariant()}
            onClick={handleConfirm}
            disabled={isLoading || confirmDisabled}
            className="w-full sm:w-auto"
          >
            {isLoading ? 'Processing...' : confirmText}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default ConfirmationDialog;
