import { v } from "convex/values";
import { mutation } from "./_generated/server";
import { requireSuperadmin } from "./lib/access";
import { amenitySlug } from "./lib/amenities";

const amenities = [
  ["Swimming pool", "สระว่ายน้ำ", "pool"],
  ["Wi-Fi", "ไวไฟ", "wifi"],
  ["Air conditioning", "เครื่องปรับอากาศ", "air-conditioning"],
  ["Kitchen", "ห้องครัว", "kitchen"],
  ["Parking", "ที่จอดรถ", "parking"],
] as const;

const houseRules = [
  ["No smoking", "ห้ามสูบบุหรี่", "no-smoking"],
  ["No pets", "ไม่อนุญาตให้นำสัตว์เลี้ยงเข้าพัก", "no-pets"],
  ["No parties", "ห้ามจัดงานปาร์ตี้", "no-parties"],
] as const;

const verifiedFixturePhotos = [
  ["canary-pool-villa-bangsaen", "https://sgp1.digitaloceanspaces.com/villapaza-spaces/public/images/house/8c2bdd04-ab35-488f-ab5d-cfc183a190f3_1770627887000.webp"],
  ["okinawa-pool-villa-bangsaen", "https://admin.pattayavillaresort.com/assets/4896d138-1862-4600-a056-a427cbc132e4"],
  ["terrace-house-bangsaen", "https://admin.pattayavillaresort.com/assets/67bfe361-6b5d-4407-8c13-7f70181ca27f"],
  ["the-groove-pool-villa-bangsaen", "https://admin.pattayavillaresort.com/assets/5c0ad757-cadb-420e-9fce-746ef1572c34"],
  ["black-moon-pool-villa-bangsaen", "https://admin.pattayavillaresort.com/assets/622c9a5e-4e98-4171-a07a-3d94d31ec992"],
  ["siri-pool-villa-bangsaen-1", "https://www.thaimiceconnect.com/images/upload/images/bu/43192/D6CE61E1-6462-49E1-9841-6EB393E7CD3F.jpeg"],
  ["siri-pool-villa-bangsaen-2", "https://www.thaimiceconnect.com/images/upload/images/bu/43192/D6CE61E1-6462-49E1-9841-6EB393E7CD3F.jpeg"],
  ["ivada-pool-villa-bangsaen", "https://res.cloudinary.com/vucxmv6l/image/upload/w_1600,q_auto,f_auto/v1785601405/athome/villa4/dwzqaxeee4omzmtwwtin.jpg"],
] as const;

