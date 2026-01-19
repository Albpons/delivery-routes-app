// Aplicación principal
const DeliveryApp = {
    // Inicializar
    async init() {
        console.log('🚀 Iniciando Delivery Pro...');
        
        // Inicializar módulos
        await this.initializeModules();
        
        // Configurar PWA
        this.setupPWA();
        
        // Mostrar estado inicial
        this.showInitialStatus();
        
        console.log('✅ Aplicación lista');
    },
    
    // Inicializar módulos
    async initializeModules() {
        try {
            // 1. Configurar Supabase
            const connection = await checkSupabaseConnection();
            console.log('🔗 Conexión Supabase:', connection.success ? '✅' : '❌');
            
            // 2. Inicializar base de datos si es necesario
            await initializeDatabase();
            
            // 3. Inicializar autenticación
            await AuthManager.init();
            
            // 4. Inicializar gestión de datos
            await DataManager.init();
            
            // 5. Inicializar otros módulos
            if (CSVManager) CSVManager.init();
            if (RouteManager) RouteManager.init();
            if (DeliveryManager) DeliveryManager.init();
            if (DriverManager) DriverManager.init();
            if (UIManager) UIManager.init();
            
            // 6. Escuchar cambios en los datos
            document.addEventListener('dataChanged', () => {
                // Actualizar estadísticas
                UIManager.updateStats();
                UIManager.updateActivityLog();
            });
            
        } catch (error) {
            console.error('❌ Error inicializando módulos:', error);
            showToast('Error inicializando la aplicación', 'error');
        }
    },
    
    // Configurar PWA
    setupPWA() {
        // Registrar service worker si está disponible
        if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('✅ Service Worker registrado:', registration);
                    })
                    .catch(error => {
                        console.log('❌ Error registrando Service Worker:', error);
                    });
            });
        }
        
        // Manejar instalación de PWA
        let deferredPrompt;
        
        window.addEventListener('beforeinstallprompt', (e) => {
            // Prevenir que Chrome muestre el prompt automático
            e.preventDefault();
            // Guardar el evento para mostrarlo más tarde
            deferredPrompt = e;
            
            // Mostrar botón de instalación
            this.showInstallButton();
        });
        
        // Manejar instalación
        window.addEventListener('appinstalled', () => {
            console.log('✅ PWA instalada');
            deferredPrompt = null;
        });
    },
    
    // Mostrar botón de instalación
    showInstallButton() {
        // Solo mostrar si estamos en modo standalone
        if (window.matchMedia('(display-mode: browser)').matches) {
            const installButton = document.createElement('button');
            installButton.className = 'btn btn-success btn-sm';
            installButton.innerHTML = '<i class="fas fa-download"></i> Instalar App';
            installButton.onclick = this.installPWA;
            
            const headerActions = document.querySelector('.header-actions');
            if (headerActions) {
                headerActions.appendChild(installButton);
            }
        }
    },
    
    // Instalar PWA
    async installPWA() {
        if (deferredPrompt) {
            deferredPrompt.prompt();
            const { outcome } = await deferredPrompt.userChoice;
            
            if (outcome === 'accepted') {
                console.log('✅ Usuario aceptó la instalación');
            } else {
                console.log('❌ Usuario rechazó la instalación');
            }
            
            deferredPrompt = null;
        }
    },
    
    // Mostrar estado inicial
    showInitialStatus() {
        // Actualizar fecha para repartidor
        if (AuthManager.userRole === 'driver') {
            AuthManager.updateDate();
        }
        
        // Mostrar mensaje de bienvenida
        setTimeout(() => {
            if (AuthManager.isAuthenticated) {
                showToast(`¡Bienvenido ${AuthManager.currentUser.name}!`, 'success');
            }
        }, 1000);
    },
    
    // Limpiar todos los datos (solo para desarrollo)
    clearAllData() {
        if (!confirm('⚠️ ¿Estás seguro? Esto eliminará TODOS los datos locales.')) return;
        
        localStorage.clear();
        showToast('Datos locales eliminados', 'info');
        
        // Recargar página
        setTimeout(() => {
            location.reload();
        }, 1000);
    }
};

// Funciones globales adicionales
window.clearAllData = function() {
    DeliveryApp.clearAllData();
};

// Mostrar sección por defecto en URL hash
window.addEventListener('hashchange', () => {
    const hash = window.location.hash.substring(1);
    if (hash) {
        if (AuthManager.userRole === 'admin') {
            showSection(hash);
        } else if (AuthManager.userRole === 'driver') {
            showDriverSection(hash);
        }
    }
});

// Inicializar aplicación cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', () => {
    DeliveryApp.init();
});

// Exportar para uso global
window.DeliveryApp = DeliveryApp;
