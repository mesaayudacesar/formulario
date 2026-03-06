// ===========================================
// Formulario de Inventario - Lógica Principal
// ===========================================

// URL del Google Apps Script desplegado como Web App
// IMPORTANTE: Reemplazar con la URL real después de desplegar el script
const SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbyrKer04-Zu-c4T4wjC60qZUnGf2KqkFlCLGQBt-QFjRnMoBqCz4LMzQp6BuPkZVe9XLQ/exec';

// Variables globales
let puntoEncontrado = null;
let listaPuntos = [];
let filaEncontrada = null;
let categoriaActual = null;
let tipoVisitaActual = null; // '1' o '2'

// ===========================================
// Inicialización
// ===========================================
document.addEventListener('DOMContentLoaded', () => {
  inicializar();
});

/**
 * Inicializa el formulario y carga los datos necesarios
 */
function inicializar() {
  // Establecer hora actual en el campo de hora sincronizada
  actualizarHoraActual();

  // Actualizar hora cada minuto
  setInterval(actualizarHoraActual, 60000);

  // Configurar eventos del formulario
  configurarEventos();

  // Cargar lista de puntos para autocompletado
  cargarListaPuntos();

  // Configurar la visibilidad condicional de campos
  configurarCamposCondicionales();
}

/**
 * Actualiza el campo de hora sincronizada con la hora actual
 */
function actualizarHoraActual() {
  const campoHora = document.getElementById('horaSincronizada');
  const selectCamaras = document.getElementById('camaras');
  if (campoHora && selectCamaras && selectCamaras.value === 'SI') {
    const ahora = new Date();
    const opciones = {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
      hour12: true
    };
    campoHora.value = ahora.toLocaleTimeString('es-CO', opciones);
  } else if (campoHora && (!selectCamaras || selectCamaras.value !== 'SI')) {
    campoHora.value = '';
  }
}

/**
 * Configura todos los eventos del formulario
 */
function configurarEventos() {
  // Botón de búsqueda
  const btnBuscar = document.getElementById('btnBuscar');
  if (btnBuscar) {
    btnBuscar.addEventListener('click', buscarPunto);
  }

  // Enter en campo de código
  const campoCodigo = document.getElementById('codigoPunto');
  if (campoCodigo) {
    campoCodigo.addEventListener('keypress', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        buscarPunto();
      }
    });

    // Autocompletado
    campoCodigo.addEventListener('input', (e) => {
      filtrarAutocompletado(e.target.value);
    });

    // Cerrar autocompletado al hacer clic fuera
    document.addEventListener('click', (e) => {
      if (!e.target.closest('.grupo-busqueda')) {
        cerrarAutocompletado();
      }
    });
  }

  // Botón de enviar
  const btnEnviar = document.getElementById('btnEnviar');
  if (btnEnviar) {
    btnEnviar.addEventListener('click', enviarDatos);
  }

  // Botón de limpiar
  const btnLimpiar = document.getElementById('btnLimpiar');
  if (btnLimpiar) {
    btnLimpiar.addEventListener('click', limpiarFormulario);
  }

  // Formulario - prevenir envío por defecto
  const formulario = document.getElementById('formularioInventario');
  if (formulario) {
    formulario.addEventListener('submit', (e) => {
      e.preventDefault();
    });
  }
}

/**
 * Configura la visibilidad condicional de campos
 * Por ejemplo: mostrar cantidad de cámaras solo si tiene cámaras
 */
