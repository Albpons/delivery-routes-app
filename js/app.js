// app.js - Archivo principal
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Delivery Pro App iniciando...');
    
    // Inicializar configuración
    await initializeApp();
});

// Inicializar aplicación
async function initializeApp() {
    try {
        // Mostrar estado de conexión
        updateConnectionStatus('Conectando...', 'info');
        
        // Inicializar base de datos
        const initResult = await initializeDatabase();
        
        if (initResult.success) {
            showToast(initResult.message, 'success');
            
            // Cargar repartidores para login
            if (window.AuthManager) {
                await AuthManager.loadDriversForLogin();
            }
            
            // Configurar eventos
            setupEventListeners();
            
            // Verificar autenticación automática
            const autoLogin = await AuthManager.init();
            if (autoLogin) {
                console.log('✅ Sesión recuperada automáticamente');
            }
            
            // Actualizar estado de conexión
            updateConnectionStatus('✅ Conectado a Supabase', 'success');
        } else {
            console.error('❌ Error inicializando:', initResult.error);
            updateConnectionStatus('⚠️ Error de conexión', 'error');
            showToast('Modo offline activado', 'warning');
        }
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        updateConnectionStatus('⚠️ Error crítico', 'error');
    }
}

// Configurar event listeners
function setupEventListeners() {
    // Tabs de login
    const loginTabs = document.querySelectorAll('.login-tabs .tab');
    if (loginTabs) {
        loginTabs.forEach(tab => {
            tab.addEventListener('click', function() {
                const tabId = this.dataset.tab;
                
                // Remover clase active de todos
                loginTabs.forEach(t => t.classList.remove('active'));
                document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));
                
                // Añadir clase active al tab y contenido seleccionado
                this.classList.add('active');
                document.getElementById(tabId + 'Login').classList.add('active');
            });
        });
    }
    
    // Drag and drop para CSV
    setupCSVDragAndDrop();
    
    // Cerrar modales al hacer clic fuera
    setupModalCloseListeners();
}

// Configurar drag and drop para CSV
function setupCSVDragAndDrop() {
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
        if (files.length > 0 && files[0].name.toLowerCase().endsWith('.csv')) {
            document.getElementById('csvFileInput').files = files;
            CSVManager.handleFile(files[0]);
        }
    });
}

// Configurar cierre de modales
function setupModalCloseListeners() {
    const modals = document.querySelectorAll('.modal');
    modals.forEach(modal => {
        modal.addEventListener('click', function(e) {
            if (e.target === this) {
                this.classList.remove('active');
            }
        });
    });
}

// Actualizar estado de conexión
function updateConnectionStatus(message, type) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    statusElement.textContent = message;
    statusElement.className = 'connection-status';
    
    switch(type) {
        case 'success':
            statusElement.classList.add('connected');
            statusElement.innerHTML = `<i class="fas fa-wifi"></i> ${message}`;
            break;
        case 'error':
            statusElement.classList.add('disconnected');
            statusElement.innerHTML = `<i class="fas fa-wifi-slash"></i> ${message}`;
            break;
        case 'info':
            statusElement.innerHTML = `<i class="fas fa-sync fa-spin"></i> ${message}`;
            break;
        case 'warning':
            statusElement.classList.add('disconnected');
            statusElement.innerHTML = `<i class="fas fa-exclamation-triangle"></i> ${message}`;
            break;
    }
}

// Función para mostrar secciones (admin)
window.showSection = function(sectionId) {
    if (window.UIManager) {
        UIManager.showSection(sectionId);
    }
};

// Función para mostrar secciones (repartidor)
window.showDriverSection = function(sectionId) {
    if (window.UIManager) {
        UIManager.showDriverSection(sectionId);
    }
};

// Función para alternar sidebar
window.toggleSidebar = function() {
    if (window.UIManager) {
        UIManager.toggleSidebar();
    }
};

// Función para refrescar datos
window.refreshData = async function() {
    showToast('Actualizando datos...', 'info');
    
    try {
        await DataManager.loadInitialData();
        showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
        showToast('Error actualizando datos', 'error');
    }
};

// Inicializar módulos cuando estén disponibles
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar CSV Manager
    if (window.CSVManager) {
        CSVManager.init();
    }
    
    // Inicializar UI Manager
    if (window.UIManager) {
        UIManager.init();
    }
    
    // Inicializar Route Manager
    if (window.RouteManager) {
        RouteManager.init();
    }
    
    // Inicializar Delivery Manager
    if (window.DeliveryManager) {
        DeliveryManager.init();
    }
    
    // Inicializar Driver Manager
    if (window.DriverManager) {
        DriverManager.init();
    }
});

// Exportar funciones globales
window.initializeApp = initializeApp;
