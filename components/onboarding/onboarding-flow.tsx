"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { BrandLogo } from "@/components/brand-logo";
import { ChipList, FooterActions, RadioGroup, SectionCard, SelectField, StepHeader, ToggleGroup } from "@/components/onboarding/onboarding-structure";

type Props = {
  userId: string;
  email: string;
};

type Situacion = "tengo_piso_libre" | "busco_habitacion" | "buscar_juntos" | "";
type EstudioTrabajo = "estudiante" | "trabajador" | "ambas" | "";
type Fumar = "no_fumo" | "solo_fuera" | "si_fumo" | "";
type Mascotas = "tengo_mascota" | "acepto_mascotas" | "no_acepto" | "";
type Horario = "madrugador" | "normal" | "nocturno" | "";
type Ambiente = "tranquilo" | "equilibrado" | "social" | "";
type Deporte = "poco" | "algunas" | "frecuente" | "";
type EstadoCivil = "soltero" | "pareja" | "prefiero_no_decir" | "";

type CitySuggestion = {
  id: string;
  city: string;
  label: string;
};

type ZoneSuggestion = {
  id: string;
  label: string;
};

type OnboardingData = {
  nombre: string;
  edad: number | "";
  pais: string;
  ciudad: string;
  idiomas: string[];
  fotoPerfilDataUrl: string;
  estadoCivil: EstadoCivil;

  situacion: Situacion;
  estudiaOTrabaja: EstudioTrabajo;
  esErasmus: boolean;
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuestoMax: number;
  zonas: string[];
  disponibleDesde: string;

  fumar: Fumar;
  mascotas: Mascotas;
  horario: Horario;
  horarioPersonal: string;
  ambiente: Ambiente;
  deporte: Deporte;
  aficiones: string[];

  bio: string;
  pisoCiudad: string;
  pisoCalle: string;
  pisoPrecioAlquiler: number;
  pisoDireccion: string;
  pisoCompaneros: number;
  pisoGastosIncluidos: boolean;
  pisoFotosDataUrls: string[];
  pisoDescripcion: string;
  telefono: string;
  telefonoCodigoEnviado: string;
  telefonoCodigoInput: string;
  telefonoVerificado: boolean;
};

const STORAGE_KEY_PREFIX = "pd_onboarding_v1";

const LANG_OPTIONS = [
  { code: "es", label: "Español" },
  { code: "en", label: "Inglés" },
  { code: "fr", label: "Francés" },
  { code: "de", label: "Alemán" },
  { code: "it", label: "italiano" },
  { code: "pt", label: "Portugués" },
  { code: "zh", label: "Chino" },
  { code: "ar", label: "Árabe" },
] as const;

const CITIES = [
  "Madrid",
  "Barcelona",
  "Valencia",
  "Sevilla",
  "Malaga",
  "Bilbao",
  "Zaragoza",
  "Murcia",
  "Palma",
  "Alicante",
  "Granada",
  "Valladolid",
  "Vigo",
  "Gijon",
  "A Coruna",
  "Cordoba",
  "Santander",
  "Donostia",
  "Salamanca",
  "Las Palmas",
];

const CITY_ZONES: Record<string, string[]> = {
  Madrid: ["Centro", "Salamanca", "Chamberi", "Retiro", "Arganzuela", "Moncloa", "Tetuan"],
  Barcelona: ["Eixample", "Gracia", "Sants", "Poblenou", "Sant Marti", "Les Corts", "Raval"],
  Valencia: ["Ruzafa", "Benimaclet", "El Carmen", "Campanar", "Patraix", "Malvarrosa"],
  Sevilla: ["Triana", "Nervion", "Centro", "Los Remedios", "Macarena"],
  Malaga: ["Centro", "Teatinos", "El Palo", "Pedregalejo", "Huelin"],
  Bilbao: ["Abando", "Casco Viejo", "Deusto", "Indautxu", "Santutxu", "Basurto"],
  Zaragoza: ["Centro", "Delicias", "Universidad", "Actur", "Casco Historico", "La Almozara"],
  Murcia: ["Centro", "La Flota", "Santa Maria de Gracia", "Vistabella", "El Carmen", "Espinardo"],
  Palma: ["Santa Catalina", "Son Armadans", "El Terreno", "Pere Garau", "Foners", "Centro"],
  Alicante: ["Centro", "San Blas", "Benalua", "Carolinas", "Playa de San Juan", "Albufereta"],
  Granada: ["Centro", "Realejo", "Zaidin", "Albaicin", "Chana", "Cartuja"],
  Valladolid: ["Centro", "Parquesol", "Delicias", "La Rubia", "Huerta del Rey", "Rondilla"],
  Vigo: ["Casco Vello", "Coia", "Teis", "Navia", "Calvario", "Bouzas"],
  Gijon: ["Centro", "La Arena", "El Coto", "Viesques", "Pumarin", "Natahoyo"],
  "A Coruna": ["Ciudad Vieja", "Monte Alto", "Riazor", "Os Mallos", "Cuatro Caminos", "Matogrande"],
  Cordoba: ["Centro", "Ciudad Jardin", "Levante", "Huerta de la Reina", "Brillante", "Figueroa"],
  Santander: ["Centro", "Puertochico", "Sardinero", "Cueto", "Castilla-Hermida", "Cazoña"],
  Donostia: ["Centro", "Gros", "Amara", "Antiguo", "Egia", "Intxaurrondo"],
  Salamanca: ["Centro", "Garrido", "San Bernardo", "Pizarrales", "Prosperidad", "Tejares"],
  "Las Palmas": ["Triana", "Vegueta", "Guanarteme", "Alcaravaneras", "Schamann", "La Isleta"],
};

const UNIVERSIDADES = [
  "Universidad de Alcalá",
  "Universidad Alfonso X el Sabio",
  "Universidad Antonio de Nebrija",
  "Universidad Camilo José Cela",
  "Universidad Carlos III de Madrid",
  "Universidad Complutense de Madrid",
  "Universidad de Deusto",
  "Universidad Europea de Madrid",
  "Universidad Francisco de Vitoria",
  "Universidad Internacional de La Rioja",
  "Universidad Loyola",
  "Universidad Nacional de Educación a Distancia",
  "Universidad Pontificia Comillas",
  "Universidad Rey Juan Carlos",
  "Universidad San Pablo CEU",
  "Universidad Villanueva",
  "Universidad Autonoma de Madrid",
  "Universidad Politecnica de Madrid",
  "Universidad de Alicante",
  "Universidad de Almería",
  "Universidad de Burgos",
  "Universidad de Cádiz",
  "Universidad de Cantabria",
  "Universidad de Castilla-La Mancha",
  "Universidad de Córdoba",
  "Universidad de Extremadura",
  "Universidad de Girona",
  "Universidad de Huelva",
  "Universidad de Jaén",
  "Universidad de La Laguna",
  "Universidad de La Rioja",
  "Universidad de Las Palmas de Gran Canaria",
  "Universidad de León",
  "Universidad de Lleida",
  "Universidad de Navarra",
  "Universidad de Oviedo",
  "Universidad de Salamanca",
  "Universidad de Santiago de Compostela",
  "Universidad de Vigo",
  "Universidad de Zaragoza",
  "Universidad de Barcelona",
  "Universidad de Burgos",
  "Universidad de Cádiz",
  "Universidad de Castilla-La Mancha",
  "Universidad de Córdoba",
  "Universidad de Granada",
  "Universidad de Jaén",
  "Universidad de León",
  "Universidad de Murcia",
  "Universidad de Sevilla",
  "Universitat Autonoma de Barcelona",
  "Universitat Abat Oliba CEU",
  "Universitat de Girona",
  "Universitat de Lleida",
  "Universitat de Vic",
  "Universitat de les Illes Balears",
  "Universitat de Valencia",
  "Universitat Internacional de Catalunya",
  "Universitat Jaume I",
  "Universitat Oberta de Catalunya",
  "Universitat Ramon Llull",
  "Universitat Rovira i Virgili",
  "Universitat Pompeu Fabra",
  "Universitat Politecnica de Valencia",
  "Universidad de Malaga",
  "Universidad del Pais Vasco",
  "Universidad Miguel Hernandez de Elche",
  "Universidad Pablo de Olavide",
  "Universidad Politécnica de Cartagena",
  "Universidad Pública de Navarra",
];

