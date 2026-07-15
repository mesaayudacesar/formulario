// ===========================================
// Google Apps Script - Formulario de Inventario
// ===========================================
// Este script se despliega como Aplicación Web
// para recibir datos del formulario HTML y escribirlos
// en la hoja de Google Sheets correspondiente.
// ===========================================

// ID de la hoja de cálculo
var SPREADSHEET_ID = '19liMdG9cbgL0dZvUkb2Ri77NCOO-BmAwBF_QWTLdDA8';

// Nombre de las hojas (pestañas)
var NOMBRE_HOJA_1 = 'Hoja1'; // Visita 1er Semestre
var NOMBRE_HOJA_2 = 'Hoja2'; // Visita 2do Semestre

// ===========================================
// MAPEO DE COLUMNAS POR HOJA
// -------------------------------------------
// Hoja1 y Hoja2 tienen estructuras distintas:
// en Hoja1 la "Versión Equipo" es UNA sola columna (G),
// mientras que en Hoja2 se separó en dos columnas:
// Tray-Icon (G) y WebSocket (H). Esto corre todas las
// columnas siguientes una posición hacia la derecha en Hoja2.
// ===========================================

// Estructura ORIGINAL de Hoja1 (23 columnas, hasta W)
var COLUMNAS_HOJA1 = {
  codigoPunto: 2,      // B
  nombrePunto: 3,      // C
  categoria: 4,        // D
  cantEquipos: 5,      // E
  actualizacion: 6,    // F
  versionEquipo: 7,    // G (combinada, sin separar Tray-Icon / WebSocket)
  camaras: 8,          // H
  cantCamaras: 9,      // I
  alarmas: 10,         // J
  serialControl: 11,   // K
  visita1: 12,         // L
  visita2: 13,         // M
  observaciones: 14,   // N
  horaSincronizada: 15,// O
  diasGrabacion: 16,   // P
  numLinea: 17,        // Q
  iccid: 18,           // R
  estado: 19,          // S
  directv: 20,         // T
  cantDeco: 21,        // U
  serialDeco: 22,      // V
  serialTarjeta: 23    // W
};

// Estructura NUEVA de Hoja2 (24 columnas, hasta X)
var COLUMNAS_HOJA2 = {
  codigoPunto: 2,      // B
  nombrePunto: 3,      // C
  categoria: 4,        // D
  cantEquipos: 5,      // E
  actualizacion: 6,    // F
  versionTrayicon: 7,  // G
  versionWebSocket: 8, // H
  camaras: 9,          // I
  cantCamaras: 10,     // J
  alarmas: 11,         // K
  serialControl: 12,   // L
  visita1: 13,         // M
  visita2: 14,         // N
  observaciones: 15,   // O
  horaSincronizada: 16,// P
  diasGrabacion: 17,   // Q
  numLinea: 18,        // R
  iccid: 19,           // S
  estado: 20,          // T
  directv: 21,         // U
  cantDeco: 22,        // V
  serialDeco: 23,      // W
  serialTarjeta: 24    // X
};

/**
 * Retorna el mapeo de columnas correspondiente segun el nombre de la hoja
 */
function obtenerMapeoColumnas(nombreHoja) {
  return (nombreHoja === NOMBRE_HOJA_2) ? COLUMNAS_HOJA2 : COLUMNAS_HOJA1;
}

/**
 * Retorna el nombre de hoja segun el tipo de visita ('1' o '2')
 * NOTA: Actualmente el formulario solo permite seleccionar Visita 2do
 * Semestre (ver comentarios en index.html / app.js). La lógica de Visita
 * 1er Semestre se deja aquí intacta y funcional para reactivarla el
 * próximo año sin tener que reescribir el backend.
 */