function configurarCamposCondicionales() {
  // Radios de Tipo de Visita
  const radiosVisita = document.querySelectorAll('input[name="tipoVisita"]');
  radiosVisita.forEach(radio => {
    radio.addEventListener('change', () => {
      tipoVisitaActual = radio.value;
      const campoFecha = document.getElementById('campoFechaVisita');
      const labelFecha = document.getElementById('labelFechaVisita');
      if (campoFecha) campoFecha.style.display = 'block';
      if (labelFecha) {
        labelFecha.innerHTML = (tipoVisitaActual === '1' ? 'Fecha Visita 1er Semestre' : 'Fecha Visita 2do Semestre') +
          ' <span style="color: var(--color-error);">*</span>';
      }
      // Poner la fecha actual por defecto al cambiar de tipo (el técnico puede modificarla)
      const fechaInput = document.getElementById('fechaVisita');
      if (fechaInput) {
        const hoy = new Date();
        const yyyy = hoy.getFullYear();
        const mm = String(hoy.getMonth() + 1).padStart(2, '0');
        const dd = String(hoy.getDate()).padStart(2, '0');
        fechaInput.value = `${yyyy}-${mm}-${dd}`;
        fechaInput.classList.remove('campo-invalido');
      }
      // Mostrar el resto del formulario ya que la fecha está lista
      const detalles = document.getElementById('formularioDetalles');
      if (detalles) {
        detalles.style.display = 'block';
        aplicarFiltroCategoria();
        actualizarProgreso();
      }
    });
  });

  // Fecha visita -> mostrar el resto del formulario al seleccionar fecha
  const campoFechaVisita = document.getElementById('fechaVisita');
  if (campoFechaVisita) {
    campoFechaVisita.addEventListener('change', () => {
      campoFechaVisita.classList.remove('campo-invalido');
      const detalles = document.getElementById('formularioDetalles');
      if (detalles && campoFechaVisita.value) {
        detalles.style.display = 'block';
        aplicarFiltroCategoria();
        actualizarProgreso();
      }
    });
  }

  // Limpiar estilo campo-invalido en selects obligatorios al cambiar valor
  ['tecnico', 'actualizacion', 'camaras', 'alarmas', 'estado', 'directv'].forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener('change', () => {
        if (el.value) el.classList.remove('campo-invalido');
      });
    }
  });

  // Cámaras -> Cantidad de cámaras + detalles + hora sincronizada
  const selectCamaras = document.getElementById('camaras');
  if (selectCamaras) {
    selectCamaras.addEventListener('change', () => {
      const grupoCantCamaras = document.getElementById('grupoCantCamaras');
      if (grupoCantCamaras) {
        grupoCantCamaras.style.display = selectCamaras.value === 'SI' ? 'block' : 'none';
      }
      const grupoCamarasDetalles = document.getElementById('grupoCamarasDetalles');
      if (grupoCamarasDetalles) {
        grupoCamarasDetalles.style.display = selectCamaras.value === 'SI' ? 'block' : 'none';
      }
      // Actualizar hora al activar cámaras; limpiar al desactivar
      actualizarHoraActual();
    });
  }

  // DIRECTV -> Campos de DIRECTV
  const selectDirectv = document.getElementById('directv');
  if (selectDirectv) {
    selectDirectv.addEventListener('change', () => {
      const camposDirectv = document.getElementById('camposDirectv');
      if (camposDirectv) {
        camposDirectv.style.display = selectDirectv.value === 'SI' ? 'block' : 'none';
      }
    });
  }

  // Alarmas -> Grupo completo de alarmas (Serial Control + Visitas + Detalles)
  const selectAlarmas = document.getElementById('alarmas');
  if (selectAlarmas) {
    selectAlarmas.addEventListener('change', () => {
      const grupoAlarmas = document.getElementById('grupoAlarmas');
      if (grupoAlarmas) {
        grupoAlarmas.style.display = selectAlarmas.value === 'SI' ? 'block' : 'none';
      }
    });
  }
}

// ===========================================
// Búsqueda de Puntos
// ===========================================

/**
 * Busca un punto por su código en la hoja de cálculo
 */
