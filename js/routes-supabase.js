// routes-supabase.js - Gestión de rutas con Supabase
const RouteManagerSupabase = {
    editingRouteId: null,

    // Abrir modal (igual que antes)
    openRouteModal: function(routeId = null) {
        // Mismo código que routes.js...
    },

    // Cargar rutas desde Supabase
    async loadRoutes() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const allRoutesGrid = document.getElementById('allRoutesGrid');
            
            // Mismo código de renderizado que routes.js...
            // Solo cambiar las llamadas a DataManager.getRoutes() por routes
            
        } catch (error) {
            console.error('Error cargando rutas:', error);
            UIManager.showNotification('❌ Error cargando rutas', 'danger');
        }
    },

    // Guardar ruta
    async saveRoute() {
        const name = document.getElementById('routeName').value;
        const driver = document.getElementById('routeDriver').value;
        const status = document.getElementById('routeStatus').value;
        const description = document.getElementById('routeDescription').value;
        
        if (!name) {
            alert('Por favor, ingresa un nombre para la ruta');
            return;
        }
        
        const routeData = {
            name,
            driver,
            status,
            deliveries: 0,
            completed: 0,
            description
        };
        
        try {
            let result;
            
            if (this.editingRouteId) {
                routeData.id = this.editingRouteId;
                result = await DataManagerSupabase.updateRoute(routeData);
            } else {
                result = await DataManagerSupabase.createRoute(routeData);
            }
            
            if (result.success) {
                UIManager.showNotification('✅ Ruta guardada correctamente', 'success');
                this.closeRouteModal();
                await this.loadRoutes();
                UIManager.loadDashboard();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error guardando ruta:', error);
            UIManager.showNotification('❌ Error guardando ruta', 'danger');
        }
    },

    // Eliminar ruta
    async deleteRoute(routeId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta ruta?')) return;
        
        try {
            const result = await DataManagerSupabase.deleteRoute(routeId);
            
            if (result.success) {
                UIManager.showNotification('✅ Ruta eliminada', 'success');
                await this.loadRoutes();
                UIManager.loadDashboard();
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error eliminando ruta:', error);
            UIManager.showNotification('❌ Error eliminando ruta', 'danger');
        }
    },

    // Resto de funciones similares a routes.js...
    // Solo cambiar las llamadas a DataManager por DataManagerSupabase
};

// Exportar funciones globales
window.RouteManagerSupabase = RouteManagerSupabase;
window.openRouteModal = RouteManagerSupabase.openRouteModal.bind(RouteManagerSupabase);
window.closeRouteModal = RouteManagerSupabase.closeRouteModal.bind(RouteManagerSupabase);
window.saveRoute = RouteManagerSupabase.saveRoute.bind(RouteManagerSupabase);
window.editRoute = RouteManagerSupabase.editRoute.bind(RouteManagerSupabase);
window.deleteRoute = RouteManagerSupabase.deleteRoute.bind(RouteManagerSupabase);
