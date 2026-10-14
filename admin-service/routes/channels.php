<?php

use App\Broadcasting\AdminChannel;
use Illuminate\Support\Facades\Broadcast;

/*
| Private channels of the admin panel's live notifications (Laravel Echo + Reverb).
| A browser may listen only after /broadcasting/auth said yes — here.
*/

Broadcast::channel('admin', AdminChannel::class);
