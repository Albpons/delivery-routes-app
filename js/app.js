// app.js - Archivo principal simplificado
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Delivery Pro App iniciando...');
    
    // Inicializar aplicación
    await initializeApp();
});

// Inicializar aplicación
async function initializeApp() {
    try {
        // Mostrar estado de conexión
        updateConnectionStatus('Conectando...', 'info');
        
        // Inicializar base de datos
        const initResult = await window.initializeDatabase();
        
        if (initResult && initResult.success) {
            console.log('✅ Aplicación inicializada correctamente');
            
            if (initResult.offline) {
                updateConnectionStatus('⚠️ Modo offline activado', 'warning');
                showToast('Modo offline - usando datos locales', 'warning');
            } else {
                updateConnectionStatus('✅ Conectado a Supabase', 'success');
            }
            
            // Cargar repartidores para login
            if (window.AuthManager) {
                await AuthManager.loadDriversForLogin();
            }
            
            // Verificar autenticación automática
            if (window.AuthManager) {
                const autoLogin = await AuthManager.init();
                if (autoLogin) {
                    console.log('✅ Sesión recuperada automáticamente');
                }
            }
            
            // Configurar eventos
            setupEventListeners();
            
        } else {
            console.error('❌ Error inicializando:', initResult?.error);
            updateConnectionStatus('⚠️ Error de conexión', 'error');
            showToast('Error de conexión - modo offline activado', 'error');
            
            // Intentar cargar datos locales
            if (window.DataManager) {
                await DataManager.loadInitialData();
            }
        }
    } catch (error) {
        console.error('❌ Error inicializando aplicación:', error);
        updateConnectionStatus('⚠️ Error crítico', 'error');
        showToast('Error inicializando aplicación', 'error');
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
    
    console.log('✅ Event listeners configurados');
}

// Actualizar estado de conexión
function updateConnectionStatus(message, type) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    const icons = {
        success: 'fa-wifi',
        error: 'fa-wifi-slash',
        info: 'fa-sync fa-spin',
        warning: 'fa-exclamation-triangle'
    };
    
    const classes = {
        success: 'connected',
        error: 'disconnected',
        info: '',
        warning: 'disconnected'
    };
    
    statusElement.innerHTML = `<i class="fas ${icons[type] || 'fa-wifi'}"></i> ${message}`;
    statusElement.className = 'connection-status';
    
    if (classes[type]) {
        statusElement.classList.add(classes[type]);
    }
}

// Inicializar módulos cuando estén disponibles
document.addEventListener('DOMContentLoaded', function() {
    // Inicializar módulos con verificación
    const initModules = () => {
        if (window.CSVManager && window.CSVManager.init) {
            CSVManager.init();
        }
        if (window.UIManager && window.UIManager.init) {
            UIManager.init();
        }
        if (window.RouteManager && window.RouteManager.init) {
            RouteManager.init();
        }
        if (window.DeliveryManager && window.DeliveryManager.init) {
            DeliveryManager.init();
        }
        if (window.DriverManager && window.DriverManager.init) {
            DriverManager.init();
        }
    };
    
    // Esperar un momento para que los scripts carguen
    setTimeout(initModules, 100);
});

// Exportar funciones globales
window.initializeApp = initializeApp;
window.updateConnectionStatus = updateConnectionStatus;
