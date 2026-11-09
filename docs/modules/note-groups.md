# note-groups — модуль Lifeboard Backend 1.0.0

## Назначение и зона ответственности

Группировка заметок, цвет и связь группы с целью без каскадного удаления заметок при удалении группы.

Исходники: [модуль](../../src/note-groups/note-groups.module.ts), [сервис](../../src/note-groups/note-groups.service.ts).

## Публичные сервисы и функции

- `list(userId: string): Promise<NoteGroupResponse[]>` — параметры и результат по TS-сигнатуре.
- `create(userId: string, input: CreateNoteGroupDto): Promise<NoteGroupResponse>` — параметры и результат по TS-сигнатуре.
- `update(userId: string, id: string, input: UpdateNoteGroupDto): Promise<NoteGroupResponse>` — параметры и результат по TS-сигнатуре.
- `remove(userId: string, id: string): Promise<void>` — параметры и результат по TS-сигнатуре.

## Модели и схемы данных, связи

NoteGroup.userId → User; NoteGroup.goalId → LifeGoal (nullable), ON DELETE SET NULL. Notes.groupId → NoteGroup (nullable).

Сущность [`note-group`](../../src/note-groups/entities/note-group.entity.ts):

| Поле | Тип |
|---|---|
| `id` | `string` |
| `userId` | `string` |
| `goalId` | `string \| null` |
| `name` | `string` |
| `color` | `string` |
| `createdAt` | `Date` |



## Зависимости от других модулей

`common`; для хранения используется TypeORM/PostgreSQL, для HTTP — NestJS.

## Конфигурация и переменные окружения

Специфических ENV нет; общие переменные БД, cookie и CORS описаны в [README](../../README.md#конфигурация-env). Для изображений также используется конфигурация S3, но само хранилище управляется Storage/FilesModule.

## Обработка ошибок

Глобальное тело ошибки: `{ statusCode, code, message }`. `401` без сессии; `400` при ошибке DTO; `404` если связанный объект отсутствует либо принадлежит другому пользователю. Исключения реализации: `NotFoundException`.

## Пример использования

```bash
curl -i -b cookies.txt http://localhost:3000/api/v1/note-groups
```

Полный API и коды ответов: [README — API Reference](../../README.md#api-reference).
