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
  }

  /**
   * Memperluas tipe Session
   */
  interface Session {
    user?: User
    expires: string
  }
}

// Memperluas JWT bila diperlukan
declare module "next-auth/jwt" {
  /** Memperluas tipe JWT untuk menambahkan properti khusus */
  interface JWT {
    id?: string
    role?: string
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
  }
}
