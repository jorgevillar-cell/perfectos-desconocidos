# Stripe webhook local (desarrollo)

## Estado actual en este entorno

- Stripe CLI instalado: `stripe version 1.40.0`.
- Listener local configurado a `http://localhost:3000/api/stripe/webhook`.
- `STRIPE_WEBHOOK_SECRET` agregado en `.env.local`.
- Verificacion ejecutada: eventos `payment_intent.succeeded` recibidos con `200` en el endpoint local.

## 1) Levantar la app

```powershell
npm run dev
```

Confirma que quede disponible en `http://localhost:3000`.

## 2) Iniciar listener de Stripe

```powershell
stripe listen --forward-to http://localhost:3000/api/stripe/webhook
```

Stripe CLI imprimira una linea como esta:

```text
Your webhook signing secret is whsec_...
```

## 3) Guardar el webhook secret

En `.env.local`:

```env
STRIPE_WEBHOOK_SECRET="whsec_..."
```

Si cambias este valor, reinicia `npm run dev`.

## 4) Prueba end-to-end de pago con tarjeta 4242

1. Inicia sesion como inquilino y abre el flujo de pago (desde chat o la pantalla de pago).
2. Completa Stripe Elements con:
   - Numero: `4242 4242 4242 4242`
   - Fecha: cualquier fecha futura (por ejemplo `12/34`)
   - CVC: cualquier 3 digitos (por ejemplo `123`)
   - Codigo postal: cualquier valor valido
3. Confirma el pago y espera redireccion a la pantalla de exito.

## 5) Verificar recepcion correcta del webhook

En la terminal donde corre `stripe listen`, valida que aparezca:

```text
--> payment_intent.succeeded [...]
<-- [200] POST http://localhost:3000/api/stripe/webhook [...]
```

En la terminal de `npm run dev`, valida:

```text
POST /api/stripe/webhook 200
```

## 6) Verificacion adicional (opcional) con evento forzado

```powershell
stripe trigger payment_intent.succeeded
```

Debe verse tambien con estado `200` en ambos logs.

## Solucion de problemas rapida

- `500` en webhook:
  - Revisa que `STRIPE_WEBHOOK_SECRET` coincida con el que imprime `stripe listen`.
  - Reinicia `npm run dev` despues de actualizar `.env.local`.
- No llega ningun evento:
  - Verifica que `stripe listen` siga activo.
  - Verifica que la app siga en `http://localhost:3000`.
