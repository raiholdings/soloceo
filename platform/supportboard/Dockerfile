# Support Board (chat đa kênh) → chat.soloceo.vn
# Phần mềm thương mại chủ dự án đã mua license; self-host như WoWonder/LiveSmart.
FROM php:8.1-apache

# Extensions Support Board cần: mysqli, gd, zip, exif, intl (+ mod_rewrite, openssl có sẵn)
RUN set -eux; \
    apt-get update; \
    apt-get install -y --no-install-recommends \
        libpng-dev libjpeg-dev libfreetype6-dev libzip-dev libicu-dev libonig-dev unzip; \
    docker-php-ext-configure gd --with-freetype --with-jpeg; \
    docker-php-ext-install -j"$(nproc)" mysqli gd zip exif intl; \
    a2enmod rewrite headers; \
    rm -rf /var/lib/apt/lists/*

# PHP tuning cho upload/chat
RUN { \
      echo 'upload_max_filesize=64M'; \
      echo 'post_max_size=64M'; \
      echo 'memory_limit=512M'; \
      echo 'max_execution_time=120'; \
    } > /usr/local/etc/php/conf.d/supportboard.ini

# AllowOverride cho .htaccess (rewrite của Support Board)
RUN sed -ri 's/AllowOverride None/AllowOverride All/g' /etc/apache2/apache2.conf

# Mã nguồn (đã gộp addon vào apps/)
COPY script/ /var/www/html/

# Quyền ghi cho uploads/apps/config (installer ghi config.php + tải app)
RUN chown -R www-data:www-data /var/www/html \
 && find /var/www/html -type d -exec chmod 755 {} \; \
 && find /var/www/html -type f -exec chmod 644 {} \;

EXPOSE 80
