import 'server-only'

export type Permission = string

export function hasPermission(userPerms: Permission[], required: Permission): boolean {
  if (userPerms.includes('*')) return true
  if (userPerms.includes(required)) return true

  const [resource] = required.split(':')
  if (userPerms.includes(`${resource}:*`)) return true

  return false
}

export function can(userPerms: Permission[], ...required: Permission[]): boolean {
  return required.every((p) => hasPermission(userPerms, p))
}

export function assertCan(userPerms: Permission[], required: Permission) {
  if (!hasPermission(userPerms, required)) {
    throw new Error(`Forbidden: missing permission '${required}'`)
  }
}
