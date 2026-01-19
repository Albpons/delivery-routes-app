// dataManager-supabase.js - Gestión de datos con Supabase - ACTUALIZADO CON CORRECCIONES
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
            
            console.log(`✅ Datos cargados desde Supabase: ${routes.length} rutas, ${deliveries.length} entregas, ${drivers.length} repartidores`);
            
            // Sincronizar datos locales si hay diferencia
            await this.syncIfNeeded(routes, deliveries, drivers);
            
            // Actualizar localStorage con datos de Supabase
            localStorage.setItem('delivery_routes', JSON.stringify(routes));
            localStorage.setItem('delivery_deliveries', JSON.stringify(deliveries));
            localStorage.setItem('delivery_drivers', JSON.stringify(drivers));
            
            return { routes, deliveries, drivers };
            
        } catch (error) {
            console.error('❌ Error cargando datos:', error);
            return this.loadFromLocalStorage();
        }
    },

    // Obtener rutas desde Supabase
    async getRoutesFromSupabase() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase no disponible');
            }
            
            const { data, error } = await window.supabase
                .from('routes')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error obteniendo rutas:', error);
                throw error;
            }
            
            // Guardar en caché local
            localStorage.setItem('routes_cache', JSON.stringify(data || []));
            
            return data || [];
            
        } catch (error) {
            console.warn('⚠️ Error obteniendo rutas de Supabase, usando caché local');
            const cached = localStorage.getItem('routes_cache');
            return cached ? JSON.parse(cached) : [];
        }
    },

    // Obtener entregas desde Supabase
    async getDeliveriesFromSupabase() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase no disponible');
            }
            
            const { data, error } = await window.supabase
                .from('deliveries')
                .select('*')
                .order('created_at', { ascending: false });
            
            if (error) {
                console.error('Error obteniendo entregas:', error);
                throw error;
            }
            
            // Guardar en caché local
            localStorage.setItem('deliveries_cache', JSON.stringify(data || []));
            
            return data || [];
            
        } catch (error) {
            console.warn('⚠️ Error obteniendo entregas de Supabase, usando caché local');
            const cached = localStorage.getItem('deliveries_cache');
            return cached ? JSON.parse(cached) : [];
        }
    },

    // Obtener repartidores desde Supabase
    async getDriversFromSupabase() {
        try {
            if (!window.supabase) {
                throw new Error('Supabase no disponible');
            }
            
            const { data, error } = await window.supabase
                .from('drivers')
                .select('*')
                .order('name');
            
            if (error) {
                console.error('Error obteniendo repartidores:', error);
                throw error;
            }
            
            // Guardar en caché local
            localStorage.setItem('drivers_cache', JSON.stringify(data || []));
            
            return data || [];
            
        } catch (error) {
            console.warn('⚠️ Error obteniendo repartidores de Supabase, usando caché local');
            const cached = localStorage.getItem('drivers_cache');
            return cached ? JSON.parse(cached) : [];
        }
    },

    // Cargar desde localStorage (fallback)
    loadFromLocalStorage() {
        console.log('📁 Cargando datos desde localStorage...');
        
        const routes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
        const deliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
        const drivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        
        console.log(`📊 Datos locales: ${routes.length} rutas, ${deliveries.length} entregas, ${drivers.length} repartidores`);
        
        return { routes, deliveries, drivers };
    },

    // Sincronizar si es necesario
    async syncIfNeeded(supabaseRoutes, supabaseDeliveries, supabaseDrivers) {
        const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
        const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
        const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
        
        // Si hay más datos locales que en Supabase, sincronizar
        if (localRoutes.length > 0 || localDeliveries.length > 0 || localDrivers.length > 0) {
            console.log('🔄 Sincronizando datos locales con Supabase...');
            
            // Sincronizar rutas locales a Supabase
            for (const route of localRoutes) {
                const existsInSupabase = supabaseRoutes.some(r => r.id === route.id);
                if (!existsInSupabase && route.id) {
                    try {
                        await this.createRoute(route);
                    } catch (e) {
                        console.warn('No se pudo sincronizar ruta:', route.id, e.message);
                    }
                }
            }
            
            // Sincronizar entregas locales a Supabase
            for (const delivery of localDeliveries) {
                const existsInSupabase = supabaseDeliveries.some(d => d.id === delivery.id);
                if (!existsInSupabase && delivery.id) {
                    try {
                        // Asegurarnos de usar el campo correcto para la comanda
                        const deliveryToSync = {
                            ...delivery,
                            order_details: delivery.order_details || delivery.order || ''
                        };
                        await this.createDelivery(deliveryToSync);
                    } catch (e) {
                        console.warn('No se pudo sincronizar entrega:', delivery.id, e.message);
                    }
                }
            }
            
            // Sincronizar repartidores locales a Supabase
            for (const driver of localDrivers) {
                const existsInSupabase = supabaseDrivers.some(d => d.id === driver.id);
                if (!existsInSupabase && driver.id) {
                    try {
                        await this.createDriver(driver);
                    } catch (e) {
                        console.warn('No se pudo sincronizar repartidor:', driver.id, e.message);
                    }
                }
            }
        }
    },

    // CRUD para rutas
    async createRoute(route) {
        try {
            // Preparar datos para Supabase
            const routeData = {
                name: route.name,
                driver: route.driver || null,
                status: route.status || 'pending',
                deliveries: route.deliveries || 0,
                completed: route.completed || 0,
                description: route.description || '',
                created_at: route.created_at || new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('routes')
                    .insert([routeData])
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                // Modo offline: crear ID temporal
                route.id = route.id || Date.now();
                route.created_at = new Date().toISOString();
                result = { success: true, data: route };
            }
            
            // Actualizar caché local
            this.updateLocalCache('routes', result.data, 'add');
            
            return result;
            
        } catch (error) {
            console.error('Error creando ruta:', error);
            // Guardar localmente para sincronizar después
            route.id = route.id || Date.now();
            route.created_at = new Date().toISOString();
            this.updateLocalCache('routes', route, 'add');
            
            return { success: false, error: error.message };
        }
    },

    async updateRoute(route) {
        try {
            const routeData = {
                name: route.name,
                driver: route.driver,
                status: route.status,
                deliveries: route.deliveries,
                completed: route.completed,
                description: route.description,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase && route.id) {
                const { data, error } = await window.supabase
                    .from('routes')
                    .update(routeData)
                    .eq('id', route.id)
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                result = { success: true, data: route };
            }
            
            // Actualizar caché local
            this.updateLocalCache('routes', result.data, 'update');
            
            return result;
            
        } catch (error) {
            console.error('Error actualizando ruta:', error);
            // Actualizar localmente
            this.updateLocalCache('routes', route, 'update');
            
            return { success: false, error: error.message };
        }
    },

    async deleteRoute(routeId) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('routes')
                    .delete()
                    .eq('id', routeId);
                
                if (error) throw error;
            }
            
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

    // CRUD para entregas
    async createDelivery(delivery) {
        try {
            // Preparar datos para Supabase
            const deliveryData = {
                client: delivery.client,
                address: delivery.address,
                phone: delivery.phone || '',
                route: delivery.route || null,
                order_details: delivery.order_details || delivery.order || '', // CORREGIDO
                observations: delivery.observations || '',
                status: delivery.status || 'pending',
                created_at: delivery.created_at || new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('deliveries')
                    .insert([deliveryData])
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                // Modo offline
                delivery.id = delivery.id || Date.now();
                delivery.created_at = new Date().toISOString();
                result = { success: true, data: delivery };
            }
            
            this.updateLocalCache('deliveries', result.data, 'add');
            return result;
            
        } catch (error) {
            console.error('Error creando entrega:', error);
            delivery.id = delivery.id || Date.now();
            delivery.created_at = new Date().toISOString();
            this.updateLocalCache('deliveries', delivery, 'add');
            
            return { success: false, error: error.message };
        }
    },

    async updateDelivery(delivery) {
        try {
            const deliveryData = {
                client: delivery.client,
                address: delivery.address,
                phone: delivery.phone,
                route: delivery.route,
                order_details: delivery.order_details || delivery.order || '', // CORREGIDO
                observations: delivery.observations,
                status: delivery.status,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase && delivery.id) {
                const { data, error } = await window.supabase
                    .from('deliveries')
                    .update(deliveryData)
                    .eq('id', delivery.id)
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                result = { success: true, data: delivery };
            }
            
            this.updateLocalCache('deliveries', result.data, 'update');
            return result;
            
        } catch (error) {
            console.error('Error actualizando entrega:', error);
            this.updateLocalCache('deliveries', delivery, 'update');
            
            return { success: false, error: error.message };
        }
    },

    async deleteDelivery(deliveryId) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('deliveries')
                    .delete()
                    .eq('id', deliveryId);
                
                if (error) throw error;
            }
            
            this.updateLocalCache('deliveries', { id: deliveryId }, 'delete');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            this.updateLocalCache('deliveries', { id: deliveryId }, 'delete');
            
            return { success: false, error: error.message };
        }
    },

    // CRUD para repartidores
    async createDriver(driver) {
        try {
            const driverData = {
                name: driver.name,
                username: driver.username,
                email: driver.email,
                phone: driver.phone || '',
                vehicle: driver.vehicle || 'Motocicleta',
                license: driver.license || '',
                deliveries: driver.deliveries || 0,
                status: driver.status || 'active',
                created_at: driver.created_at || new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase) {
                const { data, error } = await window.supabase
                    .from('drivers')
                    .insert([driverData])
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                driver.id = driver.id || Date.now();
                driver.created_at = new Date().toISOString();
                result = { success: true, data: driver };
            }
            
            this.updateLocalCache('drivers', result.data, 'add');
            return result;
            
        } catch (error) {
            console.error('Error creando repartidor:', error);
            driver.id = driver.id || Date.now();
            driver.created_at = new Date().toISOString();
            this.updateLocalCache('drivers', driver, 'add');
            
            return { success: false, error: error.message };
        }
    },

    async updateDriver(driver) {
        try {
            const driverData = {
                name: driver.name,
                username: driver.username,
                email: driver.email,
                phone: driver.phone,
                vehicle: driver.vehicle,
                license: driver.license,
                deliveries: driver.deliveries,
                status: driver.status,
                updated_at: new Date().toISOString()
            };
            
            let result;
            
            if (window.supabase && driver.id) {
                const { data, error } = await window.supabase
                    .from('drivers')
                    .update(driverData)
                    .eq('id', driver.id)
                    .select();
                
                if (error) throw error;
                
                result = { success: true, data: data[0] };
            } else {
                result = { success: true, data: driver };
            }
            
            this.updateLocalCache('drivers', result.data, 'update');
            return result;
            
        } catch (error) {
            console.error('Error actualizando repartidor:', error);
            this.updateLocalCache('drivers', driver, 'update');
            
            return { success: false, error: error.message };
        }
    },

    async deleteDriver(driverId) {
        try {
            if (window.supabase) {
                const { error } = await window.supabase
                    .from('drivers')
                    .delete()
                    .eq('id', driverId);
                
                if (error) throw error;
            }
            
            this.updateLocalCache('drivers', { id: driverId }, 'delete');
            return { success: true };
            
        } catch (error) {
            console.error('Error eliminando repartidor:', error);
            this.updateLocalCache('drivers', { id: driverId }, 'delete');
            
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
                // Verificar si ya existe
                const existingIndex = items.findIndex(i => i.id === item.id);
                if (existingIndex === -1) {
                    items.push(item);
                } else {
                    items[existingIndex] = { ...items[existingIndex], ...item };
                }
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
    }
};

// Exportar
window.DataManagerSupabase = DataManagerSupabase;
