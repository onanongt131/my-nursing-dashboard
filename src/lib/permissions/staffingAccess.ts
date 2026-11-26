export type UserProfile = {
  id: string;
  full_name: string | null;
  department_id: number | null;
  /** หน่วยงานหลัก + หน่วยงานที่ดูแลเพิ่ม */
  department_ids?: number[];
  role: string | null;
  email: string | null;
};

export type Department = {
  id: number;
  Department: string;
  group?: string | null;
};

export function canViewAllDepartments(role?: string | null) {
  return role === 'admin' || role === 'head_nurse';
}

export function canViewGroupDepartments(role?: string | null) {
  return role === 'head_group';
}

export function canSelectDepartment(role?: string | null, departmentCount = 0) {
  return (
    departmentCount > 1 ||
    role === 'admin' ||
    role === 'head_nurse' ||
    role === 'head_group'
  );
}

export function canEditStaffing(role?: string | null) {
  return (
    role === 'admin' ||
    role === 'head_department'
  );
}

export function getVisibleDepartments(
  departments: Department[],
  profile: UserProfile | null,
  userGroup: string | null
) {
  if (!profile) return [];

  // admin / head_nurse เห็นทุกหน่วยงาน
  if (
    profile.role === 'admin' ||
    profile.role === 'head_nurse'
  ) {
    return departments;
  }

  // head_group เห็นเฉพาะหน่วยงานในกลุ่มงานของตัวเอง
  if (profile.role === 'head_group' && userGroup) {
    return departments.filter(
      (dept) => dept.group === userGroup
    );
  }

  // head_department และ role อื่น
  // เห็นเฉพาะหน่วยงานของตัวเอง
  const ids = profile.department_ids?.length ? profile.department_ids.map(Number) : [Number(profile.department_id)];
  return departments.filter(
    (dept) => ids.includes(Number(dept.id))
  );
}