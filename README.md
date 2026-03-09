# Sistema de Login con MariaDB y Subida de Archivos Excel

Este es un sistema completo de autenticación de usuarios con Node.js, Express y MariaDB, que incluye funcionalidad para subir y procesar archivos Excel.

## Características

- ✅ Registro de usuarios con validación
- ✅ Inicio de sesión seguro con contraseñas hasheadas
- ✅ Sesiones de usuario
- ✅ Dashboard protegido
- ✅ **Subida de archivos Excel** con datos de boletas, nombres y correos
- ✅ **Procesamiento automático** de archivos Excel
- ✅ **Visualización de datos** con búsqueda y paginación
- ✅ **Almacenamiento asociado** al usuario que subió los datos
- ✅ Interfaz responsive
- ✅ Conexión a base de datos MariaDB

## Funcionalidad de Excel

### Formato de Archivo Esperado
El sistema acepta archivos Excel (.xlsx, .xls) con las siguientes columnas:
- **Boleta**: Código alfanumérico de boleta (puede contener números, letras, guiones y puntos)
- **Nombre**: Nombre(s) del estudiante
- **Apellido Paterno**: Apellido paterno del estudiante
- **Apellido Materno**: Apellido materno del estudiante
- **Grupo**: Grupo o clase asignada

**Nota**: La primera fila debe contener los encabezados. El sistema es flexible con los nombres de las columnas, acepta variaciones como:
- Boleta: "boleta", "numero", "id", "codigo"
- Nombre: "nombre", "name", "nombres"
- Apellido Paterno: "apellido paterno", "paterno", "ap paterno"
- Apellido Materno: "apellido materno", "materno", "ap materno"
- Grupo: "grupo", "class", "clase", "seccion"

### Ejemplos de Boletas Válidas
- Numéricas: `12345`, `987654321`
- Alfanuméricas: `A12345`, `EST-2024-001`, `B.123.456`
- Con guiones: `2024-ENE-123`, `A-12345-B`

### Estructura de Excel Esperada

```
| Boleta      | Nombre  | Apellido Paterno | Apellido Materno | Grupo     |
|-------------|---------|------------------|------------------|----------|
| A12345      | Juan    | Pérez           | García           | 3A       |
| B-67890     | María   | López           | Martínez         | 2B       |
| 2024-001    | Ana     | Silva           | Rodríguez        | 1C       |
| EST.123     | Pedro   | González        | Fernández        | 3A       |
```

### Nuevas Rutas
| Método | Endpoint | Descripción |
|--------|----------|-------------|
| GET    | `/upload-excel` | Página para subir archivos Excel |
| GET    | `/view-excel-data` | Página para ver datos procesados |
| POST   | `/api/upload-excel` | Procesar archivo Excel |
| GET    | `/api/excel-data` | Obtener datos de Excel del usuario |

## Personalización

Para personalizar la aplicación:

1. **Cambiar estilos:** Edita `public/styles.css`
2. **Agregar campos:** Modifica la tabla de usuarios y los formularios
3. **Agregar funcionalidades:** Extiende el dashboard en `dashboard.html`

## Solución de Problemas

### Error de conexión a MariaDB:
- Verifica que MariaDB esté corriendo: `sudo systemctl status mariadb`
- Revisa las credenciales de la base de datos
- Asegúrate de que la base de datos `login_db` existe

### Puerto ocupado:
- Cambia el puerto en `server.js`: `const PORT = 3001;`

### Dependencias faltantes:
- Ejecuta: `npm install`

## Contribuir

Si encuentras algún problema o quieres agregar funcionalidades:

1. Haz fork del proyecto
2. Crea una rama para tu feature
3. Haz commit de tus cambios
4. Haz push a la rama
5. Abre un Pull Request

## Licencia

MIT License