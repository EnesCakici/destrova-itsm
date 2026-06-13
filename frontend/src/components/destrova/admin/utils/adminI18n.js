import { FILTER_ALL } from "../../manager/utils/managerFilterCodes";
import {
  ADMIN_DEPARTMENTS,
  ADMIN_PRODUCT_CATEGORIES,
  ADMIN_PRODUCT_STATUSES,
  ADMIN_ROLES,
  ADMIN_USER_STATUSES,
  ADMIN_VERSION_STATUSES,
} from "../data/adminMock";

export { FILTER_ALL as ADMIN_FILTER_ALL };

const ROLE_I18N = {
  Agent: "role.agent",
  Manager: "role.manager",
  Admin: "role.admin",
  Customer: "role.customer",
};

const USER_STATUS_I18N = {
  Active: "userStatus.active",
  Disabled: "userStatus.disabled",
};

const PRODUCT_STATUS_I18N = {
  Active: "productStatus.active",
  Passive: "productStatus.passive",
};

const VERSION_STATUS_I18N = {
  Active: "versionStatus.active",
  Deprecated: "versionStatus.deprecated",
};

const CATEGORY_I18N = {
  Identity: "categories.identity",
  Security: "categories.security",
  "Productivity & Communication": "categories.productivity",
  Other: "categories.other",
};

const DEPARTMENT_I18N = {
  Network: "departments.network",
  Identity: "departments.identity",
  Endpoint: "departments.endpoint",
  Print: "departments.print",
  "Microsoft 365": "departments.microsoft365",
  Operations: "departments.operations",
  "—": "departments.none",
};

const ROLE_HELPER_I18N = {
  Manager: "roles.helper.manager",
  Admin: "roles.helper.admin",
  Customer: "roles.helper.customer",
};

/** @param {string} role @param {(key: string, opts?: object) => string} tc */
export function translateAdminRole(role, tc) {
  const key = ROLE_I18N[role];
  return key ? tc(key) : role;
}

/** @param {string} status @param {(key: string) => string} ta */
export function translateAdminUserStatus(status, ta) {
  const key = USER_STATUS_I18N[status];
  return key ? ta(key) : status;
}

/** @param {string} status @param {(key: string) => string} ta */
export function translateAdminProductStatus(status, ta) {
  const key = PRODUCT_STATUS_I18N[status];
  return key ? ta(key) : status;
}

/** @param {string} status @param {(key: string) => string} ta */
export function translateAdminVersionStatus(status, ta) {
  const key = VERSION_STATUS_I18N[status];
  return key ? ta(key) : status;
}

/** @param {string} category @param {(key: string) => string} ta */
export function translateAdminCategory(category, ta) {
  const key = CATEGORY_I18N[category];
  return key ? ta(key) : category;
}

/** @param {string} department @param {(key: string) => string} ta */
export function translateAdminDepartment(department, ta) {
  const key = DEPARTMENT_I18N[department];
  return key ? ta(key) : department;
}

/** @param {string} role @param {(key: string) => string} ta */
export function translateAdminRoleHelper(role, ta) {
  const key = ROLE_HELPER_I18N[role];
  return key ? ta(key) : "";
}

/** @param {(key: string) => string} ta @param {(key: string) => string} tc */
export function buildAdminRoleFilterOptions(ta, tc) {
  return [
    { value: FILTER_ALL, label: ta("filters.allRoles") },
    ...ADMIN_ROLES.map((role) => ({ value: role, label: translateAdminRole(role, tc) })),
  ];
}

/** @param {(key: string) => string} ta */
export function buildAdminUserStatusFilterOptions(ta) {
  return [
    { value: FILTER_ALL, label: ta("filters.allStatuses") },
    ...ADMIN_USER_STATUSES.map((status) => ({
      value: status,
      label: translateAdminUserStatus(status, ta),
    })),
  ];
}

/** @param {(key: string) => string} ta */
export function buildAdminProductStatusFilterOptions(ta) {
  return [
    { value: FILTER_ALL, label: ta("filters.allStatuses") },
    ...ADMIN_PRODUCT_STATUSES.map((status) => ({
      value: status,
      label: translateAdminProductStatus(status, ta),
    })),
  ];
}

/** @param {(key: string) => string} ta @param {(key: string) => string} tc */
export function buildAdminRoleSelectOptions(tc) {
  return ADMIN_ROLES.map((role) => ({ value: role, label: translateAdminRole(role, tc) }));
}

/** @param {(key: string) => string} ta */
export function buildAdminUserStatusSelectOptions(ta) {
  return ADMIN_USER_STATUSES.map((status) => ({
    value: status,
    label: translateAdminUserStatus(status, ta),
  }));
}

/** @param {(key: string) => string} ta */
export function buildAdminProductStatusSelectOptions(ta) {
  return ADMIN_PRODUCT_STATUSES.map((status) => ({
    value: status,
    label: translateAdminProductStatus(status, ta),
  }));
}

/** @param {(key: string) => string} ta */
export function buildAdminCategorySelectOptions(ta) {
  return ADMIN_PRODUCT_CATEGORIES.map((category) => ({
    value: category,
    label: translateAdminCategory(category, ta),
  }));
}

/** @param {(key: string) => string} ta */
export function buildAdminDepartmentSelectOptions(ta) {
  return ADMIN_DEPARTMENTS.map((department) => ({
    value: department,
    label: translateAdminDepartment(department, ta),
  }));
}

/** @param {(key: string) => string} ta */
export function buildAdminVersionStatusSelectOptions(ta) {
  return ADMIN_VERSION_STATUSES.map((status) => ({
    value: status,
    label: translateAdminVersionStatus(status, ta),
  }));
}

/** @param {string} status @param {(key: string) => string} ta */
export function translateAdminHealthStatus(status, ta) {
  const key = String(status || "healthy").toLowerCase();
  return ta(`health.${key}`, { defaultValue: status });
}
