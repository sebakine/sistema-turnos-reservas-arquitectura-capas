# Sistema Backend de Turnos y Reservas — Arquitectura en capas con DAO y Repository

API REST del **Sistema Backend de Turnos y Reservas** construida con **Node.js y Express**, con persistencia en archivos JSON.

En esta entrega se **refactorizó la API hacia una arquitectura en capas**: entre los controllers y los archivos JSON ahora existen las capas **service**, **repository** y **DAO**. No se agregaron endpoints nuevos: las URLs y el comportamiento externo de la API son los mismos de la entrega anterior.

## Tecnologías

- Node.js 18 o superior
- Express 5
- FileSystem (`node:fs/promises`)
- dotenv
- Módulos ES (`"type": "module"`)

---

## Nueva arquitectura en capas

Cada petición recorre las capas siempre en el mismo orden:

```
router → controller → service → repository → DAO → archivo JSON
```

```
          Petición HTTP
                │
                ▼
┌───────────────────────────────┐
│ Router                        │  Define los endpoints y los conecta al controller.
│ services.router.js            │
│ bookings.router.js            │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Controller                    │  Lee req (params, query, body), llama al service
│ services.controller.js        │  y responde con res.status().json().
│ bookings.controller.js        │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Service                       │  Reglas de negocio: validaciones, filtros,
│ services.service.js           │  existencia de recursos, incremento de quantity.
│ bookings.service.js           │  No conoce req ni res.
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ Repository                    │  Métodos de acceso a datos para el service.
│ services.repository.js        │  Delega en el DAO, sin reglas de negocio.
│ bookings.repository.js        │
└───────────────┬───────────────┘
                ▼
┌───────────────────────────────┐
│ DAO                           │  Lee y escribe directamente el archivo JSON.
│ services.dao.js               │  Sin lógica de negocio.
│ bookings.dao.js               │
└───────────────┬───────────────┘
                ▼
     services.json / bookings.json
```

### Responsabilidad de cada capa

| Capa | Responsabilidad | Qué **no** hace |
|------|-----------------|-----------------|
| **Router** | Define los endpoints y los conecta con el controller | No contiene lógica |
| **Controller** | Lee `req.params`, `req.query` y `req.body`, llama al service y responde con `res.status().json()`. Traduce los errores del service al código HTTP (400, 404, 500) | No valida reglas de negocio ni accede a archivos |
| **Service** | Contiene las reglas de negocio: validación de campos, filtros, verificación de que los recursos existan, estado de la reserva e incremento de `quantity` | No usa `req` ni `res` y no accede a archivos JSON |
| **Repository** | Ofrece los métodos de acceso a datos que usa el service y delega en el DAO | No tiene reglas de negocio |
| **DAO** | Lee y escribe el archivo JSON. Asigna el id autogenerado al crear y conserva el id al actualizar | No tiene reglas de negocio ni validaciones |

### Funciones de cada capa por recurso

**services**

| Controller | Service | Repository | DAO |
|------------|---------|------------|-----|
| `getServices` | `getServices` | `getAll` | `getAll` |
| `getServiceById` | `getServiceById` | `getById` | `getById` |
| `createService` | `createService` | `create` | `create` |
| `updateService` | `updateService` | `update` | `update` |
| `deleteService` | `deleteService` | `delete` | `delete` |

**bookings**

| Controller | Service | Repository | DAO |
|------------|---------|------------|-----|
| `createBooking` | `createBooking` | `create` | `create` |
| `getBookingById` | `getBookingById` | `getById` | `getById` |
| `addServiceToBooking` | `addServiceToBooking` | `getById` + `update` | `getById` + `update` |

### Regla de negocio clave: `quantity` en las reservas

La lógica de agregar un servicio a una reserva vive en **`bookings.service.js`**:

1. Busca la reserva con `bookingsRepository.getById` → si no existe, responde **404**.
2. Verifica que el servicio exista con `servicesRepository.getById` → si no existe, responde **404**.
3. Si la reserva está `cancelled`, no permite agregar servicios → **400**.
4. Si el servicio **ya está** en la reserva, **incrementa `quantity`**; si no está, lo agrega como `{ service, quantity: 1 }`.
5. Guarda el array actualizado con `bookingsRepository.update`, que a su vez usa el DAO.

