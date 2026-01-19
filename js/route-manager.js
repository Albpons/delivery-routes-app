// Gestión de rutas
const RouteManager = {
    editingRouteId: null,
    
    // Inicializar
    init() {
        this.setupEventListeners();
        this.loadRoutes();
    },
    
    // Configurar event listeners
    setupEventListeners() {
        // Escuchar cambios en los datos
        document.addEventListener('dataChanged', () => {
            this.loadRoutes();
        });
    },
    
    // Cargar rutas
    async loadRoutes() {
        try {
            const routesContainer = document.getElementById('routesContainer');
            const todayRoutes = document.getElementById('todayRoutes');
            
            if (!routesContainer && !todayRoutes) return;
            
            const routes = DataManager.cache.routes;
            const deliveries = DataManager.cache.deliveries;
            
            // Ordenar: activas primero, luego pendientes, luego completadas
            const sortedRoutes = [...routes].sort((a, b) => {
                const statusOrder = { 'active': 1, 'pending': 2, 'completed': 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            });
            
            // Renderizar en dashboard (solo rutas activas de hoy)
            if (todayRoutes) {
                const today = new Date().toDateString();
                const todayActiveRoutes = sortedRoutes.filter(route => 
                    route.status === 'active'
                ).slice(0, 3); // Mostrar máximo 3
                
                if (todayActiveRoutes.length === 0) {
                    todayRoutes.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-route fa-2x text-muted mb-2"></i>
                            <p class="text-muted">No hay rutas activas hoy</p>
                            <button class="btn btn-sm btn-primary mt-2" onclick="openRouteModal()">
                                <i class="fas fa-plus"></i> Crear Ruta
                            </button>
                        </div>
                    `;
                } else {
                    let html = '';
                    todayActiveRoutes.forEach(route => {
                        const routeDeliveries = deliveries.filter(d => d.route === route.name);
                        const completed = routeDeliveries.filter(d => d.status === 'completed').length;
                        const progress = routeDeliveries.length > 0 ? 
                            Math.round((completed / routeDeliveries.length) * 100) : 0;
                        
                        html += `
                            <div class="route-item">
                                <div class="d-flex justify-content-between align-items-center mb-2">
                                    <strong>${route.name}</strong>
                                    <span class="badge badge-${route.status === 'active' ? 'success' : 'warning'}">
                                        ${route.status === 'active' ? 'Activa' : 'Pendiente'}
                                    </span>
                                </div>
                                <div class="d-flex justify-content-between text-sm mb-1">
                                    <span>${route.driver || 'Sin asignar'}</span>
                                    <span>${completed}/${routeDeliveries.length}</span>
                                </div>
                                <div class="progress" style="height: 4px;">
                                    <div class="progress-bar bg-success" style="width: ${progress}%"></div>
                                </div>
                            </div>
                        `;
                    });
                    
                    todayRoutes.innerHTML = html;
                }
            }
            
            // Renderizar en página de rutas
            if (routesContainer) {
                if (sortedRoutes.length === 0) {
                    routesContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-route fa-3x text-muted mb-3"></i>
                            <h3>No hay rutas creadas</h3>
                            <p class="text-muted mb-4">Crea tu primera ruta para comenzar</p>
                            <button class="btn btn-primary" onclick="openRouteModal()">
                                <i class="fas fa-plus"></i> Crear Primera Ruta
                            </button>
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                sortedRoutes.forEach(route => {
                    const routeDeliveries = deliveries.filter(d => d.route === route.name);
                    const completed = routeDeliveries.filter(d => d.status === 'completed').length;
                    const progress = routeDeliveries.length > 0 ? 
                        Math.round((completed / routeDeliveries.length) * 100) : 0;
                    
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
                    
                    html += `
                        <div class="route-card">
                            <div class="route-header">
                                <div class="route-title">
                                    <h3>${route.name}</h3>
                                    <span class="route-status ${statusClass}">
                                        ${statusIcon} ${statusText}
                                    </span>
                                </div>
                                
                                ${route.description ? `<p class="text-sm text-muted mt-1">${route.description}</p>` : ''}
                                
                                <div class="route-driver">
                                    <i class="fas fa-user"></i>
                                    <span>${route.driver || 'Sin repartidor asignado'}</span>
                                </div>
                                
                                <div class="route-info">
                                    <div>
                                        <i class="fas fa-package"></i>
                                        <span>${routeDeliveries.length} entregas</span>
                                    </div>
                                    <div>
                                        <i class="fas fa-check-circle"></i>
                                        <span>${completed} completadas</span>
                                    </div>
                                </div>
                                
                                ${routeDeliveries.length > 0 ? `
                                    <div class="route-progress mt-2">
                                        <div class="progress-bar">
                                            <div class="progress-fill" style="width: ${progress}%;"></div>
                                        </div>
                                        <small class="progress-text">${progress}% completado</small>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="route-deliveries">
                                ${routeDeliveries.slice(0, 3).map(delivery => `
                                    <div class="delivery-item">
                                        <div class="delivery-client">
                                            <div class="client-avatar">
                                                ${delivery.client ? delivery.client.charAt(0) : 'C'}
                                            </div>
                                            <div class="delivery-info">
                                                <strong>${delivery.client || 'Cliente'}</strong>
                                                <small class="text-truncate">${delivery.address || ''}</small>
                                            </div>
                                        </div>
                                        <div class="delivery-actions">
                                            <span class="badge badge-${delivery.status === 'completed' ? 'success' : 
                                                                         delivery.status === 'in_progress' ? 'primary' : 
                                                                         'warning'}">
                                                ${delivery.status === 'completed' ? '✓' : 
                                                  delivery.status === 'in_progress' ? '→' : '•'}
                                            </span>
                                        </div>
                                    </div>
                                `).join('')}
                                
                                ${routeDeliveries.length > 3 ? `
                                    <div class="text-center mt-2">
                                        <small class="text-muted">+${routeDeliveries.length - 3} más</small>
                                    </div>
                                ` : ''}
                                
                                ${routeDeliveries.length === 0 ? `
                                    <div class="text-center py-3">
                                        <i class="fas fa-box-open text-muted"></i>
                                        <p class="text-muted mt-1">No hay entregas asignadas</p>
                                    </div>
                                ` : ''}
                            </div>
                            
                            <div class="route-actions">
                                <button class="btn btn-sm btn-secondary" onclick="editRoute('${route.id}')">
                                    <i class="fas fa-edit"></i> Editar
                                </button>
                                <button class="btn btn-sm btn-primary" onclick="assignDriverToRoute('${route.id}')">
                                    <i class="fas fa-user-plus"></i> Asignar
                                </button>
                                <button class="btn btn-sm btn-danger" onclick="deleteRoute('${route.id}')">
                                    <i class="fas fa-trash"></i> Eliminar
                                </button>
                            </div>
                        </div>
                    `;
                });
                
                routesContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Error cargando rutas:', error);
            showToast('Error cargando rutas', 'error');
        }
    },
    
    // Abrir modal de ruta
    openRouteModal(routeId = null) {
        this.editingRouteId = routeId;
        const modal = document.getElementById('routeModal');
        const title = document.getElementById('routeModalTitle');
        
        if (routeId) {
            title.textContent = 'Editar Ruta';
            
            // Cargar datos de la ruta
            const route = DataManager.cache.routes.find(r => r.id === routeId);
            if (route) {
                this.populateRouteForm(route);
            }
        } else {
            title.textContent = 'Nueva Ruta';
            this.clearRouteForm();
        }
        
        // Cargar repartidores en el select
        this.loadDriversToSelect();
        
        // Mostrar modal
        modal.classList.add('active');
    },
    
    // Cerrar modal de ruta
    closeRouteModal() {
        this.editingRouteId = null;
        const modal = document.getElementById('routeModal');
        modal.classList.remove('active');
    },
    
    // Limpiar formulario
    clearRouteForm() {
        document.getElementById('routeName').value = '';
        document.getElementById('routeDriver').value = '';
        document.getElementById('routeStatus').value = 'pending';
        document.getElementById('routeDescription').value = '';
    },
    
    // Rellenar formulario
    populateRouteForm(route) {
        document.getElementById('routeName').value = route.name || '';
        document.getElementById('routeDriver').value = route.driver || '';
        document.getElementById('routeStatus').value = route.status || 'pending';
        document.getElementById('routeDescription').value = route.description || '';
    },
    
    // Cargar repartidores en select
    loadDriversToSelect() {
        const select = document.getElementById('routeDriver');
        if (!select) return;
        
        const activeDrivers = DataManager.cache.drivers.filter(d => d.status === 'active');
        
        select.innerHTML = '<option value="">Sin asignar</option>';
        
        activeDrivers.forEach(driver => {
            const option = document.createElement('option');
            option.value = driver.name;
            option.textContent = `${driver.name} (${driver.vehicle})`;
            select.appendChild(option);
        });
    },
    
    // Guardar ruta
    async saveRoute() {
        const name = document.getElementById('routeName').value.trim();
        const driver = document.getElementById('routeDriver').value;
        const status = document.getElementById('routeStatus').value;
        const description = document.getElementById('routeDescription').value.trim();
        
        if (!name) {
            showToast('Por favor, ingresa un nombre para la ruta', 'warning');
            return;
        }
        
        const routeData = {
            name,
            driver,
            status,
            description
        };
        
        try {
            let result;
            
            if (this.editingRouteId) {
                result = await DataManager.updateRoute(this.editingRouteId, routeData);
            } else {
                result = await DataManager.createRoute(routeData);
            }
            
            if (result.success) {
                showToast(`Ruta ${this.editingRouteId ? 'actualizada' : 'creada'} correctamente`, 'success');
                this.closeRouteModal();
                await this.loadRoutes();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error guardando ruta:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Editar ruta
    editRoute(routeId) {
        this.openRouteModal(routeId);
    },
    
    // Eliminar ruta
    async deleteRoute(routeId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta ruta?')) {
            return;
        }
        
        try {
            const result = await DataManager.deleteRoute(routeId);
            
            if (result.success) {
                showToast('Ruta eliminada correctamente', 'success');
                await this.loadRoutes();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error eliminando ruta:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Asignar repartidor a ruta
    async assignDriverToRoute(routeId) {
        const route = DataManager.cache.routes.find(r => r.id === routeId);
        if (!route) return;
        
        const driverName = prompt('Ingresa el nombre del repartidor para asignar a esta ruta:', route.driver || '');
        
        if (driverName === null) return;
        
        try {
            const result = await DataManager.updateRoute(routeId, { driver: driverName });
            
            if (result.success) {
                showToast(`Repartidor asignado a la ruta "${route.name}"`, 'success');
                await this.loadRoutes();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error asignando repartidor:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Refrescar rutas
    refreshRoutes() {
        this.loadRoutes();
        showToast('Rutas actualizadas', 'info');
    }
};

// Funciones globales
window.openRouteModal = function(routeId = null) {
    RouteManager.openRouteModal(routeId);
};

window.closeRouteModal = function() {
    RouteManager.closeRouteModal();
};

window.saveRoute = function() {
    RouteManager.saveRoute();
};

window.editRoute = function(routeId) {
    RouteManager.editRoute(routeId);
};

window.deleteRoute = function(routeId) {
    RouteManager.deleteRoute(routeId);
};

window.assignDriverToRoute = function(routeId) {
    RouteManager.assignDriverToRoute(routeId);
};

window.refreshRoutes = function() {
    RouteManager.refreshRoutes();
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    RouteManager.init();
});

// Exportar para uso global
window.RouteManager = RouteManager;
