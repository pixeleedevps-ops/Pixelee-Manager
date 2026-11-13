# SUPABASE_SCHEMA_MAP.md
# PIXELÉE MANAGER

> Documento técnico y funcional de referencia de Pixelée Manager.
>
> **Fuente de estructura:** inspección directa del catálogo PostgreSQL del proyecto Supabase.
>
> **Proyecto:** `pyboszwmrzvzzpekmeps`  
> **Región:** `us-west-2`  
> **Motor:** PostgreSQL  
> **Esquema principal:** `public`  
> **Moneda de referencia:** COP  
> **Backend:** Node.js + Express  
> **Frontend:** aplicación web conectada mediante API.
>
> **Importante:** los nombres de las tablas y columnas de este documento corresponden a los identificadores encontrados en la base de datos durante la inspección. No deben traducirse, renombrarse ni modificarse al desarrollar funcionalidades.

---

## 1. Objetivo

Este documento centraliza la estructura y el funcionamiento de la base de datos de Pixelée Manager.

Debe servir como referencia para:

- Desarrollar módulos nuevos.
- Crear endpoints en Express.
- Consultar y actualizar registros.
- Construir formularios y componentes del frontend.
- Implementar permisos según el perfil del usuario.
- Consultar información financiera.
- Gestionar clientes, proyectos y colaboradores.
- Crear migraciones.
- Mantener las relaciones entre tablas.
- Evitar duplicación de información.

### 1.1 Reglas fundamentales

1. Utilizar los nombres exactos de las tablas y columnas.
2. No crear columnas por suposición.
3. No modificar el esquema sin una migración justificada.
4. Verificar las relaciones antes de insertar o eliminar registros.
5. No duplicar información que ya esté relacionada.
6. No registrar pagos que no se hayan recibido.
7. Diferenciar los valores contratados, facturados y recaudados.
8. Realizar los cálculos financieros en el backend.
9. Validar los permisos antes de ejecutar operaciones.
10. Mantener la integridad de las claves foráneas.
11. Verificar los cambios después de cada migración.

---

## 2. Inventario actual de tablas

La inspección actual encontró las siguientes tablas en el esquema `public`.

| Tabla | Columnas | Módulo |
|---|---:|---|
| `areas` | 6 | Organización |
| `bonificaciones` | 11 | Finanzas |
| `campanas` | 11 | Marketing |
| `catalogo_servicios` | 8 | Configuración |
| `clientes` | 18 | Clientes |
| `contactos` | 10 | Clientes |
| `contratos` | 12 | Contratos |
| `costos_proyecto` | 9 | Finanzas |
| `cotizaciones` | 15 | Comercial |
| `cuentas_alojamiento` | 14 | Operaciones |
| `detalle_cotizaciones` | 9 | Comercial |
| `detalle_distribucion_utilidades` | 7 | Finanzas |
| `distribuciones_utilidades` | 9 | Finanzas |
| `documentos` | 9 | Documentos |
| `dominios` | 13 | Operaciones |
| `encuestas` | 9 | Soporte |
| `entregas` | 11 | Proyectos |
| `facturas` | 13 | Finanzas |
| `gastos` | 12 | Finanzas |
| `gastos_adicionales` | 11 | Finanzas |
| `historial_proyectos` | 6 | Proyectos |
| `incidencias` | 12 | Soporte |
| `metricas_campanas` | 11 | Marketing |
| `pagos` | 14 | Finanzas |
| `perfiles` | 8 | Usuarios |
| `perfiles_areas` | 5 | Organización |
| `planes_mantenimiento` | 13 | Operaciones |
| `prospectos` | 14 | Comercial |
| `proyectos` | 19 | Proyectos |
| `proyectos_integrantes` | 6 | Proyectos |
| `registros_actividad` | 8 | Auditoría |
| `registros_horas` | 9 | Proyectos |
| `renovaciones` | 11 | Operaciones |
| `retiros` | 8 | Finanzas |
| `schema_migrations` | 2 | Infraestructura |
| `seguimientos` | 12 | Comercial |
| `servicios_proyecto` | 10 | Proyectos |
| `sitios_web` | 14 | Operaciones |
| `tareas` | 13 | Proyectos |
| `tickets_soporte` | 14 | Soporte |

**Total: 40 tablas**, incluyendo `schema_migrations`, que es una tabla técnica de control de migraciones.

---

## 3. Diccionario de tablas y columnas

Los siguientes nombres son los campos encontrados en la estructura actual. Se conserva la nomenclatura original, incluso cuando alguna columna todavía está en inglés.

### 3.1 Organización y usuarios

#### `areas`

Administra las áreas de trabajo de Pixelée.

| Columna | Función |
|---|---|
| `id` | Identificador del área |
| `codigo` | Código del área |
| `nombre` | Nombre del área |
| `descripcion` | Descripción |
| `activa` | Indica si el área está activa |
| `fecha_creacion` | Fecha de creación |

#### `perfiles`

Contiene los perfiles de los usuarios registrados en el sistema.

| Columna | Función |
|---|---|
| `id` | Identificador del perfil |
| `full_name` | Nombre completo |
| `email` | Correo electrónico |
| `phone` | Teléfono |
| `role` | Rol del usuario |
| `is_active` | Estado de activación |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

