# Nexo EHS

[Preparar el sitio de pruebas gratuito en Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmmondragon-maker%2FSeguridad-y-Salud-en-el-trabajo) · [Guía de activación y límites](docs/alojamiento-gratuito.md)

El despliegue gratuito conserva las modificaciones del código en GitHub. Los registros de prueba son temporales y pueden perderse al reiniciar; la interfaz lo avisa. La activación y la URL final requieren conectar la cuenta del propietario en Render.

Primera versión de una plataforma de gestión de **Seguridad, Salud y Medio Ambiente para México**, con un piloto de manufactura en Guadalajara, Jalisco. Convierte el perfil de una instalación en una lista de revisiones normativas y permite organizar acciones, capacitación, riesgos y fuentes para una auditoría.

El repositorio contiene una aplicación local con datos de demostración. Las referencias del catálogo son orientativas y están pendientes de cotejo; no se incluye un corpus legal oficialmente validado. Marcar una tarea como terminada expresa un avance interno, no acredita cumplimiento ante una autoridad.

## Ejecutar

Requiere Node.js **24 o superior** y npm. SQLite está incluido en Node; no hace falta instalar un servidor de base de datos. Utiliza el checkout existente, sin crear un worktree adicional.

```sh
cd /workspace/Seguridad-y-Salud-en-el-trabajo
npm ci
npm run dev
```

El servidor usa el puerto `3000` y escucha únicamente en `127.0.0.1` de forma predeterminada. Sirve tanto la API como la interfaz; no hay que iniciar Vite por separado.

```sh
# Compilar y comprobar tipos
npm run build

# Ejecutar las pruebas del backend
npm test

# Servir los archivos compilados; requiere haber ejecutado el build
npm start
```

`NODE_ENV=production` selecciona los archivos compilados, pero no convierte este MVP en un despliegue seguro para producción. Se requieren controles adicionales antes de utilizar datos reales o exponer el servidor a otras personas.

## Demostración visual sin servidor

Para generar una copia navegable de solo lectura, ejecuta `npm run build` y después `node --import tsx scripts/export-demo.ts`. El archivo resultante, `dist/nexo-ehs-demo.html`, se puede abrir directamente en un navegador sin instalar ni iniciar servicios.

Esta copia incluye los seis módulos y siempre utiliza datos ficticios nuevos, nunca una exportación de la base persistente. No guarda cambios ni conecta con IA. Es una demostración para visualizar la interfaz, no una publicación de la aplicación completa ni un enlace público. El archivo debe regenerarse después de cada compilación.

## Preparar un sitio web con este código

Consulta [la guía para importar en Sites](docs/importar-en-sites.md). Incluye requisitos de servidor y disco persistente, protección opcional del piloto, variables privadas y pruebas de aceptación. El soporte de Sites para alojar esta aplicación completa todavía no se ha confirmado; el paquete no implica que exista un sitio publicado.

Se incluye una plantilla Docker con volumen persistente y contraseña obligatoria para el piloto. En ejecución directa, `EHS_REQUIRE_PILOT_AUTH=1` exige `EHS_PILOT_USER` y `EHS_PILOT_PASSWORD`; sin esa opción ni credenciales se mantiene el modo de desarrollo local. Esta contraseña compartida no reemplaza cuentas individuales, roles ni aislamiento por organización.

## Funciones de esta versión

| Módulo                  | Comportamiento                                                                                                                                                                                                            |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Diagnóstico             | Guarda giro, ubicación, tamaño y actividades declaradas de la empresa.                                                                                                                                                    |
| Matriz legal            | Sugiere revisiones federales, estatales y municipales mediante reglas explícitas. Guarda estado, responsable, fecha y evidencia textual de cada acción.                                                                   |
| Personas y capacitación | Registra trabajadores, cursos y participantes. Prepara borradores imprimibles para revisar una constancia DC-3; no incorpora firmas ni acredita su emisión oficial.                                                       |
| Riesgos                 | Registra una evaluación de probabilidad por severidad. En HAZOP estructura palabra guía, desviación, causa, consecuencia, controles y recomendación.                                                                      |
| Auditoría               | Registra documentos y recupera extractos de fuentes oficiales marcadas como revisadas. Presenta la fuente de cada extracto y declara cuando no encuentra sustento. Permite activar una síntesis con IA de forma opcional. |

El catálogo inicial contempla incendios, comisión de seguridad e higiene, servicios preventivos, factores psicosociales, alturas, sustancias químicas, construcción, residuos y revisión ambiental/local de Jalisco. **No es un inventario exhaustivo**. La aplicabilidad definitiva exige comprobar el texto vigente, el proceso real, las cantidades y la competencia de cada autoridad.

