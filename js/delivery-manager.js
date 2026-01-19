// Gestión de entregas
const DeliveryManager = {
    editingDeliveryId: null,
    
    // Inicializar
    init() {
        this.setupEventListeners();
        this.loadDeliveries();
    },
    
    // Configurar event listeners
    setupEventListeners() {
        document.addEventListener('dataChanged', () => {
            this.loadDeliveries();
        });
    },
    
    // Cargar entregas
    async loadDeliveries(filter = 'all') {
        try {
            const deliveriesContainer = document.getElementById('deliveriesContainer');
            const pendingDeliveriesElement = document.getElementById('pendingDeliveries');
            
            if (!deliveriesContainer && !pendingDeliveriesElement) return;
            
            let deliveries = DataManager.cache.deliveries;
            
            // Aplicar filtro si es necesario
            if (filter !== 'all') {
                deliveries = deliveries.filter(d => d.status === filter);
            }
            
            // Ordenar por fecha de creación (más recientes primero)
            deliveries.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
            
            // Renderizar en dashboard (solo pendientes)
            if (pendingDeliveriesElement) {
                const pendingDeliveries = deliveries.filter(d => d.status === 'pending').slice(0, 5);
                
                if (pendingDeliveries.length === 0) {
                    pendingDeliveriesElement.innerHTML = `
                        <div class="text-center py-4">
                            <i class="fas fa-check-circle fa-2x text-muted mb-2"></i>
                            <p class="text-muted">No hay entregas pendientes</p>
                        </div>
                    `;
                } else {
                    let html = '';
                    pendingDeliveries.forEach(delivery => {
                        html += `
                            <div class="delivery-item">
                                <div class="delivery-client">
                                    <div class="client-avatar">
                                        ${delivery.client ? delivery.client.charAt(0) : 'C'}
                                    </div>
                                    <div class="delivery-info">
                                        <strong>${delivery.client || 'Cliente'}</strong>
                                        <small class="text-truncate">${delivery.address || ''}</small>
                                        <div class="text-xs text-muted">${delivery.route || 'Sin ruta'}</div>
                                    </div>
                                </div>
                                <div class="delivery-actions">
                                    <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')">
                                        <i class="fas fa-check"></i>
                                    </button>
                                </div>
                            </div>
                        `;
                    });
                    
                    pendingDeliveriesElement.innerHTML = html;
                }
            }
            
            // Renderizar en página de entregas
            if (deliveriesContainer) {
                if (deliveries.length === 0) {
                    deliveriesContainer.innerHTML = `
                        <div class="empty-state">
                            <i class="fas fa-package fa-3x text-muted mb-3"></i>
                            <h3>No hay entregas</h3>
                            <p class="text-muted mb-4">${filter === 'all' ? 'Crea tu primera entrega o carga un archivo CSV' : 'No hay entregas con este estado'}</p>
                            ${filter === 'all' ? `
                                <div class="d-flex gap-2 justify-content-center">
                                    <button class="btn btn-primary" onclick="openDeliveryModal()">
                                        <i class="fas fa-plus"></i> Nueva Entrega
                                    </button>
                                    <button class="btn btn-secondary" onclick="openCSVUpload()">
                                        <i class="fas fa-file-import"></i> Cargar CSV
                                    </button>
                                </div>
                            ` : ''}
                        </div>
                    `;
                    return;
                }
                
                let html = '';
                deliveries.forEach(delivery => {
                    let statusClass = 'pending';
                    let statusText = 'Pendiente';
                    let statusIcon = '⏳';
                    
                    switch(delivery.status) {
                        case 'in_progress':
                            statusClass = 'in-progress';
                            statusText = 'En camino';
                            statusIcon = '🚚';
                            break;
                        case 'completed':
                            statusClass = 'completed';
                            statusText = 'Completada';
                            statusIcon = '✅';
                            break;
                    }
                    
                    // Formatear comanda para vista previa
                    const orderPreview = delivery.order_details ? 
                        this.formatOrderPreview(delivery.order_details) : 'Sin comanda';
                    
                    html += `
                        <div class="delivery-card ${statusClass}">
                            <div class="delivery-card-header">
                                <h3>${delivery.client || 'Cliente'}</h3>
                                <span class="badge badge-${delivery.status === 'completed' ? 'success' : 
                                                              delivery.status === 'in_progress' ? 'primary' : 
                                                              'warning'}">
                                    ${statusIcon} ${statusText}
                                </span>
                            </div>
                            
                            <div class="delivery-card-body">
                                <div class="delivery-info-item">
                                    <i class="fas fa-map-marker-alt"></i>
                                    <span>${delivery.address || 'Sin dirección'}</span>
                                </div>
                                
                                <div class="delivery-info-item">
                                    <i class="fas fa-phone"></i>
                                    <span>${delivery.phone || 'Sin teléfono'}</span>
                                </div>
                                
                                <div class="delivery-info-item">
                                    <i class="fas fa-route"></i>
                                    <span>${delivery.route || 'Sin ruta'}</span>
                                </div>
                                
                                <div class="delivery-info-item">
                                    <i class="fas fa-clock"></i>
                                    <span>${this.formatDate(delivery.created_at)}</span>
                                </div>
                            </div>
                            
                            <div class="order-preview" onclick="toggleOrderPreview(this)">
                                <div class="order-text">
                                    ${orderPreview}
                                </div>
                                ${delivery.order_details && delivery.order_details.length > 100 ? 
                                    '<button class="order-toggle">Ver más</button>' : ''}
                            </div>
                            
                            ${delivery.observations ? `
                                <div class="observations mt-2">
                                    <small class="text-muted"><strong>Observaciones:</strong> ${delivery.observations}</small>
                                </div>
                            ` : ''}
                            
                            <div class="delivery-card-footer">
                                <div class="btn-group">
                                    <button class="btn btn-sm btn-secondary" onclick="editDelivery('${delivery.id}')">
                                        <i class="fas fa-edit"></i>
                                    </button>
                                    <button class="btn btn-sm btn-primary" onclick="openOrderModal('${delivery.id}')">
                                        <i class="fas fa-list-alt"></i>
                                    </button>
                                    <a href="https://maps.google.com/?q=${encodeURIComponent(delivery.address || '')}" 
                                       target="_blank" class="btn btn-sm btn-info">
                                        <i class="fas fa-map-marked-alt"></i>
                                    </a>
                                    ${delivery.status !== 'completed' ? `
                                        <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')">
                                            <i class="fas fa-check"></i>
                                        </button>
                                    ` : ''}
                                    <button class="btn btn-sm btn-danger" onclick="deleteDelivery('${delivery.id}')">
                                        <i class="fas fa-trash"></i>
                                    </button>
                                </div>
                            </div>
                        </div>
                    `;
                });
                
                deliveriesContainer.innerHTML = html;
            }
        } catch (error) {
            console.error('Error cargando entregas:', error);
            showToast('Error cargando entregas', 'error');
        }
    },
    
    // Formatear vista previa de comanda
    formatOrderPreview(orderText) {
        if (!orderText) return 'Sin comanda';
        
        // Limitar a 100 caracteres
        if (orderText.length > 100) {
            return orderText.substring(0, 100) + '...';
        }
        
        return orderText;
    },
    
    // Formatear fecha
    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('es-ES', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
    },
    
    // Abrir modal de entrega
    openDeliveryModal(deliveryId = null) {
        this.editingDeliveryId = deliveryId;
        const modal = document.getElementById('deliveryModal');
        const title = document.getElementById('deliveryModalTitle');
        
        if (deliveryId) {
            title.textContent = 'Editar Entrega';
            
            // Cargar datos de la entrega
            const delivery = DataManager.cache.deliveries.find(d => d.id === deliveryId);
            if (delivery) {
                this.populateDeliveryForm(delivery);
            }
        } else {
            title.textContent = 'Nueva Entrega';
            this.clearDeliveryForm();
        }
        
        // Cargar rutas en el select
        this.loadRoutesToSelect();
        
        // Mostrar modal
        modal.classList.add('active');
    },
    
    // Cerrar modal de entrega
    closeDeliveryModal() {
        this.editingDeliveryId = null;
        const modal = document.getElementById('deliveryModal');
        modal.classList.remove('active');
    },
    
    // Limpiar formulario
    clearDeliveryForm() {
        document.getElementById('deliveryClient').value = '';
        document.getElementById('deliveryAddress').value = '';
        document.getElementById('deliveryPhone').value = '';
        document.getElementById('deliveryRoute').value = '';
        document.getElementById('deliveryOrder').value = '';
        document.getElementById('deliveryObservations').value = '';
        document.getElementById('deliveryStatus').value = 'pending';
    },
    
    // Rellenar formulario
    populateDeliveryForm(delivery) {
        document.getElementById('deliveryClient').value = delivery.client || '';
        document.getElementById('deliveryAddress').value = delivery.address || '';
        document.getElementById('deliveryPhone').value = delivery.phone || '';
        document.getElementById('deliveryRoute').value = delivery.route || '';
        document.getElementById('deliveryOrder').value = delivery.order_details || '';
        document.getElementById('deliveryObservations').value = delivery.observations || '';
        document.getElementById('deliveryStatus').value = delivery.status || 'pending';
    },
    
    // Cargar rutas en select
    loadRoutesToSelect() {
        const select = document.getElementById('deliveryRoute');
        if (!select) return;
        
        const routes = DataManager.cache.routes;
        
        select.innerHTML = '<option value="">Sin ruta</option>';
        
        // Agrupar por estado
        const activeRoutes = routes.filter(r => r.status === 'active');
        const pendingRoutes = routes.filter(r => r.status === 'pending');
        const completedRoutes = routes.filter(r => r.status === 'completed');
        
        if (activeRoutes.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Rutas Activas';
            activeRoutes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.name;
                option.textContent = `${route.name} - ${route.driver || 'Sin repartidor'}`;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
        
        if (pendingRoutes.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Rutas Pendientes';
            pendingRoutes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.name;
                option.textContent = `${route.name} - ${route.driver || 'Sin repartidor'}`;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
        
        if (completedRoutes.length > 0) {
            const optgroup = document.createElement('optgroup');
            optgroup.label = 'Rutas Completadas';
            completedRoutes.forEach(route => {
                const option = document.createElement('option');
                option.value = route.name;
                option.textContent = `${route.name} - ${route.driver || 'Sin repartidor'}`;
                optgroup.appendChild(option);
            });
            select.appendChild(optgroup);
        }
    },
    
    // Guardar entrega
    async saveDelivery() {
        const client = document.getElementById('deliveryClient').value.trim();
        const address = document.getElementById('deliveryAddress').value.trim();
        const phone = document.getElementById('deliveryPhone').value.trim();
        const route = document.getElementById('deliveryRoute').value;
        const order = document.getElementById('deliveryOrder').value.trim();
        const observations = document.getElementById('deliveryObservations').value.trim();
        const status = document.getElementById('deliveryStatus').value;
        
        if (!client || !address) {
            showToast('Por favor, completa los campos obligatorios (Cliente y Dirección)', 'warning');
            return;
        }
        
        const deliveryData = {
            client,
            address,
            phone,
            route,
            order_details: order,
            observations,
            status
        };
        
        try {
            let result;
            
            if (this.editingDeliveryId) {
                result = await DataManager.updateDelivery(this.editingDeliveryId, deliveryData);
            } else {
                result = await DataManager.createDelivery(deliveryData);
            }
            
            if (result.success) {
                showToast(`Entrega ${this.editingDeliveryId ? 'actualizada' : 'creada'} correctamente`, 'success');
                this.closeDeliveryModal();
                await this.loadDeliveries();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error guardando entrega:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Editar entrega
    editDelivery(deliveryId) {
        this.openDeliveryModal(deliveryId);
    },
    
    // Eliminar entrega
    async deleteDelivery(deliveryId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta entrega?')) {
            return;
        }
        
        try {
            const result = await DataManager.deleteDelivery(deliveryId);
            
            if (result.success) {
                showToast('Entrega eliminada correctamente', 'success');
                await this.loadDeliveries();
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Marcar entrega como completada
    async markDeliveryCompleted(deliveryId) {
        try {
            const result = await DataManager.updateDelivery(deliveryId, { status: 'completed' });
            
            if (result.success) {
                showToast('Entrega marcada como completada', 'success');
                await this.loadDeliveries();
                
                // Si es repartidor, actualizar su vista
                if (AuthManager.userRole === 'driver') {
                    window.DriverManager.loadDriverDeliveries();
                }
            } else {
                throw new Error(result.error);
            }
        } catch (error) {
            console.error('Error completando entrega:', error);
            showToast(`Error: ${error.message}`, 'error');
        }
    },
    
    // Abrir modal de comanda
    openOrderModal(deliveryId) {
        const delivery = DataManager.cache.deliveries.find(d => d.id === deliveryId);
        if (!delivery) return;
        
        const modal = document.getElementById('orderModal');
        const modalBody = modal.querySelector('.modal-body');
        
        modalBody.innerHTML = `
            <div class="order-details">
                <div class="order-header mb-3">
                    <h4>${delivery.client || 'Cliente'}</h4>
                    <p class="text-muted">${delivery.address || ''}</p>
                </div>
                
                <div class="order-info mb-3">
                    <div class="row">
                        <div class="col-6">
                            <strong>Teléfono:</strong>
                            <p>${delivery.phone || 'No especificado'}</p>
                        </div>
                        <div class="col-6">
                            <strong>Ruta:</strong>
                            <p>${delivery.route || 'No asignada'}</p>
                        </div>
                    </div>
                    
                    <div class="row">
                        <div class="col-6">
                            <strong>Estado:</strong>
                            <p>
                                <span class="badge badge-${delivery.status === 'completed' ? 'success' : 
                                                              delivery.status === 'in_progress' ? 'primary' : 
                                                              'warning'}">
                                    ${delivery.status === 'completed' ? 'Completada' : 
                                      delivery.status === 'in_progress' ? 'En camino' : 'Pendiente'}
                                </span>
                            </p>
                        </div>
                        <div class="col-6">
                            <strong>Fecha:</strong>
                            <p>${this.formatDate(delivery.created_at)}</p>
                        </div>
                    </div>
                </div>
                
                <div class="order-content mb-3">
                    <h5>Comanda</h5>
                    <div class="order-text p-3 bg-light rounded">
                        ${delivery.order_details ? delivery.order_details.replace(/\n/g, '<br>') : 'Sin comanda'}
                    </div>
                </div>
                
                ${delivery.observations ? `
                    <div class="order-observations mb-3">
                        <h5>Observaciones</h5>
                        <div class="p-3 bg-light rounded">
                            ${delivery.observations}
                        </div>
                    </div>
                ` : ''}
                
                <div class="order-actions mt-4">
                    <button class="btn btn-primary" onclick="closeModal('orderModal')">
                        <i class="fas fa-times"></i> Cerrar
                    </button>
                    ${delivery.status !== 'completed' ? `
                        <button class="btn btn-success" onclick="markDeliveryCompleted('${deliveryId}'); closeModal('orderModal')">
                            <i class="fas fa-check"></i> Marcar como Completada
                        </button>
                    ` : ''}
                </div>
            </div>
        `;
        
        modal.classList.add('active');
    },
    
    // Filtrar entregas
    filterDeliveries(filter) {
        this.loadDeliveries(filter);
    }
};

// Funciones globales
window.openDeliveryModal = function(deliveryId = null) {
    DeliveryManager.openDeliveryModal(deliveryId);
};

window.closeDeliveryModal = function() {
    DeliveryManager.closeDeliveryModal();
};

window.saveDelivery = function() {
    DeliveryManager.saveDelivery();
};

window.editDelivery = function(deliveryId) {
    DeliveryManager.editDelivery(deliveryId);
};

window.deleteDelivery = function(deliveryId) {
    DeliveryManager.deleteDelivery(deliveryId);
};

window.markDeliveryCompleted = function(deliveryId) {
    DeliveryManager.markDeliveryCompleted(deliveryId);
};

window.openOrderModal = function(deliveryId) {
    DeliveryManager.openOrderModal(deliveryId);
};

window.filterDeliveries = function(filter) {
    DeliveryManager.filterDeliveries(filter);
};

// Toggle para vista previa de comanda
window.toggleOrderPreview = function(element) {
    const isExpanded = element.classList.contains('expanded');
    const orderText = element.querySelector('.order-text');
    const toggleBtn = element.querySelector('.order-toggle');
    
    if (!isExpanded) {
        // Expandir
        const deliveryId = element.closest('.delivery-card').dataset.deliveryId;
        // En una implementación real, obtendríamos la comanda completa de los datos
        // Por ahora, simplemente mostramos más texto
        orderText.style.maxHeight = 'none';
        element.classList.add('expanded');
        if (toggleBtn) toggleBtn.textContent = 'Ver menos';
    } else {
        // Contraer
        orderText.style.maxHeight = '3rem';
        element.classList.remove('expanded');
        if (toggleBtn) toggleBtn.textContent = 'Ver más';
    }
};

// Cerrar modal genérico
window.closeModal = function(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) {
        modal.classList.remove('active');
    }
};

// Inicializar al cargar
document.addEventListener('DOMContentLoaded', function() {
    DeliveryManager.init();
});

// Exportar para uso global
window.DeliveryManager = DeliveryManager;
