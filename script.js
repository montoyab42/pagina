// VARIABLES GLOBALES
let eficiencia = 0.18;
let perdidas = 0.15;
let areaPanel = 1.6;
let consumoMedia = 5;
let consumoDesv = 1;
let datosRadiacionExterna = null;

const perfiles = {
  "acambaro-julio": { ciudad: "Acámbaro, Guanajuato", mes: "Julio", mediaRadiacion: 5, dias: 31 },
  "merida-mayo": { ciudad: "Mérida, Yucatán", mes: "Mayo", mediaRadiacion: 6.5, dias: 31 },
  "cdmx-diciembre": { ciudad: "CDMX", mes: "Diciembre", mediaRadiacion: 4, dias: 31 },
  "morelia-julio": { ciudad: "Morelia, Michoacán", mes: "Julio", mediaRadiacion: 5.5, dias: 31 }
};

function generarDatosNormales(media, desv, n) {
  return Array.from({ length: n }, () => {
    let u = Math.random(), v = Math.random();
    let num = Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
    return +(media + desv * num).toFixed(2);
  });
}

function crearGrafico(id, tipo, etiqueta, datos, color, titulo) {
  new Chart(document.getElementById(id), {
    type: tipo,
    data: {
      labels: [...Array(datos.length).keys()].map(i => `Día ${i + 1}`),
      datasets: [{
        label: etiqueta,
        data: datos,
        backgroundColor: tipo === 'bar' ? color : undefined,
        borderColor: tipo !== 'bar' ? color : undefined,
        fill: tipo !== 'bar',
        tension: 0.3
      }]
    },
    options: {
      responsive: true,
      plugins: {
        legend: { display: false },
        title: { display: true, text: titulo }
      }
    }
  });
}

function calcularEstadisticas(arr) {
  const media = (arr.reduce((a, b) => a + b) / arr.length).toFixed(2);
  const desv = Math.sqrt(arr.map(x => Math.pow(x - media, 2)).reduce((a, b) => a + b) / arr.length).toFixed(2);
  return { media, desv };
}

function cargarDatos(perfilKey) {
  const perfil = perfiles[perfilKey];
  const dias = perfil.dias;
  const consumoDiario = generarDatosNormales(consumoMedia, consumoDesv, dias);
  const radiacionSolar = datosRadiacionExterna || generarDatosNormales(perfil.mediaRadiacion, 1.5, dias);
  const energiaPorPanel = radiacionSolar.map(r => +(r * areaPanel * eficiencia * (1 - perdidas)).toFixed(2));
  const panelesNecesarios = consumoDiario.map((c, i) => +(c / energiaPorPanel[i]).toFixed(2));

  document.getElementById("subtitulo").textContent = `Análisis para ${perfil.ciudad} - ${perfil.mes}`;
  Chart.helpers.each(Chart.instances, instance => instance.destroy());

  crearGrafico('consumoChart', 'bar', 'Consumo (kWh)', consumoDiario, '#3498db', 'Consumo Diario');
  crearGrafico('radiacionChart', 'line', 'Radiación (kWh/m²)', radiacionSolar, '#f39c12', 'Radiación Solar Diaria');
  crearGrafico('generacionChart', 'line', 'Generación (kWh)', energiaPorPanel, '#9b59b6', 'Generación por Panel');
  crearGrafico('panelesChart', 'line', 'Paneles Necesarios', panelesNecesarios, '#27ae60', 'Paneles por Día');

  const slider = document.getElementById('panelSlider');
  const texto = document.getElementById('coberturaText');
  const panelCount = document.getElementById('panelCount');

  function calcularCobertura(panels) {
    let diasCubiertos = 0;
    for (let i = 0; i < dias; i++) {
      let energiaTotal = energiaPorPanel[i] * panels;
      if (energiaTotal >= consumoDiario[i]) diasCubiertos++;
    }
    return Math.round((diasCubiertos / dias) * 100);
  }

  slider.oninput = () => {
    const val = +slider.value;
    panelCount.textContent = val;
    const cobertura = calcularCobertura(val);
    texto.innerHTML = `Con ${val} paneles solares, cubrirías el consumo en <strong>${cobertura}%</strong> de los días de ${perfil.mes}.`;
  };
  slider.dispatchEvent(new Event('input'));

  const resumen = document.getElementById('resumen');
  const estConsumo = calcularEstadisticas(consumoDiario);
  const estRadiacion = calcularEstadisticas(radiacionSolar);
  const estGeneracion = calcularEstadisticas(energiaPorPanel);
  const percentil95 = panelesNecesarios.slice().sort((a, b) => a - b)[Math.floor(0.95 * dias)];

  resumen.textContent =
  `🔹 Consumo promedio: ${estConsumo.media} kWh/día (σ = ${estConsumo.desv})
🔹 Radiación promedio: ${estRadiacion.media} kWh/m² (σ = ${estRadiacion.desv})
🔹 Generación promedio por panel: ${estGeneracion.media} kWh
🔹 Paneles necesarios para cubrir 95% de los días: ${Math.ceil(percentil95)} paneles`;

  const costeTexto = document.getElementById('costeTexto');
  const panelEconomico = document.getElementById('panelEconomico');
  const bateriaCheckbox = document.getElementById('bateriaCheckbox');

  function actualizarEconomia() {
    const numPaneles = +panelEconomico.value;
    const precioPanel = 4000;
    const precioBateria = 20000;
    const ahorroPorKwh = 2.5;

    const energiaTotalMes = energiaPorPanel.reduce((a, b) => a + b, 0) * numPaneles;
    const ahorroMensual = energiaTotalMes * ahorroPorKwh;

    let costeTotal = numPaneles * precioPanel;
    if (bateriaCheckbox.checked) costeTotal += precioBateria;

    const retorno = ahorroMensual > 0 ? (costeTotal / ahorroMensual).toFixed(1) : '∞';

    costeTexto.innerHTML =
      `🔸 <strong>Coste total:</strong> $${costeTotal.toLocaleString()} MXN<br>
       🔸 <strong>Ahorro mensual estimado:</strong> $${ahorroMensual.toFixed(2)} MXN<br>
       🔸 <strong>Punto de equilibrio:</strong> ${retorno} años`;
  }

  panelEconomico.addEventListener('input', actualizarEconomia);
  bateriaCheckbox.addEventListener('change', actualizarEconomia);
  actualizarEconomia();
}