Una ficha HAZOP estructura el trabajo del equipo técnico; no demuestra por sí sola conformidad con ANSI/ASSP Z310.1 ni reemplaza un estudio multidisciplinario. Las páginas oficiales del catálogo son puntos de consulta, no citas ya verificadas de artículos o numerales.

## Datos y configuración local

La base de datos se crea al iniciar en `data/ehs.sqlite`. Incluye una empresa, trabajadores, cursos y riesgos **ficticios**, identificados como demostración. El directorio `data/`, las dependencias y los archivos `.env` están excluidos de Git.

| Variable         | Uso                                                                            | Valor predeterminado           |
| ---------------- | ------------------------------------------------------------------------------ | ------------------------------ |
| `PORT`           | Puerto HTTP                                                                    | `3000`                         |
| `HOST`           | Dirección de escucha                                                           | `127.0.0.1`                    |
| `EHS_DB_PATH`    | Archivo SQLite; una ruta relativa se resuelve desde el directorio de ejecución | `data/ehs.sqlite`              |
| `NODE_ENV`       | Selecciona Vite en desarrollo o los archivos de `dist/`                        | Desarrollo                     |
| `EHS_AI_API_KEY` | Credencial opcional del proveedor de IA                                        | Vacía: recuperación extractiva |
| `EHS_AI_MODEL`   | Modelo para la síntesis opcional                                               | `gpt-4.1-mini`                 |

Los comandos `npm run dev` y `npm start` cargan `.env` si existe y conservan las variables ya configuradas en el entorno. `.env.example` contiene los nombres y valores no secretos de ejemplo. No guardes claves ni información personal en archivos versionados.

Para respaldar datos, detén primero el proceso que los escribe y conserva una copia protegida del directorio `data/` completo. SQLite utiliza WAL: copiar únicamente el archivo principal mientras hay escrituras puede omitir cambios. No borres la base de datos para actualizar dependencias o reiniciar el servicio.

## Fuentes del consultor

1. Obtén el texto vigente de una publicación oficial y confirma jurisdicción, versión y alcance.
2. Registra título, dirección oficial y texto pertinente en el módulo de auditoría.
3. Marca el documento como revisado únicamente después del cotejo humano.
4. Consulta y comprueba los extractos y su contexto antes de elaborar una respuesta al inspector.

La marca de revisión es una declaración del usuario: el sistema no autentica por sí mismo el contenido pegado ni certifica que corresponda a la URL. El documento interno de demostración no constituye una fuente legal y se excluye de las respuestas normativas. La búsqueda no descarga sitios ni actualiza legislación automáticamente.

### IA opcional

La aplicación funciona sin clave y responde con extractos locales. Para habilitar la síntesis, configura `EHS_AI_API_KEY` mediante los ajustes seguros del entorno y permite el destino HTTPS `api.openai.com` en su política de red. No compartas la clave por chat. En desarrollo fuera del entorno administrado también puede configurarse en un `.env` local excluido de Git.

Al activarse, se envían al proveedor la pregunta y los extractos recuperados; revisa el contenido que aportarás antes de habilitarlo. El servidor utiliza el proxy heredado, mantiene la verificación TLS y valida que los identificadores citados existan entre las fuentes entregadas. Esa comprobación no demuestra la fidelidad jurídica de cada frase generada: conserva la revisión humana. Un fallo, tiempo de espera o respuesta inválida provoca el retorno al modo extractivo con un aviso.

La integración con el proveedor está implementada; una configuración sin clave ni acceso al destino no permite validar una llamada real al modelo. Las pruebas locales y los dobles de respuesta del proveedor no equivalen a esa validación.

## Alcance y siguientes entregas

Esta versión dispone de una contraseña compartida opcional para el piloto, pero no tiene cuentas individuales, permisos por rol, separación entre organizaciones ni un registro inmutable de cambios. Utiliza datos ficticios durante la evaluación. La CURP y los expedientes de capacitación requieren políticas de acceso, minimización, conservación y protección antes de recopilar datos reales.

Las siguientes entregas deben priorizar:

- Organizaciones, instalaciones y roles, autenticación y trazabilidad de cambios.
- Corpus oficial con versiones, fechas de vigencia, numerales, procedencia verificable y revisión técnica documentada.
- Reglas de aplicabilidad ampliadas y aprobadas por especialistas de cada jurisdicción.
- Validación del formato DC-3 vigente, campos obligatorios, firmas y flujo de autorización.
- Evaluaciones de recuperación y generación con citas, controles contra instrucciones insertadas en documentos y revisión humana.
- Despliegue con TLS, copias verificadas, límites operativos y protección de datos personales.

Consulta [la arquitectura](docs/architecture.md) y [el contrato de API](server/API.md) para continuar el desarrollo.
