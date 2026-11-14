// Сложность алгоритмов: тест и карточки
Arcade.register(Learn.deck({
  ask: L('Какая сложность?', 'What is the complexity?'),
  rule: L('n — размер данных; V и E — вершины и рёбра графа.', 'n is the input size; V and E are the vertices and edges of a graph.'),
  cards: [
    [L('Доступ к элементу массива по индексу', 'Access an array element by index'), 'O(1)'], [L('Поиск в несортированном массиве', 'Search an unsorted array'), 'O(n)'], [L('Бинарный поиск', 'Binary search'), 'O(log n)'],
    [L('Сортировка пузырьком (худший случай)', 'Bubble sort (worst case)'), 'O(n²)'], [L('Сортировка вставками (худший случай)', 'Insertion sort (worst case)'), 'O(n²)'], [L('Сортировка выбором', 'Selection sort'), 'O(n²)'],
    [L('Сортировка слиянием', 'Merge sort'), 'O(n log n)'], [L('Быстрая сортировка (в среднем)', 'Quicksort (average)'), 'O(n log n)'], [L('Быстрая сортировка (худший случай)', 'Quicksort (worst case)'), 'O(n²)'],
    [L('Пирамидальная сортировка', 'Heapsort'), 'O(n log n)'], [L('Вставка в хеш-таблицу (в среднем)', 'Insert into a hash table (average)'), 'O(1)'], [L('Поиск в хеш-таблице (в среднем)', 'Look up in a hash table (average)'), 'O(1)'],
    [L('Поиск в сбалансированном дереве поиска', 'Search a balanced search tree'), 'O(log n)'], [L('Поиск в вырожденном дереве поиска', 'Search a degenerate search tree'), 'O(n)'], [L('push / pop в стеке', 'Stack push / pop'), 'O(1)'],
    [L('Добавление в конец динамического массива (амортизированно)', 'Append to a dynamic array (amortised)'), 'O(1)'], [L('Вставка в начало массива', 'Insert at the start of an array'), 'O(n)'], [L('Вставка в начало связного списка', 'Insert at the head of a linked list'), 'O(1)'],
    [L('Поиск в связном списке', 'Search a linked list'), 'O(n)'], [L('Вставка в двоичную кучу', 'Insert into a binary heap'), 'O(log n)'], [L('Извлечь максимум из кучи', 'Extract the max from a heap'), 'O(log n)'],
    [L('Посмотреть максимум в куче', 'Peek at the max of a heap'), 'O(1)'], [L('Обход графа в ширину (BFS)', 'Breadth-first search of a graph (BFS)'), 'O(V + E)'], [L('Обход графа в глубину (DFS)', 'Depth-first search of a graph (DFS)'), 'O(V + E)'],
    [L('Дейкстра с двоичной кучей', 'Dijkstra with a binary heap'), 'O((V + E) log V)'], [L('Перебор всех подмножеств', 'Enumerate all subsets'), 'O(2ⁿ)'], [L('Перебор всех перестановок', 'Enumerate all permutations'), 'O(n!)'],
    [L('Сортировка подсчётом (k — диапазон значений)', 'Counting sort (k is the value range)'), 'O(n + k)'], [L('Построение кучи из массива (heapify)', 'Build a heap from an array (heapify)'), 'O(n)'], [L('Два вложенных цикла по n', 'Two nested loops over n'), 'O(n²)'],
  ],
}));
