document.addEventListener('DOMContentLoaded', function() {
    // Ocultar pantalla de carga
    setTimeout(() => {
        document.getElementById('loading-screen').classList.add('hidden');
    }, 1500);

    // Variables globales
    let chartInstance = null;
    let currentDistribution = '';
    let currentParams = {};

    // Elementos del DOM
    const selectDist = document.getElementById('distribucion-select');
    const parametrosSection = document.getElementById('parametros-section');
    const formulaContainer = document.getElementById('formula-container');
    const descripcionDist = document.getElementById('descripcion-dist');
    const resultadoContainer = document.getElementById('resultado-container');
    const pasosContainer = document.getElementById('pasos-container');
    const calcularBtn = document.getElementById('calcular-btn');
    const limpiarBtn = document.getElementById('limpiar-btn');
    const chartCanvas = document.getElementById('dist-chart');
    const zoomInBtn = document.getElementById('zoom-in');
    const zoomOutBtn = document.getElementById('zoom-out');
    const resetZoomBtn = document.getElementById('reset-zoom');
    const exportChartBtn = document.getElementById('export-chart');

    // Eventos
    selectDist.addEventListener('change', function() {
        currentDistribution = this.value;
        if (currentDistribution) {
            updateInterface();
        } else {
            resetCalculator();
        }
    });

    calcularBtn.addEventListener('click', function() {
        if (!currentDistribution) {
            showError('Seleccione una distribución primero');
            return;
        }
        
        if (validateInputs()) {
            calculateProbability();
        }
    });

    limpiarBtn.addEventListener('click', resetCalculator);

    // Controles del gráfico
    zoomInBtn.addEventListener('click', () => chartInstance && chartInstance.zoom(1.1));
    zoomOutBtn.addEventListener('click', () => chartInstance && chartInstance.zoom(0.9));
    resetZoomBtn.addEventListener('click', () => chartInstance && chartInstance.resetZoom());
    exportChartBtn.addEventListener('click', exportChart);

    // Actualizar interfaz según distribución
    function updateInterface() {
        let paramsHTML = '';
        let formula = '';
        let description = '';

        switch (currentDistribution) {
            case 'uniforme':
                paramsHTML = `
                    <div class="card-header with-icon">
                        <i class="fas fa-dice"></i>
                        <h2>Parámetros Uniforme Discreta</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="param-n"><i class="fas fa-hashtag"></i> Número de resultados (n):</label>
                            <input type="number" id="param-n" class="form-control" min="1" value="6" step="1">
                            <div class="invalid-feedback">Debe ser un entero ≥ 1</div>
                        </div>
                    </div>
                `;
                formula = `P(X = x) = \\frac{1}{n}, \\quad \\text{para } x = 1, 2, \\dots, n`;
                description = `
                    <p>La <strong>distribución uniforme discreta</strong> modela experimentos donde cada resultado posible tiene la misma probabilidad de ocurrir.</p>
                    <p><strong>Parámetro:</strong></p>
                    <ul>
                        <li><em>n</em>: Número de resultados posibles (entero positivo)</li>
                    </ul>
                    <p><strong>Aplicaciones:</strong> Lanzamiento de dados, ruleta justa, selección aleatoria simple.</p>
                `;
                break;
                
            case 'binomial':
                paramsHTML = `
                    <div class="card-header with-icon">
                        <i class="fas fa-project-diagram"></i>
                        <h2>Parámetros Binomial</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="param-n"><i class="fas fa-hashtag"></i> Ensayos (n):</label>
                            <input type="number" id="param-n" class="form-control" min="1" value="10" step="1">
                            <div class="invalid-feedback">Debe ser entero ≥ 1</div>
                        </div>
                        <div class="form-group">
                            <label for="param-p"><i class="fas fa-percentage"></i> Probabilidad (p):</label>
                            <div class="input-group">
                                <input type="number" id="param-p" class="form-control" min="0" max="1" step="0.01" value="0.5">
                                <div class="input-group-append">
                                    <span class="input-group-text">0 ≤ p ≤ 1</span>
                                </div>
                            </div>
                            <div class="invalid-feedback">Debe ser entre 0 y 1</div>
                        </div>
                        <div class="form-group">
                            <label for="param-k"><i class="fas fa-bullseye"></i> Éxitos (k):</label>
                            <input type="number" id="param-k" class="form-control" min="0" step="1" value="5">
                            <div class="invalid-feedback" id="k-feedback"></div>
                        </div>
                    </div>
                `;
                formula = `P(X = k) = C(n,k) \\cdot p^k \\cdot (1-p)^{n-k}`;
                description = `
                    <p>La <strong>distribución binomial</strong> modela el número de éxitos en una secuencia de <em>n</em> ensayos independientes.</p>
                    <p><strong>Parámetros:</strong></p>
                    <ul>
                        <li><em>n</em>: Número de ensayos (entero positivo)</li>
                        <li><em>p</em>: Probabilidad de éxito en cada ensayo (0 ≤ p ≤ 1)</li>
                        <li><em>k</em>: Número de éxitos deseados (0 ≤ k ≤ n)</li>
                    </ul>
                    <p><strong>Aplicaciones:</strong> Control de calidad, estudios médicos, encuestas de opinión.</p>
                `;
                break;
                
            case 'poisson':
                paramsHTML = `
                    <div class="card-header with-icon">
                        <i class="fas fa-chart-line"></i>
                        <h2>Parámetros Poisson</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="param-lambda"><i class="fas fa-lambda"></i> Tasa promedio (λ):</label>
                            <input type="number" id="param-lambda" class="form-control" min="0" step="0.1" value="2.5">
                            <div class="invalid-feedback">Debe ser ≥ 0</div>
                        </div>
                        <div class="form-group">
                            <label for="param-k"><i class="fas fa-bullseye"></i> Eventos (k):</label>
                            <input type="number" id="param-k" class="form-control" min="0" step="1" value="3">
                            <div class="invalid-feedback">Debe ser entero ≥ 0</div>
                        </div>
                    </div>
                `;
                formula = `P(X = k) = \\frac{e^{-\\lambda} \\cdot \\lambda^k}{k!}`;
                description = `
                    <p>La <strong>distribución Poisson</strong> modela eventos raros en un intervalo de tiempo/espacio.</p>
                    <p><strong>Parámetros:</strong></p>
                    <ul>
                        <li><em>λ</em>: Tasa promedio de ocurrencia (λ ≥ 0)</li>
                        <li><em>k</em>: Número de eventos deseados (entero ≥ 0)</li>
                    </ul>
                    <p><strong>Aplicaciones:</strong> Llegadas a un call center, defectos en manufactura.</p>
                `;
                break;
                
            case 'hipergeometrica':
                paramsHTML = `
                    <div class="card-header with-icon">
                        <i class="fas fa-boxes"></i>
                        <h2>Parámetros Hipergeométrica</h2>
                    </div>
                    <div class="card-body">
                        <div class="form-group">
                            <label for="param-N"><i class="fas fa-box-open"></i> Población (N):</label>
                            <input type="number" id="param-N" class="form-control" min="1" value="50" step="1">
                            <div class="invalid-feedback">Debe ser ≥ 1</div>
                        </div>
                        <div class="form-group">
                            <label for="param-K"><i class="fas fa-check-circle"></i> Éxitos en población (K):</label>
                            <input type="number" id="param-K" class="form-control" min="0" step="1" value="20">
                            <div class="invalid-feedback">Debe ser ≤ N</div>
                        </div>
                        <div class="form-group">
                            <label for="param-n"><i class="fas fa-box"></i> Muestra (n):</label>
                            <input type="number" id="param-n" class="form-control" min="1" step="1" value="10">
                            <div class="invalid-feedback">Debe ser ≤ N</div>
                        </div>
                        <div class="form-group">
                            <label for="param-k"><i class="fas fa-bullseye"></i> Éxitos en muestra (k):</label>
                            <input type="number" id="param-k" class="form-control" min="0" step="1" value="4">
                            <div class="invalid-feedback">Debe ser ≤ min(K, n)</div>
                        </div>
                    </div>
                `;
                formula = `P(X = k) = \\frac{C(K,k) \\cdot C(N-K,n-k)}{C(N,n)}`;
                description = `
                    <p>La <strong>distribución hipergeométrica</strong> modela muestreo sin reemplazo.</p>
                    <p><strong>Parámetros:</strong></p>
                    <ul>
                        <li><em>N</em>: Tamaño de la población</li>
                        <li><em>K</em>: Éxitos en población</li>
                        <li><em>n</em>: Tamaño de la muestra</li>
                        <li><em>k</em>: Éxitos deseados en muestra</li>
                    </ul>
                    <p><strong>Aplicaciones:</strong> Control de calidad, estudios biológicos.</p>
                `;
                break;
        }

        parametrosSection.innerHTML = paramsHTML;
        formulaContainer.innerHTML = `\\[ ${formula} \\]`;
        descripcionDist.innerHTML = description;
        
        // Configurar validación de inputs
        setupInputValidation();
        
        // Renderizar MathJax
        MathJax.typesetPromise();
    }

    // Configurar validación de inputs
    function setupInputValidation() {
        const inputs = parametrosSection.querySelectorAll('input');
        
        inputs.forEach(input => {
            input.addEventListener('input', function() {
                validateInput(this);
                
                // Validaciones especiales para relaciones entre parámetros
                if (currentDistribution === 'binomial' && this.id === 'param-n') {
                    const kInput = document.getElementById('param-k');
                    if (kInput) {
                        validateInput(kInput);
                    }
                }
                
                if (currentDistribution === 'hipergeometrica') {
                    const NInput = document.getElementById('param-N');
                    const KInput = document.getElementById('param-K');
                    const nInput = document.getElementById('param-n');
                    const kInput = document.getElementById('param-k');
                    
                    if (this.id === 'param-N') {
                        if (KInput) validateInput(KInput);
                        if (nInput) validateInput(nInput);
                    }
                    
                    if (this.id === 'param-K' || this.id === 'param-n') {
                        if (kInput) validateInput(kInput);
                    }
                }
            });
        });
    }

    // Validar un input específico
    function validateInput(input) {
        const value = input.value.trim();
        const min = input.min ? parseFloat(input.min) : -Infinity;
        const max = input.max ? parseFloat(input.max) : Infinity;
        const step = input.step ? parseFloat(input.step) : 1;
        
        let isValid = true;
        let errorMessage = '';
        
        // Validar requerido
        if (input.required && value === '') {
            isValid = false;
            errorMessage = 'Campo obligatorio';
        }
        
        // Validar número
        if (isValid && value !== '' && isNaN(parseFloat(value))) {
            isValid = false;
            errorMessage = 'Debe ser un número válido';
        }
        
        // Validar mínimo
        if (isValid && value !== '' && parseFloat(value) < min) {
            isValid = false;
            errorMessage = `Mínimo permitido: ${min}`;
        }
        
        // Validar máximo
        if (isValid && value !== '' && parseFloat(value) > max) {
            isValid = false;
            errorMessage = `Máximo permitido: ${max}`;
        }
        
        // Validar paso (para enteros)
        if (isValid && step === 1 && value !== '' && !Number.isInteger(parseFloat(value))) {
            isValid = false;
            errorMessage = 'Debe ser un número entero';
        }
        
        // Validaciones especiales para Hipergeométrica
        if (isValid && currentDistribution === 'hipergeometrica') {
            const NInput = document.getElementById('param-N');
            const KInput = document.getElementById('param-K');
            const nInput = document.getElementById('param-n');
            const kInput = document.getElementById('param-k');
            
            if (input.id === 'param-K' && NInput && parseFloat(value) > parseFloat(NInput.value)) {
                isValid = false;
                errorMessage = `Debe ser ≤ ${NInput.value}`;
            }
            
            if (input.id === 'param-n' && NInput && parseFloat(value) > parseFloat(NInput.value)) {
                isValid = false;
                errorMessage = `Debe ser ≤ ${NInput.value}`;
            }
            
            if (input.id === 'param-k') {
                const maxK = Math.min(
                    KInput ? parseFloat(KInput.value) : Infinity,
                    nInput ? parseFloat(nInput.value) : Infinity
                );
                if (parseFloat(value) > maxK) {
                    isValid = false;
                    errorMessage = `Debe ser ≤ ${maxK}`;
                }
            }
        }
        
        // Validación especial para k en Binomial
        if (isValid && currentDistribution === 'binomial' && input.id === 'param-k') {
            const nInput = document.getElementById('param-n');
            if (nInput && parseFloat(value) > parseFloat(nInput.value)) {
                isValid = false;
                errorMessage = `Debe ser ≤ ${nInput.value}`;
            }
        }
        
        // Aplicar estilos
        if (isValid || value === '') {
            input.classList.remove('is-invalid');
        } else {
            input.classList.add('is-invalid');
            const feedback = input.nextElementSibling;
            if (feedback && feedback.classList.contains('invalid-feedback')) {
                feedback.textContent = errorMessage;
            }
        }
        
        return isValid;
    }

    // Validar todos los inputs
    function validateInputs() {
        const inputs = parametrosSection.querySelectorAll('input');
        let allValid = true;
        
        inputs.forEach(input => {
            if (!validateInput(input)) {
                allValid = false;
            }
        });
        
        if (!allValid) {
            showError('Corrija los campos marcados en rojo');
            return false;
        }
        
        return true;
    }

    // Calcular probabilidad
    function calculateProbability() {
        try {
            // Obtener parámetros
            currentParams = getCurrentParams();
            
            // Calcular según distribución
            let result = 0;
            let calculationSteps = '';
            let chartData = [];
            
            switch (currentDistribution) {
                case 'uniforme':
                    result = 1 / currentParams.n;
                    calculationSteps = generateUniformSteps(currentParams.n);
                    chartData = generateUniformChartData(currentParams.n);
                    break;
                    
                case 'binomial':
                    result = binomialPMF(currentParams.n, currentParams.p, currentParams.k);
                    calculationSteps = generateBinomialSteps(currentParams.n, currentParams.p, currentParams.k);
                    chartData = generateBinomialChartData(currentParams.n, currentParams.p);
                    break;
                    
                case 'poisson':
                    result = poissonPMF(currentParams.lambda, currentParams.k);
                    calculationSteps = generatePoissonSteps(currentParams.lambda, currentParams.k);
                    chartData = generatePoissonChartData(currentParams.lambda);
                    break;
                    
                case 'hipergeometrica':
                    result = hipergeometricPMF(currentParams.N, currentParams.K, currentParams.n, currentParams.k);
                    calculationSteps = generateHipergeometricSteps(currentParams.N, currentParams.K, currentParams.n, currentParams.k);
                    chartData = generateHipergeometricChartData(currentParams.N, currentParams.K, currentParams.n);
                    break;
            }
            
            // Mostrar resultados
            showResult(result, calculationSteps, chartData);
            showToast('Cálculo completado correctamente', 'success');
            
        } catch (error) {
            showError(error.message);
        }
    }

    // Obtener parámetros actuales
    function getCurrentParams() {
        const params = {};
        
        switch (currentDistribution) {
            case 'uniforme':
                params.n = parseInt(document.getElementById('param-n').value);
                break;
                
            case 'binomial':
                params.n = parseInt(document.getElementById('param-n').value);
                params.p = parseFloat(document.getElementById('param-p').value);
                params.k = parseInt(document.getElementById('param-k').value);
                break;
                
            case 'poisson':
                params.lambda = parseFloat(document.getElementById('param-lambda').value);
                params.k = parseInt(document.getElementById('param-k').value);
                break;
                
            case 'hipergeometrica':
                params.N = parseInt(document.getElementById('param-N').value);
                params.K = parseInt(document.getElementById('param-K').value);
                params.n = parseInt(document.getElementById('param-n').value);
                params.k = parseInt(document.getElementById('param-k').value);
                break;
        }
        
        return params;
    }

    // Funciones para generar pasos de cálculo
    function generateUniformSteps(n) {
        return `
            <div class="paso">
                <h3><i class="fas fa-calculator"></i> Paso 1: Aplicar fórmula</h3>
                <p>Para la distribución uniforme discreta:</p>
                \\[ P(X = x) = \\frac{1}{n} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-pen-fancy"></i> Paso 2: Sustituir valores</h3>
                <p>Con n = ${n}:</p>
                \\[ P(X = x) = \\frac{1}{${n}} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-check-double"></i> Paso 3: Resultado final</h3>
                \\[ P(X = x) = ${(1/n).toFixed(6)} \\]
                <div class="resultado-final">${(1/n).toFixed(6)}</div>
            </div>
        `;
    }

    function generateBinomialSteps(n, p, k) {
        const combination = combinations(n, k);
        const probSuccess = Math.pow(p, k);
        const probFailure = Math.pow(1 - p, n - k);
        const finalProb = combination * probSuccess * probFailure;
        
        return `
            <div class="paso">
                <h3><i class="fas fa-calculator"></i> Paso 1: Fórmula binomial</h3>
                \\[ P(X = ${k}) = C(${n},${k}) \\cdot ${p}^{${k}} \\cdot (1-${p})^{${n}-${k}} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-cogs"></i> Paso 2: Calcular combinaciones</h3>
                \\[ C(${n},${k}) = \\frac{${n}!}{${k}! \\cdot (${n}-${k})!} = ${combination} \\]
                <p>Donde ${n}! = ${factorial(n)} y ${k}! = ${factorial(k)}</p>
            </div>
            <div class="paso">
                <h3><i class="fas fa-chart-pie"></i> Paso 3: Calcular probabilidades</h3>
                \\[ ${p}^{${k}} = ${probSuccess.toFixed(6)} \\]
                \\[ (1-${p})^{${n}-${k}} = ${probFailure.toFixed(6)} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-equals"></i> Paso 4: Multiplicar términos</h3>
                \\[ ${combination} \\times ${probSuccess.toFixed(6)} \\times ${probFailure.toFixed(6)} = ${finalProb.toFixed(6)} \\]
                <div class="resultado-final">${finalProb.toFixed(6)}</div>
            </div>
        `;
    }

    function generatePoissonSteps(lambda, k) {
        const numerator = Math.exp(-lambda) * Math.pow(lambda, k);
        const denominator = factorial(k);
        const finalProb = numerator / denominator;
        
        return `
            <div class="paso">
                <h3><i class="fas fa-calculator"></i> Paso 1: Fórmula Poisson</h3>
                \\[ P(X = ${k}) = \\frac{e^{-${lambda}} \\cdot ${lambda}^{${k}}}{${k}!} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-cogs"></i> Paso 2: Calcular términos</h3>
                \\[ e^{-${lambda}} = ${Math.exp(-lambda).toFixed(6)} \\]
                \\[ ${lambda}^{${k}} = ${Math.pow(lambda, k).toFixed(6)} \\]
                \\[ ${k}! = ${denominator} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-divide"></i> Paso 3: Dividir términos</h3>
                \\[ \\frac{${numerator.toFixed(6)}}{${denominator}} = ${finalProb.toFixed(6)} \\]
                <div class="resultado-final">${finalProb.toFixed(6)}</div>
            </div>
        `;
    }

    function generateHipergeometricSteps(N, K, n, k) {
        const combKk = combinations(K, k);
        const combNmKnmk = combinations(N - K, n - k);
        const combNn = combinations(N, n);
        const finalProb = (combKk * combNmKnmk) / combNn;
        
        return `
            <div class="paso">
                <h3><i class="fas fa-calculator"></i> Paso 1: Fórmula Hipergeométrica</h3>
                \\[ P(X = ${k}) = \\frac{C(${K},${k}) \\cdot C(${N}-${K},${n}-${k})}{C(${N},${n})} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-cogs"></i> Paso 2: Calcular combinaciones</h3>
                \\[ C(${K},${k}) = \\frac{${K}!}{${k}! \\cdot (${K}-${k})!} = ${combKk} \\]
                \\[ C(${N}-${K},${n}-${k}) = C(${N-K},${n-k}) = ${combNmKnmk} \\]
                \\[ C(${N},${n}) = \\frac{${N}!}{${n}! \\cdot (${N}-${n})!} = ${combNn} \\]
            </div>
            <div class="paso">
                <h3><i class="fas fa-divide"></i> Paso 3: Calcular probabilidad</h3>
                \\[ \\frac{${combKk} \\times ${combNmKnmk}}{${combNn}} = ${finalProb.toFixed(6)} \\]
                <div class="resultado-final">${finalProb.toFixed(6)}</div>
            </div>
        `;
    }

    // Mostrar resultados
    function showResult(probability, steps, chartData) {
        resultadoContainer.innerHTML = `
            <div class="resultado-header">
                <h3><i class="fas fa-check-circle"></i> Resultado Final</h3>
            </div>
            <div class="resultado-content">
                <p>Para los parámetros ingresados:</p>
                <ul>
                    ${Object.entries(currentParams).map(([key, value]) => `
                        <li><strong>${key}:</strong> ${value}</li>
                    `).join('')}
                </ul>
                <p>La probabilidad calculada es:</p>
            </div>
        `;
        
        pasosContainer.innerHTML = steps;
        renderChart(chartData);
        
        // Renderizar MathJax
        MathJax.typesetPromise();
    }

    // Mostrar error
    function showError(message) {
        resultadoContainer.innerHTML = `
            <div class="alert alert-danger">
                <i class="fas fa-exclamation-triangle"></i> ${message}
            </div>
        `;
        pasosContainer.innerHTML = '';
        
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
        
        showToast(message, 'error');
    }

    // Renderizar gráfico
    function renderChart(dataPoints) {
        if (chartInstance) {
            chartInstance.destroy();
        }
        
        const ctx = chartCanvas.getContext('2d');
        chartInstance = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: dataPoints.map(d => d.x),
                datasets: [{
                    label: `Distribución ${currentDistribution}`,
                    data: dataPoints.map(d => d.y),
                    backgroundColor: 'rgba(52, 152, 219, 0.7)',
                    borderColor: 'rgba(52, 152, 219, 1)',
                    borderWidth: 1
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        title: {
                            display: true,
                            text: 'Probabilidad P(X=x)',
                            font: {
                                weight: 'bold'
                            }
                        }
                    },
                    x: {
                        title: {
                            display: true,
                            text: 'Valor de x',
                            font: {
                                weight: 'bold'
                            }
                        }
                    }
                },
                plugins: {
                    zoom: {
                        zoom: {
                            wheel: {
                                enabled: true
                            },
                            pinch: {
                                enabled: true
                            },
                            mode: 'xy'
                        },
                        pan: {
                            enabled: true,
                            mode: 'xy'
                        }
                    },
                    tooltip: {
                        callbacks: {
                            label: (context) => {
                                return `P(X = ${context.parsed.x}) = ${context.parsed.y.toFixed(6)}`;
                            }
                        }
                    },
                    legend: {
                        position: 'top',
                        labels: {
                            font: {
                                size: 14
                            }
                        }
                    }
                }
            }
        });
    }

    // Exportar gráfico
    function exportChart() {
        if (!chartInstance) {
            showToast('No hay gráfico para exportar', 'warning');
            return;
        }
        
        const link = document.createElement('a');
        link.download = `grafico-${currentDistribution}.png`;
        link.href = chartCanvas.toDataURL('image/png');
        link.click();
        
        showToast('Gráfico exportado como PNG', 'success');
    }

    // Reiniciar calculadora
    function resetCalculator() {
        selectDist.value = '';
        parametrosSection.innerHTML = '';
        formulaContainer.innerHTML = '';
        descripcionDist.innerHTML = '';
        resultadoContainer.innerHTML = '<p class="text-muted">Seleccione una distribución para comenzar</p>';
        pasosContainer.innerHTML = '';
        
        if (chartInstance) {
            chartInstance.destroy();
            chartInstance = null;
        }
    }

    // Mostrar notificación
    function showToast(message, type = 'info') {
        const toast = document.createElement('div');
        toast.className = `toast-notification toast-${type}`;
        toast.innerHTML = `
            <div class="toast-message">${message}</div>
            <button class="toast-close">&times;</button>
        `;
        
        document.body.appendChild(toast);
        
        // Auto-eliminación después de 5 segundos
        setTimeout(() => {
            toast.classList.add('animate__fadeOutRight');
            setTimeout(() => toast.remove(), 300);
        }, 5000);
        
        // Cerrar manualmente
        toast.querySelector('.toast-close').addEventListener('click', () => {
            toast.classList.add('animate__fadeOutRight');
            setTimeout(() => toast.remove(), 300);
        });
    }

    // Funciones matemáticas
    function combinations(n, k) {
        if (k < 0 || k > n) return 0;
        return factorial(n) / (factorial(k) * factorial(n - k));
    }

    function factorial(num) {
        if (num < 0) return NaN;
        if (num === 0 || num === 1) return 1;
        let result = 1;
        for (let i = 2; i <= num; i++) result *= i;
        return result;
    }

    function binomialPMF(n, p, k) {
        return combinations(n, k) * Math.pow(p, k) * Math.pow(1 - p, n - k);
    }

    function poissonPMF(lambda, k) {
        if (lambda < 0 || k < 0) return 0;
        return (Math.exp(-lambda) * Math.pow(lambda, k)) / factorial(k);
    }

    function hipergeometricPMF(N, K, n, k) {
        if (k < Math.max(0, n + K - N) || k > Math.min(K, n)) return 0;
        return (combinations(K, k) * combinations(N - K, n - k)) / combinations(N, n);
    }

    // Generadores de datos para gráficos
    function generateUniformChartData(n) {
        return Array.from({length: n}, (_, i) => ({
            x: i + 1,
            y: 1 / n
        }));
    }

    function generateBinomialChartData(n, p) {
        return Array.from({length: n + 1}, (_, k) => ({
            x: k,
            y: binomialPMF(n, p, k)
        }));
    }

    function generatePoissonChartData(lambda) {
        const maxK = Math.min(20, Math.ceil(lambda * 3));
        return Array.from({length: maxK + 1}, (_, k) => ({
            x: k,
            y: poissonPMF(lambda, k)
        }));
    }

    function generateHipergeometricChartData(N, K, n) {
        const minK = Math.max(0, n + K - N);
        const maxK = Math.min(K, n);
        return Array.from({length: maxK - minK + 1}, (_, i) => ({
            x: minK + i,
            y: hipergeometricPMF(N, K, n, minK + i)
        }));
    }
});