El DAO solo recibe el array ya calculado y lo guarda: no decide nada sobre `quantity`.

### Ventaja de la arquitectura

Como los services solo conocen a los repositories y estos delegan en un DAO, **cambiar la forma de persistencia** (por ejemplo, migrar de archivos JSON a MongoDB con Mongoose) consiste en escribir un nuevo DAO con los mismos métodos (`getAll`, `getById`, `create`, `update`, `delete`) y entregárselo al repository. Los routers, controllers y services no necesitan cambios.

---

## Estructura del proyecto

```
src/
  config/
    env.config.js             # Variables de entorno (puerto y rutas de los JSON)
  controllers/
    services.controller.js    # getServices, getServiceById, createService, updateService, deleteService
    bookings.controller.js    # createBooking, getBookingById, addServiceToBooking
  services/
    services.service.js       # Reglas de negocio de services
    bookings.service.js       # Reglas de negocio de bookings (incluye el incremento de quantity)
  repositories/
    services.repository.js    # getAll, getById, create, update, delete
    bookings.repository.js    # create, getById, update
  dao/
    services.dao.js           # Lectura/escritura de services.json
    bookings.dao.js           # Lectura/escritura de bookings.json
  routes/
    services.router.js        # Endpoints de /api/services
    bookings.router.js        # Endpoints de /api/bookings
  data/
    services.json             # Persistencia de servicios
    bookings.json             # Persistencia de reservas
  utils/
    errors.js                 # ValidationError (400), NotFoundError (404) y conversión a respuesta
  app.js                      # Configuración de Express y montaje de routers
  server.js                   # Arranque del servidor
package.json
.env.example
.gitignore
README.md
```

## Instalación y ejecución

1. Clonar el repositorio e ingresar a la carpeta:

   ```bash
   git clone https://github.com/sebakine/sistema-turnos-reservas-arquitectura-capas.git
   cd sistema-turnos-reservas-arquitectura-capas
   ```

2. Instalar las dependencias:

   ```bash
   npm install
   ```

3. Crear el archivo `.env` a partir del ejemplo (si no existe, el servidor usa el puerto `8080`):

   ```bash
   cp .env.example .env      # En Windows (PowerShell): Copy-Item .env.example .env
   ```

4. Levantar el servidor:

   ```bash
   npm start       # modo normal
   npm run dev     # modo desarrollo (se reinicia al guardar cambios)
   ```

El servidor queda disponible en `http://localhost:8080`.

### Variables de entorno

| Variable        | Descripción               | Valor por defecto        |
|-----------------|---------------------------|--------------------------|
| `PORT`          | Puerto del servidor       | `8080`                   |
| `SERVICES_FILE` | Archivo JSON de servicios | `src/data/services.json` |
| `BOOKINGS_FILE` | Archivo JSON de reservas  | `src/data/bookings.json` |

---

## Endpoints (sin cambios)

| Método | Ruta                               | Controller            | Respuestas |
|--------|------------------------------------|-----------------------|------------|
| GET    | `/api/services`                    | `getServices`         | 200 · 400 filtro inválido |
| GET    | `/api/services/:sid`               | `getServiceById`      | 200 · 404 |
| POST   | `/api/services`                    | `createService`       | 201 · 400 |
| PUT    | `/api/services/:sid`               | `updateService`       | 200 · 400 · 404 |
| DELETE | `/api/services/:sid`               | `deleteService`       | 200 · 404 |
| POST   | `/api/bookings`                    | `createBooking`       | 201 · 400 |
| GET    | `/api/bookings/:bid`               | `getBookingById`      | 200 · 404 |
| POST   | `/api/bookings/:bid/services/:sid` | `addServiceToBooking` | 200 · 404 · 400 si la reserva está cancelada |

`GET /api/services` acepta filtros opcionales por query params: `?category=salud` y `?available=true`.

### Modelo de `services`

