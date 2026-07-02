import React, { useState, useEffect } from 'react';
import { FaCheckCircle, FaExclamationTriangle, FaInfoCircle, FaTimes } from 'react-icons/fa';

export interface ToastProps {
  message: string;
  type: 'success' | 'error' | 'info' | 'warning';
  duration?: number;
  onClose?: () => void;
  show: boolean;
}

export const Toast: React.FC<ToastProps> = ({
  message,
  type = 'info',
  duration = 3000,
  onClose,
  show
}) => {
  const [isVisible, setIsVisible] = useState(show);

  useEffect(() => {
    setIsVisible(show);
    
    if (show && duration > 0) {
      const timer = setTimeout(() => {
        setIsVisible(false);
        if (onClose) onClose();
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [show, duration, onClose]);

  const handleClose = () => {
    setIsVisible(false);
    if (onClose) onClose();
  };

  if (!isVisible) return null;

  // Determine icon and colors based on toast type
  const getToastStyles = () => {
    switch (type) {
      case 'success':
        return {
          icon: <FaCheckCircle className="w-5 h-5 text-white" />,
          background: 'bg-gradient-to-r from-green-500 to-green-600',
          iconBackground: 'bg-green-600'
        };
      case 'error':
        return {
          icon: <FaExclamationTriangle className="w-5 h-5 text-white" />,
          background: 'bg-gradient-to-r from-red-500 to-red-600',
          iconBackground: 'bg-red-600'
        };
      case 'warning':
        return {
          icon: <FaExclamationTriangle className="w-5 h-5 text-white" />,
          background: 'bg-gradient-to-r from-amber-500 to-orange-500',
          iconBackground: 'bg-orange-600'
        };
      case 'info':
      default:
        return {
          icon: <FaInfoCircle className="w-5 h-5 text-white" />,
          background: 'bg-gradient-to-r from-blue-500 to-blue-600',
          iconBackground: 'bg-blue-600'
        };
    }
  };

  const { icon, background, iconBackground } = getToastStyles();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex animate-in fade-in slide-in-from-bottom-5">
      <div className={`${background} text-white rounded-lg shadow-lg flex items-center max-w-xs`}>
        <div className={`${iconBackground} p-3 rounded-l-lg`}>
          {icon}
        </div>
        <div className="px-4 py-3 flex-1">
          <p className="text-sm font-medium">{message}</p>
        </div>
        <button onClick={handleClose} className="p-3">
          <FaTimes className="w-4 h-4 text-white opacity-70 hover:opacity-100" />
        </button>
      </div>
    </div>
  );
};

export default Toast;
