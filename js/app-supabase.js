// app-supabase.js - Archivo principal actualizado
document.addEventListener('DOMContentLoaded', async function() {
    console.log('🚀 Delivery Routes App con Supabase iniciando...');
    
    // Establecer admin como tipo de usuario por defecto
    const adminOption = document.getElementById('adminOption');
    const driverOption = document.getElementById('driverOption');
    
    if (adminOption) adminOption.classList.add('active');
    if (driverOption) driverOption.classList.remove('active');
    
    // Verificar conexión a Supabase
    await checkSupabaseConnection();
    
    // Intentar autenticación automática
    const autoLogin = await AuthManagerSupabase.init();
    
    if (autoLogin) {
        console.log('✅ Sesión recuperada automáticamente');
    } else {
        console.log('🔐 Inicia sesión manualmente');
    }
    
    // Asignar eventos globales
    assignGlobalEvents();
});

// Verificar conexión a Supabase
async function checkSupabaseConnection() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    try {
        const connection = await SupabaseManager.checkConnection();
        
        if (connection.success) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
            statusElement.className = 'alert alert-success';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo offline - usando datos locales';
            statusElement.className = 'alert alert-warning';
        }
    } catch (error) {
        statusElement.innerHTML = '<i class="fas fa-exclamation-triangle"></i> Error de conexión';
        statusElement.className = 'alert alert-danger';
    }
}

// Función para seleccionar tipo de usuario (mantener igual)
function selectUserType(type) {
    const adminOption = document.getElementById('adminOption');
    const driverOption = document.getElementById('driverOption');
    
    if (type === 'admin') {
        adminOption.classList.add('active');
        driverOption.classList.remove('active');
    } else {
        driverOption.classList.add('active');
        adminOption.classList.remove('active');
    }
}

// Asignar eventos globales
function assignGlobalEvents() {
    // Evento para recargar datos desde Supabase
    window.loadDataFromSupabase = async function() {
        console.log('🔄 Recargando datos desde Supabase...');
        
        UIManager.showNotification('🔄 Recargando datos desde Supabase...', 'info');
        
        try {
            const data = await DataManagerSupabase.loadInitialData();
            
            UIManager.showNotification(
                `✅ Datos recargados: ${data.routes.length} rutas, ${data.deliveries.length} entregas`,
                'success'
            );
            
            // Recargar vistas
            if (AuthManagerSupabase.currentUser) {
                if (AuthManagerSupabase.currentUser.role === 'admin') {
                    UIManager.loadDashboard();
                    RouteManagerSupabase.loadRoutes();
                    DeliveryManagerSupabase.loadDeliveries();
                    DriverManagerSupabase.loadDrivers();
                } else {
                    UIManager.loadDriverRoutes();
                    UIManager.loadDriverDeliveries();
                    UIManager.updateDriverProfile();
                }
            }
            
        } catch (error) {
            console.error('Error recargando datos:', error);
            UIManager.showNotification('❌ Error recargando datos', 'danger');
        }
    };
    
    // Reemplazar la función original
    window.loadDataFromFiles = window.loadDataFromSupabase;
}

// Función para exportar datos a JSON
window.exportData = async function() {
    try {
        const routes = await DataManagerSupabase.getRoutesFromSupabase();
        const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
        const drivers = await DataManagerSupabase.getDriversFromSupabase();
        
        const data = {
            routes,
            deliveries,
            drivers,
            exportDate: new Date().toISOString(),
            source: 'Supabase'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,'+ encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `delivery-routes-supabase-${new Date().toISOString().split('T')[0]}.json`;
        
        const linkElement = document.createElement('a');
        linkElement.setAttribute('href', dataUri);
        linkElement.setAttribute('download', exportFileDefaultName);
        linkElement.click();
        
        UIManager.showNotification('📤 Datos exportados correctamente', 'success');
        
    } catch (error) {
        console.error('Error exportando datos:', error);
        UIManager.showNotification('❌ Error exportando datos', 'danger');
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
                
                UIManager.showNotification('🔄 Importando datos...', 'info');
                
                // Importar rutas
                if (data.routes) {
                    for (const route of data.routes) {
                        await DataManagerSupabase.createRoute(route);
                    }
                }
                
                // Importar entregas
                if (data.deliveries) {
                    for (const delivery of data.deliveries) {
                        await DataManagerSupabase.createDelivery(delivery);
                    }
                }
                
                // Importar repartidores
                if (data.drivers) {
                    for (const driver of data.drivers) {
                        await DataManagerSupabase.createDriver(driver);
                    }
                }
                
                UIManager.showNotification('📥 Datos importados correctamente', 'success');
                
                // Recargar vistas
                if (AuthManagerSupabase.currentUser) {
                    if (AuthManagerSupabase.currentUser.role === 'admin') {
                        UIManager.loadDashboard();
                        RouteManagerSupabase.loadRoutes();
                        DeliveryManagerSupabase.loadDeliveries();
                        DriverManagerSupabase.loadDrivers();
                    } else {
                        UIManager.loadDriverRoutes();
                        UIManager.loadDriverDeliveries();
                        UIManager.updateDriverProfile();
                    }
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

// Mantener otras funciones globales...
window.showSection = UIManager.showSection;
window.showDriverSection = UIManager.showDriverSection;
window.logout = logoutSupabase;
