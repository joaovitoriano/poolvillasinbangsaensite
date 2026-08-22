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

export const run = mutation({
  args: {},
  returns: v.object({ amenitiesCreated: v.number(), houseRulesCreated: v.number(), settingsPreserved: v.boolean() }),
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
    const settingsAfter = await ctx.db.query("siteSettings").take(2);
    const settingsPreserved = JSON.stringify(settingsBefore) === JSON.stringify(settingsAfter);
    if (!settingsPreserved) throw new Error("Site settings changed during seeding / การตั้งค่าเว็บไซต์เปลี่ยนแปลงระหว่างเพิ่มข้อมูลเริ่มต้น");
    return { amenitiesCreated, houseRulesCreated, settingsPreserved };
  },
});