**Nota:** esta tabla conserva actualmente cinco columnas con nombres en inglés. No se deben reemplazar por traducciones en consultas o código.

#### `perfiles_areas`

Relaciona perfiles con las áreas a las que pertenecen.

| Columna | Función |
|---|---|
| `id` | Identificador de la asignación |
| `perfil_id` | Perfil relacionado |
| `area_id` | Área relacionada |
| `asignado_por` | Perfil que realizó la asignación |
| `fecha_asignacion` | Fecha de asignación |

Un perfil puede estar relacionado con varias áreas mediante esta tabla.

#### `proyectos_integrantes`

Relaciona los integrantes del equipo con los proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `perfil_id` | Integrante asignado |
| `asignado_por` | Persona que realizó la asignación |
| `fecha_asignacion` | Fecha de asignación |
| `observaciones` | Notas de la asignación |

### 3.2 Clientes y contactos

#### `clientes`

Almacena la información principal de los clientes de Pixelée.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `codigo_cliente` | Código único del cliente |
| `nombre_empresa` | Nombre de la empresa o cliente |
| `tipo_cliente` | Persona o empresa |
| `tipo_documento` | Tipo de documento |
| `numero_documento` | Número de documento |
| `correo_electronico` | Correo electrónico |
| `telefono` | Teléfono |
| `sitio_web` | Sitio web del cliente |
| `direccion` | Dirección |
| `ciudad` | Ciudad |
| `pais` | País |
| `sector_economico` | Sector económico |
| `estado` | Estado del cliente |
| `observaciones` | Notas adicionales |
| `creado_por` | Perfil que creó el registro |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `contactos`

Almacena las personas de contacto asociadas a cada cliente.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `nombre_completo` | Nombre de la persona |
| `cargo` | Cargo |
| `correo_electronico` | Correo electrónico |
| `telefono` | Teléfono |
| `es_contacto_principal` | Indica si es el contacto principal |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

### 3.3 Gestión comercial

#### `prospectos`

Registra personas o empresas interesadas en contratar servicios.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `nombre_empresa` | Empresa del prospecto |
| `nombre_contacto` | Persona de contacto |
| `correo_electronico` | Correo |
| `telefono` | Teléfono |
| `origen` | Origen del prospecto |
| `servicio_interes` | Servicio de interés |
| `valor_estimado` | Valor estimado de oportunidad |
| `estado` | Estado comercial |
| `asignado_a` | Perfil responsable |
| `cliente_convertido_id` | Cliente creado al convertir el prospecto |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `seguimientos`

Registra las actividades comerciales relacionadas con prospectos, clientes o cotizaciones.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `prospecto_id` | Prospecto relacionado |
| `cliente_id` | Cliente relacionado |
| `cotizacion_id` | Cotización relacionada |
| `asignado_a` | Responsable |
| `fecha_seguimiento` | Fecha programada |
| `canal` | Canal de contacto |
| `descripcion` | Descripción del seguimiento |
| `estado` | Estado |
| `resultado` | Resultado |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `cotizaciones`

Almacena las cotizaciones comerciales.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `prospecto_id` | Prospecto relacionado |
| `cliente_id` | Cliente relacionado |
| `numero_cotizacion` | Número de cotización |
| `fecha_emision` | Fecha de emisión |
| `fecha_vencimiento` | Fecha de vencimiento |
| `subtotal` | Subtotal |
| `valor_impuestos` | Impuestos |
| `valor_total` | Total |
| `estado` | Estado de la cotización |
| `url_cotizacion` | Enlace al documento |
| `asignado_a` | Responsable |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `detalle_cotizaciones`

