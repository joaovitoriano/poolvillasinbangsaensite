export type EnglishThaiTranslation = {
  source: string;
  detectedLanguage: "en" | "th";
  english: string;
  thai: string;
};

type Availability = "available" | "downloadable" | "downloading" | "unavailable";

type DetectorSession = {
  detect(text: string): Promise<Array<{ detectedLanguage: string; confidence: number }>>;
  destroy(): void;
};

type TranslatorSession = {
  translate(text: string): Promise<string>;
  destroy(): void;
};

type BuiltInTranslationGlobals = typeof globalThis & {
  LanguageDetector?: {
    availability(options: { expectedInputLanguages: string[] }): Promise<Availability>;
    create(options: { expectedInputLanguages: string[] }): Promise<DetectorSession>;
  };
  Translator?: {
    availability(options: { sourceLanguage: string; targetLanguage: string }): Promise<Availability>;
    create(options: { sourceLanguage: string; targetLanguage: string }): Promise<TranslatorSession>;
  };
};

const unavailableMessage =
  "Translation requires a supported Chrome browser with English and Thai TranslateKit available. Your changes were not saved. / การแปลต้องใช้เบราว์เซอร์ Chrome ที่รองรับ TranslateKit ภาษาอังกฤษและภาษาไทย ระบบยังไม่ได้บันทึกการเปลี่ยนแปลงของคุณ";
const uncertainLanguageMessage =
  "We could not confidently detect whether the changed content is English or Thai. Your changes were not saved. / ไม่สามารถตรวจสอบได้อย่างมั่นใจว่าเนื้อหาที่แก้ไขเป็นภาษาอังกฤษหรือภาษาไทย ระบบยังไม่ได้บันทึกการเปลี่ยนแปลงของคุณ";
const translationFailedMessage =
  "Translation failed. Your changes were not saved. / การแปลไม่สำเร็จ ระบบยังไม่ได้บันทึกการเปลี่ยนแปลงของคุณ";

const minimumLanguageConfidence = 0.5;

export async function translateToEnglishAndThai(values: string[]): Promise<EnglishThaiTranslation[]> {
  const sourceValues = Array.from(new Set(values.map((value) => value.trim()).filter(Boolean)));
  if (!sourceValues.length) return [];

  const browser = globalThis as BuiltInTranslationGlobals;
  if (!browser.LanguageDetector || !browser.Translator) throw new Error(unavailableMessage);

  const detectorOptions = { expectedInputLanguages: ["en", "th"] };
  const enToThOptions = { sourceLanguage: "en", targetLanguage: "th" };
  const thToEnOptions = { sourceLanguage: "th", targetLanguage: "en" };

  // These create calls must happen synchronously inside the Save click handler.
  // Awaiting availability first can consume Chrome's transient user activation.
  const detectorPromise = browser.LanguageDetector.create(detectorOptions);
  const enToThPromise = browser.Translator.create(enToThOptions);
  const thToEnPromise = browser.Translator.create(thToEnOptions);
  const availabilityPromise = Promise.all([
    browser.LanguageDetector.availability(detectorOptions),
    browser.Translator.availability(enToThOptions),
    browser.Translator.availability(thToEnOptions),
  ]);

  const [availabilityResult, sessionResults] = await Promise.all([
    availabilityPromise.then(
      (value) => ({ ok: true as const, value }),
      () => ({ ok: false as const }),
    ),
    Promise.allSettled([detectorPromise, enToThPromise, thToEnPromise]),
  ]);
  const [detectorResult, enToThResult, thToEnResult] = sessionResults;
  const createdSessions = sessionResults.flatMap((result) => result.status === "fulfilled" ? [result.value] : []);
  if (!availabilityResult.ok || availabilityResult.value.includes("unavailable") || detectorResult.status !== "fulfilled" || enToThResult.status !== "fulfilled" || thToEnResult.status !== "fulfilled") {
    createdSessions.forEach((session) => session.destroy());
    throw new Error(unavailableMessage);
  }
  const detector = detectorResult.value;
  const enToTh = enToThResult.value;
  const thToEn = thToEnResult.value;

  try {
    const translated: EnglishThaiTranslation[] = [];
    for (const source of sourceValues) {
      let detections: Array<{ detectedLanguage: string; confidence: number }>;
      try {
        detections = await detector.detect(source);
      } catch {
        throw new Error(translationFailedMessage);
      }
      const best = detections[0];
      if (!best || (best.detectedLanguage !== "en" && best.detectedLanguage !== "th") || best.confidence < minimumLanguageConfidence) {
        throw new Error(uncertainLanguageMessage);
      }
      try {
        const opposite = best.detectedLanguage === "en"
          ? await enToTh.translate(source)
          : await thToEn.translate(source);
        if (!opposite.trim()) throw new Error("Empty translation");
        translated.push(best.detectedLanguage === "en"
          ? { source, detectedLanguage: "en", english: source, thai: opposite }
          : { source, detectedLanguage: "th", english: opposite, thai: source });
      } catch {
        throw new Error(translationFailedMessage);
      }
    }
    return translated;
  } finally {
    detector.destroy();
    enToTh.destroy();
    thToEn.destroy();
  }
}
