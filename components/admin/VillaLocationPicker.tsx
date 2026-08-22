"use client";

import { importLibrary, setOptions } from "@googlemaps/js-api-loader";
import { ExternalLink, MapPin } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AdminNotice } from "./AdminUI";
import { useAdminLocale } from "./AdminLocale";

export type VillaLocationValue = {
  formattedAddress: string;
  latitude: number;
  longitude: number;
};

const BANGSAEN = { lat: 13.284, lng: 100.925 };

export function VillaLocationPicker({ value, onChange }: { value: VillaLocationValue; onChange: (value: VillaLocationValue) => void }) {
  const { locale, copy } = useAdminLocale();
  const autocompleteHost = useRef<HTMLDivElement>(null);
  const mapHost = useRef<HTMLDivElement>(null);
  const onChangeRef = useRef(onChange);
  const valueRef = useRef(value);
  const [status, setStatus] = useState<"loading" | "ready" | "missing" | "error">("loading");
  const [error, setError] = useState("");
  onChangeRef.current = onChange;
  valueRef.current = value;

  useEffect(() => {
    const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
    if (!apiKey) { setStatus("missing"); return; }
    let disposed = false;
    let marker: google.maps.Marker | null = null;
    let autocomplete: google.maps.places.PlaceAutocompleteElement | null = null;
    async function initialize() {
      try {
        setOptions({ key: apiKey, v: "weekly", language: locale, region: "TH" });
        const maps = await importLibrary("maps") as google.maps.MapsLibrary;
        const places = await importLibrary("places") as google.maps.PlacesLibrary;
        const geocoding = await importLibrary("geocoding") as google.maps.GeocodingLibrary;
        const geocoder = new geocoding.Geocoder();
        if (disposed || !mapHost.current || !autocompleteHost.current) return;
        const center = { lat: value.latitude || BANGSAEN.lat, lng: value.longitude || BANGSAEN.lng };
        const map = new maps.Map(mapHost.current, { center, zoom: value.formattedAddress ? 17 : 13, streetViewControl: false, mapTypeControl: false, fullscreenControl: true, gestureHandling: "cooperative" });
        const placeMarker = (position: google.maps.LatLng | google.maps.LatLngLiteral, title: string) => {
          if (!marker) {
            marker = new google.maps.Marker({ map, position, draggable: true, title });
            marker.addListener("dragend", async () => {
              const nextPosition = marker?.getPosition();
              if (!nextPosition) return;
              try {
                const result = await geocoder.geocode({ location: nextPosition });
                const formattedAddress = result.results[0]?.formatted_address;
                if (!formattedAddress) throw new Error("No address");
                const next = { formattedAddress, latitude: nextPosition.lat(), longitude: nextPosition.lng() };
                valueRef.current = next;
                setError("");
                onChangeRef.current(next);
              } catch {
                marker?.setPosition({ lat: valueRef.current.latitude, lng: valueRef.current.longitude });
                setError(locale === "th" ? "ไม่พบที่อยู่สำหรับตำแหน่งหมุดนี้ โปรดลองอีกครั้ง" : "No address was found for this marker position. Please try again.");
              }
            });
            return;
          }
          marker.setPosition(position);
          marker.setTitle(title);
        };
        if (value.formattedAddress) placeMarker(center, locale === "th" ? "ตำแหน่งวิลล่า" : "Villa location");
        autocomplete = new places.PlaceAutocompleteElement({});
        autocomplete.className = "admin-google-place-autocomplete";
        autocomplete.placeholder = locale === "th" ? "ค้นหาด้วยชื่อวิลล่าหรือที่อยู่ Google" : "Search by villa name or Google address";
        autocomplete.value = value.formattedAddress;
        const configurable = autocomplete as unknown as { includedRegionCodes?: string[]; locationBias?: google.maps.Circle };
        configurable.includedRegionCodes = ["th"];
        configurable.locationBias = new google.maps.Circle({ center: BANGSAEN, radius: 50000 });
        autocompleteHost.current.replaceChildren(autocomplete);
        autocomplete.addEventListener("gmp-select", async (event: Event) => {
          const prediction = (event as google.maps.places.PlacePredictionSelectEvent).placePrediction;
          const place = prediction.toPlace();
          await place.fetchFields({ fields: ["displayName", "formattedAddress", "location", "viewport"] });
          if (!place.location) return;
          const next = {
            formattedAddress: place.formattedAddress ?? "",
            latitude: place.location.lat(),
            longitude: place.location.lng(),
          };
          valueRef.current = next;
          setError("");
          placeMarker(place.location, place.displayName || (locale === "th" ? "ตำแหน่งวิลล่า" : "Villa location"));
          if (place.viewport) map.fitBounds(place.viewport); else { map.setCenter(place.location); map.setZoom(17); }
          onChangeRef.current(next);
        });
        setStatus("ready");
      } catch {
        if (disposed) return;
        setError(locale === "th" ? "ไม่สามารถโหลด Google Maps ได้" : "Google Maps could not be loaded");
        setStatus("error");
      }
    }
    void initialize();
    return () => { disposed = true; marker?.setMap(null); autocomplete?.remove(); };
  // The map owns subsequent coordinate updates; rebuilding it on every drag would interrupt interaction.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [locale]);

  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${value.latitude},${value.longitude}`;

  return (
    <div className="space-y-3">
      {status === "missing" ? <AdminNotice tone="warning" title={copy("Google Maps is not configured", "ยังไม่ได้ตั้งค่า Google Maps")}>{copy("Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable place search.", "เพิ่ม NEXT_PUBLIC_GOOGLE_MAPS_API_KEY เพื่อเปิดใช้การค้นหาสถานที่")}</AdminNotice> : null}
      {status === "error" ? <AdminNotice tone="error" title={copy("Google Maps could not load", "ไม่สามารถโหลด Google Maps ได้")}>{error || copy("Check the browser key restrictions and enabled Maps APIs.", "ตรวจสอบข้อจำกัดของคีย์เบราว์เซอร์และ Maps API ที่เปิดใช้งาน")}</AdminNotice> : null}
      {status === "ready" && error ? <AdminNotice tone="error" title={copy("Address could not be updated", "ไม่สามารถอัปเดตที่อยู่ได้")}>{error}</AdminNotice> : null}
      {status !== "missing" ? <div ref={autocompleteHost} aria-label={copy("Search Google Maps", "ค้นหาใน Google Maps")} className={`min-h-11 w-full ${status === "loading" ? "animate-pulse rounded-xl bg-[#edf0ec]" : ""}`} /> : null}
      <div className={`overflow-hidden rounded-xl border border-[#d5d8d4] bg-[#e9eeeb] ${status === "missing" || status === "error" ? "hidden" : ""}`}>
        <div ref={mapHost} className="h-[320px] w-full sm:h-[420px]" aria-label={copy("Villa map location", "ตำแหน่งวิลล่าบนแผนที่")} />
      </div>
      {value.formattedAddress ? <div className="flex flex-col gap-3 rounded-xl border border-[#d5d8d4] bg-white p-4 sm:flex-row sm:items-start sm:justify-between">
        <div className="flex min-w-0 gap-3"><MapPin size={18} className="mt-0.5 shrink-0 text-[#0f6474]" /><div className="min-w-0"><p className="font-semibold text-[#001e33]">{copy("Selected location", "ตำแหน่งที่เลือก")}</p><p className="mt-1 text-xs leading-5 text-[#68777a]">{value.formattedAddress}</p></div></div>
        <a href={mapsUrl} target="_blank" rel="noreferrer" className="inline-flex min-h-10 shrink-0 items-center gap-2 text-xs font-semibold text-[#0f6474] hover:underline">{copy("Open in Google Maps", "เปิดใน Google Maps")} <ExternalLink size={13} /></a>
      </div> : null}
    </div>
  );
}
