// routes-supabase.js - Gestión de rutas con Supabase - CORREGIDO
const RouteManagerSupabase = {
    editingRouteId: null,

    // Abrir modal
    openRouteModal: function(routeId = null) {
        this.editingRouteId = routeId;
        const modal = document.getElementById('routeModal');
        const title = document.getElementById('routeModalTitle');
        
        if (routeId) {
            title.textContent = 'Editar Ruta';
            
            // Cargar datos de la ruta
            DataManagerSupabase.getRoutesFromSupabase().then(routes => {
                const route = routes.find(r => r.id === routeId);
                if (route) {
                    document.getElementById('routeName').value = route.name || '';
                    document.getElementById('routeDriver').value = route.driver || '';
                    document.getElementById('routeStatus').value = route.status || 'active';
                    document.getElementById('routeDescription').value = route.description || '';
                }
            });
        } else {
            title.textContent = 'Nueva Ruta';
            document.getElementById('routeName').value = '';
            document.getElementById('routeDriver').value = '';
            document.getElementById('routeStatus').value = 'active';
            document.getElementById('routeDescription').value = '';
        }
        
        // Cargar repartidores en el select
        UIManager.loadDriversToSelect('routeDriver');
        
        modal.classList.add('active');
    },

    // Cerrar modal
    closeRouteModal: function() {
        this.editingRouteId = null;
        document.getElementById('routeModal').classList.remove('active');
    },

    // Guardar ruta
    saveRoute: async function() {
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

    // Cargar rutas
    async loadRoutes() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const allRoutesGrid = document.getElementById('allRoutesGrid');
            
            if (!allRoutesGrid) return;
            
            allRoutesGrid.innerHTML = '';
            
            if (routes.length === 0) {
                allRoutesGrid.innerHTML = `
                    <div class="text-center" style="grid-column: 1 / -1; padding: 40px;">
                        <i class="fas fa-route fa-3x mb-20" style="color: var(--light-gray);"></i>
                        <h3>No hay rutas creadas</h3>
                        <p>Crea tu primera ruta para comenzar</p>
                    </div>
                `;
                return;
            }
            
            // Ordenar por estado: activas primero
            const sortedRoutes = [...routes].sort((a, b) => {
                const statusOrder = { 'active': 1, 'pending': 2, 'completed': 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            });
            
            for (const route of sortedRoutes) {
                const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
                const routeDeliveries = deliveries.filter(d => d.route === route.name);
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                let statusClass = 'status-pending';
                let statusText = 'Pendiente';
                let statusIcon = '⏳';
                
                switch(route.status) {
                    case 'active':
                        statusClass = 'status-active';
                        statusText = 'Activa';
                        statusIcon = '🚀';
                        break;
                    case 'completed':
                        statusClass = 'status-completed';
                        statusText = 'Completada';
                        statusIcon = '✅';
                        break;
                }
                
                const routeCard = document.createElement('div');
                routeCard.className = 'route-card';
                routeCard.innerHTML = `
                    <div class="route-header">
                        <div class="route-title">
                            <h3>${route.name}</h3>
                            <span class="route-status ${statusClass}">
                                ${statusIcon} ${statusText}
                            </span>
                        </div>
                        <p>${route.description || 'Sin descripción'}</p>
                        <div class="route-info">
                            <div><i class="fas fa-user"></i> ${route.driver || 'Sin asignar'}</div>
                            <div><i class="fas fa-package"></i> ${routeDeliveries.length} entregas</div>
                        </div>
                    </div>
                    <div style="padding: 15px; display: flex; justify-content: space-between; border-top: 1px solid var(--light-gray);">
                        <button class="btn btn-sm btn-secondary" onclick="RouteManagerSupabase.editRoute('${route.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="RouteManagerSupabase.deleteRoute('${route.id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `;
                
                allRoutesGrid.appendChild(routeCard);
            }
            
        } catch (error) {
            console.error('Error cargando rutas:', error);
            UIManager.showNotification('❌ Error cargando rutas', 'danger');
        }
    },

    // Editar ruta
    editRoute: function(routeId) {
        this.openRouteModal(routeId);
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
    }
};

// Exportar funciones globales
window.RouteManagerSupabase = RouteManagerSupabase;
window.openRouteModal = function(routeId = null) { RouteManagerSupabase.openRouteModal(routeId); };
window.closeRouteModal = function() { RouteManagerSupabase.closeRouteModal(); };
window.saveRoute = function() { RouteManagerSupabase.saveRoute(); };
window.editRoute = function(routeId) { RouteManagerSupabase.editRoute(routeId); };
window.deleteRoute = function(routeId) { RouteManagerSupabase.deleteRoute(routeId); };
