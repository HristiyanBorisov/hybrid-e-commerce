<?php

namespace Tests\Feature\Admin;

use App\Enums\OrderStatus;
use App\Events\OrderUpdated;
use App\Models\Order;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

/** Live notifications for the admin panel: Laravel Echo listens to the private "admin" channel through Reverb. */
final class LiveNotificationsTest extends TestCase
{
    use RefreshDatabase;

    /** What Echo sends to /broadcasting/auth to join the private "admin" channel */
    private const JOIN_ADMIN_CHANNEL = ['socket_id' => '1234.5678', 'channel_name' => 'private-admin'];

    protected function setUp(): void
    {
        parent::setUp();

        // The tests run with the "null" broadcaster; deciding who may join a channel needs the real one (no network
        // involved). Channels belong to the broadcaster in use, so they're registered again for this one.
        config([
            'broadcasting.default' => 'reverb',
            'broadcasting.connections.reverb.key' => 'test-key',
            'broadcasting.connections.reverb.secret' => 'test-secret',
            'broadcasting.connections.reverb.app_id' => 'test-app',
        ]);
        require base_path('routes/channels.php');
    }

    // One user per test: the login guard keeps the first user it finds for the rest of a test

    public function test_admins_may_listen_to_the_admin_channel(): void
    {
        $this->actingAsAdmin()->post('/broadcasting/auth', self::JOIN_ADMIN_CHANNEL)->assertOk()->assertJsonStructure(['auth']);
    }

    public function test_customers_may_not_listen_to_the_admin_channel(): void
    {
        $this->actingAsCustomer()->post('/broadcasting/auth', self::JOIN_ADMIN_CHANNEL)->assertForbidden();
    }

    public function test_guests_may_not_listen_to_the_admin_channel(): void
    {
        $this->post('/broadcasting/auth', self::JOIN_ADMIN_CHANNEL)->assertForbidden();
    }

    public function test_admin_pages_carry_the_public_key_and_the_login_page_does_not(): void
    {
        $this->actingAsAdmin()->get('/admin')->assertSee('<meta name="reverb-key" content="test-key">', escape: false);
        $this->get('/admin/login')->assertDontSee('reverb-key');
    }

    public function test_the_notification_describes_the_order_as_it_is_when_sent(): void
    {
        $order = Order::factory()->status(OrderStatus::Shipped)->withItems([1999, 2])->create(['customer_name' => 'Alice']);
        $event = new OrderUpdated($order->id, isNew: false);

        $this->assertSame('private-admin', $event->broadcastOn()[0]->name);
        $this->assertSame('order.updated', $event->broadcastAs());
        $this->assertSame([
            'id' => $order->id,
            'isNew' => false,
            'customerName' => 'Alice',
            'status' => 'Shipped',
            'total' => '39.98',
            'url' => url("/admin/orders/{$order->id}"),
        ], $event->broadcastWith());
    }
}
