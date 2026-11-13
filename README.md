# Шар, вписанный в правильную пирамиду

Интерактивная 3D-страница: https://dyakova.showalove.ru

## Обновление сайта

Сайт публикуется автоматически через GitHub Pages из корня ветки `main`.
Измените `index.html` и сохраните изменения в `main`; после успешного
развёртывания GitHub Pages сайт обновится. Статус публикации виден во вкладке
Actions, настройки — в Settings → Pages.

`CNAME` задаёт адрес `dyakova.showalove.ru`; `.nojekyll` отключает обработку Jekyll.
Сборка и установка зависимостей не требуются.

DNS: `dyakova.showalove.ru` → CNAME `michaelyosta.github.io` (Cloudflare, DNS only).
Сохраняйте файлы `CNAME` и `.nojekyll` при обновлении страницы.
HTML опубликован без изменений относительно исходного файла.

## Локальный просмотр

```bash
python3 -m http.server 8000
```

Откройте http://localhost:8000. Для 3D-графики нужны WebGL и доступ к jsDelivr,
откуда загружаются Three.js 0.128.0 и OrbitControls.
