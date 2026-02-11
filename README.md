# Formulario de Inventario - Google Sheets

Formulario web tipo Google Form para llenar información de inventario directamente en una hoja de Google Sheets.

## Estructura del Proyecto

```
formulario/
├── index.html          # Formulario principal
├── css/
│   └── styles.css      # Estilos personalizados
├── js/
│   └── app.js          # Lógica del formulario
├── google-apps-script/
│   └── Code.gs         # Script para Google Apps Script
└── README.md           # Este archivo
```

## Configuración

### Paso 1: Configurar Google Apps Script

1. Abre tu Google Sheet: [Link](https://docs.google.com/spreadsheets/d/19liMdG9cbgL0dZvUkb2Ri77NCOO-BmAwBF_QWTLdDA8/edit)
2. Ve a **Extensiones > Apps Script**
3. Copia el contenido del archivo `google-apps-script/Code.gs` y pégalo en el editor
4. Haz clic en **Implementar > Nueva implementación**
5. Selecciona tipo: **Aplicación web**
6. Configura:
   - **Ejecutar como**: Tu cuenta
   - **Quién tiene acceso**: Cualquiera
7. Haz clic en **Implementar**
8. Copia la **URL de la aplicación web**

### Paso 2: Configurar el Formulario

1. Abre el archivo `js/app.js`
2. Reemplaza el valor de `SCRIPT_URL` con la URL copiada en el paso anterior
3. Abre `index.html` en tu navegador

## Uso

1. Ingresa el **código del punto** en el campo de búsqueda
2. Haz clic en **Buscar Punto**
3. Si el punto existe, se mostrará el nombre y podrás llenar la información
4. Completa los campos necesarios
5. Haz clic en **Enviar Datos**
6. Los datos se guardarán automáticamente en la fila correspondiente de Google Sheets

## Mapeo de Columnas

| Columna | Campo |
|---------|-------|
| B | Código del punto |
| E | Cant. Equipos |
| F | Actualización (si/no) |
| G | Versión Equipo (2.0.44) |
| H | Cámaras (si/no) |
| I | Cantidad de cámaras |
| J | Alarmas (si/no) |
| K | Serial Control |
| L | Visita 1 Semestre |
| M | Visita 2 Semestre |
| N | Observaciones |
| O | Hora Sincronizada |
| P | Días de grabación |
| Q | Num # Línea |
| R | ICCID |
| S | Estado (activa/inactiva) |
| T | DIRECTV (si/no) |
| U | Cant. Deco |
| V | Serial Deco |
| W | Serial Tarjeta |

## Notas

- Los datos se llenan a partir de la fila 7 en la hoja de cálculo
- El formulario busca el código del punto en la columna B para posicionarse en la fila correcta
- La hora sincronizada se captura automáticamente al momento del envío
