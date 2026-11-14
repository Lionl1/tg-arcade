// Что использовать? Выбор структуры данных / алгоритма под задачу
Arcade.register(Learn.deck({
  ask: L('Что лучше использовать?', 'What is best to use?'),
  cards: [
    ['Быстро проверять, встречался ли элемент раньше', 'Множество (хеш-таблица)', 1, 'Quickly check whether an item has been seen before', 'Set (hash table)'],
    ['Считать, сколько раз встречается каждое слово', 'Словарь (хеш-таблица)', 1, 'Count how many times each word occurs', 'Dictionary (hash table)'],
    ['Отмена последнего действия (Ctrl+Z)', 'Стек', 1, 'Undo the last action (Ctrl+Z)', 'Stack'],
    ['Обрабатывать заявки в порядке поступления', 'Очередь', 1, 'Handle requests in the order they arrive', 'Queue'],
    ['Каждый раз забирать самую срочную задачу', 'Куча (очередь с приоритетом)', 2, 'Always take the most urgent task', 'Heap (priority queue)'],
    ['Кратчайший путь в лабиринте, все шаги одинаковые', 'Обход в ширину (BFS)', 2, 'Shortest path in a maze where all steps are equal', 'Breadth-first search (BFS)'],
    ['Кратчайший маршрут по дорогам разной длины', 'Алгоритм Дейкстры', 2, 'Shortest route over roads of different lengths', "Dijkstra's algorithm"],
    ['Много раз искать в большом отсортированном массиве', 'Бинарный поиск', 1, 'Search a large sorted array many times', 'Binary search'],
    ['Хранить данные отсортированными и быстро вставлять/удалять', 'Сбалансированное дерево поиска', 3, 'Keep data sorted with fast inserts and deletes', 'Balanced search tree'],
    ['Часто вставлять и удалять элементы в середине при наличии ссылки на узел', 'Связный список', 2, 'Insert and delete in the middle often, given a reference to the node', 'Linked list'],
    ['Быстрый доступ к элементу по номеру', 'Массив (список)', 1, 'Fast access to an element by its index', 'Array (list)'],
    ['Добавлять и забирать с обоих концов за O(1)', 'Дек (deque)', 2, 'Add and remove at both ends in O(1)', 'Deque'],
    ['Проверять, связаны ли две вершины, по мере добавления рёбер', 'Система непересекающихся множеств (DSU)', 3, 'Check whether two vertices are connected as edges are added', 'Disjoint set union (DSU)'],
    ['Подсказки по первым буквам при наборе слова', 'Префиксное дерево (trie)', 3, 'Suggestions from the first letters while typing a word', 'Prefix tree (trie)'],
    ['Хранить k самых больших элементов потока', 'Куча размера k', 3, 'Keep the k largest items of a stream', 'Heap of size k'],
    ['Порядок выполнения задач с зависимостями', 'Топологическая сортировка', 3, 'Order of tasks with dependencies', 'Topological sort'],
    ['Найти пару чисел с нужной суммой в отсортированном массиве', 'Два указателя', 2, 'Find a pair of numbers with a given sum in a sorted array', 'Two pointers'],
    ['Максимальная сумма подряд идущих k элементов', 'Скользящее окно', 2, 'Maximum sum of k consecutive elements', 'Sliding window'],
  ].map(([q, a, d, qe, ae]) => ({ q: L(q, qe), a: L(a, ae), d })),
}));
