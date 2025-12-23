# Развертывание на GitHub Pages

## Первоначальная настройка

### 1. Установите npm пакеты (уже сделано)
```bash
npm install
```

### 2. Настройте GitHub (если ещё не настроено)
```bash
git config user.name "ssoossTX"
git config user.email "your-email@example.com"
```

## Развертывание

### Команда для развертывания:
```bash
npm run deploy
```

Эта команда:
1. Подготовит текущую директорию проекта
2. Создаст/обновит ветку `gh-pages`
3. Загрузит всё содержимое на GitHub
4. Активирует GitHub Pages для проекта

## Результат

После выполнения команды игра будет доступна по адресу:
**https://ssoossTX.github.io/trp/**

## Проверка в GitHub

1. Перейдите в репозиторий на GitHub
2. Settings → Pages
3. Branch должна быть `gh-pages`
4. Folder должна быть `/ (root)`

## Обновление после изменений

После каждого изменения кода просто запустите:
```bash
npm run deploy
```

Изменения появятся на GitHub Pages в течение пары минут.

## Дополнительные команды

```bash
npm start          # Запустить локальный сервер (python3 -m http.server 8000)
npm run deploy     # Развернуть на GitHub Pages
```

---

**Примечание:** Первый запуск может занять до 10 минут из-за инициализации GitHub Pages.
