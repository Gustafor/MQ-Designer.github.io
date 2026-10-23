export type IconName =
  | "arrow-right"
  | "arrow-up-right"
  | "calendar"
  | "clock"
  | "monitor"
  | "code"
  | "layers"
  | "shield"
  | "certificate"
  | "user"
  | "menu"
  | "close"
  | "chevron-down"
  | "spark"
  | "route"
  | "database"
  | "book"
  | "mail"
  | "target"
  | "github"
  | "telegram"
  | "check"
  | "alert"
  | "zap"
  | "activity"
  | "file-text";

export const site = {
  name: "RabbitMQ Designer",
  course: "Курс по RabbitMQ",
  appUrl: "https://gustafor.github.io/MQ-Designer.github.io/",
  githubUrl: "https://github.com/Gustafor/MQ-Designer.github.io",
  startDate: "15 ноября",
  cohort: "Поток №1",
  seats: "6 мест",
  email: "hello@example.ru",
  telegram: "https://t.me/example",
};

export const nav = [
  { label: "Программа", href: "/#program" },
  { label: "Автор", href: "/#author" },
  { label: "Отзывы", href: "/#reviews" },
  { label: "Стоимость", href: "/#pricing" },
  { label: "FAQ", href: "/#faq" },
];

export const facts: { icon: IconName; label: string; value: string }[] = [
  { icon: "calendar", label: "Старт потока", value: "15 ноября" },
  { icon: "clock", label: "Длительность", value: "6 недель" },
  { icon: "monitor", label: "Формат", value: "Онлайн, 2 занятия" },
  { icon: "code", label: "Практика", value: "12 заданий" },
  { icon: "layers", label: "Проект", value: "1 capstone" },
  { icon: "target", label: "Уровень", value: "Java / Spring" },
  { icon: "certificate", label: "Документ", value: "Сертификат" },
  { icon: "user", label: "Автор", value: "Создатель среды" },
];

export const audiences: {
  icon: IconName;
  index: string;
  title: string;
  text: string;
  bullets: string[];
}[] = [
  {
    icon: "code",
    index: "01",
    title: "Java/Spring-разработчику",
    text: "Перестаньте копировать конфиги и начните понимать, куда уходит каждое сообщение.",
    bullets: ["Routing и bindings без магии", "DLQ, retry и идемпотентность", "Spring AMQP в реальном проекте"],
  },
  {
    icon: "route",
    index: "02",
    title: "Архитектору и техлиду",
    text: "Получите шаблон топологии и документ, который не стыдно принести на ревью.",
    bullets: ["Чек-лист проектирования", "Схема и ADR для команды", "Разбор ошибок на симуляции"],
  },
  {
    icon: "layers",
    index: "03",
    title: "Команде",
    text: "Единый стандарт: как проектировать, проверять и эксплуатировать очереди.",
    bullets: ["Адаптация под ваш стек", "Закрытый контур", "Счёт и договор"],
  },
];

export const problems = [
  {
    index: "01",
    title: "Сообщение ушло в nowhere",
    text: "Exchange есть, binding забыли. В логах тишина, в продакшене — потерянный заказ.",
  },
  {
    index: "02",
    title: "DLQ есть, но никто не разбирает",
    text: "Мёртвые письма копятся, а команда узнаёт о них после инцидента.",
  },
  {
    index: "03",
    title: "Retry без backoff добивает сервис",
    text: "Повторная доставка превращается в шторм, который роняет потребителя.",
  },
  {
    index: "04",
    title: "На ревью нет схемы, только слова",
    text: "Топология живёт в голове автора. Новый человек не может её проверить.",
  },
];

export const skills = [
  { index: "01", title: "Выбирать exchange", text: "Direct, topic, fanout, headers — под задачу, а не по привычке." },
  { index: "02", title: "Проектировать routing", text: "Ключи, bindings и alternate exchange без слепых зон." },
  { index: "03", title: "Настраивать ack и confirms", text: "Понимать, где сообщение может потеряться." },
  { index: "04", title: "Строить DLQ и retry", text: "Backoff, TTL, dead-letter и разбор ошибок." },
  { index: "05", title: "Выбирать quorum", text: "Classic vs quorum, prefetch и concurrency." },
  { index: "06", title: "Генерировать Spring AMQP", text: "Конфигурация, listeners, error handler." },
  { index: "07", title: "Экспортировать definitions.json", text: "Схема становится конфигом для реального брокера." },
  { index: "08", title: "Защищать топологию", text: "Документ, схема и ответы на вопросы на ревью." },
];

