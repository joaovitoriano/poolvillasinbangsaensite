import {
  IconAirConditioning,
  IconBarbell,
  IconBath,
  IconBeach,
  IconBike,
  IconBrandNetflix,
  IconDesk,
  IconChefHat,
  IconCoffee,
  IconDeviceCctv,
  IconDroplet,
  IconDeviceGamepad2,
  IconDeviceProjector,
  IconDeviceTv,
  IconElevator,
  IconFireExtinguisher,
  IconFirstAidKit,
  IconFlame,
  IconFridge,
  IconGardenCart,
  IconGrill,
  IconIroning,
  IconLock,
  IconMusic,
  IconParking,
  IconPaw,
  IconPool,
  IconRipple,
  IconShieldCheck,
  IconSparkles,
  IconSun,
  IconToolsKitchen2,
  type TablerIcon,
  IconToolsKitchen3,
  IconVolume,
  IconWashMachine,
  IconWifi,
  IconWind,
} from "@tabler/icons-react";
import { AMENITY_PRESETS } from "./amenity-presets";

export const AMENITY_ICONS = {
  pool: IconPool,
  wifi: IconWifi,
  karaoke: IconMusic,
  grill: IconGrill,
  parking: IconParking,
  kitchen: IconChefHat,
  airConditioning: IconAirConditioning,
  beachfront: IconBeach,
  seaView: IconRipple,
  tv: IconDeviceTv,
  pet: IconPaw,
  bath: IconBath,
  dining: IconToolsKitchen3,
  refrigerator: IconFridge,
  coffee: IconCoffee,
  games: IconDeviceGamepad2,
  projector: IconDeviceProjector,
  laundry: IconWashMachine,
  iron: IconIroning,
  security: IconShieldCheck,
  cctv: IconDeviceCctv,
  firstAid: IconFirstAidKit,
  terrace: IconSun,
  workspace: IconDesk,
  heating: IconFlame,
  elevator: IconElevator,
  dishwasher: IconToolsKitchen2,
  soundSystem: IconVolume,
  netflix: IconBrandNetflix,
  poolTable: IconDeviceGamepad2,
  gym: IconBarbell,
  bicycle: IconBike,
  garden: IconGardenCart,
  outdoorShower: IconDroplet,
  hairDryer: IconWind,
  safe: IconLock,
  fireExtinguisher: IconFireExtinguisher,
  other: IconSparkles,
} satisfies Record<string, TablerIcon>;

export type AmenityIconName = keyof typeof AMENITY_ICONS;

