// app-supabase.js - Archivo principal actualizado para Supabase

// Función para esperar a que un objeto esté disponible
async function waitForObject(objName, timeout = 10000) {
    return new Promise((resolve, reject) => {
        if (window[objName]) {
            resolve(window[objName]);
            return;
        }
        
        const startTime = Date.now();
        const interval = setInterval(() => {
            if (window[objName]) {
                clearInterval(interval);
                resolve(window[objName]);
            } else if (Date.now() - startTime > timeout) {
                clearInterval(interval);
                console.warn(`⚠️ ${objName} no disponible después de ${timeout}ms`);
                resolve(null);
            }
        }, 100);
    });
}

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    try {
        // Esperar a que Supabase esté disponible
        const supabase = await waitForObject('supabase', 3000);
        
        if (!supabase) {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo offline - usando datos locales';
            statusElement.className = 'alert alert-warning';
            console.log('🔶 Supabase no disponible, modo offline activado');
            return false;
        }
        
        // Probar conexión
        const { data, error } = await supabase.auth.getSession();
        
        if (error) {
            console.error('❌ Error de conexión Supabase:', error);
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Error de conexión - modo offline';
            statusElement.className = 'alert alert-danger';
            return false;
        }
        
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
        statusElement.className = 'alert alert-success';
        console.log('✅ Conexión Supabase establecida');
        return true;
        
    } catch (error) {
        console.error('❌ Error verificando conexión:', error);
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Modo offline - usando datos locales';
        statusElement.className = 'alert alert-warning';
        return false;
    }
}

// Cargar datos iniciales
async function loadInitialData() {
    try {
        console.log('📊 Cargando datos iniciales...');
        
        // Verificar si DataManagerSupabase está disponible
        const dataManager = await waitForObject('DataManagerSupabase', 3000);
        
        if (!dataManager) {
            console.warn('⚠️ DataManagerSupabase no disponible, cargando datos locales');
            return loadLocalData();
        }
        
        // Cargar datos desde Supabase
        const data = await dataManager.loadInitialData();
        console.log(`✅ Datos cargados: ${data.routes.length} rutas, ${data.deliveries.length} entregas, ${data.drivers.length} repartidores`);
        
        return data;
        
    } catch (error) {
        console.error('❌ Error cargando datos iniciales:', error);
        return loadLocalData();
    }
}

// Cargar datos locales como fallback
function loadLocalData() {
    console.log('📁 Cargando datos desde localStorage...');
    
    const routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
    const deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
    const drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
    
    // Si no hay datos locales, cargar drivers.json como fallback
    if (drivers.length === 0) {
        try {
            // Intentar cargar drivers.json desde archivo
            fetch('drivers.json')
                .then(response => response.json())
                .then(data => {
                    console.log('📥 Drivers cargados desde drivers.json:', data.length);
                    localStorage.setItem('delivery_drivers', JSON.stringify(data));
                    
                    // Actualizar UI si es necesario
                    if (window.UIManager && window.DriverManagerSupabase) {
                        setTimeout(() => {
                            DriverManagerSupabase.loadDrivers();
                        }, 1000);
                    }
                })
                .catch(e => console.warn('No se pudo cargar drivers.json:', e));
        } catch (e) {
            console.warn('No se pudo cargar drivers.json:', e);
        }
    }
    
    console.log(`📊 Datos locales: ${routes.length} rutas, ${deliveries.length} entregas, ${drivers.length} repartidores`);
    
    return { routes, deliveries, drivers };
}

