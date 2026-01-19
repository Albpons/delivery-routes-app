// routes-supabase.js - Gestión de rutas con Supabase - ACTUALIZADO
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
                
                // Actualizar contadores después de guardar
                setTimeout(() => {
                    this.updateRouteCounters();
                }, 500);
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
    },

    // Actualizar contadores de entregas para todas las rutas
    async updateAllRouteCounters() {
        console.log('🔄 Actualizando contadores de todas las rutas...');
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            let updatedCount = 0;
            
            for (const route of routes) {
                const routeDeliveries = deliveries.filter(d => {
                    if (!d.route || !route.name) return false;
                    // Comparación insensible a mayúsculas/minúsculas
                    return d.route.toString().trim().toLowerCase() === route.name.toString().trim().toLowerCase();
                });
                
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                // Solo actualizar si los números han cambiado
                if (route.deliveries !== routeDeliveries.length || route.completed !== completedDeliveries) {
                    const updatedRoute = {
                        ...route,
                        deliveries: routeDeliveries.length,
                        completed: completedDeliveries
                    };
                    
                    await DataManagerSupabase.updateRoute(updatedRoute);
                    updatedCount++;
                    console.log(`📊 Ruta "${route.name}": ${routeDeliveries.length} entregas, ${completedDeliveries} completadas`);
                }
            }
            
            console.log(`✅ ${updatedCount} contadores actualizados`);
            
            if (updatedCount > 0 && window.UIManager) {
                UIManager.showNotification(`✅ ${updatedCount} rutas actualizadas con nuevos contadores`, 'success');
            }
            
            return { success: true, updatedCount };
            
        } catch (error) {
            console.error('Error actualizando contadores:', error);
            return { success: false, error: error.message };
        }
    },

    // Actualizar contadores de una ruta específica
    async updateRouteCounters(routeName = null) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // Si se especifica una ruta, solo actualizar esa
            const routesToUpdate = routeName 
                ? routes.filter(r => r.name === routeName)
                : routes;
            
            for (const route of routesToUpdate) {
                const routeDeliveries = deliveries.filter(d => {
                    if (!d.route || !route.name) return false;
                    // Comparación insensible a mayúsculas/minúsculas
                    return d.route.toString().trim().toLowerCase() === route.name.toString().trim().toLowerCase();
                });
                
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                const updatedRoute = {
                    ...route,
                    deliveries: routeDeliveries.length,
                    completed: completedDeliveries
                };
                
                await DataManagerSupabase.updateRoute(updatedRoute);
            }
            
            console.log(`📊 Contadores actualizados para ${routesToUpdate.length} rutas`);
            
            // Recargar UI si es necesario
            if (routesToUpdate.length > 0) {
                setTimeout(() => {
                    this.loadRoutes();
                    if (window.UIManager) {
                        UIManager.loadDashboard();
                    }
                }, 300);
            }
            
            return { success: true };
            
        } catch (error) {
            console.error('Error actualizando contadores de ruta:', error);
            return { success: false, error: error.message };
        }
    },

    // Verificar y corregir nombres de ruta inconsistentes
    async fixRouteNames() {
        console.log('🔧 Corrigiendo nombres de ruta inconsistentes...');
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            let fixedCount = 0;
            
            // Para cada entrega, verificar si su nombre de ruta coincide exactamente con alguna ruta
            for (const delivery of deliveries) {
                if (delivery.route && delivery.route.trim() !== '') {
                    const deliveryRoute = delivery.route.trim();
                    
                    // Buscar ruta que coincida (ignorando mayúsculas/minúsculas)
                    const matchingRoute = routes.find(route => 
                        route.name && route.name.toString().trim().toLowerCase() === deliveryRoute.toLowerCase()
                    );
                    
                    if (matchingRoute && matchingRoute.name !== deliveryRoute) {
                        // Actualizar entrega con el nombre correcto de la ruta
                        const updatedDelivery = {
                            ...delivery,
                            route: matchingRoute.name
                        };
                        
                        try {
                            await DataManagerSupabase.updateDelivery(updatedDelivery);
                            fixedCount++;
                            console.log(`✅ Corregida entrega ${delivery.id}: "${deliveryRoute}" → "${matchingRoute.name}"`);
                        } catch (error) {
                            console.error(`❌ Error corrigiendo entrega ${delivery.id}:`, error);
                        }
                    }
                }
            }
            
            console.log(`✅ ${fixedCount} nombres de ruta corregidos`);
            
            if (fixedCount > 0 && window.UIManager) {
                UIManager.showNotification(`✅ ${fixedCount} nombres de ruta corregidos`, 'success');
            }
            
            // Actualizar contadores después de corregir nombres
            if (fixedCount > 0) {
                await this.updateRouteCounters();
            }
            
            return { success: true, fixedCount };
            
        } catch (error) {
            console.error('Error corrigiendo nombres de ruta:', error);
            return { success: false, error: error.message };
        }
    },

    // Obtener rutas para un repartidor específico
    async getRoutesForDriver(driverName) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            
            // Función para normalizar nombres
            const normalize = (str) => {
                if (!str) return '';
                return str.toString().trim().toLowerCase();
            };
            
            // Filtrar rutas del repartidor (comparación insensible a mayúsculas)
            return routes.filter(route => 
                route.driver && normalize(route.driver) === normalize(driverName)
            );
            
        } catch (error) {
            console.error('Error obteniendo rutas para repartidor:', error);
            return [];
        }
    },

    // Obtener entregas para una ruta específica
    async getDeliveriesForRoute(routeName) {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // Función para normalizar nombres
            const normalize = (str) => {
                if (!str) return '';
                return str.toString().trim().toLowerCase();
            };
            
            // Filtrar entregas para la ruta (comparación insensible a mayúsculas)
            return deliveries.filter(delivery => 
                delivery.route && normalize(delivery.route) === normalize(routeName)
            );
            
        } catch (error) {
            console.error('Error obteniendo entregas para ruta:', error);
            return [];
        }
    },

    // Buscar rutas vacías (sin entregas)
    async findEmptyRoutes() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            const emptyRoutes = [];
            
            for (const route of routes) {
                const routeDeliveries = await this.getDeliveriesForRoute(route.name);
                if (routeDeliveries.length === 0) {
                    emptyRoutes.push({
                        ...route,
                        reason: 'No hay entregas asignadas a esta ruta'
                    });
                }
            }
            
            return emptyRoutes;
            
        } catch (error) {
            console.error('Error buscando rutas vacías:', error);
            return [];
        }
    },

    // Diagnosticar problemas con rutas
    async diagnoseRouteProblems() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            
            const problems = {
                routesWithoutDriver: [],
                routesWithoutDeliveries: [],
                deliveriesWithoutRoute: [],
                driverMismatches: []
            };
            
            // Rutas sin repartidor
            problems.routesWithoutDriver = routes.filter(route => !route.driver || route.driver.trim() === '');
            
            // Rutas sin entregas
            for (const route of routes) {
                const routeDeliveries = await this.getDeliveriesForRoute(route.name);
                if (routeDeliveries.length === 0) {
                    problems.routesWithoutDeliveries.push(route);
                }
            }
            
            // Entregas sin ruta
            problems.deliveriesWithoutRoute = deliveries.filter(delivery => !delivery.route || delivery.route.trim() === '');
            
            // Desajustes entre repartidores asignados y repartidores existentes
            const driverNames = drivers.map(driver => driver.name);
            for (const route of routes) {
                if (route.driver && route.driver.trim() !== '' && !driverNames.includes(route.driver)) {
                    problems.driverMismatches.push({
                        route: route.name,
                        assignedDriver: route.driver,
                        issue: 'Repartidor asignado no existe en la base de datos'
                    });
                }
            }
            
            return problems;
            
        } catch (error) {
            console.error('Error diagnosticando problemas de rutas:', error);
            return null;
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
window.updateRouteCounters = function(routeName = null) { RouteManagerSupabase.updateRouteCounters(routeName); };
window.fixRouteNames = function() { RouteManagerSupabase.fixRouteNames(); };
window.diagnoseRouteProblems = function() { return RouteManagerSupabase.diagnoseRouteProblems(); };