const villaFixtures = [
  {
    "slug": "canary-pool-villa-bangsaen",
    "nameEn": "Canary Pool Villa Bangsaen",
    "nameTh": "คานารี่ พูลวิลล่า บางแสน (บ้านทองสุข บางแสน)",
    "nameSource": "Canary Pool Villa Bangsaen",
    "descriptionEn": "Canary, also listed by OTAs as Baan Thongsuk Bangsaen, is a 219 sq m three-bedroom villa with two bathrooms, a private pool, kitchen, Wi-Fi, air conditioning and free parking. Published listings accommodate up to 10 guests.",
    "descriptionTh": "Canary หรือที่เว็บไซต์จองที่พักใช้ชื่อบ้านทองสุข บางแสน เป็นวิลล่าขนาด 219 ตร.ม. มี 3 ห้องนอน 2 ห้องน้ำ สระว่ายน้ำส่วนตัว ห้องครัว Wi-Fi เครื่องปรับอากาศ และที่จอดรถฟรี โดยข้อมูลสาธารณะระบุว่ารองรับได้สูงสุด 10 คน",
    "descriptionSource": "Canary, also listed by OTAs as Baan Thongsuk Bangsaen, is a 219 sq m three-bedroom villa with two bathrooms, a private pool, kitchen, Wi-Fi, air conditioning and free parking. Published listings accommodate up to 10 guests.",
    "formattedAddress": "Bangsaen Sai 2 Soi 4, Saen Suk, Chon Buri",
    "latitude": 13.2953485,
    "longitude": 100.9160671,
    "weekdayPriceThb": 7000,
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuests": 10,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "12:00",
    "securityDepositThb": 2000,
    "sortOrder": 1
  },
  {
    "slug": "namhom-tawan-pool-villa-bangsaen",
    "nameEn": "Namhom Tawan Pool Villa Bangsaen",
    "nameTh": "น้ำหอมตะวัน พูลวิลล่า บางแสน",
    "nameSource": "Namhom Tawan Pool Villa Bangsaen",
    "descriptionEn": "Namhom Tawan is a Canary-network group villa in Bangsaen with three bedrooms, two bathrooms and a private pool. Public property pages consistently advertise capacity for up to 10 guests and a location around 800 metres from the beach.",
    "descriptionTh": "น้ำหอมตะวันเป็นบ้านพักในเครือ Canary ที่บางแสน มี 3 ห้องนอน 2 ห้องน้ำ และสระว่ายน้ำส่วนตัว แหล่งข้อมูลสาธารณะระบุว่ารองรับได้สูงสุด 10 คน และอยู่ห่างชายหาดประมาณ 800 เมตร",
    "descriptionSource": "Namhom Tawan is a Canary-network group villa in Bangsaen with three bedrooms, two bathrooms and a private pool. Public property pages consistently advertise capacity for up to 10 guests and a location around 800 metres from the beach.",
    "formattedAddress": "Bangsaen, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuests": 10,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 2
  },
  {
    "slug": "thongpeam-pool-villa-bangsaen",
    "nameEn": "Thongpeam Pool Villa",
    "nameTh": "ทองเปี่ยม พูลวิลล่า",
    "nameSource": "Thongpeam Pool Villa",
    "descriptionEn": "Pool villa in Bangsaen.",
    "descriptionTh": "พูลวิลล่าในบางแสน",
    "descriptionSource": "Pool villa in Bangsaen.",
    "formattedAddress": "Bangsaen, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 1,
    "bathrooms": 1,
    "maxGuests": 1,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 3
  },
  {
    "slug": "full-house-pool-villa-bangsaen",
    "nameEn": "Full House Pool Villa Bangsaen",
    "nameTh": "ฟูลเฮ้าส์ พูลวิลล่า บางแสน",
    "nameSource": "Full House Pool Villa Bangsaen",
    "descriptionEn": "Full House is an At Home network villa with four bedrooms and four bathrooms. Its current page advertises a private pool with slide, pool table, karaoke, Wi-Fi, a fully equipped kitchen and parking, with capacity for 10–14 guests.",
    "descriptionTh": "Full House เป็นบ้านพักในเครือ At Home มี 4 ห้องนอน 4 ห้องน้ำ หน้าปัจจุบันระบุว่ามีสระว่ายน้ำส่วนตัวพร้อมสไลเดอร์ โต๊ะพูล คาราโอเกะ Wi-Fi ห้องครัวพร้อมอุปกรณ์ และที่จอดรถ รองรับประมาณ 10–14 คน",
    "descriptionSource": "Full House is an At Home network villa with four bedrooms and four bathrooms. Its current page advertises a private pool with slide, pool table, karaoke, Wi-Fi, a fully equipped kitchen and parking, with capacity for 10–14 guests.",
    "formattedAddress": "Bangsaen, near the fish market and approximately 1.5 km from the beach",
    "latitude": 13.3006782,
    "longitude": 100.9204259,
    "weekdayPriceThb": 6900,
    "weekendPriceThb": 11900,
    "bedrooms": 4,
    "bathrooms": 4,
    "maxGuests": 14,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 4
  },
  {
    "slug": "okinawa-pool-villa-bangsaen",
    "nameEn": "Okinawa Pool Villa Bangsaen",
    "nameTh": "โอกินาว่า พูลวิลล่า บางแสน",
    "nameSource": "Okinawa Pool Villa Bangsaen",
    "descriptionEn": "Okinawa is a minimalist/Muji-style five-bedroom, three-bathroom villa for 12–15 guests. It includes a 3×6 m private chlorine pool, karaoke, Wi-Fi, a kitchen and four parking spaces, with beach, cafes and restaurants nearby.",
    "descriptionTh": "Okinawa เป็นพูลวิลล่าสไตล์มินิมอลมูจิ มี 5 ห้องนอน 3 ห้องน้ำ รองรับ 12–15 คน พร้อมสระคลอรีนส่วนตัวขนาด 3×6 เมตร คาราโอเกะ Wi-Fi ห้องครัว และที่จอดรถ 4 คัน อยู่ใกล้ชายหาด คาเฟ่ และร้านอาหาร",
    "descriptionSource": "Okinawa is a minimalist/Muji-style five-bedroom, three-bathroom villa for 12–15 guests. It includes a 3×6 m private chlorine pool, karaoke, Wi-Fi, a kitchen and four parking spaces, with beach, cafes and restaurants nearby.",
    "formattedAddress": "Bangsaen Sai 2 Soi 4 Trok 5, Saen Suk, Chon Buri",
    "latitude": 13.2893316,
    "longitude": 100.9178562,
    "weekdayPriceThb": 7900,
    "weekendPriceThb": 12900,
    "bedrooms": 5,
    "bathrooms": 3,
    "maxGuests": 15,
    "parkingSpaces": 4,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "securityDepositThb": 5000,
    "sortOrder": 5
  },
  {
    "slug": "balokco-pool-villa-bangsaen",
    "nameEn": "Balokco Pool Villa",
    "nameTh": "บาโลกโก พูลวิลล่า",
    "nameSource": "Balokco Pool Villa",
    "descriptionEn": "The property supplied as Balocco appears on Google Maps as “Balokco pool villa.” The map address is identifiable, but no official website, phone number, room count, capacity or current rate was attached to the listing.",
    "descriptionTh": "ชื่อที่ผู้ใช้ให้มาว่า Balocco ปรากฏบน Google Maps เป็น “Balokco pool villa” แม้จะพบที่อยู่บนแผนที่ แต่ยังไม่มีเว็บไซต์ เบอร์โทร จำนวนห้อง จำนวนผู้เข้าพัก หรือราคาปัจจุบันที่ยืนยันได้",
    "descriptionSource": "The property supplied as Balocco appears on Google Maps as “Balokco pool villa.” The map address is identifiable, but no official website, phone number, room count, capacity or current rate was attached to the listing.",
    "formattedAddress": "Bangsaen Sai 2 Soi 4 Trok 7, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 1,
    "bathrooms": 1,
    "maxGuests": 1,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 6
  },
  {
    "slug": "terrace-house-bangsaen",
    "nameEn": "Terrace House Pool Villa Bangsaen",
    "nameTh": "เทอเรสเฮ้าส์ พูลวิลล่า บางแสน",
    "nameSource": "Terrace House Pool Villa Bangsaen",
    "descriptionEn": "Terrace House is a three-bedroom, two-bathroom seafront property near Khao Sam Muk for 8–10 guests. It offers an equipped kitchen, Wi-Fi, parking for three cars, fishing access and an outdoor bathtub, and accepts pets for a fee.",
    "descriptionTh": "Terrace House เป็นบ้านพักติดทะเลใกล้เขาสามมุข มี 3 ห้องนอน 2 ห้องน้ำ รองรับ 8–10 คน พร้อมห้องครัว Wi-Fi ที่จอดรถ 3 คัน พื้นที่ตกปลา อ่างอาบน้ำกลางแจ้ง และรับสัตว์เลี้ยงโดยมีค่าบริการ",
    "descriptionSource": "Terrace House is a three-bedroom, two-bathroom seafront property near Khao Sam Muk for 8–10 guests. It offers an equipped kitchen, Wi-Fi, parking for three cars, fishing access and an outdoor bathtub, and accepts pets for a fee.",
    "formattedAddress": "41 Rop Khao Sam Muk Soi 1, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 4900,
    "weekendPriceThb": 8900,
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuests": 10,
    "parkingSpaces": 3,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "securityDepositThb": 3000,
    "sortOrder": 7
  },
  {
    "slug": "diesso-pool-villa-bangsaen",
    "nameEn": "Di'Esso Pool Villa Bangsaen",
    "nameTh": "ดิเอสโซ่ พูลวิลล่า บางแสน",
    "nameSource": "Di'Esso Pool Villa Bangsaen",
    "descriptionEn": "Di'Esso is a newly announced At Home villa with four bedrooms and five bathrooms, advertised as approximately four minutes from the beach. Public search results are still limited and do not expose a stable map pin, capacity, rates or full policy.",
    "descriptionTh": "Di'Esso เป็นบ้านพักเปิดใหม่ในเครือ At Home มี 4 ห้องนอน 5 ห้องน้ำ และโฆษณาว่าอยู่ห่างทะเลประมาณ 4 นาที ข้อมูลสาธารณะยังมีจำกัดและยังไม่พบหมุดแผนที่ จำนวนผู้เข้าพัก ราคา หรือเงื่อนไขฉบับเต็มที่ยืนยันได้",
    "descriptionSource": "Di'Esso is a newly announced At Home villa with four bedrooms and five bathrooms, advertised as approximately four minutes from the beach. Public search results are still limited and do not expose a stable map pin, capacity, rates or full policy.",
    "formattedAddress": "Bangsaen, approximately four minutes from the beach",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 4,
    "bathrooms": 5,
    "maxGuests": 1,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 8
  },
  {
    "slug": "the-groove-pool-villa-bangsaen",
    "nameEn": "The Groove Pool Villa Bangsaen",
    "nameTh": "เดอะกรู๊ฟ พูลวิลล่า บางแสน",
    "nameSource": "The Groove Pool Villa Bangsaen",
    "descriptionEn": "The Groove is a four-bedroom, five-bathroom villa for 12–15 guests near Wonnapha Beach. It has a 3.5×7.5 m private chlorine pool with slide, karaoke, Wi-Fi, a large kitchen, barbecue equipment and parking for four cars.",
    "descriptionTh": "The Groove เป็นพูลวิลล่า 4 ห้องนอน 5 ห้องน้ำ รองรับ 12–15 คน ใกล้หาดวอนนภา มีสระคลอรีนส่วนตัวขนาด 3.5×7.5 เมตรพร้อมสไลเดอร์ คาราโอเกะ Wi-Fi ห้องครัวขนาดใหญ่ อุปกรณ์ปิ้งย่าง และที่จอดรถ 4 คัน",
    "descriptionSource": "The Groove is a four-bedroom, five-bathroom villa for 12–15 guests near Wonnapha Beach. It has a 3.5×7.5 m private chlorine pool with slide, karaoke, Wi-Fi, a large kitchen, barbecue equipment and parking for four cars.",
    "formattedAddress": "Bangsaen Lang Soi 2, near Wonnapha Beach, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 11900,
    "weekendPriceThb": 16900,
    "bedrooms": 4,
    "bathrooms": 5,
    "maxGuests": 15,
    "parkingSpaces": 4,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "securityDepositThb": 5000,
    "sortOrder": 9
  },
  {
    "slug": "black-moon-pool-villa-bangsaen",
    "nameEn": "Black Moon Pool Villa Bangsaen",
    "nameTh": "แบล็คมูน พูลวิลล่า บางแสน",
    "nameSource": "Black Moon Pool Villa Bangsaen",
    "descriptionEn": "Black Moon is consistently described as a four-bedroom, four-bathroom group villa with a private saltwater pool, children's pool or slide, karaoke, pool table, kitchen, barbecue and parking. Public sources conflict on its exact address, price and maximum occupancy, so those values require operator confirmation.",
    "descriptionTh": "Black Moon ถูกระบุอย่างสอดคล้องว่าเป็นพูลวิลล่า 4 ห้องนอน 4 ห้องน้ำ มีสระน้ำเกลือส่วนตัว สระเด็กหรือสไลเดอร์ คาราโอเกะ โต๊ะพูล ห้องครัว อุปกรณ์ปิ้งย่าง และที่จอดรถ แต่แหล่งข้อมูลขัดแย้งกันเรื่องที่อยู่ ราคา และจำนวนผู้เข้าพักสูงสุด จึงต้องยืนยันกับผู้ให้บริการ",
    "descriptionSource": "Black Moon is consistently described as a four-bedroom, four-bathroom group villa with a private saltwater pool, children's pool or slide, karaoke, pool table, kitchen, barbecue and parking. Public sources conflict on its exact address, price and maximum occupancy, so those values require operator confirmation.",
    "formattedAddress": "1/18 Bangsaen Lang Soi 2, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 4,
    "bathrooms": 4,
    "maxGuests": 1,
    "parkingSpaces": 5,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 10
  },
  {
    "slug": "bangsaen-house",
    "nameEn": "Bangsaen House",
    "nameTh": "บ้านบางแสน",
    "nameSource": "Bangsaen House",
    "descriptionEn": "A local directory shows a “Bangsaen House” with three bedrooms, capacity for four and a THB 3,500 nightly rate. Because the name is generic and the page exposes no unique property URL, phone or address, these facts must not be imported until matched to the intended house.",
    "descriptionTh": "ไดเรกทอรีท้องถิ่นแสดง “บ้านบางแสน” ว่ามี 3 ห้องนอน รองรับ 4 คน และราคา 3,500 บาทต่อคืน แต่ชื่อมีความทั่วไปและหน้าเว็บไม่มีลิงก์เฉพาะ เบอร์โทร หรือที่อยู่ จึงไม่ควรนำข้อมูลเข้าฐานข้อมูลจนกว่าจะยืนยันว่าเป็นบ้านหลังที่ต้องการ",
    "descriptionSource": "A local directory shows a “Bangsaen House” with three bedrooms, capacity for four and a THB 3,500 nightly rate. Because the name is generic and the page exposes no unique property URL, phone or address, these facts must not be imported until matched to the intended house.",
    "formattedAddress": "Bangsaen, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 3,
    "bathrooms": 1,
    "maxGuests": 4,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 11
  },
  {
    "slug": "siri-pool-villa-bangsaen-1",
    "nameEn": "Siri Pool Villa Bangsaen 1",
    "nameTh": "ศิริ พูลวิลล่า บางแสน 1",
    "nameSource": "Siri Pool Villa Bangsaen 1",
    "descriptionEn": "Siri Pool Villa Bangsaen 1 is a large five-bedroom villa with eight bathrooms and a private 4×8 m pool. Public profiles advertise a kitchen, karaoke, pool table, Wi-Fi and group capacity around 15 guests, with some sources allowing up to 20.",
    "descriptionTh": "Siri Pool Villa Bangsaen 1 เป็นบ้านพักขนาดใหญ่ มี 5 ห้องนอน 8 ห้องน้ำ และสระว่ายน้ำส่วนตัวขนาด 4×8 เมตร ข้อมูลสาธารณะระบุว่ามีห้องครัว คาราโอเกะ โต๊ะพูล Wi-Fi รองรับประมาณ 15 คน และบางแหล่งระบุสูงสุด 20 คน",
    "descriptionSource": "Siri Pool Villa Bangsaen 1 is a large five-bedroom villa with eight bathrooms and a private 4×8 m pool. Public profiles advertise a kitchen, karaoke, pool table, Wi-Fi and group capacity around 15 guests, with some sources allowing up to 20.",
    "formattedAddress": "146/276 Bangsaen Sai 1, Saen Suk, Chon Buri",
    "latitude": 13.3005507,
    "longitude": 100.9013702,
    "weekdayPriceThb": 7000,
    "bedrooms": 5,
    "bathrooms": 8,
    "maxGuests": 15,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:30",
    "sortOrder": 12
  },
  {
    "slug": "siri-pool-villa-bangsaen-2",
    "nameEn": "Siri Pool Villa 2 Bangsaen",
    "nameTh": "ศิริ พูลวิลล่า 2 บางแสน",
    "nameSource": "Siri Pool Villa 2 Bangsaen",
    "descriptionEn": "Siri Pool Villa 2 is separately mapped on Bangsaen Sai 4 Nuea. Published profiles describe a two-storey modern villa with four bedrooms, five bathrooms, a 3×6 m saltwater pool, karaoke, pool table, Wi-Fi, kitchen, barbecue and private parking.",
    "descriptionTh": "Siri Pool Villa 2 มีหมุดแผนที่แยกบนบางแสนสาย 4 เหนือ ข้อมูลสาธารณะระบุว่าเป็นบ้านสองชั้นสไตล์โมเดิร์น มี 4 ห้องนอน 5 ห้องน้ำ สระน้ำเกลือขนาด 3×6 เมตร คาราโอเกะ โต๊ะพูล Wi-Fi ห้องครัว อุปกรณ์ปิ้งย่าง และที่จอดรถส่วนตัว",
    "descriptionSource": "Siri Pool Villa 2 is separately mapped on Bangsaen Sai 4 Nuea. Published profiles describe a two-storey modern villa with four bedrooms, five bathrooms, a 3×6 m saltwater pool, karaoke, pool table, Wi-Fi, kitchen, barbecue and private parking.",
    "formattedAddress": "Bangsaen Sai 4 Nuea, Saen Suk, Chon Buri",
    "latitude": 13.2981442,
    "longitude": 100.9195964,
    "weekdayPriceThb": 7000,
    "bedrooms": 4,
    "bathrooms": 5,
    "maxGuests": 10,
    "parkingSpaces": 4,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 13
  },
  {
    "slug": "mina-house-bangsaen",
    "nameEn": "Mina House Bangsaen",
    "nameTh": "มิณา เฮ้าส์ บางแสน",
    "nameSource": "Mina House Bangsaen",
    "descriptionEn": "Mina House is a 120 sq m three-bedroom, two-bathroom whole-house stay for up to nine guests. Booking platforms list free Wi-Fi, an equipped kitchen, private parking, barbecue facilities, hot tub/open-air bath and a location roughly 300 metres from the beach. It does not appear to have a conventional swimming pool.",
    "descriptionTh": "Mina House เป็นบ้านพักทั้งหลังขนาดประมาณ 120 ตร.ม. มี 3 ห้องนอน 2 ห้องน้ำ รองรับได้สูงสุด 9 คน เว็บไซต์จองระบุว่ามี Wi-Fi ฟรี ห้องครัวพร้อมอุปกรณ์ ที่จอดรถส่วนตัว อุปกรณ์ปิ้งย่าง อ่างน้ำร้อนหรืออ่างกลางแจ้ง และอยู่ห่างชายหาดประมาณ 300 เมตร โดยไม่พบหลักฐานว่ามีสระว่ายน้ำทั่วไป",
    "descriptionSource": "Mina House is a 120 sq m three-bedroom, two-bathroom whole-house stay for up to nine guests. Booking platforms list free Wi-Fi, an equipped kitchen, private parking, barbecue facilities, hot tub/open-air bath and a location roughly 300 metres from the beach. It does not appear to have a conventional swimming pool.",
    "formattedAddress": "110 Bangsaen Sai 1, Ban Laem Thaen, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 3,
    "bathrooms": 2,
    "maxGuests": 9,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "securityDepositThb": 1000,
    "sortOrder": 14
  },
  {
    "slug": "chidchom-homestay-bangsaen",
    "nameEn": "Chidchom Homestay Bangsaen",
    "nameTh": "ชิดชมโฮมสเตย์ บางแสน",
    "nameSource": "Chidchom Homestay Bangsaen",
    "descriptionEn": "Chidchom Homestay is a mapped property on Bangsaen Sai 2 Soi 13. Social listings advertise three bedrooms, group capacity from four up to 15 guests and a location approximately 500 metres from the sea; most operational details still require direct confirmation.",
    "descriptionTh": "ชิดชมโฮมสเตย์เป็นที่พักที่มีหมุดแผนที่บนบางแสนสาย 2 ซอย 13 โพสต์สาธารณะระบุว่ามี 3 ห้องนอน รองรับกลุ่มตั้งแต่ 4 ถึง 15 คน และอยู่ห่างทะเลประมาณ 500 เมตร โดยรายละเอียดการให้บริการส่วนใหญ่ยังต้องสอบถามโดยตรง",
    "descriptionSource": "Chidchom Homestay is a mapped property on Bangsaen Sai 2 Soi 13. Social listings advertise three bedrooms, group capacity from four up to 15 guests and a location approximately 500 metres from the sea; most operational details still require direct confirmation.",
    "formattedAddress": "20 Bangsaen Sai 2 Soi 13, Saen Suk, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 3,
    "bathrooms": 1,
    "maxGuests": 15,
    "parkingSpaces": 0,
    "checkInTime": "13:00",
    "checkOutTime": "11:00",
    "sortOrder": 15
  },
  {
    "slug": "saenchill-bangsaen-1",
    "nameEn": "SaenChill 1 Bangsaen",
    "nameTh": "แสนชิลล์ 1 บางแสน",
    "nameSource": "SaenChill 1 Bangsaen",
    "descriptionEn": "Pool villa in Bangsaen.",
    "descriptionTh": "พูลวิลล่าในบางแสน",
    "descriptionSource": "Pool villa in Bangsaen.",
    "formattedAddress": "Bangsaen, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 1,
    "bathrooms": 1,
    "maxGuests": 1,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 16
  },
  {
    "slug": "saenchill-bangsaen-2",
    "nameEn": "SaenChill 2 Bangsaen",
    "nameTh": "แสนชิลล์ 2 บางแสน",
    "nameSource": "SaenChill 2 Bangsaen",
    "descriptionEn": "Pool villa in Bangsaen.",
    "descriptionTh": "พูลวิลล่าในบางแสน",
    "descriptionSource": "Pool villa in Bangsaen.",
    "formattedAddress": "Bangsaen, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 7000,
    "bedrooms": 1,
    "bathrooms": 1,
    "maxGuests": 1,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 17
  },
  {
    "slug": "ivada-pool-villa-bangsaen",
    "nameEn": "I VADA Pool Villa Bangsaen",
    "nameTh": "ไอ วาดะ พูลวิลล่า บางแสน",
    "nameSource": "I VADA Pool Villa Bangsaen",
    "descriptionEn": "I VADA is an At Home Pool Villa in Bangsaen with three bedrooms, four bathrooms, a private pool, karaoke, Smart TV, air conditioning and barbecue facilities. Its current listing states capacity for 12–15 guests.",
    "descriptionTh": "ไอ วาดะเป็นพูลวิลล่าในเครือ At Home ที่บางแสน มี 3 ห้องนอน 4 ห้องน้ำ สระว่ายน้ำส่วนตัว คาราโอเกะ สมาร์ททีวี เครื่องปรับอากาศ และอุปกรณ์บาร์บีคิว โดยหน้ารายการปัจจุบันระบุว่ารองรับได้ 12–15 คน",
    "descriptionSource": "I VADA is an At Home Pool Villa in Bangsaen with three bedrooms, four bathrooms, a private pool, karaoke, Smart TV, air conditioning and barbecue facilities. Its current listing states capacity for 12–15 guests.",
    "formattedAddress": "Bangsaen, Chon Buri",
    "latitude": 13.284,
    "longitude": 100.925,
    "weekdayPriceThb": 8900,
    "bedrooms": 3,
    "bathrooms": 4,
    "maxGuests": 15,
    "parkingSpaces": 0,
    "checkInTime": "14:00",
    "checkOutTime": "11:00",
    "sortOrder": 18
  }
] as const;

