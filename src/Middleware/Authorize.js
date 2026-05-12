import { roleHasPermission } from "../Utils/rbac.js";

export function requirePermission(permission) {
  return (req, res, next) => {
    // Prefer the role fetched from DB (req.admin) over any JWT-embedded value
    const role = req.admin?.role || req.user?.role;
    console.log(role);
    

    if (!role) {
      return res.status(401).json({
        code: "AUTH_REQUIRED",
        message: "Unauthorized",
      });
    }

    if (!roleHasPermission(role, permission)) {
      return res.status(403).json({
        code: "FORBIDDEN",
        message: "You do not have permission to perform this action.",
      });
    }

    next();
  };
}
