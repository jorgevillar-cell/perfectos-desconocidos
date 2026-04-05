"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";

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
  carrera: string;
  universidad: string;
  trabajo: string;
  presupuestoMax: number;
  zonas: string[];
  disponibleDesde: string;

  fumar: Fumar;
  mascotas: Mascotas;
  horario: Horario;
  ambiente: Ambiente;
  deporte: Deporte;
  aficiones: string[];

  bio: string;
  pisoFotosDataUrls: string[];
  pisoDescripcion: string;
  telefono: string;
  telefonoCodigoEnviado: string;
  telefonoCodigoInput: string;
  telefonoVerificado: boolean;
};

const STORAGE_KEY_PREFIX = "pd_onboarding_v1";

const LANG_OPTIONS = [
  "espanol",
  "ingles",
  "frances",
  "aleman",
  "italiano",
  "portugues",
  "chino",
  "arabe",
  "otros",
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
};

const UNIVERSIDADES = [
  "Universidad Complutense de Madrid",
  "Universidad Autonoma de Madrid",
  "Universidad Carlos III de Madrid",
  "Universidad Politecnica de Madrid",
  "Universidad de Barcelona",
  "Universitat Autonoma de Barcelona",
  "Universitat Pompeu Fabra",
  "Universitat Politecnica de Valencia",
  "Universidad de Valencia",
  "Universidad de Sevilla",
  "Universidad de Malaga",
  "Universidad de Granada",
  "Universidad del Pais Vasco",
  "Universidad de Zaragoza",
  "Universidad de Murcia",
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
  carrera: "",
  universidad: "",
  trabajo: "",
  presupuestoMax: 900,
  zonas: [],
  disponibleDesde: "",

  fumar: "",
  mascotas: "",
  horario: "",
  ambiente: "",
  deporte: "",
  aficiones: [],

  bio: "",
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
      ? "border-[#FF6B6B] bg-[#FF6B6B]/10 text-[#d54848]"
      : error
      ? "border-rose-300 bg-rose-50 text-rose-700"
      : "border-slate-200 bg-white text-slate-700 hover:border-[#FF6B6B]/40"
  }`;
}

function fieldClass(error?: boolean) {
  return `h-12 w-full rounded-2xl border bg-white px-4 text-base outline-none transition focus:ring-4 ${
    error
      ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100"
      : "border-slate-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/12"
  }`;
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

  const [step, setStep] = useState(1);
  const [animating, setAnimating] = useState(false);
  const [data, setData] = useState<OnboardingData>(initialData);
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [globalError, setGlobalError] = useState("");
  const [smsFeedback, setSmsFeedback] = useState("");

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

  const zonasDisponibles = useMemo(() => {
    return CITY_ZONES[data.ciudad] ?? [];
  }, [data.ciudad]);

  const ciudadSugerencias = useMemo(() => {
    if (!data.ciudad) return CITIES;
    return CITIES.filter((city) => city.toLowerCase().includes(data.ciudad.toLowerCase()));
  }, [data.ciudad]);

  const paisSugerencias = useMemo(() => {
    if (!data.pais) return COUNTRIES.slice(0, 20);
    return COUNTRIES.filter((country) => country.toLowerCase().includes(data.pais.toLowerCase())).slice(0, 20);
  }, [data.pais]);

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

      if (!data.zonas.length) nextErrors.zonas = "Selecciona al menos una zona";
    }

    if (currentStep === 3) {
      if (!data.fumar) nextErrors.fumar = "Selecciona una opcion";
      if (!data.mascotas) nextErrors.mascotas = "Selecciona una opcion";
      if (!data.horario) nextErrors.horario = "Selecciona una opcion";
      if (!data.ambiente) nextErrors.ambiente = "Selecciona una opcion";
    }

    if (currentStep === 4) {
      if (!data.bio.trim()) nextErrors.bio = "La presentacion es obligatoria";
      if (data.bio.length > 300) nextErrors.bio = "Maximo 300 caracteres";
      if (data.situacion === "tengo_piso_libre") {
        if (!data.pisoFotosDataUrls.length) nextErrors.pisoFotosDataUrls = "Sube al menos una foto del piso";
        if (!data.pisoDescripcion.trim()) nextErrors.pisoDescripcion = "Describe ambiente y normas";
      }
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

    const selected = Array.from(files).slice(0, 6 - data.pisoFotosDataUrls.length);
    const urls = await Promise.all(selected.map((file) => toDataUrl(file)));
    setField("pisoFotosDataUrls", [...data.pisoFotosDataUrls, ...urls].slice(0, 6));
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
      const payload = {
        ...data,
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
    <main className="min-h-screen bg-[#F8F8F8] px-4 py-5 text-slate-900 sm:px-6 lg:px-10 lg:py-8">
      <div className="mx-auto w-full max-w-4xl rounded-[2rem] border border-white/80 bg-white/95 p-4 shadow-[0_24px_80px_rgba(15,23,42,0.06)] sm:p-6 lg:p-8">
        <div className="mb-6">
          <div className="flex items-center justify-between gap-3">
            <p className="text-sm font-semibold text-[#FF6B6B]">{stepLabel(step)}</p>
            <p className="text-xs text-slate-500">Guardado automatico activado</p>
          </div>
          <div className="mt-2 h-2 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-[#FF6B6B] transition-all duration-300"
              style={{ width: `${(step / 4) * 100}%` }}
            />
          </div>
        </div>

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
                  <input className={fieldClass(Boolean(errors.pais))} value={data.pais} onChange={(e) => setField("pais", e.target.value)} list="country-list" placeholder="Busca tu pais" />
                  <datalist id="country-list">
                    {paisSugerencias.map((country) => (
                      <option key={country} value={country} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-1 block text-sm font-semibold">Ciudad donde buscas piso</label>
                  <input className={fieldClass(Boolean(errors.ciudad))} value={data.ciudad} onChange={(e) => setField("ciudad", e.target.value)} list="city-list" placeholder="Madrid, Barcelona..." />
                  <datalist id="city-list">
                    {ciudadSugerencias.map((city) => (
                      <option key={city} value={city} />
                    ))}
                  </datalist>
                </div>
                <div className="sm:col-span-2">
                  <label className="mb-2 block text-sm font-semibold">Idiomas que hablas</label>
                  <div className="flex flex-wrap gap-2">
                    {LANG_OPTIONS.map((lang) => {
                      const active = data.idiomas.includes(lang);
                      return (
                        <button key={lang} type="button" onClick={() => toggleArrayItem("idiomas", lang)} className={cardClass(active, Boolean(errors.idiomas))}>
                          {lang}
                        </button>
                      );
                    })}
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

              <div className="space-y-3">
                <p className="text-sm font-semibold">Estudia o trabaja</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "estudiante", label: "Estudiante" },
                    { id: "trabajador", label: "Trabajador" },
                    { id: "ambas", label: "Ambas" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.estudiaOTrabaja === item.id, Boolean(errors.estudiaOTrabaja))} onClick={() => setField("estudiaOTrabaja", item.id as EstudioTrabajo)}>
                      {item.label}
                    </button>
                  ))}
                </div>
              </div>

              {(data.estudiaOTrabaja === "estudiante" || data.estudiaOTrabaja === "ambas") && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Carrera</label>
                    <input className={fieldClass(Boolean(errors.carrera))} value={data.carrera} onChange={(e) => setField("carrera", e.target.value)} />
                  </div>
                  <div>
                    <label className="mb-1 block text-sm font-semibold">Universidad</label>
                    <input className={fieldClass(Boolean(errors.universidad))} value={data.universidad} onChange={(e) => setField("universidad", e.target.value)} list="uni-list" />
                    <datalist id="uni-list">
                      {UNIVERSIDADES.map((uni) => (
                        <option key={uni} value={uni} />
                      ))}
                    </datalist>
                  </div>
                </div>
              )}

              {(data.estudiaOTrabaja === "trabajador" || data.estudiaOTrabaja === "ambas") && (
                <div>
                  <label className="mb-1 block text-sm font-semibold">Sector o profesion</label>
                  <input className={fieldClass(Boolean(errors.trabajo))} value={data.trabajo} onChange={(e) => setField("trabajo", e.target.value)} />
                </div>
              )}

              <div className="rounded-2xl bg-[#FFF4F0] p-4">
                <p className="text-sm font-semibold text-slate-700">Presupuesto maximo</p>
                <p className="mt-1 text-3xl font-semibold text-[#FF6B6B]">{data.presupuestoMax} EUR</p>
                <input type="range" min={200} max={2000} step={50} value={data.presupuestoMax} onChange={(e) => setField("presupuestoMax", Number(e.target.value))} className="mt-3 w-full accent-[#FF6B6B]" />
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Zonas preferidas</p>
                <div className="flex flex-wrap gap-2">
                  {(zonasDisponibles.length ? zonasDisponibles : ["Centro", "Norte", "Sur", "Este", "Oeste"]).map((zone) => {
                    const active = data.zonas.includes(zone);
                    return (
                      <button key={zone} type="button" onClick={() => toggleArrayItem("zonas", zone)} className={cardClass(active, Boolean(errors.zonas))}>
                        {zone}
                      </button>
                    );
                  })}
                </div>
              </div>

              <div>
                <label className="mb-1 block text-sm font-semibold">Fecha aproximada de disponibilidad (opcional)</label>
                <input type="date" className={fieldClass(false)} value={data.disponibleDesde} onChange={(e) => setField("disponibleDesde", e.target.value)} />
              </div>
            </section>
          )}

          {step === 3 && (
            <section className="space-y-5">
              <h1 className="text-2xl font-semibold tracking-tight sm:text-3xl">Forma de vivir</h1>

              <div>
                <p className="mb-2 text-sm font-semibold">Fumas</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "no_fumo", label: "No fumo" },
                    { id: "solo_fuera", label: "Solo fuera de casa" },
                    { id: "si_fumo", label: "Si fumo" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.fumar === item.id, Boolean(errors.fumar))} onClick={() => setField("fumar", item.id as Fumar)}>{item.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Mascotas</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "tengo_mascota", label: "Tengo mascota" },
                    { id: "acepto_mascotas", label: "Acepto mascotas" },
                    { id: "no_acepto", label: "No acepto mascotas" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.mascotas === item.id, Boolean(errors.mascotas))} onClick={() => setField("mascotas", item.id as Mascotas)}>{item.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Horario general</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "madrugador", label: "Madrugador", desc: "Antes de las 8" },
                    { id: "normal", label: "Normal", desc: "Horario estandar" },
                    { id: "nocturno", label: "Nocturno", desc: "Despues de la 1" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.horario === item.id, Boolean(errors.horario))} onClick={() => setField("horario", item.id as Horario)}>
                      <p>{item.label}</p>
                      <p className="mt-1 text-xs font-normal opacity-90">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Ambiente en casa</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "tranquilo", label: "Tranquilo", desc: "Silencio y calma" },
                    { id: "equilibrado", label: "Equilibrado", desc: "Mezcla de los dos" },
                    { id: "social", label: "Social y animado", desc: "Me gusta tener gente" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.ambiente === item.id, Boolean(errors.ambiente))} onClick={() => setField("ambiente", item.id as Ambiente)}>
                      <p>{item.label}</p>
                      <p className="mt-1 text-xs font-normal opacity-90">{item.desc}</p>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Haces deporte (opcional)</p>
                <div className="grid gap-2 sm:grid-cols-3">
                  {[
                    { id: "poco", label: "Poco o nada" },
                    { id: "algunas", label: "Algunas veces" },
                    { id: "frecuente", label: "Frecuentemente" },
                  ].map((item) => (
                    <button key={item.id} type="button" className={cardClass(data.deporte === item.id)} onClick={() => setField("deporte", item.id as Deporte)}>{item.label}</button>
                  ))}
                </div>
              </div>

              <div>
                <p className="mb-2 text-sm font-semibold">Aficiones e intereses (opcional)</p>
                <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                  {HOBBIES.map((hobby) => {
                    const active = data.aficiones.includes(hobby.id);
                    return (
                      <button key={hobby.id} type="button" className={cardClass(active)} onClick={() => toggleArrayItem("aficiones", hobby.id)}>
                        {hobby.label}
                      </button>
                    );
                  })}
                </div>
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

              {data.situacion === "tengo_piso_libre" && (
                <div className="space-y-4 rounded-2xl border border-slate-200 bg-[#F8F8F8] p-4">
                  <p className="text-sm font-semibold">Fotos del piso (hasta 6)</p>
                  <input type="file" accept="image/*" multiple onChange={(e) => handlePisoFiles(e.target.files)} className="h-12 w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm" />
                  {!!data.pisoFotosDataUrls.length && (
                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
                      {data.pisoFotosDataUrls.map((url, index) => (
                        <div key={url} className="relative">
                          <img src={url} alt={`piso-${index + 1}`} className="h-28 w-full rounded-xl object-cover" />
                          <button
                            type="button"
                            onClick={() => setField("pisoFotosDataUrls", data.pisoFotosDataUrls.filter((_, i) => i !== index))}
                            className="absolute right-2 top-2 rounded-full bg-black/65 px-2 py-1 text-xs text-white"
                          >
                            x
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                  <textarea
                    className={`min-h-24 w-full rounded-2xl border bg-white px-4 py-3 text-base outline-none transition focus:ring-4 ${errors.pisoDescripcion ? "border-rose-400 focus:border-rose-500 focus:ring-rose-100" : "border-slate-200 focus:border-[#FF6B6B] focus:ring-[#FF6B6B]/12"}`}
                    placeholder="Describe ambiente del piso y normas"
                    value={data.pisoDescripcion}
                    onChange={(e) => setField("pisoDescripcion", e.target.value)}
                  />
                </div>
              )}

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

        <div className="mt-6 flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-between">
          <button type="button" onClick={goBack} disabled={step === 1 || isSaving} className="min-h-12 rounded-2xl border border-slate-200 px-5 text-sm font-semibold text-slate-700 transition hover:border-[#FF6B6B] hover:text-[#FF6B6B] disabled:cursor-not-allowed disabled:opacity-50">
            Volver
          </button>
          <button type="button" onClick={goNext} disabled={isSaving} className="min-h-12 rounded-2xl bg-[#FF6B6B] px-5 text-sm font-semibold text-white shadow-[0_18px_40px_rgba(255,107,107,0.28)] transition hover:bg-[#ff5b5b] disabled:cursor-not-allowed disabled:opacity-60">
            {step === 4 ? (isSaving ? "Guardando perfil..." : "Completar perfil y empezar a explorar") : "Continuar"}
          </button>
        </div>
      </div>
    </main>
  );
}