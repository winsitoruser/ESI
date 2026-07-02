import NextAuth from "next-auth"

// Memperluas tipe default NextAuth untuk menambahkan properti khusus
declare module "next-auth" {
  /**
   * Memperluas tipe User default dari NextAuth
   */
  interface User {
    id?: string
    name?: string | null
    email?: string | null
    image?: string | null
    role?: string // Menambahkan properti role
    originalRole?: string // Original role from DB before normalization
    tenantId?: string // Menambahkan properti tenantId untuk multi-tenancy
    businessName?: string // Menambahkan properti businessName
    position?: string
    department?: string
    status?: 'ACTIVE' | 'INACTIVE'
    workLocation?: string
    // Branch properties for multi-branch
    branchId?: string
    branchName?: string
    branchCode?: string
    tenantName?: string
    assignedBranchId?: string
    kybStatus?: string
    dataScope?: string
    businessCode?: string
    businessStructure?: string
    setupCompleted?: boolean
    // Auth overhaul additions
    redirectUrl?: string // Role-based redirect URL
  }

  /**
   * Memperluas tipe Session
   */
  interface Session {
    user?: User
    expires: string
    expiresAt?: number // Unix timestamp when access token expires
    redirectUrl?: string // Role-based redirect URL
  }
}

// Memperluas JWT bila diperlukan
declare module "next-auth/jwt" {
  /** Memperluas tipe JWT untuk menambahkan properti khusus */
  interface JWT {
    id?: string
    role?: string
    originalRole?: string // Original role before normalization
    businessName?: string
    position?: string
    department?: string
    status?: 'ACTIVE' | 'INACTIVE'
    workLocation?: string
    // Branch properties for multi-branch
    branchId?: string
    branchName?: string
    branchCode?: string
    tenantName?: string
    assignedBranchId?: string
    tenantId?: string
    kybStatus?: string
    dataScope?: string
    businessCode?: string
    businessStructure?: string
    setupCompleted?: boolean
    // Sliding session / token refresh
    iat?: number // Issued at (Unix timestamp)
    exp?: number // Expires at (Unix timestamp)
    // Auth overhaul additions
    redirectUrl?: string // Role-based redirect URL
  }
}