export const cases = [
  {
    tag: "Заказы",
    title: "Ни одного потерянного заказа",
    text: "Собираем topic-exchange, DLQ и retry с backoff. Проверяем, что происходит при падении потребителя.",
    result: "0 потерянных сообщений",
  },
  {
    tag: "Платежи",
    title: "Без двойных списаний",
    text: "Publisher confirms, идемпотентность и повторная доставка. Симуляция показывает каждый шаг.",
    result: "1 платёж = 1 операция",
  },
  {
    tag: "Нотификации",
    title: "Стабильно в пике",
    text: "Fanout, prefetch и quorum. Смотрим, где очередь растёт, а где потребитель не успевает.",
    result: "Управляемая нагрузка",
  },
];

export const modules = [
  {
    number: "00",
    title: "Вводный модуль",
    hours: "2 часа",
    summary: "Как устроен курс, доступ к среде, базовые понятия AMQP. Собираем первую схему.",
    artifact: "Скриншот первой топологии",
    tags: ["AMQP", "среда"],
  },
  {
    number: "01",
    title: "Основы RabbitMQ",
    hours: "4 часа",
    summary: "Producer, exchange, queue, binding, routing key, consumer, ack. Пять мини-схем на разные типы exchange.",
    artifact: "5 пресетов",
    tags: ["exchange", "queue", "ack"],
  },
  {
    number: "02",
    title: "Маршрутизация",
    hours: "4 часа",
    summary: "Direct, fanout, topic, headers, приоритеты, alternate exchange. Разбираем три реальных сценария.",
    artifact: "Схема маршрутизации",
    tags: ["routing", "bindings"],
  },
  {
    number: "03",
    title: "Надёжность",
    hours: "6 часов",
    summary: "Publisher confirms, ack/nack, requeue, TTL, DLX/DLQ, retry, идемпотентность. Моделируем потерю и восстановление.",
    artifact: "Политика retry + DLQ",
    tags: ["DLQ", "retry", "TTL"],
  },
  {
    number: "04",
    title: "Производительность",
    hours: "4 часа",
    summary: "Prefetch, concurrency, quorum queues, lazy queues, кластер, шардирование. Нагрузочный сценарий в симуляции.",
    artifact: "Чек-лист нагрузки",
    tags: ["quorum", "prefetch"],
  },
  {
    number: "05",
    title: "Проектирование",
    hours: "6 часов",
    summary: "Требования, bounded contexts, naming, версионирование, эволюция топологии. Собираем топологию для своего кейса.",
    artifact: "Архитектурная схема",
    tags: ["ADR", "naming"],
  },
  {
    number: "06",
    title: "Spring AMQP",
    hours: "6 часов",
    summary: "Конфигурация, listeners, converters, error handler, retry, Testcontainers. Подключаем Java-код к схеме.",
    artifact: "RabbitConfig.java и тесты",
    tags: ["Spring", "Java"],
  },
  {
    number: "07",
    title: "Эксплуатация",
    hours: "4 часа",
    summary: "Мониторинг, метрики, алерты, инциденты, definitions.json, CI/CD. Разбираем инцидент.",
    artifact: "Runbook",
    tags: ["monitoring", "CI/CD"],
  },
  {
    number: "08",
    title: "Документация и capstone",
    hours: "11 часов",
    summary: "ADR, диаграммы, Markdown-экспорт, нормоконтроль. Защита проекта: требования, схема, симуляция, код, документ.",
    artifact: "Портфолио-кейс",
    tags: ["ADR", "capstone"],
  },
];

export const processSteps = [
  {
    number: "01",
    title: "Смотрите",
    text: "Два занятия в неделю по 90 минут. Записи остаются на 12 месяцев.",
    icon: "monitor" as IconName,
  },
  {
    number: "02",
    title: "Собираете",
    text: "После каждого модуля — практика в среде. Не тест, а рабочая топология.",
    icon: "route" as IconName,
  },
  {
    number: "03",
    title: "Проверяете",
    text: "Симуляция, ревью и разбор ошибок. Видно, куда ушло каждое сообщение.",
    icon: "shield" as IconName,
  },
  {
    number: "04",
    title: "Защищаете",
    text: "Capstone и документ для портфолио. Получаете сертификат при защите.",
    icon: "certificate" as IconName,
  },
];

