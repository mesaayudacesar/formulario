// ===========================================
// Google Apps Script - Formulario de Inventario
// ===========================================
// Este script se despliega como Aplicación Web
// para recibir datos del formulario HTML y escribirlos
// en la hoja de Google Sheets correspondiente.
// ===========================================

// ID de la hoja de cálculo
var SPREADSHEET_ID = '19liMdG9cbgL0dZvUkb2Ri77NCOO-BmAwBF_QWTLdDA8';

// Nombre de la hoja (pestaña) - ajustar si es diferente
var NOMBRE_HOJA = 'Hoja 1';

// Fila donde empiezan los datos
var FILA_INICIO = 7;

/**
 * Maneja las solicitudes GET (para búsqueda de puntos)
 */
function doGet(e) {
  var resultado;
  
  try {
    var accion = e.parameter.accion;
    
    if (accion === 'buscar') {
      resultado = buscarPunto(e.parameter.codigo);
    } else if (accion === 'obtenerPuntos') {
      resultado = obtenerTodosLosPuntos();
    } else {
      resultado = { exito: false, mensaje: 'Acción no válida' };
    }
  } catch (error) {
    resultado = { exito: false, mensaje: 'Error: ' + error.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Maneja las solicitudes POST (para enviar datos)
 */
function doPost(e) {
  var resultado;
  
  try {
    var datos = JSON.parse(e.postData.contents);
    resultado = actualizarFila(datos);
  } catch (error) {
    resultado = { exito: false, mensaje: 'Error al procesar datos: ' + error.toString() };
  }
  
  return ContentService.createTextOutput(JSON.stringify(resultado))
    .setMimeType(ContentService.MimeType.JSON);
}

/**
 * Busca un punto por su código en la columna B
 * Retorna la información de la fila encontrada
 */
function buscarPunto(codigo) {
  if (!codigo) {
    return { exito: false, mensaje: 'Debe ingresar un código de punto' };
  }
  
  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NOMBRE_HOJA);
  
  if (!hoja) {
    // Intentar con la primera hoja si no encuentra por nombre
    hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  }
  
  var ultimaFila = hoja.getLastRow();
  
  // Buscar el código en la columna B (columna 2) desde la fila de inicio
  var rangoCodigos = hoja.getRange(FILA_INICIO, 2, ultimaFila - FILA_INICIO + 1, 1).getValues();
  
  for (var i = 0; i < rangoCodigos.length; i++) {
    var valorCelda = String(rangoCodigos[i][0]).trim();
    var codigoBuscado = String(codigo).trim();
    
    if (valorCelda === codigoBuscado) {
      var filaEncontrada = FILA_INICIO + i;
      
      // Obtener todos los datos de esa fila (columnas A hasta W = 23 columnas)
      var datosFila = hoja.getRange(filaEncontrada, 1, 1, 23).getValues()[0];
      
      return {
        exito: true,
        fila: filaEncontrada,
        datos: {
          codigoPunto: datosFila[1],   // B
          nombrePunto: datosFila[2],    // C - nombre del punto si existe
          cantEquipos: datosFila[4],    // E
          actualizacion: datosFila[5],  // F
          versionEquipo: datosFila[6],  // G
          camaras: datosFila[7],        // H
          cantCamaras: datosFila[8],    // I
          alarmas: datosFila[9],        // J
          serialControl: datosFila[10], // K
          visita1: datosFila[11],       // L
          visita2: datosFila[12],       // M
          observaciones: datosFila[13], // N
          horaSincronizada: datosFila[14], // O
          diasGrabacion: datosFila[15], // P
          numLinea: datosFila[16],      // Q
          iccid: datosFila[17],         // R
          estado: datosFila[18],        // S
          directv: datosFila[19],       // T
          cantDeco: datosFila[20],      // U
          serialDeco: datosFila[21],    // V
          serialTarjeta: datosFila[22]  // W
        }
      };
    }
  }
  
  return { exito: false, mensaje: 'No se encontró el código de punto: ' + codigo };
}

/**
 * Obtiene todos los códigos de puntos disponibles para el autocompletado
 */
function obtenerTodosLosPuntos() {
  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NOMBRE_HOJA);
  
  if (!hoja) {
    hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  }
  
  var ultimaFila = hoja.getLastRow();
  
  if (ultimaFila < FILA_INICIO) {
    return { exito: true, puntos: [] };
  }
  
  // Obtener códigos (B) y nombres (C) desde la fila de inicio
  var rango = hoja.getRange(FILA_INICIO, 2, ultimaFila - FILA_INICIO + 1, 2).getValues();
  
  var puntos = [];
  for (var i = 0; i < rango.length; i++) {
    if (rango[i][0] !== '' && rango[i][0] !== null) {
      puntos.push({
        codigo: String(rango[i][0]).trim(),
        nombre: String(rango[i][1] || '').trim()
      });
    }
  }
  
  return { exito: true, puntos: puntos };
}

/**
 * Actualiza la fila correspondiente al código de punto con los datos del formulario
 */
function actualizarFila(datos) {
  if (!datos.codigo) {
    return { exito: false, mensaje: 'Debe especificar un código de punto' };
  }
  
  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(NOMBRE_HOJA);
  
  if (!hoja) {
    hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheets()[0];
  }
  
  var ultimaFila = hoja.getLastRow();
  
  // Buscar la fila del código
  var rangoCodigos = hoja.getRange(FILA_INICIO, 2, ultimaFila - FILA_INICIO + 1, 1).getValues();
  var filaEncontrada = -1;
  
  for (var i = 0; i < rangoCodigos.length; i++) {
    if (String(rangoCodigos[i][0]).trim() === String(datos.codigo).trim()) {
      filaEncontrada = FILA_INICIO + i;
      break;
    }
  }
  
  if (filaEncontrada === -1) {
    return { exito: false, mensaje: 'No se encontró el código de punto: ' + datos.codigo };
  }
  
  // Actualizar cada campo en la fila encontrada
  // Columna E (5) - Cant. Equipos
  if (datos.cantEquipos !== undefined && datos.cantEquipos !== '') {
    hoja.getRange(filaEncontrada, 5).setValue(datos.cantEquipos);
  }
  
  // Columna F (6) - Actualización
  if (datos.actualizacion !== undefined && datos.actualizacion !== '') {
    hoja.getRange(filaEncontrada, 6).setValue(datos.actualizacion);
  }
  
  // Columna G (7) - Versión Equipo
  if (datos.versionEquipo !== undefined && datos.versionEquipo !== '') {
    hoja.getRange(filaEncontrada, 7).setValue(datos.versionEquipo);
  }
  
  // Columna H (8) - Cámaras
  if (datos.camaras !== undefined && datos.camaras !== '') {
    hoja.getRange(filaEncontrada, 8).setValue(datos.camaras);
  }
  
  // Columna I (9) - Cantidad de cámaras
  if (datos.cantCamaras !== undefined && datos.cantCamaras !== '') {
    hoja.getRange(filaEncontrada, 9).setValue(datos.cantCamaras);
  }
  
  // Columna J (10) - Alarmas
  if (datos.alarmas !== undefined && datos.alarmas !== '') {
    hoja.getRange(filaEncontrada, 10).setValue(datos.alarmas);
  }
  
  // Columna K (11) - Serial Control
  if (datos.serialControl !== undefined && datos.serialControl !== '') {
    hoja.getRange(filaEncontrada, 11).setValue(datos.serialControl);
  }
  
  // Columna L (12) - Visita 1 Semestre
  if (datos.visita1 !== undefined && datos.visita1 !== '') {
    hoja.getRange(filaEncontrada, 12).setValue(datos.visita1);
  }
  
  // Columna M (13) - Visita 2 Semestre
  if (datos.visita2 !== undefined && datos.visita2 !== '') {
    hoja.getRange(filaEncontrada, 13).setValue(datos.visita2);
  }
  
  // Columna N (14) - Observaciones
  if (datos.observaciones !== undefined && datos.observaciones !== '') {
    hoja.getRange(filaEncontrada, 14).setValue(datos.observaciones);
  }
  
  // Columna O (15) - Hora Sincronizada
  if (datos.horaSincronizada !== undefined && datos.horaSincronizada !== '') {
    hoja.getRange(filaEncontrada, 15).setValue(datos.horaSincronizada);
  }
  
  // Columna P (16) - Días de grabación
  if (datos.diasGrabacion !== undefined && datos.diasGrabacion !== '') {
    hoja.getRange(filaEncontrada, 16).setValue(datos.diasGrabacion);
  }
  
  // Columna Q (17) - Num # Línea
  if (datos.numLinea !== undefined && datos.numLinea !== '') {
    hoja.getRange(filaEncontrada, 17).setValue(datos.numLinea);
  }
  
  // Columna R (18) - ICCID
  if (datos.iccid !== undefined && datos.iccid !== '') {
    hoja.getRange(filaEncontrada, 18).setValue(datos.iccid);
  }
  
  // Columna S (19) - Estado
  if (datos.estado !== undefined && datos.estado !== '') {
    hoja.getRange(filaEncontrada, 19).setValue(datos.estado);
  }
  
  // Columna T (20) - DIRECTV
  if (datos.directv !== undefined && datos.directv !== '') {
    hoja.getRange(filaEncontrada, 20).setValue(datos.directv);
  }
  
  // Columna U (21) - Cant. Deco
  if (datos.cantDeco !== undefined && datos.cantDeco !== '') {
    hoja.getRange(filaEncontrada, 21).setValue(datos.cantDeco);
  }
  
  // Columna V (22) - Serial Deco
  if (datos.serialDeco !== undefined && datos.serialDeco !== '') {
    hoja.getRange(filaEncontrada, 22).setValue(datos.serialDeco);
  }
  
  // Columna W (23) - Serial Tarjeta
  if (datos.serialTarjeta !== undefined && datos.serialTarjeta !== '') {
    hoja.getRange(filaEncontrada, 23).setValue(datos.serialTarjeta);
  }
  
  return {
    exito: true,
    mensaje: 'Datos actualizados correctamente en la fila ' + filaEncontrada,
    fila: filaEncontrada
  };
}
