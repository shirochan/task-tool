import { toast as sonnerToast } from 'sonner';

export interface ToastOptions {
  type?: 'success' | 'error' | 'warning' | 'info';
  duration?: number;
  action?: {
    label: string;
    onClick: () => void;
  };
}

export interface UseToastReturn {
  toast: (message: string, options?: ToastOptions) => void;
  success: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  error: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  warning: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  info: (message: string, options?: Omit<ToastOptions, 'type'>) => void;
  dismiss: (id?: string | number) => void;
  dismissAll: () => void;
}

export function useToast(): UseToastReturn {
  const toast = (message: string, options: ToastOptions = {}) => {
    const { type = 'info', duration, action } = options;
    
    const toastOptions = {
      duration,
      action: action ? {
        label: action.label,
        onClick: action.onClick,
      } : undefined,
    };

    switch (type) {
      case 'success':
        return sonnerToast.success(message, toastOptions);
      case 'error':
        return sonnerToast.error(message, toastOptions);
      case 'warning':
        return sonnerToast.warning(message, toastOptions);
      case 'info':
      default:
        return sonnerToast.info(message, toastOptions);
    }
  };

  const success = (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return toast(message, { ...options, type: 'success' });
  };

  const error = (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return toast(message, { ...options, type: 'error' });
  };

  const warning = (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return toast(message, { ...options, type: 'warning' });
  };

  const info = (message: string, options: Omit<ToastOptions, 'type'> = {}) => {
    return toast(message, { ...options, type: 'info' });
  };

  const dismiss = (id?: string | number) => {
    sonnerToast.dismiss(id);
  };

  const dismissAll = () => {
    sonnerToast.dismiss();
  };

  return {
    toast,
    success,
    error,
    warning,
    info,
    dismiss,
    dismissAll,
  };
}