Contiene los conceptos y servicios incluidos en cada cotización.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cotizacion_id` | Cotización relacionada |
| `servicio_id` | Servicio del catálogo |
| `descripcion` | Descripción del concepto |
| `cantidad` | Cantidad |
| `precio_unitario` | Precio unitario |
| `subtotal` | Subtotal del concepto |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `catalogo_servicios`

Catálogo de servicios que ofrece Pixelée.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `nombre` | Nombre del servicio |
| `categoria` | Categoría |
| `descripcion` | Descripción |
| `precio_base` | Precio de referencia |
| `esta_activo` | Disponibilidad del servicio |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

### 3.4 Proyectos y desarrollo

#### `proyectos`

Tabla central del módulo de proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `codigo_proyecto` | Código del proyecto |
| `cliente_id` | Cliente relacionado |
| `nombre_proyecto` | Nombre del proyecto |
| `tipo_proyecto` | Tipo de proyecto |
| `descripcion` | Descripción |
| `estado` | Estado general |
| `prioridad` | Prioridad |
| `fecha_contrato` | Fecha de contratación |
| `fecha_inicio` | Fecha de inicio |
| `fecha_entrega_estimada` | Fecha estimada de entrega |
| `fecha_entrega_real` | Fecha real de entrega |
| `valor_total` | Valor contratado del proyecto |
| `moneda` | Moneda |
| `responsable_id` | Responsable principal |
| `creado_por` | Perfil que creó el proyecto |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `servicios_proyecto`

Relaciona los servicios contratados con un proyecto.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `servicio_id` | Servicio del catálogo |
| `nombre_servicio` | Nombre del servicio |
| `descripcion` | Descripción |
| `cantidad` | Cantidad |
| `precio_unitario` | Precio unitario |
| `subtotal` | Subtotal |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `tareas`

Administra las actividades que deben realizarse dentro de cada proyecto.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `titulo` | Título de la tarea |
| `descripcion` | Descripción |
| `asignado_a` | Perfil responsable |
| `creado_por` | Perfil que creó la tarea |
| `prioridad` | Prioridad |
| `estado` | Estado |
| `fecha_inicio` | Fecha de inicio |
| `fecha_limite` | Fecha límite |
| `fecha_completado` | Fecha de finalización |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `entregas`

Registra los entregables de los proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `nombre_entrega` | Nombre del entregable |
| `descripcion` | Descripción |
| `url_entrega` | Enlace al entregable |
| `fecha_entrega` | Fecha de entrega |
| `estado` | Estado |
| `revisado_por` | Perfil que revisó |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `registros_horas`

Registra el tiempo dedicado a proyectos y tareas.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `tarea_id` | Tarea relacionada |
| `usuario_id` | Perfil que registró las horas |
| `fecha_trabajo` | Día trabajado |
| `horas` | Cantidad de horas |
| `descripcion` | Actividad realizada |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `historial_proyectos`

Conserva eventos y cambios relacionados con los proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `usuario_id` | Usuario responsable del evento |
| `tipo_evento` | Tipo de evento |
| `descripcion` | Descripción |
| `fecha_creacion` | Fecha del evento |

#### `contratos`

Registra los contratos asociados a los proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `numero_contrato` | Número del contrato |
| `url_contrato` | Enlace al documento |
| `fecha_firma` | Fecha de firma |
| `fecha_inicio` | Fecha de inicio |
| `fecha_finalizacion` | Fecha de finalización |
| `valor_contrato` | Valor del contrato |
| `estado` | Estado |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

### 3.5 Finanzas y contabilidad

#### `facturas`

Registra las facturas emitidas.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `numero_factura` | Número de factura |
| `fecha_emision` | Fecha de emisión |
| `fecha_vencimiento` | Fecha de vencimiento |
| `subtotal` | Subtotal |
| `valor_impuestos` | Impuestos |
| `valor_total` | Total |
| `estado` | Estado de la factura |
| `url_factura` | Enlace al documento |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `pagos`

Registra los pagos recibidos por Pixelée.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `cliente_id` | Cliente relacionado |
| `referencia_pago` | Referencia |
| `valor` | Valor recibido |
| `fecha_pago` | Fecha del pago |
| `metodo_pago` | Método de pago |
| `tipo_pago` | Tipo de pago |
| `estado` | Estado |
| `url_comprobante` | Enlace al comprobante |
| `observaciones` | Notas |
| `registrado_por` | Perfil que registró el pago |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `gastos`

Registra los gastos operativos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `categoria` | Categoría |
| `descripcion` | Descripción |
| `valor` | Importe |
| `fecha_gasto` | Fecha del gasto |
| `proveedor` | Proveedor |
| `metodo_pago` | Método de pago |
| `url_comprobante` | Enlace al comprobante |
| `registrado_por` | Perfil que registró el gasto |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `costos_proyecto`

Registra costos imputados directamente a los proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `tipo_costo` | Tipo de costo |
| `descripcion` | Descripción |
| `valor` | Importe |
| `fecha_costo` | Fecha del costo |
| `gasto_id` | Gasto relacionado, si existe |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `gastos_adicionales`

Registra gastos extraordinarios o adicionales.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `descripcion` | Descripción |
| `categoria` | Categoría |
| `monto` | Importe |
| `fecha_gasto` | Fecha del gasto |
| `url_comprobante` | Comprobante |
| `observaciones` | Notas |
| `creado_por` | Perfil que creó el registro |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `bonificaciones`

Registra bonificaciones asociadas a clientes o proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `valor` | Valor de la bonificación |
| `motivo` | Motivo |
| `estado` | Estado |
| `fecha_asignacion` | Fecha de asignación |
| `observaciones` | Notas |
| `creado_por` | Perfil que creó el registro |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `distribuciones_utilidades`

Registra las distribuciones de utilidades de Pixelée por periodo.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `periodo_inicio` | Inicio del periodo |
| `periodo_fin` | Fin del periodo |
| `utilidad_total` | Utilidad total |
| `estado` | Estado |
| `observaciones` | Notas |
| `creado_por` | Perfil que creó la distribución |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `detalle_distribucion_utilidades`

Registra la participación individual de cada perfil en una distribución.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `distribucion_id` | Distribución relacionada |
| `perfil_id` | Integrante beneficiario |
| `porcentaje` | Porcentaje asignado |
| `monto` | Importe asignado |
| `estado` | Estado |
| `fecha_creacion` | Fecha de creación |

#### `retiros`

Registra los retiros realizados sobre las utilidades asignadas.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `detalle_distribucion_id` | Detalle de distribución relacionado |
| `perfil_id` | Perfil que recibe el retiro |
| `monto` | Valor retirado |
| `fecha_retiro` | Fecha del retiro |
| `observaciones` | Notas |
| `creado_por` | Perfil que registró el retiro |
| `fecha_creacion` | Fecha de creación |

### 3.6 Marketing

#### `campanas`

Registra las campañas de marketing.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `nombre` | Nombre de la campaña |
| `canal` | Canal de marketing |
| `objetivo` | Objetivo |
| `presupuesto` | Presupuesto |
| `fecha_inicio` | Fecha de inicio |
| `fecha_finalizacion` | Fecha de finalización |
| `estado` | Estado |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `metricas_campanas`

Registra las métricas de rendimiento de las campañas.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `campana_id` | Campaña relacionada |
| `inversion` | Inversión registrada |
| `impresiones` | Impresiones |
| `clics` | Clics |
| `prospectos` | Prospectos generados |
| `conversiones` | Conversiones |
| `fecha_registro` | Fecha de registro de métricas |
| `observaciones` | Notas |
| `creado_por` | Perfil que registró los datos |
| `fecha_creacion` | Fecha de creación |

### 3.7 Sitios web, dominios y hosting

#### `sitios_web`

Registra los sitios web administrados o desarrollados para los clientes.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `cuenta_alojamiento_id` | Cuenta de hosting relacionada |
| `dominio_id` | Dominio relacionado |
| `nombre_sitio` | Nombre del sitio |
| `url_sitio` | URL pública |
| `entorno` | Entorno |
| `plataforma` | Plataforma tecnológica |
| `estado` | Estado |
| `url_administracion` | URL administrativa |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `dominios`

Registra los dominios de los clientes.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `nombre_dominio` | Nombre del dominio |
| `registrador` | Proveedor o registrador |
| `fecha_registro` | Fecha de registro |
| `fecha_vencimiento` | Fecha de vencimiento |
| `costo_renovacion` | Costo de renovación |
| `renovacion_automatica` | Indica si se renueva automáticamente |
| `estado` | Estado |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `cuentas_alojamiento`

Registra las cuentas y servicios de hosting.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proveedor` | Proveedor de hosting |
| `nombre_cuenta` | Nombre de la cuenta |
| `nombre_plan` | Plan contratado |
| `tipo_servidor` | Tipo de servidor |
| `url_panel` | URL del panel |
| `fecha_renovacion` | Fecha de renovación |
| `valor` | Valor |
| `moneda` | Moneda |
| `estado` | Estado |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `renovaciones`

