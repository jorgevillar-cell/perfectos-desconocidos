"use client";

import { useCallback, useEffect, useRef, useState } from "react";

// ─── Constants ────────────────────────────────────────────────────────────────

const MAPBOX_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_TOKEN ?? "";

const COUNTRIES = [
  "Afganistan","Albania","Alemania","Andorra","Angola","Antigua y Barbuda","Arabia Saudi","Argelia","Argentina","Armenia","Australia","Austria","Azerbaiyan","Bahamas","Bangladesh","Barbados","Barein","Belgica","Belice","Benin","Bielorrusia","Birmania","Bolivia","Bosnia y Herzegovina","Botsuana","Brasil","Brunei","Bulgaria","Burkina Faso","Burundi","Butan","Cabo Verde","Camboya","Camerun","Canada","Catar","Chad","Chile","China","Chipre","Colombia","Comoras","Corea del Norte","Corea del Sur","Costa de Marfil","Costa Rica","Croacia","Cuba","Dinamarca","Dominica","Ecuador","Egipto","El Salvador","Emiratos Arabes Unidos","Eritrea","Eslovaquia","Eslovenia","Espana","Estados Unidos","Estonia","Etiopia","Filipinas","Finlandia","Fiyi","Francia","Gabon","Gambia","Georgia","Ghana","Granada","Grecia","Guatemala","Guinea","Guinea Ecuatorial","Guinea-Bisau","Guyana","Haiti","Honduras","Hungria","India","Indonesia","Irak","Iran","Irlanda","Islandia","Israel","Italia","Jamaica","Japon","Jordania","Kazajistan","Kenia","Kirguistan","Kiribati","Kuwait","Laos","Lesoto","Letonia","Libano","Liberia","Libia","Liechtenstein","Lituania","Luxemburgo","Macedonia del Norte","Madagascar","Malasia","Malaui","Maldivas","Mali","Malta","Marruecos","Mauricio","Mauritania","Mexico","Micronesia","Moldavia","Monaco","Mongolia","Montenegro","Mozambique","Namibia","Nauru","Nepal","Nicaragua","Niger","Nigeria","Noruega","Nueva Zelanda","Oman","Paises Bajos","Pakistan","Palaos","Panama","Papua Nueva Guinea","Paraguay","Peru","Polonia","Portugal","Reino Unido","Republica Centroafricana","Republica Checa","Republica Democratica del Congo","Republica del Congo","Republica Dominicana","Ruanda","Rumania","Rusia","Samoa","San Cristobal y Nieves","San Marino","San Vicente y las Granadinas","Santa Lucia","Santo Tome y Principe","Senegal","Serbia","Seychelles","Sierra Leona","Singapur","Siria","Somalia","Sri Lanka","Suazilandia","Sudafrica","Sudan","Sudan del Sur","Suecia","Suiza","Surinam","Tailandia","Tanzania","Tayikistan","Timor Oriental","Togo","Tonga","Trinidad y Tobago","Tunez","Turkmenistan","Turquia","Tuvalu","Ucrania","Uganda","Uruguay","Uzbekistan","Vanuatu","Vaticano","Venezuela","Vietnam","Yemen","Yibuti","Zambia","Zimbabue",
];

const HOBBIES = [
  { id: "musica", label: "Música" },
  { id: "cine", label: "Cine" },
  { id: "cocina", label: "Cocina" },
  { id: "viajes", label: "Viajes" },
  { id: "gaming", label: "Gaming" },
  { id: "lectura", label: "Lectura" },
  { id: "deporte", label: "Deporte" },
  { id: "fotografia", label: "Fotografía" },
  { id: "arte", label: "Arte" },
  { id: "tecnologia", label: "Tecnología" },
  { id: "moda", label: "Moda" },
  { id: "naturaleza", label: "Naturaleza" },
];

const ISO_639_1 = [
  "af","ak","am","ar","as","az","be","bg","bm","bn","bo","br","bs","ca","cs","cy",
  "da","de","dz","ee","el","en","eo","es","et","eu","fa","ff","fi","fj","fo","fr",
  "fy","ga","gd","gl","gu","gv","ha","he","hi","hr","ht","hu","hy","id","ig","is",
  "it","iu","ja","jv","ka","ki","kk","kl","km","kn","ko","ks","ku","kw","ky","la",
  "lb","lg","ln","lo","lt","lu","lv","mg","mi","mk","ml","mn","mr","ms","mt","my",
  "nb","nd","ne","nl","nn","no","ny","oc","oj","or","os","pa","pl","ps","pt","qu",
  "rm","rn","ro","ru","rw","se","sg","si","sk","sl","sm","sn","so","sq","sr","ss",
  "st","su","sv","sw","ta","te","tg","th","ti","tk","tl","tn","to","tr","ts","tt",
  "tw","ug","uk","ur","uz","ve","vi","vo","wa","wo","xh","yi","yo","za","zh","zu",
];

