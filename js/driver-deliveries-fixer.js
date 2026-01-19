// driver-deliveries-fixer.js - Solucionador específico para entregas de repartidores
const DriverDeliveriesFixer = {
    
    // Diagnosticar por qué un repartidor no ve sus entregas
    async diagnoseDriverDeliveries(driverName = null) {
        console.log('🔍 Diagnosticando entregas de repartidor...');
        
        try {
            if (!driverName && window.AuthManagerSupabase?.currentUser) {
                driverName = AuthManagerSupabase.currentUser.name;
            }
            
            if (!driverName) {
                console.error('No se pudo obtener el nombre del repartidor');
                return null;
            }
            
            // Obtener datos
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // 1. Encontrar rutas asignadas a este repartidor
            const driverRoutes = routes.filter(route => 
                route.driver && this.normalizeString(route.driver) === this.normalizeString(driverName)
            );
            
            console.log(`🛣️ Rutas asignadas a ${driverName}:`, driverRoutes.map(r => r.name));
            
            // 2. Encontrar entregas para cada ruta
            const driverRouteNames = driverRoutes.map(route => route.name);
            const driverDeliveries = deliveries.filter(delivery => 
                delivery.route && driverRouteNames.some(routeName => 
                    this.normalizeString(routeName) === this.normalizeString(delivery.route)
                )
            );
            
            // 3. Encontrar entregas pendientes
            const pendingDeliveries = driverDeliveries.filter(d => 
                d.status === 'pending' || d.status === 'in_progress'
            );
            
            // 4. Diagnosticar problemas potenciales
            const issues = {
                driverName,
                totalDriverRoutes: driverRoutes.length,
                totalDriverDeliveries: driverDeliveries.length,
                pendingDriverDeliveries: pendingDeliveries.length,
                routeMismatches: [],
                deliveryStatusIssues: []
            };
            
            // Verificar inconsistencias por ruta
            driverRoutes.forEach(route => {
                const routeDeliveries = deliveries.filter(d => 
                    d.route && this.normalizeString(d.route) === this.normalizeString(route.name)
                );
                
                if (routeDeliveries.length === 0) {
                    issues.routeMismatches.push({
                        routeName: route.name,
                        issue: 'La ruta no tiene entregas asignadas',
                        suggestion: 'Asigna entregas a esta ruta o verifica que las entregas tengan el nombre correcto de ruta'
                    });
                }
            });
            
            // Verificar entregas que deberían estar asignadas pero no lo están
            deliveries.forEach(delivery => {
                if (delivery.route && !delivery.route.trim()) return;
                
                const deliveryRouteName = delivery.route ? this.normalizeString(delivery.route) : '';
                const matchingRoute = routes.find(route => 
                    route.name && this.normalizeString(route.name) === deliveryRouteName
                );
                
                if (matchingRoute && matchingRoute.driver && 
                    this.normalizeString(matchingRoute.driver) !== this.normalizeString(driverName)) {
                    issues.deliveryStatusIssues.push({
                        deliveryId: delivery.id,
                        client: delivery.client,
                        route: delivery.route,
                        assignedTo: matchingRoute.driver,
                        issue: `La entrega está en una ruta asignada a ${matchingRoute.driver}, no a ${driverName}`
                    });
                }
            });
            
            console.log('📊 Diagnóstico del repartidor:', issues);
            
            return issues;
            
        } catch (error) {
            console.error('Error diagnosticando entregas del repartidor:', error);
            return null;
        }
    },
    
    // Normalizar string (eliminar espacios, minúsculas)
    normalizeString(str) {
        if (!str) return '';
        return str.toString().trim().toLowerCase();
    },
    
    // Forzar la carga de entregas para un repartidor específico
    async forceLoadDriverDeliveries(driverName = null) {
        console.log('🔄 Forzando carga de entregas para repartidor...');
        
        try {
            if (!driverName && window.AuthManagerSupabase?.currentUser) {
                driverName = AuthManagerSupabase.currentUser.name;
            }
            
            if (!driverName) {
                console.error('No se pudo obtener el nombre del repartidor');
                return false;
            }
            
            // 1. Limpiar caché de entregas del repartidor
            localStorage.removeItem(`driver_deliveries_${this.normalizeString(driverName)}`);
            
            // 2. Recargar datos de Supabase
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // 3. Filtrar rutas del repartidor
            const driverRoutes = routes.filter(route => 
                route.driver && this.normalizeString(route.driver) === this.normalizeString(driverName)
            );
            
            if (driverRoutes.length === 0) {
                console.warn(`⚠️ El repartidor ${driverName} no tiene rutas asignadas`);
                return false;
            }
            
            // 4. Filtrar entregas para las rutas del repartidor
            const driverRouteNames = driverRoutes.map(route => route.name);
            const driverDeliveries = deliveries.filter(delivery => {
                if (!delivery.route) return false;
                return driverRouteNames.some(routeName => 
                    this.normalizeString(routeName) === this.normalizeString(delivery.route)
                );
            });
            
            console.log(`✅ Repartidor ${driverName}: ${driverRoutes.length} rutas, ${driverDeliveries.length} entregas`);
            
            // 5. Guardar en caché local para la sesión
            localStorage.setItem(`driver_deliveries_${this.normalizeString(driverName)}`, 
                JSON.stringify({
                    routes: driverRoutes,
                    deliveries: driverDeliveries,
                    timestamp: new Date().toISOString()
                })
            );
            
            // 6. Forzar recarga de la UI del repartidor
            if (window.UIManager && AuthManagerSupabase.currentUser.role === 'driver') {
                await UIManager.loadDriverRoutes();
                await UIManager.loadDriverDeliveries();
                
                UIManager.showNotification(`✅ Cargadas ${driverDeliveries.length} entregas para ${driverName}`, 'success');
            }
            
            return {
                success: true,
                driverName,
                routes: driverRoutes.length,
                deliveries: driverDeliveries.length
            };
            
        } catch (error) {
            console.error('Error forzando carga de entregas:', error);
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error cargando entregas', 'danger');
            }
            
            return { success: false, error: error.message };
        }
    },
    
    // Verificar y corregir asignaciones de rutas a repartidores
    async verifyRouteAssignments() {
        console.log('🔍 Verificando asignaciones de rutas...');
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            const drivers = await DataManagerSupabase.getDriversFromSupabase();
            
            const report = {
                totalRoutes: routes.length,
                routesWithDriver: routes.filter(r => r.driver && r.driver.trim()).length,
                routesWithoutDriver: routes.filter(r => !r.driver || !r.driver.trim()).length,
                routesWithDeliveries: [],
                routesWithoutDeliveries: [],
                driverAssignments: {}
            };
            
            // Agrupar por repartidor
            drivers.forEach(driver => {
                report.driverAssignments[driver.name] = {
                    routes: routes.filter(r => this.normalizeString(r.driver) === this.normalizeString(driver.name)),
                    deliveries: []
                };
            });
            
            // Contar entregas por ruta
            routes.forEach(route => {
                const routeDeliveries = deliveries.filter(d => 
                    d.route && this.normalizeString(d.route) === this.normalizeString(route.name)
                );
                
                if (routeDeliveries.length > 0) {
                    report.routesWithDeliveries.push({
                        routeName: route.name,
                        driver: route.driver,
                        deliveries: routeDeliveries.length
                    });
                } else {
                    report.routesWithoutDeliveries.push({
                        routeName: route.name,
                        driver: route.driver
                    });
                }
                
                // Sumar entregas al repartidor correspondiente
                if (route.driver) {
                    const driverEntry = report.driverAssignments[route.driver];
                    if (driverEntry) {
                        driverEntry.deliveries = (driverEntry.deliveries || 0) + routeDeliveries.length;
                    }
                }
            });
            
            console.log('📊 Reporte de asignaciones:', report);
            
            return report;
            
        } catch (error) {
            console.error('Error verificando asignaciones:', error);
            return null;
        }
    },
    
    // Mostrar panel de diagnóstico en la interfaz
    async showDriverDiagnosisPanel() {
        try {
            if (!window.AuthManagerSupabase?.currentUser) {
                alert('Por favor, inicia sesión primero');
                return;
            }
            
            const driverName = AuthManagerSupabase.currentUser.name;
            const isDriver = AuthManagerSupabase.currentUser.role === 'driver';
            
            // Obtener diagnóstico
            const diagnosis = await this.diagnoseDriverDeliveries(driverName);
            const assignments = await this.verifyRouteAssignments();
            
            let html = `
                <div style="max-width: 800px;">
                    <h3>👤 Diagnóstico de Entregas para ${driverName}</h3>
                    
                    <div class="alert ${isDriver ? 'alert-info' : 'alert-warning'}" style="margin: 10px 0;">
                        <strong>Rol:</strong> ${isDriver ? 'Repartidor' : 'Administrador'}
                        ${isDriver ? '<br><small>Esta vista muestra las entregas asignadas a ti</small>' : 
                                    '<br><small>Como admin, puedes ver el estado de todos los repartidores</small>'}
                    </div>
            `;
            
            if (diagnosis) {
                html += `
                    <div class="alert ${diagnosis.totalDriverDeliveries > 0 ? 'alert-success' : 'alert-danger'}" style="margin: 10px 0;">
                        <strong>Entregas asignadas:</strong> ${diagnosis.totalDriverDeliveries}
                        <br><strong>Rutas asignadas:</strong> ${diagnosis.totalDriverRoutes}
                        <br><strong>Entregas pendientes:</strong> ${diagnosis.pendingDriverDeliveries}
                    </div>
                `;
                
                if (diagnosis.routeMismatches.length > 0) {
                    html += `
                        <h4>⚠️ Problemas con rutas:</h4>
                        <div style="max-height: 150px; overflow-y: auto; margin-bottom: 15px;">
                    `;
                    
                    diagnosis.routeMismatches.forEach(issue => {
                        html += `
                            <div class="alert alert-warning" style="padding: 8px; margin: 5px 0;">
                                <strong>Ruta "${issue.routeName}":</strong> ${issue.issue}
                                <br><small>${issue.suggestion}</small>
                            </div>
                        `;
                    });
                    
                    html += `</div>`;
                }
            }
            
            if (assignments && assignments.driverAssignments) {
                html += `
                    <h4>📊 Asignaciones por Repartidor:</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
                        <table style="width: 100%; font-size: 12px; border-collapse: collapse;">
                            <thead>
                                <tr style="background-color: #f8f9fa;">
                                    <th style="padding: 8px; border: 1px solid #dee2e6;">Repartidor</th>
                                    <th style="padding: 8px; border: 1px solid #dee2e6;">Rutas</th>
                                    <th style="padding: 8px; border: 1px solid #dee2e6;">Entregas</th>
                                    <th style="padding: 8px; border: 1px solid #dee2e6;">Acciones</th>
                                </tr>
                            </thead>
                            <tbody>
                `;
                
                Object.entries(assignments.driverAssignments).forEach(([driverName, data]) => {
                    html += `
                        <tr>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">
                                <strong>${driverName}</strong>
                                ${driverName === AuthManagerSupabase.currentUser.name ? ' (Tú)' : ''}
                            </td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">${data.routes.length}</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">${data.deliveries || 0}</td>
                            <td style="padding: 8px; border: 1px solid #dee2e6;">
                                <button class="btn btn-sm btn-info" onclick="DriverDeliveriesFixer.showDriverDetails('${driverName}')">
                                    Ver Detalles
                                </button>
                            </td>
                        </tr>
                    `;
                });
                
                html += `
                            </tbody>
                        </table>
                    </div>
                `;
            }
            
            html += `
                    <div style="margin-top: 20px; display: flex; gap: 10px; justify-content: flex-end; flex-wrap: wrap;">
                        <button class="btn btn-secondary" onclick="this.closest('.floating-dialog').remove()">Cerrar</button>
                        <button class="btn btn-primary" onclick="DriverDeliveriesFixer.forceLoadDriverDeliveries('${driverName}')">
                            <i class="fas fa-sync-alt"></i> Forzar Recarga
                        </button>
                        ${isDriver ? `
                            <button class="btn btn-warning" onclick="DriverDeliveriesFixer.fixDriverView()">
                                <i class="fas fa-tools"></i> Reparar Vista
                            </button>
                        ` : ''}
                    </div>
                </div>
            `;
            
            // Mostrar como diálogo flotante
            const dialog = document.createElement('div');
            dialog.className = 'floating-dialog';
            dialog.innerHTML = html;
            document.body.appendChild(dialog);
            
        } catch (error) {
            console.error('Error mostrando panel de diagnóstico:', error);
        }
    },
    
    // Mostrar detalles de un repartidor específico
    async showDriverDetails(driverName) {
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // Filtrar rutas del repartidor
            const driverRoutes = routes.filter(route => 
                route.driver && this.normalizeString(route.driver) === this.normalizeString(driverName)
            );
            
            // Filtrar entregas para estas rutas
            const driverDeliveries = deliveries.filter(delivery => {
                if (!delivery.route) return false;
                return driverRoutes.some(route => 
                    this.normalizeString(route.name) === this.normalizeString(delivery.route)
                );
            });
            
            let html = `
                <div style="max-width: 800px;">
                    <h3>👤 Detalles de ${driverName}</h3>
                    
                    <div class="alert alert-info" style="margin: 10px 0;">
                        <strong>Rutas asignadas:</strong> ${driverRoutes.length}
                        <br><strong>Entregas totales:</strong> ${driverDeliveries.length}
                        <br><strong>Entregas pendientes:</strong> ${driverDeliveries.filter(d => d.status === 'pending').length}
                    </div>
                    
                    <h4>🛣️ Rutas Asignadas:</h4>
                    <div style="max-height: 200px; overflow-y: auto; margin-bottom: 15px;">
            `;
            
            if (driverRoutes.length === 0) {
                html += `<div class="alert alert-warning">No hay rutas asignadas</div>`;
            } else {
                driverRoutes.forEach(route => {
                    const routeDeliveries = driverDeliveries.filter(d => 
                        this.normalizeString(d.route) === this.normalizeString(route.name)
                    );
                    
                    html += `
                        <div class="alert ${routeDeliveries.length > 0 ? 'alert-success' : 'alert-warning'}" style="padding: 10px; margin: 5px 0;">
                            <strong>${route.name}</strong>
                            <br><small>Estado: ${route.status} | Entregas: ${routeDeliveries.length}</small>
                            <br><small>${route.description || 'Sin descripción'}</small>
                        </div>
                    `;
                });
            }
            
            html += `</div>`;
            
            html += `
                    <h4>📦 Entregas Asignadas:</h4>
                    <div style="max-height: 300px; overflow-y: auto;">
            `;
            
            if (driverDeliveries.length === 0) {
                html += `<div class="alert alert-warning">No hay entregas asignadas</div>`;
            } else {
                driverDeliveries.forEach(delivery => {
                    html += `
                        <div class="alert ${delivery.status === 'completed' ? 'alert-success' : 
                                           delivery.status === 'in_progress' ? 'alert-info' : 
                                           'alert-warning'}" style="padding: 8px; margin: 3px 0;">
                            <strong>${delivery.client}</strong>
                            <br><small>Dirección: ${delivery.address}</small>
                            <br><small>Ruta: ${delivery.route} | Estado: ${delivery.status}</small>
                        </div>
                    `;
                });
            }
            
            html += `
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
            
        } catch (error) {
            console.error('Error mostrando detalles del repartidor:', error);
        }
    },
    
    // Reparar la vista del repartidor (para cuando no ve las entregas)
    async fixDriverView() {
        console.log('🔧 Reparando vista del repartidor...');
        
        try {
            if (!window.AuthManagerSupabase?.currentUser) {
                console.error('Usuario no autenticado');
                return;
            }
            
            const driverName = AuthManagerSupabase.currentUser.name;
            
            // 1. Limpiar caché específica
            localStorage.removeItem(`driver_routes_${this.normalizeString(driverName)}`);
            localStorage.removeItem(`driver_deliveries_${this.normalizeString(driverName)}`);
            
            // 2. Recargar datos frescos
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            // 3. Filtrar correctamente
            const driverRoutes = routes.filter(route => 
                route.driver && this.normalizeString(route.driver) === this.normalizeString(driverName)
            );
            
            const driverRouteNames = driverRoutes.map(route => route.name);
            const driverDeliveries = deliveries.filter(delivery => {
                if (!delivery.route) return false;
                return driverRouteNames.some(routeName => 
                    this.normalizeString(routeName) === this.normalizeString(delivery.route)
                );
            });
            
            console.log(`✅ Datos filtrados: ${driverRoutes.length} rutas, ${driverDeliveries.length} entregas`);
            
            // 4. Actualizar contadores en las rutas
            for (const route of driverRoutes) {
                const routeDeliveries = driverDeliveries.filter(d => 
                    this.normalizeString(d.route) === this.normalizeString(route.name)
                );
                
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                const updatedRoute = {
                    ...route,
                    deliveries: routeDeliveries.length,
                    completed: completedDeliveries
                };
                
                try {
                    await DataManagerSupabase.updateRoute(updatedRoute);
                } catch (error) {
                    console.error(`Error actualizando ruta ${route.id}:`, error);
                }
            }
            
            // 5. Forzar recarga de la UI
            if (window.UIManager) {
                await UIManager.loadDriverRoutes();
                await UIManager.loadDriverDeliveries();
                
                UIManager.showNotification(`✅ Vista reparada: ${driverDeliveries.length} entregas cargadas`, 'success');
            }
            
            return {
                success: true,
                routes: driverRoutes.length,
                deliveries: driverDeliveries.length
            };
            
        } catch (error) {
            console.error('Error reparando vista del repartidor:', error);
            
            if (window.UIManager) {
                UIManager.showNotification('❌ Error reparando vista', 'danger');
            }
            
            return { success: false, error: error.message };
        }
    },
    
    // Sincronizar manualmente todas las asignaciones
    async syncAllDriverAssignments() {
        console.log('🔄 Sincronizando todas las asignaciones de repartidores...');
        
        try {
            const routes = await DataManagerSupabase.getRoutesFromSupabase();
            const deliveries = await DataManagerSupabase.getDeliveriesFromSupabase();
            
            let updatedRoutes = 0;
            
            // Para cada ruta, contar sus entregas y actualizar contadores
            for (const route of routes) {
                const routeDeliveries = deliveries.filter(d => 
                    d.route && this.normalizeString(d.route) === this.normalizeString(route.name)
                );
                
                const completedDeliveries = routeDeliveries.filter(d => d.status === 'completed').length;
                
                const updatedRoute = {
                    ...route,
                    deliveries: routeDeliveries.length,
                    completed: completedDeliveries
                };
                
                try {
                    await DataManagerSupabase.updateRoute(updatedRoute);
                    updatedRoutes++;
                } catch (error) {
                    console.error(`Error actualizando ruta ${route.id}:`, error);
                }
            }
            
            console.log(`✅ ${updatedRoutes} rutas actualizadas`);
            
            if (window.UIManager) {
                UIManager.showNotification(`✅ ${updatedRoutes} rutas sincronizadas`, 'success');
            }
            
            // Recargar UI
            setTimeout(() => {
                if (window.loadDataFromSupabase) {
                    loadDataFromSupabase();
                }
            }, 1000);
            
            return { success: true, updatedRoutes };
            
        } catch (error) {
            console.error('Error sincronizando asignaciones:', error);
            return { success: false, error: error.message };
        }
    }
};

// Inicializar
document.addEventListener('DOMContentLoaded', function() {
    setTimeout(() => {
        if (window.DriverDeliveriesFixer) {
            console.log('✅ DriverDeliveriesFixer cargado');
            
            // Añadir funcionalidad global para diagnóstico rápido
            if (window.AuthManagerSupabase?.currentUser?.role === 'driver') {
                console.log('👤 Repartidor detectado, verificando entregas...');
                
                // Verificar después de 5 segundos si hay problemas
                setTimeout(async () => {
                    const diagnosis = await DriverDeliveriesFixer.diagnoseDriverDeliveries();
                    if (diagnosis && diagnosis.totalDriverDeliveries === 0) {
                        console.warn('⚠️ Repartidor sin entregas detectadas');
                        
                        // Mostrar notificación suave
                        if (window.UIManager) {
                            setTimeout(() => {
                                UIManager.showNotification(
                                    '🔍 No se detectaron entregas. Usa "Diagnóstico de Entregas" para resolverlo.',
                                    'warning'
                                );
                            }, 3000);
                        }
                    }
                }, 5000);
            }
        }
    }, 3000);
});

// Exportar para uso global
window.DriverDeliveriesFixer = DriverDeliveriesFixer;
window.showDriverDiagnosis = function() { DriverDeliveriesFixer.showDriverDiagnosisPanel(); };
window.fixDriverView = function() { DriverDeliveriesFixer.fixDriverView(); };
window.syncDriverAssignments = function() { DriverDeliveriesFixer.syncAllDriverAssignments(); };
