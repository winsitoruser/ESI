import NextAuth, { NextAuthOptions } from 'next-auth';
import CredentialsProvider from 'next-auth/providers/credentials';
import bcrypt from 'bcryptjs';

// Import models from local directory
const db = require('../../../models');
const { User } = db;

export const authOptions: NextAuthOptions = {
  providers: [
    CredentialsProvider({
      name: 'Credentials',
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error('Email dan password harus diisi');
        }

        try {
          const user = await User.findOne({
            where: { email: credentials.email }
          });

          if (!user) {
            throw new Error('Email atau password salah');
          }

          if (!user.isActive) {
            throw new Error('Akun Anda tidak aktif. Hubungi administrator.');
          }

          // Verify admin role
          if (!['ADMIN', 'SUPER_ADMIN'].includes(user.role)) {
            throw new Error('Anda tidak memiliki akses ke Admin Panel');
          }

          const isPasswordValid = await bcrypt.compare(
            credentials.password,
            user.password
          );

          if (!isPasswordValid) {
            throw new Error('Email atau password salah');
          }

          await user.update({ lastLogin: new Date() });

          return {
            id: user.id.toString(),
            email: user.email,
            name: user.name,
            role: user.role,
            businessName: user.businessName,
          };
        } catch (error) {
          console.error('Auth error:', error);
          throw error;
        }
      }
    })
  ],
  pages: {
    signIn: '/login',
    signOut: '/login',
    error: '/login',
  },
  session: {
    strategy: 'jwt',
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
        token.businessName = user.businessName;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.businessName = token.businessName as string;
      }
      return session;
    }
  },
  secret: process.env.NEXTAUTH_SECRET || 'bedagang-admin-secret-key-change-in-production',
  debug: process.env.NODE_ENV === 'development',
};

export default NextAuth(authOptions);
