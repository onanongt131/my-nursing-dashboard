export type SchedulingRule = {
  id: number;
  department_id: number;
  rule_code: string;
  rule_name: string;
  rule_type: "hard" | "soft";
  enabled: boolean;
  value_json: Record<string, any> | null;
  description: string | null;
};

export async function loadSchedulingRules(
  supabase: any,
  departmentId: number | string
): Promise<SchedulingRule[]> {
  const { data, error } = await supabase
    .from("scheduling_rules")
    .select(`
      id,
      department_id,
      rule_code,
      rule_name,
      rule_type,
      enabled,
      value_json,
      description
    `)
    .eq("department_id", Number(departmentId))
    .eq("enabled", true)
    .order("rule_code", { ascending: true });

  if (error) {
    console.error("Error loading scheduling rules:", error);
    return [];
  }

  return data ?? [];
}