export const artifacts = [
  {
    icon: "database" as IconName,
    title: "definitions.json",
    text: "Готовый конфиг для реального RabbitMQ: exchanges, queues, bindings.",
    meta: "JSON",
  },
  {
    icon: "code" as IconName,
    title: "Spring AMQP",
    text: "RabbitConfig, listeners, error handler и тесты для вашего проекта.",
    meta: "Java",
  },
  {
    icon: "book" as IconName,
    title: "Документ для ревью",
    text: "Markdown-документация: схема, решения, риски и эксплуатация.",
    meta: "Markdown",
  },
  {
    icon: "certificate" as IconName,
    title: "Сертификат",
    text: "Подтверждение прохождения — после защиты проекта, не за просмотр видео.",
    meta: "PDF",
  },
];

export const reviews = [
  {
    name: "Участник пилота",
    role: "Java-разработчик, 3 года опыта",
    text: "Наконец увидел, куда уходит сообщение при requeue. Раньше это была магия из конфигов.",
    badge: "Пилот",
  },
  {
    name: "Участник пилота",
    role: "Тимлид, 8 лет опыта",
    text: "Забрал чек-лист для ревью. На следующей неделе разобрали с командой две старые топологии.",
    badge: "Пилот",
  },
  {
    name: "Участник пилота",
    role: "Архитектор",
    text: "Ценно, что можно сломать схему в симуляции и увидеть последствия, а не на проде.",
    badge: "Пилот",
  },
];

export const plans = [
  {
    name: "Базовый",
    subtitle: "Самостоятельно",
    price: "9 900–14 900 ₽",
    note: "Для тех, кто учится в своём темпе",
    features: [
      "Записи занятий",
      "Среда RabbitMQ Designer",
      "Шаблоны и пресеты",
      "Чат потока",
      "Сертификат при защите",
    ],
    cta: "Выбрать базовый",
    featured: false,
  },
  {
    name: "Расширенный",
    subtitle: "С проверкой",
    price: "24 900–34 900 ₽",
    note: "Оптимальный: практика + обратная связь",
    features: [
      "Всё из базового",
      "Проверка домашних заданий",
      "Живые Q&A и разборы",
      "Защита capstone",
      "1:1 с автором",
    ],
    cta: "Выбрать расширенный",
    featured: true,
  },
  {
    name: "Командный",
    subtitle: "5–10 человек",
    price: "от 149 000 ₽",
    note: "Для команды и закрытого контура",
    features: [
      "Адаптация под ваш стек",
      "Закрытый контур",
      "Счёт и договор",
      "Разбор ваших топологий",
      "Отчёт для руководителя",
    ],
    cta: "Обсудить команду",
    featured: false,
  },
];

export const faqs = [
  {
    q: "Нужен ли опыт с RabbitMQ?",
    a: "Базовые понятия AMQP полезны, но мы начинаем с основ. Главное — понимать, зачем сервисам обмениваться сообщениями.",
  },
  {
    q: "Нужен ли Java/Spring?",
    a: "Для модуля Spring AMQP — да, базовый уровень. Остальная часть курса полезна и разработчикам на других языках.",
  },
  {
    q: "Сколько времени нужно в неделю?",
    a: "Около 6–8 часов: два занятия по 90 минут и практика. Если пропустили — останутся записи.",
  },
  {
    q: "Что если пропущу занятие?",
    a: "Запись и материалы модуля остаются в LMS. Вопросы можно задать в чате или на Q&A.",
  },
  {
    q: "Как проходит проверка домашних заданий?",
    a: "В тарифе «Расширенный» — ревью схемы и кода, комментарии по routing, DLQ и документации. В базовом — самопроверка по чек-листу.",
  },
  {
    q: "Будет ли сертификат?",
    a: "Да, после защиты проекта. Это сертификат о прохождении курса, а не диплом о квалификации.",
  },
  {
    q: "Помогаете ли с трудоустройством?",
    a: "Нет гарантий трудоустройства. Помогаем собрать портфолио и объяснить решения на интервью.",
  },
  {
    q: "Можно ли оплатить от компании?",
    a: "Да. Для командного тарифа готовим счёт, договор и закрывающие документы.",
  },
  {
    q: "Есть ли рассрочка?",
    a: "Да, условия зависят от тарифа и платёжного провайдера. Напишите в поддержку — подберём вариант.",
  },
  {
    q: "Можно ли вернуть деньги?",
    a: "Да, в течение 14 дней, если пройдено меньше 20% курса. Условия — в оферте.",
  },
  {
    q: "Чем курс отличается от бесплатных видео?",
    a: "Практикой в среде, проверкой схемы и проектом. Вы не просто смотрите — вы собираете и защищаете топологию.",
  },
  {
    q: "Что нужно установить?",
    a: "Ничего. Среда работает в браузере и офлайн. Для модуля Spring AMQP понадобится Java-проект.",
  },
];
