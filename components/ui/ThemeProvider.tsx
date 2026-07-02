import React, { createContext, useContext, ReactNode } from 'react';

// Theme Variables
export const THEME = {
  colors: {
    primary: {
      gradient: 'bg-gradient-to-r from-red-600 to-orange-500',
      text: 'text-red-600',
      border: 'border-red-100',
      hover: 'hover:bg-red-50',
      bg: 'bg-red-50',
      light: 'bg-red-50',
      medium: 'bg-red-100',
      dark: 'bg-red-600'
    },
    secondary: {
      gradient: 'bg-gradient-to-r from-orange-400 to-amber-500',
      text: 'text-orange-600',
      border: 'border-orange-100',
      hover: 'hover:bg-orange-50',
      bg: 'bg-orange-50'
    },
    neutral: {
      card: 'bg-white',
      border: 'border-gray-100',
      shadow: 'shadow-sm'
    },
    status: {
      success: {
        bg: 'bg-green-50',
        text: 'text-green-700',
        border: 'border-green-100'
      },
      warning: {
        bg: 'bg-yellow-50',
        text: 'text-yellow-700',
        border: 'border-yellow-100'
      },
      error: {
        bg: 'bg-red-50',
        text: 'text-red-700',
        border: 'border-red-100'
      },
      info: {
        bg: 'bg-blue-50',
        text: 'text-blue-700',
        border: 'border-blue-100'
      }
    }
  },
  components: {
    // Card styling berdasarkan preferensi user
    card: 'bg-white border border-red-100 rounded-lg shadow-sm p-4',
    // Navigation items berdasarkan preferensi user
    navItem: {
      base: 'px-4 py-2 rounded-md transition-all duration-200 font-medium',
      active: 'bg-gradient-to-r from-red-600 to-orange-500 text-white',
      inactive: 'text-gray-700 hover:bg-red-50 hover:text-red-600'
    },
    // Button styles
    button: {
      primary: 'bg-gradient-to-r from-red-600 to-orange-500 text-white rounded-md px-4 py-2 font-medium shadow-sm hover:shadow-md transition-all duration-200',
      secondary: 'border border-red-600 text-red-600 bg-white rounded-md px-4 py-2 font-medium shadow-sm hover:bg-red-50 transition-all duration-200',
      neutral: 'bg-gray-100 text-gray-700 rounded-md px-4 py-2 font-medium shadow-sm hover:bg-gray-200 transition-all duration-200',
      icon: 'rounded-full p-2 text-gray-700 hover:bg-red-50 hover:text-red-600 transition-all duration-200'
    },
    // Input styles
    input: 'border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all duration-200',
    // Table styles
    table: {
      container: 'w-full border border-red-100 rounded-lg overflow-hidden',
      header: 'bg-red-50',
      headerCell: 'px-4 py-3 text-left text-sm font-semibold text-gray-700',
      row: 'border-b border-red-100 hover:bg-red-50',
      cell: 'px-4 py-3 text-sm'
    },
    // Status badge styles
    badge: {
      active: 'px-2 py-1 rounded-full text-xs bg-green-100 text-green-800',
      pending: 'px-2 py-1 rounded-full text-xs bg-yellow-100 text-yellow-800',
      inactive: 'px-2 py-1 rounded-full text-xs bg-red-100 text-red-800'
    }
  },
  // Layout variables
  layout: {
    container: 'max-w-7xl mx-auto px-4 sm:px-6 lg:px-8',
    section: 'py-6',
    grid: 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4'
  }
};

// Create Theme Context
const ThemeContext = createContext(THEME);

// Provider Component
export const ThemeProvider: React.FC<{children: ReactNode}> = ({ children }) => {
  return (
    <ThemeContext.Provider value={THEME}>
      {children}
    </ThemeContext.Provider>
  );
};

// Hook to use theme
export const useTheme = () => useContext(ThemeContext);

// Common UI Components that follow FARMANESIA-EVO's design system
export const Card: React.FC<{
  children: ReactNode;
  className?: string;
}> = ({ children, className = '' }) => {
  const theme = useTheme();
  return (
    <div className={`${theme.components.card} ${className}`}>
      {children}
    </div>
  );
};

export const Button: React.FC<{
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'neutral' | 'icon';
  className?: string;
  onClick?: () => void;
  disabled?: boolean;
  type?: 'button' | 'submit' | 'reset';
}> = ({ 
  children, 
  variant = 'primary', 
  className = '',
  onClick,
  disabled = false,
  type = 'button'
}) => {
  const theme = useTheme();
  return (
    <button
      type={type}
      className={`${theme.components.button[variant]} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      onClick={onClick}
      disabled={disabled}
    >
      {children}
    </button>
  );
};

export const Badge: React.FC<{
  children: ReactNode;
  variant: 'active' | 'pending' | 'inactive';
  className?: string;
}> = ({ children, variant, className = '' }) => {
  const theme = useTheme();
  return (
    <span className={`${theme.components.badge[variant]} ${className}`}>
      {children}
    </span>
  );
};

export const Input: React.FC<{
  type?: string;
  placeholder?: string;
  value: string;
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  className?: string;
  disabled?: boolean;
  name?: string;
  id?: string;
}> = ({
  type = 'text',
  placeholder,
  value,
  onChange,
  className = '',
  disabled = false,
  name,
  id
}) => {
  const theme = useTheme();
  return (
    <input
      type={type}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      className={`${theme.components.input} ${disabled ? 'opacity-50 cursor-not-allowed' : ''} ${className}`}
      disabled={disabled}
      name={name}
      id={id}
    />
  );
};

// Navigation components based on user preferences
export const HorizontalNavigation: React.FC<{
  items: Array<{
    name: string;
    href: string;
    active: boolean;
    icon?: React.ReactNode;
  }>;
  className?: string;
}> = ({ items, className = '' }) => {
  const theme = useTheme();
  
  return (
    <nav className={`flex items-center space-x-2 ${className} rounded-lg p-1 ${theme.components.card}`}>
      {items.map((item) => (
        <a
          key={item.href}
          href={item.href}
          className={`${theme.components.navItem.base} ${
            item.active
              ? theme.components.navItem.active
              : theme.components.navItem.inactive
          } flex items-center`}
        >
          {item.icon && <span className="mr-1.5">{item.icon}</span>}
          {item.name}
        </a>
      ))}
    </nav>
  );
};

// Loading Indicator
export const LoadingSpinner: React.FC<{
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}> = ({ size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'w-4 h-4 border-2',
    md: 'w-8 h-8 border-2',
    lg: 'w-12 h-12 border-3'
  };
  
  return (
    <div className="flex justify-center items-center">
      <div
        className={`${sizeClasses[size]} rounded-full border-red-600 border-t-transparent animate-spin ${className}`}
      ></div>
    </div>
  );
};
