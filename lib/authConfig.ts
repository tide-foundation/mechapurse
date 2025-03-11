import { Roles } from "@/app/constants/roles";

export const routeRoleMapping: Record<string, Roles> = {
    "/authenticated": Roles.User,
    "/admin": Roles.Admin,
};