| Campo         | Tipo    | Reglas |
|---------------|---------|--------|
| `id`          | string  | Generado automáticamente (UUID). No se envía en el body y no se puede modificar |
| `name`        | string  | Obligatorio, no vacío |
| `description` | string  | Obligatorio, no vacío |
| `duration`    | integer | Obligatorio, minutos, mayor a 0 |
| `price`       | number  | Obligatorio, mayor o igual a 0 |
| `category`    | string  | Obligatorio, no vacío (se guarda en minúsculas) |
| `available`   | boolean | Obligatorio, `true` o `false` |

### Modelo de `bookings`

| Campo         | Tipo   | Reglas |
|---------------|--------|--------|
| `id`          | string | Generado automáticamente (UUID) |
| `clientName`  | string | Obligatorio, no vacío |
| `clientEmail` | string | Obligatorio, email válido |
| `date`        | string | Obligatorio, formato `YYYY-MM-DD` y fecha existente |
| `time`        | string | Obligatorio, formato `HH:mm` (24 horas) |
| `status`      | string | Opcional: `pending` (por defecto), `confirmed` o `cancelled` |
| `services`    | array  | Opcional, puede iniciar vacío. Elementos `{ "service": idDelServicio, "quantity": 1 }` |

---

## Ejemplos de uso

```bash
# Servicios
curl http://localhost:8080/api/services
curl "http://localhost:8080/api/services?category=salud&available=true"
curl http://localhost:8080/api/services/b3f1c2a4-5d6e-4f70-8a91-0b1c2d3e4f50

curl -X POST http://localhost:8080/api/services \
  -H "Content-Type: application/json" \
  -d '{"name":"Control dental","description":"Revisión y limpieza dental","duration":40,"price":30000,"category":"salud","available":true}'

curl -X PUT http://localhost:8080/api/services/b3f1c2a4-5d6e-4f70-8a91-0b1c2d3e4f50 \
  -H "Content-Type: application/json" \
  -d '{"price":27000,"available":false}'

curl -X DELETE http://localhost:8080/api/services/b3f1c2a4-5d6e-4f70-8a91-0b1c2d3e4f50

# Reservas
curl -X POST http://localhost:8080/api/bookings \
  -H "Content-Type: application/json" \
  -d '{"clientName":"Juan Pérez","clientEmail":"juan.perez@example.com","date":"2026-10-20","time":"16:00","services":[]}'

curl http://localhost:8080/api/bookings/f7d5a6e8-9102-43b4-8e35-4f5061728394

curl -X POST http://localhost:8080/api/bookings/f7d5a6e8-9102-43b4-8e35-4f5061728394/services/d5b3e4c6-7f80-4192-8c13-2d3e4f506172
```

Si se agrega dos veces el mismo servicio, no se duplica: aumenta su `quantity`.

```json
"services": [
  { "service": "b3f1c2a4-5d6e-4f70-8a91-0b1c2d3e4f50", "quantity": 1 },
  { "service": "d5b3e4c6-7f80-4192-8c13-2d3e4f506172", "quantity": 2 }
]
```

## Formato de respuestas y códigos HTTP

```json
{ "status": "success", "payload": { } }
{ "status": "error", "error": "Descripción del error", "details": ["..."] }
```

| Código | Uso |
|--------|-----|
| 200 | Consulta, actualización, eliminación o servicio agregado a una reserva |
| 201 | Servicio o reserva creados |
| 400 | Campos faltantes, datos inválidos, JSON mal formado o reserva cancelada |
| 404 | Servicio, reserva o ruta inexistente |
| 500 | Error inesperado del servidor |

## Decisiones de diseño

- **Dependencias en una sola dirección:** cada capa solo importa a la siguiente (controller → service → repository → DAO). Ninguna capa inferior conoce a las superiores.
- **Errores de negocio sin Express:** los services lanzan `ValidationError` (400) o `NotFoundError` (404); el controller los convierte en la respuesta HTTP.
- **Operaciones de archivo en serie:** cada DAO ejecuta sus lecturas y escrituras de a una, evitando que peticiones simultáneas se sobrescriban o lean un archivo a medio escribir.
- **Agregados simultáneos a una misma reserva:** `bookings.service.js` procesa de a uno los agregados sobre una misma reserva, de modo que el incremento de `quantity` nunca se pierde.

## Autor

Sebastián Muñoz