Registra las fechas y valores de renovación de dominios y servicios de alojamiento.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `dominio_id` | Dominio relacionado |
| `cuenta_alojamiento_id` | Cuenta de hosting relacionada |
| `tipo_renovacion` | Tipo de renovación |
| `fecha_vencimiento` | Fecha de vencimiento |
| `fecha_renovacion` | Fecha de renovación realizada |
| `valor` | Valor de renovación |
| `estado` | Estado |
| `observaciones` | Notas |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `planes_mantenimiento`

Registra los planes de mantenimiento contratados por los clientes.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `sitio_web_id` | Sitio web relacionado |
| `nombre_plan` | Nombre del plan |
| `descripcion` | Descripción |
| `frecuencia` | Frecuencia del servicio |
| `fecha_inicio` | Fecha de inicio |
| `fecha_finalizacion` | Fecha de finalización |
| `valor` | Valor |
| `estado` | Estado |
| `fecha_proximo_servicio` | Próxima fecha de servicio |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

### 3.8 Documentos

#### `documentos`

Almacena referencias a archivos relacionados con clientes o proyectos.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `tipo_documento` | Tipo de documento |
| `nombre_documento` | Nombre |
| `url_archivo` | Enlace al archivo |
| `cargado_por` | Perfil que registró el documento |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

La estructura permite relacionar el documento con un cliente o con un proyecto.

### 3.9 Soporte

#### `tickets_soporte`

Registra solicitudes de soporte realizadas por clientes.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `sitio_web_id` | Sitio web relacionado |
| `asignado_a` | Perfil responsable |
| `asunto` | Asunto |
| `descripcion` | Descripción |
| `categoria` | Categoría |
| `prioridad` | Prioridad |
| `estado` | Estado |
| `fecha_apertura` | Fecha de apertura |
| `fecha_cierre` | Fecha de cierre |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `incidencias`

Registra incidencias técnicas relacionadas con proyectos o sitios web.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `proyecto_id` | Proyecto relacionado |
| `sitio_web_id` | Sitio web relacionado |
| `reportado_por` | Perfil que reportó |
| `asignado_a` | Perfil responsable |
| `titulo` | Título |
| `descripcion` | Descripción |
| `gravedad` | Nivel de gravedad |
| `estado` | Estado |
| `fecha_resolucion` | Fecha de resolución |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

#### `encuestas`

Registra encuestas y calificaciones de clientes.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `cliente_id` | Cliente relacionado |
| `proyecto_id` | Proyecto relacionado |
| `ticket_soporte_id` | Ticket relacionado |
| `calificacion` | Calificación |
| `comentarios` | Comentarios |
| `fecha_envio` | Fecha de envío |
| `fecha_creacion` | Fecha de creación |
| `fecha_actualizacion` | Última actualización |

