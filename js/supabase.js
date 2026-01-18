// supabase.js - Configuración y funciones base de Supabase - CORREGIDO
const SUPABASE_URL = 'https://gryjdkuexbepehmtcrum.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdyeWpka3VleGJlcGVobXRjcnVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njg3MDY3NzgsImV4cCI6MjA4NDI4Mjc3OH0.gZMljLMfIcrfcddM9kAHdo8XB0SWjA8BBow3TowF_UY';

// Crear cliente de Supabase solo si no existe
if (!window.supabase) {
    window.supabase = supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
}

// Funciones de utilidad para Supabase
const SupabaseManager = {
    // Verificar conexión
    async checkConnection() {
        try {
            // Verificar conexión simple
            const { data, error } = await window.supabase.auth.getSession();
            
            if (error) {
                console.error('Error de conexión Supabase:', error);
                return { success: false, error };
            }
            
            return { success: true };
        } catch (error) {
            console.error('Excepción en checkConnection:', error);
            return { success: false, error };
        }
    },

    // Sincronizar datos locales con Supabase
    async syncLocalToSupabase() {
        console.log('🔄 Sincronizando datos locales con Supabase...');
        
        try {
            const localRoutes = JSON.parse(localStorage.getItem('delivery_routes') || '[]');
            const localDeliveries = JSON.parse(localStorage.getItem('delivery_deliveries') || '[]');
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            
            let syncedCount = 0;
            
            // Sincronizar rutas
            if (localRoutes.length > 0) {
                for (const route of localRoutes) {
                    try {
                        const { error } = await window.supabase
                            .from('routes')
                            .upsert({
                                id: route.id,
                                name: route.name,
                                driver: route.driver,
                                status: route.status,
                                deliveries: route.deliveries,
                                completed: route.completed,
                                description: route.description,
                                created_at: route.createdAt || new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando ruta:', e);
                    }
                }
            }
            
            // Sincronizar entregas
            if (localDeliveries.length > 0) {
                for (const delivery of localDeliveries) {
                    try {
                        const { error } = await window.supabase
                            .from('deliveries')
                            .upsert({
                                id: delivery.id,
                                client: delivery.client,
                                address: delivery.address,
                                phone: delivery.phone,
                                route: delivery.route,
                                order: delivery.order,
                                observations: delivery.observations,
                                status: delivery.status,
                                created_at: delivery.createdAt || new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando entrega:', e);
                    }
                }
            }
            
            // Sincronizar repartidores
            if (localDrivers.length > 0) {
                for (const driver of localDrivers) {
                    try {
                        const { error } = await window.supabase
                            .from('drivers')
                            .upsert({
                                id: driver.id,
                                name: driver.name,
                                username: driver.username,
                                email: driver.email,
                                phone: driver.phone,
                                vehicle: driver.vehicle,
                                license: driver.license,
                                deliveries: driver.deliveries,
                                status: driver.status,
                                created_at: new Date().toISOString()
                            }, { onConflict: 'id' });
                        
                        if (!error) syncedCount++;
                    } catch (e) {
                        console.error('Error sincronizando repartidor:', e);
                    }
                }
            }
            
            console.log(`✅ Sincronizados ${syncedCount} registros a Supabase`);
            return { success: true, count: syncedCount };
            
        } catch (error) {
            console.error('❌ Error en sincronización:', error);
            return { success: false, error };
        }
    },

    // Verificar si estamos en modo offline
    isOnline() {
        return navigator.onLine;
    },

    // Estrategia de caché para modo offline
    async withCacheFallback(operation, cacheKey) {
        if (this.isOnline()) {
            try {
                const result = await operation();
                // Guardar en caché local
                if (result.data) {
                    localStorage.setItem(cacheKey, JSON.stringify(result.data));
                }
                return result;
            } catch (error) {
                console.warn('⚠️ Error online, usando caché:', error);
                // Fallback a caché
                const cached = localStorage.getItem(cacheKey);
                return { data: cached ? JSON.parse(cached) : [], error: null };
            }
        } else {
            console.log('📴 Modo offline activado, usando caché local');
            const cached = localStorage.getItem(cacheKey);
            return { data: cached ? JSON.parse(cached) : [], error: null };
        }
    },

    // Suscribirse a cambios en tiempo real
    subscribeToChanges(table, event, callback) {
        return window.supabase
            .channel('public:' + table)
            .on('postgres_changes', 
                { event: event, schema: 'public', table: table }, 
                callback
            )
            .subscribe();
    }
};

// Exportar para uso global
window.SupabaseManager = SupabaseManager;
