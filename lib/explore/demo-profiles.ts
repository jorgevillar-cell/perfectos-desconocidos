export type DemoProfile = {
  id: string;
  nombre: string;
  edad: number;
  pais: string;
  ciudad: string;
  zona: string;
  universidad: string | null;
  idiomas: string[];
  situacion: string;
  estudiaOTrabaja: string;
  esErasmus: boolean;
  fumar: boolean;
  mascotas: boolean;
  horario: string;
  ambiente: string;
  deporte: string;
  aficiones: string[];
  presupuesto: number;
  tienePiso: boolean;
  precioPiso: number | null;
  verificado: boolean;
  bio: string;
  pisos: Array<{
    precio: number;
    zona: string;
    direccion?: string | null;
    descripcion: string;
    disponibleDesde: string;
    gastosIncluidos: boolean;
    fotos: string[];
  }>;
  fotoUrl: string;
  compatibilidad: number;
};

export function getDemoProfiles(): DemoProfile[] {
  return [
    {
      id: "demo-1",
      nombre: "Lucia Martin",
      edad: 24,
      pais: "Espana",
      ciudad: "Madrid",
      zona: "Chamberi",
      universidad: "Universidad Complutense de Madrid",
      idiomas: ["espanol", "ingles"],
      situacion: "busco_habitacion",
      estudiaOTrabaja: "estudiante",
      esErasmus: true,
      fumar: false,
      mascotas: true,
      horario: "madrugador",
      ambiente: "tranquilo",
      deporte: "algunas",
      aficiones: ["cine", "lectura", "cocina"],
      presupuesto: 820,
      tienePiso: false,
      precioPiso: null,
      verificado: true,
      bio: "Estudio psicologia y me gusta tener una rutina ordenada. Busco convivencia tranquila y respetuosa.",
      pisos: [],
      fotoUrl: "https://i.pravatar.cc/300?img=1",
      compatibilidad: 86,
    },
    {
      id: "demo-2",
      nombre: "Carlos Vega",
      edad: 27,
      pais: "Espana",
      ciudad: "Madrid",
      zona: "Retiro",
      universidad: "Universidad Carlos III de Madrid",
      idiomas: ["espanol"],
      situacion: "tengo_piso_libre",
      estudiaOTrabaja: "trabajador",
      esErasmus: false,
      fumar: false,
      mascotas: false,
      horario: "normal",
      ambiente: "equilibrado",
      deporte: "frecuente",
      aficiones: ["deporte", "viajes", "musica"],
      presupuesto: 980,
      tienePiso: true,
      precioPiso: 780,
      verificado: true,
      bio: "Trabajo en producto digital. Busco companero responsable con buena comunicacion para un piso centrico.",
      pisos: [
        {
          precio: 780,
          zona: "Retiro",
          descripcion: "Piso luminoso, ambiente tranquilo entre semana y social moderado los fines de semana.",
          disponibleDesde: "2026-05-01",
          gastosIncluidos: true,
          fotos: [
            "https://images.unsplash.com/photo-1493666438817-866a91353ca9?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=900&q=80",
          ],
        },
      ],
      fotoUrl: "https://i.pravatar.cc/300?img=2",
      compatibilidad: 79,
    },
    {
      id: "demo-3",
      nombre: "Marta Soler",
      edad: 25,
      pais: "Espana",
      ciudad: "Barcelona",
      zona: "Eixample",
      universidad: "Universidad de Barcelona",
      idiomas: ["espanol", "catalan", "ingles"],
      situacion: "buscar_juntos",
      estudiaOTrabaja: "ambas",
      esErasmus: true,
      fumar: false,
      mascotas: true,
      horario: "nocturno",
      ambiente: "social",
      deporte: "algunas",
      aficiones: ["arte", "musica", "viajes"],
      presupuesto: 900,
      tienePiso: false,
      precioPiso: null,
      verificado: false,
      bio: "Compagino master y trabajo remoto. Me gusta compartir planes y una casa activa pero respetuosa.",
      pisos: [],
      fotoUrl: "https://i.pravatar.cc/300?img=3",
      compatibilidad: 74,
    },
    {
      id: "demo-4",
      nombre: "Javier Ruiz",
      edad: 29,
      pais: "Espana",
      ciudad: "Barcelona",
      zona: "Gracia",
      universidad: "Universitat Pompeu Fabra",
      idiomas: ["espanol", "ingles"],
      situacion: "tengo_piso_libre",
      estudiaOTrabaja: "trabajador",
      esErasmus: false,
      fumar: true,
      mascotas: true,
      horario: "normal",
      ambiente: "equilibrado",
      deporte: "poco",
      aficiones: ["cine", "gaming", "tecnologia"],
      presupuesto: 1100,
      tienePiso: true,
      precioPiso: 690,
      verificado: true,
      bio: "Trabajo en consultoria y valoro una convivencia flexible. Tengo piso con habitacion libre en Gracia.",
      pisos: [
        {
          precio: 690,
          zona: "Gracia",
          descripcion: "Habitacion exterior, piso reformado y ambiente relajado.",
          disponibleDesde: "2026-04-20",
          gastosIncluidos: false,
          fotos: [
            "https://images.unsplash.com/photo-1484154218962-a197022b5858?auto=format&fit=crop&w=900&q=80",
            "https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=900&q=80",
          ],
        },
      ],
      fotoUrl: "https://i.pravatar.cc/300?img=4",
      compatibilidad: 68,
    },
    {
      id: "demo-5",
      nombre: "Paula Herrero",
      edad: 23,
      pais: "Espana",
      ciudad: "Madrid",
      zona: "Salamanca",
      universidad: "Universidad Politecnica de Madrid",
      idiomas: ["espanol", "frances"],
      situacion: "busco_habitacion",
      estudiaOTrabaja: "estudiante",
      esErasmus: true,
      fumar: false,
      mascotas: false,
      horario: "madrugador",
      ambiente: "tranquilo",
      deporte: "frecuente",
      aficiones: ["deporte", "naturaleza", "lectura"],
      presupuesto: 760,
      tienePiso: false,
      precioPiso: null,
      verificado: false,
      bio: "Estudio ingenieria y entreno por las mananas. Busco piso limpio y silencioso para concentrarme.",
      pisos: [],
      fotoUrl: "https://i.pravatar.cc/300?img=5",
      compatibilidad: 72,
    },
    {
      id: "demo-6",
      nombre: "Alberto Mena",
      edad: 26,
      pais: "Espana",
      ciudad: "Madrid",
      zona: "Centro",
      universidad: "Universidad Autonoma de Madrid",
      idiomas: ["espanol", "ingles", "italiano"],
      situacion: "buscar_juntos",
      estudiaOTrabaja: "trabajador",
      esErasmus: false,
      fumar: false,
      mascotas: true,
      horario: "nocturno",
      ambiente: "social",
      deporte: "algunas",
      aficiones: ["musica", "cocina", "cine"],
      presupuesto: 880,
      tienePiso: false,
      precioPiso: null,
      verificado: true,
      bio: "Trabajo en marketing y teletrabajo algunos dias. Me gusta compartir cenas y buen ambiente en casa.",
      pisos: [],
      fotoUrl: "https://i.pravatar.cc/300?img=6",
      compatibilidad: 65,
    },
  ];
}
