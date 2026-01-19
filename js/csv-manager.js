// Gestión de carga y procesamiento de CSV
const CSVManager = {
    currentFile: null,
    parsedData: [],
    
    // Inicializar
    init() {
        this.setupDragAndDrop();
        this.setupFileInput();
    },
    
    // Configurar drag and drop
    setupDragAndDrop() {
        const dropZone = document.getElementById('csvDropZone');
        if (!dropZone) return;
        
        dropZone.addEventListener('dragover', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = 'var(--primary)';
            dropZone.style.background = 'var(--primary-light)';
        });
        
        dropZone.addEventListener('dragleave', () => {
            dropZone.style.borderColor = '';
            dropZone.style.background = '';
        });
        
        dropZone.addEventListener('drop', (e) => {
            e.preventDefault();
            dropZone.style.borderColor = '';
            dropZone.style.background = '';
            
            const files = e.dataTransfer.files;
            if (files.length > 0) {
                this.handleFile(files[0]);
            }
        });
    },
    
    // Configurar input de archivo
    setupFileInput() {
        const fileInput = document.getElementById('csvFileInput');
        if (!fileInput) return;
        
        fileInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.handleFile(file);
            }
        });
    },
    
    // Manejar archivo
    async handleFile(file) {
        if (!file.name.toLowerCase().endsWith('.csv')) {
            showToast('Por favor, selecciona un archivo CSV', 'warning');
            return;
        }
        
        this.currentFile = file;
        
        try {
            showToast('Procesando archivo...', 'info');
            
            // Leer archivo
            const text = await this.readFile(file);
            
            // Parsear CSV
            this.parsedData = this.parseCSV(text);
            
            // Validar datos
            const validation = this.validateData(this.parsedData);
            if (!validation.valid) {
                throw new Error(validation.error);
            }
            
            // Mostrar vista previa
            this.showPreview(this.parsedData);
            
            showToast('Archivo cargado correctamente', 'success');
        } catch (error) {
            showToast(`Error: ${error.message}`, 'error');
            console.error('Error procesando archivo:', error);
        }
    },
    
    // Leer archivo
    readFile(file) {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            
            reader.onload = (e) => {
                resolve(e.target.result);
            };
            
            reader.onerror = () => {
                reject(new Error('Error leyendo el archivo'));
            };
            
            reader.readAsText(file, 'UTF-8');
        });
    },
    
    // Parsear CSV
    parseCSV(text) {
        const lines = text.split('\n');
        const headers = lines[0].split(',').map(h => h.trim());
        
        // Validar encabezados
        const expectedHeaders = AppConfig.CSV_COLUMNS;
        if (!this.validateHeaders(headers, expectedHeaders)) {
            throw new Error('Los encabezados del CSV no coinciden con el formato esperado');
        }
        
        // Parsear filas
        const data = [];
        
        for (let i = 1; i < lines.length; i++) {
            if (lines[i].trim() === '') continue;
            
            const values = this.parseCSVLine(lines[i]);
            const row = {};
            
            headers.forEach((header, index) => {
                row[header] = values[index] ? values[index].trim() : '';
            });
            
            // Validar fila
            if (row.Cliente && row.Dirección) {
                data.push(row);
            }
        }
        
        return data;
    },
    
    // Parsear línea CSV (maneja comas dentro de comillas)
    parseCSVLine(line) {
        const values = [];
        let current = '';
        let inQuotes = false;
        
        for (let i = 0; i < line.length; i++) {
            const char = line[i];
            const nextChar = line[i + 1];
            
            if (char === '"') {
                inQuotes = !inQuotes;
            } else if (char === ',' && !inQuotes) {
                values.push(current);
                current = '';
            } else {
                current += char;
            }
        }
        
        values.push(current);
        return values;
    },
    
    // Validar encabezados
    validateHeaders(headers, expectedHeaders) {
        if (headers.length !== expectedHeaders.length) {
            return false;
        }
        
        for (let i = 0; i < headers.length; i++) {
            if (headers[i] !== expectedHeaders[i]) {
                return false;
            }
        }
        
        return true;
    },
    
    // Validar datos
    validateData(data) {
        if (data.length === 0) {
            return { valid: false, error: 'El archivo CSV está vacío' };
        }
        
        for (let i = 0; i < data.length; i++) {
            const row = data[i];
            
            if (!row.Cliente || row.Cliente.trim() === '') {
                return { 
                    valid: false, 
                    error: `Fila ${i + 2}: Falta el nombre del cliente` 
                };
            }
            
            if (!row.Dirección || row.Dirección.trim() === '') {
                return { 
                    valid: false, 
                    error: `Fila ${i + 2}: Falta la dirección` 
                };
            }
            
            if (!row.Ruta || row.Ruta.trim() === '') {
                return { 
                    valid: false, 
                    error: `Fila ${i + 2}: Falta la ruta asignada` 
                };
            }
        }
        
        return { valid: true };
    },
    
    // Mostrar vista previa
    showPreview(data) {
        const previewElement = document.getElementById('csvPreview');
        const previewBody = document.getElementById('csvPreviewBody');
        
        if (!previewElement || !previewBody) return;
        
        // Limitar a 10 filas para la vista previa
        const previewData = data.slice(0, 10);
        
        let html = '';
        previewData.forEach((row, index) => {
            html += `
                <tr>
                    <td>${row.Cliente || ''}</td>
                    <td>${row.Dirección || ''}</td>
                    <td>${row.Teléfono || ''}</td>
                    <td><span class="badge badge-primary">${row.Ruta || ''}</span></td>
                    <td>${this.truncateText(row.Comanda || '', 50)}</td>
                </tr>
            `;
        });
        
        previewBody.innerHTML = html;
        previewElement.classList.remove('hidden');
        
        // Mostrar resumen
        this.showSummary(data);
    },
    
    // Mostrar resumen
    showSummary(data) {
        const previewElement = document.getElementById('csvPreview');
        if (!previewElement) return;
        
        const summary = document.createElement('div');
        summary.className = 'alert alert-info mt-3';
        
        // Agrupar por ruta
        const routes = {};
        data.forEach(row => {
            const route = row.Ruta || 'Sin ruta';
            routes[route] = (routes[route] || 0) + 1;
        });
        
        let routesHtml = '';
        for (const [route, count] of Object.entries(routes)) {
            routesHtml += `<li><strong>${route}:</strong> ${count} entregas</li>`;
        }
        
        summary.innerHTML = `
            <h4><i class="fas fa-chart-pie"></i> Resumen del archivo</h4>
            <p><strong>Total de entregas:</strong> ${data.length}</p>
            <p><strong>Rutas detectadas:</strong></p>
            <ul style="margin-left: 20px;">
                ${routesHtml}
            </ul>
            ${data.length > 10 ? `<p class="text-muted">Mostrando 10 de ${data.length} filas</p>` : ''}
        `;
        
        // Insertar después de la tabla
        const table = previewElement.querySelector('table');
        if (table) {
            table.parentNode.insertBefore(summary, table.nextSibling);
        }
    },
    
    // Truncar texto
    truncateText(text, maxLength) {
        if (text.length <= maxLength) return text;
        return text.substring(0, maxLength) + '...';
    },
    
    // Procesar CSV
    async processCSV() {
        if (!this.parsedData.length) {
            showToast('No hay datos para procesar', 'warning');
            return;
        }
        
        try {
            showToast('Procesando entregas...', 'info');
            
            let createdCount = 0;
            let updatedRoutes = new Set();
            
            // Procesar cada fila
            for (const row of this.parsedData) {
                // Crear entrega
                const deliveryData = {
                    client: row.Cliente,
                    address: row.Dirección,
                    phone: row.Teléfono || '',
                    route: row.Ruta,
                    order_details: row.Comanda || '',
                    observations: row.Observaciones || '',
                    status: 'pending'
                };
                
                const result = await DataManager.createDelivery(deliveryData);
                
                if (result.success) {
                    createdCount++;
                    updatedRoutes.add(row.Ruta);
                    
                    // Verificar si la ruta existe
                    const routeExists = DataManager.getRouteByName(row.Ruta);
                    if (!routeExists) {
                        // Crear ruta automáticamente
                        await DataManager.createRoute({
                            name: row.Ruta,
                            driver: '', // Sin asignar por ahora
                            status: 'pending',
                            description: `Ruta creada automáticamente desde CSV`
                        });
                    }
                }
            }
            
            // Actualizar contadores de rutas
            for (const routeName of updatedRoutes) {
                await DataManager.updateRouteCounters(routeName);
            }
            
            // Limpiar vista previa
            this.clearPreview();
            
            showToast(`✅ ${createdCount} entregas creadas correctamente`, 'success');
            
            // Recargar datos
            await DataManager.loadInitialData();
            
        } catch (error) {
            console.error('Error procesando CSV:', error);
            showToast(`Error procesando CSV: ${error.message}`, 'error');
        }
    },
    
    // Limpiar vista previa
    clearPreview() {
        const previewElement = document.getElementById('csvPreview');
        const previewBody = document.getElementById('csvPreviewBody');
        const fileInput = document.getElementById('csvFileInput');
        
        if (previewElement) previewElement.classList.add('hidden');
        if (previewBody) previewBody.innerHTML = '';
        if (fileInput) fileInput.value = '';
        
        this.currentFile = null;
        this.parsedData = [];
    },
    
    // Descargar plantilla CSV
    downloadTemplate() {
        const headers = AppConfig.CSV_COLUMNS;
        const sampleData = [
            ['Juan Pérez', 'Calle Mayor 123, Piso 2A', '612345678', 'Ruta Centro', '2x Pizza Margarita, 1x Coca-Cola', 'Timbre estropeado, llamar al móvil'],
            ['María López', 'Avenida Norte 45', '698765432', 'Ruta Norte', '1x Ensalada César, 3x Agua Mineral', 'Dejar en portería'],
            ['Carlos García', 'Plaza Central 7, Local B', '600112233', 'Ruta Sur', '4x Hamburguesas, 2x Patatas, 4x Refrescos', 'Pagar con tarjeta']
        ];
        
        let csvContent = headers.join(',') + '\n';
        sampleData.forEach(row => {
            csvContent += row.map(field => `"${field}"`).join(',') + '\n';
        });
        
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        
        link.setAttribute('href', url);
        link.setAttribute('download', 'plantilla_entregas.csv');
        link.style.visibility = 'hidden';
        
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        showToast('Plantilla descargada', 'success');
    }
};

// Funciones globales
window.openCSVUpload = function() {
    showSection('csv-upload');
};

window.processCSV = function() {
    CSVManager.processCSV();
};

window.clearCSVPreview = function() {
    CSVManager.clearPreview();
};

window.downloadCSVTemplate = function() {
    CSVManager.downloadTemplate();
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    CSVManager.init();
});

// Exportar para uso global
window.CSVManager = CSVManager;