function buildLanguageList(): Array<{ code: string; name: string }> {
  try {
    const dn = new Intl.DisplayNames(["es"], { type: "language" });
    return ISO_639_1.map((code) => {
      try {
        const name = dn.of(code);
        return name && name !== code ? { code, name } : null;
      } catch {
        return null;
      }
    })
      .filter(Boolean)
      .sort((a, b) => a!.name.localeCompare(b!.name, "es")) as Array<{ code: string; name: string }>;
  } catch {
    return [
      { code: "es", name: "Español" },
      { code: "en", name: "Inglés" },
      { code: "fr", name: "Francés" },
      { code: "de", name: "Alemán" },
      { code: "it", name: "Italiano" },
      { code: "pt", name: "Portugués" },
      { code: "zh", name: "Chino" },
      { code: "ar", name: "Árabe" },
    ];
  }
}

// ─── Types ────────────────────────────────────────────────────────────────────

type ProfileData = {
  user: {
    id: string;
    nombre: string;
    edad: number;
    pais: string;
    ciudad: string;
    idiomas: string[];
    estadoCivil: string;
    fotoUrl: string | null;
    bio: string | null;
    tipoUsuario: string;
  };
  perfil: {
    situacion: string;
    estudiaOTrabaja: string;
    carrera: string | null;
    universidad: string | null;
    trabajo: string | null;
    presupuesto: number;
    zonas: string[];
    fumar: boolean;
    mascotas: boolean;
    horario: string;
    ambiente: string;
    deporte: string;
    aficiones: string[];
  } | null;
  piso: {
    id: string;
    precio: number;
    zona: string;
    direccion: string | null;
    descripcion: string;
    disponibleDesde: string;
    gastosIncluidos: boolean;
  } | null;
};

type FormState = {
  nombre: string;
  edad: string;
  pais: string;
  ciudad: string;
  idiomas: string[];
  estadoCivil: string;
  bio: string;
  fotoUrl: string | null;
  fotoDataUrl: string | null;
  situacion: string;
  estudiaOTrabaja: string;
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuesto: string;
  zonas: string[];
  fumar: string;
  mascotas: string;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  customAficion: string;
  pisoPrecio: string;
  pisoCalle: string;
  pisoDescripcion: string;
  pisoGastosIncluidos: boolean;
  pisoDisponibleDesde: string;
};

const EMPTY_FORM: FormState = {
  nombre: "",
  edad: "",
  pais: "",
  ciudad: "",
  idiomas: [],
  estadoCivil: "prefiero_no_decir",
  bio: "",
  fotoUrl: null,
  fotoDataUrl: null,
  situacion: "busco_habitacion",
  estudiaOTrabaja: "estudiante",
  carrera: "",
  universidad: "",
  trabajo: "",
  presupuesto: "600",
  zonas: [],
  fumar: "no_fumo",
  mascotas: "acepto_mascotas",
  horario: "normal",
  ambiente: "equilibrado",
  deporte: "algunas",
  aficiones: [],
  customAficion: "",
  pisoPrecio: "",
  pisoCalle: "",
  pisoDescripcion: "",
  pisoGastosIncluidos: false,
  pisoDisponibleDesde: "",
};

// ─── Mapbox Autocomplete Hook ─────────────────────────────────────────────────

