// uiManager.js - Gestión de la interfaz de usuario ACTUALIZADA PARA SUPABASE
const UIManager = {
    // Mostrar sección (admin)
    showSection: function(sectionId) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('#adminApp .section');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // Mostrar la sección seleccionada
        document.getElementById(sectionId + 'Section').classList.remove('hidden');
        
        // Actualizar menú activo
        const menuItems = document.querySelectorAll('#adminApp .menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Activar el elemento del menú correspondiente
        let targetMenuItem;
        switch(sectionId) {
            case 'dashboard': targetMenuItem = menuItems[0]; break;
            case 'routes': targetMenuItem = menuItems[1]; break;
            case 'deliveries': targetMenuItem = menuItems[2]; break;
            case 'drivers': targetMenuItem = menuItems[3]; break;
            case 'settings': targetMenuItem = menuItems[4]; break;
        }
        if (targetMenuItem) targetMenuItem.classList.add('active');
        
        // Si es dashboard, cargar información actualizada
        if (sectionId === 'dashboard') {
            this.loadDashboard();
        }
    },

    // Mostrar sección (repartidor)
    showDriverSection: function(sectionId) {
        // Ocultar todas las secciones
        const sections = document.querySelectorAll('#driverApp .section');
        sections.forEach(section => {
            section.classList.add('hidden');
        });
        
        // Mostrar la sección seleccionada
        document.getElementById(sectionId + 'Section').classList.remove('hidden');
        
        // Actualizar menú activo
        const menuItems = document.querySelectorAll('#driverApp .menu-item');
        menuItems.forEach(item => {
            item.classList.remove('active');
        });
        
        // Activar el elemento del menú correspondiente
        let targetMenuItem;
        switch(sectionId) {
            case 'myRoutes': targetMenuItem = menuItems[0]; break;
            case 'myDeliveries': targetMenuItem = menuItems[1]; break;
            case 'driverProfile': targetMenuItem = menuItems[2]; break;
        }
        if (targetMenuItem) targetMenuItem.classList.add('active');
    },

    // Cargar dashboard con información mejorada
    async loadDashboard() {
        try {
            const stats = await DataManagerSupabase.getStatistics();
            
            // Actualizar tarjetas
            document.getElementById('totalRoutes').textContent = stats.totalRoutes;
            document.getElementById('totalDeliveries').textContent = stats.totalDeliveries;
            document.getElementById('totalDrivers').textContent = stats.totalDrivers;
            document.getElementById('completedDeliveries').textContent = stats.completedDeliveries;
            
            // Mostrar información de conexión
            const dashboardTitle = document.querySelector('#dashboardSection .page-title p');
            if (dashboardTitle) {
                const isOnline = SupabaseManager.isOnline();
                dashboardTitle.innerHTML = `Resumen de entregas y rutas 
                    <span style="display: inline-block; margin-left: 10px; font-size: 12px; background: ${isOnline ? '#4cc9f0' : '#f8961e'}; color: white; padding: 2px 8px; border-radius: 12px;">
                        ${isOnline ? '🟢 Conectado a Supabase' : '⚠️ Modo offline'}
                    </span>`;
            }
            
            // Mostrar rutas activas
            await this.loadActiveRoutes();
            
        } catch (error) {
            console.error('Error cargando dashboard:', error);
            this.showNotification('❌ Error cargando datos del dashboard', 'danger');
        }
    },

    // Cargar rutas activas
    async loadActiveRoutes() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const activeRoutesGrid = document.getElementById('activeRoutesGrid');
            
            activeRoutesGrid.innerHTML = '';
            
            if (routes.length === 0) {
                activeRoutesGrid.innerHTML = `
                    <div class="text-center" style="grid-column: 1 / -1; padding: 40px;">
                        <i class="fas fa-route fa-3x mb-20" style="color: var(--light-gray);"></i>
                        <h3>No hay rutas creadas</h3>
                        <p class="mb-20">Los datos se cargarán automáticamente desde Supabase</p>
                        <div class="flex gap-10" style="justify-content: center;">
                            <button class="btn btn-primary" onclick="openRouteModal()">
                                <i class="fas fa-plus"></i> Crear Ruta Manualmente
                            </button>
                            <button class="btn btn-secondary" onclick="loadDataFromSupabase()">
                                <i class="fas fa-sync-alt"></i> Recargar desde Supabase
                            </button>
                        </div>
                        ${!SupabaseManager.isOnline() ? `
                            <div class="alert alert-warning mt-20" style="text-align: left; max-width: 400px; margin: 20px auto;">
                                <strong>⚠️ Modo offline:</strong> No hay conexión a Supabase. Usando datos locales.
                            </div>
                        ` : ''}
                    </div>
                `;
                return;
            }
            
            // Ordenar rutas: activas primero
            const activeRoutes = routes.filter(route => route.status === 'active');
            const otherRoutes = routes.filter(route => route.status !== 'active');
            const sortedRoutes = [...activeRoutes, ...otherRoutes];
            
            sortedRoutes.forEach(route => {
                // Obtener entregas de esta ruta
                this.getDeliveriesForRoute(route.name).then(deliveries => {
                    const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
                    
                    let statusClass = '';
                    let statusText = '';
                    let statusIcon = '';
                    
                    switch(route.status) {
                        case 'active':
                            statusClass = 'status-active';
                            statusText = 'Activa';
                            statusIcon = '🚀';
                            break;
                        case 'pending':
                            statusClass = 'status-pending';
                            statusText = 'Pendiente';
                            statusIcon = '⏳';
                            break;
                        case 'completed':
                            statusClass = 'status-completed';
                            statusText = 'Completada';
                            statusIcon = '✅';
                            break;
                    }
                    
                    // Calcular progreso
                    const progressPercentage = deliveries.length > 0 ? 
                        Math.round((completedDeliveries / deliveries.length) * 100) : 0;
                    
                    const routeCard = document.createElement('div');
                    routeCard.className = 'route-card';
                    routeCard.setAttribute('data-route-id', route.id);
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
                                <div><i class="fas fa-package"></i> ${completedDeliveries}/${deliveries.length} entregas</div>
                            </div>
                            
                            <!-- Barra de progreso -->
                            ${deliveries.length > 0 ? `
                                <div class="route-progress" style="margin-top: 10px;">
                                    <div class="progress-bar">
                                        <div class="progress-fill" style="width: ${progressPercentage}%;"></div>
                                    </div>
                                    <small class="progress-text">${progressPercentage}% completado</small>
                                </div>
                            ` : ''}
                        </div>
                        <div class="route-deliveries">
                            ${deliveries.slice(0, 3).map(delivery => `
                                <div class="delivery-item">
                                    <div class="delivery-client">
                                        <div class="client-avatar">${delivery.client?.charAt(0) || 'C'}</div>
                                        <div>
                                            <div>${delivery.client || 'Cliente'}</div>
                                            <small class="text-truncate">${delivery.address || ''}</small>
                                        </div>
                                    </div>
                                    <div class="delivery-actions">
                                        <a href="https://maps.google.com/?q=${encodeURIComponent(delivery.address || '')}" target="_blank" class="btn btn-sm btn-primary">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </a>
                                    </div>
                                </div>
                            `).join('')}
                            ${deliveries.length > 3 ? `<div class="text-center mt-10"><small>+${deliveries.length - 3} más</small></div>` : ''}
                            ${deliveries.length === 0 ? `
                                <div class="text-center" style="padding: 20px; color: var(--gray);">
                                    <i class="fas fa-box-open"></i>
                                    <p>No hay entregas asignadas</p>
                                </div>
                            ` : ''}
                        </div>
                        <div style="padding: 15px; display: flex; justify-content: space-between; border-top: 1px solid var(--light-gray);">
                            <button class="btn btn-sm btn-secondary" onclick="editRoute('${route.id}')">
                                <i class="fas fa-edit"></i> Editar
                            </button>
                            <button class="btn btn-sm btn-danger" onclick="deleteRoute('${route.id}')">
                                <i class="fas fa-trash"></i> Eliminar
                            </button>
                        </div>
                    `;
                    
                    activeRoutesGrid.appendChild(routeCard);
                });
            });
            
        } catch (error) {
            console.error('Error cargando rutas activas:', error);
            activeRoutesGrid.innerHTML = `
                <div class="alert alert-danger">
                    Error cargando rutas: ${error.message}
                </div>
            `;
        }
    },

    // Obtener entregas para una ruta específica
    async getDeliveriesForRoute(routeName) {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            return deliveries.filter(d => d.route === routeName);
        } catch (error) {
            console.error('Error obteniendo entregas para ruta:', error);
            return [];
        }
    },

    // Actualizar fecha para repartidor
    updateDriverDate: function() {
        const today = new Date();
        const options = { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' };
        const dateElement = document.getElementById('driverDate');
        if (dateElement) {
            dateElement.textContent = today.toLocaleDateString('es-ES', options);
        }
    },

    // Actualizar perfil del repartidor
    async updateDriverProfile() {
        if (!AuthManagerSupabase.currentUser) return;
        
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            const driverData = drivers.find(d => d.username === AuthManagerSupabase.currentUser.username);
            
            if (driverData) {
                // Actualizar información del perfil
                document.getElementById('driverProfileName').textContent = driverData.name;
                document.getElementById('driverProfileEmail').textContent = driverData.email || 'Sin email';
                document.getElementById('driverProfilePhone').textContent = driverData.phone || 'Sin teléfono';
                
                // Actualizar avatar en el perfil
                const profileAvatar = document.querySelector('#driverProfileSection .avatar');
                if (profileAvatar) {
                    profileAvatar.textContent = driverData.name.charAt(0);
                }
                
                // Actualizar estadísticas
                await this.updateDriverProfileStats(driverData);
            }
        } catch (error) {
            console.error('Error actualizando perfil del repartidor:', error);
        }
    },

    // Actualizar estadísticas del perfil del repartidor
    async updateDriverProfileStats(driverData) {
        if (!driverData) return;
        
        try {
            const driverDeliveries = await this.getDriverDeliveries(driverData.name);
            const completedDeliveries = driverDeliveries.filter(d => d.status === 'completed').length;
            const totalDeliveries = driverDeliveries.length;
            const successRate = totalDeliveries > 0 ? Math.round((completedDeliveries / totalDeliveries) * 100) : 0;
            
            // Actualizar estadísticas en el perfil
            document.getElementById('driverWeeklyDeliveries').textContent = totalDeliveries;
            document.getElementById('driverSuccessRate').textContent = `${successRate}%`;
            document.getElementById('driverHours').textContent = Math.ceil(totalDeliveries * 0.5); // Estimación
        } catch (error) {
            console.error('Error actualizando estadísticas del repartidor:', error);
        }
    },
    
    // Obtener entregas de un repartidor
    async getDriverDeliveries(driverName) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const driverRoutes = routes.filter(route => route.driver === driverName);
            const routeNames = driverRoutes.map(route => route.name);
            
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            return deliveries.filter(delivery => routeNames.includes(delivery.route));
        } catch (error) {
            console.error('Error obteniendo entregas del repartidor:', error);
            return [];
        }
    },

    // Cargar rutas del repartidor
    async loadDriverRoutes() {
        if (!AuthManagerSupabase.currentUser) return;
        
        const driverName = AuthManagerSupabase.currentUser.name;
        const driverRoutesGrid = document.getElementById('driverRoutesGrid');
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const driverRoutes = routes.filter(route => route.driver === driverName);
            
            driverRoutesGrid.innerHTML = '';
            
            if (driverRoutes.length === 0) {
                driverRoutesGrid.innerHTML = `
                    <div class="text-center" style="grid-column: 1 / -1; padding: 40px;">
                        <i class="fas fa-route fa-3x mb-20" style="color: var(--light-gray);"></i>
                        <h3>No tienes rutas asignadas</h3>
                        <p>Espera a que el administrador te asigne rutas</p>
                        <div class="mt-20">
                            <small>Tu nombre de usuario: <strong>${AuthManagerSupabase.currentUser.username}</strong></small>
                            <br>
                            <small>Contacta con el administrador si necesitas ayuda</small>
                        </div>
                    </div>
                `;
                return;
            }
            
            for (const route of driverRoutes) {
                const deliveries = await this.getDeliveriesForRoute(route.name);
                const completedDeliveries = deliveries.filter(d => d.status === 'completed').length;
                
                driverRoutesGrid.innerHTML += `
                    <div class="route-card">
                        <div class="route-header">
                            <div class="route-title">
                                <h3>${route.name}</h3>
                                <span class="route-status ${route.status === 'active' ? 'status-active' : 
                                                         route.status === 'pending' ? 'status-pending' : 
                                                         'status-completed'}">
                                    ${route.status === 'active' ? '🚀 Activa' : 
                                     route.status === 'pending' ? '⏳ Pendiente' : '✅ Completada'}
                                </span>
                            </div>
                            <p>${route.description || 'Sin descripción'}</p>
                            <div class="route-info">
                                <div><i class="fas fa-package"></i> ${deliveries.length} entregas</div>
                                <div><i class="fas fa-clock"></i> ${Math.ceil(deliveries.length * 15)} minutos estimados</div>
                            </div>
                        </div>
                        <div class="route-deliveries">
                            ${deliveries.map(delivery => `
                                <div class="delivery-item">
                                    <div class="delivery-client">
                                        <div class="client-avatar">${delivery.client?.charAt(0) || 'C'}</div>
                                        <div>
                                            <div><strong>${delivery.client || 'Cliente'}</strong></div>
                                            <small>${delivery.address || ''}</small>
                                            <div class="text-small">${delivery.phone || 'Sin teléfono'}</div>
                                        </div>
                                    </div>
                                    <div class="delivery-actions">
                                        <button class="btn btn-sm btn-info" onclick="openComandaModal('${delivery.id}')" title="Ver comanda">
                                            <i class="fas fa-list"></i>
                                        </button>
                                        <a href="https://maps.google.com/?q=${encodeURIComponent(delivery.address || '')}" target="_blank" class="btn btn-sm btn-primary" title="Ver en Maps">
                                            <i class="fas fa-map-marker-alt"></i>
                                        </a>
                                        ${delivery.status !== 'completed' ? `
                                            <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')" title="Marcar como completada">
                                                <i class="fas fa-check"></i>
                                            </button>
                                        ` : ''}
                                    </div>
                                </div>
                            `).join('')}
                        </div>
                    </div>
                `;
            }
        } catch (error) {
            console.error('Error cargando rutas del repartidor:', error);
            driverRoutesGrid.innerHTML = `
                <div class="alert alert-danger">
                    Error cargando rutas: ${error.message}
                </div>
            `;
        }
    },

    // Cargar entregas del repartidor
    async loadDriverDeliveries() {
        if (!AuthManagerSupabase.currentUser) return;
        
        const driverName = AuthManagerSupabase.currentUser.name;
        const driverDeliveriesList = document.getElementById('driverDeliveriesList');
        
        try {
            const driverDeliveries = await this.getDriverDeliveries(driverName);
            
            let tableHTML = `
                <div class="table-container">
                    <table>
                        <thead>
                            <tr>
                                <th>Cliente</th>
                                <th>Dirección</th>
                                <th>Teléfono</th>
                                <th>Comanda</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            driverDeliveries.forEach(delivery => {
                let statusBadge = delivery.status === 'completed' 
                    ? '<span class="route-status status-completed"><i class="fas fa-check-circle"></i> Completada</span>'
                    : delivery.status === 'in_progress'
                    ? '<span class="route-status status-in_progress"><i class="fas fa-truck"></i> En camino</span>'
                    : '<span class="route-status status-pending"><i class="fas fa-clock"></i> Pendiente</span>';
                
                // Formatear comanda para mejor visualización
                const comandaFormatted = this.formatComandaForDisplay(delivery.order);
                const comandaPreview = this.createComandaPreview(comandaFormatted, delivery.id);
                
                tableHTML += `
                    <tr>
                        <td>
                            <div class="delivery-client">
                                <div class="client-avatar">${delivery.client?.charAt(0) || 'C'}</div>
                                <div>
                                    <div>${delivery.client || 'Cliente'}</div>
                                    <small>${delivery.route || 'Sin ruta'}</small>
                                </div>
                            </div>
                        </td>
                        <td>${delivery.address || ''}</td>
                        <td>${delivery.phone || 'Sin teléfono'}</td>
                        <td class="table-comanda-cell">
                            ${comandaPreview}
                        </td>
                        <td>${statusBadge}</td>
                        <td>
                            <div class="delivery-actions">
                                <a href="https://maps.google.com/?q=${encodeURIComponent(delivery.address || '')}" target="_blank" class="btn btn-sm btn-primary" title="Ver en Maps">
                                    <i class="fas fa-map-marker-alt"></i>
                                </a>
                                <button class="btn btn-sm btn-info" onclick="openComandaModal('${delivery.id}')" title="Ver comanda completa">
                                    <i class="fas fa-list-alt"></i>
                                </button>
                                ${delivery.status !== 'completed' ? `
                                    <button class="btn btn-sm btn-success" onclick="markDeliveryCompleted('${delivery.id}')" title="Marcar como completada">
                                        <i class="fas fa-check"></i>
                                    </button>
                                ` : ''}
                            </div>
                        </td>
                    </tr>
                `;
            });
            
            tableHTML += `
                        </tbody>
                    </table>
                </div>
            `;
            
            driverDeliveriesList.innerHTML = tableHTML;
            
            if (driverDeliveries.length === 0) {
                driverDeliveriesList.innerHTML = `
                    <div class="text-center" style="padding: 40px;">
                        <i class="fas fa-check-circle fa-3x mb-20" style="color: var(--light-gray);"></i>
                        <h3>No tienes entregas asignadas</h3>
                        <p>Espera a que el administrador te asigne rutas con entregas</p>
                    </div>
                `;
            }
            
            // Inicializar funcionalidad de expansión de comandas
            this.initializeComandaExpand();
            
        } catch (error) {
            console.error('Error cargando entregas del repartidor:', error);
            driverDeliveriesList.innerHTML = `
                <div class="alert alert-danger">
                    Error cargando entregas: ${error.message}
                </div>
            `;
        }
    },

    // Formatear comanda para visualización
    formatComandaForDisplay: function(comandaText) {
        if (!comandaText) return 'Sin comanda';
        
        // Reemplazar comas por saltos de línea para mejor visualización
        let formatted = comandaText
            .replace(/, /g, '\n')
            .replace(/,/g, '\n')
            .replace(/\. /g, '\n')
            .replace(/\./g, '\n');
        
        // Limpiar líneas vacías y espacios extras
        formatted = formatted
            .split('\n')
            .map(line => line.trim())
            .filter(line => line.length > 0)
            .join('\n');
        
        return formatted;
    },

    // Crear vista previa de comanda con funcionalidad de expandir
    createComandaPreview: function(comandaText, deliveryId) {
        const lines = comandaText.split('\n');
        const previewLines = lines.slice(0, 3); // Mostrar solo 3 líneas inicialmente
        
        return `
            <div class="comanda-container" data-delivery-id="${deliveryId}">
                <div class="comanda-preview" onclick="toggleComandaPreview(this)">
                    <div class="comanda-text">
                        ${previewLines.join('\n')}
                        ${lines.length > 3 ? '<br><em>... ' + (lines.length - 3) + ' más</em>' : ''}
                    </div>
                    ${lines.length > 3 ? '<button class="comanda-toggle">Ver más</button>' : ''}
                </div>
            </div>
        `;
    },

    // Inicializar funcionalidad de expansión de comandas
    initializeComandaExpand: function() {
        // Añadir event listeners para las comandas
        const comandaPreviews = document.querySelectorAll('.comanda-preview');
        comandaPreviews.forEach(preview => {
            preview.addEventListener('click', function() {
                const isExpanded = this.classList.contains('expanded');
                const comandaText = this.querySelector('.comanda-text');
                const toggleBtn = this.querySelector('.comanda-toggle');
                
                if (!isExpanded) {
                    // Expandir
                    const deliveryId = this.closest('.comanda-container').dataset.deliveryId;
                    // Obtener la entrega de Supabase
                    this.getDeliveryById(deliveryId).then(delivery => {
                        if (delivery) {
                            const fullComanda = UIManager.formatComandaForDisplay(delivery.order);
                            comandaText.innerHTML = fullComanda;
                            this.classList.add('expanded');
                            if (toggleBtn) toggleBtn.textContent = 'Ver menos';
                        }
                    });
                } else {
                    // Contraer
                    const deliveryId = this.closest('.comanda-container').dataset.deliveryId;
                    this.getDeliveryById(deliveryId).then(delivery => {
                        if (delivery) {
                            const formatted = UIManager.formatComandaForDisplay(delivery.order);
                            const lines = formatted.split('\n');
                            const previewLines = lines.slice(0, 3);
                            
                            comandaText.innerHTML = previewLines.join('\n') + 
                                (lines.length > 3 ? '<br><em>... ' + (lines.length - 3) + ' más</em>' : '');
                            this.classList.remove('expanded');
                            if (toggleBtn) toggleBtn.textContent = 'Ver más';
                        }
                    });
                }
            });
        });
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
    },

    // Abrir comanda en vista rápida
    openComandaQuickView: function(deliveryId) {
        // Obtener la entrega de Supabase
        this.getDeliveryById(deliveryId).then(delivery => {
            if (!delivery) return;
            
            const modal = document.getElementById('comandaModal');
            document.getElementById('comandaClient').textContent = delivery.client || '';
            document.getElementById('comandaAddress').textContent = delivery.address || '';
            document.getElementById('comandaContent').textContent = this.formatComandaForDisplay(delivery.order);
            document.getElementById('comandaObservations').textContent = delivery.observations || 'Sin observaciones';
            document.getElementById('comandaStatus').value = delivery.status || 'pending';
            
            // Guardar ID para referencia
            modal.dataset.deliveryId = deliveryId;
            
            modal.classList.add('active');
        });
    },

    // Mostrar notificación
    showNotification: function(message, type = 'info') {
        // Crear elemento de notificación
        const notification = document.createElement('div');
        notification.className = `alert alert-${type}`;
        notification.innerHTML = `
            <i class="fas fa-${type === 'success' ? 'check-circle' : 
                              type === 'warning' ? 'exclamation-triangle' : 
                              type === 'danger' ? 'exclamation-circle' : 
                              'info-circle'}"></i>
            ${message}
        `;
        
        // Insertar al principio del main-content
        const mainContent = document.querySelector('.main-content');
        if (mainContent) {
            mainContent.insertBefore(notification, mainContent.firstChild);
            
            // Eliminar después de 5 segundos (8 para success)
            const timeout = type === 'success' ? 8000 : 5000;
            setTimeout(() => {
                if (notification.parentNode) {
                    notification.remove();
                }
            }, timeout);
        }
    },

    // Función para cargar select de rutas en modal de entrega
    async loadRoutesToSelect(selectElementId) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const select = document.getElementById(selectElementId);
            
            if (!select) return;
            
            select.innerHTML = '<option value="">-- Seleccionar ruta --</option>';
            
            if (routes.length === 0) {
                select.innerHTML += '<option value="">⚠️ No hay rutas disponibles</option>';
                select.disabled = true;
                return;
            }
            
            select.disabled = false;
            
            // Agrupar rutas por estado
            const activeRoutes = routes.filter(r => r.status === 'active');
            const pendingRoutes = routes.filter(r => r.status === 'pending');
            const completedRoutes = routes.filter(r => r.status === 'completed');
            
            if (activeRoutes.length > 0) {
                select.innerHTML += '<optgroup label="🚀 Rutas Activas">';
                activeRoutes.forEach(route => {
                    const driverInfo = route.driver ? ` - ${route.driver}` : ' - Sin repartidor';
                    select.innerHTML += `<option value="${route.name}">${route.name}${driverInfo}</option>`;
                });
                select.innerHTML += '</optgroup>';
            }
            
            if (pendingRoutes.length > 0) {
                select.innerHTML += '<optgroup label="⏳ Rutas Pendientes">';
                pendingRoutes.forEach(route => {
                    const driverInfo = route.driver ? ` - ${route.driver}` : ' - Sin repartidor';
                    select.innerHTML += `<option value="${route.name}">${route.name}${driverInfo}</option>`;
                });
                select.innerHTML += '</optgroup>';
            }
            
            if (completedRoutes.length > 0) {
                select.innerHTML += '<optgroup label="✅ Rutas Completadas">';
                completedRoutes.forEach(route => {
                    const driverInfo = route.driver ? ` - ${route.driver}` : ' - Sin repartidor';
                    select.innerHTML += `<option value="${route.name}">${route.name}${driverInfo}</option>`;
                });
                select.innerHTML += '</optgroup>';
            }
            
            select.innerHTML += '<option value="">-- No asignar a ruta --</option>';
            
        } catch (error) {
            console.error('Error cargando rutas al select:', error);
        }
    },

    // Función para cargar select de repartidores
    async loadDriversToSelect(selectElementId) {
        try {
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            const select = document.getElementById(selectElementId);
            
            if (!select) return;
            
            select.innerHTML = '<option value="">-- Seleccionar repartidor --</option>';
            
            const activeDrivers = drivers.filter(driver => driver.status === 'active');
            
            activeDrivers.forEach(driver => {
                select.innerHTML += `<option value="${driver.name}">${driver.name} - ${driver.vehicle}</option>`;
            });
            
            select.innerHTML += '<option value="">-- Sin asignar --</option>';
            
            if (activeDrivers.length === 0) {
                select.innerHTML = '<option value="">⚠️ No hay repartidores disponibles</option>';
                select.disabled = true;
            } else {
                select.disabled = false;
            }
            
        } catch (error) {
            console.error('Error cargando repartidores al select:', error);
        }
    },

    // Función para mostrar estado de conexión
    updateConnectionStatus: function() {
        const isOnline = SupabaseManager.isOnline();
        const statusElement = document.getElementById('connectionStatus');
        
        if (!statusElement) return;
        
        if (isOnline) {
            statusElement.innerHTML = '<i class="fas fa-wifi"></i> Conectado a Supabase';
            statusElement.className = 'alert alert-success';
        } else {
            statusElement.innerHTML = '<i class="fas fa-wifi-slash"></i> Modo offline - usando datos locales';
            statusElement.className = 'alert alert-warning';
        }
    },

    // Función para mostrar información del sistema
    async showSystemInfo() {
        try {
            const stats = await DataManagerSupabase.getStatistics();
            const isOnline = SupabaseManager.isOnline();
            
            const info = `
                <div style="max-width: 500px;">
                    <h3>📊 Información del Sistema</h3>
                    <table style="width: 100%; margin: 15px 0;">
                        <tr>
                            <td><strong>Estado conexión:</strong></td>
                            <td>${isOnline ? '🟢 Conectado a Supabase' : '⚠️ Modo offline'}</td>
                        </tr>
                        <tr>
                            <td><strong>Rutas activas:</strong></td>
                            <td>${stats.totalRoutes}</td>
                        </tr>
                        <tr>
                            <td><strong>Total entregas:</strong></td>
                            <td>${stats.totalDeliveries}</td>
                        </tr>
                        <tr>
                            <td><strong>Entregas pendientes:</strong></td>
                            <td>${stats.pendingDeliveries}</td>
                        </tr>
                        <tr>
                            <td><strong>Entregas completadas:</strong></td>
                            <td>${stats.completedDeliveries}</td>
                        </tr>
                        <tr>
                            <td><strong>Repartidores activos:</strong></td>
                            <td>${stats.totalDrivers}</td>
                        </tr>
                    </table>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="this.closest('.floating-dialog').remove()">Cerrar</button>
                        <button class="btn btn-primary" onclick="loadDataFromSupabase()">🔄 Recargar datos</button>
                    </div>
                </div>
            `;
            
            // Mostrar como diálogo flotante
            const dialog = document.createElement('div');
            dialog.className = 'floating-dialog';
            dialog.innerHTML = info;
            document.body.appendChild(dialog);
            
            // Cerrar al hacer clic fuera
            setTimeout(() => {
                dialog.onclick = function(e) {
                    if (e.target === dialog) {
                        dialog.remove();
                    }
                };
            }, 100);
            
        } catch (error) {
            console.error('Error mostrando información del sistema:', error);
            this.showNotification('❌ Error cargando información del sistema', 'danger');
        }
    }
};