### 3.10 Auditoría e infraestructura

#### `registros_actividad`

Registra acciones realizadas sobre los datos del sistema.

| Columna | Función |
|---|---|
| `id` | Identificador |
| `usuario_id` | Usuario que realizó la acción |
| `nombre_tabla` | Tabla afectada |
| `registro_id` | Registro afectado |
| `accion` | Tipo de acción |
| `datos_anteriores` | Datos anteriores |
| `datos_nuevos` | Datos nuevos |
| `fecha_creacion` | Fecha de la acción |

#### `schema_migrations`

Controla las migraciones aplicadas a la base de datos.

| Columna | Función |
|---|---|
| `filename` | Nombre del archivo de migración |
| `applied_at` | Fecha de aplicación |

Esta tabla es técnica y no debe tratarse como un módulo operativo del panel.

---

## 4. Relaciones entre tablas

Las relaciones siguientes se obtuvieron de las claves foráneas existentes.

### 4.1 Clientes

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `contactos` | `cliente_id` | `clientes` | `id` |
| `proyectos` | `cliente_id` | `clientes` | `id` |
| `documentos` | `cliente_id` | `clientes` | `id` |
| `dominios` | `cliente_id` | `clientes` | `id` |
| `pagos` | `cliente_id` | `clientes` | `id` |
| `facturas` | `cliente_id` | `clientes` | `id` |
| `cuentas_alojamiento` | `cliente_id` | `clientes` | `id` |
| `sitios_web` | `cliente_id` | `clientes` | `id` |
| `prospectos` | `cliente_convertido_id` | `clientes` | `id` |

### 4.2 Proyectos

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `contratos` | `proyecto_id` | `proyectos` | `id` |
| `costos_proyecto` | `proyecto_id` | `proyectos` | `id` |
| `servicios_proyecto` | `proyecto_id` | `proyectos` | `id` |
| `tareas` | `proyecto_id` | `proyectos` | `id` |
| `entregas` | `proyecto_id` | `proyectos` | `id` |
| `registros_horas` | `proyecto_id` | `proyectos` | `id` |
| `historial_proyectos` | `proyecto_id` | `proyectos` | `id` |
| `proyectos_integrantes` | `proyecto_id` | `proyectos` | `id` |
| `pagos` | `proyecto_id` | `proyectos` | `id` |
| `facturas` | `proyecto_id` | `proyectos` | `id` |
| `gastos` | `proyecto_id` | `proyectos` | `id` |
| `gastos_adicionales` | `proyecto_id` | `proyectos` | `id` |
| `sitios_web` | `proyecto_id` | `proyectos` | `id` |
| `dominios` | `proyecto_id` | `proyectos` | `id` |
| `incidencias` | `proyecto_id` | `proyectos` | `id` |
| `bonificaciones` | `proyecto_id` | `proyectos` | `id` |

### 4.3 Usuarios y áreas

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `perfiles_areas` | `perfil_id` | `perfiles` | `id` |
| `perfiles_areas` | `area_id` | `areas` | `id` |
| `proyectos_integrantes` | `perfil_id` | `perfiles` | `id` |
| `proyectos_integrantes` | `asignado_por` | `perfiles` | `id` |
| `proyectos` | `responsable_id` | `perfiles` | `id` |
| `proyectos` | `creado_por` | `perfiles` | `id` |
| `tareas` | `asignado_a` | `perfiles` | `id` |
| `tareas` | `creado_por` | `perfiles` | `id` |
| `registros_horas` | `usuario_id` | `perfiles` | `id` |
| `registros_actividad` | `usuario_id` | `perfiles` | `id` |

También existen relaciones con perfiles en pagos, gastos, documentos, entregas, cotizaciones, prospectos, seguimientos, incidencias, métricas de campañas y distribuciones de utilidades.

### 4.4 Finanzas

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `costos_proyecto` | `gasto_id` | `gastos` | `id` |
| `bonificaciones` | `cliente_id` | `clientes` | `id` |
| `bonificaciones` | `proyecto_id` | `proyectos` | `id` |
| `detalle_distribucion_utilidades` | `distribucion_id` | `distribuciones_utilidades` | `id` |
| `detalle_distribucion_utilidades` | `perfil_id` | `perfiles` | `id` |
| `retiros` | `detalle_distribucion_id` | `detalle_distribucion_utilidades` | `id` |
| `retiros` | `perfil_id` | `perfiles` | `id` |

### 4.5 Cotizaciones

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `detalle_cotizaciones` | `cotizacion_id` | `cotizaciones` | `id` |
| `detalle_cotizaciones` | `servicio_id` | `catalogo_servicios` | `id` |
| `cotizaciones` | `prospecto_id` | `prospectos` | `id` |
| `cotizaciones` | `cliente_id` | `clientes` | `id` |
| `seguimientos` | `cotizacion_id` | `cotizaciones` | `id` |

### 4.6 Operaciones

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `sitios_web` | `dominio_id` | `dominios` | `id` |
| `sitios_web` | `cuenta_alojamiento_id` | `cuentas_alojamiento` | `id` |
| `renovaciones` | `dominio_id` | `dominios` | `id` |
| `renovaciones` | `cuenta_alojamiento_id` | `cuentas_alojamiento` | `id` |
| `planes_mantenimiento` | `sitio_web_id` | `sitios_web` | `id` |
| `planes_mantenimiento` | `cliente_id` | `clientes` | `id` |

