# Скрипт для настройки отладочного репозитория PWA

Write-Host "=== Настройка отладочного репозитория PWA ===" -ForegroundColor Cyan
Write-Host ""

# Проверяем, что мы в правильной директории
if (-not (Test-Path ".git")) {
    Write-Host "ОШИБКА: Это не Git репозиторий!" -ForegroundColor Red
    exit 1
}

Write-Host "Шаг 1: Переключаемся на ветку debug-only..." -ForegroundColor Yellow
git checkout debug-only

Write-Host ""
Write-Host "Шаг 2: Добавляем remote для отладочного репозитория..." -ForegroundColor Yellow
git remote remove debug 2>$null
git remote add debug https://github.com/Reader79/pwa-app-debug.git

Write-Host ""
Write-Host "Шаг 3: Загружаем код в отладочный репозиторий..." -ForegroundColor Yellow
Write-Host "ВАЖНО: Убедитесь, что репозиторий pwa-app-debug создан на GitHub!" -ForegroundColor Red
Write-Host "Перейдите на https://github.com/new и создайте репозиторий 'pwa-app-debug'" -ForegroundColor Red
Write-Host ""

$confirm = Read-Host "Репозиторий pwa-app-debug создан на GitHub? (y/n)"
if ($confirm -ne "y") {
    Write-Host "Прервано. Создайте репозиторий и запустите скрипт снова." -ForegroundColor Yellow
    exit 0
}

Write-Host ""
Write-Host "Загружаем код..." -ForegroundColor Yellow
git push debug debug-only:main -f

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "=== УСПЕШНО! ===" -ForegroundColor Green
    Write-Host ""
    Write-Host "Следующие шаги:" -ForegroundColor Cyan
    Write-Host "1. Перейдите на https://github.com/Reader79/pwa-app-debug/settings/pages" -ForegroundColor White
    Write-Host "2. В Source выберите Branch: main, Folder: / (root)" -ForegroundColor White
    Write-Host "3. Нажмите Save" -ForegroundColor White
    Write-Host ""
    Write-Host "Отладочная версия будет доступна по адресу:" -ForegroundColor Cyan
    Write-Host "https://reader79.github.io/pwa-app-debug/" -ForegroundColor Green
} else {
    Write-Host ""
    Write-Host "=== ОШИБКА ===" -ForegroundColor Red
    Write-Host "Не удалось загрузить код. Проверьте:" -ForegroundColor Yellow
    Write-Host "1. Репозиторий pwa-app-debug создан на GitHub" -ForegroundColor White
    Write-Host "2. У вас есть права доступа к репозиторию" -ForegroundColor White
    Write-Host "3. Git настроен с правильными credentials" -ForegroundColor White
}
