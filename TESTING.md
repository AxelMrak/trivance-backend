# Cómo ejecutar los tests de Trivance Backend

El backend usa **Jest** como test runner. Aunque usamos Bun para ejecutar los comandos, no debemos usar `bun test`.

## Comandos principales

Ejecutar desde:

```bash
backend/trivance-backend
```

### Tests unitarios

No necesitan Docker ni PostgreSQL:

```bash
bun run test:unit
```

### Tests de integración

Necesitan OrbStack/Docker activo:

```bash
bun run test:int
```

Este comando automáticamente:

1. Levanta PostgreSQL.
2. Espera a que esté saludable.
3. Ejecuta las migrations.
4. Ejecuta los tests de integración.

### Suite completa

```bash
bun run test
```

También prepara PostgreSQL automáticamente.

## Importante: no usar `bun test`

No usar:

```bash
bun test
```

Ese comando ejecuta el runner nativo de Bun. El proyecto está configurado para Jest, por lo que pueden aparecer errores como:

```text
Cannot use a pool after calling end on the pool
```

La forma correcta es:

```bash
bun run test
```

`bun run` ejecuta los scripts definidos en `package.json`.

## Probar los últimos cambios

Con OrbStack activo:

```bash
bun run test -- \
  test/unit/middlewares/authmiddleware.test.ts \
  test/integration/database/PostgresSchema.int.test.ts \
  test/integration/routes/UserRoutes.basic.test.ts \
  test/integration/routes/OrderRoutes.basic.test.ts \
  test/integration/webhooks/MercadoPagoWebhook.int.test.ts \
  test/unit/services/MercadoPagoWebhookService.test.ts
```

Resultado esperado:

```text
17 tests passed
```

## Verificaciones adicionales

### TypeScript

```bash
bun run typecheck
```

### ESLint

```bash
bun run lint
```

Este comando solo verifica el código y no modifica archivos.

Para corregir automáticamente el formato:

```bash
bun run lint:fix
```

Usar `lint:fix` de forma consciente porque modifica archivos.

## Flujo recomendado diario

### Si estás trabajando en lógica aislada

```bash
bun run test:unit
```

### Si estás trabajando en rutas, base de datos o migrations

1. Encender OrbStack.
2. Ejecutar:

```bash
bun run test:int
```

### Antes de subir cambios

```bash
bun run typecheck
bun run lint
bun run test
```

## Diferencia entre los entornos

| Comando | Docker | PostgreSQL | Uso |
| --- | ---: | ---: | --- |
| `bun run test:unit` | No | No | Tests unitarios |
| `bun run test:int` | Sí | Sí | Tests de integración |
| `bun run test` | Sí | Sí | Suite completa |
| `bun test` | Incorrecto | No controlado | No usar |

## Apagar la base de tests

Desde el root `trivance-infra`:

```bash
docker compose -f docker-compose.test.yml down
```

## Entorno de tests en CI

`.env.test` es un archivo generado/local y **nunca se commitea**. CI lo genera en cada job a partir de las variables de entorno del job; localmente se crea desde `.env.example` si hace falta.

- `test:ci` es el comando que corre CI: solo ejecuta Jest, sin Docker ni migrations.
- `test` orquesta localmente (`test:db` + `test:ci`): levanta PostgreSQL, migra y corre la suite completa.
- `lint:fix` es solo local y modifica archivos; CI usa `lint:check`.

## Regla principal

```text
Bun ejecuta los scripts.
Jest ejecuta los tests.
Docker provee PostgreSQL para integración.
```
