<?php

return [
    // Mobile API uses bearer tokens only. Web and kiosk keep their existing sessions.
    'guard' => [],
    'stateful' => [],
    'expiration' => 43200,
    'token_prefix' => 'maisonet_',
];
