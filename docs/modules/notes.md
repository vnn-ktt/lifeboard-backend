# notes — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Приватные заметки, закрепление, ссылки на группы/цели и изображения из FilesModule.

Исходники: [модуль](../../src/notes/notes.module.ts), [сервис](../../src/notes/notes.service.ts).

## Публичные сервисы и функции

- `list(userId: string, query: ListNotesQueryDto = {}): Promise<NoteResponse[]>` — параметры и результат по TS-сигнатуре.
- `get(userId: string, id: string): Promise<NoteResponse>` — параметры и результат по TS-сигнатуре.
- `create(userId: string, input: CreateNoteDto): Promise<NoteResponse>` — параметры и результат по TS-сигнатуре.
- `update(userId: string, id: string, input: UpdateNoteDto): Promise<NoteResponse>` — параметры и результат по TS-сигнатуре.
- `remove(userId: string, id: string): Promise<void>` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

LifeNote.userId → User; goalId → LifeGoal; groupId → NoteGroup; imageFileId → StoredFile. Связи nullable и защищены composite FK владельца.

Сущность [`life-note`](../../src/notes/entities/life-note.entity.ts):

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `title` | `string` |
| `content` | `string` |
| `groupId` | `string \| null` |
| `goalId` | `string \| null` |
| `imageFileId` | `string \| null` |
| `pinned` | `boolean` |
| `createdAt` | `Date` |
| `updatedAt` | `Date` |



## Зависимости от других модулей

`common`; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: `NotFoundException`.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/notes
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
