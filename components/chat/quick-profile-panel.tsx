"use client";

import { useEffect, useMemo, useState } from "react";

type QuickProfileData = {
  nombre: string;
  edad: number;
  pais: string;
  ciudad: string;
  idiomas: string[];
  estadoCivil: string;
  bio: string;
  situacion: string;
  estudiaOTrabaja: string;
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuestoMax: number;
  zonas: string[];
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  hasPiso: boolean;
  pisoPrecio: number;
  pisoZona: string;
  pisoDireccion: string;
  pisoDescripcion: string;
  pisoGastosIncluidos: boolean;
  pisoDisponibleDesde: string;
};

type Screen = "basico" | "convivencia" | "piso";

const EMPTY_DATA: QuickProfileData = {
  nombre: "",
  edad: 18,
  pais: "",
  ciudad: "",
  idiomas: [],
  estadoCivil: "prefiero_no_decir",
  bio: "",
  situacion: "busco_habitacion",
  estudiaOTrabaja: "estudiante",
  carrera: "",
  universidad: "",
  trabajo: "",
  presupuestoMax: 900,
  zonas: [],
  fumar: false,
  mascotas: false,
  horario: "normal",
  ambiente: "equilibrado",
  deporte: "poco",
  aficiones: [],
  hasPiso: false,
  pisoPrecio: 0,
  pisoZona: "",
  pisoDireccion: "",
  pisoDescripcion: "",
  pisoGastosIncluidos: false,
  pisoDisponibleDesde: "",
};

type CitySuggestion = {
  id: string;
  city: string;
  label: string;
};

type ZoneSuggestion = {
  id: string;
  label: string;
};

const UNIVERSIDADES = [
  "Universidad de Alcala",
  "Universidad Alfonso X el Sabio",
  "Universidad Antonio de Nebrija",
  "Universidad Camilo Jose Cela",
  "Universidad Carlos III de Madrid",
  "Universidad Complutense de Madrid",
  "Universidad de Deusto",
  "Universidad Europea de Madrid",
  "Universidad Francisco de Vitoria",
  "Universidad Internacional de La Rioja",
  "Universidad Loyola",
  "Universidad Nacional de Educacion a Distancia",
  "Universidad Pontificia Comillas",
  "Universidad Rey Juan Carlos",
  "Universidad San Pablo CEU",
  "Universidad Villanueva",
  "Universidad Autonoma de Madrid",
  "Universidad Politecnica de Madrid",
  "Universidad de Alicante",
  "Universidad de Cantabria",
  "Universidad de Cordoba",
  "Universidad de Granada",
  "Universidad de Malaga",
  "Universidad de Murcia",
  "Universidad de Navarra",
  "Universidad de Oviedo",
  "Universidad de Salamanca",
  "Universidad de Sevilla",
  "Universidad de Valencia",
  "Universidad de Vigo",
  "Universidad de Zaragoza",
  "Universitat Autonoma de Barcelona",
  "Universitat de Barcelona",
  "Universitat de Girona",
  "Universitat de Lleida",
  "Universitat de Valencia",
  "Universitat Jaume I",
  "Universitat Pompeu Fabra",
  "Universitat Ramon Llull",
  "Universitat Rovira i Virgili",
  "Universitat Politecnica de Valencia",
];

const CITY_ZONES: Record<string, string[]> = {
  Madrid: ["Centro", "Salamanca", "Chamberi", "Retiro", "Arganzuela", "Moncloa", "Tetuan"],
  Barcelona: ["Eixample", "Gracia", "Sants", "Poblenou", "Sant Marti", "Les Corts", "Raval"],
  Valencia: ["Ruzafa", "Benimaclet", "El Carmen", "Campanar", "Patraix", "Malvarrosa"],
  Sevilla: ["Triana", "Nervion", "Centro", "Los Remedios", "Macarena"],
  Malaga: ["Centro", "Teatinos", "El Palo", "Pedregalejo", "Huelin"],
  Bilbao: ["Abando", "Casco Viejo", "Deusto", "Indautxu", "Santutxu", "Basurto"],
};

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .trim()
    .toLowerCase();
}

function uniqueByNormalized(values: string[]) {
  const seen = new Set<string>();
  const out: string[] = [];

  for (const value of values) {
    const trimmed = value.trim();
    if (!trimmed) continue;
    const key = normalizeForSearch(trimmed);
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(trimmed);
  }

  return out;
}

function parseList(input: string) {
  return uniqueByNormalized(
    input
      .split(",")
      .map((item) => item.trim())
      .filter(Boolean),
  );
}

function formatLanguageLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toLocaleUpperCase("es-ES")}${trimmed.slice(1)}`;
}

function getCountryOptions() {
  try {
    if (typeof Intl.supportedValuesOf !== "function") {
      return ["Espana", "Francia", "Italia", "Portugal", "Alemania"];
    }

    const display = new Intl.DisplayNames(["es"], { type: "region" });
    const labels = (Intl.supportedValuesOf as (key: string) => string[])("region")
      .map((code) => display.of(code))
      .filter((item): item is string => Boolean(item) && item !== "Unknown Region");

    return uniqueByNormalized(labels).sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return ["Espana", "Francia", "Italia", "Portugal", "Alemania"];
  }
}

function getLanguageOptions() {
  try {
    if (typeof Intl.supportedValuesOf !== "function") {
      return ["Espanol", "Ingles", "Frances", "Aleman", "Italiano"];
    }

    const display = new Intl.DisplayNames(["es"], { type: "language" });
    const labels = (Intl.supportedValuesOf as (key: string) => string[])("language")
      .filter((code) => /^[a-z]{2,3}$/i.test(code))
      .map((code) => display.of(code.toLowerCase()))
      .filter((item): item is string => Boolean(item));

    return uniqueByNormalized(labels.map((item) => formatLanguageLabel(item))).sort((a, b) => a.localeCompare(b, "es"));
  } catch {
    return ["Espanol", "Ingles", "Frances", "Aleman", "Italiano"];
  }
}

export function QuickProfilePanel({ active }: { active: boolean }) {
  const [screen, setScreen] = useState<Screen>("basico");
  const [data, setData] = useState<QuickProfileData>(EMPTY_DATA);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [pisoCitySuggestions, setPisoCitySuggestions] = useState<CitySuggestion[]>([]);
  const [pisoStreetSuggestions, setPisoStreetSuggestions] = useState<CitySuggestion[]>([]);
  const [zoneSuggestions, setZoneSuggestions] = useState<ZoneSuggestion[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [isLoadingPisoCities, setIsLoadingPisoCities] = useState(false);
  const [isLoadingPisoStreets, setIsLoadingPisoStreets] = useState(false);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [languageDraft, setLanguageDraft] = useState("");
  const [zoneDraft, setZoneDraft] = useState("");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  const idiomasText = useMemo(() => data.idiomas.join(", "), [data.idiomas]);
  const aficionesText = useMemo(() => data.aficiones.join(", "), [data.aficiones]);
  const allCountries = useMemo(() => getCountryOptions(), []);
  const allLanguages = useMemo(() => getLanguageOptions(), []);
  const allUniversities = useMemo(() => [...new Set(UNIVERSIDADES)].sort((a, b) => a.localeCompare(b, "es")), []);

  useEffect(() => {
    if (!active) {
      return;
    }

    let alive = true;
    setLoading(true);

    void (async () => {
      try {
        const response = await fetch("/api/profile/quick", { cache: "no-store" });
        const payload = (await response.json()) as { profile?: QuickProfileData; error?: string };

        if (!response.ok || !payload.profile) {
          throw new Error(payload.error ?? "No se pudo cargar el perfil");
        }

        if (alive) {
          setData(payload.profile);
          setError("");
        }
      } catch (loadError) {
        if (alive) {
          setError(loadError instanceof Error ? loadError.message : "No se pudo cargar el perfil");
        }
      } finally {
        if (alive) {
          setLoading(false);
        }
      }
    })();

    return () => {
      alive = false;
    };
  }, [active]);

  useEffect(() => {
    const search = data.ciudad.trim();
    if (search.length < 2) {
      setCitySuggestions([]);
      setIsLoadingCities(false);
      return;
    }

    let activeRequest = true;
    setIsLoadingCities(true);

    void (async () => {
      try {
        if (!mapboxToken) {
          const fallback = Object.keys(CITY_ZONES)
            .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
            .slice(0, 10)
            .map((city) => ({ id: city, city, label: `${city}, Espana` }));

          if (activeRequest) {
            setCitySuggestions(fallback);
          }
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(search)}.json?autocomplete=true&types=place,locality&country=es&language=es&limit=10&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string; place_name?: string }>;
        };

        const byCity = new Map<string, CitySuggestion>();
        for (const feature of payload.features ?? []) {
          const cityName = (feature.text ?? "").trim();
          if (!cityName) continue;
          const key = normalizeForSearch(cityName);
          if (!byCity.has(key)) {
            byCity.set(key, {
              id: feature.id,
              city: cityName,
              label: feature.place_name ?? `${cityName}, Espana`,
            });
          }
        }

        if (activeRequest) {
          setCitySuggestions(Array.from(byCity.values()));
        }
      } catch {
        if (activeRequest) {
          setCitySuggestions([]);
        }
      } finally {
        if (activeRequest) {
          setIsLoadingCities(false);
        }
      }
    })();

    return () => {
      activeRequest = false;
    };
  }, [data.ciudad, mapboxToken]);

  useEffect(() => {
    const search = data.pisoDireccion.trim();
    const city = data.ciudad.trim();

    if (!city || search.length < 1) {
      setPisoStreetSuggestions([]);
      setIsLoadingPisoStreets(false);
      return;
    }

    let activeRequest = true;
    setIsLoadingPisoStreets(true);

    void (async () => {
      try {
        if (!mapboxToken) {
          const fallback = [
            `Calle ${search}, ${city}`,
            `Avenida ${search}, ${city}`,
            `Paseo ${search}, ${city}`,
          ].map((label, index) => ({ id: `fallback-${index}`, city: label, label }));

          if (activeRequest) {
            setPisoStreetSuggestions(fallback);
          }
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${search}, ${city}`)}.json?autocomplete=true&types=address,place,locality&country=es&language=es&limit=12&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string; place_name?: string }>;
        };

        const options = (payload.features ?? [])
          .map((feature) => ({
            id: feature.id,
            city: (feature.text ?? "").trim(),
            label: (feature.place_name ?? feature.text ?? "").trim(),
          }))
          .filter((feature) => feature.city && feature.label);

        if (activeRequest) {
          setPisoStreetSuggestions(options);
        }
      } catch {
        if (activeRequest) {
          setPisoStreetSuggestions([]);
        }
      } finally {
        if (activeRequest) {
          setIsLoadingPisoStreets(false);
        }
      }
    })();

    return () => {
      activeRequest = false;
    };
  }, [data.ciudad, data.pisoDireccion, mapboxToken]);

  useEffect(() => {
    const search = data.ciudad.trim();
    if (search.length < 2) {
      setPisoCitySuggestions([]);
      setIsLoadingPisoCities(false);
      return;
    }

    let activeRequest = true;
    setIsLoadingPisoCities(true);

    void (async () => {
      try {
        if (!mapboxToken) {
          const fallback = Object.keys(CITY_ZONES)
            .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
            .slice(0, 10)
            .map((city) => ({ id: city, city, label: `${city}, Espana` }));

          if (activeRequest) {
            setPisoCitySuggestions(fallback);
          }
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(search)}.json?autocomplete=true&types=place,locality&country=es&language=es&limit=10&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string; place_name?: string }>;
        };

        const byCity = new Map<string, CitySuggestion>();
        for (const feature of payload.features ?? []) {
          const cityName = (feature.text ?? "").trim();
          if (!cityName) continue;
          const key = normalizeForSearch(cityName);
          if (!byCity.has(key)) {
            byCity.set(key, {
              id: feature.id,
              city: cityName,
              label: feature.place_name ?? `${cityName}, Espana`,
            });
          }
        }

        if (activeRequest) {
          setPisoCitySuggestions(Array.from(byCity.values()));
        }
      } catch {
        if (activeRequest) {
          setPisoCitySuggestions([]);
        }
      } finally {
        if (activeRequest) {
          setIsLoadingPisoCities(false);
        }
      }
    })();

    return () => {
      activeRequest = false;
    };
  }, [data.ciudad, mapboxToken]);

  useEffect(() => {
    const city = data.ciudad.trim();
    if (!city) {
      setZoneSuggestions([]);
      setIsLoadingZones(false);
      return;
    }

    const fallbackZones = (CITY_ZONES[city] ?? []).map((zone) => ({ id: zone, label: zone }));

    if (!mapboxToken) {
      setZoneSuggestions(fallbackZones);
      return;
    }

    let activeRequest = true;
    setIsLoadingZones(true);

    void (async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(city)}.json?autocomplete=true&types=neighborhood,district,locality&country=es&language=es&limit=20&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string }>;
        };

        const merged = new Map<string, ZoneSuggestion>();
        for (const item of payload.features ?? []) {
          const label = (item.text ?? "").trim();
          if (!label) continue;
          const key = normalizeForSearch(label);
          if (!merged.has(key)) {
            merged.set(key, { id: item.id, label });
          }
        }

        for (const fallback of fallbackZones) {
          const key = normalizeForSearch(fallback.label);
          if (!merged.has(key)) {
            merged.set(key, fallback);
          }
        }

        if (activeRequest) {
          setZoneSuggestions(Array.from(merged.values()));
        }
      } catch {
        if (activeRequest) {
          setZoneSuggestions(fallbackZones);
        }
      } finally {
        if (activeRequest) {
          setIsLoadingZones(false);
        }
      }
    })();

    return () => {
      activeRequest = false;
    };
  }, [data.ciudad, mapboxToken]);

  async function saveProfile() {
    setSaving(true);
    setMessage("");
    setError("");

    try {
      const response = await fetch("/api/profile/quick", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(data),
      });

      const payload = (await response.json()) as { ok?: boolean; error?: string };
      if (!response.ok || !payload.ok) {
        throw new Error(payload.error ?? "No se pudo guardar el perfil");
      }

      setMessage("Perfil actualizado correctamente.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "No se pudo guardar el perfil");
    } finally {
      setSaving(false);
    }
  }

  function updateField<K extends keyof QuickProfileData>(key: K, value: QuickProfileData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
  }

  const filteredZoneSuggestions = useMemo(() => {
    const query = normalizeForSearch(zoneDraft);
    if (!query) return zoneSuggestions;
    return zoneSuggestions.filter((item) => normalizeForSearch(item.label).includes(query));
  }, [zoneDraft, zoneSuggestions]);

  function addIdioma(value: string) {
    const trimmed = value.trim();
    if (!trimmed) return;
    setData((prev) => ({ ...prev, idiomas: uniqueByNormalized([...prev.idiomas, trimmed]) }));
    setLanguageDraft("");
  }

  function toggleZona(value: string) {
    setData((prev) => {
      const exists = prev.zonas.some((item) => normalizeForSearch(item) === normalizeForSearch(value));
      return {
        ...prev,
        zonas: exists
          ? prev.zonas.filter((item) => normalizeForSearch(item) !== normalizeForSearch(value))
          : [...prev.zonas, value],
      };
    });
  }

  return (
    <div className="h-full overflow-y-auto bg-[#FCFCFC] px-4 py-4">
      <div className="mb-4 grid grid-cols-3 gap-2 rounded-2xl bg-white p-1">
        <button type="button" onClick={() => setScreen("basico")} className={`min-h-10 rounded-xl text-[13px] font-semibold ${screen === "basico" ? "bg-[#FF6B6B] text-white" : "text-[#4B5563]"}`}>
          Basico
        </button>
        <button type="button" onClick={() => setScreen("convivencia")} className={`min-h-10 rounded-xl text-[13px] font-semibold ${screen === "convivencia" ? "bg-[#FF6B6B] text-white" : "text-[#4B5563]"}`}>
          Convivencia
        </button>
        <button type="button" onClick={() => setScreen("piso")} className={`min-h-10 rounded-xl text-[13px] font-semibold ${screen === "piso" ? "bg-[#FF6B6B] text-white" : "text-[#4B5563]"}`}>
          Piso
        </button>
      </div>

      {loading ? <p className="text-[14px] text-[#6B7280]">Cargando perfil...</p> : null}
      {error ? <p className="mb-3 rounded-xl border border-[#FECACA] bg-[#FEF2F2] px-3 py-2 text-[13px] font-semibold text-[#B91C1C]">{error}</p> : null}
      {message ? <p className="mb-3 rounded-xl border border-[#BBF7D0] bg-[#F0FDF4] px-3 py-2 text-[13px] font-semibold text-[#166534]">{message}</p> : null}

      {!loading ? (
        <div className="space-y-3">
          {screen === "basico" ? (
            <>
              <input value={data.nombre} onChange={(e) => updateField("nombre", e.target.value)} placeholder="Nombre" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <input type="number" min={18} max={99} value={data.edad} onChange={(e) => updateField("edad", Number(e.target.value || 18))} placeholder="Edad" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <input list="quick-countries" value={data.pais} onChange={(e) => updateField("pais", e.target.value)} placeholder="Pais" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <datalist id="quick-countries">
                {allCountries.map((country) => (
                  <option key={country} value={country} />
                ))}
              </datalist>

              <input list="quick-cities" value={data.ciudad} onChange={(e) => updateField("ciudad", e.target.value)} placeholder="Ciudad (sugerencias reales)" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <datalist id="quick-cities">
                {citySuggestions.map((city) => (
                  <option key={city.id} value={city.city} label={city.label} />
                ))}
              </datalist>
              {isLoadingCities ? <p className="text-[12px] text-[#6B7280]">Buscando ciudades...</p> : null}

              <select value={data.estadoCivil} onChange={(e) => updateField("estadoCivil", e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]">
                <option value="soltero">Soltero</option>
                <option value="pareja">Pareja</option>
                <option value="prefiero_no_decir">Prefiero no decir</option>
              </select>

              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <p className="text-[13px] font-semibold text-[#374151]">Idiomas</p>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.idiomas.map((idioma) => (
                    <button
                      key={idioma}
                      type="button"
                      onClick={() => updateField("idiomas", data.idiomas.filter((item) => normalizeForSearch(item) !== normalizeForSearch(idioma)))}
                      className="rounded-full border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-semibold text-[#374151]"
                    >
                      {idioma} x
                    </button>
                  ))}
                </div>
                <div className="mt-2 flex gap-2">
                  <input
                    list="quick-languages"
                    value={languageDraft}
                    onChange={(e) => setLanguageDraft(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        addIdioma(languageDraft);
                      }
                    }}
                    placeholder="Anadir idioma"
                    className="h-10 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px]"
                  />
                  <button type="button" onClick={() => addIdioma(languageDraft)} className="h-10 rounded-lg bg-[#FF6B6B] px-3 text-[13px] font-semibold text-white">
                    Anadir
                  </button>
                </div>
                <datalist id="quick-languages">
                  {allLanguages.map((language) => (
                    <option key={language} value={language} />
                  ))}
                </datalist>
                <p className="mt-1 text-[12px] text-[#6B7280]">{idiomasText || "Sin idiomas seleccionados"}</p>
              </div>

              <textarea value={data.bio} onChange={(e) => updateField("bio", e.target.value)} placeholder="Bio" className="min-h-24 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]" />
            </>
          ) : null}

          {screen === "convivencia" ? (
            <>
              <select value={data.situacion} onChange={(e) => updateField("situacion", e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]">
                <option value="busco_habitacion">Busco habitacion</option>
                <option value="buscar_juntos">Buscar juntos</option>
                <option value="tengo_piso_libre">Tengo piso libre</option>
              </select>

              <select value={data.estudiaOTrabaja} onChange={(e) => updateField("estudiaOTrabaja", e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]">
                <option value="estudiante">Estudiante</option>
                <option value="trabajador">Trabajador</option>
                <option value="ambas">Ambas</option>
              </select>

              {(data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") ? (
                <>
                  <input value={data.carrera} onChange={(e) => updateField("carrera", e.target.value)} placeholder="Carrera" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <input list="quick-universities" value={data.universidad} onChange={(e) => updateField("universidad", e.target.value)} placeholder="Universidad" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <datalist id="quick-universities">
                    {allUniversities.map((university) => (
                      <option key={university} value={university} />
                    ))}
                  </datalist>
                </>
              ) : null}

              {(data.estudiaOTrabaja === "trabajador" || data.estudiaOTrabaja === "ambas") ? (
                <input value={data.trabajo} onChange={(e) => updateField("trabajo", e.target.value)} placeholder="Trabajo" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              ) : null}

              <input type="number" min={200} value={data.presupuestoMax} onChange={(e) => updateField("presupuestoMax", Number(e.target.value || 200))} placeholder="Presupuesto" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />

              <div className="rounded-xl border border-[#E5E7EB] bg-white p-3">
                <p className="text-[13px] font-semibold text-[#374151]">Barrios de {data.ciudad || "la ciudad seleccionada"}</p>
                <div className="mt-2 flex gap-2">
                  <input
                    value={zoneDraft}
                    onChange={(e) => setZoneDraft(e.target.value)}
                    placeholder="Filtrar o anadir barrio"
                    className="h-10 flex-1 rounded-lg border border-[#E5E7EB] bg-white px-3 text-[13px]"
                  />
                  <button type="button" onClick={() => {
                    const next = zoneDraft.trim();
                    if (!next) return;
                    toggleZona(next);
                    setZoneDraft("");
                  }} className="h-10 rounded-lg border border-[#D1D5DB] px-3 text-[13px] font-semibold text-[#374151]">
                    Anadir
                  </button>
                </div>
                {isLoadingZones ? <p className="mt-2 text-[12px] text-[#6B7280]">Cargando barrios...</p> : null}
                <div className="mt-2 max-h-36 space-y-1 overflow-y-auto pr-1">
                  {filteredZoneSuggestions.map((zone) => {
                    const activeZone = data.zonas.some((item) => normalizeForSearch(item) === normalizeForSearch(zone.label));
                    return (
                      <label key={zone.id} className="flex items-center gap-2 text-[13px] text-[#374151]">
                        <input type="checkbox" checked={activeZone} onChange={() => toggleZona(zone.label)} />
                        {zone.label}
                      </label>
                    );
                  })}
                </div>
                <div className="mt-2 flex flex-wrap gap-2">
                  {data.zonas.map((zone) => (
                    <button key={zone} type="button" onClick={() => toggleZona(zone)} className="rounded-full border border-[#D1D5DB] bg-[#F9FAFB] px-3 py-1 text-[12px] font-semibold text-[#374151]">
                      {zone} x
                    </button>
                  ))}
                </div>
              </div>

              <input value={data.horario} onChange={(e) => updateField("horario", e.target.value)} placeholder="Horario" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <input value={data.ambiente} onChange={(e) => updateField("ambiente", e.target.value)} placeholder="Ambiente" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <input value={data.deporte} onChange={(e) => updateField("deporte", e.target.value)} placeholder="Deporte" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
              <input value={aficionesText} onChange={(e) => updateField("aficiones", parseList(e.target.value))} placeholder="Aficiones (coma separada)" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />

              <label className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]">
                Fumas
                <input type="checkbox" checked={data.fumar} onChange={(e) => updateField("fumar", e.target.checked)} />
              </label>
              <label className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]">
                Aceptas mascotas
                <input type="checkbox" checked={data.mascotas} onChange={(e) => updateField("mascotas", e.target.checked)} />
              </label>
            </>
          ) : null}

          {screen === "piso" ? (
            <>
              <label className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]">
                Tengo piso publicado
                <input type="checkbox" checked={data.hasPiso} onChange={(e) => updateField("hasPiso", e.target.checked)} />
              </label>

              {data.hasPiso ? (
                <>
                  <input type="number" min={0} value={data.pisoPrecio} onChange={(e) => updateField("pisoPrecio", Number(e.target.value || 0))} placeholder="Precio piso" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <input list="quick-piso-cities" value={data.ciudad} onChange={(e) => updateField("ciudad", e.target.value)} placeholder="Ciudad del piso" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <datalist id="quick-piso-cities">
                    {pisoCitySuggestions.map((city) => (
                      <option key={city.id} value={city.city} label={city.label} />
                    ))}
                  </datalist>
                  {isLoadingPisoCities ? <p className="text-[12px] text-[#6B7280]">Buscando ciudades...</p> : null}

                  <input value={data.pisoZona} onChange={(e) => updateField("pisoZona", e.target.value)} placeholder="Barrio o zona" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <input list="quick-piso-streets" value={data.pisoDireccion} onChange={(e) => updateField("pisoDireccion", e.target.value)} placeholder="Calle y numero (autocompletado)" className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <datalist id="quick-piso-streets">
                    {pisoStreetSuggestions.map((street) => (
                      <option key={street.id} value={street.label} />
                    ))}
                  </datalist>
                  {isLoadingPisoStreets ? <p className="text-[12px] text-[#6B7280]">Buscando calles...</p> : null}

                  <input type="date" value={data.pisoDisponibleDesde} onChange={(e) => updateField("pisoDisponibleDesde", e.target.value)} className="h-11 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 text-[14px]" />
                  <textarea value={data.pisoDescripcion} onChange={(e) => updateField("pisoDescripcion", e.target.value)} placeholder="Descripcion" className="min-h-24 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]" />
                  <label className="flex items-center justify-between rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[14px]">
                    Gastos incluidos
                    <input type="checkbox" checked={data.pisoGastosIncluidos} onChange={(e) => updateField("pisoGastosIncluidos", e.target.checked)} />
                  </label>
                </>
              ) : (
                <p className="text-[13px] text-[#6B7280]">Si desactivas esto se quitara tu piso publicado.</p>
              )}
            </>
          ) : null}

          <button type="button" disabled={saving} onClick={() => void saveProfile()} className="mt-2 inline-flex min-h-11 w-full items-center justify-center rounded-xl bg-[#FF6B6B] px-4 text-[14px] font-semibold text-white disabled:opacity-70">
            {saving ? "Guardando..." : "Guardar cambios"}
          </button>
        </div>
      ) : null}
    </div>
  );
}
