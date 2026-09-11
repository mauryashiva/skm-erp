'use client';

import * as React from 'react';
import { api } from '../../../lib/api';
import { ERP_ACTION_PERMISSIONS } from '../../../config/erp-modules';
import { ShieldCheck, ShieldAlert, Check, X, Info } from 'lucide-react';

interface RoleDetail {
  id: string;
  name: string;
  description: string;
  is_system?: boolean;
  role_permissions?: {
    permission?: {
      code: string;
      module: string;
      entity: string;
      action: string;
    };
  }[];
}

export default function RolesPage() {
  const [roles, setRoles] = React.useState<RoleDetail[]>([]);
  const [selectedRole, setSelectedRole] = React.useState<string>('Super Admin');

  React.useEffect(() => {
    async function loadRoles() {
      try {
        const data = await api.get<RoleDetail[]>('/users/roles');
        if (Array.isArray(data) && data.length > 0) {
          setRoles(data);
          setSelectedRole(data[0].name);
        }
      } catch {
        setRoles([
          {
            id: 'role-super-admin',
            name: 'Super Admin',
            description: 'Full unrestricted enterprise-wide access across all divisions and modules',
            is_system: true,
          },
          {
            id: 'role-ho-admin',
            name: 'HO Administrator',
            description: 'Head Office administrator with complete management of Parameters and Masters',
            is_system: true,
          },
          {
            id: 'role-ho-staff',
            name: 'HO Staff',
            description: 'Head Office staff with view, create, edit capabilities for assigned modules',
            is_system: false,
          },
          {
            id: 'role-div-manager',
            name: 'Division Manager',
            description: 'Branch/Division level manager with operational oversight and view/use access',
            is_system: false,
          },
          {
            id: 'role-div-user',
            name: 'Division User',
            description: 'Standard divisional operator with view and use permissions for assigned records',
            is_system: false,
          },
        ]);
      }
    }
    loadRoles();
  }, []);

  // Standard action rights baseline per role
  const getActionAllowed = (roleName: string, actionKey: string): boolean => {
    if (roleName === 'Super Admin') return true;
    if (roleName === 'HO Administrator') return true;
    if (roleName === 'HO Staff') {
      return ['view', 'create', 'edit'].includes(actionKey);
    }
    if (roleName === 'Division Manager') {
      return ['view', 'edit'].includes(actionKey);
    }
    if (roleName === 'Division User') {
      return actionKey === 'view';
    }
    return actionKey === 'view';
  };

  return (
    <div className="space-y-6">
      {/* Principle Notice */}
      <div className="p-4 rounded-xl border border-border bg-secondary/30 text-xs text-muted-foreground flex items-start gap-3">
        <Info className="w-4 h-4 text-primary shrink-0 mt-0.5" />
        <div className="space-y-1">
          <p className="font-semibold text-foreground">
            Principle: Separation of Role &amp; Rights vs Division Access
          </p>
          <p className="leading-relaxed">
            Roles define <strong>what actions</strong> a user can perform (View, Create, Edit, Assign Division, Activate, Deactivate, Delete).
            Having HO division access does <em>not</em> automatically grant unrestricted permissions; backend permission guards enforce authorization independently.
          </p>
        </div>
      </div>

      {/* Role Selection & Rights Matrix */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Roles List */}
        <div className="space-y-3">
          <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
            Authoritative Roles ({roles.length})
          </h2>

          <div className="space-y-2">
            {roles.map((role) => {
              const isSelected = selectedRole === role.name;
              return (
                <button
                  key={role.id || role.name}
                  type="button"
                  onClick={() => setSelectedRole(role.name)}
                  className={`w-full p-4 rounded-xl border text-left transition-all cursor-pointer ${
                    isSelected
                      ? 'border-primary bg-primary/10 shadow-xs'
                      : 'border-border bg-card hover:bg-secondary/60'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-bold text-foreground">{role.name}</span>
                    {role.is_system && (
                      <span className="px-1.5 py-0.5 rounded-xs text-[10px] font-bold bg-purple-500/15 text-purple-600 dark:text-purple-400 uppercase">
                        System
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                    {role.description}
                  </p>
                </button>
              );
            })}
          </div>
        </div>

        {/* Action Permissions Matrix for Selected Role */}
        <div className="lg:col-span-2 space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
              Permission Rights Matrix for &quot;{selectedRole}&quot;
            </h2>
            <span className="text-[11px] text-muted-foreground">Explicit Action Capabilities</span>
          </div>

          <div className="rounded-2xl border border-border bg-card shadow-xs overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-secondary/60 border-b border-border text-[11px] font-bold uppercase tracking-wider text-muted-foreground">
                <tr>
                  <th className="px-4 py-3">Action Permission</th>
                  <th className="px-4 py-3">Scope &amp; Description</th>
                  <th className="px-4 py-3 text-center">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {ERP_ACTION_PERMISSIONS.map((action) => {
                  const isAllowed = getActionAllowed(selectedRole, action.key);

                  return (
                    <tr key={action.key} className="hover:bg-secondary/40 transition-colors">
                      <td className="px-4 py-3.5 font-semibold text-foreground whitespace-nowrap">
                        {action.label}
                      </td>
                      <td className="px-4 py-3.5 text-muted-foreground text-[11px]">
                        {action.description}
                      </td>
                      <td className="px-4 py-3.5 text-center whitespace-nowrap">
                        {isAllowed ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
                            <Check className="w-3 h-3" />
                            Allowed
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-muted text-muted-foreground">
                            <X className="w-3 h-3" />
                            Denied
                          </span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="p-3 rounded-xl border border-border bg-secondary/30 text-[11px] text-muted-foreground flex items-center gap-2">
            <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
            <span>
              Action permissions are enforced strictly by backend NestJS guards (<code>HoOnlyGuard</code>, <code>PermissionsGuard</code>, <code>JwtAuthGuard</code>).
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
