// Gestión de repartidores
const DriverManager = {
    editingDriverId: null,
    
    // Inicializar
    init() {
        this.setupEventListeners();
        this.loadDrivers();
    },
    
    // Configurar event listeners
    setupEventListeners() {
        document.addEventListener('dataChanged', () => {
            this.loadDrivers();
        });
    },
    
    // Cargar repartidores
    async loadDrivers() {
        try {
            const driversGrid = document.getElementById('driversGrid');
            if (!driversGrid) return;
            
            const drivers = DataManager.cache.drivers;
            const deliveries = DataManager.cache.deliveries;
            const routes = DataManager.cache.routes;
            
            if (drivers.length === 0) {
                driversGrid.innerHTML = `
                    <div class="empty-state">
                        <i class="fas fa-users fa-3x text-muted mb-3"></i>
                        <h3>No hay repartidores</h3>
                        <p class="text-muted mb-4">Añade repartidores para asignarles rutas</p>
                        <button class="btn btn-primary" onclick="openDriverModal()">
                            <i class="fas fa-plus"></i> Nuevo Repartidor
                        </button>
                    </div>
                `;
                return;
            }
            
            let html = '';
            drivers.forEach(driver => {
                // Obtener rutas asignadas a este repartidor
                const driverRoutes = routes.filter(route => route.driver === driver.name);
                
                // Obtener entregas de estas rutas
                const routeNames = driverRoutes.map(route => route.name);
                const driverDeliveries = deliveries.filter(d => routeNames.includes(d.route));
                const completedDeliveries = driverDeliveries.filter(d => d.status === 'completed').length;
                
                // Calcular eficiencia
                const efficiency = driverDeliveries.length > 0 ? 
                    Math.round((completedDeliveries / driverDeliveries.length) * 100) : 0;
                
                html += `
                    <div class="driver-card">
                        <div class="driver-avatar" style="background-color: ${this.getDriverColor(driver.name)}">
                            ${driver.name.charAt(0)}
                        </div>
                        
                        <div class="driver-info">
                            <h3>${driver.name}</h3>
                            <p><i class="fas fa-envelope"></i> ${driver.email || 'Sin email'}</p>
                            <p><i class="fas fa-phone"></i> ${driver.phone || 'Sin teléfono'}</p>
                            <p><i class="fas fa-car"></i> ${driver.vehicle || 'Sin vehículo'}</p>
                            <p><i class="fas fa-id-card"></i> ${driver.license || 'Sin licencia'}</p>
                        </div>
                        
                        <div class="driver-stats">
                            <div class="driver-stat">
                                <h4>${driverRoutes.length}</h4>
                                <small>Rutas</small>
                            </div>
                            <div class="driver-stat">
                                <h4>${driverDeliveries.length}</h4>
                                <small>Entregas</small>
                            </div>
                            <div class="driver-stat">
                                <h4>${efficiency}%</h4>
                                <small>Eficiencia</small>
                            </div>
                        </div>
                        
                        <div class="driver-actions">
                            <button class="btn btn-sm btn-secondary" onclick="editDriver('${driver.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm ${driver.status === 'active' ? 'btn-warning' : 'btn-success'}" 
                                    onclick="toggleDriverStatus('${driver.id}')">
                                <i class="fas fa-${driver.status === 'active' ? 'pause' : 'play'}"></i> 
                                ${driver.status === 'active' ? 'Pausar' : 'Activar'}
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteDriver('${driver.id}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    </div>
                `;
            });
            
            driversGrid.innerHTML = html;
        } catch (error) {
            console.error('Error cargando repartidores:', error);
            showToast('Error cargando repartidores', 'error');
        }
    },
    
    // Obtener color para avatar basado en nombre
    getDriverColor(name) {
        const colors = [
            '#4361ee', '#7209b7', '#f72585', '#4cc9f0', 
            '#f8961e', '#43aa8b', '#90be6d', '#577590'
        ];
        
        let hash = 0;
        for (let i = 0; i < name.length; i++) {
            hash = name.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        return colors[Math.abs(hash) % colors.length];
    },
    
    // Cargar datos del repartidor (para vista de repartidor)
    async loadDriverData() {
        if (AuthManager.userRole !== 'driver' || !AuthManager.currentUser) return;
        
        const driver = AuthManager.currentUser;
        const routes = DataManager.cache.routes;
        const deliveries = DataManager.cache.deliveries;
        
        // Obtener rutas del repartidor
        const driverRoutes = routes.filter(route => route.driver === driver.name);
        
        // Obtener entregas de estas rutas
        const routeNames = driverRoutes.map(route => route.name);
        const driverDeliveries = deliveries.filter(d => routeNames.includes(d.route));
        
        const completed = driverDeliveries.filter(d => d.status === 'completed').length;
        const pending = driverDeliveries.filter(d => d.status === 'pending').length;
        const efficiency = driverDeliveries.length > 0 ? 
            Math.round((completed / driverDeliveries.length) * 100) : 0;
        
        // Actualizar estadísticas en el perfil
        document.getElementById('driverCompleted').textContent = completed;
        document.getElementById('driverPending').textContent = pending;
        document.getElementById('driverRating').textContent = efficiency + '%';
        
        // Cargar rutas para el repartidor
        this.loadDriverRoutes(driverRoutes, driverDeliveries);
        
        // Cargar entregas para el repartidor
        this.loadDriverDeliveries(driverDeliveries);
    },
    
    // Cargar rutas del repartidor
    loadDriverRoutes(driverRoutes, driverDeliveries) {
        const driverRoutesElement = document.getElementById('driverRoutes');
        if (!driverRoutesElement) return;
        
        if (driverRoutes.length === 0) {
            driverRoutesElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-route fa-3x text-muted mb-3"></i>
                    <h3>No tienes rutas asignadas</h3>
                    <p class="text-muted">Espera a que el administrador te asigne rutas</p>
                </div>
            `;
            return;
        }
        
        let html = '';
        driverRoutes.forEach(route => {
            const routeDeliveries = driverDeliveries.filter(d => d.route === route.name);
            const completed = routeDeliveries.filter(d => d.status === 'completed').length;
            const progress = routeDeliveries.length > 0 ? 
                Math.round((completed / routeDeliveries.length) * 100) : 0;
            
            html += `
                <div class="driver-route-card">
                    <div class="driver-route-header">
                        <h3>${route.name}</h3>
                        <span class="badge badge-${route.status === 'active' ? 'success' : 'warning'}">
                            ${route.status === 'active' ? 'Activa' : 'Pendiente'}
                        </span>
                    </div>
                    
                    <p class="text-sm text-muted">${route.description || 'Sin descripción'}</p>
                    
                    <div class="route-progress">
                        <div class="progress-bar">
                            <div class="progress-fill" style="width: ${progress}%;"></div>
                        </div>
                        <div class="progress-text">
                            <span>${completed}/${routeDeliveries.length}</span>
                            <span>${progress}%</span>
                        </div>
                    </div>
                    
                    <div class="route-deliveries-preview mt-3">
                        ${routeDeliveries.slice(0, 3).map(delivery => `
                            <div class="delivery-preview-item">
                                <i class="fas fa-${delivery.status === 'completed' ? 'check-circle text-success' : 
                                                    delivery.status === 'in_progress' ? 'truck text-primary' : 
                                                    'clock text-warning'}"></i>
                                <span>${delivery.client || 'Cliente'}</span>
                            </div>
                        `).join('')}
                        
                        ${routeDeliveries.length > 3 ? `
                            <div class="text-center mt-2">
                                <small class="text-muted">+${routeDeliveries.length - 3} más</small>
                            </div>
                        ` : ''}
                        
                        ${routeDeliveries.length === 0 ? `
                            <div class="text-center py-2">
                                <small class="text-muted">No hay entregas en esta ruta</small>
                            </div>
                        ` : ''}
                    </div>
                    
                    <div class="route-actions mt-3">
                        <button class="btn btn-sm btn-block btn-primary" onclick="viewRouteDeliveries('${route.name}')">
                            <i class="fas fa-eye"></i> Ver Entregas
                        </button>
                    </div>
                </div>
            `;
        });
        
        driverRoutesElement.innerHTML = html;
    },
    
    // Cargar entregas del repartidor
    loadDriverDeliveries(driverDeliveries) {
        const driverDeliveriesElement = document.getElementById('driverDeliveries');
        if (!driverDeliveriesElement) return;
        
        if (driverDeliveries.length === 0) {
            driverDeliveriesElement.innerHTML = `
                <div class="empty-state">
                    <i class="fas fa-package fa-3x text-muted mb-3"></i>
                    <h3>No tienes entregas</h3>
                    <p class="text-muted">Espera a que el administrador te asigne rutas con entregas</p>
                </div>
            `;
            return;
        }
        
        // Ordenar por estado: pendientes primero
        const sortedDeliveries = [...driverDeliveries].sort((a, b) => {
            const statusOrder = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
            return statusOrder[a.status] - statusOrder[b.status];
        });
        
        let html = '';
        sortedDeliveries.forEach(delivery => {
            let statusIcon = '⏳';
            let statusClass = 'warning';
            let statusText = 'Pendiente';
            
            switch(delivery.status) {
                case 'in_progress':
                    statusIcon = '🚚';
                    statusClass = 'primary';
                    statusText = 'En camino';
                    break;
                case 'completed':
                    statusIcon = '✅';
                    statusClass = 'success';
                    statusText = 'Completada';
                    break;
            }
            
            html += `
                <div class="driver-delivery-card">
                    <div class="delivery-location">
                        <div class="location-icon">
                            <i class="fas fa-map-marker-alt"></i>
                        </div>
                        <div class="location-info">
                            <h4>${delivery.client || 'Cliente'}</h4>
                            <p>${delivery.address || ''}</p>
                            <small class="text-muted">${delivery.phone || 'Sin teléfono'}</small>
                        </div>
                    </div>
                    
                    <div class="delivery-details">
                        <div class="detail-item">
                            <i class="fas fa-route"></i>
                            <span>${delivery.route || 'Sin ruta'}</span>
                        </div>
                        <div class="detail-item">
                            <i class="fas fa-clock"></i>
                            <span>${new Date(delivery.created_at).toLocaleTimeString('es-ES', { 
                                hour: '2-digit', 
                                minute: '2-digit' 
                            })}</span>
                        </div>
                        <div class="detail-item">
                            <span class="badge badge-${statusClass}">
                                ${statusIcon} ${statusText}
                            </span>
                        </div>
                    </div>
                    
                    ${delivery.order_details ? `
                        <div class="order-preview-sm mt-2" onclick="openOrderModal('${delivery.id}')">
                            <i class="fas fa-list"></i>
                            <span>${delivery.order_details.substring(0, 50)}${delivery.order_details.length > 50 ? '...' : ''}</span>
                        </div>
                    ` : ''}
                    
                    <div class="delivery-actions-row">
                        <a href="https://maps.google.com/?q=${encodeURIComponent(delivery.address || '')}" 
                           target="_blank" class="btn btn-sm btn-primary">
                            <i class="fas fa-map-marked-alt"></i> Mapa
                        </a>
                        <button class="btn btn-sm btn-info" onclick="openOrderModal('${delivery.id}')">
                            <i class="fas fa-list-alt"></i> Comanda
                        </button>
                        ${delivery.status !== 'completed' ? `
                            <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')">
                                <i class="fas fa-check"></i> Completar
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
        });
        
        driverDeliveriesElement.innerHTML = html;
    },
    
    // Abrir modal de repartidor
    openDriverModal(driverId = null) {
        this.editingDriverId = driverId;
        const modal = document.getElementById('driverModal');
        const title = document.getElementById('driverModalTitle');
        
        if (driverId) {
            title.textContent = 'Editar Repartidor';
            
            // Cargar datos del repartidor
            const driver = DataManager.cache.drivers.find(d => d.id === driverId);
            if (driver) {
                this.populateDriverForm(driver);
            }
        } else {
            title.textContent = 'Nuevo Repartidor';
            this.clearDriverForm();
        }
        
        // Mostrar modal
        modal.classList.add('active');
    },
    
    // Cerrar modal de repartidor
    closeDriverModal() {
        this.editingDriverId = null;
        const modal = document.getElementById('driverModal');
        modal.classList.remove('active');
    },
    
    // Limpiar formulario
    clearDriverForm() {
        document.getElementById('driverName').value = '';
        document.getElementById('driverEmail').value = '';
        document.getElementById('driverPhone').value = '';
        document.getElementById('driverVehicle').value = AppConfig.VEHICLE_TYPES[0];
        document.getElementById('driverLicense').value = '';
        document.getElementById('driverUsername').value = '';
    },
    
    // Rellenar formulario
    populateDriverForm(driver) {
        document.getElementById('driverName').value = driver.name || '';
        document.getElementById('driverEmail').value = driver.email || '';
        document.getElementById('driverPhone').value = driver.phone || '';
        document.getElementById('driverVehicle').value = driver.vehicle || AppConfig.VEHICLE_TYPES[0];
        document.getElementById('driverLicense').value = driver.license || '';
        document.getElementById('driverUsername').value = driver.username || '';
    },
    
    // Guardar repartidor
    async saveDriver() {
        const name = document.getElementById('driverName').value.trim();
        const email = document.getElementById('driverEmail').value.trim();
        const phone = document.getElementById('driverPhone').value.trim();
        const vehicle = document.getElementById('driverVehicle').value;
        const license = document.getElementById('driverLicense').value.trim();
        const username = document.getElementById('driverUsername').value.trim() || 
                         name.toLowerCase().replace(/\s+/g, '');
        
        if (!name) {
            showToast('Por favor, ingresa el nombre del repartidor', 'warning');
            return;
        }
        
        const driverData = {
            name,
            email,
            phone,
            vehicle,
            license,
            username,
            status: 'active'
        };
        
        try {
            let result;
            
            if (this.editingDriverId) {
                result = await DataManager.updateDriver(this.editingDriverId, driverData);
            } else {
                result = await DataManager.createDriver(driverData);
            }
            
            if (result.success) {
                showToast(`Repartidor ${this.editingDriverId ? 'actualizado' : 'creado'} correctamente`, 'success');
                this.closeDriverModal();
                await this.loadDrivers();
                
                // Actualizar select de login si estamos en la página de login
                if (window.AuthManager) {
                    AuthManager.loadDriversForLogin();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error guardando repartidor:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Editar repartidor
    editDriver(driverId) {
        this.openDriverModal(driverId);
    },
    
    // Eliminar repartidor
    async deleteDriver(driverId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este repartidor?')) {
            return;
        }
        
        try {
            const result = await DataManager.deleteDriver(driverId);
            
            if (result.success) {
                showToast('Repartidor eliminado correctamente', 'success');
                await this.loadDrivers();
                
                // Actualizar select de login
                if (window.AuthManager) {
                    AuthManager.loadDriversForLogin();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error eliminando repartidor:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Cambiar estado del repartidor
    async toggleDriverStatus(driverId) {
        const driver = DataManager.cache.drivers.find(d => d.id === driverId);
        if (!driver) return;
        
        const newStatus = driver.status === 'active' ? 'inactive' : 'active';
        
        try {
            const result = await DataManager.updateDriver(driverId, { status: newStatus });
            
            if (result.success) {
                showToast(`Repartidor ${newStatus === 'active' ? 'activado' : 'pausado'}`, 'success');
                await this.loadDrivers();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error cambiando estado del repartidor:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Filtrar entregas del repartidor
    filterDriverDeliveries(filter) {
        if (AuthManager.userRole !== 'driver' || !AuthManager.currentUser) return;
        
        const driver = AuthManager.currentUser;
        const routes = DataManager.cache.routes;
        const deliveries = DataManager.cache.deliveries;
        
        // Obtener rutas del repartidor
        const driverRoutes = routes.filter(route => route.driver === driver.name);
        const routeNames = driverRoutes.map(route => route.name);
        
        // Obtener entregas de estas rutas
        let driverDeliveries = deliveries.filter(d => routeNames.includes(d.route));
        
        // Aplicar filtro
        if (filter !== 'all') {
            driverDeliveries = driverDeliveries.filter(d => d.status === filter);
        }
        
        // Actualizar vista
        this.loadDriverDeliveries(driverDeliveries);
    }
};

// Funciones globales
window.openDriverModal = function(driverId = null) {
    DriverManager.openDriverModal(driverId);
};

window.closeDriverModal = function() {
    DriverManager.closeDriverModal();
};

window.saveDriver = function() {
    DriverManager.saveDriver();
};

window.editDriver = function(driverId) {
    DriverManager.editDriver(driverId);
};

window.deleteDriver = function(driverId) {
    DriverManager.deleteDriver(driverId);
};

window.toggleDriverStatus = function(driverId) {
    DriverManager.toggleDriverStatus(driverId);
};

window.filterDriverDeliveries = function(filter) {
    DriverManager.filterDriverDeliveries(filter);
};

// Ver entregas de una ruta (para repartidor)
window.viewRouteDeliveries = function(routeName) {
    const deliveries = DataManager.cache.deliveries.filter(d => d.route === routeName);
    
    if (deliveries.length === 0) {
        showToast('No hay entregas en esta ruta', 'info');
        return;
    }
    
    // Mostrar en modal o cambiar a sección de entregas
    showDriverSection('deliveries');
    DriverManager.filterDriverDeliveries('all');
};

// Refrescar datos del repartidor
window.refreshDriverData = function() {
    if (AuthManager.userRole === 'driver') {
        DriverManager.loadDriverData();
        showToast('Datos actualizados', 'success');
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    DriverManager.init();
});

// Exportar para uso global
window.DriverManager = DriverManager;