function obtenerNombreHoja(tipoVisita) {
  var tipoVisitaStr = String(tipoVisita).trim();
  return (tipoVisitaStr === '2') ? NOMBRE_HOJA_2 : NOMBRE_HOJA_1;
}

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
      resultado = buscarPunto(e.parameter.codigo, e.parameter.tipoVisita);
    } else if (accion === 'obtenerPuntos') {
      resultado = obtenerTodosLosPuntos(e.parameter.tipoVisita);
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
    Logger.log('Datos recibidos en doPost: ' + JSON.stringify(datos));
    Logger.log('tipoVisita recibido: ' + datos.tipoVisita + ' (tipo: ' + typeof datos.tipoVisita + ')');
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
function buscarPunto(codigo, tipoVisita) {
  if (!codigo) {
    return { exito: false, mensaje: 'Debe ingresar un código de punto' };
  }

  var nombreHojaOrigen = obtenerNombreHoja(tipoVisita);
  var mapeo = obtenerMapeoColumnas(nombreHojaOrigen);

  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nombreHojaOrigen);
  
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

      // Determinar cuántas columnas leer segun la columna mas alta del mapeo
      var maxColumna = 0;
      for (var campo in mapeo) {
        if (mapeo[campo] > maxColumna) maxColumna = mapeo[campo];
      }

      var datosFila = hoja.getRange(filaEncontrada, 1, 1, maxColumna).getValues()[0];

      var datos = {};
      for (var nombreCampo in mapeo) {
        datos[nombreCampo] = datosFila[mapeo[nombreCampo] - 1];
      }

      return {
        exito: true,
        fila: filaEncontrada,
        datos: datos
      };
    }
  }
  
  return { exito: false, mensaje: 'No se encontró el código de punto: ' + codigo };
}

/**
 * Obtiene todos los códigos de puntos disponibles para el autocompletado
 */
function obtenerTodosLosPuntos(tipoVisita) {
  var nombreHojaOrigen = obtenerNombreHoja(tipoVisita);

  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nombreHojaOrigen);
  
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
  
  // Seleccionar la hoja según el tipo de visita
  var nombreHojaDestino = obtenerNombreHoja(datos.tipoVisita);
  Logger.log('Hoja destino seleccionada: ' + nombreHojaDestino);
  var mapeo = obtenerMapeoColumnas(nombreHojaDestino);
  var hoja = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName(nombreHojaDestino);
  
  if (!hoja) {
    return { exito: false, mensaje: 'No se encontró la hoja: ' + nombreHojaDestino };
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

  // Caso especial: en Hoja1 (estructura antigua) las versiones Tray-Icon y
  // WebSocket se guardan juntas en UNA sola columna "versionEquipo".
  // En Hoja2 cada una tiene su propia columna, y el mapeo ya las contempla.
  if (mapeo.versionEquipo) {
    var partesVersion = [];
    if (datos.versionTrayicon) partesVersion.push(datos.versionTrayicon);
    if (datos.versionWebSocket) partesVersion.push(datos.versionWebSocket);
    if (partesVersion.length > 0) {
      hoja.getRange(filaEncontrada, mapeo.versionEquipo).setValue(partesVersion.join(' / '));
    }
  }

  // Escribir el resto de los campos segun el mapeo de columnas de la hoja
  for (var campo in mapeo) {
    if (campo === 'versionEquipo' || campo === 'codigoPunto' || campo === 'nombrePunto' || campo === 'categoria') {
      continue; // ya manejado arriba, o son campos de solo lectura
    }
    if (datos[campo] !== undefined && datos[campo] !== '') {
      hoja.getRange(filaEncontrada, mapeo[campo]).setValue(datos[campo]);
    }
  }

  // Registrar visita en la hoja de mantenimiento interno
  if (datos.visita1 !== undefined && datos.visita1 !== '') {
    actualizarMantenimientoInterno(datos.codigo, datos.visita1);
  }
  if (datos.visita2 !== undefined && datos.visita2 !== '') {
    actualizarMantenimientoInterno(datos.codigo, datos.visita2);
  }
  
  return {
    exito: true,
    mensaje: 'Datos actualizados correctamente en la fila ' + filaEncontrada,
    fila: filaEncontrada
  };
}

function actualizarMantenimientoInterno(codigoPunto, fecha) {

  const idSheet3 = "1KaiPh8DiGMmPco5KWfhetaEPfJxLP0pPss8uhpgFAbk";
  const hojaDestino = SpreadsheetApp.openById(idSheet3).getSheetByName("Vis");

  if (!codigoPunto || !fecha) return;

  const fechaObj = new Date(fecha);
  const mes = fechaObj.getMonth() + 1;

  const ultimaFila = hojaDestino.getLastRow();

  const datosDestino = hojaDestino.getRange(10, 2, ultimaFila - 9, 1).getValues();

  for (let i = 0; i < datosDestino.length; i++) {

    const codigoDestino = String(datosDestino[i][0]).trim();

    if (codigoDestino === String(codigoPunto).trim()) {

      const fila = i + 10;
      const columnaMes = mes + 6; // Enero = G

      hojaDestino.getRange(fila, columnaMes).setValue("X");
      hojaDestino.getRange(fila, 3).setBackground("#93c47d");

      break;
    }
  }
}