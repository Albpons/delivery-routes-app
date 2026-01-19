// sync-manager.js - Gestor de sincronización entre Supabase y localStorage
const SyncManager = {
    isSyncing: false,
    lastSync: null,

    // Inicializar el gestor de sincronización
    async init() {
        console.log('🔄 Inicializando SyncManager...');
        
        // Escuchar cambios de conexión
        window.addEventListener('online', () => this.onConnectionRestored());
        window.addEventListener('offline', () => this.onConnectionLost());
        
        // Intentar sincronizar al iniciar si hay conexión
        if (navigator.onLine && window.supabase) {
            setTimeout(() => this.syncAllData(), 2000);
        }
        
        // Verificar consistencia de datos
        await this.checkDataConsistency();
    },

    // Verificar consistencia de datos
    async checkDataConsistency() {
        console.log('🔍 Verificando consistencia de datos...');
        
        try {
            // Cargar datos locales
            const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            
            // Verificar que las entregas tengan rutas válidas
            await this.cleanOrphanedDeliveries(localRoutes, localDeliveries);
            
            // Verificar que las rutas tengan repartidores válidos
            await this.cleanOrphanedRoutes(localRoutes, localDrivers);
            
            console.log('✅ Consistencia de datos verificada');
            
        } catch (error) {
            console.error('Error verificando consistencia:', error);
        }
    },

    // Limpiar entregas huérfanas (sin ruta válida)
    async cleanOrphanedDeliveries(routes, deliveries) {
        const routeNames = routes.map(route => route.name);
        let orphanedCount = 0;
        
        const cleanedDeliveries = deliveries.filter(delivery => {
            // Si la entrega tiene ruta pero la ruta no existe
            if (delivery.route && delivery.route !== '' && !routeNames.includes(delivery.route)) {
                console.warn(`⚠️ Entrega huérfana encontrada: ${delivery.client} (ruta: ${delivery.route})`);
                orphanedCount++;
                
                // Opción 1: Quitar la asignación de ruta
                delivery.route = '';
                
                // Opción 2: Eliminar la entrega (descomentar si prefieres eliminarla)
                // return false;
            }
            return true;
        });
        
        if (orphanedCount > 0) {
            console.log(`🔄 Limpiando ${orphanedCount} entregas huérfanas`);
            localStorage.setItem('delivery_deliveries', JSON.stringify(cleanedDeliveries));
            
            if (window.UIManager) {
                UIManager.showNotification(`🔄 ${orphanedCount} entregas limpiadas (sin ruta válida)`, 'warning');
            }
        }
        
        return cleanedDeliveries;
    },

    // Limpiar rutas huérfanas (sin repartidor válido)
    async cleanOrphanedRoutes(routes, drivers) {
        const driverNames = drivers.map(driver => driver.name);
        let orphanedCount = 0;
        
        const cleanedRoutes = routes.filter(route => {
            // Si la ruta tiene repartidor pero el repartidor no existe
            if (route.driver && route.driver !== '' && !driverNames.includes(route.driver)) {
                console.warn(`⚠️ Ruta huérfana encontrada: ${route.name} (repartidor: ${route.driver})`);
                orphanedCount++;
                
                // Quitar la asignación de repartidor
                route.driver = '';
            }
            return true;
        });
        
        if (orphanedCount > 0) {
            console.log(`🔄 Limpiando ${orphanedCount} rutas huérfanas`);
            localStorage.setItem('delivery_routes', JSON.stringify(cleanedRoutes));
            
            if (window.UIManager) {
                UIManager.showNotification(`🔄 ${orphanedCount} rutas limpiadas (sin repartidor válido)`, 'warning');
            }
        }
        
        return cleanedRoutes;
    },

    // Sincronizar todos los datos
    async syncAllData() {
        if (this.isSyncing) {
            console.log('⏳ Sincronización ya en progreso...');
            return;
        }
        
        if (!window.supabase) {
            console.log('📴 Supabase no disponible, modo offline');
            return;
        }
        
        this.isSyncing = true;
        console.log('🔄 Sincronizando todos los datos...');
        
        try {
            // 1. Traer datos de Supabase
            const supabaseRoutes = await DataManagerSupabase.getRoutesFromSupabase();
            const supabaseDeliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const supabaseDrivers = await DataManagerSupabase.getDriversFromSupabase();
            
            // 2. Traer datos locales
            const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            
            console.log(`📊 Datos Supabase: ${supabaseRoutes.length} rutas, ${supabaseDeliveries.length} entregas, ${supabaseDrivers.length} repartidores`);
            console.log(`📁 Datos locales: ${localRoutes.length} rutas, ${localDeliveries.length} entregas, ${localDrivers.length} repartidores`);
            
            // 3. Decidir qué datos usar (preferir Supabase si tiene datos)
            let finalRoutes = [];
            let finalDeliveries = [];
            let finalDrivers = [];
            
            if (supabaseRoutes.length > 0 || supabaseDeliveries.length > 0 || supabaseDrivers.length > 0) {
                // Usar datos de Supabase como fuente principal
                finalRoutes = supabaseRoutes;
                finalDeliveries = supabaseDeliveries;
                finalDrivers = supabaseDrivers;
                
                console.log('✅ Usando datos de Supabase como fuente principal');
            } else {
                // Usar datos locales
                finalRoutes = localRoutes;
                finalDeliveries = localDeliveries;
                finalDrivers = localDrivers;
                
                console.log('✅ Usando datos locales (Supabase vacío)');
            }
            
            // 4. Guardar en localStorage
            localStorage.setItem('delivery_routes', JSON.stringify(finalRoutes));
            localStorage.setItem('delivery_deliveries', JSON.stringify(finalDeliveries));
            localStorage.setItem('delivery_drivers', JSON.stringify(finalDrivers));
            
            this.lastSync = new Date().toISOString();
            
            console.log(`✅ Sincronización completada: ${finalRoutes.length} rutas, ${finalDeliveries.length} entregas, ${finalDrivers.length} repartidores`);
            
            if (window.UIManager) {
                UIManager.showNotification('✅ Datos sincronizados correctamente', 'success');
            }
            
            // 5. Actualizar la UI
            await this.refreshUI();
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error sincronizando datos', 'danger');
            }
        } finally {
            this.isSyncing = false;
        }
    },

    // Refrescar la UI después de sincronizar
    async refreshUI() {
        if (!window.AuthManagerSupabase || !AuthManagerSupabase.currentUser) {
            return;
        }
        
        const user = AuthManagerSupabase.currentUser;
        
        if (user.role === 'admin') {
            // Actualizar todas las vistas de admin
            if (window.UIManager) {
                await UIManager.loadDashboard();
            }
            
            if (window.RouteManagerSupabase) {
                await RouteManagerSupabase.loadRoutes();
            }
            
            if (window.DeliveryManagerSupabase) {
                await DeliveryManagerSupabase.loadDeliveries();
            }
            
            if (window.DriverManagerSupabase) {
                await DriverManagerSupabase.loadDrivers();
            }
        } else {
            // Actualizar vistas de repartidor
            if (window.UIManager) {
                await UIManager.loadDriverRoutes();
                await UIManager.loadDriverDeliveries();
                await UIManager.updateDriverProfile();
            }
        }
    },

    // Forzar re-sincronización y limpieza
    async forceResync() {
        if (!confirm('¿Forzar re-sincronización?\n\nEsto actualizará todos los datos locales con los de Supabase.')) {
            return;
        }
        
        console.log('🔄 Forzando re-sincronización...');
        
        if (window.UIManager) {
            UIManager.showNotification('🔄 Forzando re-sincronización...', 'info');
        }
        
        await this.syncAllData();
    },

    // Limpiar y reiniciar datos locales
    async clearAndResync() {
        if (!confirm('¿Limpiar y re-sincronizar TODOS los datos?\n\nEsto eliminará todos los datos locales y volverá a cargar desde Supabase.')) {
            return;
        }
        
        console.log('🗑️ Limpiando y re-sincronizando...');
        
        // Limpiar localStorage
        localStorage.removeItem('delivery_routes');
        localStorage.removeItem('delivery_deliveries');
        localStorage.removeItem('delivery_drivers');
        
        // Sincronizar de nuevo
        await this.syncAllData();
        
        if (window.UIManager) {
            UIManager.showNotification('✅ Datos limpiados y re-sincronizados', 'success');
        }
    },

    // Restaurar conexión
    onConnectionRestored() {
        console.log('🌐 Conexión restaurada - Sincronizando...');
        
        if (window.UIManager) {
            UIManager.showNotification('🌐 Conexión restaurada - Sincronizando datos...', 'info');
        }
        
        setTimeout(() => this.syncAllData(), 3000);
    },

    // Pérdida de conexión
    onConnectionLost() {
        console.log('📴 Conexión perdida - Modo offline');
        
        if (window.UIManager) {
            UIManager.showNotification('📴 Modo offline activado', 'warning');
        }
    },

    // Obtener estado de sincronización
    getStatus() {
        return {
            isSyncing: this.isSyncing,
            lastSync: this.lastSync,
            isOnline: navigator.onLine,
            hasSupabase: !!window.supabase
        };
    },

    // Función para reparar datos inconsistentes
    async repairData() {
        console.log('🔧 Reparando datos inconsistentes...');
        
        if (window.UIManager) {
            UIManager.showNotification('🔧 Reparando datos inconsistentes...', 'info');
        }
        
        try {
            // 1. Verificar consistencia
            await this.checkDataConsistency();
            
            // 2. Forzar sincronización
            await this.syncAllData();
            
            // 3. Forzar recarga de UI
            await this.refreshUI();
            
            console.log('✅ Reparación completada');
            
            if (window.UIManager) {
                UIManager.showNotification('✅ Datos reparados correctamente', 'success');
            }
            
        } catch (error) {
            console.error('❌ Error reparando datos:', error);
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error reparando datos', 'danger');
            }
        }
    }
};

// Inicializar cuando el DOM esté listo
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.SyncManager) {
            SyncManager.init();
        }
    }, 3000);
});

// Exportar para uso global
window.SyncManager = SyncManager;
window.forceResync = function() { SyncManager.forceResync(); };
window.clearAndResync = function() { SyncManager.clearAndResync(); };
window.repairData = function() { SyncManager.repairData(); };
