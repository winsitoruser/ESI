import { getCsrfToken } from 'next-auth/react';
import { GetServerSideProps } from 'next';
import Head from 'next/head';
import Link from 'next/link';

interface LoginFallbackProps {
  csrfToken: string;
  error: string | null;
  callbackUrl: string;
}

export default function LoginFallback({ csrfToken, error, callbackUrl }: LoginFallbackProps) {
  return (
    <>
      <Head>
        <title>Login — Bedagang (Fallback — No JS)</title>
        <meta name="description" content="Server-side login fallback without JavaScript" />
        {/* Ensure page still works when JS is completely disabled */}
        <noscript>
          <meta httpEquiv="refresh" content="0; url=/auth/login-fallback?nojs=1" />
        </noscript>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-sky-500 via-sky-400 to-blue-500 flex items-center justify-center p-4">
        {/* Static background elements (no framer-motion — works without JS) */}
        <div className="absolute inset-0 overflow-hidden pointer-events-none">
          <div className="absolute top-20 left-10 w-72 h-72 bg-white/10 rounded-full blur-3xl" />
          <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl" />
        </div>

        <div className="relative z-10 w-full max-w-md">
          <div className="bg-white rounded-3xl shadow-2xl p-8">
            {/* Logo & Title */}
            <div className="text-center mb-8">
              <h1 className="text-4xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-sky-600 to-blue-600 mb-2">
                BEDAGANG
              </h1>
              <p className="text-gray-600">Welcome back</p>
              {/* Fallback badge */}
              <span className="inline-block mt-2 px-3 py-1 bg-amber-100 text-amber-700 text-xs font-medium rounded-full">
                Fallback Login (No JavaScript)
              </span>
            </div>

            {/* Error message from query param */}
            {error && (
              <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm text-center">
                {error}
              </div>
            )}

            {/* ============================================ */}
            {/* SERVER-SIDE FORM — works without JavaScript  */}
            {/* POST langsung ke NextAuth callback endpoint   */}
            {/* ============================================ */}
            <form
              action="/api/auth/callback/credentials"
              method="POST"
              className="space-y-5"
              noValidate
            >
              {/* CSRF token — wajib untuk NextAuth credentials provider */}
              <input name="csrfToken" type="hidden" value={csrfToken} />

              {/* callbackUrl — kemana redirect setelah login sukses */}
              <input name="callbackUrl" type="hidden" value={callbackUrl} />

              {/* Email */}
              <div>
                <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <div className="relative">
                  {/* SVG icon inline — works without JS/lucide */}
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                  <input
                    id="email"
                    type="email"
                    name="email"
                    autoComplete="email"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    placeholder="john@example.com"
                    required
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-2">
                  Password
                </label>
                <div className="relative">
                  <svg
                    className="absolute left-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z"
                    />
                  </svg>
                  <input
                    id="password"
                    type="password"
                    name="password"
                    autoComplete="current-password"
                    className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-sky-500 focus:border-transparent outline-none transition"
                    placeholder="Enter your password"
                    required
                  />
                </div>
              </div>

              {/* Submit Button — plain HTML button, no framer-motion */}
              <button
                type="submit"
                className="w-full bg-gradient-to-r from-sky-500 to-blue-600 text-white py-3 rounded-lg font-semibold shadow-lg hover:shadow-xl transition-all cursor-pointer"
              >
                Sign In
              </button>
            </form>

            {/* Links */}
            <div className="mt-6 text-center">
              <p className="text-gray-600 text-sm">
                Don't have an account?{' '}
                <Link href="/auth/register" className="text-sky-600 font-semibold hover:text-sky-700">
                  Register Free
                </Link>
              </p>
            </div>
            <div className="mt-4 text-center space-y-2">
              <Link href="/auth/forgot-password" className="block text-sm text-sky-600 hover:text-sky-700">
                Forgot Password?
              </Link>
              <Link href="/auth/login" className="block text-sm text-gray-500 hover:text-gray-700">
                ← Back to Standard Login (with JavaScript)
              </Link>
            </div>
          </div>

          {/* Demo Account Info */}
          <div className="mt-6 bg-white/10 backdrop-blur-sm rounded-2xl p-4 text-white text-center">
            <p className="text-sm font-medium mb-2">Demo Account</p>
            <p className="text-xs">Email: demo@bedagang.com</p>
            <p className="text-xs">Password: demo123</p>
          </div>
        </div>
      </div>
    </>
  );
}

export const getServerSideProps: GetServerSideProps<LoginFallbackProps> = async (context) => {
  const { req, query } = context;

  // Fetch CSRF token server-side
  let csrfToken = '';
  try {
    csrfToken = await getCsrfToken({ req: req as any });
  } catch (e) {
    console.error('[login-fallback] Failed to get CSRF token:', e);
  }

  // Map NextAuth error codes to user-friendly messages
  const errorMap: Record<string, string> = {
    CredentialsSignin: 'Invalid email or password. Please try again.',
    OAuthSignin: 'OAuth sign-in failed.',
    OAuthCallback: 'OAuth callback failed.',
    OAuthCreateAccount: 'Could not create OAuth account.',
    EmailCreateAccount: 'Could not create email account.',
    Callback: 'Authentication callback error.',
    OAuthAccountNotLinked: 'This email is already associated with another provider.',
    EmailSignin: 'Check your email for the sign-in link.',
    CredentialsRequired: 'Email and password are required.',
    default: 'An unexpected authentication error occurred.',
  };

  const errorCode = query.error as string | undefined;
  const errorMessage = errorCode ? (errorMap[errorCode] || errorMap.default) : null;

  // Callback URL: default to HQ dashboard (most common)
  const callbackUrl = (query.callbackUrl as string) || '/hq/dashboard';

  return {
    props: {
      csrfToken,
      error: errorMessage,
      callbackUrl,
    },
  };
};