// EVENTOS
document.getElementById("ciudadMesSelect").addEventListener("change", e => {
  datosRadiacionExterna = null;
  cargarDatos(e.target.value);
});
cargarDatos("acambaro-julio");

// OCR Recibo CFE
document.getElementById("cfeInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;
  document.getElementById("cfeResultado").textContent = "Analizando...";

  Tesseract.recognize(file, 'spa').then(({ data: { text } }) => {
    const actual = text.match(/lectura\s+actual[:\s]*([\d.]+)/i);
    const anterior = text.match(/lectura\s+anterior[:\s]*([\d.]+)/i);
    const dias = text.match(/(\d+)\s+d[ií]as/i);

    if (actual && anterior && dias) {
      const consumoTotal = parseFloat(actual[1]) - parseFloat(anterior[1]);
      const consumoDiario = consumoTotal / parseInt(dias[1]);
      consumoMedia = +consumoDiario.toFixed(2);
      document.getElementById("cfeResultado").textContent =
        `Lectura anterior = ${anterior[1]}, actual = ${actual[1]}, ${dias[1]} días → Promedio diario: ${consumoMedia} kWh`;
      cargarDatos(document.getElementById("ciudadMesSelect").value);
    } else {
      document.getElementById("cfeResultado").textContent =
        "No se detectó información suficiente (lecturas o días).";
    }
  });
});

// Cargar CSV
document.getElementById("csvInput").addEventListener("change", (e) => {
  const file = e.target.files[0];
  if (!file) return;

  Papa.parse(file, {
    header: true,
    complete: results => {
      const datos = results.data.map(row => parseFloat(row.radiación || row.radiacion)).filter(n => !isNaN(n));
      if (datos.length > 0) {
        datosRadiacionExterna = datos;
        document.getElementById("csvInfo").textContent = `Archivo cargado con ${datos.length} días de datos.`;
        cargarDatos(document.getElementById("ciudadMesSelect").value);
      } else {
        document.getElementById("csvInfo").textContent = "No se pudieron leer los datos de radiación.";
      }
    }
  });
});
