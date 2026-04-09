# Perfectos Desconocidos - Sistema de pagos con Stripe Connect

> Estado actual: pagos desactivados temporalmente en producto. Los precios se muestran solo de forma informativa y no se permiten cobros desde la plataforma.

## Objetivo

Permitir que un propietario conectado con Stripe Connect solicite y reciba el pago del primer mes de alquiler dentro de la plataforma, con custodia temporal, gestión de incidencias y liberación automática.

## Flujo

1. El propietario conecta su cuenta bancaria en `/settings/payments` mediante Stripe Connect.
2. Desde el chat de un match confirmado, el propietario crea una solicitud de pago del primer mes.
3. El inquilino abre `/payment/[pagoId]`, paga con tarjeta mediante Stripe Elements y el pago queda marcado como `pagado`.
4. A las 48 horas, si no hay incidencias, el importe sigue retenido.
5. A los 7 días, un job de liquidación captura el `PaymentIntent` manual y transfiere el 90% al propietario y el 10% a la plataforma.
6. Si existe una incidencia abierta, la liberación automática se bloquea hasta la resolución.

## Estados de pago

- `pendiente`: la solicitud existe pero el inquilino todavía no ha completado el pago.
- `pagado`: el pago quedó confirmado y entra en custodia.
- `incidencia_abierta`: hay una incidencia activa que bloquea la liberación.
- `liberado`: Stripe ha transferido la parte del propietario y la plataforma ha retenido su comisión.
- `reembolso_total`: la incidencia se resolvió a favor del inquilino.
- `fallido`: el pago no pudo completarse.

## Supuestos técnicos

- Stripe se usa en modo test durante el desarrollo.
- Las notificaciones por email quedan encapsuladas en `lib/notifications/email.ts`.
- El job de liberación se expone como route handler en `/api/stripe/settle` para que un cron externo lo invoque cada hora.
- El botón de pago dentro del chat usa la tarjeta especial generada al crear la solicitud.

## Archivos clave

- [lib/payments/service.ts](../../lib/payments/service.ts)
- [app/api/stripe/webhook/route.ts](../../app/api/stripe/webhook/route.ts)
- [app/api/stripe/settle/route.ts](../../app/api/stripe/settle/route.ts)
- [app/(app)/settings/payments/page.tsx](../../app/(app)/settings/payments/page.tsx)
- [app/payment/[pagoId]/page.tsx](../../app/payment/[pagoId]/page.tsx)
- [app/payment/success/[pagoId]/page.tsx](../../app/payment/success/[pagoId]/page.tsx)