// Asignar eventos globales
function assignGlobalEvents() {
    console.log('🔗 Asignando eventos globales...');
    
    // Evento para recargar datos desde Supabase
    window.loadDataFromSupabase = async function() {
        console.log('🔄 Recargando datos desde Supabase...');
        
        if (window.UIManager) {
            UIManager.showNotification('🔄 Recargando datos desde Supabase...', 'info');
        }
        
        try {
            const data = await loadInitialData();
            
            if (window.UIManager) {
                UIManager.showNotification(
                    `✅ Datos recargados: ${data.routes.length} rutas, ${data.deliveries.length} entregas`,
                    'success'
                );
                
                // Recargar vistas según el usuario actual
                if (window.AuthManagerSupabase && AuthManagerSupabase.currentUser) {
                    if (AuthManagerSupabase.currentUser.role === 'admin') {
                        UIManager.loadDashboard();
                        
                        if (window.RouteManagerSupabase) RouteManagerSupabase.loadRoutes();
                        if (window.DeliveryManagerSupabase) DeliveryManagerSupabase.loadDeliveries();
                        if (window.DriverManagerSupabase) DriverManagerSupabase.loadDrivers();
                    } else {
                        UIManager.loadDriverRoutes();
                        UIManager.loadDriverDeliveries();
                        UIManager.updateDriverProfile();
                    }
                }
            }
            
        } catch (error) {
            console.error('Error recargando datos:', error);
            if (window.UIManager) {
                UIManager.showNotification('❌ Error recargando datos: ' + error.message, 'danger');
            }
        }
    };
    
    // Reemplazar la función original
    window.loadDataFromFiles = window.loadDataFromSupabase;
    
    // Función para limpiar datos locales
    window.clearAllData = function() {
        if (confirm('¿Estás seguro de que quieres limpiar todos los datos locales?\n\nEsto eliminará: rutas, entregas y repartidores guardados localmente.')) {
            localStorage.removeItem('delivery_routes');
            localStorage.removeItem('delivery_deliveries');
            localStorage.removeItem('delivery_drivers');
            localStorage.removeItem('currentUser');
            
            if (window.UIManager) {
                UIManager.showNotification('🗑️ Datos locales eliminados', 'success');
            }
            
            // Recargar la página después de 2 segundos
            setTimeout(() => {
                location.reload();
            }, 2000);
        }
    };
    
    // Función para mostrar información del sistema
    window.showSystemInfo = function() {
        if (window.UIManager && UIManager.showSystemInfo) {
            UIManager.showSystemInfo();
        } else {
            const info = `
                <div style="padding: 20px;">
                    <h3>Información del Sistema</h3>
                    <p><strong>Modo:</strong> ${window.supabase ? 'Supabase' : 'Offline'}</p>
                    <p><strong>Conexión:</strong> ${navigator.onLine ? 'Online' : 'Offline'}</p>
                    <p><strong>Datos locales:</strong></p>
                    <ul>
                        <li>Rutas: ${JSON.parse(localStorage.getItem('delivery_routes') || '[]').length}</li>
                        <li>Entregas: ${JSON.parse(localStorage.getItem('delivery_deliveries') || '[]').length}</li>
                        <li>Repartidores: ${JSON.parse(localStorage.getItem('delivery_drivers') || '[]').length}</li>
                    </ul>
                </div>
            `;
            
            alert(info);
        }
    };
}

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando Delivery Routes App...');
    
    // Establecer admin como tipo de usuario por defecto
    const adminOption = document.getElementById('adminOption');
    const driverOption = document.getElementById('driverOption');
    
    if (adminOption && driverOption) {
        adminOption.classList.add('active');
        driverOption.classList.remove('active');
    }
    
    // Verificar conexión a Supabase
    const isConnected = await checkSupabaseConnection();
    
    if (!isConnected) {
        console.log('🔶 Modo offline activado');
    }
    
    // Esperar a que los módulos necesarios estén cargados
    await Promise.all([
        waitForObject('AuthManagerSupabase', 5000),
        waitForObject('UIManager', 5000)
    ]);
    
    // Intentar autenticación automática
    if (window.AuthManagerSupabase) {
        const autoLogin = await AuthManagerSupabase.init();
        
        if (autoLogin) {
            console.log('✅ Sesión recuperada automáticamente');
        } else {
            console.log('🔐 Inicia sesión manualmente');
        }
    } else {
        console.warn('⚠️ AuthManagerSupabase no disponible');
    }
    
    // Asignar eventos globales
    assignGlobalEvents();
    
    console.log('✅ Aplicación inicializada');
}

// Función para exportar datos a JSON
window.exportData = async function() {
    try {
        let routes, deliveries, drivers;
        
        // Intentar obtener datos de Supabase primero
        if (window.DataManagerSupabase) {
            routes = await DataManagerSupabase.getRoutesFromSupabase();
            deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            drivers = await DataManagerSupabase.getDriversFromSupabase();
        } else {
            // Usar datos locales
            routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        }
        
        const data = {
            routes,
            deliveries,
            drivers,
            exportDate: new Date().toISOString(),
            source: window.supabase ? 'Supabase' : 'Local'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `delivery-routes-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        if (window.UIManager) {
            UIManager.showNotification('📤 Datos exportados correctamente', 'success');
        }
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        if (window.UIManager) {
            UIManager.showNotification('❌ Error exportando datos', 'danger');
        }
    }
};

// Función para importar datos a Supabase
window.importData = async function() {
    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.json';
    
    input.onchange = async function(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = async function(e) {
            try {
                const data = JSON.parse(e.target.result);
                
                if (!confirm(`¿Importar datos?\n\nRutas: ${data.routes?.length || 0}\nEntregas: ${data.deliveries?.length || 0}\nRepartidores: ${data.drivers?.length || 0}`)) {
                    return;
                }
                
                if (window.UIManager) {
                    UIManager.showNotification('🔄 Importando datos...', 'info');
                }
                
                // Importar datos según el modo
                if (window.supabase && window.DataManagerSupabase) {
                    // Importar a Supabase
                    if (data.routes) {
                        for (const route of data.routes) {
                            await DataManagerSupabase.createRoute(route);
                        }
                    }
                    
                    if (data.deliveries) {
                        for (const delivery of data.deliveries) {
                            await DataManagerSupabase.createDelivery(delivery);
                        }
                    }
                    
                    if (data.drivers) {
                        for (const driver of data.drivers) {
                            await DataManagerSupabase.createDriver(driver);
                        }
                    }
                } else {
                    // Guardar localmente
                    if (data.routes) {
                        localStorage.setItem('delivery_routes', JSON.stringify(data.routes));
                    }
                    
                    if (data.deliveries) {
                        localStorage.setItem('delivery_deliveries', JSON.stringify(data.deliveries));
                    }
                    
                    if (data.drivers) {
                        localStorage.setItem('delivery_drivers', JSON.stringify(data.drivers));
                    }
                }
                
                if (window.UIManager) {
                    UIManager.showNotification('📥 Datos importados correctamente', 'success');
                }
                
                // Recargar datos
                if (window.loadDataFromSupabase) {
                    setTimeout(() => {
                        loadDataFromSupabase();
                    }, 1000);
                }
                
            } catch (error) {
                console.error('Error importando datos:', error);
                alert('❌ Error al importar datos: ' + error.message);
            }
        };
        reader.readAsText(file);
    };
    
    input.click();
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    // Pequeño retraso para asegurar que los scripts se carguen
    setTimeout(() => {
        initApp();
    }, 500);
});

// Exportar funciones globales
window.selectUserType = selectUserType;
window.showSection = function(sectionId) {
    if (window.UIManager && UIManager.showSection) {
        UIManager.showSection(sectionId);
    }
};
window.showDriverSection = function(sectionId) {
    if (window.UIManager && UIManager.showDriverSection) {
        UIManager.showDriverSection(sectionId);
    }
};
window.logout = logoutSupabase;
