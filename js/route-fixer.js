// route-fixer.js - Solucionador específico de problemas de rutas y entregas
const RouteFixer = {
    
    // Diagnosticar problemas de relación entre rutas y entregas
    async diagnoseRouteIssues() {
        console.log('🔍 Diagnosticando problemas de rutas y entregas...');
        
        try {
            // Obtener datos actuales
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            const issues = {
                orphanedDeliveries: [],
                mismatchedRoutes: [],
                duplicateRouteNames: [],
                emptyRoutes: []
            };
            
            // 1. Identificar entregas huérfanas (con ruta que no existe)
            deliveries.forEach(delivery => {
                if (delivery.route && delivery.route.trim() !== '') {
                    const matchingRoute = routes.find(r => 
                        r.name && delivery.route && 
                        r.name.toString().trim() === delivery.route.toString().trim()
                    );
                    
                    if (!matchingRoute) {
                        issues.orphanedDeliveries.push({
                            deliveryId: delivery.id,
                            deliveryClient: delivery.client,
                            routeName: delivery.route,
                            status: delivery.status
                        });
                    }
                }
            });
            
            // 2. Identificar rutas sin entregas
            routes.forEach(route => {
                const routeDeliveries = deliveries.filter(d => 
                    d.route && route.name && 
                    d.route.toString().trim() === route.name.toString().trim()
                );
                
                if (routeDeliveries.length === 0) {
                    issues.emptyRoutes.push({
                        routeId: route.id,
                        routeName: route.name,
                        driver: route.driver,
                        status: route.status
                    });
                }
            });
            
            // 3. Identificar nombres de ruta duplicados (ignorando mayúsculas/minúsculas)
            const routeNames = routes.map(r => r.name?.toLowerCase().trim()).filter(Boolean);
            const duplicateNames = routeNames.filter((name, index) => routeNames.indexOf(name) !== index);
            
            issues.duplicateRouteNames = [...new Set(duplicateNames)];
            
            // 4. Verificar consistencia de nombres
            routes.forEach(route => {
                deliveries.forEach(delivery => {
                    if (delivery.route && route.name) {
                        const routeName = route.name.toString().trim();
                        const deliveryRoute = delivery.route.toString().trim();
                        
                        if (routeName.toLowerCase() === deliveryRoute.toLowerCase() && routeName !== deliveryRoute) {
                            issues.mismatchedRoutes.push({
                                routeId: route.id,
                                routeName: route.name,
                                deliveryId: delivery.id,
                                deliveryClient: delivery.client,
                                deliveryRoute: delivery.route,
                                issue: 'Mayúsculas/minúsculas diferentes'
                            });
                        }
                    }
                });
            });
            
            console.log('📊 Diagnóstico completado:', {
                totalRoutes: routes.length,
                totalDeliveries: deliveries.length,
                orphanedDeliveries: issues.orphanedDeliveries.length,
                emptyRoutes: issues.emptyRoutes.length,
                duplicateRouteNames: issues.duplicateRouteNames.length,
                mismatchedRoutes: issues.mismatchedRoutes.length
            });
            
            return issues;
            
        } catch (error) {
            console.error('Error en diagnóstico:', error);
            return null;
        }
    },
    
    // Reparar relaciones entre rutas y entregas
    async fixRouteRelationships() {
        console.log('🔧 Reparando relaciones rutas-entregas...');
        
        if (window.UIManager) {
            UIManager.showNotification('🔧 Reparando relaciones rutas-entregas...', 'info');
        }
        
        try {
            // Obtener datos actuales
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            let fixedCount = 0;
            let removedCount = 0;
            
            // 1. Normalizar nombres de rutas (eliminar espacios, normalizar mayúsculas)
            const normalizedRoutes = routes.map(route => ({
                ...route,
                normalizedName: route.name ? route.name.toString().trim() : ''
            }));
            
            // 2. Corregir entregas con nombres de ruta que no coinciden exactamente
            for (const delivery of deliveries) {
                if (delivery.route && delivery.route.trim() !== '') {
                    const deliveryRoute = delivery.route.toString().trim();
                    
                    // Buscar ruta que coincida (ignorando mayúsculas/minúsculas)
                    const matchingRoute = normalizedRoutes.find(route => 
                        route.normalizedName.toLowerCase() === deliveryRoute.toLowerCase()
                    );
                    
                    if (matchingRoute && matchingRoute.normalizedName !== deliveryRoute) {
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
            
            // 3. Actualizar contadores de entregas en cada ruta
            for (const route of routes) {
                const routeDeliveries = deliveries.filter(d => 
                    d.route && d.route.toString().trim() === route.name.toString().trim()
                );
                
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                // Actualizar ruta con nuevos contadores
                const updatedRoute = {
                    ...route,
                    deliveries: routeDeliveries.length,
                    completed: completedDeliveries
                };
                
                try {
                    await DataManagerSupabase.updateRoute(updatedRoute);
                    console.log(`📊 Actualizada ruta "${route.name}": ${routeDeliveries.length} entregas, ${completedDeliveries} completadas`);
                } catch (error) {
                    console.error(`❌ Error actualizando ruta ${route.id}:`, error);
                }
            }
            
            // 4. Actualizar localStorage
            const updatedRoutes = await DataManagerSupabase.getRoutesFromSupabase();
            const updatedDeliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            localStorage.setItem('delivery_routes', JSON.stringify(updatedRoutes));
            localStorage.setItem('delivery_deliveries', JSON.stringify(updatedDeliveries));
            
            console.log(`✅ Reparación completada: ${fixedCount} entregas corregidas`);
            
            if (window.UIManager) {
                UIManager.showNotification(`✅ ${fixedCount} relaciones reparadas`, 'success');
            }
            
            // 5. Recargar UI
            setTimeout(() => {
                if (window.RouteManagerSupabase) RouteManagerSupabase.loadRoutes();
                if (window.DeliveryManagerSupabase) DeliveryManagerSupabase.loadDeliveries();
                if (window.UIManager) UIManager.loadDashboard();
            }, 1000);
            
            return { fixedCount, removedCount };
            
        } catch (error) {
            console.error('Error reparando relaciones:', error);
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error reparando relaciones', 'danger');
            }
            
            return null;
        }
    },
    
    // Vincular entregas específicas a una ruta
    async linkDeliveriesToRoute(routeName, deliveryIds) {
        console.log(`🔗 Vinculando ${deliveryIds.length} entregas a la ruta "${routeName}"`);
        
        try {
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            let linkedCount = 0;
            
            for (const deliveryId of deliveryIds) {
                const delivery = deliveries.find(d => d.id === deliveryId);
                if (delivery) {
                    const updatedDelivery = {
                        ...delivery,
                        route: routeName
                    };
                    
                    await DataManagerSupabase.updateDelivery(updatedDelivery);
                    linkedCount++;
                }
            }
            
            // Actualizar contador de la ruta
            await this.updateRouteDeliveryCount(routeName);
            
            console.log(`✅ ${linkedCount} entregas vinculadas a "${routeName}"`);
            
            if (window.UIManager) {
                UIManager.showNotification(`✅ ${linkedCount} entregas vinculadas a la ruta`, 'success');
            }
            
            return linkedCount;
            
        } catch (error) {
            console.error('Error vinculando entregas:', error);
            return 0;
        }
    },
    
    // Actualizar contador de entregas para una ruta específica
    async updateRouteDeliveryCount(routeName) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            const route = routes.find(r => r.name === routeName);
            if (!route) return;
            
            const routeDeliveries = deliveries.filter(d => d.route === routeName);
            const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
            
            const updatedRoute = {
                ...route,
                deliveries: routeDeliveries.length,
                completed: completedDeliveries
            };
            
            await DataManagerSupabase.updateRoute(updatedRoute);
            
        } catch (error) {
            console.error('Error actualizando contador de ruta:', error);
        }
    },
    
    // Mostrar panel de diagnóstico en la interfaz
    async showDiagnosisPanel() {
        try {
            const issues = await this.diagnoseRouteIssues();
            if (!issues) return;
            
            let html = `
                <div style="max-width: 800px;">
                    <h3>🔍 Diagnóstico de Rutas y Entregas</h3>
                    
                    <div class="alert ${issues.orphanedDeliveries.length > 0 ? 'alert-warning' : 'alert-success'}" style="margin: 10px 0;">
                        <strong>Entregas huérfanas:</strong> ${issues.orphanedDeliveries.length}
                        ${issues.orphanedDeliveries.length > 0 ? 
                            `<br><small>Entregas con ruta que no existe en el sistema</small>` : 
                            `<br><small>✅ Todas las entregas tienen rutas válidas</small>`
                        }
                    </div>
                    
                    <div class="alert ${issues.emptyRoutes.length > 0 ? 'alert-warning' : 'alert-success'}" style="margin: 10px 0;">
                        <strong>Rutas vacías:</strong> ${issues.emptyRoutes.length}
                        ${issues.emptyRoutes.length > 0 ? 
                            `<br><small>Rutas sin entregas asignadas</small>` : 
                            `<br><small>✅ Todas las rutas tienen entregas</small>`
                        }
                    </div>
                    
                    <div class="alert ${issues.duplicateRouteNames.length > 0 ? 'alert-danger' : 'alert-success'}" style="margin: 10px 0;">
                        <strong>Nombres duplicados:</strong> ${issues.duplicateRouteNames.length}
                        ${issues.duplicateRouteNames.length > 0 ? 
                            `<br><small>Nombres de ruta que se repiten (puede causar confusión)</small>` : 
                            `<br><small>✅ Nombres de ruta únicos</small>`
                        }
                    </div>
                    
                    <div class="alert ${issues.mismatchedRoutes.length > 0 ? 'alert-info' : 'alert-success'}" style="margin: 10px 0;">
                        <strong>Inconsistencias de formato:</strong> ${issues.mismatchedRoutes.length}
                        ${issues.mismatchedRoutes.length > 0 ? 
                            `<br><small>Rutas y entregas con nombres similares pero formato diferente</small>` : 
                            `<br><small>✅ Formato consistente en todos los nombres</small>`
                        }
                    </div>
            `;
            
            // Mostrar detalles si hay problemas
            if (issues.orphanedDeliveries.length > 0) {
                html += `
                    <h4>📦 Entregas huérfanas:</h4>
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                        <table style="width: 100%; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Cliente</th>
                                    <th>Ruta asignada</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                issues.orphanedDeliveries.slice(0, 10).forEach(delivery => {
                    html += `
                        <tr>
                            <td>${delivery.deliveryId || 'N/A'}</td>
                            <td>${delivery.deliveryClient || 'Sin nombre'}</td>
                            <td>"${delivery.routeName}"</td>
                            <td>${delivery.status || 'N/A'}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                        ${issues.orphanedDeliveries.length > 10 ? `<small>... y ${issues.orphanedDeliveries.length - 10} más</small>` : ''}
                    </div>
                `;
            }
            
            if (issues.emptyRoutes.length > 0) {
                html += `
                    <h4>🛣️ Rutas vacías:</h4>
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
                        <table style="width: 100%; font-size: 12px;">
                            <thead>
                                <tr>
                                    <th>ID</th>
                                    <th>Nombre de ruta</th>
                                    <th>Repartidor</th>
                                    <th>Estado</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                issues.emptyRoutes.slice(0, 10).forEach(route => {
                    html += `
                        <tr>
                            <td>${route.routeId || 'N/A'}</td>
                            <td>"${route.routeName}"</td>
                            <td>${route.driver || 'Sin asignar'}</td>
                            <td>${route.status || 'N/A'}</td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                        ${issues.emptyRoutes.length > 10 ? `<small>... y ${issues.emptyRoutes.length - 10} más</small>` : ''}
                    </div>
                `;
            }
            
            html += `
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="this.closest('.floating-dialog').remove()">Cerrar</button>
                        <button class="btn btn-primary" onclick="RouteFixer.fixRouteRelationships(); this.closest('.floating-dialog').remove();">
                            <i class="fas fa-tools"></i> Reparar Automáticamente
                        </button>
                    </div>
                </div>
            `;
            
            // Mostrar como diálogo flotante
            const dialog = document.createElement('div');
            dialog.className = 'floating-dialog';
            dialog.innerHTML = html;
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
            console.error('Error mostrando panel de diagnóstico:', error);
        }
    },
    
    // Función para asignar manualmente entregas a rutas
    async showManualAssignmentTool() {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // Filtrar entregas sin ruta o con ruta huérfana
            const unassignedDeliveries = deliveries.filter(d => !d.route || d.route.trim() === '');
            
            let html = `
                <div style="max-width: 800px;">
                    <h3>🔗 Asignación Manual de Entregas a Rutas</h3>
                    
                    <div class="alert alert-info" style="margin: 10px 0;">
                        <strong>${unassignedDeliveries.length} entregas sin ruta asignada</strong>
                        <br><small>Selecciona entregas y asígnalas a una ruta existente</small>
                    </div>
                    
                    <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin: 20px 0;">
                        <div>
                            <h4>📦 Entregas Disponibles</h4>
                            <div id="assignmentDeliveriesList" style="max-height: 300px; overflow-y: auto; border: 1px solid var(--light-gray); border-radius: 8px; padding: 10px;">
            `;
            
            if (unassignedDeliveries.length === 0) {
                html += `<div class="text-center" style="padding: 20px; color: var(--gray);">✅ Todas las entregas tienen ruta asignada</div>`;
            } else {
                unassignedDeliveries.forEach(delivery => {
                    html += `
                        <div class="delivery-checkbox-item">
                            <label>
                                <input type="checkbox" name="deliveryToAssign" value="${delivery.id}" data-client="${delivery.client}">
                                <div class="delivery-checkbox-info">
                                    <strong>${delivery.client || 'Cliente sin nombre'}</strong>
                                    <br><small>${delivery.address || 'Sin dirección'}</small>
                                    <br><small>Estado: ${delivery.status || 'pendiente'}</small>
                                </div>
                            </label>
                        </div>
                    `;
                });
            }
            
            html += `
                            </div>
                        </div>
                        
                        <div>
                            <h4>🛣️ Rutas Disponibles</h4>
                            <select id="assignmentRouteSelect" class="form-control" style="margin-bottom: 15px;">
                                <option value="">-- Selecciona una ruta --</option>
            `;
            
            routes.forEach(route => {
                html += `<option value="${route.name}">${route.name} - ${route.driver || 'Sin repartidor'}</option>`;
            });
            
            html += `
                            </select>
                            
                            <button id="assignButton" class="btn btn-primary" style="width: 100%;" onclick="RouteFixer.assignSelectedDeliveries()">
                                <i class="fas fa-link"></i> Asignar Entregas Seleccionadas
                            </button>
                            
                            <div id="assignmentStatus" style="margin-top: 15px; font-size: 13px;"></div>
                        </div>
                    </div>
                    
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end;">
                        <button class="btn btn-secondary" onclick="this.closest('.floating-dialog').remove()">Cerrar</button>
                    </div>
                </div>
            `;
            
            const dialog = document.createElement('div');
            dialog.className = 'floating-dialog';
            dialog.innerHTML = html;
            document.body.appendChild(dialog);
            
            // Actualizar estado del botón según selección
            setTimeout(() => {
                const checkboxes = dialog.querySelectorAll('input[name="deliveryToAssign"]');
                const select = dialog.querySelector('#assignmentRouteSelect');
                const button = dialog.querySelector('#assignButton');
                
                function updateButtonState() {
                    const hasSelections = Array.from(checkboxes).some(cb => cb.checked);
                    const hasRoute = select.value && select.value.trim() !== '';
                    button.disabled = !(hasSelections && hasRoute);
                }
                
                checkboxes.forEach(cb => cb.addEventListener('change', updateButtonState));
                select.addEventListener('change', updateButtonState);
                updateButtonState();
            }, 100);
            
        } catch (error) {
            console.error('Error mostrando herramienta de asignación:', error);
        }
    },
    
    // Asignar entregas seleccionadas a ruta
    async assignSelectedDeliveries() {
        try {
            const dialog = document.querySelector('.floating-dialog');
            const checkboxes = dialog.querySelectorAll('input[name="deliveryToAssign"]:checked');
            const select = dialog.querySelector('#assignmentRouteSelect');
            const statusDiv = dialog.querySelector('#assignmentStatus');
            
            if (!select.value) {
                statusDiv.innerHTML = '<div class="alert alert-warning">⚠️ Selecciona una ruta primero</div>';
                return;
            }
            
            const selectedIds = Array.from(checkboxes).map(cb => cb.value);
            
            if (selectedIds.length === 0) {
                statusDiv.innerHTML = '<div class="alert alert-warning">⚠️ Selecciona al menos una entrega</div>';
                return;
            }
            
            statusDiv.innerHTML = '<div class="alert alert-info">🔄 Asignando entregas...</div>';
            
            const result = await this.linkDeliveriesToRoute(select.value, selectedIds);
            
            statusDiv.innerHTML = `
                <div class="alert alert-success">
                    ✅ ${result} entregas asignadas a la ruta "${select.value}"
                </div>
            `;
            
            // Actualizar lista de entregas
            setTimeout(() => {
                this.showManualAssignmentTool();
                dialog.remove();
            }, 2000);
            
        } catch (error) {
            console.error('Error asignando entregas:', error);
            const statusDiv = document.querySelector('#assignmentStatus');
            if (statusDiv) {
                statusDiv.innerHTML = '<div class="alert alert-danger">❌ Error asignando entregas</div>';
            }
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.RouteFixer) {
            console.log('✅ RouteFixer cargado');
        }
    }, 3000);
});

// Exportar para uso global
window.RouteFixer = RouteFixer;
window.showRouteDiagnosis = function() { RouteFixer.showDiagnosisPanel(); };
window.showManualAssignment = function() { RouteFixer.showManualAssignmentTool(); };
