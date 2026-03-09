<?php
/**
 * Your Instagram Access Token
 * How to get user id - http://jelled.com/instagram/lookup-user-id
 * How to generate access token - http://instagram.pixelunion.net/
 */

// User ID
define('USER_ID', '3177898544');

// Consumer Key
define('ACCESS_TOKEN', '3177898544.1677ed0.5c0af6fd788f4cdcbd90ee93364fbe05');

// Cache Settings
define('CACHE_ENABLED', true);
define('CACHE_LIFETIME', 3600); // in seconds
define('HASH_SALT', md5(dirname(__FILE__)));
