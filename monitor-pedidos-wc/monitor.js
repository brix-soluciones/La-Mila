jQuery(document).ready(function($) {
    let lastOrderId = 0;
    
    let sonidoVenta = new Audio(mnp_ajax.sound);

    $('#mnp-activar-notificaciones').on('click', function(e) {
        e.preventDefault();
        
        sonidoVenta.play().then(() => {
            sonidoVenta.pause();
            sonidoVenta.currentTime = 0;
        }).catch(err => console.log("Audio en espera."));

        if ("Notification" in window) {
            Notification.requestPermission().then(function(permission) {
                if (permission === "granted") {
                    alert("¡Permisos concedidos! El sistema está activo.");
                }
            });
        }
    });

    function fetchNewOrders() {
        $.ajax({
            url: mnp_ajax.url,
            type: 'POST',
            data: {
                action: 'mnp_check_orders',
                nonce: mnp_ajax.nonce,
                last_id: lastOrderId
            },
            success: function(response) {
                if (response.success) {
                    let data = response.data;

                    if (lastOrderId !== 0 && data.orders.length > 0) {
                        
                        sonidoVenta.play().catch(e => console.log("Sonido bloqueado"));

                        data.orders.reverse().forEach(function(order) {
                            mostrarEnPantalla(order);      // Muestra en la lista principal
                            lanzarNotificacion(order);     // Intenta lanzar la de Windows/Mac
                            lanzarVentanitaFlotante(order); // ¡NUEVA! Lanza el pop-up dentro de WordPress
                        });
                    }
                    lastOrderId = data.last_id;
                }
            }
        });
    }

    // Ventanita nativa de Windows/Mac (Para cuando estás en YouTube/Otras webs)
    function lanzarNotificacion(order) {
        if ("Notification" in window && Notification.permission === "granted") {
            let notificacion = new Notification("¡Venta de $" + order.total + "!", {
                body: "Pedido #" + order.id + " de " + order.name,
                icon: mnp_ajax.icon 
            });
            notificacion.onclick = function() {
                window.focus();
                window.location.href = order.edit_url;
            };
        }
    }

   // ¡NUEVA! Ventanita flotante XL con toda la info del pedido
    function lanzarVentanitaFlotante(order) {
        let toast = $(`
            <div style="position: fixed; bottom: 30px; right: 30px; background: #ffffff; border: 1px solid #ccd0d4; border-top: 6px solid #46b450; padding: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.3); z-index: 999999; border-radius: 6px; width: 350px; font-family: sans-serif; color: #3c434a;">
                
                <div style="display: flex; justify-content: space-between; align-items: center; border-bottom: 1px solid #f0f0f1; padding-bottom: 10px; margin-bottom: 10px;">
                    <h3 style="margin: 0; color: #1d2327; font-size: 18px;">🛒 Pedido #${order.id}</h3>
                    <span class="mnp-cerrar" style="cursor:pointer; font-size: 22px; color: #a0a5aa; line-height: 1;">&times;</span>
                </div>
                
                <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>👤 Cliente:</strong> ${order.name}</p>
                <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>📞 Teléfono:</strong> ${order.phone || 'No especificado'}</p>
                <p style="margin: 0 0 8px 0; font-size: 14px;"><strong>💳 Pago:</strong> ${order.payment}</p>
                
                <div style="background: #f6f7f7; padding: 10px; margin: 10px 0; border-radius: 4px;">
                    <strong style="font-size: 14px;">📍 Dirección:</strong>
                    <p style="margin: 5px 0 0 0; font-size: 13px;">${order.address || 'Retiro en local / Sin dirección'}</p>
                </div>

                <div style="margin: 10px 0; max-height: 150px; overflow-y: auto;">
                    <strong style="font-size: 14px;">📦 Productos:</strong>
                    <div style="font-size: 13px;">${order.items}</div>
                </div>

                <div style="border-top: 1px solid #f0f0f1; padding-top: 15px; margin-top: 10px; display: flex; justify-content: space-between; align-items: center;">
                    <strong style="font-size: 18px; color: #1d2327;">Total: $${order.total}</strong>
                    <a href="${order.edit_url}" style="background: #007cba; color: #fff; text-decoration: none; padding: 6px 12px; border-radius: 3px; font-size: 13px; font-weight: bold;">Ver Pedido</a>
                </div>
            </div>
        `);

        // Acción para el botón de cerrar la ventanita
        toast.find('.mnp-cerrar').on('click', function() {
            toast.fadeOut(300, function() { $(this).remove(); });
        });

        // Insertar en la página
        $('body').append(toast);

        // Desaparece sola después de 60 segundos (60000 ms)
        setTimeout(function() {
            toast.fadeOut(500, function() { $(this).remove(); });
        }, 60000);
    }

    // Muestra en la tabla de la página del plugin
    function mostrarEnPantalla(order) {
        let contenedor = $("#mnp-lista-pedidos");
        if (contenedor.length) {
            let html = `
            <div style="background:#fff; border-left:4px solid #007cba; padding:15px; box-shadow:0 1px 3px rgba(0,0,0,.1); border-radius:3px;">
                <h3 style="margin-top:0;">Pedido #${order.id} - ${order.name}</h3>
                <p style="margin: 5px 0;"><strong>Total:</strong> $${order.total} | <strong>Estado:</strong> ${order.status}</p>
                <a href="${order.edit_url}" class="button">Ver Detalles</a>
            </div>`;
            contenedor.prepend(html);
        }
    }

    setInterval(fetchNewOrders, 15000);
    fetchNewOrders();
});