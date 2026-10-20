#!/bin/sh
set -eu

: "${APP_KEY:?APP_KEY must be set in the Portainer stack environment}"
: "${DB_DATABASE:=/var/www/html/storage/app/maisonet.sqlite}"
export DB_DATABASE

mkdir -p storage/app/public storage/framework/cache/data storage/framework/sessions storage/framework/views storage/logs bootstrap/cache
[ -L public/storage ] || php artisan storage:link
first_start=0
if [ ! -s "$DB_DATABASE" ]; then
    touch "$DB_DATABASE"
    first_start=1
fi

php artisan migrate --force
if [ "$first_start" = 1 ]; then
    php artisan db:seed --class=HouseholdSeeder --force
fi
php artisan config:cache
php artisan route:cache
php artisan view:cache
chown -R www-data:www-data storage bootstrap/cache

exec "$@"
