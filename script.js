
function mostrarSeccion(seccionId) {
    document.querySelectorAll('.seccion').forEach(seccion => {
        seccion.style.display = 'none';
    });
    document.getElementById(seccionId).style.display = 'block';
}
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


function actualizarUrna() {
  const num = parseInt(document.getElementById("numBalls").value);
  const conReemplazo = document.getElementById("reemplazo").checked;
  const combinaciones = [];
  const conteo = {};

  for (let i = 1; i <= num; i++) {
    for (let j = conReemplazo ? 1 : i + 1; j <= num; j++) {
      const suma = i + j;
      combinaciones.push([i, j]);
      conteo[suma] = (conteo[suma] || 0) + 1;
    }
  }

  const total = combinaciones.length;
  const tabla = document.getElementById("tablaResultados");
  tabla.innerHTML = `
    <tr><th>Combinación</th><th>Suma (Z)</th><th>Probabilidad</th></tr>
    ${combinaciones.map(([a, b]) => {
      const z = a + b;
      const prob = (1 / total).toFixed(3);
      return `<tr><td>{${a}, ${b}}</td><td>${z}</td><td>${prob}</td></tr>`;
    }).join('')}
  `;

  const pasoDiv = document.getElementById("pasoAPaso");
  let desarrollo = `<p>Total de combinaciones posibles: ${total}</p>`;
  desarrollo += "<p>Se calcula \( P(Z = z) = \frac{\text{número de casos favorables}}{\text{total de casos posibles}} \)</p>";
  desarrollo += "<ul>";
  for (let z in conteo) {
    desarrollo += `<li>\( P(Z = ${z}) = \frac{${conteo[z]}}{${total}} = ${(conteo[z]/total).toFixed(3)} \)</li>`;
  }
  desarrollo += "</ul>";
  pasoDiv.innerHTML = desarrollo;
  MathJax.typeset();

  const histCtx = document.getElementById("histograma").getContext("2d");
  const cdfCtx = document.getElementById("cdf").getContext("2d");
  const etiquetas = Object.keys(conteo).map(Number).sort((a,b)=>a-b);
  const valores = etiquetas.map(k => conteo[k] / total);
  const acumulada = valores.reduce((acc, val) => {
    acc.push((acc.length ? acc[acc.length - 1] : 0) + val);
    return acc;
  }, []);

  if (window.histChart) window.histChart.destroy();
  if (window.cdfChart) window.cdfChart.destroy();

  window.histChart = new Chart(histCtx, {
    type: "bar",
    data: {
      labels: etiquetas,
      datasets: [{ label: "P(Z=z)", data: valores, backgroundColor: "#007bff" }]
    }
  });

  window.cdfChart = new Chart(cdfCtx, {
    type: "line",
    data: {
      labels: etiquetas,
      datasets: [{ label: "F(Z≤z)", data: acumulada, borderColor: "#28a745", fill: false }]
    }
  });
}

document.getElementById("descargarBtn").addEventListener("click", () => {
  const filas = Array.from(document.querySelectorAll("#tablaResultados tr"));
  const csv = filas.map(row => Array.from(row.children).map(cell => cell.textContent).join(",")).join("\n");
  const blob = new Blob([csv], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "tabla_probabilidades.csv";
  a.click();
  URL.revokeObjectURL(url);
});
