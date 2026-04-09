"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import type { Map as MapboxMapInstance, Marker } from "mapbox-gl";

type ProfileLocationMapProps = {
  address: string;
  city: string;
  zone: string;
  markerImageUrl?: string | null;
  compact?: boolean;
  className?: string;
};

export function ProfileLocationMap({
  address,
  city,
  zone,
  markerImageUrl,
  compact = false,
  className,
}: ProfileLocationMapProps) {
  const token = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<MapboxMapInstance | null>(null);
  const markerRef = useRef<Marker | null>(null);
  const [coordinates, setCoordinates] = useState<[number, number] | null>(null);

  const searchQuery = useMemo(() => {
    const raw = address.trim();
    if (raw) return raw;
    return `${zone}, ${city}`;
  }, [address, city, zone]);

  useEffect(() => {
    if (!token) return;

    let active = true;

    void (async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(searchQuery)}.json?autocomplete=false&types=address,place,locality&country=es&language=es&limit=1&access_token=${token}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ center?: [number, number] }>;
        };

        const center = payload.features?.[0]?.center;
        if (!active || !center || center.length !== 2) {
          return;
        }

        setCoordinates([center[0], center[1]]);
      } catch {
        if (active) {
          setCoordinates(null);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [searchQuery, token]);

  useEffect(() => {
    if (!token || !containerRef.current || mapRef.current || !coordinates) {
      return;
    }

    let alive = true;

    void (async () => {
      const mapboxModule = await import("mapbox-gl");
      if (!alive || !containerRef.current) {
        return;
      }

      const mapboxgl = mapboxModule.default;
      mapboxgl.accessToken = token;

      mapRef.current = new mapboxgl.Map({
        container: containerRef.current,
        style: "mapbox://styles/mapbox/streets-v12",
        center: coordinates,
        zoom: 14,
      });

      mapRef.current.addControl(
        new mapboxgl.NavigationControl({
          showCompass: false,
          visualizePitch: false,
        }),
        "top-right",
      );

      if (markerImageUrl?.trim()) {
        const markerElement = document.createElement("div");
        markerElement.style.width = compact ? "36px" : "48px";
        markerElement.style.height = compact ? "36px" : "48px";
        markerElement.style.borderRadius = "999px";
        markerElement.style.border = "2px solid #ffffff";
        markerElement.style.backgroundImage = `url(${markerImageUrl})`;
        markerElement.style.backgroundSize = "cover";
        markerElement.style.backgroundPosition = "center";
        markerElement.style.boxShadow = "0 6px 16px rgba(15,23,42,0.28)";

        markerRef.current = new mapboxgl.Marker({ element: markerElement })
          .setLngLat(coordinates)
          .addTo(mapRef.current as MapboxMapInstance);
      } else {
        markerRef.current = new mapboxgl.Marker({ color: "#F76565" })
          .setLngLat(coordinates)
          .addTo(mapRef.current as MapboxMapInstance);
      }
    })();

    return () => {
      alive = false;
      markerRef.current?.remove();
      markerRef.current = null;
      mapRef.current?.remove();
      mapRef.current = null;
    };
  }, [coordinates, token]);

  useEffect(() => {
    if (!mapRef.current || !coordinates) {
      return;
    }

    mapRef.current.flyTo({ center: coordinates, duration: 550, zoom: 14 });
    markerRef.current?.setLngLat(coordinates);
  }, [coordinates]);

  if (!token) {
    return (
      <div className={`${className ?? "mt-4"} ${compact ? "h-[180px]" : "h-[260px]"} overflow-hidden rounded-2xl border border-[#DFE5EE] bg-[radial-gradient(circle_at_20%_20%,#EEF4FF_0%,#F8FAFC_45%,#E8EEF9_100%)]`}>
        <div className="flex h-full items-center justify-center px-4 text-center text-[#52637A]">
          Configura NEXT_PUBLIC_MAPBOX_TOKEN para mostrar el mapa.
        </div>
      </div>
    );
  }

  if (!coordinates) {
    return (
      <div className={`${className ?? "mt-4"} ${compact ? "h-[180px]" : "h-[260px]"} overflow-hidden rounded-2xl border border-[#DFE5EE] bg-[radial-gradient(circle_at_20%_20%,#EEF4FF_0%,#F8FAFC_45%,#E8EEF9_100%)]`}>
        <div className="flex h-full items-center justify-center px-4 text-center text-[#52637A]">
          Buscando ubicacion exacta...
        </div>
      </div>
    );
  }

  return (
    <div className={`${className ?? "mt-4"} ${compact ? "h-[200px]" : "h-[320px]"} overflow-hidden rounded-2xl border border-[#DFE5EE]`}>
      <div ref={containerRef} className="h-full w-full" />
    </div>
  );
}
