// drivers-supabase.js - Gestión de repartidores con Supabase - ACTUALIZADO
const DriverManagerSupabase = {
    editingDriverId: null,

    // Abrir modal
    openDriverModal: function(driverId = null) {
        this.editingDriverId = driverId;
        const modal = document.getElementById('driverModal');
        const title = document.getElementById('driverModalTitle');
        
        if (driverId) {
            title.textContent = 'Editar Repartidor';
            
            // Cargar datos del repartidor
            DataManagerSupabase.getDriversFromSupabase().then(drivers => {
                const driver = drivers.find(d => d.id === driverId);
                if (driver) {
                    document.getElementById('driverName').value = driver.name || '';
                    document.getElementById('driverEmail').value = driver.email || '';
                    document.getElementById('driverPhone').value = driver.phone || '';
                    document.getElementById('driverVehicle').value = driver.vehicle || 'Motocicleta';
                    document.getElementById('driverLicense').value = driver.license || '';
                }
            });
        } else {
            title.textContent = 'Nuevo Repartidor';
            document.getElementById('driverName').value = '';
            document.getElementById('driverEmail').value = '';
            document.getElementById('driverPhone').value = '';
            document.getElementById('driverVehicle').value = 'Motocicleta';
            document.getElementById('driverLicense').value = '';
        }
        
        modal.classList.add('active');
    },

    // Cerrar modal
    closeDriverModal: function() {
        this.editingDriverId = null;
        document.getElementById('driverModal').classList.remove('active');
    },

    // Guardar repartidor
    async saveDriver() {
        const name = document.getElementById('driverName').value;
        const email = document.getElementById('driverEmail').value;
        const phone = document.getElementById('driverPhone').value;
        const vehicle = document.getElementById('driverVehicle').value;
        const license = document.getElementById('driverLicense').value;
        
        if (!name || !email) {
            alert('Por favor, completa los campos obligatorios');
            return;
        }
        
        // Generar username automáticamente
        const username = name.toLowerCase()
            .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // Eliminar acentos
            .replace(/\s+/g, '') // Eliminar espacios
            .substring(0, 20);
        
        const driverData = {
            name,
            username,
            email,
            phone: phone || '',
            vehicle: vehicle || 'Motocicleta',
            license: license || '',
            deliveries: 0,
            status: 'active'
        };
        
        try {
            let result;
            
            if (this.editingDriverId) {
                driverData.id = this.editingDriverId;
                result = await DataManagerSupabase.updateDriver(driverData);
            } else {
                result = await DataManagerSupabase.createDriver(driverData);
            }
            
            if (result.success) {
                UIManager.showNotification('✅ Repartidor guardado correctamente', 'success');
                this.closeDriverModal();
                await this.loadDrivers();
                
                // Actualizar dashboard
                if (window.UIManager) {
                    UIManager.loadDashboard();
                }
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error guardando repartidor:', error);
            UIManager.showNotification('❌ Error guardando repartidor', 'danger');
        }
    },

    // Cargar repartidores
    async loadDrivers() {
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            const driversGrid = document.getElementById('driversGrid');
            
            if (!driversGrid) {
                console.warn('Elemento driversGrid no encontrado');
                return;
            }
            
            driversGrid.innerHTML = '';
            
            if (drivers.length === 0) {
                driversGrid.innerHTML = `
                    <div class="text-center" style="grid-column: 1 / -1; padding: 40px;">
                        <i class="fas fa-users fa-3x mb-20" style="color: var(--light-gray);"></i>
                        <h3>No hay repartidores</h3>
                        <p>Añade tu primer repartidor</p>
                        <button class="btn btn-primary mt-20" onclick="openDriverModal()">
                            <i class="fas fa-plus"></i> Nuevo Repartidor
                        </button>
                    </div>
                `;
                return;
            }
            
            drivers.forEach(driver => {
                const driverCard = document.createElement('div');
                driverCard.className = 'card';
                driverCard.innerHTML = `
                    <div style="display: flex; align-items: center; margin-bottom: 15px;">
                        <div class="avatar" style="width: 50px; height: 50px; font-size: 20px; margin-right: 15px; background-color: var(--primary); color: white;">
                            ${driver.name?.charAt(0) || 'R'}
                        </div>
                        <div>
                            <h3>${driver.name || 'Sin nombre'}</h3>
                            <p><i class="fas fa-${driver.vehicle === 'Motocicleta' ? 'motorcycle' : 
                                                driver.vehicle === 'Coche' ? 'car' : 
                                                driver.vehicle === 'Furgoneta' ? 'truck' : 
                                                'bicycle'}"></i> ${driver.vehicle || 'Sin vehículo'}</p>
                        </div>
                    </div>
                    <div style="margin-bottom: 15px;">
                        <p><i class="fas fa-envelope"></i> ${driver.email || 'Sin email'}</p>
                        <p><i class="fas fa-phone"></i> ${driver.phone || 'Sin teléfono'}</p>
                        <p><i class="fas fa-id-card"></i> ${driver.license || 'Sin licencia'}</p>
                        <p><i class="fas fa-user"></i> Usuario: <strong>${driver.username}</strong></p>
                        <p><span class="route-status ${driver.status === 'active' ? 'status-active' : 'status-pending'}">
                            ${driver.status === 'active' ? 'Activo' : 'Inactivo'}
                        </span></p>
                    </div>
                    <div style="display: flex; justify-content: space-between;">
                        <button class="btn btn-sm btn-secondary" onclick="editDriver('${driver.id}')">
                            <i class="fas fa-edit"></i> Editar
                        </button>
                        <button class="btn btn-sm btn-danger" onclick="deleteDriver('${driver.id}')">
                            <i class="fas fa-trash"></i> Eliminar
                        </button>
                    </div>
                `;
                driversGrid.appendChild(driverCard);
            });
            
        } catch (error) {
            console.error('Error cargando repartidores:', error);
            
            // Fallback a datos locales
            const localDrivers = JSON.parse(localStorage.getItem('delivery_drivers') || '[]');
            if (localDrivers.length > 0) {
                console.log('📁 Usando datos locales para repartidores');
                // Podrías añadir lógica para renderizar desde localStorage
            }
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error cargando repartidores', 'danger');
            }
        }
    },

    // Editar repartidor
    editDriver: function(driverId) {
        this.openDriverModal(driverId);
    },

    // Eliminar repartidor
    async deleteDriver(driverId) {
        if (!confirm('¿Estás seguro de que quieres eliminar este repartidor?\n\nLas rutas asignadas a este repartidor quedarán sin asignar.')) return;
        
        try {
            const result = await DataManagerSupabase.deleteDriver(driverId);
            
            if (result.success) {
                UIManager.showNotification('✅ Repartidor eliminado', 'success');
                await this.loadDrivers();
                
                // Actualizar dashboard
                if (window.UIManager) {
                    UIManager.loadDashboard();
                }
                
                // Actualizar rutas que tenían este repartidor asignado
                if (window.RouteManagerSupabase) {
                    setTimeout(() => {
                        RouteManagerSupabase.loadRoutes();
                    }, 300);
                }
            } else {
                throw new Error(result.error);
            }
            
        } catch (error) {
            console.error('Error eliminando repartidor:', error);
            UIManager.showNotification('❌ Error eliminando repartidor', 'danger');
        }
    },

    // Obtener repartidores activos
    async getActiveDrivers() {
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            return drivers.filter(driver => driver.status === 'active');
        } catch (error) {
            console.error('Error obteniendo repartidores activos:', error);
            return [];
        }
    },

    // Buscar repartidor por nombre
    async getDriverByName(driverName) {
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            return drivers.find(driver => driver.name === driverName);
        } catch (error) {
            console.error('Error buscando repartidor:', error);
            return null;
        }
    }
};

// Exportar funciones globales
window.DriverManagerSupabase = DriverManagerSupabase;
window.openDriverModal = function(driverId = null) { 
    DriverManagerSupabase.openDriverModal(driverId); 
};
window.closeDriverModal = function() { 
    DriverManagerSupabase.closeDriverModal(); 
};
window.saveDriver = function() { 
    DriverManagerSupabase.saveDriver(); 
};
window.editDriver = function(driverId) { 
    DriverManagerSupabase.editDriver(driverId); 
};
window.deleteDriver = function(driverId) { 
    DriverManagerSupabase.deleteDriver(driverId); 
};
