# Importar el código original de Nexo EHS

El objetivo es crear un sitio a partir de esta aplicación React + Express + SQLite. La capacidad de Sites para importar y ejecutar este proyecto **no está confirmada**. Esta conversación no dispone de sus herramientas; no se ha creado, conectado ni publicado un sitio en Sites.

## Comprobación previa en Sites

La sesión de Sites debe confirmar que puede:

1. Importar el código fuente completo de un ZIP o un repositorio, conservar la API Express y ejecutar Node.js 24 o superior.
2. Instalar mediante `npm ci --include=dev` y compilar mediante `npm run build`.
3. Ejecutar un proceso HTTP persistente, no solo servir HTML y JavaScript estáticos.
4. Montar un disco persistente para SQLite. El archivo `EHS_DB_PATH` y sus archivos WAL deben sobrevivir a reinicios y nuevas versiones.
5. Configurar variables privadas, HTTPS y el puerto asignado por el proveedor, sin incluir credenciales en el frontend.

Si una de estas capacidades falta, la importación completa queda pendiente. No describir una recreación visual o una base en memoria como un despliegue de esta aplicación. En ese caso se necesita un servicio para la API y el almacenamiento, y una integración explícita con la interfaz.

## Entrada y configuración

El proceso de servidor es `server/index.ts`. Sirve la interfaz compilada de `dist/` y las rutas `/api` bajo el mismo origen. No se requiere otro servidor de frontend.

```sh
npm ci --include=dev
npm run build
npm test
node --import tsx server/index.ts
```

En el hosting, definir:

| Variable | Valor o requisito |
| --- | --- |
| `NODE_ENV` | `production` |
| `HOST` | `0.0.0.0` |
| `PORT` | Puerto interno proporcionado por el hosting; predeterminado `3000` |
| `EHS_DB_PATH` | Ruta absoluta dentro del disco persistente, por ejemplo `/app/data/ehs.sqlite` |
| `EHS_REQUIRE_PILOT_AUTH` | `1` |
| `EHS_PILOT_USER` | Usuario compartido del piloto, letras/números y `_.@-` |
| `EHS_PILOT_PASSWORD` | Contraseña privada de al menos 16 caracteres. Introducirla en los ajustes seguros del hosting. |

La protección del piloto pide credenciales antes de acceder a la interfaz y a los datos. Solo el estado técnico `/api/health` queda público para supervisión. Es una protección compartida para pruebas, no autenticación por persona, roles ni separación entre empresas. Requiere HTTPS antes de intercambiar credenciales en Internet. Usar únicamente datos ficticios.

El corpus legal inicial sigue sin estar validado y los DC-3 son borradores. La IA generativa es opcional: necesita `EHS_AI_API_KEY`, un modelo en `EHS_AI_MODEL` y conexión a `api.openai.com`. No es necesaria para probar gestión, seguimiento, capacitación o riesgos. Configurar una clave no demuestra que la llamada al modelo funcione: debe probarse con fuentes reales revisadas.

## Imagen Docker opcional

Se incluyen `Dockerfile`, `.dockerignore` y `compose.yaml` como alternativa para proveedores que admitan contenedores. Su disponibilidad en Sites no está confirmada. La imagen exige usuario y contraseña al iniciar; no incluye archivos `.env`, datos del entorno ni credenciales. La carpeta persistente es `/app/data`.

```sh
docker compose up --build -d
```

Antes, configurar `EHS_PILOT_USER` y `EHS_PILOT_PASSWORD` en el entorno o un `.env` local privado. Compose enlaza por defecto solo con la interfaz local del servidor. Una publicación web requiere un proxy HTTPS o la terminación TLS del proveedor. No borrar el volumen `nexo-data` al actualizar.

En el entorno administrado de Codex, los builds requieren el proxy y su CA mediante BuildKit: `docker build --secret id=proxy_ca,src="$CODEX_PROXY_CERT" -t nexo-ehs .`. Fuera de ese entorno, la CA es opcional y se conserva la verificación TLS normal. La documentación de este paquete distingue una plantilla disponible de una imagen efectivamente construida y probada.

## Prueba de aceptación del sitio

- Sin credenciales: interfaz, recursos y API responden 401; `/api/health` responde 200 sin datos de personas.
- Con credenciales: abrir el dashboard y los seis módulos con datos ficticios.
- Cambiar actividades en diagnóstico y comprobar que cambia la matriz sin perder avances previos.
- Registrar una persona y una capacitación; generar su borrador DC-3.
- Guardar un registro HAZOP y consultar sus campos.
- Consultar sin corpus: informar evidencia insuficiente. Añadir una fuente oficial real cotejada, revisarla y comprobar extractos y URL.
- Reiniciar el servicio y comprobar que perfil, avances, personas y capacitación siguen en SQLite.
- Confirmar la dirección HTTPS, el resultado de estas pruebas y la procedencia del código. No afirmar que el sitio está publicado antes de obtener y verificar esa dirección.

## Mensaje para una sesión con Sites disponible

> Importa el ZIP de Nexo EHS adjunto como un sitio nuevo usando su código original. Conserva React, Express, SQLite y los seis módulos. Revisa primero `docs/importar-en-sites.md` y confirma soporte para Node.js 24, servidor persistente, disco para SQLite, variables privadas y HTTPS. Si Sites no admite el backend o el disco, informa la limitación antes de reemplazar funciones por simulaciones. Si lo admite, configura un piloto protegido con datos ficticios, valida la API y la persistencia después de reiniciar y presenta el sitio para revisión. No publiques ni contrates servicios sin autorización.

## Validación realizada en este entorno

La compilación de la interfaz y la comprobación de tipos pasan. Las diez pruebas del servidor pasan, incluidas las dos del acceso protegido. Se probó además la entrada de producción en un navegador con credenciales temporales y una base aislada, con API rechazada sin credenciales y datos conservados después de reiniciar el proceso.

No se ha verificado una importación o un despliegue en Sites ni una llamada real de IA. Posteriormente se construyó y probó la imagen Docker con acceso protegido y se preparó un piloto gratuito de datos temporales; consulta `docs/alojamiento-gratuito.md`. La activación del alojamiento y la verificación de su dirección pública siguen pendientes.
