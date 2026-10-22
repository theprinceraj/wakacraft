export const OrgRoles = { Owner: 'owner', Admin: 'admin', Member: 'member' } as const;
export type OrgRole = (typeof OrgRoles)[keyof typeof OrgRoles];
export const OrgRolesList: OrgRole[] = Object.values(OrgRoles);

/** Owners and admins manage dashboards, members and the invite link; members only view. */
export const canManageOrg = (role: OrgRole) => role === OrgRoles.Owner || role === OrgRoles.Admin;
