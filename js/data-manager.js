// data-manager.js - Gestión centralizada de datos con Supabase
const DataManager = {
    // Cache de datos
    cache: {
        drivers: [],
        routes: [],
        deliveries: [],
        lastSync: null
    },
    
    // Estado de conexión
    isOnline: navigator.onLine,
    
    // Mapeo de columnas (para compatibilidad)
    columnMapping: {
        order_details: 'order_details' // Se ajustará dinámicamente
    },
    
    // Inicializar
    async init() {
        console.log('📊 Inicializando DataManager...');
        
        // Configurar eventos de conexión
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithSupabase();
            this.updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            this.updateConnectionStatus(false);
        });
        
        // Verificar estructura de tablas
        await this.verifyTableStructure();
        
        // Cargar datos iniciales
        await this.loadInitialData();
        
        // Iniciar sincronización periódica
        setInterval(() => {
            if (this.isOnline) {
                this.syncWithSupabase();
            }
        }, 30000); // Cada 30 segundos
        
        return this.cache;
    },
    
    // Verificar estructura de tablas
    async verifyTableStructure() {
        try {
            console.log('🔍 Verificando estructura de tablas...');
            
            const { data: columns, error } = await supabase
                .from('information_schema.columns')
                .select('column_name, data_type')
                .eq('table_name', 'deliveries')
                .eq('table_schema', 'public');
            
            if (error) throw error;
            
            const columnNames = columns.map(col => col.column_name);
            
            // Verificar columna de comanda
            if (columnNames.includes('order') && !columnNames.includes('order_details')) {
                console.log('⚠️ Usando columna "order" para comandas');
                this.columnMapping.order_details = 'order';
            } else if (!columnNames.includes('order_details') && !columnNames.includes('order')) {
                console.error('❌ No se encuentra columna para comandas');
                throw new Error('No se encuentra columna para comandas');
            }
            
            console.log('✅ Estructura verificada');
            return { success: true };
        } catch (error) {
            console.error('❌ Error verificando estructura:', error);
            return { success: false, error: error.message };
        }
    },
    
    // Obtener nombre correcto de columna de comanda
    getOrderColumnName() {
        return this.columnMapping.order_details || 'order_details';
    },
    
    // Cargar datos iniciales
    async loadInitialData() {
        try {
            console.log('📊 Cargando datos iniciales...');
            
            if (this.isOnline) {
                // Cargar desde Supabase
                await this.loadFromSupabase();
            } else {
                // Cargar desde localStorage
                this.loadFromLocalStorage();
            }
            
            // Actualizar estadísticas
            this.updateStats();
            
            console.log('✅ Datos cargados correctamente');
            return this.cache;
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            showToast('Error cargando datos', 'error');
            return this.cache;
        }
    },
    
    // Cargar desde Supabase
    async loadFromSupabase() {
        try {
            // Cargar repartidores
            const { data: drivers, error: driversError } = await supabase
                .from(AppConfig.TABLES.DRIVERS)
                .select('*')
                .order('name');
            
            if (driversError) {
                console.error('Error cargando repartidores:', driversError);
                throw driversError;
            }
            this.cache.drivers = drivers || [];
            
            // Cargar rutas
            const { data: routes, error: routesError } = await supabase
                .from(AppConfig.TABLES.ROUTES)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (routesError) {
                console.error('Error cargando rutas:', routesError);
                throw routesError;
            }
            this.cache.routes = routes || [];
            
            // Cargar entregas
            const { data: deliveries, error: deliveriesError } = await supabase
                .from(AppConfig.TABLES.DELIVERIES)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (deliveriesError) {
                console.error('Error cargando entregas:', deliveriesError);
                throw deliveriesError;
            }
            
            // Normalizar datos de entregas (columna de comanda)
            this.cache.deliveries = (deliveries || []).map(delivery => {
                const orderColumn = this.getOrderColumnName();
                return {
                    ...delivery,
                    order_details: delivery[orderColumn] || ''
                };
            });
            
            // Guardar en localStorage
            this.saveToLocalStorage();
            
            // Actualizar timestamp
            this.cache.lastSync = new Date().toISOString();
            
            // Notificar cambios
            this.notifyDataChange();
            
            return this.cache;
        } catch (error) {
            console.error('Error cargando desde Supabase:', error);
            
            // Fallback a localStorage
            this.loadFromLocalStorage();
            
            throw error;
        }
    },
    
    // Cargar desde localStorage
    loadFromLocalStorage() {
        try {
            const drivers = localStorage.getItem('deliveryApp_drivers');
            const routes = localStorage.getItem('deliveryApp_routes');
            const deliveries = localStorage.getItem('deliveryApp_deliveries');
            
            this.cache.drivers = drivers ? JSON.parse(drivers) : [];
            this.cache.routes = routes ? JSON.parse(routes) : [];
            this.cache.deliveries = deliveries ? JSON.parse(deliveries) : [];
            
            console.log('📁 Datos cargados desde localStorage');
            return this.cache;
        } catch (error) {
            console.error('Error cargando desde localStorage:', error);
            return this.cache;
        }
    },
    
    // Guardar en localStorage
    saveToLocalStorage() {
        try {
            localStorage.setItem('deliveryApp_drivers', JSON.stringify(this.cache.drivers));
            localStorage.setItem('deliveryApp_routes', JSON.stringify(this.cache.routes));
            localStorage.setItem('deliveryApp_deliveries', JSON.stringify(this.cache.deliveries));
            localStorage.setItem('deliveryApp_lastSync', new Date().toISOString());
            
            console.log('💾 Datos guardados en localStorage');
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    },
    
    // Sincronizar con Supabase
    async syncWithSupabase() {
        if (!this.isOnline) {
            console.log('📴 Modo offline, omitiendo sincronización');
            return;
        }
        
        try {
            console.log('🔄 Sincronizando con Supabase...');
            
            // Sincronizar datos pendientes
            await this.syncPendingChanges();
            
            // Recargar datos actualizados
            await this.loadFromSupabase();
            
            console.log('✅ Sincronización completada');
            showToast('Datos sincronizados', 'success');
        } catch (error) {
            console.error('❌ Error sincronizando:', error);
            showToast('Error sincronizando datos', 'error');
        }
    },
    
    // Sincronizar cambios pendientes
    async syncPendingChanges() {
        // Aquí iría la lógica para sincronizar cambios locales
        // que no se pudieron guardar en Supabase cuando estaban offline
        // Por simplicidad, recargamos todo desde Supabase
        return true;
    },
    
    // Notificar cambios en los datos
    notifyDataChange() {
        // Disparar evento personalizado
        const event = new CustomEvent('dataChanged', {
            detail: { cache: this.cache }
        });
        document.dispatchEvent(event);
        
        console.log('📢 Datos actualizados, evento disparado');
    },
    
    // Actualizar estadísticas
    updateStats() {
        const stats = this.getStats();
        
        // Actualizar UI si está disponible
        if (window.UIManager) {
            UIManager.updateStats(stats);
        }
        
        return stats;
    },
    
    // Obtener estadísticas
    getStats() {
        const today = new Date().toDateString();
        
        // Filtrar entregas de hoy
        const todayDeliveries = this.cache.deliveries.filter(d => {
            if (!d.created_at) return false;
            const deliveryDate = new Date(d.created_at).toDateString();
            return deliveryDate === today;
        });
        
        const activeDrivers = this.cache.drivers.filter(d => d.status === 'active');
        const activeRoutes = this.cache.routes.filter(r => r.status === 'active');
        const completedToday = todayDeliveries.filter(d => d.status === 'completed').length;
        
        return {
            totalRoutes: this.cache.routes.length,
            totalDeliveries: this.cache.deliveries.length,
            activeDrivers: activeDrivers.length,
            completedToday: completedToday,
            pendingDeliveries: this.cache.deliveries.filter(d => d.status === 'pending').length,
            activeRoutes: activeRoutes.length
        };
    },
    
    // Actualizar estado de conexión en UI
    updateConnectionStatus(isOnline) {
        const statusElement = document.getElementById('connectionStatus');
        if (!statusElement) return;
        
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
            statusElement.className = 'connection-status connected';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo offline';
            statusElement.className = 'connection-status disconnected';
        }
    },
    
    // ===== CRUD PARA REPARTIDORES =====
    
    async createDriver(driverData) {
        try {
            const driver = {
                ...driverData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deliveries: 0,
                status: 'active'
            };
            
            let result;
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DRIVERS)
                    .insert([driver])
                    .select();
                
                if (error) throw error;
                result = { success: true, data: data[0] };
                this.cache.drivers.unshift(data[0]);
            } else {
                driver.id = Date.now(); // ID temporal
                result = { success: true, data: driver };
                this.cache.drivers.unshift(driver);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Repartidor creado correctamente', 'success');
            return result;
            
        } catch (error) {
            console.error('Error creando repartidor:', error);
            showToast(`Error creando repartidor: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async updateDriver(driverId, driverData) {
        try {
            const index = this.cache.drivers.findIndex(d => d.id === driverId);
            if (index === -1) throw new Error('Repartidor no encontrado');
            
            const updatedDriver = {
                ...this.cache.drivers[index],
                ...driverData,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DRIVERS)
                    .update(updatedDriver)
                    .eq('id', driverId)
                    .select();
                
                if (error) throw error;
                result = { success: true, data: data[0] };
                this.cache.drivers[index] = data[0];
            } else {
                result = { success: true, data: updatedDriver };
                this.cache.drivers[index] = updatedDriver;
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            
            showToast('Repartidor actualizado', 'success');
            return result;
            
        } catch (error) {
            console.error('Error actualizando repartidor:', error);
            showToast(`Error actualizando repartidor: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async deleteDriver(driverId) {
        try {
            if (!confirm('¿Estás seguro de que quieres eliminar este repartidor?')) {
                return { success: false, error: 'Cancelado por el usuario' };
            }
            
            if (this.isOnline) {
                const { error } = await supabase
                    .from(AppConfig.TABLES.DRIVERS)
                    .delete()
                    .eq('id', driverId);
                
                if (error) throw error;
            }
            
            this.cache.drivers = this.cache.drivers.filter(d => d.id !== driverId);
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Repartidor eliminado', 'success');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando repartidor:', error);
            showToast(`Error eliminando repartidor: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    // ===== CRUD PARA RUTAS =====
    
    async createRoute(routeData) {
        try {
            const route = {
                ...routeData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deliveries: 0,
                completed: 0
            };
            
            let result;
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.ROUTES)
                    .insert([route])
                    .select();
                
                if (error) throw error;
                result = { success: true, data: data[0] };
                this.cache.routes.unshift(data[0]);
            } else {
                route.id = Date.now();
                result = { success: true, data: route };
                this.cache.routes.unshift(route);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Ruta creada correctamente', 'success');
            return result;
            
        } catch (error) {
            console.error('Error creando ruta:', error);
            showToast(`Error creando ruta: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async updateRoute(routeId, routeData) {
        try {
            const index = this.cache.routes.findIndex(r => r.id === routeId);
            if (index === -1) throw new Error('Ruta no encontrada');
            
            const updatedRoute = {
                ...this.cache.routes[index],
                ...routeData,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.ROUTES)
                    .update(updatedRoute)
                    .eq('id', routeId)
                    .select();
                
                if (error) throw error;
                result = { success: true, data: data[0] };
                this.cache.routes[index] = data[0];
            } else {
                result = { success: true, data: updatedRoute };
                this.cache.routes[index] = updatedRoute;
            }
            
            // Actualizar entregas si cambió el repartidor
            if (routeData.driver && routeData.driver !== this.cache.routes[index].driver) {
                await this.updateDeliveriesForRoute(routeId, { driver: routeData.driver });
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            
            showToast('Ruta actualizada', 'success');
            return result;
            
        } catch (error) {
            console.error('Error actualizando ruta:', error);
            showToast(`Error actualizando ruta: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async deleteRoute(routeId) {
        try {
            if (!confirm('¿Estás seguro de que quieres eliminar esta ruta?')) {
                return { success: false, error: 'Cancelado por el usuario' };
            }
            
            const route = this.cache.routes.find(r => r.id === routeId);
            if (!route) throw new Error('Ruta no encontrada');
            
            if (this.isOnline) {
                const { error } = await supabase
                    .from(AppConfig.TABLES.ROUTES)
                    .delete()
                    .eq('id', routeId);
                
                if (error) throw error;
            }
            
            this.cache.routes = this.cache.routes.filter(r => r.id !== routeId);
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Ruta eliminada', 'success');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando ruta:', error);
            showToast(`Error eliminando ruta: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    // ===== CRUD PARA ENTREGAS =====
    
    async createDelivery(deliveryData) {
        try {
            const delivery = {
                ...deliveryData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'pending'
            };
            
            // Usar el nombre correcto de la columna para comanda
            const orderColumn = this.getOrderColumnName();
            delivery[orderColumn] = deliveryData.order_details;
            delete delivery.order_details;
            
            let result;
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DELIVERIES)
                    .insert([delivery])
                    .select();
                
                if (error) throw error;
                
                // Normalizar datos para uso local
                const normalizedData = {
                    ...data[0],
                    order_details: data[0][orderColumn] || ''
                };
                
                result = { success: true, data: normalizedData };
                this.cache.deliveries.unshift(normalizedData);
            } else {
                delivery.id = Date.now();
                delivery.order_details = deliveryData.order_details; // Restaurar para local
                result = { success: true, data: delivery };
                this.cache.deliveries.unshift(delivery);
            }
            
            // Actualizar contadores de ruta
            if (delivery.route) {
                await this.updateRouteCounters(delivery.route);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Entrega creada correctamente', 'success');
            return result;
            
        } catch (error) {
            console.error('Error creando entrega:', error);
            showToast(`Error creando entrega: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async updateDelivery(deliveryId, deliveryData) {
        try {
            const index = this.cache.deliveries.findIndex(d => d.id === deliveryId);
            if (index === -1) throw new Error('Entrega no encontrada');
            
            const oldRoute = this.cache.deliveries[index].route;
            const newRoute = deliveryData.route;
            
            const updatedDelivery = {
                ...this.cache.deliveries[index],
                ...deliveryData,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (this.isOnline) {
                // Preparar datos para Supabase
                const deliveryToUpdate = { ...updatedDelivery };
                const orderColumn = this.getOrderColumnName();
                
                if (deliveryData.order_details !== undefined) {
                    deliveryToUpdate[orderColumn] = deliveryData.order_details;
                    delete deliveryToUpdate.order_details;
                }
                
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DELIVERIES)
                    .update(deliveryToUpdate)
                    .eq('id', deliveryId)
                    .select();
                
                if (error) throw error;
                
                // Normalizar datos para uso local
                const normalizedData = {
                    ...data[0],
                    order_details: data[0][orderColumn] || ''
                };
                
                result = { success: true, data: normalizedData };
                this.cache.deliveries[index] = normalizedData;
            } else {
                result = { success: true, data: updatedDelivery };
                this.cache.deliveries[index] = updatedDelivery;
            }
            
            // Actualizar contadores si cambió la ruta
            if (oldRoute !== newRoute) {
                if (oldRoute) await this.updateRouteCounters(oldRoute);
                if (newRoute) await this.updateRouteCounters(newRoute);
            } else if (newRoute && deliveryData.status) {
                await this.updateRouteCounters(newRoute);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            
            showToast('Entrega actualizada', 'success');
            return result;
            
        } catch (error) {
            console.error('Error actualizando entrega:', error);
            showToast(`Error actualizando entrega: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    async deleteDelivery(deliveryId) {
        try {
            if (!confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
                return { success: false, error: 'Cancelado por el usuario' };
            }
            
            const delivery = this.cache.deliveries.find(d => d.id === deliveryId);
            if (!delivery) throw new Error('Entrega no encontrada');
            
            if (this.isOnline) {
                const { error } = await supabase
                    .from(AppConfig.TABLES.DELIVERIES)
                    .delete()
                    .eq('id', deliveryId);
                
                if (error) throw error;
            }
            
            this.cache.deliveries = this.cache.deliveries.filter(d => d.id !== deliveryId);
            
            // Actualizar contadores de ruta
            if (delivery.route) {
                await this.updateRouteCounters(delivery.route);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Entrega eliminada', 'success');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            showToast(`Error eliminando entrega: ${error.message}`, 'error');
            return { success: false, error: error.message };
        }
    },
    
    // ===== FUNCIONES AUXILIARES =====
    
    // Actualizar contadores de ruta
    async updateRouteCounters(routeName) {
        const route = this.cache.routes.find(r => r.name === routeName);
        if (!route) return;
        
        const routeDeliveries = this.cache.deliveries.filter(d => d.route === routeName);
        const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
        
        await this.updateRoute(route.id, {
            deliveries: routeDeliveries.length,
            completed: completedDeliveries
        });
    },
    
    // Actualizar entregas de una ruta
    async updateDeliveriesForRoute(routeId, updateData) {
        const route = this.cache.routes.find(r => r.id === routeId);
        if (!route) return;
        
        const routeDeliveries = this.cache.deliveries.filter(d => d.route === route.name);
        
        for (const delivery of routeDeliveries) {
            await this.updateDelivery(delivery.id, updateData);
        }
    },
    
    // Buscar entregas por repartidor
    getDeliveriesByDriver(driverName) {
        // Primero obtener rutas del repartidor
        const driverRoutes = this.cache.routes.filter(r => r.driver === driverName);
        const routeNames = driverRoutes.map(r => r.name);
        
        // Obtener entregas de esas rutas
        return this.cache.deliveries.filter(d => routeNames.includes(d.route));
    },
    
    // Buscar rutas por repartidor
    getRoutesByDriver(driverName) {
        return this.cache.routes.filter(r => r.driver === driverName);
    },
    
    // Obtener entregas por ruta
    getDeliveriesByRoute(routeName) {
        return this.cache.deliveries.filter(d => d.route === routeName);
    },
    
    // Buscar repartidor por nombre
    getDriverByName(name) {
        return this.cache.drivers.find(d => d.name === name);
    },
    
    // Buscar ruta por nombre
    getRouteByName(name) {
        return this.cache.routes.find(r => r.name === name);
    },
    
    // Buscar repartidor por ID
    getDriverById(id) {
        return this.cache.drivers.find(d => d.id === id);
    },
    
    // Buscar ruta por ID
    getRouteById(id) {
        return this.cache.routes.find(r => r.id === id);
    },
    
    // Buscar entrega por ID
    getDeliveryById(id) {
        return this.cache.deliveries.find(d => d.id === id);
    },
    
    // Filtrar entregas por estado
    getDeliveriesByStatus(status) {
        return this.cache.deliveries.filter(d => d.status === status);
    },
    
    // Obtener entregas de hoy
    getTodayDeliveries() {
        const today = new Date().toDateString();
        return this.cache.deliveries.filter(d => {
            if (!d.created_at) return false;
            const deliveryDate = new Date(d.created_at).toDateString();
            return deliveryDate === today;
        });
    },
    
    // Marcar entrega como completada
    async markDeliveryCompleted(deliveryId) {
        return await this.updateDelivery(deliveryId, { status: 'completed' });
    },
    
    // Marcar entrega como en camino
    async markDeliveryInProgress(deliveryId) {
        return await this.updateDelivery(deliveryId, { status: 'in_progress' });
    },
    
    // Resetear entregas (para testing)
    async resetAllData() {
        if (!confirm('⚠️ ¿ESTÁS SEGURO? Esto eliminará TODOS los datos locales.')) {
            return;
        }
        
        try {
            this.cache = {
                drivers: [],
                routes: [],
                deliveries: [],
                lastSync: null
            };
            
            localStorage.removeItem('deliveryApp_drivers');
            localStorage.removeItem('deliveryApp_routes');
            localStorage.removeItem('deliveryApp_deliveries');
            localStorage.removeItem('deliveryApp_lastSync');
            
            this.notifyDataChange();
            this.updateStats();
            
            showToast('Datos reseteados correctamente', 'success');
            return { success: true };
        } catch (error) {
            console.error('Error reseteando datos:', error);
            showToast('Error reseteando datos', 'error');
            return { success: false, error: error.message };
        }
    }
};

// Función global para refrescar datos
window.refreshData = async function() {
    showToast('Actualizando datos...', 'info');
    
    try {
        await DataManager.loadInitialData();
        showToast('Datos actualizados correctamente', 'success');
    } catch (error) {
        showToast('Error actualizando datos', 'error');
    }
};

// Función para resetear datos (solo para desarrollo)
window.resetAllData = function() {
    DataManager.resetAllData();
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', async function() {
    await DataManager.init();
});

// Exportar para uso global
window.DataManager = DataManager;
