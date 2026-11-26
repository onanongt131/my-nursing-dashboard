export type Group='RN'|'PN'|'NA'|'EMP';
export type Entry={activityId:string;day:number;quantity:number;minutes:number|null;note?:string;score?:number};
export type Staff={name:string;displayName:string;position:string;group:Group;suggestedRole?:'HEAD'|'SUBHEAD'};
export type Shift={date:string;shift:string;name:string;type:'NORMAL'|'OT'};
export type Source={nativeDaily?:Record<string,{records:any[];updatedBy:string;updatedAt:string;reason:string}>;schemaVersion:1;month:string;ward:string;supervisorName:string;staff:Staff[];headStaff:Staff[];activities:any[];records:any[];autoCounts:Record<string,Record<string,any>>;assignments:Record<string,any>;daily:any[];roster:Shift[];rosterImported:boolean;rosterNameOrder:string[];morningDischarges:Record<string,number>;legacyHeads:any[];legacySignatureSamples:any[];statistics:any[];procedures:any[]};
export type DocumentKind='claims'|'head'|'staff_signature'|'supervisor_signature';
export type P4PDocument={department_id:number;month:string;person_name:string;kind:DocumentKind;data:any;version:number;updated_at:string};