### 4.7 Marketing y soporte

| Tabla origen | Columna | Tabla destino | Columna |
|---|---|---|---|
| `metricas_campanas` | `campana_id` | `campanas` | `id` |
| `encuestas` | `ticket_soporte_id` | `tickets_soporte` | `id` |
| `encuestas` | `sitio_web_id` | No aplica | No existe esa columna en la relación |
| `tickets_soporte` | `sitio_web_id` | `sitios_web` | `id` |
| `incidencias` | `sitio_web_id` | `sitios_web` | `id` |

---

## 5. Reglas funcionales del negocio

Esta sección reúne las referencias funcionales definidas para Pixelée. Estas reglas describen cómo debe comportarse el sistema y no sustituyen las restricciones SQL.

### 5.1 Clientes y prospectos

- Un prospecto no es necesariamente un cliente.
- Un prospecto puede convertirse en cliente mediante `cliente_convertido_id`.
- Los clientes pueden tener varios contactos.
- Los clientes pueden tener varios proyectos.
- Los clientes pueden tener dominios, sitios web, hosting y planes de mantenimiento.
- Los registros comerciales deben conservar su relación con el responsable asignado.

### 5.2 Proyectos

- Cada proyecto pertenece a un cliente.
- Los proyectos pueden tener varios integrantes.
- Un integrante puede participar en diferentes proyectos.
- Los proyectos tienen un responsable principal.
- Las tareas deben estar relacionadas con un proyecto.
- Los entregables deben relacionarse con el proyecto correspondiente.
- Las horas trabajadas deben asociarse a un proyecto y, cuando corresponda, a una tarea.
- El estado del proyecto no debe confundirse con su estado financiero.

### 5.3 Equipo y áreas

- La pertenencia a áreas se administra mediante `perfiles_areas`.
- Un perfil puede pertenecer a varias áreas.
- La participación en proyectos se administra mediante `proyectos_integrantes`.
- Los permisos deben validarse en el backend.
- La asignación a un proyecto no implica acceso automático a toda la información financiera.

### 5.4 Cotizaciones

- Una cotización puede estar relacionada con un prospecto o un cliente.
- Los conceptos de la cotización se almacenan en `detalle_cotizaciones`.
- Los servicios se pueden relacionar con `catalogo_servicios`.
- El precio del catálogo es una referencia y no necesariamente el precio final negociado.
- El total de una cotización debe corresponder a sus conceptos, impuestos y descuentos aplicables.

### 5.5 Facturas y pagos

- Una factura representa un documento de cobro.
- Un pago representa dinero recibido.
- Una factura pendiente no significa que el dinero haya sido recaudado.
- Los pagos confirmados son los que deben incluirse en el recaudo efectivo.
- Los pagos rechazados o pendientes no deben sumarse como ingresos recibidos.
- Los pagos deben estar relacionados con el cliente y proyecto correspondientes.

### 5.6 Gastos y costos

- `gastos` registra los gastos operativos.
- `costos_proyecto` registra los costos imputados a proyectos.
- `gastos_adicionales` registra gastos extraordinarios.
- Cuando un registro de `costos_proyecto` referencia un gasto mediante `gasto_id`, no se debe contabilizar dos veces el mismo movimiento.
- Los comprobantes deben conservarse mediante sus enlaces correspondientes.

### 5.7 Utilidades y retiros

- `distribuciones_utilidades` registra el periodo y el total de utilidad distribuida.
- `detalle_distribucion_utilidades` registra los porcentajes e importes asignados a cada perfil.
- `retiros` registra los valores efectivamente retirados.
- Una utilidad asignada no significa que ya haya sido retirada.
- Los retiros deben descontarse del saldo disponible de la participación correspondiente.

### 5.8 Dominios, hosting y mantenimiento

- `dominios` almacena información de los dominios.
- `cuentas_alojamiento` almacena los servicios de hosting.
- `sitios_web` relaciona los sitios con clientes, proyectos, dominios y hosting.
- `renovaciones` permite controlar vencimientos y pagos de renovación.
- `planes_mantenimiento` registra los servicios de mantenimiento contratados.
- Una renovación pendiente no debe registrarse como pagada.

### 5.9 Marketing

- `campanas` contiene la información general y el presupuesto.
- `metricas_campanas` almacena la inversión y los resultados registrados.
- El presupuesto de una campaña no debe confundirse con su inversión real.
- Las métricas deben conservar su fecha de registro.
- No se debe asumir una integración automática con plataformas publicitarias si no está implementada.

---

## 6. Reglas financieras para el backend

Los cálculos deben realizarse en el backend utilizando los datos reales de las tablas.

### 6.1 Valor contratado

El valor contratado se obtiene de la información de los proyectos y contratos.

Se debe evitar sumar `proyectos.valor_total` y `contratos.valor_contrato` para el mismo proyecto, ya que podrían representar el mismo valor comercial.

### 6.2 Recaudo confirmado