export const run = mutation({
  args: {},
  returns: v.object({
    amenitiesCreated: v.number(),
    houseRulesCreated: v.number(),
    villasCreated: v.number(),
    sleepingArrangementsCreated: v.number(),
    settingsPreserved: v.boolean(),
  }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    const settingsBefore = await ctx.db.query("siteSettings").take(2);
    if (settingsBefore.length > 1) throw new Error("Site settings must contain exactly one record / การตั้งค่าเว็บไซต์ต้องมีเพียงหนึ่งรายการ");

    let amenitiesCreated = 0;
    for (const [labelEn, labelTh, icon] of amenities) {
      const slug = amenitySlug(labelEn);
      if (await ctx.db.query("amenities").withIndex("by_slug", (q) => q.eq("slug", slug)).unique()) continue;
      await ctx.db.insert("amenities", { slug, labelEn, labelTh, labelSource: labelEn, icon });
      amenitiesCreated += 1;
    }

    const existingRules = await ctx.db.query("houseRules").take(100);
    let houseRulesCreated = 0;
    for (const [textEn, textTh, icon] of houseRules) {
      if (existingRules.some((rule) => rule.textEn === textEn)) continue;
      await ctx.db.insert("houseRules", { textEn, textTh, textSource: textEn, icon });
      houseRulesCreated += 1;
    }

    let villasCreated = 0;
    let sleepingArrangementsCreated = 0;
    const now = Date.now();
    for (const fixture of villaFixtures) {
      const existingVilla = await ctx.db.query("villas").withIndex("by_slug", (q) => q.eq("slug", fixture.slug)).unique();
      if (existingVilla) continue;
      const villaId = await ctx.db.insert("villas", {
        ...fixture,
        status: "draft",
        updatedAt: now,
      });
      villasCreated += 1;
      for (let bedroomNumber = 1; bedroomNumber <= fixture.bedrooms; bedroomNumber += 1) {
        await ctx.db.insert("sleepingArrangements", { villaId, bedroomNumber, beds: ["king"] });
        sleepingArrangementsCreated += 1;
      }
    }

    const settingsAfter = await ctx.db.query("siteSettings").take(2);
    const settingsPreserved = JSON.stringify(settingsBefore) === JSON.stringify(settingsAfter);
    if (!settingsPreserved) throw new Error("Site settings changed during seeding / การตั้งค่าเว็บไซต์เปลี่ยนแปลงระหว่างเพิ่มข้อมูลเริ่มต้น");
    return { amenitiesCreated, houseRulesCreated, villasCreated, sleepingArrangementsCreated, settingsPreserved };
  },
});

