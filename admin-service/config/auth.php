<?php

/*
| Users live in the API gateway (the central user service), not in this app's database.
| The only guard reads the login cookie the gateway issues and checks it with the gateway's public key
| (App\Auth\JwtCookieAuthenticator, registered in AppServiceProvider). There are no passwords, password
| resets or user tables here.
*/

return [

    'defaults' => [
        'guard' => 'gateway',
    ],

    'guards' => [
        'gateway' => [
            'driver' => 'jwt-cookie',
        ],
    ],

];
