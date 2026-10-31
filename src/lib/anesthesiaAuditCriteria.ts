export type AnesthesiaAuditItem = { id: string; number: number; label: string; maxScore: 4 };
export type AnesthesiaAuditGroup = { title: string; items: AnesthesiaAuditItem[] };

/** ถอดรายการประเมินจากเอกสาร 'วิสัญญี.docx' 13 รายการ คะแนนเต็มรายการละ 4 คะแนน (เกณฑ์ปรับปรุงจากต้นฉบับ 5 คะแนน) */
export const anesthesiaAuditGroups: AnesthesiaAuditGroup[] = [
  {title: '1. ระยะก่อนผ่าตัด', items: [
    {id:'an_01',number:1,label:'การรวบรวมข้อมูลเกี่ยวกับประวัติความเจ็บป่วย การตรวจร่างกาย และแผนการผ่าตัด ก่อนการผ่าตัด',maxScore:4},
    {id:'an_02',number:2,label:'Pre-sedation / Pre-anesthesia Assessment ก่อนผ่าตัด',maxScore:4},
    {id:'an_03',number:3,label:'การเปิดโอกาสให้ผู้ป่วยร่วมตัดสินใจ เลือกวิธีการระงับความรู้สึกอย่างเหมาะสม',maxScore:4},
    {id:'an_04',number:4,label:'การกำหนดแผนการดูแลผู้ป่วยระหว่างการระงับความรู้สึกล่วงหน้าก่อนผ่าตัด',maxScore:4},
    {id:'an_05',number:5,label:'การสอน/อธิบายเพื่อเตรียมความพร้อมก่อนให้ยาระงับความรู้สึก',maxScore:4},
  ]},
  {title: '2. ระยะผ่าตัด', items: [
    {id:'an_06',number:6,label:'การประเมินผู้ป่วยซ้ำก่อน Anesthesia induction',maxScore:4},
    {id:'an_07',number:7,label:'การประเมินสภาพร่างกายและจิตใจ (กรณีผู้ป่วยยังรู้สึกตัว) ตลอดระยะเวลาของการระงับความรู้สึก',maxScore:4},
    {id:'an_08',number:8,label:'การบันทึกการให้ยา เลือด สารน้ำ อย่างถูกต้องครบถ้วนระหว่างผ่าตัด',maxScore:4},
  ]},
  {title: '3. ระยะหลังผ่าตัด', items: [
    {id:'an_09',number:9,label:'การประเมินสภาพผู้ป่วยหลังสิ้นสุดการผ่าตัดทันที ได้แก่ สภาพแผล สภาพผิวหนังโดยเฉพาะบริเวณวาง Plate/ผูกมัด และสภาพการหายใจและระบบไหลเวียน',maxScore:4},
  ]},
  {title: '4. ระยะพักฟื้น', items: [
    {id:'an_10',number:10,label:'การเฝ้าระวังอาการผู้ป่วยอย่างใกล้ชิดหลังผ่าตัด ได้แก่ การหายใจ การไหลเวียนโลหิต ความรู้สึกตัวและการตอบสนอง และความปวด',maxScore:4},
    {id:'an_11',number:11,label:'การแก้ปัญหาภาวะแทรกซ้อนหลังผ่าตัดที่เกิดขึ้นทันที',maxScore:4},
    {id:'an_12',number:12,label:'การประเมินความพร้อมของผู้ป่วยก่อนย้ายออกจากห้องพักฟื้น',maxScore:4},
    {id:'an_13',number:13,label:'การติดตามประเมินผู้ป่วยภายหลังการผ่าตัด',maxScore:4},
  ]},
];
export const anesthesiaAuditItems = anesthesiaAuditGroups.flatMap(group => group.items);
export const anesthesiaMaxScore = anesthesiaAuditItems.reduce((sum,item)=>sum+item.maxScore,0);