async function buscarPunto() {
  const campoCodigo = document.getElementById('codigoPunto');
  const codigo = campoCodigo.value.trim();

  if (!codigo) {
    mostrarError('Por favor, ingrese un código de punto');
    return;
  }

  // Cerrar autocompletado
  cerrarAutocompletado();

  // Mostrar estado de carga
  mostrarCargando('Buscando punto...');

  try {
    const url = `${SCRIPT_URL}?accion=buscar&codigo=${encodeURIComponent(codigo)}`;
    const respuesta = await fetch(url);
    const resultado = await respuesta.json();

    ocultarCargando();

    if (resultado.exito) {
      puntoEncontrado = resultado.datos;
      filaEncontrada = resultado.fila;

      // Depurar valor de categoria recibido
      console.log('=== DEPURACION CATEGORIA ===');
      console.log('Claves recibidas:', Object.keys(resultado.datos));
      console.log('Tiene propiedad categoria?', 'categoria' in resultado.datos);
      console.log('Datos completos del punto:', JSON.stringify(resultado.datos, null, 2));
      console.log('Valor crudo de categoria:', resultado.datos.categoria);
      console.log('Tipo de categoria:', typeof resultado.datos.categoria);
      console.log('Valor de nombrePunto (columna C):', resultado.datos.nombrePunto);
      console.log('Valor de cantEquipos (columna E):', resultado.datos.cantEquipos);

      // Asignar categoria (manejar valores falsy como 0 o cadena vacia)
      const catRaw = resultado.datos.categoria;
      if (catRaw !== null && catRaw !== undefined && catRaw !== '') {
        categoriaActual = String(catRaw).trim().toUpperCase();
      } else {
        categoriaActual = null;
      }
      console.log('Categoria procesada:', categoriaActual);
      console.log('=== FIN DEPURACION ===');

      // Mostrar información del punto
      mostrarInfoPunto(resultado);

      // Llenar los campos con datos existentes
      llenarCampos(resultado.datos);

      // Mostrar las secciones del formulario
      mostrarSecciones();

      // Aplicar filtro segun la categoria del punto
      aplicarFiltroCategoria();

      // Actualizar barra de progreso
      actualizarProgreso();
    } else {
      mostrarError(resultado.mensaje);
      ocultarSecciones();
    }
  } catch (error) {
    ocultarCargando();
    mostrarError('Error de conexión. Verifique que el script esté desplegado correctamente.');
    console.error('Error al buscar punto:', error);
  }
}

/**
 * Carga la lista de todos los puntos disponibles para autocompletado
 */
async function cargarListaPuntos() {
  try {
    const url = `${SCRIPT_URL}?accion=obtenerPuntos`;
    const respuesta = await fetch(url);
    const resultado = await respuesta.json();

    if (resultado.exito) {
      listaPuntos = resultado.puntos;
    }
  } catch (error) {
    console.warn('No se pudo cargar la lista de puntos para autocompletado:', error);
  }
}

/**
 * Filtra y muestra sugerencias de autocompletado
 */
function filtrarAutocompletado(texto) {
  const lista = document.getElementById('listaAutocompletado');
  if (!lista || !texto || texto.length < 1) {
    cerrarAutocompletado();
    return;
  }

  const textoBusqueda = texto.toLowerCase();
  const filtrados = listaPuntos.filter(punto =>
    punto.codigo.toLowerCase().includes(textoBusqueda) ||
    punto.nombre.toLowerCase().includes(textoBusqueda)
  ).slice(0, 10); // Limitar a 10 resultados

  if (filtrados.length === 0) {
    cerrarAutocompletado();
    return;
  }

  lista.innerHTML = filtrados.map(punto => `
    <div class="item-autocompletado" onclick="seleccionarPunto('${punto.codigo}')">
      <span class="codigo-auto">${punto.codigo}</span>
      <span class="nombre-auto">${punto.nombre}</span>
    </div>
  `).join('');

  lista.classList.add('visible');
}

/**
 * Selecciona un punto del autocompletado
 */
function seleccionarPunto(codigo) {
  const campoCodigo = document.getElementById('codigoPunto');
  campoCodigo.value = codigo;
  cerrarAutocompletado();
  buscarPunto();
}

/**
 * Cierra la lista de autocompletado
 */
function cerrarAutocompletado() {
  const lista = document.getElementById('listaAutocompletado');
  if (lista) {
    lista.classList.remove('visible');
  }
}

// ===========================================
// Envío de Datos
// ===========================================

/**
 * Envía los datos del formulario a Google Sheets
 */
