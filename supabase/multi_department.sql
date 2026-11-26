-- ผู้ใช้ 1 บัญชีดูแลได้หลายหน่วยงาน (เช่น หัวหน้าที่ดูแล 2 หน่วยงาน)
-- รันครั้งเดียวใน Supabase > SQL Editor (รันซ้ำได้ ไม่ลบข้อมูลเดิม)
-- department_id เดิม = หน่วยงานหลัก • extra_department_ids = หน่วยงานที่ดูแลเพิ่ม

-- 1) คอลัมน์หน่วยงานที่ดูแลเพิ่ม
alter table public.profiles add column if not exists extra_department_ids integer[] not null default '{}';

-- 2) ตอนสมัครสมาชิก: คัดลอกหน่วยงานที่เลือกเพิ่ม (raw_user_meta_data.extra_department_ids) ลง profiles
--    ทำงานคู่กับ trigger สร้าง profiles เดิม ไม่ต้องแก้ trigger เดิม • ผู้ดูแลระบบยังต้องอนุมัติบัญชีก่อนใช้งาน
create or replace function public.profiles_extra_departments_from_signup()
returns trigger
language plpgsql
security definer
set search_path = public, auth
as $$
declare
  meta jsonb;
begin
  if new.extra_department_ids is null or cardinality(new.extra_department_ids) = 0 then
    select u.raw_user_meta_data into meta from auth.users u where u.id::text = new.id::text;
    if meta is not null and jsonb_typeof(meta -> 'extra_department_ids') = 'array' then
      new.extra_department_ids := coalesce((
        select array_agg(distinct v::integer)
        from jsonb_array_elements_text(meta -> 'extra_department_ids') as v
        where v ~ '^[0-9]{1,9}$'
          and v <> coalesce(new.department_id::text, '')
          and exists (select 1 from public.departments d where d.id::text = v)
      ), '{}');
      if cardinality(new.extra_department_ids) > 10 then
        new.extra_department_ids := new.extra_department_ids[1:10];
      end if;
    end if;
  end if;
  if new.extra_department_ids is null then new.extra_department_ids := '{}'; end if;
  return new;
end;
$$;

drop trigger if exists profiles_extra_departments_from_signup on public.profiles;
create trigger profiles_extra_departments_from_signup
  before insert on public.profiles
  for each row execute function public.profiles_extra_departments_from_signup();

-- 3) ให้ API เห็นคอลัมน์ใหม่ทันที
notify pgrst, 'reload schema';

-- ตัวอย่าง: ให้บัญชีที่อนุมัติแล้วดูแลหน่วยงาน id 12 เพิ่ม (หรือใช้หน้า "อนุมัติสมาชิกใหม่" > หน่วยงานที่ดูแลเพิ่ม)
-- update public.profiles set extra_department_ids = array[12] where email = 'head@example.com';
