import { Roles } from "@/app/constants/roles";

export const routeRoleMapping: Record<string, Roles[]> = {
    "/authenticated/dashboard": [Roles.User, Roles.Admin],
    "/authenticated/transactions": [Roles.User, Roles.Admin],
    "/authenticated/admin": [Roles.Admin],
};
