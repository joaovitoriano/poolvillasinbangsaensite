export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  eventLabelId?: string;
};

export type ImportedCalendarEvent = { externalEventId:string; startDate:string; endDate:string; name:string; description?:string; kind:"booking"|"closed"|"reminder"; labelName?:string };

function nextDate(date:string){
  const value=new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate()+1);
  return value.toISOString().slice(0,10);
}

function bangkokDate(dateTime:string){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(dateTime));
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeGoogleEvents(events:GoogleCalendarEvent[], labelNames:Map<string,string>):ImportedCalendarEvent[]{
  const result:ImportedCalendarEvent[]=[];
  for(const event of events){
    if(!event.id||event.status==="cancelled")continue;
    const startDate=event.start?.date??(event.start?.dateTime?bangkokDate(event.start.dateTime):undefined);
    const inclusiveEndDate=event.end?.date??(event.end?.dateTime?bangkokDate(event.end.dateTime):startDate);
    if(!startDate||!inclusiveEndDate||inclusiveEndDate<startDate)continue;
    const labelName=event.eventLabelId?labelNames.get(event.eventLabelId)?.trim():undefined;
    const normalizedLabel=labelName?.toLocaleLowerCase();
    const kind=normalizedLabel==="mango"?"reminder":normalizedLabel==="tomato"?"closed":"booking";
    result.push({externalEventId:event.id,startDate,endDate:nextDate(inclusiveEndDate),name:(event.summary||"Google Calendar event").slice(0,160),description:event.description?.slice(0,2000),kind,labelName});
  }
  return result;
}
