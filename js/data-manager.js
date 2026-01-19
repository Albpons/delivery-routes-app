// Gestión centralizada de datos
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
    
    // Inicializar
    async init() {
        // Configurar eventos de conexión
        window.addEventListener('online', () => {
            this.isOnline = true;
            this.syncWithSupabase();
            updateConnectionStatus(true);
        });
        
        window.addEventListener('offline', () => {
            this.isOnline = false;
            updateConnectionStatus(false);
        });
        
        // Verificar conexión inicial
        const connection = await checkSupabaseConnection();
        this.isOnline = connection.online;
        updateConnectionStatus(this.isOnline);
        
        // Cargar datos
        await this.loadInitialData();
        
        // Iniciar sincronización periódica
        setInterval(() => {
            if (this.isOnline) {
                this.syncWithSupabase();
            }
        }, 30000); // Cada 30 segundos
        
        return this.cache;
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
            
            if (driversError) throw driversError;
            this.cache.drivers = drivers || [];
            
            // Cargar rutas
            const { data: routes, error: routesError } = await supabase
                .from(AppConfig.TABLES.ROUTES)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (routesError) throw routesError;
            this.cache.routes = routes || [];
            
            // Cargar entregas
            const { data: deliveries, error: deliveriesError } = await supabase
                .from(AppConfig.TABLES.DELIVERIES)
                .select('*')
                .order('created_at', { ascending: false });
            
            if (deliveriesError) throw deliveriesError;
            this.cache.deliveries = deliveries || [];
            
            // Guardar en localStorage
            this.saveToLocalStorage();
            
            // Actualizar timestamp
            this.cache.lastSync = new Date().toISOString();
            
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
        } catch (error) {
            console.error('Error guardando en localStorage:', error);
        }
    },
    
    // Sincronizar con Supabase
    async syncWithSupabase() {
        if (!this.isOnline) return;
        
        try {
            console.log('🔄 Sincronizando con Supabase...');
            
            // Aquí iría la lógica de sincronización bidireccional
            // Por ahora, simplemente recargamos desde Supabase
            await this.loadFromSupabase();
            
            // Notificar cambios
            this.notifyDataChange();
            
            console.log('✅ Sincronización completada');
        } catch (error) {
            console.error('❌ Error sincronizando:', error);
        }
    },
    
    // Notificar cambios en los datos
    notifyDataChange() {
        // Disparar evento personalizado
        const event = new CustomEvent('dataChanged', {
            detail: { cache: this.cache }
        });
        document.dispatchEvent(event);
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
        
        const todayDeliveries = this.cache.deliveries.filter(d => {
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
    
    // CRUD para repartidores
    async createDriver(driverData) {
        try {
            const driver = {
                ...driverData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deliveries: 0,
                status: 'active'
            };
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DRIVERS)
                    .insert([driver])
                    .select();
                
                if (error) throw error;
                this.cache.drivers.unshift(data[0]);
            } else {
                driver.id = Date.now(); // ID temporal
                this.cache.drivers.unshift(driver);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            return { success: true, data: driver };
        } catch (error) {
            console.error('Error creando repartidor:', error);
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
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DRIVERS)
                    .update(updatedDriver)
                    .eq('id', driverId)
                    .select();
                
                if (error) throw error;
                this.cache.drivers[index] = data[0];
            } else {
                this.cache.drivers[index] = updatedDriver;
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            
            return { success: true, data: updatedDriver };
        } catch (error) {
            console.error('Error actualizando repartidor:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteDriver(driverId) {
        try {
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
            
            return { success: true };
        } catch (error) {
            console.error('Error eliminando repartidor:', error);
            return { success: false, error: error.message };
        }
    },
    
    // CRUD para rutas (similar a repartidores)
    async createRoute(routeData) {
        try {
            const route = {
                ...routeData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                deliveries: 0,
                completed: 0
            };
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.ROUTES)
                    .insert([route])
                    .select();
                
                if (error) throw error;
                this.cache.routes.unshift(data[0]);
            } else {
                route.id = Date.now();
                this.cache.routes.unshift(route);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            return { success: true, data: route };
        } catch (error) {
            console.error('Error creando ruta:', error);
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
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.ROUTES)
                    .update(updatedRoute)
                    .eq('id', routeId)
                    .select();
                
                if (error) throw error;
                this.cache.routes[index] = data[0];
            } else {
                this.cache.routes[index] = updatedRoute;
            }
            
            // Actualizar entregas si cambió el repartidor
            if (routeData.driver && routeData.driver !== this.cache.routes[index].driver) {
                await this.updateDeliveriesForRoute(routeId, { driver: routeData.driver });
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            
            return { success: true, data: updatedRoute };
        } catch (error) {
            console.error('Error actualizando ruta:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteRoute(routeId) {
        try {
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
            
            return { success: true };
        } catch (error) {
            console.error('Error eliminando ruta:', error);
            return { success: false, error: error.message };
        }
    },
    
    // CRUD para entregas
    async createDelivery(deliveryData) {
        try {
            const delivery = {
                ...deliveryData,
                created_at: new Date().toISOString(),
                updated_at: new Date().toISOString(),
                status: 'pending'
            };
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DELIVERIES)
                    .insert([delivery])
                    .select();
                
                if (error) throw error;
                this.cache.deliveries.unshift(data[0]);
            } else {
                delivery.id = Date.now();
                this.cache.deliveries.unshift(delivery);
            }
            
            // Actualizar contadores de ruta
            if (delivery.route) {
                await this.updateRouteCounters(delivery.route);
            }
            
            this.saveToLocalStorage();
            this.notifyDataChange();
            this.updateStats();
            
            return { success: true, data: delivery };
        } catch (error) {
            console.error('Error creando entrega:', error);
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
            
            if (this.isOnline) {
                const { data, error } = await supabase
                    .from(AppConfig.TABLES.DELIVERIES)
                    .update(updatedDelivery)
                    .eq('id', deliveryId)
                    .select();
                
                if (error) throw error;
                this.cache.deliveries[index] = data[0];
            } else {
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
            
            return { success: true, data: updatedDelivery };
        } catch (error) {
            console.error('Error actualizando entrega:', error);
            return { success: false, error: error.message };
        }
    },
    
    async deleteDelivery(deliveryId) {
        try {
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
            
            return { success: true };
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            return { success: false, error: error.message };
        }
    },
    
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
    }
};

// Función para actualizar estado de conexión
function updateConnectionStatus(isOnline) {
    const statusElement = document.getElementById('connectionStatus');
    if (!statusElement) return;
    
    if (isOnline) {
        statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
        statusElement.className = 'connection-status connected';
    } else {
        statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo offline';
        statusElement.className = 'connection-status disconnected';
    }
}

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

// Exportar para uso global
window.DataManager = DataManager;
