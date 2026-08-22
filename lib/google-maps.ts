export function googleMapsEmbedUrl({
  apiKey,
  latitude,
  longitude,
  locale,
}: {
  apiKey: string;
  latitude: number;
  longitude: number;
  locale: "en" | "th";
}) {
  const params = new URLSearchParams({
    key: apiKey,
    q: `${latitude},${longitude}`,
    language: locale,
    region: "TH",
  });
  return `https://www.google.com/maps/embed/v1/place?${params.toString()}`;
}

export function googleMapsListingUrl({
  latitude,
  longitude,
}: {
  latitude: number;
  longitude: number;
}) {
  const params = new URLSearchParams({ api: "1", query: `${latitude},${longitude}` });
  return `https://www.google.com/maps/search/?${params.toString()}`;
}
