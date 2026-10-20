// Модуль 1 «Старт 3–4» (m01-start-3-4) — Этап 4.
// 12 уроков в формате scene. Черновики parentScript — на согласование автору методики.
// Типы шагов v1: instruction, picture-choice, count, offline-task, reflection.
// match / feature-choice / trace-point в v1 не используются (заглушки ядра).

import type { Lesson } from '../../core/schema';

const MODULE_ID = 'm01-start-3-4';

function lesson(id: string, title: string, steps: Lesson['steps'], materials: Lesson['materials'] = [], tips: string[] = []): Lesson {
  return {
    lessonVersion: 1,
    id,
    moduleId: MODULE_ID,
    title,
    ageRange: { from: 3, to: 4 },
    estimatedMinutes: 10,
    tips,
    materials,
    steps,
  };
}

export const LESSONS: Lesson[] = [
  /* 1. w1d1-sort-by-color — «Лунтик и разноцветные лепестки» */
  lesson(
    'w1d1-sort-by-color',
    'Лунтик и разноцветные лепестки',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Расскажите ребёнку: «Это Лунтик. Он собрал лепестки, но они перемешались. Давай поможем ему разложить красные и синие лепестки по кучкам». Покажите картинку.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/flowers#petal-red', at: { x: 35, y: 60 }, repeat: { count: 3, layout: 'row', gap: 12 } },
            { sprite: 'objects/flowers#petal-blue', at: { x: 68, y: 60 }, repeat: { count: 3, layout: 'row', gap: 12 } },
          ],
          character: { emotion: 'hello', gesture: 'wave', anchor: { x: 50, y: 28 } },
        },
      },
      {
        id: 's2',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Разложи лепестки',
        parentScript:
          'Достаньте бумажные или игрушечные лепестки двух цветов. Попросите ребёнка разложить их в две кучки: красные — сюда, синие — туда. Хвалите за каждую попытку, не исправляйте строго.',
        actionText: 'Ребёнок разложил лепестки на две кучки по цвету',
        checklist: ['Показали обе кучки', 'Назвали цвета вслух', 'Не торопили ребёнка'],
      },
      {
        id: 's3',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где красный лепесток?',
        parentScript:
          'Спросите: «Покажи, где красный лепесток». Дайте ребёнку самому нажать на картинку. Если ошибётся — мягко вернитесь к кучкам с настоящими лепестками.',
        options: [
          { id: 'red', label: 'Красный лепесток', alt: 'Красный лепесток', correct: true,
            scene: { layers: [{ sprite: 'objects/flowers#petal-red', at: { x: 50, y: 50 }, scale: 1.6 }] } },
          { id: 'blue', label: 'Синий лепесток', alt: 'Синий лепесток', correct: false, alt: 'Синий лепесток',
            scene: { layers: [{ sprite: 'objects/flowers#petal-blue', at: { x: 50, y: 50 }, scale: 1.6 }] } },
        ],
      },
      {
        id: 's4',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько красных лепестков?',
        parentScript:
          'Покажите ряд лепестков. Посчитайте вслух вместе с ребёнком: «Один, два, три». Спросите: «Сколько всего красных лепестков?» Пусть ребёнок выберет цифру.',
        items: { sprite: 'objects/flowers#petal-red', count: 3, scale: 1 },
        answer: 3,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/flowers#petal-red', at: { x: 50, y: 55 }, repeat: { count: 3, layout: 'row', gap: 15 } },
          ],
        },
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        prompt: 'Итоги занятия',
        parentScript:
          'Обсудите: что получилось лучше всего, что было сложно. Запишите наблюдения — без оценок, просто как есть. Лунтик говорит «Молодец!»',
        questions: ['Что ребёнку понравилось?', 'Что было трудным?', 'Понятны ли были инструкции вам?'],
        scene: {
          layers: [],
          character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 55 } },
        },
      },
    ],
    [{ name: 'Лепестки двух цветов (бумага/игрушечные)', icon: 'paper' }],
    ['Заранее вырежьте 6 лепестков двух цветов или используйте готовые.'],
  ),

  /* 2. w1d2-count-1-3 — «Лунтик и три ягодки» */
  lesson(
    'w1d2-count-1-3',
    'Лунтик и три ягодки',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик нашёл ягодки и хочет посчитать их вместе с тобой». Посчитайте ягодки на экране вслух, показывая пальцем по порядку: одна, две, три.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/dishes#bowl', at: { x: 50, y: 70 }, scale: 1.6 },
            { sprite: 'objects/fruits#apple-red', at: { x: 35, y: 45 } },
            { sprite: 'objects/fruits#apple-green', at: { x: 50, y: 42 } },
            { sprite: 'objects/fruits#apple-red', at: { x: 65, y: 45 } },
          ],
          character: { emotion: 'ask', gesture: 'rest', anchor: { x: 82, y: 45 } },
        },
      },
      {
        id: 's2',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько яблок в миске?',
        parentScript:
          'Спросите: «Сколько яблок лежит в миске?» Дайте ребёнку посчитать вслух и выбрать ответ.',
        items: { sprite: 'objects/fruits#apple-red', count: 3, scale: 1 },
        answer: 3,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/dishes#bowl', at: { x: 50, y: 70 }, scale: 1.6 },
            { sprite: 'objects/fruits#apple-red', at: { x: 50, y: 45 }, repeat: { count: 3, layout: 'row', gap: 12 } },
          ],
        },
      },
      {
        id: 's3',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Положи три ягодки',
        parentScript:
          'Попросите ребёнка положить в миску (или на тарелку) три любых мелких предмета: пуговицы, кубики, настоящие ягоды. Считайте вместе вслух: «Один, два, три».',
        actionText: 'Ребёнок положил в миску три предмета и посчитал их',
        checklist: ['Считал вслух', 'Показывал пальцем на каждый предмет', 'Проверил, что их ровно три'],
      },
      {
        id: 's4',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько яблок теперь?',
        parentScript:
          'Покажите одно яблоко. Спросите: «Сколько теперь?» Это шаг про число один — самый важный для понимания количества.',
        items: { sprite: 'objects/fruits#apple-green', count: 1, scale: 1 },
        answer: 1,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/fruits#apple-green', at: { x: 50, y: 55 }, scale: 1.4 },
          ],
        },
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript:
          'Отметьте: считает ли ребёнок до трёх с показом пальцем, путает ли «один» и «много». Это наблюдение, а не оценка.',
        questions: ['Считал ли до трёх сам?', 'Нужна была помощь с показом пальцем?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'rest', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Три мелких предмета и миска', icon: 'blocks' }],
  ),

  /* 3. w1d3-vowels-a-u-o — «Лунтик учится петь» */
  lesson(
    'w1d3-vowels-a-u-o',
    'Лунтик учится петь',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик учится петь гласные. Гласные поются долго: А-А-А, У-У-У, О-О-О». Пройдитесь по буквам на экране, каждая — с картинкой-подсказкой: Аист, Утка, Ослик. Поёте хором.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 22, y: 40 }, scale: 1.2 },
            { sprite: 'letters/cyrillic-upper#letter-У', at: { x: 50, y: 40 }, scale: 1.2 },
            { sprite: 'letters/cyrillic-upper#letter-О', at: { x: 78, y: 40 }, scale: 1.2 },
            { sprite: 'objects/animals#stork', at: { x: 22, y: 72 } },
            { sprite: 'objects/animals#duck', at: { x: 50, y: 72 } },
            { sprite: 'objects/animals#donkey', at: { x: 78, y: 72 } },
          ],
          character: { emotion: 'hello', gesture: 'wave', anchor: { x: 50, y: 15 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Кто пришёл к букве А?',
        parentScript:
          'Спросите: «Кто живёт под буквой А? Кто так кричит: А-А-А?» Пусть ребёнок выберет картинку. Подскажите звуком, если сомневается.',
        options: [
          { id: 'stork', label: 'Аист', alt: 'Аист', correct: true,
            scene: { layers: [{ sprite: 'objects/animals#stork', at: { x: 50, y: 50 }, scale: 1.6 }] } },
          { id: 'duck', label: 'Утка', alt: 'Утка', correct: false,
            scene: { layers: [{ sprite: 'objects/animals#duck', at: { x: 50, y: 50 }, scale: 1.6 }] } },
        ],
      },
      {
        id: 's3',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где буква У?',
        parentScript:
          'Прочитайте: «У-У-У, как крякает уточка». Попросите ребёнка найти букву У среди двух. Нажмите вместе.',
        options: [
          { id: 'o', label: 'Буква О', alt: 'Большая буква О', correct: false, correct: false,
            scene: { layers: [{ sprite: 'letters/cyrillic-upper#letter-О', at: { x: 50, y: 50 }, scale: 1.8 }] } },
          { id: 'u', label: 'Буква У', alt: 'Большая буква У', correct: true,
            scene: { layers: [{ sprite: 'letters/cyrillic-upper#letter-У', at: { x: 50, y: 50 }, scale: 1.8 }] } },
        ],
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Спой песенку',
        parentScript:
          'Попросите ребёнка протяжно спеть А, У, О. Показывайте карточки с буквами (или пальцем на экране), он поёт. Меняйтесь: вы поёте — он показывает букву.',
        actionText: 'Ребёнок спел гласные А, У, О и показал их на карточках',
        checklist: ['Потянул звуки', 'Показал каждую букву', 'Получилось весело'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Запишите, какую гласную ребёнок назвал легче всего, какая вызвала затруднение.',
        questions: ['Какая буква далась легче?', 'Какую путает?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Карточки с буквами А, У, О', icon: 'cards' }],
    ['Если есть карточки с буквами — приготовьте А, У, О.'],
  ),

  /* 4. w2d1-number-4 — «Лунтик строит домик» */
  lesson(
    'w2d1-number-4',
    'Лунтик строит домик',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик строит домик из кубиков. Давай посчитаем этажи: один, два, три, четыре». Показывайте пальцем снизу вверх по башне на экране.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'cubes/zaytsev#cube-gold', at: { x: 40, y: 78 } },
            { sprite: 'cubes/zaytsev#cube-blue', at: { x: 40, y: 62 } },
            { sprite: 'cubes/zaytsev#cube-green', at: { x: 40, y: 46 } },
            { sprite: 'cubes/zaytsev#cube-gray', at: { x: 40, y: 30 } },
          ],
          character: { emotion: 'think', gesture: 'reach', anchor: { x: 72, y: 45 } },
        },
      },
      {
        id: 's2',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько кубиков в башне?',
        parentScript:
          'Спросите: «Сколько кубиков построил Лунтик?» Считайте вместе, потом пусть ребёнок выберет цифру.',
        items: { sprite: 'cubes/zaytsev#cube-gold', count: 4, scale: 1 },
        answer: 4,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'cubes/zaytsev#cube-gold', at: { x: 50, y: 55 }, repeat: { count: 4, layout: 'row', gap: 12 } },
          ],
        },
      },
      {
        id: 's3',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Покажите разложение: «Четыре — это два и ещё два». Слева два кубика, справа два кубика, между ними знак плюс. Пересчитайте всё вместе: получилось четыре.',
        scene: {
          background: 'white',
          layers: [
            { sprite: 'cubes/zaytsev#cube-blue', at: { x: 28, y: 55 }, repeat: { count: 2, layout: 'row', gap: 8 } },
            { sprite: 'symbols/math#plus', at: { x: 50, y: 55 }, scale: 0.8 },
            { sprite: 'cubes/zaytsev#cube-green', at: { x: 72, y: 55 }, repeat: { count: 2, layout: 'row', gap: 8 } },
          ],
        },
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Построй башню из четырёх',
        parentScript:
          'Дайте ребёнку кубики (или палочки). Задание: построить башню ровно из четырёх. Сначала пусть посчитает вслух, потом проверит ещё раз сверху вниз.',
        actionText: 'Ребёнок построил башню из четырёх кубиков',
        checklist: ['Считал при постройке', 'Проверил результат', 'Башня не упала до подсчёта'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Отметьте: понимает ли ребёнок, что «четыре» получается «два и два».',
        questions: ['Собрал ли башню сам?', 'Увидел ли связь 2+2=4?'],
        scene: { layers: [], character: { emotion: 'help', gesture: 'wave', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Кубики (не менее 4)', icon: 'blocks' }],
  ),

  /* 5. w2d2-slog-ma — «Лунтик ищет маму» */
  lesson(
    'w2d2-slog-ma',
    'Лунтик ищет маму',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик потерялся и зовёт маму. Давай научимся складывать звук: М + А = МА». Произнесите М коротко («м»), затем А певуче, потом слитно «МА». Повторите три раза вместе.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'letters/cyrillic-upper#letter-М', at: { x: 30, y: 55 }, scale: 1.3 },
            { sprite: 'symbols/math#plus', at: { x: 48, y: 55 }, scale: 0.8 },
            { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 64, y: 55 }, scale: 1.3 },
            { sprite: 'symbols/math#equals', at: { x: 80, y: 55 }, scale: 0.8 },
          ],
          character: { emotion: 'ask', gesture: 'reach', anchor: { x: 50, y: 25 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Из каких букв слог МА?',
        parentScript:
          'Спросите: «Из каких букв состоит МА?» Дайте ребёнку выбрать пару букв. Первая — М, вторая — А.',
        options: [
          { id: 'ma', label: 'М и А', alt: 'Буквы М и А', correct: true,
            scene: { layers: [
              { sprite: 'letters/cyrillic-upper#letter-М', at: { x: 35, y: 50 }, scale: 1.4 },
              { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 65, y: 50 }, scale: 1.4 },
            ] } },
          { id: 'pa', label: 'П и А', alt: 'Буквы П и А', correct: false,
            scene: { layers: [
              { sprite: 'letters/cyrillic-upper#letter-П', at: { x: 35, y: 50 }, scale: 1.4 },
              { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 65, y: 50 }, scale: 1.4 },
            ] } },
        ],
      },
      {
        id: 's3',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Выложи слог МА',
        parentScript:
          'Из кубиков Зайцева (или магнитных/бумажных букв) выложите вместе с ребёнком слог МА. Ребёнок кладёт буквы слева направо и читает вслух: «МА».',
        actionText: 'Ребёнок выложил слог МА из букв/кубиков и прочитал его',
        checklist: ['Выложил сам', 'Прочитал вслух', 'Не перепутал порядок букв'],
      },
      {
        id: 's4',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Поиграйте: вы произносите «МА», ребёнок хлопает в ладоши. Потом наоборот: ребёнок говорит «МА» — хлопаете вы. Медленно и быстро, смешно и без ошибок — это игра, не экзамен.',
        scene: { layers: [], character: { emotion: 'happy', gesture: 'wave', anchor: { x: 50, y: 55 } } },
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Запишите: сливает ли ребёнок два звука в слог, или пока называет буквы отдельно.',
        questions: ['Слил М и А в «МА»?', 'Интересна ли была игра с хлопками?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'rest', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Кубики/карточки с буквами', icon: 'blocks' }],
    ['Кубики Зайцева с буквами М и А или любые буквы-карточки.'],
  ),

  /* 6. w2d3-abacus-intro — «Лунтик и домик чисел» */
  lesson(
    'w2d3-abacus-intro',
    'Лунтик и домик чисел',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Это счётные палочки. На каждой палочке — бусинки, как в домике чисел». Покажите экран. Отсчитайте вместе три бусинки: «одна, две, три».',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'numbers/digits#digit-3', at: { x: 35, y: 55 }, scale: 1.6 },
            { sprite: 'symbols/math#equals', at: { x: 52, y: 55 }, scale: 0.8 },
            { sprite: 'icons/materials#icon-abacus', at: { x: 70, y: 55 }, scale: 1.4 },
          ],
          character: { emotion: 'think', gesture: 'rest', anchor: { x: 50, y: 22 } },
        },
      },
      {
        id: 's2',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько бусинок на палочке?',
        parentScript: 'Спросите: «Сколько бусинок?» Считайте вслух, ребёнок выбирает цифру.',
        items: { sprite: 'objects/shapes#circle-blue', count: 3, scale: 1 },
        answer: 3,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/shapes#circle-blue', at: { x: 50, y: 55 }, repeat: { count: 3, layout: 'row', gap: 12 } },
          ],
        },
      },
      {
        id: 's3',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Отсчитай три палочки',
        parentScript:
          'Дайте ребёнку палочки (счётные, карандаши, спички). Задание: отсчитать ровно три и положить перед собой. Пусть посчитает их ещё раз, показывая пальцем.',
        actionText: 'Ребёнок отсчитал три палочки',
        checklist: ['Отсчитал сам', 'Пересчитал с показом', 'Не взял «на глаз»'],
      },
      {
        id: 's4',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Отметьте: соотносит ли ребёнок количество с цифрой 3.',
        questions: ['Узнал ли цифру 3?', 'Отсчитал ли три предмета верно?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Счётные палочки или карандаши', icon: 'sticks' }],
  ),

  /* 7. w3d1-big-small — «Лунтик и его друзья» */
  lesson(
    'w3d1-big-small',
    'Лунтик и его друзья',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Это кот — большой, а это кружок — маленький. Покажи пальцем большого и маленького». Обведите фигуры руками: большую — широко, маленькую — щипком.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/animals#cat', at: { x: 32, y: 58 }, scale: 1.8 },
            { sprite: 'objects/shapes#circle-red', at: { x: 68, y: 58 }, scale: 0.5 },
          ],
          character: { emotion: 'hello', gesture: 'reach', anchor: { x: 50, y: 25 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где большой круг?',
        parentScript: 'Спросите: «Покажи большой круг». Оба круга красного цвета — разница только в размере.',
        options: [
          { id: 'big', label: 'Большой круг', alt: 'Большой красный круг', correct: true,
            scene: { layers: [{ sprite: 'objects/shapes#circle-red', at: { x: 50, y: 50 }, scale: 2.2 }] } },
          { id: 'small', label: 'Маленький круг', alt: 'Маленький красный круг', correct: false, alt: 'Маленький красный круг',
            scene: { layers: [{ sprite: 'objects/shapes#circle-red', at: { x: 50, y: 50 }, scale: 0.6 }] } },
        ],
      },
      {
        id: 's3',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где маленький квадрат?',
        parentScript: 'Теперь наоборот: «Покажи маленький квадрат». Не торопите — дайте сравнить глазами.',
        options: [
          { id: 'small', label: 'Маленький квадрат', alt: 'Маленький синий квадрат', correct: true,
            scene: { layers: [{ sprite: 'objects/shapes#square-blue', at: { x: 50, y: 50 }, scale: 0.6 }] } },
          { id: 'big', label: 'Большой квадрат', alt: 'Большой синий квадрат', correct: false, alt: 'Большой синий квадрат',
            scene: { layers: [{ sprite: 'objects/shapes#square-blue', at: { x: 50, y: 50 }, scale: 2.2 }] } },
        ],
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Найди дома большого и маленького',
        parentScript:
          'Прогулка по комнате: найдите вместе два одинаковых предмета разного размера — большую и маленькую чашку, большой и маленький мячик. Ребёнок приносит оба и ставит рядом.',
        actionText: 'Ребёнок принёс два одинаковых предмета разного размера',
        checklist: ['Нашёл пару', 'Показал, где больше', 'Сравнил, поставив рядом'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Запишите: сравнивает ли ребёнок размеры предметов в быту.',
        questions: ['Легко ли находил большое/маленькое?', 'Путает ли понятия?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'wave', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Два парных предмета разного размера', icon: 'ball' }],
  ),

  /* 8. w3d2-number-5 — «Лунтик и волшебная пятёрка» */
  lesson(
    'w3d2-number-5',
    'Лунтик и волшебная пятёрка',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Пять — это четыре и ещё один». Покажите экран: слева четыре палочки, справа одна, вместе — пять. Пересчитайте все вместе.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'icons/materials#icon-sticks', at: { x: 30, y: 55 }, repeat: { count: 4, layout: 'row', gap: 6 }, scale: 0.8 },
            { sprite: 'symbols/math#plus', at: { x: 52, y: 55 }, scale: 0.8 },
            { sprite: 'icons/materials#icon-sticks', at: { x: 66, y: 55 }, scale: 0.8 },
            { sprite: 'symbols/math#equals', at: { x: 78, y: 55 }, scale: 0.8 },
            { sprite: 'numbers/digits#digit-5', at: { x: 90, y: 55 }, scale: 1.2 },
          ],
          character: { emotion: 'hello', gesture: 'up', anchor: { x: 15, y: 30 } },
        },
      },
      {
        id: 's2',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько палочек всего?',
        parentScript: 'Спросите: «Сколько стало палочек?» Считают по порядку, ребёнок выбирает цифру.',
        items: { sprite: 'icons/materials#icon-sticks', count: 5, scale: 1 },
        answer: 5,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'icons/materials#icon-sticks', at: { x: 50, y: 55 }, repeat: { count: 5, layout: 'grid', gap: 8 } },
          ],
        },
      },
      {
        id: 's3',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Второе разложение: «Пять — это ещё и три и два». Покажите: слева три палочки, справа две. Пересчитайте части и целое.',
        scene: {
          background: 'white',
          layers: [
            { sprite: 'icons/materials#icon-sticks', at: { x: 30, y: 55 }, repeat: { count: 3, layout: 'row', gap: 6 }, scale: 0.8 },
            { sprite: 'symbols/math#plus', at: { x: 50, y: 55 }, scale: 0.8 },
            { sprite: 'icons/materials#icon-sticks', at: { x: 70, y: 55 }, repeat: { count: 2, layout: 'row', gap: 6 }, scale: 0.8 },
          ],
        },
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Разложи пять на две кучки',
        parentScript:
          'Дайте ребёнку пять палочек. Задание: разложить на две кучки как хочет, потом назвать: «тут три, тут два — вместе пять». Повторить с другим разложением (4+1).',
        actionText: 'Ребёнок разложил пять палочек на две кучки и назвал состав числа',
        checklist: ['Разложил сам', 'Назвал обе части', 'Сказал, что вместе пять'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Отметьте: какой состав числа 5 ребёнок назвал легче всего.',
        questions: ['Запомнил ли 4+1?', 'Интересно ли было раскладывать самому?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Пять счётных палочек', icon: 'sticks' }],
  ),

  /* 9. w3d3-slogi-sa-pa-ma — «Лунтик и потерянные сапоги» */
  lesson(
    'w3d3-slogi-sa-pa-ma',
    'Лунтик и потерянные сапоги',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик собирает слова из слогов. СА — сапоги, ПА — панама, МА — мама». Прочитайте каждый слог и покажите картинку. Повторите хором: СА, ПА, МА.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'letters/cyrillic-upper#letter-С', at: { x: 20, y: 35 }, scale: 1.1 },
            { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 32, y: 35 }, scale: 1.1 },
            { sprite: 'letters/cyrillic-upper#letter-П', at: { x: 50, y: 35 }, scale: 1.1 },
            { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 62, y: 35 }, scale: 1.1 },
            { sprite: 'letters/cyrillic-upper#letter-М', at: { x: 78, y: 35 }, scale: 1.1 },
            { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 90, y: 35 }, scale: 1.1 },
            { sprite: 'objects/shapes#triangle-blue', at: { x: 26, y: 70 } },
            { sprite: 'objects/flowers#flower-simple', at: { x: 56, y: 70 } },
            { sprite: 'objects/animals#donkey', at: { x: 84, y: 70 } },
          ],
          character: { emotion: 'ask', gesture: 'rest', anchor: { x: 12, y: 70 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Что начинается на СА?',
        parentScript:
          'Спросите: «СА-СА-СА… что это может быть?» Правильный ответ — сапоги (нарисуем их карандашом). Если ребёнок выберет другое — произнесите слово целиком вместе: «са-поги, СА».',
        options: [
          { id: 'sa', label: 'Сапоги (рисуем)', alt: 'Треугольник — рисуем сапоги', correct: true,
            scene: { layers: [{ sprite: 'objects/shapes#triangle-blue', at: { x: 50, y: 50 }, scale: 1.6 }] } },
          { id: 'os', label: 'Ослик', alt: 'Ослик', correct: false,
            scene: { layers: [{ sprite: 'objects/animals#donkey', at: { x: 50, y: 50 }, scale: 1.6 }] } },
        ],
      },
      {
        id: 's3',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где слог ПА?',
        parentScript: 'Попросите ребёнка найти слоги ПА среди карточек. Нажмите вместе нужную.',
        options: [
          { id: 'pa', label: 'ПА', alt: 'Слог из букв П и А', correct: true,
            scene: { layers: [
              { sprite: 'letters/cyrillic-upper#letter-П', at: { x: 38, y: 50 }, scale: 1.4 },
              { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 62, y: 50 }, scale: 1.4 },
            ] } },
          { id: 'sa', label: 'СА', alt: 'Слог из букв С и А', correct: false,
            scene: { layers: [
              { sprite: 'letters/cyrillic-upper#letter-С', at: { x: 38, y: 50 }, scale: 1.4 },
              { sprite: 'letters/cyrillic-upper#letter-А', at: { x: 62, y: 50 }, scale: 1.4 },
            ] } },
        ],
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Придумай своё слово',
        parentScript:
          'Из кубиков с буквами соберите вместе новые слоги: НА, ТА, МИ. Спросите: «На что похоже МИ? А ТА?» Пусть ребёнок придумает хоть одно «своё» слово — это нормально.',
        actionText: 'Ребёнок собрал и прочитал 2–3 новых слога',
        checklist: ['Собрал сам', 'Прочитал вслух', 'Придумал слово или звук'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Запишите, какие слоги получились, какие пока смешиваются.',
        questions: ['Какой слог читает уверенно?', 'Путает ли С и П?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'wave', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Кубики/карточки с буквами', icon: 'blocks' }],
    ['Кубики/карточки с буквами С, А, П, М.'],
  ),

  /* 10. w4d1-plus — «Лунтик и друзья прибежали» */
  lesson(
    'w4d1-plus',
    'Лунтик и друзья прибежали',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Стояли две уточки, прибежала ещё одна. Стало три». Покажите картину: слева два друга, знак плюс, справа один друг. Пересчитайте всех вместе.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/animals#duck', at: { x: 22, y: 60 } },
            { sprite: 'objects/animals#duck', at: { x: 38, y: 60 } },
            { sprite: 'symbols/math#plus', at: { x: 52, y: 60 }, scale: 0.8 },
            { sprite: 'objects/animals#cat', at: { x: 68, y: 60 } },
            { sprite: 'symbols/math#equals', at: { x: 80, y: 60 }, scale: 0.8 },
            { sprite: 'numbers/digits#digit-3', at: { x: 91, y: 60 }, scale: 1.1 },
          ],
          character: { emotion: 'hello', gesture: 'wave', anchor: { x: 50, y: 25 } },
        },
      },
      {
        id: 's2',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько друзей стало?',
        parentScript: 'Спросите: «Сколько зверей теперь вместе?» Считают все предметы подряд, ребёнок выбирает цифру.',
        items: { sprite: 'objects/animals#cat', count: 3, scale: 1 },
        answer: 3,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/animals#duck', at: { x: 35, y: 55 } },
            { sprite: 'objects/animals#duck', at: { x: 50, y: 55 } },
            { sprite: 'objects/animals#cat', at: { x: 65, y: 55 } },
          ],
        },
      },
      {
        id: 's3',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Посади двух и пришли ещё одного',
        parentScript:
          'Игрушки: посадите перед ребёнком двух зайцев (кубики/фигурки). Скажите: «Прибежал ещё один!» — добавьте третьего. Спросите: «Сколько стало?» Ребёнок пересчитывает.',
        actionText: 'Ребёнок увидел, что к двум добавился один, и посчитал трёх',
        checklist: ['Добавил сам', 'Пересчитал всех', 'Сказал «три»'],
      },
      {
        id: 's4',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Отметьте: понимает ли ребёнок слово «ещё один» как добавление.',
        questions: ['Понял ли «прибежал ещё»?', 'Смог пересчитать заново?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Три игрушки-зверюшки', icon: 'toy' }],
  ),

  /* 11. w4d2-two-features — «Лунтик печёт печенье» */
  lesson(
    'w4d2-two-features',
    'Лунтик печёт печенье',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Лунтик печёт печенье и хочет выбрать: круглое И красное. Два сразу». Покажите на экране фигуры разных цветов и форм. Обсудите: что круглое? что красное? что и то, и другое?',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/shapes#circle-red', at: { x: 28, y: 55 } },
            { sprite: 'objects/shapes#circle-blue', at: { x: 48, y: 55 } },
            { sprite: 'objects/shapes#square-red', at: { x: 68, y: 55 } },
          ],
          character: { emotion: 'think', gesture: 'rest', anchor: { x: 50, y: 22 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Где круглое и красное?',
        parentScript:
          'Спросите: «Покажи печенье, которое КРУГЛОЕ и КРАСНОЕ одновременно». Синий круг — не подходит (не красный), красный квадрат — не подходит (не круглый). Помогите словами, не кликами.',
        options: [
          { id: 'rc', label: 'Красный круг', alt: 'Круг красного цвета', correct: true,
            scene: { layers: [{ sprite: 'objects/shapes#circle-red', at: { x: 50, y: 50 }, scale: 1.6 }] } },
          { id: 'bc', label: 'Синий круг', alt: 'Круг синего цвета', correct: false, alt: 'Круг синего цвета',
            scene: { layers: [{ sprite: 'objects/shapes#circle-blue', at: { x: 50, y: 50 }, scale: 1.6 }] } },
          { id: 'rs', label: 'Красный квадрат', alt: 'Квадрат красного цвета', correct: false, alt: 'Квадрат красного цвета',
            scene: { layers: [{ sprite: 'objects/shapes#square-red', at: { x: 50, y: 50 }, scale: 1.6 }] } },
        ],
      },
      {
        id: 's3',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Найди два признака',
        parentScript:
          'Разложите предметы (пуговицы, кубики, фрукты-муляжи). Задание: «найди что-то красное и круглое», потом «синее и квадратное». Ребёнок приносит найденное и называет оба признака.',
        actionText: 'Ребёнок нашёл предметы по двум признакам сразу',
        checklist: ['Нашёл по обоим признакам', 'Назвал признаки вслух', 'Не выбирал по одному признаку'],
      },
      {
        id: 's4',
        type: 'reflection',
        mode: 'parent',
        parentScript: 'Запишите: удерживает ли ребёнок два условия одновременно.',
        questions: ['Справился с двумя признаками?', 'Где ошибался чаще — цвет или форма?'],
        scene: { layers: [], character: { emotion: 'happy', gesture: 'rest', anchor: { x: 50, y: 55 } } },
      },
    ],
    [{ name: 'Разноцветные фигурки/предметы', icon: 'blocks' }],
  ),

  /* 12. w4d3-month-quest — «Лунтик и большой квест» */
  lesson(
    'w4d3-month-quest',
    'Лунтик и большой квест',
    [
      {
        id: 's1',
        type: 'instruction',
        mode: 'parent',
        parentScript:
          'Скажите: «Мы прошли целый месяц! Лунтик приглашает на квест: три станции — буквы, числа и слова». Покажите карту: три круга-станции. Первая станция — собрать слово КОТ.',
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/shapes#circle-red', at: { x: 25, y: 60 }, scale: 0.8 },
            { sprite: 'objects/shapes#circle-blue', at: { x: 50, y: 60 }, scale: 0.8 },
            { sprite: 'objects/shapes#circle-green', at: { x: 75, y: 60 }, scale: 0.8 },
            { sprite: 'numbers/digits#digit-3', at: { x: 50, y: 30 }, scale: 1.4 },
          ],
          character: { emotion: 'hello', gesture: 'up', anchor: { x: 50, y: 12 } },
        },
      },
      {
        id: 's2',
        type: 'picture-choice',
        mode: 'child',
        prompt: 'Собери слово КОТ',
        parentScript:
          'Станция первая. Спросите: «Какая буква стоит первой в слове КОТ?» После правильного ответа обсудите вторую и третью. Можно читать по слогам: КО-Т.',
        options: [
          { id: 'k', label: 'Буква К', alt: 'Большая буква К', correct: true,
            scene: { layers: [{ sprite: 'letters/cyrillic-upper#letter-К', at: { x: 50, y: 50 }, scale: 1.8 }] } },
          { id: 't', label: 'Буква Т', alt: 'Большая буква Т', correct: false,
            scene: { layers: [{ sprite: 'letters/cyrillic-upper#letter-Т', at: { x: 50, y: 50 }, scale: 1.8 }] } },
          { id: 'o', label: 'Буква О', alt: 'Большая буква О', correct: false, correct: false,
            scene: { layers: [{ sprite: 'letters/cyrillic-upper#letter-О', at: { x: 50, y: 50 }, scale: 1.8 }] } },
        ],
      },
      {
        id: 's3',
        type: 'count',
        mode: 'child',
        prompt: 'Сколько усиков у кота?',
        parentScript:
          'Станция вторая, числа. «Сколько усиков мы нарисуем коту? Три». Посчитайте кружки-усики, ребёнок выбирает цифру.',
        items: { sprite: 'objects/shapes#circle-green', count: 3, scale: 1 },
        answer: 3,
        scene: {
          background: 'white',
          layers: [
            { sprite: 'objects/animals#cat', at: { x: 50, y: 62 }, scale: 1.6 },
            { sprite: 'objects/shapes#circle-green', at: { x: 50, y: 30 }, repeat: { count: 3, layout: 'row', gap: 10 }, scale: 0.5 },
          ],
        },
      },
      {
        id: 's4',
        type: 'offline-task',
        mode: 'parent',
        prompt: 'Нарисуй кота',
        parentScript:
          'Станция третья — руки и листок. Нарисуйте вместе кота: голова, уши, усы (ровно три!). Ребёнок дорисовывает сам, не по линейке. В конце пусть скажет: «Это кот, К-О-Т».',
        actionText: 'Ребёнок нарисовал кота и назвал слово по буквам',
        checklist: ['Нарисовал сам', 'Посчитал усики (3)', 'Прочитал/пропел слово КОТ'],
      },
      {
        id: 's5',
        type: 'reflection',
        mode: 'parent',
        parentScript:
          'Финал месяца. Обсудите с ребёнком: что было самым интересным? Запишите 2–3 наблюдения. Никаких оценок — только то, что видели. Лунтик говорит: «Молодец!»',
        questions: ['Какая станция понравилась больше?', 'Что хочется повторить?', 'Что уже получается само?'],
        scene: {
          background: 'soft-lilac',
          layers: [
            { sprite: 'objects/flowers#flower-simple', at: { x: 25, y: 70 } },
            { sprite: 'objects/flowers#flower-simple', at: { x: 75, y: 70 } },
          ],
          character: { emotion: 'happy', gesture: 'up', anchor: { x: 50, y: 45 } },
        },
      },
    ],
    [{ name: 'Листок и карандаш', icon: 'paper' }],
    ['Листок бумаги и карандаш для третьей станции.'],
  ),
];
