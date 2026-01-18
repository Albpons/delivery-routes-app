// app-supabase.js - Archivo principal simplificado

// Inicializar la aplicación
async function initApp() {
    console.log('🚀 Inicializando Delivery Routes App...');
    
    // Establecer admin como tipo de usuario por defecto
    selectUserType('admin');
    
    // Verificar conexión a Supabase (pero no es crítica para el login)
    await checkSupabaseConnection();
    
    // Intentar autenticación automática desde localStorage
    if (window.AuthManagerSupabase) {
        const autoLogin = await AuthManagerSupabase.init();
        
        if (autoLogin) {
            console.log('✅ Sesión recuperada automáticamente');
            console.log('Usuario:', AuthManagerSupabase.currentUser?.name);
        } else {
            console.log('🔐 Inicia sesión manualmente');
            showLoginInstructions();
        }
    }
    
    // Asignar eventos globales
    assignGlobalEvents();
    
    console.log('✅ Aplicación inicializada');
}

// Mostrar instrucciones de login
function showLoginInstructions() {
    setTimeout(() => {
        const loginCard = document.querySelector('.login-card');
        if (loginCard) {
            const instructions = document.createElement('div');
            instructions.className = 'alert alert-info mt-20';
            instructions.style.fontSize = '13px';
            instructions.innerHTML = `
                <strong>👑 Credenciales Administrador:</strong><br>
                Usuario: <code>admin</code><br>
                Contraseña: <code>admin123</code>
            `;
            loginCard.appendChild(instructions);
        }
    }, 1500);
}

// Verificar conexión a Supabase (modo informativo)
async function checkSupabaseConnection() {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    try {
        if (window.supabase) {
            const { data, error } = await window.supabase.auth.getSession();
            
            if (!error) {
                statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
                statusElement.className = 'alert alert-success';
                return true;
            }
        }
        
        // Modo offline o sin Supabase
        statusElement.innerHTML = '<i class="fas fa-database"></i> Modo local activo';
        statusElement.className = 'alert alert-info';
        return false;
        
    } catch (error) {
        console.log('🔶 Sin conexión a Supabase, modo local activado');
        statusElement.innerHTML = '<i class="fas fa-database"></i> Modo local activo';
        statusElement.className = 'alert alert-info';
        return false;
    }
}

// Asignar eventos globales
function assignGlobalEvents() {
    console.log('🔗 Asignando eventos globales...');
    
    // Evento para recargar datos
    window.loadDataFromSupabase = async function() {
        console.log('🔄 Recargando datos...');
        
        if (window.UIManager) {
            UIManager.showNotification('🔄 Recargando datos...', 'info');
        }
        
        try {
            // Cargar según el usuario
            if (window.AuthManagerSupabase && AuthManagerSupabase.currentUser) {
                if (AuthManagerSupabase.currentUser.role === 'admin') {
                    // Admin: intentar cargar de Supabase o local
                    await loadAdminData();
                } else {
                    // Driver: cargar sus datos
                    await loadDriverData();
                }
            }
            
            if (window.UIManager) {
                UIManager.showNotification('✅ Datos recargados', 'success');
            }
            
        } catch (error) {
            console.error('Error recargando datos:', error);
            if (window.UIManager) {
                UIManager.showNotification('❌ Error recargando datos', 'danger');
            }
        }
    };
    
    // Función para limpiar datos locales
    window.clearAllData = function() {
        if (confirm('¿Estás seguro de que quieres limpiar TODOS los datos locales?\n\nEsto eliminará rutas, entregas y repartidores guardados localmente.')) {
            localStorage.removeItem('delivery_routes');
            localStorage.removeItem('delivery_deliveries');
            localStorage.removeItem('delivery_drivers');
            
            // No eliminar currentUser para mantener la sesión
            // localStorage.removeItem('currentUser');
            
            if (window.UIManager) {
                UIManager.showNotification('🗑️ Datos locales eliminados', 'success');
            }
            
            // Recargar vistas
            setTimeout(() => {
                if (window.loadDataFromSupabase) {
                    loadDataFromSupabase();
                }
            }, 1000);
        }
    };
    
    // Función para mostrar información del sistema
    window.showSystemInfo = function() {
        if (window.UIManager && UIManager.showSystemInfo) {
            UIManager.showSystemInfo();
        }
    };
}

