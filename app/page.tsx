"use client";

import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { SiteTopNav } from "@/components/navigation/site-top-nav";
import { smoothScrollToHash } from "@/lib/ui/section-scroll";

const STATS = [
  { value: "+180.000", label: "usuarios buscando piso" },
  { value: "+25.000", label: "viviendas publicadas" },
  { value: "+70", label: "ciudades en Espana" },
];

const HOW_IT_WORKS = [
  {
    title: "Busca por ciudad",
    body: "Filtra por zona y descubre pisos y perfiles afines sin necesidad de registrarte primero.",
  },
  {
    title: "Compara compatibilidad",
    body: "Revisa estilo de vida, horarios, normas de casa y contexto del piso para decidir mejor.",
  },
  {
    title: "Contacta cuando encaje",
    body: "Cuando una opcion te interese, crea tu cuenta y desbloquea la solicitud de contacto.",
  },
];

type CitySuggestion = {
  id: string;
  city: string;
  label: string;
};

const REAL_CITIES = [
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
  "Cordoba",
  "Valladolid",
  "Vigo",
  "Gijon",
  "A Coruna",
  "Granada",
  "Oviedo",
  "Santander",
  "Donostia",
  "Pamplona",
  "Salamanca",
  "Toledo",
  "Cadiz",
  "Almeria",
  "Castellon",
  "Tarragona",
  "Logrono",
  "Burgos",
  "Leon",
  "Albacete",
  "Huelva",
  "Jaen",
  "Lleida",
  "Girona",
  "Badajoz",
  "Ourense",
  "Lugo",
  "Santiago de Compostela",
  "Las Palmas de Gran Canaria",
  "Santa Cruz de Tenerife",
];

function normalizeForSearch(value: string) {
  return value
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim();
}

