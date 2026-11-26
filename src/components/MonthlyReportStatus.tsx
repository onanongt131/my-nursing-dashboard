type Status = 'missing' | 'waiting' | 'pending' | 'incomplete';

const labels: Record<Status, string> = {
  missing: 'ไม่มีข้อมูล', waiting: 'รอข้อมูล',
  pending: 'รออนุมัติ', incomplete: 'ข้อมูลไม่ครบ',
};

export function ReportStatusIcon({status, detail}: {status: Status; detail?: string}) {
  const label = detail ?? labels[status];
  if (status === 'incomplete') {
    return <span role="img" aria-label={label} title={label}
      className="inline-flex h-5 w-5 shrink-0 items-center justify-center align-middle">
      <svg aria-hidden="true" viewBox="0 0 20 20" width="16" height="16">
        <path d="M10 2 19 17H1Z" fill="#ffb74d"/>
        <path d="M10 7v4.5m0 2.4v.2" fill="none" stroke="#92400e" strokeWidth="1.6" strokeLinecap="round"/>
      </svg>
    </span>;
  }
  const clock = status === 'pending' || status === 'waiting';
  const color = status === 'pending'
    ? 'bg-amber-100 text-amber-800'
    : status === 'waiting' ? 'bg-sky-50 text-sky-700' : 'bg-slate-100 text-slate-500';
  return <span role="img" aria-label={label} title={label}
    className={'inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full align-middle ' + color}>
    <svg aria-hidden="true" viewBox="0 0 20 20" width="13" height="13" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="10" cy="10" r="7.5"/>
      {clock ? <path d="M10 5.8v4.5l2.7 1.7"/> : <path d="M6.7 10h6.6"/>}
    </svg>
  </span>;
}

export function ReportStatusLegend({statuses, stacked = false}: {statuses: Status[]; stacked?: boolean}) {
  return <div aria-label="หมายเหตุไอคอน" className={`flex shrink-0 gap-x-3 gap-y-1 text-xs text-slate-600 ${stacked ? "flex-col items-start" : "flex-wrap items-center"}`}>
    {statuses.map(status => <span key={status} className="inline-flex items-center gap-1 whitespace-nowrap">
      <span aria-hidden="true"><ReportStatusIcon status={status}/></span>{labels[status]}
    </span>)}
  </div>;
}

/** Equal side slots keep the number centered whether or not a warning is shown. */
export function ReportValue({children, warning, align = 'center'}: {
  children: import('react').ReactNode;
  warning?: import('react').ReactNode;
  align?: 'center' | 'right' | 'compact';
}) {
  if (align === 'compact') {
    return <span className="inline-flex max-w-full flex-wrap items-center justify-end align-middle tabular-nums">
      <span className="inline-flex w-4 shrink-0 justify-end empty:hidden [&_[role=img]]:size-4">{warning || null}</span>
      <span className="min-w-0">{children}</span>
    </span>;
  }
  if (align === 'right') {
    return <span className="inline-flex items-center justify-end whitespace-nowrap align-middle tabular-nums">
      <span className="inline-flex w-5 shrink-0 justify-end">{warning}</span>
      <span>{children}</span>
    </span>;
  }
  return <span className="inline-grid grid-cols-[1.25rem_auto_1.25rem] items-center whitespace-nowrap align-middle tabular-nums">
    <span className="col-start-1 row-start-1 flex justify-end">{warning}</span>
    <span className="col-start-2 row-start-1">{children}</span>
  </span>;
}

/** One 36px heading and up to fifteen 36px rows. Printing expands the table. */
export function MonthlyTableViewport({label, children}: {
  label: string;
  children: import('react').ReactNode;
}) {
  return <div role="region" aria-label={label} tabIndex={0}
    className="max-h-[576px] overflow-auto overscroll-x-contain focus-visible:outline focus-visible:outline-teal-500 print:max-h-none print:overflow-visible [&>table>thead]:sticky [&>table>thead]:top-0 [&>table>thead]:z-30 [&>table>thead]:bg-slate-50 [&>table>thead>tr]:h-9 [&>table>thead>tr>th]:py-0 [&>table>tbody>tr]:h-9 [&>table>tbody>tr>td]:py-0 [&>table>tbody>tr>th]:py-0">
    {children}
  </div>;
}
