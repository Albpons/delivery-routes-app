// deliveries-supabase.js - Gestión de entregas con Supabase - ACTUALIZADO
const DeliveryManagerSupabase = {
    editingDeliveryId: null,

    // Abrir modal
    openDeliveryModal: function(deliveryId = null) {
        this.editingDeliveryId = deliveryId;
        const modal = document.getElementById('deliveryModal');
        const title = document.getElementById('deliveryModalTitle');
        
        if (deliveryId) {
            title.textContent = 'Editar Entrega';
            
            // Cargar datos de la entrega
            DataManagerSupabase.getDeliveriesFromSupabase().then(deliveries => {
                const delivery = deliveries.find(d => d.id === deliveryId);
                if (delivery) {
                    document.getElementById('deliveryClient').value = delivery.client || '';
                    document.getElementById('deliveryAddress').value = delivery.address || '';
                    document.getElementById('deliveryPhone').value = delivery.phone || '';
                    document.getElementById('deliveryRoute').value = delivery.route || '';
                    
                    // Usar order_details si existe, sino usar order
                    const orderText = delivery.order_details || delivery.order || '';
                    document.getElementById('deliveryOrder').value = orderText;
                    
                    document.getElementById('deliveryObservations').value = delivery.observations || '';
                    document.getElementById('deliveryStatus').value = delivery.status || 'pending';
                }
            });
        } else {
            title.textContent = 'Nueva Entrega';
            document.getElementById('deliveryClient').value = '';
            document.getElementById('deliveryAddress').value = '';
            document.getElementById('deliveryPhone').value = '';
            document.getElementById('deliveryRoute').value = '';
            document.getElementById('deliveryOrder').value = '';
            document.getElementById('deliveryObservations').value = '';
            document.getElementById('deliveryStatus').value = 'pending';
        }
        
        // Cargar rutas en el select
        UIManager.loadRoutesToSelect('deliveryRoute');
        
        modal.classList.add('active');
    },

    // Cerrar modal
    closeDeliveryModal: function() {
        this.editingDeliveryId = null;
        document.getElementById('deliveryModal').classList.remove('active');
    },

    // Guardar entrega
    async saveDelivery() {
        const client = document.getElementById('deliveryClient').value;
        const address = document.getElementById('deliveryAddress').value;
        const phone = document.getElementById('deliveryPhone').value;
        const route = document.getElementById('deliveryRoute').value;
        const order = document.getElementById('deliveryOrder').value;
        const observations = document.getElementById('deliveryObservations').value;
        const status = document.getElementById('deliveryStatus').value;
        
        if (!client || !address) {
            alert('Por favor, completa los campos obligatorios');
            return;
        }
        
        const deliveryData = {
            client,
            address,
            phone,
            route: route || null,
            order_details: order,  // Usar order_details para consistencia con Supabase
            order: order,  // Mantener también order para compatibilidad
            observations,
            status: status || 'pending'
        };
        
        try {
            let result;
            
            if (this.editingDeliveryId) {
                deliveryData.id = this.editingDeliveryId;
                result = await DataManagerSupabase.updateDelivery(deliveryData);
            } else {
                result = await DataManagerSupabase.createDelivery(deliveryData);
            }
            
            if (result.success) {
                UIManager.showNotification('✅ Entrega guardada correctamente', 'success');
                this.closeDeliveryModal();
                await this.loadDeliveries();
                
                // Actualizar dashboard y rutas relacionadas
                if (window.UIManager) {
                    UIManager.loadDashboard();
                }
                
                if (route && window.RouteManagerSupabase) {
                    setTimeout(() => {
                        RouteManagerSupabase.loadRoutes();
                    }, 300);
                }
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error guardando entrega:', error);
            UIManager.showNotification('❌ Error guardando entrega', 'danger');
        }
    },

    // Cargar entregas
    async loadDeliveries() {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const deliveriesTable = document.getElementById('deliveriesTable');
            
            if (!deliveriesTable) return;
            
            deliveriesTable.innerHTML = '';
            
            if (deliveries.length === 0) {
                deliveriesTable.innerHTML = `
                    <tr>
                        <td colspan="7" class="text-center" style="padding: 40px;">
                            <i class="fas fa-box-open fa-3x mb-20" style="color: var(--light-gray);"></i>
                            <h3>No hay entregas creadas</h3>
                            <p>Crea tu primera entrega para comenzar</p>
                        </td>
                    </tr>
                `;
                return;
            }
            
            // Ordenar por estado: pendientes primero
            const sortedDeliveries = [...deliveries].sort((a, b) => {
                const statusOrder = { 'pending': 1, 'in_progress': 2, 'completed': 3 };
                return statusOrder[a.status] - statusOrder[b.status];
            });
            
            sortedDeliveries.forEach(delivery => {
                let statusBadge = '';
                switch(delivery.status) {
                    case 'pending':
                        statusBadge = '<span class="route-status status-pending">⏳ Pendiente</span>';
                        break;
                    case 'in_progress':
                        statusBadge = '<span class="route-status status-in_progress">🚀 En camino</span>';
                        break;
                    case 'completed':
                        statusBadge = '<span class="route-status status-completed">✅ Completada</span>';
                        break;
                }
                
                // Formatear comanda para vista previa
                const orderText = delivery.order_details || delivery.order || '';
                const comandaPreview = UIManager.createComandaPreview(
                    UIManager.formatComandaForDisplay(orderText),
                    delivery.id
                );
                
                const row = document.createElement('tr');
                row.innerHTML = `
                    <td>
                        <div class="delivery-client">
                            <div class="client-avatar">${delivery.client?.charAt(0) || 'C'}</div>
                            <div>
                                <div>${delivery.client || 'Cliente'}</div>
                                <small>${delivery.phone || 'Sin teléfono'}</small>
                            </div>
                        </div>
                    </td>
                    <td>${delivery.address || ''}</td>
                    <td>${delivery.phone || ''}</td>
                    <td>${delivery.route || 'Sin ruta'}</td>
                    <td class="table-comanda-cell">
                        ${comandaPreview}
                    </td>
                    <td>${statusBadge}</td>
                    <td>
                        <div class="actions-cell">
                            <button class="btn btn-sm btn-secondary" onclick="editDelivery('${delivery.id}')">
                                <i class="fas fa-edit"></i>
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteDelivery('${delivery.id}')">
                                <i class="fas fa-trash"></i>
                            </button>
                            ${delivery.status !== 'completed' ? `
                                <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')">
                                    <i class="fas fa-check"></i>
                                </button>
                            ` : ''}
                        </div>
                    </td>
                `;
                deliveriesTable.appendChild(row);
            });
            
            // Inicializar funcionalidad de expansión de comandas
            UIManager.initializeComandaExpand();
            
        } catch (error) {
            console.error('Error cargando entregas:', error);
            UIManager.showNotification('❌ Error cargando entregas', 'danger');
        }
    },

    // Editar entrega
    editDelivery: function(deliveryId) {
        this.openDeliveryModal(deliveryId);
    },

    // Eliminar entrega
    async deleteDelivery(deliveryId) {
        if (!confirm('¿Estás seguro de que quieres eliminar esta entrega?')) return;
        
        try {
            const result = await DataManagerSupabase.deleteDelivery(deliveryId);
            
            if (result.success) {
                UIManager.showNotification('✅ Entrega eliminada', 'success');
                await this.loadDeliveries();
                
                if (window.UIManager) {
                    UIManager.loadDashboard();
                }
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error eliminando entrega:', error);
            UIManager.showNotification('❌ Error eliminando entrega', 'danger');
        }
    },

    // Marcar como completada
    async markDeliveryCompleted(deliveryId) {
        try {
            // Obtener entrega actual
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const delivery = deliveries.find(d => d.id === deliveryId);
            
            if (!delivery) return;
            
            // Actualizar estado
            const updatedDelivery = {
                ...delivery,
                status: 'completed'
            };
            
            const result = await DataManagerSupabase.updateDelivery(updatedDelivery);
            
            if (result.success) {
                UIManager.showNotification('✅ Entrega completada', 'success');
                await this.loadDeliveries();
                
                if (window.UIManager) {
                    UIManager.loadDashboard();
                }
                
                // Si es repartidor, recargar sus vistas
                if (AuthManagerSupabase.currentUser?.role === 'driver') {
                    UIManager.loadDriverRoutes();
                    UIManager.loadDriverDeliveries();
                }
            }
            
        } catch (error) {
            console.error('Error completando entrega:', error);
            UIManager.showNotification('❌ Error completando entrega', 'danger');
        }
    },

    // Función auxiliar para obtener entrega por ID
    async getDeliveryById(deliveryId) {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            return deliveries.find(d => d.id == deliveryId);
        } catch (error) {
            console.error('Error obteniendo entrega:', error);
            return null;
        }
    }
};

// Exportar funciones globales
window.DeliveryManagerSupabase = DeliveryManagerSupabase;
window.openDeliveryModal = function(deliveryId = null) { 
    DeliveryManagerSupabase.openDeliveryModal(deliveryId); 
};
window.closeDeliveryModal = function() { 
    DeliveryManagerSupabase.closeDeliveryModal(); 
};
window.saveDelivery = function() { 
    DeliveryManagerSupabase.saveDelivery(); 
};
window.editDelivery = function(deliveryId) { 
    DeliveryManagerSupabase.editDelivery(deliveryId); 
};
window.deleteDelivery = function(deliveryId) { 
    DeliveryManagerSupabase.deleteDelivery(deliveryId); 
};
window.markDeliveryCompleted = function(deliveryId) { 
    DeliveryManagerSupabase.markDeliveryCompleted(deliveryId); 
};