El recaudo se calcula a partir de `pagos.valor`, considerando únicamente los pagos con estado confirmado.

### 6.3 Total facturado

El valor facturado se calcula desde `facturas.valor_total`, excluyendo las facturas anuladas.

No debe sumarse el total facturado al recaudo.

### 6.4 Saldo pendiente

`Saldo pendiente = Valor contratado - Recaudo confirmado`

El cálculo debe hacerse por proyecto y después consolidarse para los indicadores generales.

### 6.5 Gastos y costos

Se deben considerar las tablas:

- `gastos`
- `costos_proyecto`
- `gastos_adicionales`

Se debe revisar `costos_proyecto.gasto_id` para evitar duplicar gastos relacionados.

### 6.6 Utilidad

La utilidad debe calcularse con base en los ingresos y gastos que correspondan al periodo.

No debe considerarse como ingreso un pago pendiente ni como retiro una distribución que todavía no se ha entregado.

### 6.7 Moneda

- Los valores monetarios deben mantener su precisión decimal.
- La moneda de referencia del negocio es COP.
- `proyectos.moneda` y `cuentas_alojamiento.moneda` deben respetarse cuando se consulten registros.
- El frontend debe limitarse a presentar los valores calculados por el backend.

---

## 7. Seguridad, autenticación y permisos

### 7.1 Perfiles

La tabla `perfiles` contiene la información del usuario y su rol.

La columna `id` identifica el perfil y debe conservar la relación de autenticación correspondiente.

Los valores de `role` deben consultarse en las restricciones actuales de la base de datos y en la implementación del backend. No se deben inventar roles ni asumir equivalencias.

### 7.2 Áreas

La relación entre perfiles y áreas se administra con:

- `perfiles`
- `areas`
- `perfiles_areas`

La pertenencia a un área no sustituye la validación de permisos.

### 7.3 Proyectos

La relación entre proyectos e integrantes se administra mediante `proyectos_integrantes`.

El backend debe validar que el usuario tenga autorización para consultar o modificar cada proyecto.

### 7.4 Reglas de seguridad

1. No exponer credenciales privadas en el frontend.
2. No permitir que el frontend determine su propio rol.
3. Obtener el perfil autenticado desde una fuente confiable.
4. Validar el estado activo del usuario.
5. Validar los permisos en cada endpoint.
6. Validar la pertenencia a proyectos cuando corresponda.
7. Restringir los datos financieros a los perfiles autorizados.
8. Mantener registros de auditoría.
9. No confiar únicamente en la interfaz para proteger operaciones.

### 7.5 RLS

El estado de RLS y las políticas deben verificarse directamente en PostgreSQL.

No se debe asumir que una tabla está protegida solo porque tenga RLS activado. También se debe comprobar qué políticas existen y qué permisos tiene el rol de conexión utilizado por el backend.

---

## 8. Auditoría y automatizaciones

Las tablas de auditoría y los triggers permiten mantener un registro de cambios.

### 8.1 `registros_actividad`

Debe utilizarse para consultar acciones realizadas sobre los registros.

Campos importantes:

- `usuario_id`
- `nombre_tabla`
- `registro_id`
- `accion`
- `datos_anteriores`
- `datos_nuevos`
- `fecha_creacion`

### 8.2 Fechas de actualización

Varias tablas incluyen:

- `fecha_creacion`
- `fecha_actualizacion`

Cuando una tabla cuenta con trigger de actualización, se debe permitir que PostgreSQL gestione la fecha automáticamente.

No se deben duplicar automatizaciones sin revisar los triggers existentes.

### 8.3 Historial de proyectos

`historial_proyectos` permite conservar eventos relacionados con cada proyecto y consultar su evolución.

---

## 9. Documentos y archivos

Las tablas almacenan enlaces a archivos y documentos.

| Tabla | Columna | Uso |
|---|---|---|
| `documentos` | `url_archivo` | Documento del cliente o proyecto |
| `contratos` | `url_contrato` | Contrato |
| `cotizaciones` | `url_cotizacion` | Cotización |
| `facturas` | `url_factura` | Factura |
| `pagos` | `url_comprobante` | Comprobante de pago |
| `gastos` | `url_comprobante` | Comprobante de gasto |
| `gastos_adicionales` | `url_comprobante` | Comprobante de gasto adicional |
| `entregas` | `url_entrega` | Entregable |
| `sitios_web` | `url_sitio` | Sitio web |
| `sitios_web` | `url_administracion` | Acceso administrativo |
| `cuentas_alojamiento` | `url_panel` | Panel de hosting |

Los enlaces almacenados no garantizan por sí mismos que el archivo continúe disponible.

---

## 10. Reglas para desarrollar nuevas funcionalidades

Antes de crear una funcionalidad:

1. Identificar las tablas involucradas.
2. Verificar sus columnas.
3. Revisar los tipos de datos.
4. Comprobar si los campos permiten valores nulos.
5. Revisar los valores por defecto.
6. Consultar las claves foráneas.
7. Revisar las restricciones CHECK.
8. Comprobar los permisos del usuario.
9. Revisar si existen triggers que puedan ejecutar acciones adicionales.
10. Evitar duplicar registros.
11. Realizar las operaciones mediante el backend.
12. Verificar el resultado en Supabase.