async function enviarDatos() {
  if (!filaEncontrada) {
    mostrarNotificacionError('Primero debe buscar y seleccionar un punto válido');
    return;
  }

  // Validar campos obligatorios visibles
  const camposObligatorios = [];

  // Tecnico
  if (!document.getElementById('tecnico').value) {
    camposObligatorios.push({ id: 'tecnico', nombre: 'Nombre del Técnico' });
  }

  // Actualizacion (siempre visible en detalles)
  if (!document.getElementById('actualizacion').value) {
    camposObligatorios.push({ id: 'actualizacion', nombre: 'Actualizacion' });
  }

  // Campos de Seguridad (solo si la sección es visible)
  const seccionSeguridadVisible = document.getElementById('seccionSeguridad') &&
    document.getElementById('seccionSeguridad').style.display !== 'none';
  if (seccionSeguridadVisible) {
    if (!document.getElementById('camaras').value) {
      camposObligatorios.push({ id: 'camaras', nombre: 'Camaras' });
    }
    if (!document.getElementById('alarmas').value) {
      camposObligatorios.push({ id: 'alarmas', nombre: 'Alarmas' });
    }
    // Estado: solo obligatorio cuando Alarmas = SI
    const grupoAlarmasVisible = document.getElementById('grupoAlarmas') &&
      document.getElementById('grupoAlarmas').style.display !== 'none';
    if (grupoAlarmasVisible && !document.getElementById('estado').value) {
      camposObligatorios.push({ id: 'estado', nombre: 'Estado' });
    }
  }

  // DIRECTV (solo si la sección es visible)
  const seccionDirectvVisible = document.getElementById('seccionDirectv') &&
    document.getElementById('seccionDirectv').style.display !== 'none';
  if (seccionDirectvVisible && !document.getElementById('directv').value) {
    camposObligatorios.push({ id: 'directv', nombre: 'DIRECTV' });
  }

  if (camposObligatorios.length > 0) {
    const nombres = camposObligatorios.map(c => c.nombre).join(', ');
    mostrarNotificacionError('Campos obligatorios sin completar: ' + nombres);
    camposObligatorios.forEach(c => {
      const el = document.getElementById(c.id);
      if (el) el.classList.add('campo-invalido');
    });
    document.getElementById(camposObligatorios[0].id).scrollIntoView({ behavior: 'smooth', block: 'center' });
    return;
  }

  // Validar tipo de visita y fecha obligatoria
  if (!tipoVisitaActual) {
    mostrarNotificacionError('Debe seleccionar el tipo de visita (1er o 2do semestre)');
    document.getElementById('formularioSecciones').scrollIntoView({ behavior: 'smooth' });
    return;
  }
  const fechaVisitaVal = document.getElementById('fechaVisita').value;
  if (!fechaVisitaVal) {
    const nombreVisita = tipoVisitaActual === '1' ? 'Visita 1er Semestre' : 'Visita 2do Semestre';
    mostrarNotificacionError('La fecha de ' + nombreVisita + ' es obligatoria');
    document.getElementById('fechaVisita').classList.add('campo-invalido');
    document.getElementById('fechaVisita').scrollIntoView({ behavior: 'smooth' });
    return;
  }

  // Actualizar hora sincronizada al momento del envío
  actualizarHoraActual();

  // Recopilar datos del formulario
  const datos = recopilarDatos();

  // Mostrar estado de carga
  mostrarCargando('Enviando datos...');

  try {
    const respuesta = await fetch(SCRIPT_URL, {
      method: 'POST',
      body: JSON.stringify(datos),
      headers: {
        'Content-Type': 'text/plain;charset=utf-8',
      },
      mode: 'no-cors'
    });

    // Con modo no-cors, no podemos leer la respuesta directamente
    // Esperamos un momento y verificamos
    ocultarCargando();
    mostrarNotificacionExito('Datos enviados correctamente a la fila ' + filaEncontrada);

    // Limpiar después de enviar exitosamente
    setTimeout(() => {
      limpiarFormulario();
    }, 2000);

  } catch (error) {
    ocultarCargando();
    mostrarNotificacionError('Error al enviar datos. Por favor, intente nuevamente.');
    console.error('Error al enviar datos:', error);
  }
}

/**
 * Recopila todos los datos del formulario
 */
function recopilarDatos() {
  const fechaVisita = document.getElementById('fechaVisita').value;
  const visita1 = tipoVisitaActual === '1' ? fechaVisita : '';
  const visita2 = tipoVisitaActual === '2' ? fechaVisita : '';

  return {
    tipoVisita: tipoVisitaActual,
    tecnico: document.getElementById('tecnico').value,
    codigo: document.getElementById('codigoPunto').value.trim(),
    cantEquipos: document.getElementById('cantEquipos').value,
    actualizacion: document.getElementById('actualizacion').value,
    versionEquipo: document.getElementById('versionEquipo').checked ? '2.0.44' : '',
    camaras: document.getElementById('camaras').value,
    cantCamaras: document.getElementById('cantCamaras').value,
    alarmas: document.getElementById('alarmas').value,
    serialControl: document.getElementById('serialControl').value.trim(),
    visita1: visita1,
    visita2: visita2,
    observaciones: document.getElementById('observaciones').value.trim(),
    horaSincronizada: document.getElementById('camaras').value === 'SI' ? document.getElementById('horaSincronizada').value : '',
    diasGrabacion: document.getElementById('diasGrabacion').value,
    numLinea: document.getElementById('numLinea').value.trim(),
    iccid: document.getElementById('iccid').value.trim(),
    estado: document.getElementById('estado').value,
    directv: document.getElementById('directv').value,
    cantDeco: document.getElementById('cantDeco').value,
    serialDeco: document.getElementById('serialDeco').value.trim(),
    serialTarjeta: document.getElementById('serialTarjeta').value.trim()
  };
}