export const AMENITY_ICON_OPTIONS: ReadonlyArray<{
  value: AmenityIconName;
  label: string;
  labelTh: string;
}> = [
  { value: "pool", label: "Swimming pool", labelTh: "สระว่ายน้ำ" },
  { value: "wifi", label: "Wi-Fi", labelTh: "Wi-Fi" },
  { value: "karaoke", label: "Karaoke / music", labelTh: "คาราโอเกะ / เพลง" },
  { value: "grill", label: "BBQ / grill", labelTh: "บาร์บีคิว / เตาย่าง" },
  { value: "parking", label: "Parking", labelTh: "ที่จอดรถ" },
  { value: "kitchen", label: "Kitchen", labelTh: "ห้องครัว" },
  { value: "airConditioning", label: "Air conditioning", labelTh: "เครื่องปรับอากาศ" },
  { value: "beachfront", label: "Beachfront", labelTh: "ติดชายหาด" },
  { value: "seaView", label: "Sea view", labelTh: "วิวทะเล" },
  { value: "tv", label: "Television", labelTh: "โทรทัศน์" },
  { value: "pet", label: "Pet friendly", labelTh: "นำสัตว์เลี้ยงเข้าพักได้" },
  { value: "bath", label: "Bath / jacuzzi", labelTh: "อ่างอาบน้ำ / จากุซซี่" },
  { value: "dining", label: "Dining", labelTh: "พื้นที่รับประทานอาหาร" },
  { value: "refrigerator", label: "Refrigerator", labelTh: "ตู้เย็น" },
  { value: "coffee", label: "Coffee", labelTh: "กาแฟ" },
  { value: "games", label: "Games", labelTh: "เกม" },
  { value: "projector", label: "Projector / cinema", labelTh: "โปรเจกเตอร์ / โรงภาพยนตร์" },
  { value: "laundry", label: "Laundry", labelTh: "ซักรีด" },
  { value: "iron", label: "Iron", labelTh: "เตารีด" },
  { value: "security", label: "Security", labelTh: "ระบบรักษาความปลอดภัย" },
  { value: "cctv", label: "CCTV", labelTh: "กล้องวงจรปิด" },
  { value: "firstAid", label: "First aid", labelTh: "ปฐมพยาบาล" },
  { value: "terrace", label: "Terrace / outdoor", labelTh: "ระเบียง / กลางแจ้ง" },
  { value: "workspace", label: "Workspace", labelTh: "พื้นที่ทำงาน" },
  { value: "heating", label: "Heating", labelTh: "เครื่องทำความร้อน" },
  { value: "elevator", label: "Elevator", labelTh: "ลิฟต์" },
  { value: "dishwasher", label: "Dishwasher", labelTh: "เครื่องล้างจาน" },
  { value: "soundSystem", label: "Sound system", labelTh: "ระบบเสียง" },
  { value: "netflix", label: "Netflix", labelTh: "Netflix" },
  { value: "poolTable", label: "Pool table", labelTh: "โต๊ะพูล" },
  { value: "gym", label: "Gym", labelTh: "ห้องออกกำลังกาย" },
  { value: "bicycle", label: "Bicycle", labelTh: "จักรยาน" },
  { value: "garden", label: "Garden", labelTh: "สวน" },
  { value: "outdoorShower", label: "Outdoor shower", labelTh: "ฝักบัวกลางแจ้ง" },
  { value: "hairDryer", label: "Hair dryer", labelTh: "ไดร์เป่าผม" },
  { value: "safe", label: "Safe", labelTh: "ตู้เซฟ" },
  { value: "fireExtinguisher", label: "Fire extinguisher", labelTh: "ถังดับเพลิง" },
  { value: "other", label: "Other", labelTh: "อื่น ๆ" },
];

export const PREMADE_AMENITIES = AMENITY_PRESETS;

function inferAmenityIcon(slug: string): AmenityIconName {
  const value = slug.toLowerCase();
  if (value.includes("pool")) return "pool";
  if (value.includes("wifi") || value.includes("internet")) return "wifi";
  if (value.includes("karaoke") || value.includes("music")) return "karaoke";
  if (value.includes("bbq") || value.includes("grill")) return "grill";
  if (value.includes("park")) return "parking";
  if (value.includes("kitchen") || value.includes("cook")) return "kitchen";
  if (value.includes("air")) return "airConditioning";
  if (value.includes("beach")) return "beachfront";
  if (value.includes("sea") || value.includes("ocean")) return "seaView";
  if (value.includes("tv") || value.includes("television")) return "tv";
  if (value.includes("pet") || value.includes("dog") || value.includes("cat")) return "pet";
  if (value.includes("bath") || value.includes("jacuzzi")) return "bath";
  if (value.includes("fridge") || value.includes("refrigerator")) return "refrigerator";
  if (value.includes("wash") || value.includes("laundry")) return "laundry";
  if (value.includes("security")) return "security";
  if (value.includes("cctv") || value.includes("camera")) return "cctv";
  return "other";
}

export function AmenityIcon({
  icon,
  slug,
  size = 20,
  className,
}: {
  icon?: string;
  slug: string;
  size?: number;
  className?: string;
}) {
  const name = icon && icon in AMENITY_ICONS ? (icon as AmenityIconName) : inferAmenityIcon(slug);
  const Icon = AMENITY_ICONS[name];
  return <Icon size={size} stroke={1.7} className={className} aria-hidden="true" />;
}