export default function Home() {
  const mapboxToken = process.env.NEXT_PUBLIC_MAPBOX_TOKEN;
  const [cityQuery, setCityQuery] = useState("");
  const [citySuggestions, setCitySuggestions] = useState<CitySuggestion[]>([]);
  const [cityMenuOpen, setCityMenuOpen] = useState(false);
  const [isLoadingCities, setIsLoadingCities] = useState(false);
  const searchRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      if (!searchRef.current) return;
      if (searchRef.current.contains(event.target as Node)) return;
      setCityMenuOpen(false);
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => document.removeEventListener("mousedown", handleOutsideClick);
  }, []);

  useEffect(() => {
    const search = cityQuery.trim();

    if (search.length < 2) {
      setCitySuggestions([]);
      setIsLoadingCities(false);
      return;
    }

    let active = true;
    const timeoutId = window.setTimeout(() => {
      setIsLoadingCities(true);

      void (async () => {
        try {
          if (!mapboxToken) {
            const fallback = REAL_CITIES
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
            const city = (feature.text ?? "").trim();
            if (!city) continue;

            const key = normalizeForSearch(city);
            if (!byCity.has(key)) {
              byCity.set(key, {
                id: feature.id,
                city,
                label: feature.place_name ?? `${city}, Espana`,
              });
            }
          }

          if (active) {
            setCitySuggestions(Array.from(byCity.values()));
          }
        } catch {
          if (!active) return;

          const fallback = REAL_CITIES
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
    }, 220);

    return () => {
      active = false;
      window.clearTimeout(timeoutId);
    };
  }, [cityQuery, mapboxToken]);

  useEffect(() => {
    const targets = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal='section']"));
    if (!targets.length) return;

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
          }
        }
      },
      { threshold: 0.15, rootMargin: "0px 0px -8% 0px" },
    );

    targets.forEach((target) => observer.observe(target));
    return () => observer.disconnect();
  }, []);

  function pickCity(suggestion: CitySuggestion) {
    setCityQuery(suggestion.city);
    setCityMenuOpen(false);
  }

  return (
    <main className="min-h-screen bg-[#F5F7FA] text-[#1A1A1A]">
      <SiteTopNav currentPath="/" />

      <section className="relative overflow-hidden border-b border-[#DDE5EE] bg-[#DCEAF6]">
        <div className="absolute -left-24 bottom-0 h-56 w-56 rounded-full bg-white/45 blur-xl" />
        <div className="absolute -right-16 top-16 h-44 w-44 rounded-full bg-[#FFD8CF]/40 blur-xl" />
        <div className="mx-auto flex w-full max-w-7xl flex-col items-center px-4 pb-16 pt-14 text-center sm:px-6 lg:px-8 lg:pb-20 lg:pt-20">
          <h1 className="max-w-4xl text-[38px] font-bold leading-[1.15] text-[#111827] sm:text-[54px]">
            Alquila por meses, facil y
            <span className="text-[#FF6B6B]"> seguro</span>
          </h1>
          <p className="mt-5 max-w-2xl text-[18px] leading-8 text-[#5B6573]">
            Desde donde estes, conecta con perfiles y pisos compatibles con todas las garantias.
          </p>

          <form action="/explore" method="get" className="mt-9 w-full max-w-3xl">
            <label htmlFor="home-city-search" className="sr-only">Donde quieres vivir</label>
            <div ref={searchRef} className="relative">
              <div className="flex h-16 items-center rounded-full border border-[#D5DFEB] bg-white px-4 shadow-[0_18px_45px_rgba(15,23,42,0.12)]">
                <svg viewBox="0 0 24 24" className="h-5 w-5 text-[#9CA3AF]" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                  <circle cx="11" cy="11" r="7" />
                  <path d="m20 20-3.5-3.5" />
                </svg>
                <input
                  id="home-city-search"
                  name="ciudad"
                  type="text"
                  value={cityQuery}
                  autoComplete="off"
                  onChange={(event) => {
                    const next = event.target.value;
                    setCityQuery(next);
                    setCityMenuOpen(next.trim().length >= 2);
                  }}
                  onFocus={() => {
                    if (cityQuery.trim().length >= 2) {
                      setCityMenuOpen(true);
                    }
                  }}
                  placeholder="¿Donde quieres vivir?"
                  className="h-full w-full bg-transparent px-3 text-[16px] font-medium text-[#111827] outline-none placeholder:text-[#6B7280]"
                />
                <button
                  type="submit"
                  className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-[#FF6B6B] text-white transition hover:bg-[#F45C5C]"
                  aria-label="Buscar"
                >
                  <svg viewBox="0 0 24 24" className="h-5 w-5" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m20 20-3.5-3.5" />
                  </svg>
                </button>
              </div>

              {cityMenuOpen ? (
                <div className="absolute left-0 right-0 top-[4.5rem] z-30 overflow-hidden rounded-3xl border border-[#D7E3F4] bg-white text-left shadow-[0_22px_44px_rgba(15,23,42,0.14)]">
                  {isLoadingCities ? (
                    <p className="px-5 py-4 text-[14px] text-[#6B7280]">Buscando ciudades reales...</p>
                  ) : citySuggestions.length ? (
                    <ul className="max-h-72 overflow-y-auto py-1">
                      {citySuggestions.map((suggestion) => (
                        <li key={suggestion.id}>
                          <button
                            type="button"
                            onClick={() => pickCity(suggestion)}
                            className="flex w-full items-start gap-3 px-5 py-3 transition hover:bg-[#F3F7FF]"
                          >
                            <span className="mt-1 text-[#1A2674]">
                              <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                                <path d="M12 21s7-5.5 7-11a7 7 0 1 0-14 0c0 5.5 7 11 7 11Z" />
                                <circle cx="12" cy="10" r="2.5" />
                              </svg>
                            </span>
                            <span className="min-w-0">
                              <span className="block truncate text-[15px] font-semibold text-[#111827]">{suggestion.city}</span>
                              <span className="block truncate text-[13px] text-[#6B7280]">{suggestion.label}</span>
                            </span>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="px-5 py-4 text-[14px] text-[#6B7280]">No encontramos coincidencias. Prueba con otra ciudad.</p>
                  )}
                </div>
              ) : null}
            </div>
          </form>

          <p className="mt-5 text-[13px] font-semibold text-[#5D6A7A]">Bueno · 4.7 sobre 5 en valoraciones internas</p>
        </div>
      </section>

      <section className="mx-auto w-full max-w-7xl px-4 py-10 sm:px-6 lg:px-8">
        <div className="grid gap-4 sm:grid-cols-3">
          {STATS.map((item) => (
            <article key={item.label} className="rounded-3xl border border-[#E7EAF0] bg-white px-6 py-5 text-center shadow-[0_10px_24px_rgba(15,23,42,0.05)]">
              <p className="text-[34px] font-bold tracking-tight text-[#1F2937]">{item.value}</p>
              <p className="mt-1 text-[13px] font-semibold uppercase tracking-[0.12em] text-[#6B7280]">{item.label}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="como-funciona" data-reveal="section" className="section-reveal mx-auto w-full max-w-7xl px-4 pb-14 pt-2 sm:px-6 lg:px-8 lg:pb-20">
        <div className="relative overflow-hidden rounded-[38px] border border-[#E7D6D2] bg-[linear-gradient(180deg,#FFF3F0_0%,#FFF9F8_58%,#FFFFFF_100%)] p-6 shadow-[0_30px_72px_rgba(15,23,42,0.08)] sm:p-8 lg:p-12">
          <div className="pointer-events-none absolute -left-14 top-12 h-36 w-36 rounded-full bg-[#FFD6CF]/55 blur-2xl" />
          <div className="pointer-events-none absolute -right-12 bottom-0 h-44 w-44 rounded-full bg-[#DDEBFF]/55 blur-2xl" />

          <div className="relative text-center">
            <p className="text-[12px] font-semibold uppercase tracking-[0.16em] text-[#B35C52]">Como funciona</p>
            <h2 className="mx-auto mt-3 max-w-3xl text-[34px] font-bold leading-tight text-[#111827] sm:text-[46px]">
              ¿Como te ayudamos a encontrar piso y convivencia compatible?
            </h2>
          </div>

          <div className="relative mt-8 grid gap-4 md:grid-cols-3">
            {HOW_IT_WORKS.map((step, index) => (
              <article key={step.title} className="group rounded-3xl border border-[#F1D9D3] bg-white/90 p-6 shadow-[0_12px_28px_rgba(15,23,42,0.06)] transition hover:-translate-y-1 hover:shadow-[0_18px_34px_rgba(15,23,42,0.1)]">
                <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl border border-[#F0CFC9] bg-[#FFF2EF] text-[#B35C52]">
                  <span className="text-[17px] font-bold">0{index + 1}</span>
                </div>
                <h3 className="mt-4 text-[28px] font-semibold leading-snug text-[#0F766E]">{step.title}</h3>
                <p className="mt-3 text-[15px] leading-7 text-[#5A6573]">{step.body}</p>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section id="contacto" data-reveal="section" className="section-reveal mx-auto w-full max-w-7xl px-4 pb-16 sm:px-6 lg:px-8 lg:pb-24">
        <div className="rounded-[34px] border border-[#E4E7F0] bg-[#F7F8FC] p-6 shadow-[0_20px_44px_rgba(15,23,42,0.08)] sm:p-8 lg:p-10">
          <div
            className="rounded-[26px] border border-[#E3E7F1] bg-[linear-gradient(rgba(26,38,116,0.05)_1px,transparent_1px),linear-gradient(90deg,rgba(26,38,116,0.05)_1px,transparent_1px)] bg-[size:34px_34px] px-4 py-6 sm:px-6 lg:px-8"
          >
            <div className="grid gap-8 lg:grid-cols-2">
              <div>
                <p className="text-[12px] font-semibold uppercase tracking-[0.2em] text-[#8B4CF6]">Contacto</p>
                <h2 className="mt-3 text-[42px] font-bold leading-[1.05] text-[#1A1F55] sm:text-[56px]">Hagamos match con tu nuevo hogar</h2>
                <p className="mt-5 max-w-lg text-[17px] leading-8 text-[#2E355F]">
                  Cuéntanos tu situación y te ayudamos a encontrar un piso y una convivencia que de verdad encaje contigo.
                </p>

                <div className="mt-8 space-y-2 text-[18px] text-[#2F3560]">
                  <p>Calle Fray Antonio Alcala 10, 44100 Guadalajara, Jal., Mexico</p>
                  <p>hola@perfectosdesconocidos.app</p>
                  <p>Telefono: +34 911 00 00 00</p>
                </div>

                <div className="mt-8 flex items-center gap-3 text-[#0F172A]">
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">in</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">f</span>
                  <span className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-[#111827]/20 bg-white text-[22px] font-semibold">x</span>
                </div>
              </div>

              <form className="grid gap-6 self-start">
                <div className="grid gap-4 sm:grid-cols-2">
                  <label className="text-[15px] font-medium text-[#2E3560]">
                    Nombre *
                    <input
                      type="text"
                      className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                    />
                  </label>
                  <label className="text-[15px] font-medium text-[#2E3560]">
                    Apellido *
                    <input
                      type="text"
                      className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                    />
                  </label>
                </div>

                <label className="text-[15px] font-medium text-[#2E3560]">
                  Email *
                  <input
                    type="email"
                    className="mt-3 h-10 w-full border-0 border-b border-[#AAB1D1] bg-transparent px-0 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                  />
                </label>

                <label className="text-[15px] font-medium text-[#2E3560]">
                  Dejanos un mensaje...
                  <textarea
                    rows={4}
                    className="mt-3 w-full resize-none border-0 border-b border-[#AAB1D1] bg-transparent px-0 py-1 text-[15px] text-[#111827] outline-none focus:border-[#8B4CF6]"
                  />
                </label>

                <div>
                  <button
                    type="button"
                    className="inline-flex min-h-12 min-w-52 items-center justify-center rounded-full bg-[linear-gradient(90deg,#9A4BFF_0%,#7E3AF2_100%)] px-8 text-[26px] font-semibold text-white shadow-[0_14px_36px_rgba(126,58,242,0.35)] transition hover:translate-y-[-1px]"
                  >
                    Enviar
                  </button>
                </div>
              </form>
            </div>
          </div>

          <div className="mt-6 flex flex-wrap gap-3 text-[14px] font-semibold text-[#273055]">
            <button type="button" onClick={() => smoothScrollToHash("#como-funciona")} className="rounded-full border border-[#D6DBEE] bg-white px-4 py-2 transition hover:border-[#8B4CF6] hover:text-[#8B4CF6]">Como funciona</button>
            <Link href="/explore" className="rounded-full border border-[#D6DBEE] bg-white px-4 py-2 transition hover:border-[#8B4CF6] hover:text-[#8B4CF6]">Explorar</Link>
            <Link href="/register" className="rounded-full border border-[#D6DBEE] bg-white px-4 py-2 transition hover:border-[#8B4CF6] hover:text-[#8B4CF6]">Crear cuenta</Link>
          </div>
        </div>
      </section>
    </main>
  );
}