// ===========================================
// Interfaz de Usuario
// ===========================================

/**
 * Muestra la información del punto encontrado
 */
function mostrarInfoPunto(resultado) {
  const infoDiv = document.getElementById('infoPunto');
  const errorDiv = document.getElementById('mensajeError');

  if (errorDiv) errorDiv.classList.remove('visible');

  if (infoDiv) {
    const nombrePunto = resultado.datos.nombrePunto || 'Punto ' + resultado.datos.codigoPunto;
    document.getElementById('nombrePuntoTexto').textContent = nombrePunto;
    document.getElementById('filaPuntoTexto').textContent = `Fila ${resultado.fila} en la hoja de cálculo`;
    infoDiv.classList.add('visible');
  }
}

/**
 * Muestra un mensaje de error en la sección de búsqueda
 */
function mostrarError(mensaje) {
  const errorDiv = document.getElementById('mensajeError');
  const infoDiv = document.getElementById('infoPunto');

  if (infoDiv) infoDiv.classList.remove('visible');

  if (errorDiv) {
    document.getElementById('textoError').textContent = mensaje;
    errorDiv.classList.add('visible');
  }
}

/**
 * Llena los campos del formulario con los datos existentes
 */
function llenarCampos(datos) {
  // Mantenimiento Equipos
  if (datos.cantEquipos) document.getElementById('cantEquipos').value = datos.cantEquipos;

  if (datos.actualizacion) {
    const valActualizacion = String(datos.actualizacion).toUpperCase();
    if (valActualizacion === 'SI' || valActualizacion === 'SÍ') {
      document.getElementById('actualizacion').value = 'SI';
    } else if (valActualizacion === 'NO') {
      document.getElementById('actualizacion').value = 'NO';
    }
  }

  if (datos.versionEquipo) {
    const version = String(datos.versionEquipo).trim();
    document.getElementById('versionEquipo').checked = version === '2.0.44' || version.includes('2.0.44');
  }

  // Seguridad - Cámaras
  if (datos.camaras) {
    const valCamaras = String(datos.camaras).toUpperCase();
    if (valCamaras === 'SI' || valCamaras === 'SÍ') {
      document.getElementById('camaras').value = 'SI';
      document.getElementById('grupoCantCamaras').style.display = 'block';
      document.getElementById('grupoCamarasDetalles').style.display = 'block';
    } else if (valCamaras === 'NO') {
      document.getElementById('camaras').value = 'NO';
    }
  }

  if (datos.cantCamaras) document.getElementById('cantCamaras').value = datos.cantCamaras;

  // Seguridad - Alarmas
  if (datos.alarmas) {
    const valAlarmas = String(datos.alarmas).toUpperCase();
    if (valAlarmas === 'SI' || valAlarmas === 'SÍ') {
      document.getElementById('alarmas').value = 'SI';
      document.getElementById('grupoAlarmas').style.display = 'block';
    } else if (valAlarmas === 'NO') {
      document.getElementById('alarmas').value = 'NO';
    }
  }

  if (datos.serialControl) document.getElementById('serialControl').value = datos.serialControl;
  // Restaurar tipo de visita y fecha a partir de datos existentes
  if (datos.visita1) {
    tipoVisitaActual = '1';
    document.getElementById('radioVisita1').checked = true;
    document.getElementById('fechaVisita').value = datos.visita1;
    document.getElementById('fechaVisita').classList.remove('campo-invalido');
    document.getElementById('campoFechaVisita').style.display = 'block';
    const labelFecha = document.getElementById('labelFechaVisita');
    if (labelFecha) labelFecha.innerHTML = 'Fecha Visita 1er Semestre <span style="color: var(--color-error);">*</span>';
    document.getElementById('formularioDetalles').style.display = 'block';
  } else if (datos.visita2) {
    tipoVisitaActual = '2';
    document.getElementById('radioVisita2').checked = true;
    document.getElementById('fechaVisita').value = datos.visita2;
    document.getElementById('fechaVisita').classList.remove('campo-invalido');
    document.getElementById('campoFechaVisita').style.display = 'block';
    const labelFecha = document.getElementById('labelFechaVisita');
    if (labelFecha) labelFecha.innerHTML = 'Fecha Visita 2do Semestre <span style="color: var(--color-error);">*</span>';
    document.getElementById('formularioDetalles').style.display = 'block';
  }
  if (datos.observaciones) document.getElementById('observaciones').value = datos.observaciones;
  if (datos.diasGrabacion) document.getElementById('diasGrabacion').value = datos.diasGrabacion;
  if (datos.numLinea) document.getElementById('numLinea').value = datos.numLinea;
  if (datos.iccid) document.getElementById('iccid').value = datos.iccid;

  // Estado
  if (datos.estado) {
    const valEstado = String(datos.estado).toUpperCase();
    if (valEstado === 'ACTIVA') {
      document.getElementById('estado').value = 'ACTIVA';
    } else if (valEstado === 'INACTIVA') {
      document.getElementById('estado').value = 'INACTIVA';
    }
  }

  // DIRECTV
  if (datos.directv) {
    const valDirectv = String(datos.directv).toUpperCase();
    if (valDirectv === 'SI' || valDirectv === 'SÍ') {
      document.getElementById('directv').value = 'SI';
      document.getElementById('camposDirectv').style.display = 'block';
    } else if (valDirectv === 'NO') {
      document.getElementById('directv').value = 'NO';
    }
  }

  if (datos.cantDeco) document.getElementById('cantDeco').value = datos.cantDeco;
  if (datos.serialDeco) document.getElementById('serialDeco').value = datos.serialDeco;
  if (datos.serialTarjeta) document.getElementById('serialTarjeta').value = datos.serialTarjeta;
}

