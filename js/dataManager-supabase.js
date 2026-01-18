// dataManager-supabase.js - Gestión de datos con Supabase
const DataManagerSupabase = {
    // Inicializar datos
    async loadInitialData() {
        console.log('📊 Cargando datos iniciales desde Supabase...');
        
        try {
            // Verificar conexión
            const connection = await SupabaseManager.checkConnection();
            
            if (!connection.success) {
                console.warn('⚠️ Sin conexión a Supabase, usando datos locales');
                return this.loadFromLocalStorage();
            }
            
            // Cargar datos de Supabase
            const [routes, deliveries, drivers] = await Promise.all([
                this.getRoutesFromSupabase(),
                this.getDeliveriesFromSupabase(),
                this.getDriversFromSupabase()
            ]);
            
            console.log(`✅ Datos cargados: ${routes.length} rutas, ${deliveries.length} entregas, ${drivers.length} repartidores`);
            
            // Sincronizar datos locales si hay diferencia
            await this.syncIfNeeded(routes, deliveries, drivers);
            
            return { routes, deliveries, drivers };
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            return this.loadFromLocalStorage();
        }
    },

    // Obtener rutas desde Supabase
    async getRoutesFromSupabase() {
        const result = await SupabaseManager.withCacheFallback(
            async () => {
                const { data, error } = await supabase
                    .from('routes')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return { data };
            },
            'routes_cache'
        );
        
        return result.data || [];
    },

    // Obtener entregas desde Supabase
    async getDeliveriesFromSupabase() {
        const result = await SupabaseManager.withCacheFallback(
            async () => {
                const { data, error } = await supabase
                    .from('deliveries')
                    .select('*')
                    .order('created_at', { ascending: false });
                
                if (error) throw error;
                return { data };
            },
            'deliveries_cache'
        );
        
        return result.data || [];
    },

    // Obtener repartidores desde Supabase
    async getDriversFromSupabase() {
        const result = await SupabaseManager.withCacheFallback(
            async () => {
                const { data, error } = await supabase
                    .from('drivers')
                    .select('*')
                    .order('name');
                
                if (error) throw error;
                return { data };
            },
            'drivers_cache'
        );
        
        return result.data || [];
    },

    // Cargar desde localStorage (fallback)
    loadFromLocalStorage() {
        console.log('📁 Cargando datos desde localStorage...');
        
        const routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
        const deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
        const drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        
        return { routes, deliveries, drivers };
    },

    // Sincronizar si es necesario
    async syncIfNeeded(supabaseRoutes, supabaseDeliveries, supabaseDrivers) {
        const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
        const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
        const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        
        // Si hay más datos locales que en Supabase, sincronizar
        if (localRoutes.length > supabaseRoutes.length ||
            localDeliveries.length > supabaseDeliveries.length ||
            localDrivers.length > supabaseDrivers.length) {
            
            console.log('🔄 Sincronizando datos locales con Supabase...');
            await SupabaseManager.syncLocalToSupabase();
        }
    },

    // CRUD para rutas
    async createRoute(route) {
        try {
            const { data, error } = await supabase
                .from('routes')
                .insert([{
                    name: route.name,
                    driver: route.driver,
                    status: route.status,
                    deliveries: route.deliveries || 0,
                    completed: route.completed || 0,
                    description: route.description,
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            
            // Actualizar caché local
            this.updateLocalCache('routes', data[0], 'add');
            
            return { success: true, data: data[0] };
            
        } catch (error) {
            console.error('Error creando ruta:', error);
            // Guardar localmente para sincronizar después
            route.id = Date.now();
            route.created_at = new Date().toISOString();
            this.updateLocalCache('routes', route, 'add');
            
            return { success: false, error: error.message };
        }
    },

    async updateRoute(route) {
        try {
            const { data, error } = await supabase
                .from('routes')
                .update({
                    name: route.name,
                    driver: route.driver,
                    status: route.status,
                    deliveries: route.deliveries,
                    completed: route.completed,
                    description: route.description,
                    updated_at: new Date().toISOString()
                })
                .eq('id', route.id)
                .select();
            
            if (error) throw error;
            
            // Actualizar caché local
            this.updateLocalCache('routes', data[0], 'update');
            
            return { success: true, data: data[0] };
            
        } catch (error) {
            console.error('Error actualizando ruta:', error);
            // Actualizar localmente
            this.updateLocalCache('routes', route, 'update');
            
            return { success: false, error: error.message };
        }
    },

    async deleteRoute(routeId) {
        try {
            const { error } = await supabase
                .from('routes')
                .delete()
                .eq('id', routeId);
            
            if (error) throw error;
            
            // Actualizar caché local
            this.updateLocalCache('routes', { id: routeId }, 'delete');
            
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando ruta:', error);
            // Eliminar localmente
            this.updateLocalCache('routes', { id: routeId }, 'delete');
            
            return { success: false, error: error.message };
        }
    },

    // CRUD para entregas (similar a rutas)
    async createDelivery(delivery) {
        try {
            const { data, error } = await supabase
                .from('deliveries')
                .insert([{
                    client: delivery.client,
                    address: delivery.address,
                    phone: delivery.phone,
                    route: delivery.route,
                    order_details: delivery.order,  // <-- CAMBIADO A 'order_details'
                    observations: delivery.observations,
                    status: delivery.status || 'pending',
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            
            this.updateLocalCache('deliveries', data[0], 'add');
            return { success: true, data: data[0] };
            
        } catch (error) {
            console.error('Error creando entrega:', error);
            delivery.id = Date.now();
            delivery.created_at = new Date().toISOString();
            this.updateLocalCache('deliveries', delivery, 'add');
            
            return { success: false, error: error.message };
        }
    },

    async updateDelivery(delivery) {
        try {
            const { data, error } = await supabase
                .from('deliveries')
                .update({
                    client: delivery.client,
                    address: delivery.address,
                    phone: delivery.phone,
                    route: delivery.route,
                    order_details: delivery.order,  // <-- CAMBIADO AQUÍ TAMBIÉN
                    observations: delivery.observations,
                    status: delivery.status,
                    updated_at: new Date().toISOString()
                })
                .eq('id', delivery.id)
                .select();
            
            if (error) throw error;
            
            this.updateLocalCache('deliveries', data[0], 'update');
            return { success: true, data: data[0] };
            
        } catch (error) {
            console.error('Error actualizando entrega:', error);
            this.updateLocalCache('deliveries', delivery, 'update');
            
            return { success: false, error: error.message };
        }
    },

    async deleteDelivery(deliveryId) {
        try {
            const { error } = await supabase
                .from('deliveries')
                .delete()
                .eq('id', deliveryId);
            
            if (error) throw error;
            
            this.updateLocalCache('deliveries', { id: deliveryId }, 'delete');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            this.updateLocalCache('deliveries', { id: deliveryId }, 'delete');
            
            return { success: false, error: error.message };
        }
    },

    // CRUD para repartidores (similar)
    async createDriver(driver) {
        try {
            const { data, error } = await supabase
                .from('drivers')
                .insert([{
                    name: driver.name,
                    username: driver.username,
                    email: driver.email,
                    phone: driver.phone,
                    vehicle: driver.vehicle,
                    license: driver.license,
                    deliveries: driver.deliveries || 0,
                    status: driver.status || 'active',
                    created_at: new Date().toISOString()
                }])
                .select();
            
            if (error) throw error;
            
            this.updateLocalCache('drivers', data[0], 'add');
            return { success: true, data: data[0] };
            
        } catch (error) {
            console.error('Error creando repartidor:', error);
            driver.id = Date.now();
            driver.created_at = new Date().toISOString();
            this.updateLocalCache('drivers', driver, 'add');
            
            return { success: false, error: error.message };
        }
    },

    // Actualizar caché local
    updateLocalCache(type, item, action) {
        const key = type === 'routes' ? 'delivery_routes' :
                   type === 'deliveries' ? 'delivery_deliveries' :
                   'delivery_drivers';
        
        let items = JSON.parse(localStorage.getItem(key) || '[]');
        
        switch(action) {
            case 'add':
                items.push(item);
                break;
            case 'update':
                const index = items.findIndex(i => i.id === item.id);
                if (index !== -1) {
                    items[index] = { ...items[index], ...item };
                }
                break;
            case 'delete':
                items = items.filter(i => i.id !== item.id);
                break;
        }
        
        localStorage.setItem(key, JSON.stringify(items));
        
        // Actualizar caché específico
        localStorage.setItem(`${type}_cache`, JSON.stringify(items));
    },

    // Obtener estadísticas
    async getStatistics() {
        const routes = await this.getRoutesFromSupabase();
        const deliveries = await this.getDeliveriesFromSupabase();
        const drivers = await this.getDriversFromSupabase();
        
        return {
            totalRoutes: routes.length,
            totalDeliveries: deliveries.length,
            pendingDeliveries: deliveries.filter(d => d.status === 'pending').length,
            completedDeliveries: deliveries.filter(d => d.status === 'completed').length,
            totalDrivers: drivers.filter(d => d.status === 'active').length
        };
    },

    // Suscribirse a cambios en tiempo real
    subscribeToRealtimeChanges() {
        // Rutas
        SupabaseManager.subscribeToChanges('routes', 'INSERT', (payload) => {
            console.log('Nueva ruta:', payload.new);
            UIManager.showNotification('🆕 Nueva ruta añadida', 'info');
            RouteManagerSupabase.loadRoutes();
        });
        
        // Entregas
        SupabaseManager.subscribeToChanges('deliveries', 'UPDATE', (payload) => {
            console.log('Entrega actualizada:', payload.new);
            if (payload.new.status === 'completed') {
                UIManager.showNotification('✅ Entrega completada', 'success');
            }
            DeliveryManagerSupabase.loadDeliveries();
        });
    }
};

// Exportar
window.DataManagerSupabase = DataManagerSupabase;
