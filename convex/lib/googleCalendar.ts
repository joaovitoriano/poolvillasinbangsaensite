export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
};

export type ImportedCalendarEvent = { externalEventId:string; startDate:string; endDate:string; name:string; description?:string };

function bangkokDate(dateTime:string){
  const parts=new Intl.DateTimeFormat("en-CA",{timeZone:"Asia/Bangkok",year:"numeric",month:"2-digit",day:"2-digit"}).formatToParts(new Date(dateTime));
  const values=Object.fromEntries(parts.map(part=>[part.type,part.value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function normalizeGoogleEvents(events:GoogleCalendarEvent[]):ImportedCalendarEvent[]{
  const result:ImportedCalendarEvent[]=[];
  for(const event of events){
    if(!event.id||event.status==="cancelled")continue;
    const startDate=event.start?.date??(event.start?.dateTime?bangkokDate(event.start.dateTime):undefined);
    const endDate=event.end?.date??(event.end?.dateTime?bangkokDate(event.end.dateTime):undefined);
    if(!startDate||!endDate||endDate<=startDate)continue;
    result.push({externalEventId:event.id,startDate,endDate,name:(event.summary||"Google Calendar event").slice(0,160),description:event.description?.slice(0,2000)});
  }
  return result;
}
