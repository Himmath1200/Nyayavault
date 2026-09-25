import { apiClient } from "@/api/client";
import { User, UserRole } from "@/types";

export interface RolePermission {
  role: string;
  description: string;
  permissions: string[];
}

export const usersService = {
  list: () => apiClient.get<User[]>("/api/users").then((r) => r.data),
  create: (payload: { email: string; full_name: string; badge_id: string; role: UserRole; password: string; department?: string }) =>
    apiClient.post<User>("/api/users", payload).then((r) => r.data),
  update: (id: string, payload: Partial<{ full_name: string; role: UserRole; is_active: boolean; department: string }>) =>
    apiClient.put<User>(`/api/users/${id}`, payload).then((r) => r.data),
  rolePermissions: () => apiClient.get<RolePermission[]>("/api/users/roles/permissions").then((r) => r.data),
};