function useMapboxSearch(types: string) {
  const [query, setQuery] = useState("");
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const activeRef = useRef(true);

  useEffect(() => {
    activeRef.current = true;
    return () => { activeRef.current = false; };
  }, []);

  const search = useCallback(
    (value: string, proximity?: string) => {
      setQuery(value);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      if (value.length < 2) {
        setSuggestions([]);
        return;
      }
      debounceRef.current = setTimeout(async () => {
        if (!MAPBOX_TOKEN) return;
        setLoading(true);
        try {
          const proximityParam = proximity ? `&proximity=${encodeURIComponent(proximity)}` : "";
          const url = `https://api.mapbox.com/geocoding/v5/mapbox.places/${encodeURIComponent(value)}.json?types=${types}&language=es&limit=6&access_token=${MAPBOX_TOKEN}${proximityParam}`;
          const res = await fetch(url);
          const data = (await res.json()) as { features?: Array<{ place_name: string }> };
          if (activeRef.current) {
            const seen = new Set<string>();
            const deduped = (data.features ?? [])
              .map((f) => f.place_name)
              .filter((n) => { const k = n.toLowerCase(); if (seen.has(k)) return false; seen.add(k); return true; });
            setSuggestions(deduped);
          }
        } catch {
          if (activeRef.current) setSuggestions([]);
        } finally {
          if (activeRef.current) setLoading(false);
        }
      }, 300);
    },
    [types],
  );

  const clear = useCallback(() => {
    setSuggestions([]);
    setQuery("");
  }, []);

  return { query, setQuery, suggestions, loading, search, clear };
}

// ─── Small UI components ──────────────────────────────────────────────────────

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <div className="mb-4 flex items-center gap-3">
      <span className="text-[13px] font-bold uppercase tracking-[0.10em] text-[#FF6B6B]">{children}</span>
      <div className="h-px flex-1 bg-[#F0F0F0]" />
    </div>
  );
}

function Label({ children }: { children: React.ReactNode }) {
  return <label className="mb-1.5 block text-[13px] font-semibold text-[#374151]">{children}</label>;
}

function Input({
  value,
  onChange,
  placeholder,
  type = "text",
  min,
  max,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  type?: string;
  min?: number;
  max?: number;
}) {
  return (
    <input
      type={type}
      value={value}
      min={min}
      max={max}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
    />
  );
}

function Textarea({
  value,
  onChange,
  placeholder,
  maxLength,
  rows = 3,
}: {
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  maxLength?: number;
  rows?: number;
}) {
  return (
    <textarea
      value={value}
      onChange={(e) => onChange(e.target.value)}
      placeholder={placeholder}
      maxLength={maxLength}
      rows={rows}
      className="w-full resize-none rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
    />
  );
}