### 10.1 Frontend

El frontend debe:

- Consumir los endpoints de Express.
- Mostrar información de acuerdo con los permisos del usuario.
- No conectarse directamente a PostgreSQL.
- No contener credenciales privadas.
- No decidir permisos de seguridad.
- Mostrar mensajes claros de validación.
- Presentar los importes sin alterar los valores almacenados.

### 10.2 Backend

El backend debe:

- Validar identidad y permisos.
- Validar campos obligatorios.
- Validar relaciones.
- Controlar duplicados.
- Gestionar errores.
- Ejecutar transacciones cuando varias operaciones deban completarse juntas.
- Registrar actividades importantes.
- Mantener la integridad de la información.

---

## 11. Consultas de inspección

Estas consultas permiten actualizar el documento cuando cambie el esquema.

### 11.1 Consultar tablas

```sql
SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;
```

### 11.2 Consultar columnas, tipos y valores por defecto

```sql
SELECT
    table_name,
    column_name,
    data_type,
    is_nullable,
    column_default,
    ordinal_position
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;
```

### 11.3 Consultar claves foráneas

```sql
SELECT
    tc.table_name,
    kcu.column_name,
    ccu.table_name AS tabla_referenciada,
    ccu.column_name AS columna_referenciada,
    rc.delete_rule
FROM information_schema.table_constraints tc
JOIN information_schema.key_column_usage kcu
    ON tc.constraint_name = kcu.constraint_name
   AND tc.table_schema = kcu.table_schema
JOIN information_schema.constraint_column_usage ccu
    ON ccu.constraint_name = tc.constraint_name
   AND ccu.constraint_schema = tc.constraint_schema
JOIN information_schema.referential_constraints rc
    ON rc.constraint_name = tc.constraint_name
   AND rc.constraint_schema = tc.constraint_schema
WHERE tc.constraint_type = 'FOREIGN KEY'
  AND tc.table_schema = 'public'
ORDER BY tc.table_name, kcu.column_name;
```

### 11.4 Consultar restricciones CHECK

```sql
SELECT
    conrelid::regclass AS tabla,
    conname AS nombre_restriccion,
    pg_get_constraintdef(oid) AS definicion
FROM pg_constraint
WHERE connamespace = 'public'::regnamespace
ORDER BY conrelid::regclass::text, conname;
```

### 11.5 Consultar políticas RLS

```sql
SELECT
    schemaname,
    tablename,
    policyname,
    permissive,
    roles,
    cmd,
    qual,
    with_check
FROM pg_policies
WHERE schemaname = 'public'
ORDER BY tablename, policyname;
```

### 11.6 Consultar estado RLS

```sql
SELECT
    relname AS tabla,
    relrowsecurity AS rls_habilitado,
    relforcerowsecurity AS rls_forzado
FROM pg_class
WHERE relnamespace = 'public'::regnamespace
  AND relkind = 'r'
ORDER BY relname;
```

### 11.7 Consultar triggers

```sql
SELECT
    event_object_table AS tabla,
    trigger_name AS trigger,
    event_manipulation AS evento,
    action_timing AS momento,
    action_statement AS ejecucion
FROM information_schema.triggers
WHERE trigger_schema = 'public'
ORDER BY event_object_table, trigger_name;
```

---

## 12. Información que no debe inventarse

Al desarrollar Pixelée Manager, no se debe asumir que:

- Una tabla tiene columnas que no aparecen en el diccionario actual.
- Un estado existe si no está permitido por la restricción correspondiente.
- Un usuario puede consultar un proyecto solo por pertenecer a un área.
- Un proyecto finalizado está completamente pagado.
- Una factura emitida representa dinero recibido.
- Un gasto y un costo de proyecto son siempre movimientos independientes.
- Un dominio renovado significa que el hosting también está renovado.
- Una distribución de utilidades equivale a un retiro.
- Las métricas de campañas están conectadas automáticamente con plataformas externas.
- Un enlace de documento garantiza que el archivo siga disponible.

Cuando una funcionalidad requiera información que no exista en el esquema, se debe proponer una modificación estructural y documentarla antes de implementarla.

---

## 13. Mantenimiento del documento

Este archivo debe actualizarse cada vez que se modifique la estructura de Supabase.

Se debe actualizar cuando:

- Se cree una tabla.
- Se elimine una tabla.
- Se agregue o elimine una columna.
- Se modifique un tipo de dato.
- Se cambie una clave foránea.
- Se agregue una restricción.
- Se modifique una política RLS.
- Se agregue o modifique un trigger.
- Se cambien las reglas funcionales del negocio.

### Fuente de verdad

La prioridad de información es:

1. Esquema actual de PostgreSQL.
2. Migraciones aplicadas.
3. Restricciones y relaciones reales.
4. Lógica implementada en el backend.
5. Este documento como referencia técnica y funcional.

Si existe una diferencia entre este documento y Supabase, prevalece la estructura real de PostgreSQL.

**Objetivo:** mantener Pixelée Manager consistente, seguro y escalable, utilizando una única estructura de datos y evitando nombres de columnas inventados, duplicaciones y errores en la gestión de proyectos y finanzas.