const COUNTRIES = [
  "Afganistan","Albania","Alemania","Andorra","Angola","Antigua y Barbuda","Arabia Saudi","Argelia","Argentina","Armenia","Australia","Austria","Azerbaiyan","Bahamas","Bangladesh","Barbados","Barein","Belgica","Belice","Benin","Bielorrusia","Birmania","Bolivia","Bosnia y Herzegovina","Botsuana","Brasil","Brunei","Bulgaria","Burkina Faso","Burundi","Butan","Cabo Verde","Camboya","Camerun","Canada","Catar","Chad","Chile","China","Chipre","Colombia","Comoras","Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba","Dinamarca","Dominica","Ecuador","Egipto","El Salvador","Emiratos Arabes Unidos","Eritrea","Eslovaquia","Eslovenia","Espana","Estados Unidos","Estonia","Etiopia","Filipinas","Finlandia","Fiyi","Francia","Gabon","Gambia","Georgia","Ghana","Granada","Grecia","Guatemala","Guinea","Guinea Ecuatorial","Guinea-Bisau","Guyana","Haiti","Honduras","Hungria","India","Indonesia","Irak","Iran","Irlanda","Islandia","Israel","Italia","Jamaica","Japon","Jordania","Kazajistan","Kenia","Kirguistan","Kiribati","Kuwait","Laos","Lesoto","Letonia","Libano","Liberia","Libia","Liechtenstein","Lituania","Luxemburgo","Macedonia del Norte","Madagascar","Malasia","Malaui","Maldivas","Mali","Malta","Marruecos","Mauricio","Mauritania","Mexico","Micronesia","Moldavia","Monaco","Mongolia","Montenegro","Mozambique","Namibia","Nauru","Nepal","Nicaragua","Niger","Nigeria","Noruega","Nueva Zelanda","Oman","Paises Bajos","Pakistan","Palaos","Panama","Papua Nueva Guinea","Paraguay","Peru","Polonia","Portugal","Reino Unido","Republica Centroafricana","Republica Checa","Republica Democratica del Congo","Republica del Congo","Republica Dominicana","Ruanda","Rumania","Rusia","Samoa","San Cristobal y Nieves","San Marino","San Vicente y las Granadinas","Santa Lucia","Santo Tome y Principe","Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka","Suazilandia","Sudafrica","Sudan","Sudan del Sur","Suecia","Suiza","Surinam","Tailandia","Tanzania","Tayikistan","Timor Oriental","Togo","Tonga","Trinidad y Tobago","Tunez","Turkmenistan","Turquia","Tuvalu","Ucrania","Uganda","Uruguay","Uzbekistan","Vanuatu","Vaticano","Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue"
];

const HOBBIES = [
  { id: "musica", label: "Musica" },
  { id: "cine", label: "Cine" },
  { id: "cocina", label: "Cocina" },
  { id: "viajes", label: "Viajes" },
  { id: "gaming", label: "Gaming" },
  { id: "lectura", label: "Lectura" },
  { id: "deporte", label: "Deporte" },
  { id: "fotografia", label: "Fotografia" },
  { id: "arte", label: "Arte" },
  { id: "tecnologia", label: "Tecnologia" },
  { id: "moda", label: "Moda" },
  { id: "naturaleza", label: "Naturaleza" },
];

const initialData: OnboardingData = {
  nombre: "",
  edad: "",
  pais: "",
  ciudad: "",
  idiomas: [],
  fotoPerfilDataUrl: "",
  estadoCivil: "",

  situacion: "",
  estudiaOTrabaja: "",
  esErasmus: false,
  carrera: "",
  universidad: "",
  trabajo: "",
  presupuestoMax: 900,
  zonas: [],
  disponibleDesde: "",

  fumar: "",
  mascotas: "",
  horario: "",
  horarioPersonal: "",
  ambiente: "",
  deporte: "",
  aficiones: [],

  bio: "",
  pisoCiudad: "",
  pisoCalle: "",
  pisoPrecioAlquiler: 650,
  pisoDireccion: "",
  pisoCompaneros: 1,
  pisoGastosIncluidos: false,
  pisoFotosDataUrls: [],
  pisoDescripcion: "",
  telefono: "",
  telefonoCodigoEnviado: "",
  telefonoCodigoInput: "",
  telefonoVerificado: false,
};

function stepLabel(step: number) {
  return `Paso ${step} de 4`;
}

function cardClass(selected: boolean, error?: boolean) {
  return `min-h-12 w-full rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition ${
    selected
      ? "border-black/25 bg-white text-slate-800 shadow-[0_4px_14px_rgba(0,0,0,0.08)]"
      : error
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : "border-black/10 bg-white text-slate-700 hover:border-black/20"
  }`;
}

function fieldClass(error?: boolean) {
  return `h-12 w-full rounded-2xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${
    error
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-black/10 focus:border-black/25 focus:ring-black/5"
  }`;
}

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

function formatLanguageLabel(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return trimmed;
  return `${trimmed.charAt(0).toLocaleUpperCase("es-ES")}${trimmed.slice(1)}`;
}

function clampBudget(value: number) {
  if (Number.isNaN(value)) return 200;
  return Math.min(5000, Math.max(200, value));
}

function parseBudgetInput(value: string) {
  const numeric = Number(value.replace(/[^0-9]/g, ""));
  return clampBudget(numeric);
}

function parseMoneyInput(value: string) {
  const numeric = Number(value.replace(/[^0-9]/g, ""));
  return Number.isNaN(numeric) ? 0 : Math.min(5000, Math.max(0, numeric));
}