function Select({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}

function RadioGroup({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: Array<{ value: string; label: string }>;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          className={`rounded-xl border px-3 py-2 text-[13px] font-semibold transition ${
            value === o.value
              ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
              : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF6B6B]/40"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}

// Autocomplete input with dropdown
function AutocompleteInput({
  value,
  onInput,
  onSelect,
  suggestions,
  loading,
  placeholder,
}: {
  value: string;
  onInput: (v: string) => void;
  onSelect: (v: string) => void;
  suggestions: string[];
  loading: boolean;
  placeholder?: string;
}) {
  const [open, setOpen] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    setOpen(suggestions.length > 0);
  }, [suggestions]);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false);
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  return (
    <div ref={wrapRef} className="relative">
      <div className="relative">
        <input
          type="text"
          value={value}
          onChange={(e) => onInput(e.target.value)}
          onFocus={() => { if (suggestions.length > 0) setOpen(true); }}
          placeholder={placeholder}
          className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 pr-8 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
        />
        {loading ? (
          <span className="absolute right-3 top-1/2 -translate-y-1/2">
            <svg className="h-4 w-4 animate-spin text-[#FF6B6B]" viewBox="0 0 24 24" fill="none">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
            </svg>
          </span>
        ) : null}
      </div>
      {open ? (
        <ul className="absolute left-0 right-0 top-full z-50 mt-1 max-h-48 overflow-auto rounded-xl border border-[#E5E7EB] bg-white shadow-lg">
          {suggestions.map((s) => (
            <li key={s}>
              <button
                type="button"
                onMouseDown={(e) => { e.preventDefault(); onSelect(s); setOpen(false); }}
                className="w-full px-3 py-2.5 text-left text-[13px] text-[#1A1A1A] hover:bg-[#FFF5F5] hover:text-[#FF6B6B]"
              >
                {s}
              </button>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export function OnboardingEditPanel({ currentUserId }: { currentUserId: string }) {
  const [form, setForm] = useState<FormState>(EMPTY_FORM);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [langSearch, setLangSearch] = useState("");
  const [countrySearch, setCountrySearch] = useState("");
  const [zoneInput, setZoneInput] = useState("");

  const allLanguages = buildLanguageList();

  const citySearch = useMapboxSearch("place,locality");
  const streetSearch = useMapboxSearch("address,place,locality");
  const zoneSearch = useMapboxSearch("neighborhood,district,locality,place");

  const set = useCallback(<K extends keyof FormState>(key: K, value: FormState[K]) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  }, []);

  // Load profile data
  useEffect(() => {
    setLoading(true);
    fetch("/api/profile/me?full=true")
      .then((r) => r.json())
      .then((data: { authenticated: boolean; user?: ProfileData["user"]; perfil?: ProfileData["perfil"]; piso?: ProfileData["piso"] }) => {
        if (!data.authenticated || !data.user) return;
        const u = data.user;
        const p = data.perfil;
        const piso = data.piso;

        setForm({
          nombre: u.nombre ?? "",
          edad: String(u.edad ?? ""),
          pais: u.pais ?? "",
          ciudad: u.ciudad ?? "",
          idiomas: u.idiomas ?? [],
          estadoCivil: u.estadoCivil ?? "prefiero_no_decir",
          bio: u.bio ?? "",
          fotoUrl: u.fotoUrl ?? null,
          fotoDataUrl: null,
          situacion: p?.situacion ?? "busco_habitacion",
          estudiaOTrabaja: p?.estudiaOTrabaja ?? "trabajador",
          carrera: p?.carrera ?? "",
          universidad: p?.universidad ?? "",
          trabajo: p?.trabajo ?? "",
          presupuesto: String(p?.presupuesto ?? 600),
          zonas: p?.zonas ?? [],
          fumar: p?.fumar ? "si_fumo" : "no_fumo",
          mascotas: p?.mascotas ? "acepto_mascotas" : "no_acepto",
          horario: p?.horario ?? "normal",
          ambiente: p?.ambiente ?? "equilibrado",
          deporte: p?.deporte ?? "algunas",
          aficiones: p?.aficiones ?? [],
          customAficion: "",
          pisoPrecio: piso ? String(piso.precio) : "",
          pisoCalle: piso?.direccion ?? "",
          pisoDescripcion: piso?.descripcion?.replace(/^\[PD_META_COMPANEROS:\d+\]\n/, "") ?? "",
          pisoGastosIncluidos: piso?.gastosIncluidos ?? false,
          pisoDisponibleDesde: piso?.disponibleDesde?.slice(0, 10) ?? "",
        });

        citySearch.setQuery(u.ciudad ?? "");
        if (piso?.direccion) streetSearch.setQuery(piso.direccion);
      })
      .catch(() => setError("Error al cargar el perfil"))
      .finally(() => setLoading(false));
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentUserId]);

  async function handleSave() {
    setSaving(true);
    setError("");
    setSuccess(false);
    try {
      const body: Record<string, unknown> = {
        nombre: form.nombre,
        edad: Number(form.edad),
        pais: form.pais,
        ciudad: form.ciudad,
        idiomas: form.idiomas,
        estadoCivil: form.estadoCivil,
        bio: form.bio,
        situacion: form.situacion,
        estudiaOTrabaja: form.estudiaOTrabaja,
        carrera: form.carrera,
        universidad: form.universidad,
        trabajo: form.trabajo,
        presupuesto: Number(form.presupuesto),
        zonas: form.zonas,
        fumar: form.fumar,
        mascotas: form.mascotas,
        horario: form.horario,
        ambiente: form.ambiente,
        deporte: form.deporte,
        aficiones: form.aficiones,
      };

      if (form.fotoDataUrl) body.fotoPerfilDataUrl = form.fotoDataUrl;

      if (form.situacion === "tengo_piso_libre") {
        body.pisoPrecio = Number(form.pisoPrecio);
        body.pisoCalle = form.pisoCalle;
        body.pisoDescripcion = form.pisoDescripcion;
        body.pisoGastosIncluidos = form.pisoGastosIncluidos;
        body.pisoDisponibleDesde = form.pisoDisponibleDesde;
      }

      const res = await fetch("/api/profile/me", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = (await res.json()) as { ok?: boolean; error?: string };
      if (!res.ok || !result.ok) throw new Error(result.error ?? "Error al guardar");
      setSuccess(true);
      setTimeout(() => setSuccess(false), 3000);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error al guardar");
    } finally {
      setSaving(false);
    }
  }

  function handlePhotoChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      const dataUrl = ev.target?.result as string;
      set("fotoDataUrl", dataUrl);
      set("fotoUrl", dataUrl);
    };
    reader.readAsDataURL(file);
  }

  function toggleIdioma(code: string) {
    set("idiomas", form.idiomas.includes(code)
      ? form.idiomas.filter((i) => i !== code)
      : [...form.idiomas, code],
    );
  }

  function toggleAficion(id: string) {
    set("aficiones", form.aficiones.includes(id)
      ? form.aficiones.filter((a) => a !== id)
      : [...form.aficiones, id],
    );
  }

  function addCustomAficion() {
    const val = form.customAficion.trim();
    if (!val || form.aficiones.includes(val)) return;
    set("aficiones", [...form.aficiones, val]);
    set("customAficion", "");
  }

  function removeZona(z: string) {
    set("zonas", form.zonas.filter((x) => x !== z));
  }

  function addZona(z: string) {
    if (!z.trim() || form.zonas.includes(z)) return;
    set("zonas", [...form.zonas, z]);
    setZoneInput("");
    zoneSearch.clear();
  }

  const filteredLangs = allLanguages.filter((l) =>
    !langSearch || l.name.toLowerCase().includes(langSearch.toLowerCase()),
  );

  const filteredCountries = (countrySearch
    ? COUNTRIES.filter((c) => c.toLowerCase().includes(countrySearch.toLowerCase()))
    : COUNTRIES
  ).sort((a, b) => a.localeCompare(b, "es"));

  if (loading) {
    return (
      <div className="flex h-full items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <svg className="h-8 w-8 animate-spin text-[#FF6B6B]" viewBox="0 0 24 24" fill="none">
            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v4a4 4 0 00-4 4H4z" />
          </svg>
          <p className="text-[14px] text-[#6B7280]">Cargando tu perfil...</p>
        </div>
      </div>
    );
  }

  const isPropietario = form.situacion === "tengo_piso_libre";
  const isBuscador = !isPropietario;
  const needsStudy = form.estudiaOTrabaja === "estudiante" || form.estudiaOTrabaja === "ambas";
  const needsWork = form.estudiaOTrabaja === "trabajador" || form.estudiaOTrabaja === "ambas";

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Scrollable content */}
      <div className="flex-1 overflow-y-auto px-6 py-5">
        <div className="mx-auto max-w-2xl space-y-8">

          {/* ── FOTO Y DATOS BÁSICOS ───────────────── */}
          <section>
            <SectionTitle>Foto y datos básicos</SectionTitle>

            {/* Avatar */}
            <div className="mb-5 flex items-center gap-4">
              <div className="relative shrink-0">
                <div className="h-20 w-20 overflow-hidden rounded-full border-2 border-[#E5E7EB] bg-[#FFF5F5]">
                  {form.fotoUrl ? (
                    <img src={form.fotoUrl} alt="Avatar" className="h-full w-full object-cover" />
                  ) : (
                    <span className="flex h-full w-full items-center justify-center text-2xl font-bold text-[#FF6B6B]">
                      {form.nombre?.charAt(0)?.toUpperCase() || "?"}
                    </span>
                  )}
                </div>
                <label className="absolute -bottom-1 -right-1 flex h-7 w-7 cursor-pointer items-center justify-center rounded-full border border-white bg-[#FF6B6B] shadow-sm transition hover:bg-[#e55a5a]">
                  <svg viewBox="0 0 24 24" className="h-3.5 w-3.5 text-white" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                    <circle cx="12" cy="13" r="4" />
                  </svg>
                  <input type="file" accept="image/*" className="hidden" onChange={handlePhotoChange} />
                </label>
              </div>
              <div>
                <p className="text-[14px] font-semibold text-[#1A1A1A]">Foto de perfil</p>
                <p className="text-[12px] text-[#6B7280]">Haz clic en el icono para cambiar tu foto</p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Nombre</Label>
                <Input value={form.nombre} onChange={(v) => set("nombre", v)} placeholder="Tu nombre" />
              </div>
              <div>
                <Label>Edad</Label>
                <Input type="number" value={form.edad} onChange={(v) => set("edad", v)} placeholder="Edad" min={18} max={99} />
              </div>
            </div>

            <div className="mt-4">
              <Label>Sobre mí (bio)</Label>
              <Textarea
                value={form.bio}
                onChange={(v) => set("bio", v)}
                placeholder="Cuéntate brevemente..."
                maxLength={300}
                rows={3}
              />
              <p className="mt-1 text-right text-[12px] text-[#9CA3AF]">{form.bio.length}/300</p>
            </div>

            <div className="mt-4">
              <Label>Estado civil</Label>
              <RadioGroup
                value={form.estadoCivil}
                onChange={(v) => set("estadoCivil", v)}
                options={[
                  { value: "soltero", label: "Soltero/a" },
                  { value: "en_pareja", label: "En pareja" },
                  { value: "prefiero_no_decir", label: "Prefiero no decir" },
                ]}
              />
            </div>
          </section>

          {/* ── UBICACIÓN ───────────────────────────── */}
          <section>
            <SectionTitle>Ubicación</SectionTitle>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>País de origen</Label>
                <div className="flex flex-col gap-1.5">
                  <input
                    type="text"
                    value={countrySearch}
                    onChange={(e) => setCountrySearch(e.target.value)}
                    placeholder="Buscar país..."
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
                  />
                  <select
                    value={form.pais}
                    onChange={(e) => set("pais", e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
                    size={4}
                  >
                    {filteredCountries.map((c) => (
                      <option key={c} value={c}>{c}</option>
                    ))}
                  </select>
                  {form.pais ? <p className="text-[12px] font-semibold text-[#FF6B6B]">✓ {form.pais}</p> : null}
                </div>
              </div>

              <div>
                <Label>Ciudad donde vives</Label>
                <AutocompleteInput
                  value={citySearch.query}
                  onInput={(v) => { citySearch.search(v); set("ciudad", v); }}
                  onSelect={(v) => { citySearch.setQuery(v); set("ciudad", v); citySearch.clear(); }}
                  suggestions={citySearch.suggestions}
                  loading={citySearch.loading}
                  placeholder="Busca cualquier ciudad..."
                />
                <p className="mt-1.5 text-[12px] text-[#9CA3AF]">Puedes buscar ciudades de todo el mundo</p>
              </div>
            </div>
          </section>

          {/* ── IDIOMAS ─────────────────────────────── */}
          <section>
            <SectionTitle>Idiomas</SectionTitle>
            <p className="mb-3 text-[13px] text-[#6B7280]">
              Seleccionados: {form.idiomas.length > 0
                ? form.idiomas.map((code) => allLanguages.find((l) => l.code === code)?.name ?? code).join(", ")
                : "ninguno"}
            </p>
            <input
              type="text"
              value={langSearch}
              onChange={(e) => setLangSearch(e.target.value)}
              placeholder="Buscar idioma..."
              className="mb-3 w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
            />
            <div className="flex max-h-40 flex-wrap gap-2 overflow-y-auto rounded-xl border border-[#E5E7EB] p-3">
              {filteredLangs.map((l) => (
                <button
                  key={l.code}
                  type="button"
                  onClick={() => toggleIdioma(l.code)}
                  className={`rounded-lg border px-2.5 py-1 text-[12px] font-semibold transition ${
                    form.idiomas.includes(l.code)
                      ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                      : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF6B6B]/40"
                  }`}
                >
                  {l.name}
                </button>
              ))}
            </div>
          </section>

          {/* ── SITUACIÓN ───────────────────────────── */}
          <section>
            <SectionTitle>Situación</SectionTitle>

            <div className="mb-4">
              <Label>Busco / Ofrezco</Label>
              <RadioGroup
                value={form.situacion}
                onChange={(v) => set("situacion", v)}
                options={[
                  { value: "busco_habitacion", label: "Busco habitación" },
                  { value: "buscar_juntos", label: "Buscar juntos" },
                  { value: "tengo_piso_libre", label: "Tengo piso" },
                ]}
              />
            </div>

            <div className="mb-4">
              <Label>Estudio / Trabajo</Label>
              <RadioGroup
                value={form.estudiaOTrabaja}
                onChange={(v) => set("estudiaOTrabaja", v)}
                options={[
                  { value: "estudiante", label: "Estudiante" },
                  { value: "trabajador", label: "Trabajador/a" },
                  { value: "ambas", label: "Ambas" },
                ]}
              />
            </div>

            {needsStudy ? (
              <div className="mb-4 grid grid-cols-2 gap-4">
                <div>
                  <Label>Carrera / Grado</Label>
                  <Input value={form.carrera} onChange={(v) => set("carrera", v)} placeholder="Ej. Derecho, ADE..." />
                </div>
                <div>
                  <Label>Universidad / Centro</Label>
                  <Input value={form.universidad} onChange={(v) => set("universidad", v)} placeholder="Nombre del centro..." />
                </div>
              </div>
            ) : null}

            {needsWork ? (
              <div className="mb-4">
                <Label>Profesión / Trabajo</Label>
                <Input value={form.trabajo} onChange={(v) => set("trabajo", v)} placeholder="Ej. Diseñador, Enfermero..." />
              </div>
            ) : null}

            {isBuscador ? (
              <>
                <div className="mb-4">
                  <Label>Presupuesto máximo (€/mes)</Label>
                  <div className="flex items-center gap-3">
                    <input
                      type="range"
                      min={200}
                      max={3000}
                      step={50}
                      value={Number(form.presupuesto)}
                      onChange={(e) => set("presupuesto", e.target.value)}
                      className="flex-1 accent-[#FF6B6B]"
                    />
                    <span className="w-20 rounded-xl border border-[#E5E7EB] px-3 py-1.5 text-center text-[14px] font-bold text-[#FF6B6B]">
                      {form.presupuesto}€
                    </span>
                  </div>
                </div>

                <div>
                  <Label>Zonas de interés</Label>
                  <AutocompleteInput
                    value={zoneInput}
                    onInput={(v) => { setZoneInput(v); zoneSearch.search(v, form.ciudad); }}
                    onSelect={(v) => addZona(v)}
                    suggestions={zoneSearch.suggestions}
                    loading={zoneSearch.loading}
                    placeholder="Buscar barrio o zona..."
                  />
                  {form.zonas.length > 0 ? (
                    <div className="mt-2 flex flex-wrap gap-2">
                      {form.zonas.map((z) => (
                        <span key={z} className="flex items-center gap-1 rounded-full border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-2.5 py-1 text-[12px] font-semibold text-[#FF6B6B]">
                          {z}
                          <button type="button" onClick={() => removeZona(z)} className="ml-0.5 hover:text-[#cc3333]">×</button>
                        </span>
                      ))}
                    </div>
                  ) : null}
                </div>
              </>
            ) : null}
          </section>

          {/* ── CONVIVENCIA ─────────────────────────── */}
          <section>
            <SectionTitle>Forma de vivir</SectionTitle>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label>Fumas</Label>
                <RadioGroup
                  value={form.fumar}
                  onChange={(v) => set("fumar", v)}
                  options={[
                    { value: "no_fumo", label: "No fumo" },
                    { value: "solo_fuera", label: "Solo fuera" },
                    { value: "si_fumo", label: "Sí fumo" },
                  ]}
                />
              </div>
              <div>
                <Label>Mascotas</Label>
                <RadioGroup
                  value={form.mascotas}
                  onChange={(v) => set("mascotas", v)}
                  options={[
                    { value: "acepto_mascotas", label: "Acepto" },
                    { value: "tengo_mascota", label: "Tengo" },
                    { value: "no_acepto", label: "No acepto" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-4 grid grid-cols-2 gap-4">
              <div>
                <Label>Horario</Label>
                <RadioGroup
                  value={form.horario}
                  onChange={(v) => set("horario", v)}
                  options={[
                    { value: "madrugador", label: "Madrugador" },
                    { value: "normal", label: "Normal" },
                    { value: "nocturno", label: "Nocturno" },
                  ]}
                />
              </div>
              <div>
                <Label>Ambiente en casa</Label>
                <RadioGroup
                  value={form.ambiente}
                  onChange={(v) => set("ambiente", v)}
                  options={[
                    { value: "tranquilo", label: "Tranquilo" },
                    { value: "equilibrado", label: "Equilibrado" },
                    { value: "social", label: "Social" },
                  ]}
                />
              </div>
            </div>

            <div className="mt-4">
              <Label>Deporte</Label>
              <RadioGroup
                value={form.deporte}
                onChange={(v) => set("deporte", v)}
                options={[
                  { value: "poco", label: "Poco" },
                  { value: "algunas", label: "A veces" },
                  { value: "frecuente", label: "Frecuente" },
                ]}
              />
            </div>

            <div className="mt-4">
              <Label>Aficiones</Label>
              <div className="flex flex-wrap gap-2">
                {HOBBIES.map((h) => (
                  <button
                    key={h.id}
                    type="button"
                    onClick={() => toggleAficion(h.id)}
                    className={`rounded-xl border px-3 py-1.5 text-[13px] font-semibold transition ${
                      form.aficiones.includes(h.id)
                        ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#FF6B6B]"
                        : "border-[#E5E7EB] bg-white text-[#6B7280] hover:border-[#FF6B6B]/40"
                    }`}
                  >
                    {h.label}
                  </button>
                ))}
              </div>
              {/* Custom aficion */}
              <div className="mt-2 flex gap-2">
                <input
                  type="text"
                  value={form.customAficion}
                  onChange={(e) => set("customAficion", e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") { e.preventDefault(); addCustomAficion(); } }}
                  placeholder="Añadir afición personalizada..."
                  className="flex-1 rounded-xl border border-[#E5E7EB] bg-white px-3 py-2 text-[13px] text-[#1A1A1A] placeholder-[#9CA3AF] outline-none focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
                />
                <button
                  type="button"
                  onClick={addCustomAficion}
                  className="rounded-xl bg-[#FF6B6B] px-3 py-2 text-[13px] font-semibold text-white transition hover:bg-[#e55a5a]"
                >
                  +
                </button>
              </div>
              {/* Custom aficiones chips */}
              {form.aficiones.filter((a) => !HOBBIES.find((h) => h.id === a)).length > 0 ? (
                <div className="mt-2 flex flex-wrap gap-2">
                  {form.aficiones
                    .filter((a) => !HOBBIES.find((h) => h.id === a))
                    .map((a) => (
                      <span key={a} className="flex items-center gap-1 rounded-full border border-[#FF6B6B]/30 bg-[#FF6B6B]/10 px-2.5 py-1 text-[12px] font-semibold text-[#FF6B6B]">
                        {a}
                        <button type="button" onClick={() => toggleAficion(a)} className="hover:text-[#cc3333]">×</button>
                      </span>
                    ))}
                </div>
              ) : null}
            </div>
          </section>

          {/* ── MI PISO (propietarios) ───────────────── */}
          {isPropietario ? (
            <section>
              <SectionTitle>Mi piso</SectionTitle>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Precio de alquiler (€/mes)</Label>
                  <Input
                    type="number"
                    value={form.pisoPrecio}
                    onChange={(v) => set("pisoPrecio", v)}
                    placeholder="Ej. 450"
                    min={100}
                  />
                </div>
                <div>
                  <Label>Disponible desde</Label>
                  <input
                    type="date"
                    value={form.pisoDisponibleDesde}
                    onChange={(e) => set("pisoDisponibleDesde", e.target.value)}
                    className="w-full rounded-xl border border-[#E5E7EB] bg-white px-3 py-2.5 text-[14px] text-[#1A1A1A] outline-none transition focus:border-[#FF6B6B] focus:ring-2 focus:ring-[#FF6B6B]/15"
                  />
                </div>
              </div>

              <div className="mt-4">
                <Label>Dirección / Calle</Label>
                <AutocompleteInput
                  value={streetSearch.query}
                  onInput={(v) => { streetSearch.search(v, form.ciudad); set("pisoCalle", v); }}
                  onSelect={(v) => { streetSearch.setQuery(v); set("pisoCalle", v); streetSearch.clear(); }}
                  suggestions={streetSearch.suggestions}
                  loading={streetSearch.loading}
                  placeholder="Busca la calle del piso..."
                />
                <p className="mt-1 text-[12px] text-[#9CA3AF]">Busca la dirección con Mapbox — calles de todo el mundo</p>
              </div>

              <div className="mt-4">
                <Label>Descripción del piso</Label>
                <Textarea
                  value={form.pisoDescripcion}
                  onChange={(v) => set("pisoDescripcion", v)}
                  placeholder="Describe el piso, normas de convivencia..."
                  rows={3}
                />
              </div>

              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => set("pisoGastosIncluidos", !form.pisoGastosIncluidos)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition ${
                    form.pisoGastosIncluidos ? "bg-[#FF6B6B]" : "bg-[#D1D5DB]"
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white shadow transition ${
                      form.pisoGastosIncluidos ? "translate-x-6" : "translate-x-1"
                    }`}
                  />
                </button>
                <span className="text-[14px] font-semibold text-[#374151]">Gastos incluidos</span>
              </div>
            </section>
          ) : null}

          {/* Bottom padding */}
          <div className="h-4" />
        </div>
      </div>

      {/* ── FOOTER ─────────────────────────────────── */}
      <div className="border-t border-[#E5E7EB] bg-white px-6 py-4">
        {error ? (
          <p className="mb-2 text-[13px] font-semibold text-red-500">{error}</p>
        ) : null}
        {success ? (
          <p className="mb-2 text-[13px] font-semibold text-green-600">✓ Perfil actualizado correctamente</p>
        ) : null}
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="w-full rounded-2xl bg-[#FF6B6B] py-3 text-[15px] font-bold text-white shadow-[0_4px_14px_rgba(255,107,107,0.35)] transition hover:bg-[#e55a5a] active:scale-[0.99] disabled:opacity-60"
        >
          {saving ? "Guardando..." : "Guardar cambios"}
        </button>
      </div>
    </div>
  );
}
