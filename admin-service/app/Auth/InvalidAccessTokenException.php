<?php

namespace App\Auth;

use RuntimeException;

/** The login token is expired, forged, malformed or from someone else. */
final class InvalidAccessTokenException extends RuntimeException {}