// Funciones para manejo de comandas
function toggleComandaPreview(element) {
    const isExpanded = element.classList.contains('expanded');
    const comandaText = element.querySelector('.comanda-text');
    const toggleBtn = element.querySelector('.comanda-toggle');
    const deliveryId = element.closest('.comanda-container').dataset.deliveryId;
    
    if (!deliveryId) return;
    
    // Obtener la entrega
    DataManagerSupabase.getDeliveriesFromSupabase().then(deliveries => {
        const delivery = deliveries.find(d => d.id == deliveryId);
        
        if (!delivery) return;
        
        const formatted = UIManager.formatComandaForDisplay(delivery.order);
        const lines = formatted.split('\n');
        
        if (!isExpanded) {
            // Expandir
            comandaText.innerHTML = formatted;
            element.classList.add('expanded');
            if (toggleBtn) toggleBtn.textContent = 'Ver menos';
        } else {
            // Contraer
            const previewLines = lines.slice(0, 3);
            comandaText.innerHTML = previewLines.join('\n') + 
                (lines.length > 3 ? '<br><em>... ' + (lines.length - 3) + ' más</em>' : '');
            element.classList.remove('expanded');
            if (toggleBtn) toggleBtn.textContent = 'Ver más';
        }
    });
}

function openComandaModal(deliveryId) {
    UIManager.openComandaQuickView(deliveryId);
}

