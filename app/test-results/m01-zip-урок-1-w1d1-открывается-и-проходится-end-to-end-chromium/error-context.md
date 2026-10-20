# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: m01-zip.spec.ts >> урок 1 (w1d1) открывается и проходится end-to-end
- Location: e2e/m01-zip.spec.ts:31:1

# Error details

```
Test timeout of 30000ms exceeded.
```

# Page snapshot

```yaml
- generic [ref=e3]:
  - banner [ref=e4]:
    - navigation "Главная навигация" [ref=e5]:
      - link "🏡 Домашние занятия" [ref=e6] [cursor=pointer]:
        - /url: "#/"
      - link "Прогресс" [ref=e7] [cursor=pointer]:
        - /url: "#/progress"
      - link "Настройки" [ref=e8] [cursor=pointer]:
        - /url: "#/settings"
  - main [ref=e9]:
    - generic [ref=e10]:
      - paragraph [aria-hidden] [ref=e11]: 🌟
      - heading "Занятие окончено" [level=1] [ref=e12]
      - paragraph [ref=e13]: Спасибо! Заметки сохранены на этом устройстве.
      - generic [ref=e14]:
        - link "К списку уроков" [ref=e15] [cursor=pointer]:
          - /url: "#/module/m01-start-3-4"
        - link "Посмотреть прогресс" [ref=e16] [cursor=pointer]:
          - /url: "#/progress"
  - contentinfo [ref=e17]: Занятия проходят дома, вместе с родителем. Без оценок и рейтингов.
```