<?php
/**
 * Plugin Name: Monitor y Notificador de Pedidos WooCommerce
 * Description: Monitorea nuevos pedidos en tiempo real y envía notificaciones emergentes al navegador.
 * Version: 1.0
 * Author: Brix Soluciones
 */

if ( ! defined( 'ABSPATH' ) ) exit; // Seguridad

// 1. Crear la página del menú
add_action( 'admin_menu', 'mnp_crear_menu' );
function mnp_crear_menu() {
    add_menu_page( 
        'Monitor de Pedidos', 
        'Monitor Pedidos', 
        'manage_woocommerce', 
        'monitor-pedidos-wc', 
        'mnp_pantalla_monitor', 
        'dashicons-bell', 
        56 
    );
}

// 2. Interfaz de la pantalla del monitor
function mnp_pantalla_monitor() {
    echo '<div class="wrap">';
    echo '<h1>Monitor de Pedidos en Tiempo Real</h1>';
    echo '<p><strong>Nota:</strong> Mantén esta pestaña (o cualquier otra del administrador de WordPress) abierta en segundo plano para recibir las notificaciones emergentes.</p>';
    echo '<button id="mnp-activar-notificaciones" class="button button-primary">Activar Permisos de Notificación</button>';
    echo '<div id="mnp-lista-pedidos" style="margin-top:20px; display:grid; gap:15px; max-width: 800px;"></div>';
    echo '</div>';
}

// 3. Cargar el script JavaScript en todo el panel de administración
add_action( 'admin_enqueue_scripts', 'mnp_encolar_scripts' );
function mnp_encolar_scripts() {
    wp_enqueue_script( 'mnp-script', plugin_dir_url( __FILE__ ) . 'monitor.js', array('jquery'), time(), true );
    
    // Pasamos variables de PHP a JavaScript (¡AQUÍ AGREGAMOS EL SONIDO!)
    wp_localize_script( 'mnp-script', 'mnp_ajax', array(
        'url'   => admin_url( 'admin-ajax.php' ),
        'nonce' => wp_create_nonce( 'mnp_nonce' ),
        'icon'  => site_url( '/wp-content/uploads/woocommerce-placeholder.png' ),
        'sound' => plugin_dir_url( __FILE__ ) . 'alerta.mp3' // Ruta del archivo de audio
    ));
}

// 4. Endpoint AJAX para buscar los pedidos más recientes
add_action( 'wp_ajax_mnp_check_orders', 'mnp_check_orders' );
function mnp_check_orders() {
    check_ajax_referer( 'mnp_nonce', 'nonce' );

    $last_id = isset($_POST['last_id']) ? intval($_POST['last_id']) : 0;
    $args = array(
        'limit'   => 10,
        'orderby' => 'id',
        'order'   => 'DESC',
    );
    $latest_orders = wc_get_orders( $args );

    if ( $last_id === 0 ) {
        $new_last_id = !empty($latest_orders) ? $latest_orders[0]->get_id() : 0;
        wp_send_json_success( array( 'last_id' => $new_last_id, 'orders' => [] ) );
    }

    $orders_data = array();
    $new_last_id = $last_id;

    foreach ( $latest_orders as $order ) {
        if ( $order->get_id() > $last_id ) {
            
            // 1. Armar la lista de productos comprados
            $items_html = '<ul style="margin: 5px 0; padding-left: 20px;">';
            foreach( $order->get_items() as $item ) {
                $items_html .= '<li><strong>' . $item->get_quantity() . 'x</strong> ' . $item->get_name() . '</li>';
            }
            $items_html .= '</ul>';

            // 2. Obtener la dirección (de envío, si no hay, de facturación)
            $direccion = $order->get_formatted_shipping_address() ? $order->get_formatted_shipping_address() : $order->get_formatted_billing_address();

            // 3. Guardar toda la data
            $orders_data[] = array(
                'id'       => $order->get_id(),
                'total'    => $order->get_total(),
                'status'   => wc_get_order_status_name( $order->get_status() ),
                'name'     => $order->get_billing_first_name() . ' ' . $order->get_billing_last_name(),
                'email'    => $order->get_billing_email(),
                'phone'    => $order->get_billing_phone(),
                'payment'  => $order->get_payment_method_title(),
                'address'  => wp_kses_post( $direccion ),
                'items'    => $items_html,
                'edit_url' => html_entity_decode( $order->get_edit_order_url() )
            );
            
            if ( $order->get_id() > $new_last_id ) {
                $new_last_id = $order->get_id();
            }
        }
    }

    wp_send_json_success( array( 'last_id' => $new_last_id, 'orders' => $orders_data ) );
}