async function toDataUrl(file: File) {
  return new Promise<string>((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function dataUrlToFile(dataUrl: string, fileName: string) {
  const [meta, body] = dataUrl.split(",");
  const mime = meta.match(/data:(.*?);base64/)?.[1] ?? "image/jpeg";
  const byteString = atob(body ?? "");
  const arrayBuffer = new ArrayBuffer(byteString.length);
  const intArray = new Uint8Array(arrayBuffer);

  for (let i = 0; i < byteString.length; i += 1) {
    intArray[i] = byteString.charCodeAt(i);
  }

  return new File([arrayBuffer], fileName, { type: mime });
}

export function OnboardingFlow({ userId, email }: Props) {
  const router = useRouter();
  const storageKey = `${STORAGE_KEY_PREFIX}:${userId}`;
  const countryMenuRef = useRef<HTMLDivElement | null>(null);
  const cityMenuRef = useRef<HTMLDivElement | null>(null);
  const pisoCityMenuRef = useRef<HTMLDivElement | null>(null);
  const pisoStreetMenuRef = useRef<HTMLDivElement | null>(null);
  const universityMenuRef = useRef<HTMLDivElement | null>(null);
  const zonesMenuRef = useRef<HTMLDivElement | null>(null);
  const languageMenuRef = useRef<HTMLDivElement | null>(null);

  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [budgetDraft, setBudgetDraft] = useState(String(initialData.presupuestoMax));
  const [pisoPrecioDraft, setPisoPrecioDraft] = useState(String(initialData.pisoPrecioAlquiler));
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isPisoFotosUploading, setIsPisoFotosUploading] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [smsFeedback, setSmsFeedback] = useState("");
  const [countryMenuOpen, setCountryMenuOpen] = useState(false);
  const [countryQuery, setCountryQuery] = useState("");
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const [pisoCityMenuOpen, setPisoCityMenuOpen] = useState(false);
  const [pisoCityQuery, setPisoCityQuery] = useState("");
  const [pisoCitySuggestions, setPisoCitySuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingPisoCities, setIsLoadingPisoCities] = useState(false);
  const [pisoStreetMenuOpen, setPisoStreetMenuOpen] = useState(false);
  const [pisoStreetQuery, setPisoStreetQuery] = useState("");
  const [pisoStreetSuggestions, setPisoStreetSuggestions] = useState<CitySuggestion[]>([]);
  const [isLoadingPisoStreets, setIsLoadingPisoStreets] = useState(false);
  const [universityMenuOpen, setUniversityMenuOpen] = useState(false);
  const [universityQuery, setUniversityQuery] = useState("");
  const [zonesMenuOpen, setZonesMenuOpen] = useState(false);
  const [zonesQuery, setZonesQuery] = useState("");
  const [zoneSuggestions, setZoneSuggestions] = useState<ZoneSuggestion[]>([]);
  const [isLoadingZones, setIsLoadingZones] = useState(false);
  const [languageMenuOpen, setLanguageMenuOpen] = useState(false);
  const [languageQuery, setLanguageQuery] = useState("");
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;

  useEffect(() => {
    const saved = localStorage.getItem(storageKey);
    if (!saved) return;

    try {
      const parsed = JSON.parse(saved) as { step: number; data: OnboardingData };
      if (parsed?.data) {
        setData({ ...initialData, ...parsed.data });
      }
      if (parsed?.step && parsed.step >= 1 && parsed.step <= 4) {
        setStep(parsed.step);
      }
    } catch {
      localStorage.removeItem(storageKey);
    }
  }, [storageKey]);

  useEffect(() => {
    localStorage.setItem(storageKey, JSON.stringify({ step, data }));
  }, [data, step, storageKey]);

  useEffect(() => {
    setBudgetDraft(String(data.presupuestoMax || ""));
  }, [data.presupuestoMax]);

  useEffect(() => {
    setPisoPrecioDraft(String(data.pisoPrecioAlquiler || ""));
  }, [data.pisoPrecioAlquiler]);

  const zonasDisponibles = useMemo(() => {
    if (zoneSuggestions.length) {
      return zoneSuggestions.map((item) => item.label);
    }

    return CITY_ZONES[data.ciudad] ?? [];
  }, [data.ciudad, zoneSuggestions]);

  const allCountries = useMemo(() => [...COUNTRIES].sort((a, b) => a.localeCompare(b, "es")), []);

  const filteredCountries = useMemo(() => {
    const search = normalizeForSearch(countryQuery.trim());
    if (!search) {
      return allCountries;
    }

    return allCountries.filter((country) => normalizeForSearch(country).includes(search));
  }, [allCountries, countryQuery]);

  const allLanguageOptions = useMemo(() => {
    try {
      if (typeof Intl.supportedValuesOf === "function") {
        const displayNames = new Intl.DisplayNames(["es"], { type: "language" });
        const values = (Intl.supportedValuesOf as (key: string) => string[])("language")
          .filter((code) => /^[a-z]{2,3}$/i.test(code))
          .map((code) => {
            const normalized = code.toLowerCase();
            const label = displayNames.of(normalized) ?? normalized;
            return {
              code: normalized,
              label: formatLanguageLabel(label),
            };
          })
          .filter((item) => item.label && item.label !== item.code);

        const unique = new Map<string, { code: string; label: string }>();
        for (const item of values) {
          const dedupeKey = normalizeForSearch(item.label);
          if (!unique.has(dedupeKey)) {
            unique.set(dedupeKey, item);
          }
        }

        const merged = [...LANG_OPTIONS, ...Array.from(unique.values())];
        const byLabel = new Map<string, { code: string; label: string }>();
        for (const item of merged) {
          byLabel.set(item.label, item);
        }

        return Array.from(byLabel.values()).sort((a, b) => a.label.localeCompare(b.label, "es"));
      }
    } catch {
      // Ignore and fallback to static options.
    }

    return [...LANG_OPTIONS].sort((a, b) => a.label.localeCompare(b.label, "es"));
  }, []);

  const filteredLanguageOptions = useMemo(() => {
    const search = normalizeForSearch(languageQuery.trim());
    if (!search) {
      return allLanguageOptions;
    }

    return allLanguageOptions.filter((item) => normalizeForSearch(item.label).includes(search));
  }, [allLanguageOptions, languageQuery]);

  const allUniversityOptions = useMemo(
    () => Array.from(new Set(UNIVERSIDADES)).sort((a, b) => a.localeCompare(b, "es")),
    [],
  );

  const filteredUniversityOptions = useMemo(() => {
    const search = normalizeForSearch(universityQuery.trim());
    if (!search) {
      return allUniversityOptions;
    }

    return allUniversityOptions.filter((uni) => normalizeForSearch(uni).includes(search));
  }, [allUniversityOptions, universityQuery]);

  const filteredZones = useMemo(() => {
    const search = normalizeForSearch(zonesQuery.trim());
    if (!search) {
      return zonasDisponibles;
    }

    return zonasDisponibles.filter((zone) => normalizeForSearch(zone).includes(search));
  }, [zonasDisponibles, zonesQuery]);

  useEffect(() => {
    function handleCountryOutsideClick(event: MouseEvent) {
      if (!countryMenuRef.current) return;
      if (countryMenuRef.current.contains(event.target as Node)) return;
      setCountryMenuOpen(false);
    }

    document.addEventListener("mousedown", handleCountryOutsideClick);
    return () => document.removeEventListener("mousedown", handleCountryOutsideClick);
  }, []);

  useEffect(() => {
    function handleCityOutsideClick(event: MouseEvent) {
      if (!cityMenuRef.current) return;
      if (cityMenuRef.current.contains(event.target as Node)) return;
      setCityMenuOpen(false);
    }

    document.addEventListener("mousedown", handleCityOutsideClick);
    return () => document.removeEventListener("mousedown", handleCityOutsideClick);
  }, []);

  useEffect(() => {
    function handlePisoCityOutsideClick(event: MouseEvent) {
      if (!pisoCityMenuRef.current) return;
      if (pisoCityMenuRef.current.contains(event.target as Node)) return;
      setPisoCityMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePisoCityOutsideClick);
    return () => document.removeEventListener("mousedown", handlePisoCityOutsideClick);
  }, []);

  useEffect(() => {
    function handlePisoStreetOutsideClick(event: MouseEvent) {
      if (!pisoStreetMenuRef.current) return;
      if (pisoStreetMenuRef.current.contains(event.target as Node)) return;
      setPisoStreetMenuOpen(false);
    }

    document.addEventListener("mousedown", handlePisoStreetOutsideClick);
    return () => document.removeEventListener("mousedown", handlePisoStreetOutsideClick);
  }, []);

  useEffect(() => {
    function handleUniversityOutsideClick(event: MouseEvent) {
      if (!universityMenuRef.current) return;
      if (universityMenuRef.current.contains(event.target as Node)) return;
      setUniversityMenuOpen(false);
    }

    document.addEventListener("mousedown", handleUniversityOutsideClick);
    return () => document.removeEventListener("mousedown", handleUniversityOutsideClick);
  }, []);

  useEffect(() => {
    function handleZonesOutsideClick(event: MouseEvent) {
      if (!zonesMenuRef.current) return;
      if (zonesMenuRef.current.contains(event.target as Node)) return;
      setZonesMenuOpen(false);
    }

    document.addEventListener("mousedown", handleZonesOutsideClick);
    return () => document.removeEventListener("mousedown", handleZonesOutsideClick);
  }, []);

  useEffect(() => {
    function handleLanguageOutsideClick(event: MouseEvent) {
      if (!languageMenuRef.current) return;
      if (languageMenuRef.current.contains(event.target as Node)) return;
      setLanguageMenuOpen(false);
    }

    document.addEventListener("mousedown", handleLanguageOutsideClick);
    return () => document.removeEventListener("mousedown", handleLanguageOutsideClick);
  }, []);

  useEffect(() => {
    const search = data.ciudad.trim();

    if (search.length < 2) {
      setCitySuggestions([]);
      setIsLoadingCities(false);
      return;
    }

    let active = true;
    setIsLoadingCities(true);

    void (async () => {
      try {
        if (!mapboxToken) {
          const fallback = CITIES
            .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
            .slice(0, 10)
            .map((city) => ({
              id: city,
              city,
              label: `${city}, Espana`,
            }));

          if (active) {
            setCitySuggestions(fallback);
          }
          return;
        }

        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            search,
          )}.json?autocomplete=true&types=place,locality&country=es&language=es&limit=10&access_token=${mapboxToken}`,
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

        if (active) {
          setCitySuggestions(Array.from(byCity.values()));
        }
      } catch {
        if (!active) return;

        const fallback = CITIES
          .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
          .slice(0, 10)
          .map((city) => ({
            id: city,
            city,
            label: `${city}, Espana`,
          }));

        setCitySuggestions(fallback);
      } finally {
        if (active) {
          setIsLoadingCities(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [data.ciudad, mapboxToken]);

  useEffect(() => {
    const search = pisoCityQuery.trim();

    if (search.length < 2) {
      setPisoCitySuggestions([]);
      setIsLoadingPisoCities(false);
      return;
    }

    let active = true;
    setIsLoadingPisoCities(true);

    void (async () => {
      try {
        if (!mapboxToken) {
          const fallback = CITIES
            .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
            .slice(0, 10)
            .map((city) => ({ id: city, city, label: `${city}, Espana` }));

          if (active) {
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

        if (active) {
          setPisoCitySuggestions(Array.from(byCity.values()));
        }
      } catch {
        if (!active) return;

        const fallback = CITIES
          .filter((city) => normalizeForSearch(city).includes(normalizeForSearch(search)))
          .slice(0, 10)
          .map((city) => ({ id: city, city, label: `${city}, Espana` }));

        setPisoCitySuggestions(fallback);
      } finally {
        if (active) {
          setIsLoadingPisoCities(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [pisoCityQuery, mapboxToken]);

  useEffect(() => {
    const city = data.pisoCiudad.trim();
    const search = pisoStreetQuery.trim();

    if (!city || search.length < 1) {
      setPisoStreetSuggestions([]);
      setIsLoadingPisoStreets(false);
      return;
    }

    const streetPrefixes = ["Calle", "Avenida", "Paseo", "Plaza", "Ronda", "Camino", "Pasaje", "Carretera"];
    const fallbackStreets = streetPrefixes
      .map((prefix) => `${prefix} ${search}`.trim())
      .filter((label) => label.length > prefixMinLength(search))
      .map((label) => ({ id: `fallback-${label}`, city: label, label: `${label}, ${city}` }));

    if (!mapboxToken) {
      setPisoStreetSuggestions(fallbackStreets);
      return;
    }

    let active = true;
    setIsLoadingPisoStreets(true);

    void (async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(`${search}, ${city}`)}.json?autocomplete=true&types=address,place,locality&country=es&language=es&limit=15&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string; place_name?: string }>;
        };

        const byStreet = new Map<string, CitySuggestion>();
        for (const feature of payload.features ?? []) {
          const streetName = (feature.text ?? "").trim();
          const placeName = (feature.place_name ?? "").trim();
          if (!streetName) continue;
          if (placeName && !normalizeForSearch(placeName).includes(normalizeForSearch(city))) continue;

          const key = normalizeForSearch(streetName);
          if (!byStreet.has(key)) {
            byStreet.set(key, {
              id: feature.id,
              city: streetName,
              label: placeName || streetName,
            });
          }
        }

        for (const fallback of fallbackStreets) {
          const key = normalizeForSearch(fallback.label);
          if (!byStreet.has(key)) {
            byStreet.set(key, fallback);
          }
        }

        if (active) {
          setPisoStreetSuggestions(Array.from(byStreet.values()));
        }
      } catch {
        if (active) {
          setPisoStreetSuggestions(fallbackStreets);
        }
      } finally {
        if (active) {
          setIsLoadingPisoStreets(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [data.pisoCiudad, pisoStreetQuery, mapboxToken]);

  function prefixMinLength(value: string) {
    return Math.max(1, value.trim().length);
  }

  useEffect(() => {
    const city = data.ciudad.trim();

    if (!city) {
      setZoneSuggestions([]);
      setIsLoadingZones(false);
      return;
    }

    const fallbackZones = (CITY_ZONES[city] ?? []).map((zone) => ({
      id: `fallback-${zone}`,
      label: zone,
    }));

    if (!mapboxToken) {
      setZoneSuggestions(fallbackZones);
      return;
    }

    let active = true;
    setIsLoadingZones(true);

    void (async () => {
      try {
        const response = await fetch(
          `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(
            city,
          )}.json?autocomplete=true&types=neighborhood,district,locality&country=es&language=es&limit=20&access_token=${mapboxToken}`,
        );

        const payload = (await response.json()) as {
          features?: Array<{ id: string; text?: string }>;
        };

        const byName = new Map<string, ZoneSuggestion>();

        for (const item of payload.features ?? []) {
          const text = (item.text ?? "").trim();
          if (!text) continue;

          const normalized = normalizeForSearch(text);
          if (!byName.has(normalized)) {
            byName.set(normalized, {
              id: item.id,
              label: formatLanguageLabel(text),
            });
          }
        }

        for (const fallback of fallbackZones) {
          const normalized = normalizeForSearch(fallback.label);
          if (!byName.has(normalized)) {
            byName.set(normalized, fallback);
          }
        }

        if (active) {
          setZoneSuggestions(Array.from(byName.values()));
        }
      } catch {
        if (active) {
          setZoneSuggestions(fallbackZones);
        }
      } finally {
        if (active) {
          setIsLoadingZones(false);
        }
      }
    })();

    return () => {
      active = false;
    };
  }, [data.ciudad, mapboxToken]);

  function setField<K extends keyof OnboardingData>(key: K, value: OnboardingData[K]) {
    setData((prev) => ({ ...prev, [key]: value }));
    setErrors((prev) => {
      if (!prev[key]) return prev;
      const next = { ...prev };
      delete next[key];
      return next;
    });
  }

  function toggleArrayItem<K extends keyof OnboardingData>(key: K, value: string) {
    setData((prev) => {
      const current = prev[key] as string[];
      const exists = current.includes(value);
      const next = exists ? current.filter((item) => item !== value) : [...current, value];
      return { ...prev, [key]: next };
    });
  }

  function validateStep(currentStep: number) {
    const nextErrors: Record<string, string> = {};

    if (currentStep === 1) {
      if (!data.nombre.trim()) nextErrors.nombre = "El nombre es obligatorio";
      if (data.edad === "" || data.edad < 18 || data.edad > 65) nextErrors.edad = "Edad valida entre 18 y 65";
      if (!data.pais.trim()) nextErrors.pais = "El pais es obligatorio";
      if (!data.ciudad.trim()) nextErrors.ciudad = "La ciudad es obligatoria";
      if (!data.idiomas.length) nextErrors.idiomas = "Selecciona al menos un idioma";
      if (!data.fotoPerfilDataUrl) nextErrors.fotoPerfilDataUrl = "La foto de perfil es obligatoria";
    }

    if (currentStep === 2) {
      if (!data.situacion) nextErrors.situacion = "Selecciona tu situacion";
      if (!data.estudiaOTrabaja) nextErrors.estudiaOTrabaja = "Selecciona tu situacion academica/laboral";

      if ((data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") && !data.carrera.trim()) {
        nextErrors.carrera = "La carrera es obligatoria";
      }
      if ((data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") && !data.universidad.trim()) {
        nextErrors.universidad = "Selecciona una universidad";
      }
      if ((data.estudiaOTrabaja === "trabajador" || data.estudiaOTrabaja === "ambas") && !data.trabajo.trim()) {
        nextErrors.trabajo = "La profesion es obligatoria";
      }

      const parsedBudget = parseMoneyInput(budgetDraft);
      if ((data.situacion === "busco_habitacion" || data.situacion === "buscar_juntos") && parsedBudget < 200) {
        nextErrors.presupuestoMax = "Indica un presupuesto valido";
      }

      if (data.situacion === "tengo_piso_libre") {
        const parsedPisoPrecio = parseMoneyInput(pisoPrecioDraft);
        if (!data.pisoCiudad.trim()) nextErrors.pisoCiudad = "Selecciona la ciudad del piso";
        if (!data.pisoCalle.trim()) nextErrors.pisoCalle = "Indica la calle del piso";
        if (!parsedPisoPrecio || parsedPisoPrecio < 200) nextErrors.pisoPrecioAlquiler = "Indica un precio valido";
        if (!data.pisoCompaneros || data.pisoCompaneros < 1 || data.pisoCompaneros > 20) nextErrors.pisoCompaneros = "Indica cuantos sois (1-20)";
        if (!data.pisoFotosDataUrls.length) nextErrors.pisoFotosDataUrls = "Sube al menos una foto del piso";
        if (!data.pisoDescripcion.trim()) nextErrors.pisoDescripcion = "Describe ambiente y normas";
      }

      const wantsRoomSearch = data.situacion === "busco_habitacion" || data.situacion === "buscar_juntos";
      if (wantsRoomSearch && !data.zonas.length) nextErrors.zonas = "Selecciona al menos una zona";
    }

    if (currentStep === 3) {
      if (!data.fumar) nextErrors.fumar = "Selecciona una opcion";
      if (!data.mascotas) nextErrors.mascotas = "Selecciona una opcion";
      if (!data.horario && !data.horarioPersonal.trim()) nextErrors.horario = "Selecciona una opcion o escribe tu horario";
      if (!data.ambiente) nextErrors.ambiente = "Selecciona una opcion";
    }

    if (currentStep === 4) {
      if (!data.bio.trim()) nextErrors.bio = "La presentacion es obligatoria";
      if (data.bio.length > 300) nextErrors.bio = "Maximo 300 caracteres";
    }

    setErrors(nextErrors);
    return Object.keys(nextErrors).length === 0;
  }

  async function goNext() {
    if (!validateStep(step)) return;

    if (step < 4) {
      setAnimating(true);
      setTimeout(() => {
        setStep((prev) => Math.min(4, prev + 1));
        setAnimating(false);
      }, 180);
      return;
    }

    await submitOnboarding();
  }

  function goBack() {
    if (step === 1) return;
    setAnimating(true);
    setTimeout(() => {
      setStep((prev) => Math.max(1, prev - 1));
      setAnimating(false);
    }, 180);
  }

  async function handleProfilePhoto(file?: File | null) {
    if (!file) return;
    const dataUrl = await toDataUrl(file);
    setField("fotoPerfilDataUrl", dataUrl);
  }

  async function handlePisoFiles(files: FileList | null) {
    if (!files?.length) return;

    setIsPisoFotosUploading(true);
    try {
      const selected = Array.from(files).slice(0, MAX_PISO_PHOTOS - data.pisoFotosDataUrls.length);
      const urls = await Promise.all(selected.map((file) => toDataUrl(file)));
      setField("pisoFotosDataUrls", [...data.pisoFotosDataUrls, ...urls].slice(0, MAX_PISO_PHOTOS));
    } finally {
      setIsPisoFotosUploading(false);
    }
  }

  function sendSmsCode() {
    if (!data.telefono.trim()) {
      setErrors((prev) => ({ ...prev, telefono: "Introduce un telefono valido" }));
      return;
    }

    const generated = String(Math.floor(100000 + Math.random() * 900000));
    setField("telefonoCodigoEnviado", generated);
    setSmsFeedback("SMS enviado (simulado para esta version). Revisa el codigo.");
  }

  function verifyCode() {
    if (!data.telefonoCodigoEnviado) {
      setSmsFeedback("Primero envia un SMS.");
      return;
    }

    if (data.telefonoCodigoInput.trim() === data.telefonoCodigoEnviado) {
      setField("telefonoVerificado", true);
      setSmsFeedback("Telefono verificado correctamente.");
      return;
    }

    setSmsFeedback("Codigo incorrecto.");
  }

  async function submitOnboarding() {
    setIsSaving(true);
    setGlobalError("");

    try {
      const aficionesWithErasmus = data.esErasmus
        ? Array.from(new Set([...data.aficiones, "erasmus"]))
        : data.aficiones.filter((item) => item !== "erasmus");

      const presupuestoMax = parseMoneyInput(budgetDraft);
      const pisoPrecioAlquiler = parseMoneyInput(pisoPrecioDraft);
      const pisoDireccion = [data.pisoCalle.trim(), data.pisoCiudad.trim()].filter(Boolean).join(", ");

      const payload = {
        ...data,
        presupuestoMax,
        pisoPrecioAlquiler,
        pisoDireccion,
        aficiones: aficionesWithErasmus,
        email,
      };

      const response = await fetch("/api/onboarding/complete", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const result = (await response.json()) as { error?: string };
        throw new Error(result.error ?? "No se pudo guardar tu perfil");
      }

      localStorage.removeItem(storageKey);
      router.replace("/explore");
      router.refresh();
    } catch (error) {
      setGlobalError(error instanceof Error ? error.message : "Error inesperado");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="min-h-screen bg-[#F5F1E9] px-4 py-6 text-slate-900 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-6xl rounded-2xl border border-black/10 bg-[#FFFDF9] p-5 shadow-[0_24px_70px_rgba(15,23,42,0.12),0_6px_20px_rgba(15,23,42,0.08)] sm:p-6 lg:p-8">
        <StepHeader
          logo={<BrandLogo className="h-20 w-auto max-w-full sm:h-24 [mix-blend-mode:multiply] drop-shadow-[0_10px_24px_rgba(37,99,235,0.16)]" />}
          stepLabel={stepLabel(step)}
          statusLabel="Guardado automático activado"
          progress={(step / 4) * 100}
        />

        <div className={`transition-all duration-200 ${animating ? "translate-x-1 opacity-40" : "translate-x-0 opacity-100"}`}>
          {step === 1 && (
            <section className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Identidad basica</h1>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">Nombre</label>
                  <input className={fieldClass(Boolean(errors.nombre))} value={data.nombre} onChange={(e) => setField("nombre", e.target.value)} placeholder="Tu nombre" />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Edad</label>
                  <input type="number" min={18} max={65} className={fieldClass(Boolean(errors.edad))} value={data.edad} onChange={(e) => setField("edad", e.target.value ? Number(e.target.value) : "")} />
                </div>
                <div>
                  <label className="mb-1 block text-sm font-semibold">Pais de origen</label>
                  <div ref={countryMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => {
                        setCountryMenuOpen((prev) => !prev);
                        setCountryQuery(data.pais || "");
                      }}
                      className={`${fieldClass(Boolean(errors.pais))} flex items-center justify-between text-left`}
                    >
                      <span className={`truncate text-sm ${data.pais ? "text-slate-800" : "text-slate-500"}`}>
                        {data.pais || "Selecciona tu pais"}
                      </span>
                      <span className="text-slate-500">▾</span>
                    </button>

                    {countryMenuOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                        <input
                          value={countryQuery}
                          onChange={(e) => setCountryQuery(e.target.value)}
                          placeholder="Buscar pais"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B6B]"
                        />

                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                          {filteredCountries.length ? (
                            filteredCountries.map((country) => (
                              <button
                                key={country}
                                type="button"
                                onClick={() => {
                                  setField("pais", country);
                                  setCountryMenuOpen(false);
                                }}
                                className={`w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                  data.pais === country ? "bg-[#FFF1F1] font-semibold text-[#d54848]" : "text-slate-700"
                                }`}
                              >
                                {country}
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No hay paises con esa busqueda.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">Ciudad donde buscas piso</label>
                  <div ref={cityMenuRef} className="relative">
                    <input
                      className={fieldClass(Boolean(errors.ciudad))}
                      value={data.ciudad}
                      onChange={(e) => {
                        setField("ciudad", e.target.value);
                        setCityMenuOpen(e.target.value.trim().length >= 2);
                      }}
                      onFocus={() => {
                        if (data.ciudad.trim().length >= 2) {
                          setCityMenuOpen(true);
                        }
                      }}
                      placeholder="Escribe ciudad o pueblo en Espana"
                    />

                    {cityMenuOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                        <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                          {isLoadingCities ? (
                            <p className="px-3 py-2 text-sm text-slate-500">Buscando ciudades y pueblos...</p>
                          ) : citySuggestions.length ? (
                            citySuggestions.map((suggestion) => (
                              <button
                                key={suggestion.id}
                                type="button"
                                onClick={() => {
                                  setField("ciudad", suggestion.city);
                                  setCityMenuOpen(false);
                                }}
                                className="w-full cursor-pointer px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                              >
                                <p className="font-semibold text-slate-800">{suggestion.city}</p>
                                <p className="truncate text-xs text-slate-500">{suggestion.label}</p>
                              </button>
                            ))
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No hay resultados. Prueba con otro nombre.</p>
                          )}
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">Idiomas que hablas</label>
                  <div ref={languageMenuRef} className="relative">
                    <button
                      type="button"
                      onClick={() => setLanguageMenuOpen((prev) => !prev)}
                      className={`${fieldClass(Boolean(errors.idiomas))} flex items-center justify-between text-left`}
                    >
                      <span className="truncate text-sm text-slate-700">
                        {data.idiomas.length ? `${data.idiomas.length} idioma(s) seleccionado(s)` : "Selecciona uno o varios idiomas"}
                      </span>
                      <span className="text-slate-500">▾</span>
                    </button>

                    {languageMenuOpen ? (
                      <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                        <input
                          value={languageQuery}
                          onChange={(e) => setLanguageQuery(e.target.value)}
                          placeholder="Buscar idioma"
                          className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#FF6B6B]"
                        />

                        <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                          {filteredLanguageOptions.length ? (
                            filteredLanguageOptions.map((item) => {
                              const active = data.idiomas.some(
                                (selected) => normalizeForSearch(selected) === normalizeForSearch(item.label),
                              );
                              return (
                                <label key={item.code} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleArrayItem("idiomas", formatLanguageLabel(item.label))}
                                    className="h-4 w-4 rounded border-slate-300 text-[#FF6B6B] focus:ring-[#FF6B6B]/20"
                                  />
                                  <span>{formatLanguageLabel(item.label)}</span>
                                </label>
                              );
                            })
                          ) : (
                            <p className="px-3 py-2 text-sm text-slate-500">No hay idiomas con esa busqueda.</p>
                          )}
                        </div>
                      </div>
                    ) : null}

                    {data.idiomas.length ? (
                      <div className="mt-2 flex flex-wrap gap-2">
                        {data.idiomas.map((lang) => (
                          <button
                            key={lang}
                            type="button"
                            onClick={() => toggleArrayItem("idiomas", lang)}
                            className="inline-flex items-center gap-1 rounded-full border border-[#FFD1D1] bg-[#FFF1F1] px-3 py-1 text-xs font-semibold text-[#d54848]"
                          >
                            {formatLanguageLabel(lang)}
                            <span aria-hidden="true">×</span>
                          </button>
                        ))}
                      </div>
                    ) : null}
                  </div>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">Foto de perfil</label>
                  <label className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-[#F8F8F8] p-4 text-center ${errors.fotoPerfilDataUrl ? "border-rose-400" : "border-slate-300"}`}>
                    <input type="file" accept="image/*" className="hidden" onChange={(e) => handleProfilePhoto(e.target.files?.[0])} />
                    {data.fotoPerfilDataUrl ? (
                      <img src={data.fotoPerfilDataUrl} alt="preview perfil" className="h-40 w-40 rounded-2xl object-cover" />
                    ) : (
                      <>
                        <p className="text-sm font-semibold">Arrastra una foto o toca para subirla</p>
                        <p className="mt-1 text-xs text-slate-500">Obligatoria</p>
                      </>
                    )}
                  </label>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">Estado civil (opcional)</label>
                  <div className="grid gap-2 sm:grid-cols-3">
                    {[
                      { id: "soltero", label: "Soltero/a" },
                      { id: "pareja", label: "En pareja" },
                      { id: "prefiero_no_decir", label: "Prefiero no decirlo" },
                    ].map((item) => (
                      <button key={item.id} type="button" className={cardClass(data.estadoCivil === item.id)} onClick={() => setField("estadoCivil", item.id as EstadoCivil)}>
                        {item.label}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </section>
          )}

          {step === 2 && (
            <section className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Situacion y busqueda</h1>
              <div className="space-y-3">
                <p className="text-sm font-semibold">Situacion</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "tengo_piso_libre", label: "Tengo piso libre", desc: "Publica tu piso y encuentra match" },
                    { id: "busco_habitacion", label: "Busco habitacion", desc: "Quiero entrar a un piso existente" },
                    { id: "buscar_juntos", label: "Buscar juntos", desc: "Busco companero para buscar piso" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.situacion === item.id, Boolean(errors.situacion))} onClick={() => setField("situacion", item.id as Situacion)}>
                      <p className="font-semibold">{item.label}</p>
                      <p className="mt-1 text-xs font-normal opacity-90">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Fecha aproximada de disponibilidad</label>
                <input type="date" className={fieldClass(false)} value={data.disponibleDesde} onChange={(e) => setField("disponibleDesde", e.target.value)} />
              </div>

              {data.situacion === "tengo_piso_libre" && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4">
                  <p className="text-sm font-semibold">Datos del piso en alquiler</p>

                  <div className="grid gap-3 sm:grid-cols-2">
                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Ciudad del piso</label>
                      <div ref={pisoCityMenuRef} className="relative">
                        <input
                          value={pisoCityQuery || data.pisoCiudad}
                          onChange={(e) => {
                            const value = e.target.value;
                            setPisoCityQuery(value);
                            setField("pisoCiudad", value);
                            setPisoCityMenuOpen(value.trim().length >= 2);
                            setField("pisoCalle", "");
                            setPisoStreetQuery("");
                          }}
                          onFocus={() => {
                            setPisoCityQuery(data.pisoCiudad || pisoCityQuery);
                            setPisoCityMenuOpen(true);
                          }}
                          placeholder="Escribe la ciudad"
                          className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-800 outline-none transition ${errors.pisoCiudad ? "border-rose-400" : "border-slate-200 focus:border-[#3B82F6]"}`}
                        />

                        {pisoCityMenuOpen ? (
                          <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                            {isLoadingPisoCities ? <p className="px-3 py-2 text-sm text-slate-500">Buscando ciudades...</p> : null}
                            <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                              {pisoCitySuggestions.length ? (
                                pisoCitySuggestions.map((suggestion) => (
                                  <button
                                    key={suggestion.id}
                                    type="button"
                                    onClick={() => {
                                      setField("pisoCiudad", suggestion.city);
                                      setPisoCityQuery(suggestion.city);
                                      setPisoCityMenuOpen(false);
                                      setField("pisoCalle", "");
                                      setPisoStreetQuery("");
                                    }}
                                    className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                  >
                                    {suggestion.label}
                                  </button>
                                ))
                              ) : !isLoadingPisoCities ? (
                                <p className="px-3 py-2 text-sm text-slate-500">Escribe al menos 2 letras.</p>
                              ) : null}
                            </div>
                          </div>
                        ) : null}
                      </div>
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Precio de alquiler EUR/mes</label>
                      <input
                        type="text"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        value={pisoPrecioDraft}
                        onChange={(e) => setPisoPrecioDraft(e.target.value.replace(/[^0-9]/g, ""))}
                        onBlur={() => setField("pisoPrecioAlquiler", parseMoneyInput(pisoPrecioDraft))}
                        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition ${errors.pisoPrecioAlquiler ? "border-rose-400" : "border-slate-200 focus:border-[#3B82F6]"}`}
                      />
                    </div>

                    <div>
                      <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Cuantos sois viviendo</label>
                      <input
                        type="number"
                        min={1}
                        max={20}
                        value={data.pisoCompaneros}
                        onChange={(e) => setField("pisoCompaneros", Math.min(20, Math.max(1, Number(e.target.value || 1))))}
                        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none transition ${errors.pisoCompaneros ? "border-rose-400" : "border-slate-200 focus:border-[#3B82F6]"}`}
                      />
                    </div>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Calle del piso</label>
                    <div ref={pisoStreetMenuRef} className="relative">
                      <input
                        value={pisoStreetQuery || data.pisoCalle}
                        onChange={(e) => {
                          const value = e.target.value;
                          setPisoStreetQuery(value);
                          setField("pisoCalle", value);
                          setPisoStreetMenuOpen(value.trim().length >= 1 && Boolean(data.pisoCiudad.trim()));
                        }}
                        onFocus={() => {
                          setPisoStreetQuery(data.pisoCalle || pisoStreetQuery);
                          setPisoStreetMenuOpen(Boolean(data.pisoCiudad.trim()));
                        }}
                        placeholder={data.pisoCiudad ? `Escribe una calle de ${data.pisoCiudad}` : "Primero elige la ciudad"}
                        disabled={!data.pisoCiudad.trim()}
                        className={`h-11 w-full rounded-xl border bg-white px-3 text-sm text-slate-800 outline-none transition disabled:cursor-not-allowed disabled:bg-slate-100 ${errors.pisoCalle ? "border-rose-400" : "border-slate-200 focus:border-[#3B82F6]"}`}
                      />

                      {pisoStreetMenuOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                          {isLoadingPisoStreets ? <p className="px-3 py-2 text-sm text-slate-500">Buscando calles en {data.pisoCiudad}...</p> : null}
                          <div className="max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                            {pisoStreetSuggestions.length ? (
                              pisoStreetSuggestions.map((suggestion) => (
                                <button
                                  key={suggestion.id}
                                  type="button"
                                  onClick={() => {
                                    setField("pisoCalle", suggestion.city);
                                    setPisoStreetQuery(suggestion.city);
                                    setPisoStreetMenuOpen(false);
                                  }}
                                  className="w-full px-3 py-2 text-left text-sm text-slate-700 hover:bg-slate-50"
                                >
                                  {suggestion.label}
                                </button>
                              ))
                            ) : !isLoadingPisoStreets && data.pisoCiudad ? (
                              <p className="px-3 py-2 text-sm text-slate-500">Escribe al menos una letra.</p>
                            ) : null}
                          </div>
                        </div>
                      ) : null}
                    </div>
                    {errors.pisoCalle ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.pisoCalle}</p> : null}
                  </div>

                  <label className="inline-flex cursor-pointer items-center gap-2 text-sm font-medium text-slate-700">
                    <input
                      type="checkbox"
                      checked={data.pisoGastosIncluidos}
                      onChange={(e) => setField("pisoGastosIncluidos", e.target.checked)}
                      className="h-4 w-4 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]/20"
                    />
                    Gastos incluidos en el precio
                  </label>

                  <div>
                    <label className="mb-2 block text-sm font-semibold">Fotos del piso</label>
                    <label
                      className={`flex min-h-48 cursor-pointer flex-col items-center justify-center rounded-3xl border-2 border-dashed bg-white p-4 text-center transition ${
                        errors.pisoFotosDataUrls ? "border-rose-400" : "border-slate-300 hover:border-[#3B82F6]"
                      }`}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={(e) => {
                        e.preventDefault();
                        void handlePisoFiles(e.dataTransfer.files);
                      }}
                    >
                      <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => void handlePisoFiles(e.target.files)} />
                      {data.pisoFotosDataUrls.length ? (
                        <div className="w-full space-y-3 text-left">
                          <div className="flex items-center justify-between gap-3">
                            <div>
                              <p className="text-sm font-semibold text-slate-800">Fotos cargadas</p>
                              <p className="text-xs text-slate-500">{data.pisoFotosDataUrls.length}/{MAX_PISO_PHOTOS} seleccionadas</p>
                            </div>
                            {isPisoFotosUploading ? <p className="text-xs font-semibold text-[#1D4ED8]">Cargando...</p> : null}
                          </div>
                          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                            {data.pisoFotosDataUrls.map((url, index) => (
                              <div key={url} className="relative overflow-hidden rounded-2xl border border-slate-200 bg-slate-50">
                                <img src={url} alt={`piso-${index + 1}`} className="h-28 w-full object-cover" />
                                <button
                                  type="button"
                                  onClick={(event) => {
                                    event.preventDefault();
                                    event.stopPropagation();
                                    setField("pisoFotosDataUrls", data.pisoFotosDataUrls.filter((_, i) => i !== index));
                                  }}
                                  className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs text-white"
                                >
                                  x
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      ) : (
                        <>
                          <p className="text-sm font-semibold">Arrastra o selecciona imágenes</p>
                          <p className="mt-1 text-xs text-slate-500">Se irán mostrando al cargarse</p>
                        </>
                      )}
                    </label>
                    {errors.pisoFotosDataUrls ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.pisoFotosDataUrls}</p> : null}
                  </div>

                  <textarea
                    className={`min-h-24 w-full rounded-2xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4 ${errors.pisoDescripcion ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/12"}`}
                    placeholder="Describe ambiente del piso y normas"
                    value={data.pisoDescripcion}
                    onChange={(e) => setField("pisoDescripcion", e.target.value)}
                  />
                </div>
              )}

              <div className="space-y-3">
                <p className="text-sm font-semibold">Estudia o trabaja</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "estudiante", label: "Estudiante" },
                    { id: "trabajador", label: "Trabajador" },
                    { id: "ambas", label: "Ambas" },
                  ].map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      className={cardClass(data.estudiaOTrabaja === item.id, Boolean(errors.estudiaOTrabaja))}
                      onClick={() => {
                        const next = item.id as EstudioTrabajo;
                        setField("estudiaOTrabaja", next);
                        if (next === "trabajador") {
                          setField("esErasmus", false);
                        }
                      }}
                    >
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {(data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") && (
                <div className="space-y-3">
                  <p className="text-sm font-semibold">Estas de Erasmus</p>
                  <button
                    type="button"
                    onClick={() => setField("esErasmus", !data.esErasmus)}
                    className={`flex w-full items-center justify-between rounded-2xl border px-4 py-3 text-left transition ${
                      data.esErasmus
                        ? "border-[#3B82F6] bg-[#EFF6FF]"
                        : "border-slate-200 bg-white hover:border-[#93C5FD]"
                    }`}
                  >
                    <span className="text-sm font-semibold text-slate-800">Estoy de Erasmus</span>
                    <span
                      className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                        data.esErasmus ? "bg-[#3B82F6]" : "bg-slate-300"
                      }`}
                    >
                      <span
                        className={`inline-block h-5 w-5 transform rounded-full bg-white transition ${
                          data.esErasmus ? "translate-x-5" : "translate-x-1"
                        }`}
                      />
                    </span>
                  </button>
                </div>
              )}

              {(data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Carrera</label>
                    <input className={fieldClass(Boolean(errors.carrera))} value={data.carrera} onChange={(e) => setField("carrera", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Universidad</label>
                    <div ref={universityMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setUniversityMenuOpen((prev) => !prev);
                          setUniversityQuery(data.universidad || "");
                        }}
                        className={`${fieldClass(Boolean(errors.universidad))} flex items-center justify-between text-left`}
                      >
                        <span className={`truncate text-sm ${data.universidad ? "text-slate-800" : "text-slate-500"}`}>
                          {data.universidad || "Selecciona universidad"}
                        </span>
                        <span className="text-slate-500">▾</span>
                      </button>

                      {universityMenuOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                          <input
                            value={universityQuery}
                            onChange={(e) => setUniversityQuery(e.target.value)}
                            placeholder="Buscar universidad"
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3B82F6]"
                          />

                          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                            {filteredUniversityOptions.length ? (
                              filteredUniversityOptions.map((uni) => (
                                <button
                                  key={uni}
                                  type="button"
                                  onClick={() => {
                                    setField("universidad", uni);
                                    setUniversityMenuOpen(false);
                                  }}
                                  className={`w-full cursor-pointer px-3 py-2 text-left text-sm hover:bg-slate-50 ${
                                    data.universidad === uni ? "bg-[#EFF6FF] font-semibold text-[#1D4ED8]" : "text-slate-700"
                                  }`}
                                >
                                  {uni}
                                </button>
                              ))
                            ) : (
                              <p className="px-3 py-2 text-sm text-slate-500">No hay universidades con esa busqueda.</p>
                            )}
                          </div>
                        </div>
                      ) : null}
                    </div>
                  </div>
                </div>
              )}

              {(data.estudiaOTrabaja === "trabajador" || data.estudiaOTrabaja === "ambas") && (
                <div>
                  <label className="mb-1 block text-sm font-semibold">Sector o profesion</label>
                  <input className={fieldClass(Boolean(errors.trabajo))} value={data.trabajo} onChange={(e) => setField("trabajo", e.target.value)} />
                </div>
              )}

              {(data.situacion === "busco_habitacion" || data.situacion === "buscar_juntos") && (
                <>
                  <div className="rounded-2xl bg-[#EEF5FF] p-4">
                    <p className="text-sm font-semibold text-slate-700">Presupuesto maximo</p>
                    <p className="mt-1 text-3xl font-semibold text-[#1D4ED8]">{parseMoneyInput(budgetDraft)} EUR</p>
                    <div className="mt-3 grid gap-3 sm:grid-cols-[180px_1fr] sm:items-center">
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Manual</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          pattern="[0-9]*"
                          value={budgetDraft}
                          onChange={(e) => setBudgetDraft(e.target.value.replace(/[^0-9]/g, ""))}
                          onBlur={() => setField("presupuestoMax", parseMoneyInput(budgetDraft))}
                          className={`h-11 w-full rounded-xl border bg-white px-3 text-sm font-semibold text-slate-800 outline-none focus:border-[#3B82F6] ${errors.presupuestoMax ? "border-rose-400" : "border-slate-200"}`}
                        />
                      </div>
                      <div>
                        <label className="mb-1 block text-xs font-semibold uppercase tracking-[0.06em] text-slate-500">Deslizador</label>
                        <input
                          type="range"
                          min={200}
                          max={5000}
                          step={50}
                          value={parseMoneyInput(budgetDraft)}
                          onChange={(e) => {
                            const nextBudget = clampBudget(Number(e.target.value));
                            setField("presupuestoMax", nextBudget);
                            setBudgetDraft(String(nextBudget));
                          }}
                          className="w-full accent-[#3B82F6]"
                        />
                      </div>
                    </div>
                    {errors.presupuestoMax ? <p className="mt-2 text-xs font-medium text-rose-600">{errors.presupuestoMax}</p> : null}
                  </div>

                  <div>
                    <p className="mb-2 text-sm font-semibold">Zonas preferidas</p>
                    {isLoadingZones ? <p className="mb-2 text-xs text-slate-500">Cargando barrios sugeridos...</p> : null}
                    <div ref={zonesMenuRef} className="relative">
                      <button
                        type="button"
                        onClick={() => {
                          setZonesMenuOpen((prev) => !prev);
                          setZonesQuery("");
                        }}
                        className={`${fieldClass(Boolean(errors.zonas))} flex items-center justify-between text-left`}
                      >
                        <span className="truncate text-sm text-slate-700">
                          {data.zonas.length ? `${data.zonas.length} zona(s) seleccionada(s)` : "Selecciona zonas preferidas"}
                        </span>
                        <span className="text-slate-500">▾</span>
                      </button>

                      {zonesMenuOpen ? (
                        <div className="absolute z-20 mt-2 w-full rounded-2xl border border-slate-200 bg-white p-2 shadow-[0_16px_36px_rgba(15,23,42,0.16)]">
                          <input
                            value={zonesQuery}
                            onChange={(e) => setZonesQuery(e.target.value)}
                            placeholder="Buscar barrio o zona"
                            className="h-10 w-full rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#3B82F6]"
                          />

                          <div className="mt-2 max-h-56 overflow-y-auto rounded-xl border border-slate-100 bg-white">
                            {(filteredZones.length ? filteredZones : ["Centro", "Norte", "Sur", "Este", "Oeste"]).map((zone) => {
                              const active = data.zonas.includes(zone);
                              return (
                                <label key={zone} className="flex cursor-pointer items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50">
                                  <input
                                    type="checkbox"
                                    checked={active}
                                    onChange={() => toggleArrayItem("zonas", zone)}
                                    className="h-4 w-4 rounded border-slate-300 text-[#3B82F6] focus:ring-[#3B82F6]/20"
                                  />
                                  <span>{zone}</span>
                                </label>
                              );
                            })}
                          </div>
                        </div>
                      ) : null}

                      {data.zonas.length ? (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {data.zonas.map((zone) => (
                            <button
                              key={zone}
                              type="button"
                              onClick={() => toggleArrayItem("zonas", zone)}
                              className="inline-flex items-center gap-1 rounded-full border border-[#BFDBFE] bg-[#EFF6FF] px-3 py-1 text-xs font-semibold text-[#1D4ED8]"
                            >
                              {zone}
                              <span aria-hidden="true">×</span>
                            </button>
                          ))}
                        </div>
                      ) : null}
                    </div>
                  </div>
                </>
              )}
            </section>
          )}

          {step === 3 && (
            <section className="space-y-6">
              <div className="space-y-2">
                <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Forma de vivir</h1>
                <p className="text-sm text-slate-500">Selecciona las opciones que mejor describen tu estilo de vida y convivencia.</p>
              </div>

              <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
                <SectionCard>
                  <SelectField
                    label="Fumas"
                    value={data.fumar}
                    placeholder="Selecciona una opción"
                    options={[
                      { value: "no_fumo", label: "No fumo" },
                      { value: "solo_fuera", label: "Solo fuera de casa" },
                      { value: "si_fumo", label: "Si fumo" },
                    ]}
                    onChange={(value) => setField("fumar", value as Fumar)}
                    error={Boolean(errors.fumar)}
                  />
                </SectionCard>

                <SectionCard>
                  <ToggleGroup
                    label="Mascotas"
                    value={data.mascotas}
                    onChange={(value) => setField("mascotas", value as Mascotas)}
                    options={[
                      { id: "tengo_mascota", label: "Tengo mascota" },
                      { id: "acepto_mascotas", label: "Acepto mascotas" },
                      { id: "no_acepto", label: "No acepto mascotas" },
                    ]}
                  />
                </SectionCard>

                <SectionCard>
                  <RadioGroup
                    label="Horario general"
                    value={data.horario}
                    onChange={(value) => setField("horario", value as Horario)}
                    options={[
                      { id: "madrugador", label: "Madrugador", description: "Antes de las 8" },
                      { id: "normal", label: "Normal", description: "Horario estandar" },
                      { id: "nocturno", label: "Nocturno", description: "Despues de la 1" },
                    ]}
                  />
                  <div className="mt-4">
                    <label className="mb-1 block text-sm font-semibold text-slate-800">Tu horario (opcional)</label>
                    <input
                      value={data.horarioPersonal}
                      onChange={(event) => setField("horarioPersonal", event.target.value)}
                      placeholder="Ej: Trabajo de 9 a 17 y entreno por la tarde"
                      className="h-11 w-full rounded-lg border border-gray-200 bg-white px-3 text-sm text-slate-800 outline-none transition focus:border-blue-300 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </SectionCard>

                <SectionCard className="space-y-5">
                  <ToggleGroup
                    label="Ambiente en casa"
                    value={data.ambiente}
                    onChange={(value) => setField("ambiente", value as Ambiente)}
                    options={[
                      { id: "tranquilo", label: "Tranquilo", description: "Silencio y calma" },
                      { id: "equilibrado", label: "Equilibrado", description: "Mezcla de los dos" },
                      { id: "social", label: "Social y animado", description: "Me gusta tener gente" },
                    ]}
                  />

                  <SelectField
                    label="Deportes"
                    value={data.deporte}
                    placeholder="Selecciona tu frecuencia"
                    options={[
                      { value: "poco", label: "Poco o nada" },
                      { value: "algunas", label: "Algunas veces" },
                      { value: "frecuente", label: "Frecuentemente" },
                    ]}
                    onChange={(value) => setField("deporte", value as Deporte)}
                  />

                  <ChipList
                    label="Aficiones e intereses (opcional)"
                    items={HOBBIES}
                    selectedIds={data.aficiones}
                    onToggle={(id) => toggleArrayItem("aficiones", id)}
                    onAddCustom={(value) => {
                      const normalized = value.trim();
                      if (!normalized) return;
                      if (data.aficiones.some((item) => item.toLowerCase() === normalized.toLowerCase())) return;
                      setField("aficiones", [...data.aficiones, normalized]);
                    }}
                  />
                </SectionCard>
              </div>
            </section>
          )}

          {step === 4 && (
            <section className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Carta de presentacion</h1>
              <div>
                <label className="mb-1 block text-sm font-semibold">Presentacion personal</label>
                <textarea
                  className={`min-h-36 w-full rounded-2xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4 ${errors.bio ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/12"}`}
                  value={data.bio}
                  maxLength={300}
                  onChange={(e) => setField("bio", e.target.value)}
                  placeholder="Soy estudiante de diseno, madrugador y bastante ordenado. Busco un ambiente tranquilo donde poder estudiar y descansar bien."
                />
                <p className="mt-1 text-right text-xs text-slate-500">{data.bio.length}/300</p>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm font-semibold">Verificacion de telefono (opcional)</p>
                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input className={fieldClass(Boolean(errors.telefono))} placeholder="+34 600 000 000" value={data.telefono} onChange={(e) => setField("telefono", e.target.value)} />
                  <button type="button" onClick={sendSmsCode} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold hover:border-[#FF6B6B] hover:text-[#FF6B6B]">
                    Enviar SMS
                  </button>
                </div>

                <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_auto]">
                  <input className={fieldClass(false)} placeholder="Codigo" value={data.telefonoCodigoInput} onChange={(e) => setField("telefonoCodigoInput", e.target.value)} />
                  <button type="button" onClick={verifyCode} className="min-h-12 rounded-2xl border border-slate-200 px-4 text-sm font-semibold hover:border-[#FF6B6B] hover:text-[#FF6B6B]">
                    Verificar
                  </button>
                </div>

                {smsFeedback ? <p className="mt-2 text-xs text-slate-600">{smsFeedback}</p> : null}
                {data.telefonoVerificado ? (
                  <p className="mt-2 inline-flex rounded-full bg-emerald-100 px-3 py-1 text-xs font-semibold text-emerald-700">Telefono verificado</p>
                ) : null}
              </div>
            </section>
          )}
        </div>

        {globalError ? (
          <div className="mt-5 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm font-medium text-rose-700">
            {globalError}
          </div>
        ) : null}

        <FooterActions
          backLabel="Volver"
          continueLabel={step === 4 ? (isSaving ? "Guardando perfil..." : "Completar perfil y empezar a explorar") : "Continuar"}
          onBack={goBack}
          onContinue={goNext}
          disableBack={step === 1 || isSaving}
          disableContinue={isSaving}
        />
      </div>
    </main>
  );
}

const MAX_PISO_PHOTOS = 20;