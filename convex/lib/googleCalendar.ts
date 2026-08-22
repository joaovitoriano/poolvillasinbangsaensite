export type GoogleCalendarEvent = {
  id?: string;
  status?: string;
  summary?: string;
  description?: string;
  start?: { date?: string; dateTime?: string };
  end?: { date?: string; dateTime?: string };
  eventLabelId?: string;
};

export type GoogleCalendarLabel = { backgroundColor?: string };

export type ImportedCalendarEvent = { externalEventId:string; startDate:string; endDate:string; name:string; description?:string; kind:"booking"|"closed"|"ignored" };

const MANGO_BACKGROUND_COLOR = "#f09300";
const TOMATO_BACKGROUND_COLOR = "#d50000";

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

function labelKind(label:GoogleCalendarLabel|undefined):ImportedCalendarEvent["kind"] {
  const backgroundColor=label?.backgroundColor?.trim().toLocaleLowerCase();
  if(backgroundColor===MANGO_BACKGROUND_COLOR)return "ignored";
  if(backgroundColor===TOMATO_BACKGROUND_COLOR)return "closed";
  return "booking";
}

export function normalizeGoogleEvents(events:GoogleCalendarEvent[], labels:Map<string,GoogleCalendarLabel>):ImportedCalendarEvent[]{
  const result:ImportedCalendarEvent[]=[];
  for(const event of events){
    if(!event.id||event.status==="cancelled")continue;
    const startDate=event.start?.date??(event.start?.dateTime?bangkokDate(event.start.dateTime):undefined);
    const inclusiveEndDate=event.end?.date??(event.end?.dateTime?bangkokDate(event.end.dateTime):startDate);
    if(!startDate||!inclusiveEndDate||inclusiveEndDate<startDate)continue;
    const kind=labelKind(event.eventLabelId?labels.get(event.eventLabelId):undefined);
    result.push({externalEventId:event.id,startDate,endDate:nextDate(inclusiveEndDate),name:(event.summary||"Google Calendar event").slice(0,160),description:event.description?.slice(0,2000),kind});
  }
  return result;
}
