export type LegalLocale = "en" | "th";
export type LegalDocument = "privacy-policy" | "terms-and-conditions";

type LegalSection = {
  title: string;
  paragraphs: readonly string[];
  links?: readonly { label: string; href: string }[];
};

type LegalCopy = {
  title: string;
  description: string;
  sections: readonly LegalSection[];
};

export const LEGAL_UPDATED_AT = "2026-08-31";
export const LEGAL_CONTACT_URL = "https://line.me/R/ti/p/%40kanokpool";

export const legalContent: Record<LegalDocument, Record<LegalLocale, LegalCopy>> = {
  "privacy-policy": {
    en: {
      title: "Privacy policy",
      description: "How we collect, use, and protect your personal information when you visit Pool Villas in Bangsaen or contact us about a stay.",
      sections: [
        {
          title: "About us",
          paragraphs: [
            "Pool Villas in Bangsaen (poolvillasinbangsaen.com) is operated by Kanokkorn Mungsakorn, referred to as “we”, “us”, or “our”. We are responsible for personal information we collect through this website and our communications with you. Contact us through LINE at @kanokpool.",
            "This policy applies to website visitors and people who send accommodation enquiries. It explains what information we collect, why we use it, who we share it with, and your rights.",
          ],
        },
        {
          title: "Information we collect",
          paragraphs: [
            "When you contact us or send a booking enquiry, we collect the details you provide, such as your name if supplied, phone number, LINE ID, preferred villa, travel dates, number of guests, and messages. We also keep details of your enquiry, including its date, estimated or quoted price, and our correspondence with you.",
            "Our service providers may process technical and usage information, including your IP address, browser and device type, pages visited, referring website, approximate location, and information needed to identify errors or misuse.",
            "You can browse without providing contact details. We need at least one contact method to respond to an enquiry. Please do not send payment-card details, identity documents, or sensitive personal information through the enquiry form.",
          ],
        },
        {
          title: "How we use your information",
          paragraphs: [
            "We use your information to respond to enquiries, check availability, discuss prices and accommodation requirements, connect you with the relevant villa owner or manager, and provide assistance. We also use information to maintain and improve the website, understand visitor activity, prevent misuse, resolve disputes, and meet legal obligations.",
            "Depending on the purpose, we rely on steps you request before entering an agreement, performance of an agreement, legitimate interests in providing and protecting the website, legal obligations, or consent where required. You may withdraw consent without affecting the lawfulness of earlier processing.",
          ],
        },
        {
          title: "Sharing your information",
          paragraphs: [
            "We may share information relevant to your enquiry with the villa owner or manager to help arrange your stay. We also use providers for hosting, data storage, analytics, and communications, including Vercel, Convex, Resend, and LINE. They receive information needed to provide their services.",
            "We may disclose information when required by law or reasonably necessary to prevent fraud, investigate misuse, or protect legal rights. We do not sell your personal information.",
            "Some providers process information outside Thailand. Where required by applicable law, transfers must be supported by appropriate safeguards. Owners, managers, and external services you contact directly may handle your information under their own privacy practices.",
          ],
        },
        {
          title: "Cookies, analytics, and external services",
          paragraphs: [
            "We use Vercel Web Analytics to understand visits and page views through aggregate statistics. This analytics service does not use third-party tracking cookies. Website features may use cookies or similar browser storage where needed for their operation. You can manage cookies and stored website data in your browser settings; restricting them may affect some features.",
            "Embedded maps and links to services such as Google Maps, LINE, and Facebook are provided for your convenience. Loading embedded content may share technical information with its provider. When you use an external service, its own privacy policy and terms apply.",
          ],
        },
        {
          title: "Security and retention",
          paragraphs: [
            "We use reasonable technical and organizational measures, including secure connections and access restrictions, to protect personal information from unauthorized access, loss, misuse, or disclosure. No website or method of transmitting or storing information can be guaranteed completely secure.",
            "Retention depends on the purpose of collection, whether your enquiry remains active, and any legal, security, or dispute-related requirements. You can contact us to request deletion or ask about information we hold. Some records may need to be retained where permitted or required by law, and backup copies may remain under our providers’ retention practices.",
          ],
        },
        {
          title: "Your privacy rights",
          paragraphs: [
            "Subject to applicable law, you may request access to or a copy of your personal information, correction, deletion, restriction of processing, or data portability. You may also object to certain uses and withdraw consent where we rely on it. These rights may be subject to legal conditions and exceptions.",
            "Contact Kanokkorn Mungsakorn through LINE at @kanokpool and identify the enquiry or information concerned. We may request information reasonably necessary to verify your identity. We will respond within the time required by law and explain any reason we cannot fully fulfil your request. You may also complain to Thailand’s Personal Data Protection Committee or another competent authority.",
          ],
        },
        {
          title: "Children’s privacy",
          paragraphs: [
            "The website is intended for people arranging accommodation and is not directed at children. Children should not submit personal information without the involvement of a parent or guardian. Contact us if you believe a child has provided information without appropriate permission so we can review and address it.",
          ],
        },
        {
          title: "Changes to this policy",
          paragraphs: [
            "We may update this policy to reflect changes to the website, our practices, or legal requirements. The latest version will appear on this page with its updated date. Where required, we will provide additional notice or obtain consent before using information for a new purpose.",
          ],
        },
      ],
    },
    th: {
      title: "นโยบายความเป็นส่วนตัว",
      description: "วิธีที่เราเก็บรวบรวม ใช้ และดูแลข้อมูลส่วนบุคคลเมื่อคุณเข้าชมเว็บไซต์พูลวิลล่าในบางแสนหรือติดต่อเราเกี่ยวกับการเข้าพัก",
      sections: [
        {
          title: "เกี่ยวกับเรา",
          paragraphs: [
            "พูลวิลล่าในบางแสน (Pool Villas in Bangsaen) บนเว็บไซต์ poolvillasinbangsaen.com ดำเนินการโดย Kanokkorn Mungsakorn ซึ่งในนโยบายนี้เรียกว่า “เรา” เรารับผิดชอบข้อมูลส่วนบุคคลที่เก็บผ่านเว็บไซต์นี้และการติดต่อกับคุณ ติดต่อเราได้ผ่าน LINE ที่ @kanokpool",
            "นโยบายนี้ใช้กับผู้เข้าชมเว็บไซต์และผู้สอบถามเกี่ยวกับที่พัก โดยอธิบายข้อมูลที่เราเก็บ วัตถุประสงค์ในการใช้ ผู้ที่เราแบ่งปันข้อมูลด้วย และสิทธิของคุณ",
          ],
        },
        {
          title: "ข้อมูลที่เราเก็บรวบรวม",
          paragraphs: [
            "เมื่อคุณติดต่อเราหรือส่งคำขอจอง เราเก็บรายละเอียดที่คุณให้ เช่น ชื่อหากระบุ หมายเลขโทรศัพท์ LINE ID วิลล่าที่สนใจ วันที่เข้าพัก จำนวนผู้เข้าพัก และข้อความ รวมถึงรายละเอียดคำขอ เช่น วันที่ส่ง ราคาประเมินหรือราคาที่เสนอ และประวัติการติดต่อ",
            "ผู้ให้บริการของเราอาจประมวลผลข้อมูลทางเทคนิคและการใช้งาน เช่น ที่อยู่ IP ประเภทเบราว์เซอร์และอุปกรณ์ หน้าที่เข้าชม เว็บไซต์ที่เชื่อมโยงมา ตำแหน่งโดยประมาณ และข้อมูลสำหรับตรวจสอบข้อผิดพลาดหรือการใช้งานที่ไม่เหมาะสม",
            "คุณสามารถเข้าชมได้โดยไม่ต้องให้ข้อมูลติดต่อ เราต้องการช่องทางติดต่ออย่างน้อยหนึ่งช่องทางเพื่อตอบคำขอ โปรดอย่าส่งข้อมูลบัตรชำระเงิน เอกสารยืนยันตัวตน หรือข้อมูลส่วนบุคคลที่มีความอ่อนไหวผ่านแบบฟอร์มคำขอจอง",
          ],
        },
        {
          title: "วิธีที่เราใช้ข้อมูล",
          paragraphs: [
            "เราใช้ข้อมูลเพื่อตอบคำขอ ตรวจสอบวันว่าง แจ้งราคาและรายละเอียดที่พัก ประสานงานกับเจ้าของหรือผู้จัดการวิลล่าที่เกี่ยวข้อง และให้ความช่วยเหลือ รวมถึงดูแลและปรับปรุงเว็บไซต์ ทำความเข้าใจการเข้าชม ป้องกันการใช้งานที่ไม่เหมาะสม ระงับข้อพิพาท และปฏิบัติตามกฎหมาย",
            "เราอาศัยฐานทางกฎหมายตามวัตถุประสงค์ ได้แก่ การดำเนินการตามคำขอก่อนเข้าทำสัญญา การปฏิบัติตามสัญญา ประโยชน์โดยชอบด้วยกฎหมายในการให้บริการและคุ้มครองเว็บไซต์ หน้าที่ตามกฎหมาย หรือความยินยอมเมื่อจำเป็น คุณสามารถถอนความยินยอมโดยไม่กระทบความชอบด้วยกฎหมายของการประมวลผลก่อนหน้านั้น",
          ],
        },
        {
          title: "การแบ่งปันข้อมูล",
          paragraphs: [
            "เราอาจแบ่งปันข้อมูลที่เกี่ยวข้องกับคำขอให้เจ้าของหรือผู้จัดการวิลล่าเพื่อช่วยจัดการการเข้าพัก เรายังใช้ผู้ให้บริการด้านโฮสติ้ง การจัดเก็บข้อมูล การวิเคราะห์ และการสื่อสาร เช่น Vercel, Convex, Resend และ LINE โดยผู้ให้บริการได้รับข้อมูลที่จำเป็นต่อการให้บริการของตน",
            "เราอาจเปิดเผยข้อมูลเมื่อกฎหมายกำหนด หรือเมื่อจำเป็นตามสมควรเพื่อป้องกันการฉ้อโกง ตรวจสอบการใช้งานที่ไม่เหมาะสม หรือคุ้มครองสิทธิตามกฎหมาย เราไม่ขายข้อมูลส่วนบุคคลของคุณ",
            "ผู้ให้บริการบางรายประมวลผลข้อมูลนอกประเทศไทย หากกฎหมายที่ใช้บังคับกำหนด การโอนข้อมูลต้องมีมาตรการคุ้มครองที่เหมาะสม เจ้าของ ผู้จัดการ และบริการภายนอกที่คุณติดต่อโดยตรงอาจจัดการข้อมูลตามแนวทางความเป็นส่วนตัวของตนเอง",
          ],
        },
        {
          title: "คุกกี้ การวิเคราะห์ และบริการภายนอก",
          paragraphs: [
            "เราใช้ Vercel Web Analytics เพื่อทำความเข้าใจจำนวนผู้เข้าชมและการดูหน้าเว็บผ่านสถิติโดยรวม บริการวิเคราะห์นี้ไม่ใช้คุกกี้ติดตามของบุคคลที่สาม ฟังก์ชันเว็บไซต์อาจใช้คุกกี้หรือพื้นที่จัดเก็บในเบราว์เซอร์ที่จำเป็นต่อการทำงาน คุณสามารถจัดการคุกกี้และข้อมูลเว็บไซต์ในการตั้งค่าเบราว์เซอร์ โดยการจำกัดอาจส่งผลต่อบางฟังก์ชัน",
            "แผนที่แบบฝังและลิงก์ไปยังบริการ เช่น Google Maps, LINE และ Facebook มีไว้เพื่อความสะดวก การโหลดเนื้อหาแบบฝังอาจส่งข้อมูลทางเทคนิคไปยังผู้ให้บริการ เมื่อคุณใช้บริการภายนอก นโยบายความเป็นส่วนตัวและข้อกำหนดของบริการนั้นจะมีผลใช้บังคับ",
          ],
        },
        {
          title: "ความปลอดภัยและการเก็บรักษาข้อมูล",
          paragraphs: [
            "เราใช้มาตรการทางเทคนิคและการจัดการที่เหมาะสมตามสมควร เช่น การเชื่อมต่อที่ปลอดภัยและการจำกัดสิทธิ์เข้าถึง เพื่อป้องกันการเข้าถึง การสูญหาย การใช้ผิดวัตถุประสงค์ หรือการเปิดเผยโดยไม่ได้รับอนุญาต อย่างไรก็ตาม ไม่มีเว็บไซต์หรือวิธีรับส่งและจัดเก็บข้อมูลใดที่รับประกันความปลอดภัยได้อย่างสมบูรณ์",
            "ระยะเวลาเก็บข้อมูลขึ้นอยู่กับวัตถุประสงค์ สถานะคำขอ และความจำเป็นด้านกฎหมาย ความปลอดภัย หรือข้อพิพาท คุณสามารถติดต่อเพื่อขอลบข้อมูลหรือสอบถามเกี่ยวกับข้อมูลที่เราเก็บไว้ บางรายการอาจต้องเก็บต่อเมื่อกฎหมายอนุญาตหรือกำหนด และสำเนาสำรองอาจคงอยู่ตามแนวทางการเก็บรักษาของผู้ให้บริการ",
          ],
        },
        {
          title: "สิทธิด้านความเป็นส่วนตัว",
          paragraphs: [
            "ภายใต้กฎหมายที่ใช้บังคับ คุณอาจขอเข้าถึงหรือรับสำเนาข้อมูลส่วนบุคคล ขอแก้ไข ลบ ระงับการใช้ หรือโอนย้ายข้อมูล รวมถึงคัดค้านการใช้บางประเภทและถอนความยินยอมในกรณีที่เราอาศัยความยินยอม สิทธิเหล่านี้อาจมีเงื่อนไขและข้อยกเว้นตามกฎหมาย",
            "โปรดติดต่อ Kanokkorn Mungsakorn ผ่าน LINE ที่ @kanokpool พร้อมระบุคำขอหรือข้อมูลที่เกี่ยวข้อง เราอาจขอข้อมูลเท่าที่จำเป็นตามสมควรเพื่อยืนยันตัวตน เราจะตอบภายในระยะเวลาที่กฎหมายกำหนดและชี้แจงหากไม่สามารถดำเนินการตามคำขอได้ทั้งหมด คุณสามารถร้องเรียนต่อคณะกรรมการคุ้มครองข้อมูลส่วนบุคคลของประเทศไทยหรือหน่วยงานที่มีอำนาจอื่นได้",
          ],
        },
        {
          title: "ความเป็นส่วนตัวของเด็ก",
          paragraphs: [
            "เว็บไซต์นี้มีไว้สำหรับผู้ที่ต้องการจัดหาที่พักและไม่ได้มุ่งให้บริการแก่เด็ก เด็กไม่ควรส่งข้อมูลส่วนบุคคลโดยไม่มีบิดามารดาหรือผู้ปกครองร่วมดูแล หากคุณเชื่อว่าเด็กให้ข้อมูลโดยไม่ได้รับอนุญาตอย่างเหมาะสม โปรดติดต่อเราเพื่อตรวจสอบและดำเนินการ",
          ],
        },
        {
          title: "การเปลี่ยนแปลงนโยบาย",
          paragraphs: [
            "เราอาจปรับปรุงนโยบายตามการเปลี่ยนแปลงของเว็บไซต์ แนวทางปฏิบัติ หรือกฎหมาย โดยจะแสดงฉบับล่าสุดพร้อมวันที่ปรับปรุงในหน้านี้ หากจำเป็น เราจะแจ้งเพิ่มเติมหรือขอความยินยอมก่อนใช้ข้อมูลเพื่อวัตถุประสงค์ใหม่",
          ],
        },
      ],
    },
  },
  "terms-and-conditions": {
    en: {
      title: "Terms and conditions",
      description: "Please read these terms before using Pool Villas in Bangsaen or sending a booking enquiry.",
      sections: [
        {
          title: "About these terms",
          paragraphs: [
            "These terms govern your use of poolvillasinbangsaen.com, operated by Kanokkorn Mungsakorn under the name Pool Villas in Bangsaen. By using the website, you agree to these terms. If you do not agree, please stop using the website.",
            "The website helps you find pool villas in Bang Saen and contact owners or managers. These website terms are separate from the accommodation agreement for your stay.",
          ],
        },
        {
          title: "Villa information and availability",
          paragraphs: [
            "We aim to keep listings accurate, but photographs, descriptions, amenities, prices, and availability may change or contain errors. Displayed prices are estimates unless confirmed by the relevant owner or manager.",
            "Before booking, confirm the villa, dates, guest count, total price, included facilities, and additional charges directly with the owner or manager. Please contact us if you notice incorrect website information.",
          ],
        },
        {
          title: "Booking enquiries",
          paragraphs: [
            "Sending an enquiry does not confirm a booking or reserve your dates. An acknowledgement only confirms receipt of your enquiry. A booking is confirmed when you and the relevant owner or manager agree to the booking conditions and complete any required steps.",
            "Provide accurate information and a contact method you are entitled to use. You must have legal capacity to enter a booking agreement. If you act for other guests, you must have authority to do so and permission to share their information.",
          ],
        },
        {
          title: "Payments, cancellations, and refunds",
          paragraphs: [
            "The website does not collect booking payments or payment-card details. Payments and deposits are arranged directly with the relevant owner or manager. Confirm the recipient, amount, due date, and booking conditions before sending money.",
            "Cancellation, amendment, refund, and security-deposit conditions vary by villa and form part of your accommodation agreement. Ask for these conditions before confirming a booking. There is no single cancellation or refund policy covering every villa on this website.",
          ],
        },
        {
          title: "Your stay",
          paragraphs: [
            "You and your guests are responsible for following the agreed house rules, occupancy limits, check-in and check-out times, and applicable laws. Confirm any requirements for pets, visitors, events, noise, or special requests before booking.",
            "Questions about an accommodation service, deposit, cancellation, or stay should be raised with the owner or manager responsible for your booking. These terms do not replace their obligations under your agreement or applicable law.",
          ],
        },
        {
          title: "Acceptable use and website content",
          paragraphs: [
            "Do not submit false or abusive enquiries, impersonate others, send spam, interfere with the website, attempt unauthorized access, or collect other people’s personal information without permission. We may restrict access where reasonably necessary to address misuse or protect the website and its visitors.",
            "Website text, branding, photographs, and other content belong to their respective owners or licensors. You may browse and share links for personal use. Copying, republishing, or commercially using content requires the relevant permission unless allowed by law.",
          ],
        },
        {
          title: "Third-party services and privacy",
          paragraphs: [
            "The website may link to or display content from third-party services, including maps, messaging services, and social media. We do not control those services, and their own terms and privacy policies apply. A link does not guarantee a third party’s content or offers.",
            "Our privacy policy explains how we collect and use personal information when you browse the website or contact us.",
          ],
          links: [{ label: "Read our privacy policy", href: "/en/privacy-policy" }],
        },
        {
          title: "Website availability and liability",
          paragraphs: [
            "We take reasonable care in providing the website but cannot guarantee that it will always be available, error-free, or up to date. Access may be interrupted for maintenance or reasons beyond our reasonable control.",
            "To the extent permitted by applicable law, we are not responsible for losses caused by misuse of the website or services supplied independently by third parties. Nothing in these terms excludes liability that cannot lawfully be excluded or removes your mandatory consumer rights.",
          ],
        },
        {
          title: "Changes and governing law",
          paragraphs: [
            "We may update these terms and publish the revised version and date on this page. Changes apply to future website use and do not automatically change an existing accommodation agreement. If a provision is unenforceable, the remaining provisions continue to apply to the extent permitted by law.",
            "These terms are governed by Thai law, without limiting mandatory protections under other applicable law. Please contact us about website-related concerns. This does not restrict your right to use a complaint procedure or seek a legal remedy available to you.",
          ],
        },
      ],
    },
    th: {
      title: "ข้อกำหนดและเงื่อนไข",
      description: "โปรดอ่านข้อกำหนดนี้ก่อนใช้เว็บไซต์พูลวิลล่าในบางแสนหรือส่งคำขอจอง",
      sections: [
        {
          title: "เกี่ยวกับข้อกำหนดนี้",
          paragraphs: [
            "ข้อกำหนดนี้ใช้กับการใช้งาน poolvillasinbangsaen.com ซึ่งดำเนินการโดย Kanokkorn Mungsakorn ภายใต้ชื่อพูลวิลล่าในบางแสน (Pool Villas in Bangsaen) การใช้เว็บไซต์ถือว่าคุณยอมรับข้อกำหนดนี้ หากไม่ยอมรับ โปรดหยุดใช้เว็บไซต์",
            "เว็บไซต์ช่วยให้คุณค้นหาพูลวิลล่าในบางแสนและติดต่อเจ้าของหรือผู้จัดการ ข้อกำหนดเว็บไซต์นี้แยกจากข้อตกลงที่พักสำหรับการเข้าพักของคุณ",
          ],
        },
        {
          title: "ข้อมูลวิลล่าและวันว่าง",
          paragraphs: [
            "เรามุ่งให้ข้อมูลประกาศถูกต้อง แต่ภาพถ่าย คำอธิบาย สิ่งอำนวยความสะดวก ราคา และวันว่างอาจเปลี่ยนแปลงหรือมีข้อผิดพลาด ราคาที่แสดงเป็นราคาประเมินจนกว่าเจ้าของหรือผู้จัดการจะยืนยัน",
            "ก่อนจอง โปรดยืนยันวิลล่า วันที่ จำนวนผู้เข้าพัก ราคารวม สิ่งอำนวยความสะดวกที่รวมในราคา และค่าใช้จ่ายเพิ่มเติมกับเจ้าของหรือผู้จัดการโดยตรง หากพบข้อมูลเว็บไซต์ไม่ถูกต้อง โปรดติดต่อเรา",
          ],
        },
        {
          title: "คำขอจอง",
          paragraphs: [
            "การส่งคำขอไม่ถือเป็นการยืนยันการจองหรือสำรองวันที่เลือก ข้อความตอบรับหมายถึงได้รับคำขอแล้วเท่านั้น การจองจะยืนยันเมื่อคุณและเจ้าของหรือผู้จัดการตกลงเงื่อนไขและดำเนินการตามขั้นตอนที่จำเป็นครบถ้วน",
            "โปรดให้ข้อมูลที่ถูกต้องและช่องทางติดต่อที่คุณมีสิทธิ์ใช้ คุณต้องมีความสามารถตามกฎหมายในการทำข้อตกลงการจอง หากดำเนินการแทนผู้เข้าพักอื่น คุณต้องมีอำนาจดำเนินการและได้รับอนุญาตให้แบ่งปันข้อมูลของบุคคลเหล่านั้น",
          ],
        },
        {
          title: "การชำระเงิน การยกเลิก และการคืนเงิน",
          paragraphs: [
            "เว็บไซต์ไม่รับชำระค่าจองหรือเก็บข้อมูลบัตรชำระเงิน การชำระเงินและเงินมัดจำดำเนินการกับเจ้าของหรือผู้จัดการโดยตรง โปรดยืนยันผู้รับเงิน จำนวนเงิน วันครบกำหนด และเงื่อนไขการจองก่อนโอนเงิน",
            "เงื่อนไขการยกเลิก การเปลี่ยนแปลง การคืนเงิน และเงินประกันแตกต่างกันตามวิลล่าและเป็นส่วนหนึ่งของข้อตกลงที่พัก โปรดสอบถามก่อนยืนยันการจอง เว็บไซต์นี้ไม่มีนโยบายยกเลิกหรือคืนเงินแบบเดียวที่ใช้กับทุกวิลล่า",
          ],
        },
        {
          title: "การเข้าพัก",
          paragraphs: [
            "คุณและผู้เข้าพักต้องปฏิบัติตามกฎที่พัก จำนวนผู้เข้าพักสูงสุด เวลาเช็กอินและเช็กเอาต์ที่ตกลงกัน และกฎหมายที่ใช้บังคับ โปรดยืนยันข้อกำหนดเกี่ยวกับสัตว์เลี้ยง ผู้มาเยือน การจัดงาน เสียงรบกวน หรือคำขอพิเศษก่อนจอง",
            "หากมีคำถามเกี่ยวกับบริการที่พัก เงินมัดจำ การยกเลิก หรือการเข้าพัก โปรดติดต่อเจ้าของหรือผู้จัดการที่รับผิดชอบการจอง ข้อกำหนดนี้ไม่ใช้แทนหน้าที่ของบุคคลดังกล่าวตามข้อตกลงหรือกฎหมาย",
          ],
        },
        {
          title: "การใช้งานที่เหมาะสมและเนื้อหาเว็บไซต์",
          paragraphs: [
            "ห้ามส่งคำขอเท็จหรือข้อความคุกคาม แอบอ้างบุคคลอื่น ส่งสแปม รบกวนเว็บไซต์ พยายามเข้าถึงโดยไม่ได้รับอนุญาต หรือเก็บข้อมูลส่วนบุคคลของผู้อื่นโดยไม่มีสิทธิ์ เราอาจจำกัดการเข้าถึงเมื่อจำเป็นตามสมควรเพื่อจัดการการใช้งานที่ไม่เหมาะสมหรือคุ้มครองเว็บไซต์และผู้เข้าชม",
            "ข้อความ ตราสัญลักษณ์ ภาพถ่าย และเนื้อหาอื่นเป็นของเจ้าของสิทธิ์หรือผู้ให้อนุญาตแต่ละราย คุณสามารถเข้าชมและแบ่งปันลิงก์เพื่อใช้ส่วนตัว การคัดลอก เผยแพร่ซ้ำ หรือใช้เชิงพาณิชย์ต้องได้รับอนุญาตจากผู้มีสิทธิ์ เว้นแต่กฎหมายอนุญาต",
          ],
        },
        {
          title: "บริการภายนอกและความเป็นส่วนตัว",
          paragraphs: [
            "เว็บไซต์อาจเชื่อมโยงหรือแสดงเนื้อหาจากบริการภายนอก เช่น แผนที่ บริการส่งข้อความ และสื่อสังคมออนไลน์ เราไม่ได้ควบคุมบริการเหล่านั้น ซึ่งมีข้อกำหนดและนโยบายความเป็นส่วนตัวของตนเอง การมีลิงก์ไม่ได้รับประกันเนื้อหาหรือข้อเสนอจากบุคคลภายนอก",
            "นโยบายความเป็นส่วนตัวของเราอธิบายวิธีเก็บรวบรวมและใช้ข้อมูลส่วนบุคคลเมื่อคุณเข้าชมเว็บไซต์หรือติดต่อเรา",
          ],
          links: [{ label: "อ่านนโยบายความเป็นส่วนตัว", href: "/th/privacy-policy" }],
        },
        {
          title: "การให้บริการและความรับผิด",
          paragraphs: [
            "เราใช้ความระมัดระวังตามสมควรในการให้บริการ แต่ไม่สามารถรับประกันว่าเว็บไซต์จะพร้อมใช้งาน ปราศจากข้อผิดพลาด หรือเป็นปัจจุบันตลอดเวลา การเข้าถึงอาจหยุดชะงักจากการบำรุงรักษาหรือเหตุที่อยู่นอกเหนือการควบคุมตามสมควร",
            "เท่าที่กฎหมายอนุญาต เราไม่รับผิดชอบความเสียหายจากการใช้เว็บไซต์อย่างไม่เหมาะสมหรือบริการที่บุคคลภายนอกให้โดยอิสระ ไม่มีข้อความใดยกเว้นความรับผิดที่กฎหมายไม่อนุญาตให้ยกเว้น หรือตัดสิทธิผู้บริโภคที่กฎหมายรับรอง",
          ],
        },
        {
          title: "การเปลี่ยนแปลงและกฎหมายที่ใช้บังคับ",
          paragraphs: [
            "เราอาจปรับปรุงข้อกำหนดและเผยแพร่ฉบับแก้ไขพร้อมวันที่ในหน้านี้ การเปลี่ยนแปลงใช้กับการใช้งานเว็บไซต์ในอนาคตและไม่ได้เปลี่ยนข้อตกลงที่พักที่มีอยู่โดยอัตโนมัติ หากข้อกำหนดใดบังคับใช้ไม่ได้ ส่วนที่เหลือยังมีผลเท่าที่กฎหมายอนุญาต",
            "ข้อกำหนดนี้อยู่ภายใต้กฎหมายไทย โดยไม่จำกัดสิทธิคุ้มครองที่กฎหมายอื่นซึ่งใช้บังคับกำหนดไว้ โปรดติดต่อเราเกี่ยวกับปัญหาเว็บไซต์ ทั้งนี้ไม่จำกัดสิทธิในการร้องเรียนหรือขอรับการเยียวยาตามกฎหมาย",
          ],
        },
      ],
    },
  },
};
