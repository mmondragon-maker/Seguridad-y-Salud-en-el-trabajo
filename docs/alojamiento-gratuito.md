# Activar la prueba web gratuita de Nexo EHS

El repositorio incluye `render.yaml` para ejecutar el código completo —React, Express y SQLite— como un servicio web de pruebas en Render. Selecciona explícitamente `plan: free`, sin disco de pago, base de datos externa ni consumo de IA.

**Todavía no existe una URL de este despliegue.** Guardar o subir esta configuración a GitHub no crea una cuenta de Render ni un servicio. La activación requiere que el propietario conecte su GitHub en Render. Esta sesión no tiene una identidad ni credencial de Render con la que completar ese paso.

## Activación

1. Abre [Desplegar Nexo EHS en Render](https://render.com/deploy?repo=https%3A%2F%2Fgithub.com%2Fmmondragon-maker%2FSeguridad-y-Salud-en-el-trabajo).
2. Inicia sesión o crea una cuenta en Render y permite acceso a este repositorio de GitHub. Si el repositorio es privado, selecciona explícitamente su acceso.
3. Revisa el servicio `nexo-ehs-pruebas`: debe mostrar el plan **Free**. La configuración no solicita recursos de pago. Si el proveedor no ofrece ese plan en tu cuenta, no selecciones una alternativa de pago para seguir esta guía.
4. Confirma la creación del Blueprint. Espera a que termine el build y el servicio indique que está disponible.
5. Abre la dirección HTTPS que Render asignó al servicio. Esa será la dirección del sitio; no se puede determinar ni verificar antes de crear el servicio.

Las denominaciones exactas de los controles pueden variar. No se requiere activar facturación de Google, comprar un dominio ni configurar una clave de IA para el piloto. Las condiciones, cuotas y disponibilidad del plan gratuito son las vigentes del proveedor, consultables en [Render Free](https://render.com/docs/free) y [precios](https://render.com/pricing).

## Entrar

El navegador pedirá credenciales. El usuario es `piloto`. La contraseña se genera en Render mediante `generateValue: true`: consulta `EHS_PILOT_PASSWORD` en las variables privadas del servicio. No la guardes en GitHub ni la compartas por chat. La contraseña compartida protege este piloto; no proporciona cuentas individuales ni roles.

## Qué queda guardado

- **Código y modificaciones:** en GitHub. `autoDeploy: true` permite que los cambios subidos a `main` desencadenen otra compilación y actualización del sitio.
- **Datos de prueba:** SQLite en el almacenamiento temporal del servicio. Pueden perderse al reiniciar, volver a desplegar o reemplazar la instancia. La interfaz muestra un aviso permanente en este modo.
- **Disponibilidad:** el servicio gratuito está sujeto a las cuotas, suspensión por inactividad y tiempos de arranque del proveedor. No es un servicio permanente garantizado.

Usa exclusivamente datos ficticios. El piloto incluye trabajadores y cursos ficticios; los DC-3 son borradores. No contiene un corpus jurídico validado ni IA generativa activada. El almacenamiento persistente multiusuario requiere otro diseño o un servicio adicional; no se ha contratado.

## Validar la dirección final

Cuando esté creado, revisar la URL real:

1. `/api/health` debe responder con `status: ok` y `temporaryData: true`.
2. La interfaz y los datos deben pedir credenciales.
3. Al entrar, deben aparecer el dashboard y el aviso de prueba temporal.
4. Guardar un trabajador ficticio y una evaluación HAZOP; comprobar los registros y generar un borrador DC-3.
5. Verificar en Render que el siguiente despliegue corresponde al commit de GitHub esperado.

Una prueba local o una imagen construida no sustituyen estas comprobaciones en la URL del proveedor. No se debe afirmar que el alojamiento está completo hasta realizar la activación y verificar esa URL.

## Verificación realizada antes de subir esta configuración

Pasaron la compilación, los tipos y las diez pruebas del servidor. La imagen Docker se construyó con verificación TLS y se ejecutó con 512 MB de memoria y una CPU. En navegador se verificaron la interfaz, los seis módulos, el registro de una persona ficticia, el acceso con contraseña, el aviso de datos temporales y la vista móvil. Al reemplazar la instancia se comprobó el reinicio de los datos, coherente con el almacenamiento temporal. Se retiraron los contenedores de prueba.

Estas verificaciones corresponden al entorno de desarrollo. El servicio de Render y su dirección pública siguen pendientes de activar en la cuenta del propietario.