/**
 * Muestra las secciones del formulario después de encontrar el punto
 */
/**
 * Aplica el filtro segun la categoria del punto
 * Si la categoria es CM, solo muestra mantenimiento de equipos
 */
function aplicarFiltroCategoria() {
  const seccionSeguridad = document.getElementById('seccionSeguridad');
  const seccionDirectv = document.getElementById('seccionDirectv');

  if (categoriaActual === 'CM') {
    // Categoria CM: solo mantenimiento, ocultar seguridad y DIRECTV
    if (seccionSeguridad) seccionSeguridad.style.display = 'none';
    if (seccionDirectv) seccionDirectv.style.display = 'none';
  } else {
    // Otras categorias: mostrar todo
    if (seccionSeguridad) seccionSeguridad.style.display = '';
    if (seccionDirectv) seccionDirectv.style.display = '';
  }
}

function mostrarSecciones() {
  // Mostrar solo la seccion de tipo de visita
  const secciones = document.getElementById('formularioSecciones');
  if (secciones) {
    secciones.classList.add('visible');
  }

  // El formularioDetalles permanece oculto hasta que se seleccione la fecha
  const detalles = document.getElementById('formularioDetalles');
  if (detalles) {
    detalles.style.display = 'none';
  }
}

/**
 * Oculta las secciones del formulario
 */
function ocultarSecciones() {
  const secciones = document.getElementById('formularioSecciones');
  if (secciones) {
    secciones.classList.remove('visible');
  }

  const detalles = document.getElementById('formularioDetalles');
  if (detalles) {
    detalles.style.display = 'none';
  }
}

/**
 * Actualiza la barra de progreso según los campos completados
 */
function actualizarProgreso() {
  const campos = [
    'cantEquipos', 'actualizacion', 'camaras', 'alarmas',
    'estado', 'directv', 'observaciones'
  ];

  let completados = 0;
  campos.forEach(id => {
    const campo = document.getElementById(id);
    if (campo && campo.value && campo.value !== '') {
      completados++;
    }
  });

  // También verificar el checkbox
  if (document.getElementById('versionEquipo').checked) {
    completados++;
  }

  const total = campos.length + 1; // +1 por el checkbox
  const porcentaje = Math.round((completados / total) * 100);

  const fill = document.getElementById('barraProgresoFill');
  const texto = document.getElementById('progresoTexto');

  if (fill) fill.style.width = porcentaje + '%';
  if (texto) texto.textContent = `${completados} de ${total} campos principales`;

  // Escuchar cambios en los campos para actualizar progreso
  campos.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.removeEventListener('change', actualizarProgreso);
      campo.addEventListener('change', actualizarProgreso);
    }
  });

  const checkbox = document.getElementById('versionEquipo');
  if (checkbox) {
    checkbox.removeEventListener('change', actualizarProgreso);
    checkbox.addEventListener('change', actualizarProgreso);
  }
}

