# Producto: Sistema de Chat - Perfectos Desconocidos

## Objetivo
Habilitar mensajeria en tiempo real exclusivamente entre usuarios con match confirmado (`matchConfirmado = true`) sin abandonar la experiencia de exploracion.

## Experiencia de Usuario
- Barra lateral fija de 64px a la derecha con 4 iconos: perfil, chat, notificaciones, ajustes.
- Badge coral en chat con no leidos totales.
- Panel deslizable desde la derecha (250ms ease-in-out).
- Fondo de exploracion visible mientras el panel esta abierto.
- Cierre por click fuera del panel o clic de nuevo en el icono activo.

## Panel de Chat
- Distribucion desktop 40/60:
  - Columna izquierda: conversaciones.
  - Columna derecha: conversacion activa.
- Mobile: panel a ancho completo.
- Lista de conversaciones:
  - Avatar, nombre, ultimo mensaje truncado, tiempo relativo, compatibilidad, no leidos.
  - Orden por actividad reciente.
- Conversacion activa:
  - Header con avatar, nombre, estado, compatibilidad y acceso a perfil.
  - Mensajes propios a la derecha (coral), mensajes remotos a la izquierda (gris).
  - Hora por mensaje y ticks de enviado/leido en mensajes propios.
  - Indicador de escritura con 3 puntos.
  - Input fijo inferior con envio por Enter o boton.

## Tiempo Real (Pusher)
- Canal por match: `chat-{matchId}`.
- Canal por usuario: `user-{userId}`.
- Eventos usados:
  - `nuevo-mensaje`: insercion de nuevo mensaje en UI.
  - `escribiendo`: indicador de typing con debounce.
  - `mensajes-leidos`: actualizacion de ticks.
  - `match-confirmado`: disparo de celebracion y apertura de chat.

## Reglas de Negocio
- Solo se puede conversar si:
  - El usuario autenticado pertenece al match.
  - El match tiene `matchConfirmado = true`.
- Al abrir una conversacion:
  - Se marcan como leidos los mensajes entrantes no leidos.
- Al enviar mensaje:
  - Se guarda en `mensajes` y se publica evento realtime.

## API Routes
- `GET /api/chat/conversations`
  - Conversaciones del usuario con ultimo mensaje, no leidos y compatibilidad.
- `GET /api/chat/messages/[matchId]`
  - Historial completo por match ordenado por fecha ascendente.
- `POST /api/chat/messages`
  - Persistencia de mensaje + emision realtime.
- `POST /api/chat/read/[matchId]`
  - Marcado de leidos + emision `mensajes-leidos`.
- `POST /api/chat/typing`
  - Emision de estado escribiendo.

## Celebracion de Match
- Pantalla completa con gradiente coral, fotos enfrentadas y CTA doble:
  - `Enviar mensaje`: abre Explore con panel chat y usuario objetivo.
  - `Seguir explorando`: cierra celebracion.
- Se activa en dos casos:
  - Match confirmado al pulsar "Me interesa".
  - Evento `match-confirmado` recibido por Pusher.

## Persistencia
- Tabla `mensajes`:
  - `id`, `matchId`, `remitenteId`, `contenido`, `leido`, `creadoEn`.
- Tabla `matches`:
  - soporte de likes mutuos y estado `matchConfirmado`.

## Rendimiento
- Virtualizacion ligera en UI para conversaciones largas (>100):
  - render de ventana de mensajes recientes para evitar saturacion de DOM.
- Reconexion de Pusher soportada por cliente oficial.
- Toasts locales para errores de envio/carga.

## Variables de Entorno necesarias
- `PUSHER_APP_ID`
- `PUSHER_KEY`
- `PUSHER_SECRET`
- `PUSHER_CLUSTER`
- `NEXT_PUBLIC_PUSHER_KEY`
- `NEXT_PUBLIC_PUSHER_CLUSTER`

## Archivos clave
- UI chat:
  - `components/chat/chat-dock.tsx`
  - `components/explore/explore-screen.tsx`
- API chat:
  - `app/api/chat/conversations/route.ts`
  - `app/api/chat/messages/route.ts`
  - `app/api/chat/messages/[matchId]/route.ts`
  - `app/api/chat/read/[matchId]/route.ts`
  - `app/api/chat/typing/route.ts`
- Match + celebracion:
  - `app/api/matches/like/route.ts`
  - `components/profile/profile-actions.tsx`
- Infra:
  - `lib/chat/pusher-server.ts`
  - `lib/chat/pusher-client.ts`
  - `lib/chat/types.ts`
  - `lib/chat/compatibility.ts`