// Cargar datos para admin
async function loadAdminData() {
    try {
        // Intentar con Supabase si está disponible
        if (window.supabase && window.DataManagerSupabase) {
            await DataManagerSupabase.loadInitialData();
        }
        
        // Cargar UI
        if (window.UIManager) {
            await UIManager.loadDashboard();
            
            // Cargar vistas específicas
            if (window.RouteManagerSupabase) {
                setTimeout(() => RouteManagerSupabase.loadRoutes(), 300);
            }
            if (window.DeliveryManagerSupabase) {
                setTimeout(() => DeliveryManagerSupabase.loadDeliveries(), 500);
            }
            if (window.DriverManagerSupabase) {
                setTimeout(() => DriverManagerSupabase.loadDrivers(), 700);
            }
        }
        
    } catch (error) {
        console.error('Error cargando datos admin:', error);
        
        // Fallback a datos locales
        if (window.UIManager) {
            UIManager.showNotification('⚠️ Usando datos locales', 'warning');
        }
    }
}

// Cargar datos para driver
async function loadDriverData() {
    try {
        if (window.UIManager) {
            await UIManager.loadDriverRoutes();
            await UIManager.loadDriverDeliveries();
            await UIManager.updateDriverProfile();
        }
    } catch (error) {
        console.error('Error cargando datos driver:', error);
    }
}

// Función para exportar datos
window.exportData = async function() {
    try {
        let routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
        let deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
        let drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        
        // Si hay Supabase, intentar obtener datos actualizados
        if (window.supabase && window.DataManagerSupabase) {
            try {
                routes = await DataManagerSupabase.getRoutesFromSupabase();
                deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
                drivers = await DataManagerSupabase.getDriversFromSupabase();
            } catch (e) {
                console.log('Usando datos locales para exportar');
            }
        }
        
        const data = {
            routes,
            deliveries,
            drivers,
            exportDate: new Date().toISOString(),
            source: window.supabase ? 'Supabase' : 'Local',
            admin: window.AuthManagerSupabase?.currentUser?.name || 'Desconocido'
        };
        
        const dataStr = JSON.stringify(data, null, 2);
        const dataUri = 'data:application/json;charset=utf-8,' + encodeURIComponent(dataStr);
        
        const exportFileDefaultName = `delivery-data-${new Date().toISOString().split('T')[0]}.json`;
        
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

// Función para importar datos
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
                
                // Guardar en localStorage
                if (data.routes) {
                    localStorage.setItem('delivery_routes', JSON.stringify(data.routes));
                }
                
                if (data.deliveries) {
                    localStorage.setItem('delivery_deliveries', JSON.stringify(data.deliveries));
                }
                
                if (data.drivers) {
                    localStorage.setItem('delivery_drivers', JSON.stringify(data.drivers));
                }
                
                // Intentar guardar en Supabase si está disponible
                if (window.supabase && window.DataManagerSupabase) {
                    try {
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
                    } catch (supabaseError) {
                        console.warn('No se pudo guardar en Supabase, solo en local:', supabaseError);
                    }
                }
                
                if (window.UIManager) {
                    UIManager.showNotification('📥 Datos importados correctamente', 'success');
                }
                
                // Recargar datos
                setTimeout(() => {
                    if (window.loadDataFromSupabase) {
                        loadDataFromSupabase();
                    }
                }, 1000);
                
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

// Exportar funciones globales (mantener compatibilidad)
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