export const publishFixtures = mutation({
  args: {},
  returns: v.object({ villasPublished: v.number() }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    const now = Date.now();
    let villasPublished = 0;
    for (const fixture of villaFixtures) {
      const villa = await ctx.db.query("villas").withIndex("by_slug", (q) => q.eq("slug", fixture.slug)).unique();
      if (!villa || villa.status === "published") continue;
      await ctx.db.patch("villas", villa._id, { status: "published", updatedAt: now });
      villasPublished += 1;
    }
    return { villasPublished };
  },
});

export const attachVerifiedFixturePhotos = mutation({
  args: {},
  returns: v.object({ photosAdded: v.number(), villasWithExistingPhotos: v.number(), villasMissing: v.number() }),
  handler: async (ctx) => {
    await requireSuperadmin(ctx);
    let photosAdded = 0;
    let villasWithExistingPhotos = 0;
    let villasMissing = 0;
    for (const [slug, externalUrl] of verifiedFixturePhotos) {
      const villa = await ctx.db.query("villas").withIndex("by_slug", (q) => q.eq("slug", slug)).unique();
      if (!villa) {
        villasMissing += 1;
        continue;
      }
      const existingPhotos = await ctx.db.query("villaPhotos").withIndex("by_villaId_and_sortOrder", (q) => q.eq("villaId", villa._id)).take(1);
      if (existingPhotos.length) {
        villasWithExistingPhotos += 1;
        continue;
      }
      await ctx.db.insert("villaPhotos", { villaId: villa._id, externalUrl, sortOrder: 1 });
      photosAdded += 1;
    }
    return { photosAdded, villasWithExistingPhotos, villasMissing };
  },
});