/**
 * Muestra el overlay de carga
 */
function mostrarCargando(mensaje) {
  const overlay = document.getElementById('overlayCarga');
  const texto = document.getElementById('textoCarga');
  if (texto) texto.textContent = mensaje || 'Procesando...';
  if (overlay) overlay.classList.add('visible');
}

/**
 * Oculta el overlay de carga
 */
function ocultarCargando() {
  const overlay = document.getElementById('overlayCarga');
  if (overlay) overlay.classList.remove('visible');
}

/**
 * Muestra notificación de éxito
 */
function mostrarNotificacionExito(mensaje) {
  const notificacion = document.getElementById('notificacionExito');
  const texto = document.getElementById('textoNotificacionExito');
  if (texto) texto.textContent = mensaje;
  if (notificacion) {
    notificacion.classList.add('visible');
    setTimeout(() => {
      notificacion.classList.remove('visible');
    }, 5000);
  }
}

/**
 * Muestra notificación de error
 */
function mostrarNotificacionError(mensaje) {
  const notificacion = document.getElementById('notificacionError');
  const texto = document.getElementById('textoNotificacionError');
  if (texto) texto.textContent = mensaje;
  if (notificacion) {
    notificacion.classList.add('visible');
    setTimeout(() => {
      notificacion.classList.remove('visible');
    }, 5000);
  }
}

/**
 * Limpia todos los campos del formulario
 */
function limpiarFormulario() {
  // Resetear variables
  puntoEncontrado = null;
  filaEncontrada = null;
  categoriaActual = null;
  tipoVisitaActual = null;

  // Restaurar visibilidad de secciones
  const seccionSeguridad = document.getElementById('seccionSeguridad');
  const seccionDirectv = document.getElementById('seccionDirectv');
  if (seccionSeguridad) seccionSeguridad.style.display = '';
  if (seccionDirectv) seccionDirectv.style.display = '';

  // Resetear selector de visita y campo de fecha
  const radios = document.querySelectorAll('input[name="tipoVisita"]');
  radios.forEach(r => r.checked = false);
  const campoFechaVisita = document.getElementById('campoFechaVisita');
  if (campoFechaVisita) campoFechaVisita.style.display = 'none';
  const fechaVisitaInput = document.getElementById('fechaVisita');
  if (fechaVisitaInput) {
    fechaVisitaInput.value = '';
    fechaVisitaInput.classList.remove('campo-invalido');
  }
  const labelFecha = document.getElementById('labelFechaVisita');
  if (labelFecha) labelFecha.innerHTML = 'Fecha de Visita <span style="color: var(--color-error);">*</span>';

  // Ocultar formularioDetalles
  const detalles = document.getElementById('formularioDetalles');
  if (detalles) detalles.style.display = 'none';

  // Limpiar campo de búsqueda
  document.getElementById('codigoPunto').value = '';

  // Ocultar info del punto y error
  const infoDiv = document.getElementById('infoPunto');
  if (infoDiv) infoDiv.classList.remove('visible');

  const errorDiv = document.getElementById('mensajeError');
  if (errorDiv) errorDiv.classList.remove('visible');

  // Limpiar todos los campos
  const camposTexto = ['cantEquipos', 'cantCamaras', 'serialControl',
    'observaciones', 'diasGrabacion',
    'numLinea', 'iccid', 'cantDeco', 'serialDeco', 'serialTarjeta'];

  camposTexto.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.value = '';
  });

  // Resetear selects
  const selects = ['tecnico', 'actualizacion', 'camaras', 'alarmas', 'estado', 'directv'];
  selects.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) {
      campo.value = '';
      campo.classList.remove('campo-invalido');
    }
  });

  // Resetear checkbox
  document.getElementById('versionEquipo').checked = false;

  // Ocultar campos condicionales
  const camposCondicionales = ['grupoCantCamaras', 'grupoCamarasDetalles', 'grupoAlarmas', 'camposDirectv'];
  camposCondicionales.forEach(id => {
    const campo = document.getElementById(id);
    if (campo) campo.style.display = 'none';
  });

  // Ocultar secciones
  ocultarSecciones();

  // Actualizar hora
  actualizarHoraActual();
}
