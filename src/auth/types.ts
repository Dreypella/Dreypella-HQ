export type AuthenticatedUser = {
  id: string
  email: string
  displayName: string
  status: string
  mustChangePassword: boolean
  roles: string[]
  permissions: string[]
}