function closeComandaModal() {
    document.getElementById('comandaModal').classList.remove('active');
}

async function updateDeliveryStatusFromModal() {
    const modal = document.getElementById('comandaModal');
    const deliveryId = modal.dataset.deliveryId;
    const status = document.getElementById('comandaStatus').value;
    
    if (deliveryId) {
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const delivery = deliveries.find(d => d.id == deliveryId);
            
            if (delivery) {
                const updatedDelivery = {
                    ...delivery,
                    status: status
                };
                
                const result = await DataManagerSupabase.updateDelivery(updatedDelivery);
                
                if (result.success) {
                    UIManager.showNotification('✅ Estado actualizado correctamente', 'success');
                    
                    // Actualizar vistas
                    if (AuthManagerSupabase.currentUser) {
                        if (AuthManagerSupabase.currentUser.role === 'driver') {
                            UIManager.loadDriverDeliveries();
                        }
                    }
                }
            }
        } catch (error) {
            console.error('Error actualizando estado:', error);
            UIManager.showNotification('❌ Error actualizando estado', 'danger');
        }
    }
}

function saveComandaChanges() {
    updateDeliveryStatusFromModal();
    closeComandaModal();
}

// Exportar para uso global
window.UIManager = UIManager;
window.toggleComandaPreview = toggleComandaPreview;
window.openComandaModal = openComandaModal;
window.closeComandaModal = closeComandaModal;
window.updateDeliveryStatusFromModal = updateDeliveryStatusFromModal;
window.saveComandaChanges = saveComandaChanges;
