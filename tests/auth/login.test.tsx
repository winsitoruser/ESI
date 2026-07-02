/**
 * Baseline test: Login page renders without crashing
 * Verifies the login component mounts, renders key UI elements,
 * and handles form interaction properly.
 */
import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { useRouter } from 'next/router';
import { memoryRouter } from 'next-router-mock';

// Mock next-auth/react
jest.mock('next-auth/react', () => ({
  signIn: jest.fn(),
  getSession: jest.fn(),
  useSession: jest.fn(() => ({ data: null, status: 'unauthenticated' })),
}));

// Mock framer-motion with plain React.createElement to avoid JSX in hoisted factory
jest.mock('framer-motion', () => {
  const ReactActual = require('react');
  return {
    __esModule: true,
    motion: new Proxy({}, {
      get: (_, tag: string) => {
        return ReactActual.forwardRef(function MotionComponent(
          { children, ...props }: any,
          ref: any
        ) {
          // Render button elements as <button> for proper form submission
          const el = tag === 'button' ? 'button' : 'div';
          return ReactActual.createElement(el, { ...props, ref }, children);
        });
      },
    }),
    AnimatePresence: ({ children }: any) =>
      ReactActual.createElement(ReactActual.Fragment, null, children),
  };
});

// Mock lucide-react icons (render a placeholder span)
jest.mock('lucide-react', () => {
  const ReactActual = require('react');
  const mockIcon = (name: string) => {
    const IconComponent = ({ className, ...props }: any) =>
      ReactActual.createElement('span', {
        'data-testid': `icon-${name}`,
        className,
        ...props,
      });
    return IconComponent;
  };
  return new Proxy({}, {
    get: (_, prop: string) => mockIcon(prop),
  });
});

// Mock react-hot-toast
jest.mock('react-hot-toast', () => ({
  __esModule: true,
  default: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
  success: jest.fn(),
  error: jest.fn(),
  loading: jest.fn(),
  dismiss: jest.fn(),
  toast: {
    success: jest.fn(),
    error: jest.fn(),
    loading: jest.fn(),
    dismiss: jest.fn(),
  },
}));

// Mock useTranslation from @/lib/i18n
jest.mock('@/lib/i18n', () => ({
  useTranslation: () => ({
    t: (key: string) => {
      const translations: Record<string, string> = {
        'auth.loginTitle': 'Masuk - Bedagang',
        'auth.loginDesc': 'Masuk ke akun Bedagang Anda',
        'auth.welcomeBack': 'Selamat datang kembali',
        'auth.email': 'Email',
        'auth.password': 'Kata Sandi',
        'auth.enterPassword': 'Masukkan kata sandi',
        'auth.forgotPassword': 'Lupa kata sandi?',
        'auth.loginBtn': 'Masuk',
        'auth.processing': 'Memproses...',
        'auth.noAccount': 'Belum punya akun?',
        'auth.registerFree': 'Daftar Gratis',
        'auth.backToHome': 'Kembali ke Beranda',
        'auth.demoAccount': 'Akun Demo',
        'auth.emailRequired': 'Email dan kata sandi harus diisi',
        'auth.invalidCredentials': 'Email atau kata sandi salah',
        'auth.loginSuccess': 'Berhasil masuk',
        'auth.loginError': 'Gagal masuk. Silakan coba lagi.',
      };
      return translations[key] || key;
    },
    locale: 'id',
    setLocale: jest.fn(),
  }),
}));

import LoginPage from '../../pages/auth/login';

beforeEach(() => {
  jest.clearAllMocks();
  // Reset memoryRouter for next-router-mock
  memoryRouter.push('/auth/login');
});

describe('Login Page', () => {
  it('renders the login page with all key elements', () => {
    render(React.createElement(LoginPage));

    // Branding
    expect(screen.getByText('NainERP')).toBeInTheDocument();
    expect(screen.getByText('Selamat datang kembali')).toBeInTheDocument();

    // Form fields
    expect(screen.getByPlaceholderText('john@example.com')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('Masukkan kata sandi')).toBeInTheDocument();

    // Submit button
    expect(screen.getByText('Masuk')).toBeInTheDocument();

    // Links
    expect(screen.getByText('Lupa kata sandi?')).toBeInTheDocument();
    expect(screen.getByText('Daftar Gratis')).toBeInTheDocument();
    expect(screen.getByText('Kembali ke Beranda')).toBeInTheDocument();

    // Demo info
    expect(screen.getByText('Akun Demo')).toBeInTheDocument();
    expect(screen.getByText(/demo@bedagang.com/)).toBeInTheDocument();
    expect(screen.getByText(/demo123/)).toBeInTheDocument();
  });

  it('has working form inputs that accept values', () => {
    render(React.createElement(LoginPage));

    const emailInput = screen.getByPlaceholderText('john@example.com');
    const passwordInput = screen.getByPlaceholderText('Masukkan kata sandi');

    fireEvent.change(emailInput, { target: { value: 'test@bedagang.com' } });
    fireEvent.change(passwordInput, { target: { value: 'secret123' } });

    expect(emailInput).toHaveValue('test@bedagang.com');
    expect(passwordInput).toHaveValue('secret123');
  });

  it('shows toggle password visibility on click', async () => {
    render(React.createElement(LoginPage));

    const passwordInput = screen.getByPlaceholderText('Masukkan kata sandi');
    expect(passwordInput).toHaveAttribute('type', 'password');

    // Initially Eye icon is shown (showPassword = false)
    expect(screen.getByTestId('icon-Eye')).toBeInTheDocument();

    // Click the eye toggle button (the button containing the Eye icon)
    const toggleButton = screen.getByTestId('icon-Eye').closest('button')!;
    fireEvent.click(toggleButton);

    // After toggle: EyeOff icon should appear, input type should be text
    expect(screen.getByTestId('icon-EyeOff')).toBeInTheDocument();
    await waitFor(() => {
      // Re-query the input to avoid stale reference after re-render
      expect(screen.getByPlaceholderText('Masukkan kata sandi')).toHaveAttribute('type', 'text');
    });
  });

  it('submits the form and calls signIn', async () => {
    const { signIn } = require('next-auth/react');
    (signIn as jest.Mock).mockResolvedValueOnce({ ok: true, error: null });

    const { getSession } = require('next-auth/react');
    (getSession as jest.Mock).mockResolvedValueOnce({
      user: { role: 'owner' },
    });

    render(React.createElement(LoginPage));

    fireEvent.change(screen.getByPlaceholderText('john@example.com'), {
      target: { value: 'owner@bedagang.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('Masukkan kata sandi'), {
      target: { value: 'password123' },
    });

    fireEvent.click(screen.getByText('Masuk'));

    await waitFor(() => {
      expect(signIn).toHaveBeenCalledWith('credentials', {
        redirect: false,
        email: 'owner@bedagang.com',
        password: 'password123',
      });
    });
  });
});
