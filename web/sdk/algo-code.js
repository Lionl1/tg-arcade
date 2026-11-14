/* Настоящий код алгоритмов (Python и JavaScript) + тесты.
 * Показывается во вкладках анимаций; tools/check_games.mjs ЗАПУСКАЕТ каждый пример (python3 и node) с тестами,
 * поэтому в учебном коде не может быть ошибок. Ключ — id игры из каталога. */
window.ALGO_CODE = {
  'algo-bubble': {
    py: `def bubble_sort(a):
    a = a[:]
    n = len(a)
    for i in range(n - 1):
        swapped = False
        for j in range(n - 1 - i):
            if a[j] > a[j + 1]:
                a[j], a[j + 1] = a[j + 1], a[j]
                swapped = True
        if not swapped:
            break
    return a`,
    pyTest: `assert bubble_sort([5, 1, 4, 2, 8]) == [1, 2, 4, 5, 8]
assert bubble_sort([]) == [] and bubble_sort([3, 3, 1]) == [1, 3, 3]`,
    js: `function bubbleSort(a) {
  a = a.slice();
  for (let i = 0; i < a.length - 1; i++) {
    let swapped = false;
    for (let j = 0; j < a.length - 1 - i; j++) {
      if (a[j] > a[j + 1]) {
        [a[j], a[j + 1]] = [a[j + 1], a[j]];
        swapped = true;
      }
    }
    if (!swapped) break;
  }
  return a;
}`,
    jsTest: `eq(bubbleSort([5, 1, 4, 2, 8]), [1, 2, 4, 5, 8]) && eq(bubbleSort([]), [])`,
  },
  'algo-selection': {
    py: `def selection_sort(a):
    a = a[:]
    for i in range(len(a) - 1):
        m = i
        for j in range(i + 1, len(a)):
            if a[j] < a[m]:
                m = j
        a[i], a[m] = a[m], a[i]
    return a`,
    pyTest: `assert selection_sort([64, 25, 12, 22, 11]) == [11, 12, 22, 25, 64]`,
    js: `function selectionSort(a) {
  a = a.slice();
  for (let i = 0; i < a.length - 1; i++) {
    let m = i;
    for (let j = i + 1; j < a.length; j++) if (a[j] < a[m]) m = j;
    [a[i], a[m]] = [a[m], a[i]];
  }
  return a;
}`,
    jsTest: `eq(selectionSort([64, 25, 12, 22, 11]), [11, 12, 22, 25, 64])`,
  },
  'algo-insertion': {
    py: `def insertion_sort(a):
    a = a[:]
    for i in range(1, len(a)):
        key = a[i]
        j = i - 1
        while j >= 0 and a[j] > key:
            a[j + 1] = a[j]
            j -= 1
        a[j + 1] = key
    return a`,
    pyTest: `assert insertion_sort([12, 11, 13, 5, 6]) == [5, 6, 11, 12, 13]`,
    js: `function insertionSort(a) {
  a = a.slice();
  for (let i = 1; i < a.length; i++) {
    const key = a[i];
    let j = i - 1;
    while (j >= 0 && a[j] > key) {
      a[j + 1] = a[j];
      j--;
    }
    a[j + 1] = key;
  }
  return a;
}`,
    jsTest: `eq(insertionSort([12, 11, 13, 5, 6]), [5, 6, 11, 12, 13])`,
  },
  'algo-merge': {
    py: `def merge_sort(a):
    if len(a) <= 1:
        return a
    mid = len(a) // 2
    left, right = merge_sort(a[:mid]), merge_sort(a[mid:])
    out, i, j = [], 0, 0
    while i < len(left) and j < len(right):
        if left[i] <= right[j]:
            out.append(left[i])
            i += 1
        else:
            out.append(right[j])
            j += 1
    return out + left[i:] + right[j:]`,
    pyTest: `assert merge_sort([38, 27, 43, 3, 9, 82, 10]) == [3, 9, 10, 27, 38, 43, 82]`,
    js: `function mergeSort(a) {
  if (a.length <= 1) return a;
  const mid = a.length >> 1;
  const left = mergeSort(a.slice(0, mid)), right = mergeSort(a.slice(mid));
  const out = [];
  let i = 0, j = 0;
  while (i < left.length && j < right.length) {
    out.push(left[i] <= right[j] ? left[i++] : right[j++]);
  }
  return out.concat(left.slice(i), right.slice(j));
}`,
    jsTest: `eq(mergeSort([38, 27, 43, 3, 9, 82, 10]), [3, 9, 10, 27, 38, 43, 82])`,
  },
  'algo-quick': {
    py: `def quick_sort(a, lo=0, hi=None):
    if hi is None:
        hi = len(a) - 1
    if lo >= hi:
        return a
    pivot, i = a[hi], lo
    for j in range(lo, hi):
        if a[j] < pivot:
            a[i], a[j] = a[j], a[i]
            i += 1
    a[i], a[hi] = a[hi], a[i]
    quick_sort(a, lo, i - 1)
    quick_sort(a, i + 1, hi)
    return a`,
    pyTest: `assert quick_sort([10, 7, 8, 9, 1, 5]) == [1, 5, 7, 8, 9, 10]`,
    js: `function quickSort(a, lo = 0, hi = a.length - 1) {
  if (lo >= hi) return a;
  const pivot = a[hi];
  let i = lo;
  for (let j = lo; j < hi; j++) {
    if (a[j] < pivot) { [a[i], a[j]] = [a[j], a[i]]; i++; }
  }
  [a[i], a[hi]] = [a[hi], a[i]];
  quickSort(a, lo, i - 1);
  quickSort(a, i + 1, hi);
  return a;
}`,
    jsTest: `eq(quickSort([10, 7, 8, 9, 1, 5]), [1, 5, 7, 8, 9, 10])`,
  },
  'algo-heapsort': {
    py: `def heap_sort(a):
    a = a[:]
    n = len(a)

    def sift(i, size):
        while True:
            big, l, r = i, 2 * i + 1, 2 * i + 2
            if l < size and a[l] > a[big]:
                big = l
            if r < size and a[r] > a[big]:
                big = r
            if big == i:
                return
            a[i], a[big] = a[big], a[i]
            i = big

    for i in range(n // 2 - 1, -1, -1):
        sift(i, n)
    for end in range(n - 1, 0, -1):
        a[0], a[end] = a[end], a[0]
        sift(0, end)
    return a`,
    pyTest: `assert heap_sort([12, 11, 13, 5, 6, 7]) == [5, 6, 7, 11, 12, 13]`,
    js: `function heapSort(a) {
  a = a.slice();
  const sift = (i, size) => {
    for (;;) {
      let big = i;
      const l = 2 * i + 1, r = l + 1;
      if (l < size && a[l] > a[big]) big = l;
      if (r < size && a[r] > a[big]) big = r;
      if (big === i) return;
      [a[i], a[big]] = [a[big], a[i]];
      i = big;
    }
  };
  for (let i = (a.length >> 1) - 1; i >= 0; i--) sift(i, a.length);
  for (let end = a.length - 1; end > 0; end--) {
    [a[0], a[end]] = [a[end], a[0]];
    sift(0, end);
  }
  return a;
}`,
    jsTest: `eq(heapSort([12, 11, 13, 5, 6, 7]), [5, 6, 7, 11, 12, 13])`,
  },
  'algo-counting': {
    py: `def counting_sort(a, max_value):
    count = [0] * (max_value + 1)
    for x in a:
        count[x] += 1
    out = []
    for value, times in enumerate(count):
        out.extend([value] * times)
    return out`,
    pyTest: `assert counting_sort([4, 2, 2, 8, 3, 3, 1], 9) == [1, 2, 2, 3, 3, 4, 8]`,
    js: `function countingSort(a, maxValue) {
  const count = new Array(maxValue + 1).fill(0);
  for (const x of a) count[x]++;
  const out = [];
  count.forEach((times, value) => { for (let t = 0; t < times; t++) out.push(value); });
  return out;
}`,
    jsTest: `eq(countingSort([4, 2, 2, 8, 3, 3, 1], 9), [1, 2, 2, 3, 3, 4, 8])`,
  },
  'algo-binsearch': {
    py: `def binary_search(a, x):
    lo, hi = 0, len(a) - 1
    while lo <= hi:
        mid = (lo + hi) // 2
        if a[mid] == x:
            return mid
        if a[mid] < x:
            lo = mid + 1
        else:
            hi = mid - 1
    return -1`,
    pyTest: `assert binary_search([1, 3, 5, 7, 9, 11], 7) == 3
assert binary_search([1, 3, 5, 7], 4) == -1 and binary_search([], 1) == -1`,
    js: `function binarySearch(a, x) {
  let lo = 0, hi = a.length - 1;
  while (lo <= hi) {
    const mid = (lo + hi) >> 1;
    if (a[mid] === x) return mid;
    if (a[mid] < x) lo = mid + 1;
    else hi = mid - 1;
  }
  return -1;
}`,
    jsTest: `binarySearch([1, 3, 5, 7, 9, 11], 7) === 3 && binarySearch([1, 3, 5, 7], 4) === -1`,
  },
  'algo-bfs': {
    py: `from collections import deque

def bfs(grid, start, goal):
    """grid — список строк, '#' — стена; возвращает длину кратчайшего пути или -1"""
    rows, cols = len(grid), len(grid[0])
    dist = {start: 0}
    queue = deque([start])
    while queue:
        r, c = queue.popleft()
        if (r, c) == goal:
            return dist[(r, c)]
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#' and (nr, nc) not in dist:
                dist[(nr, nc)] = dist[(r, c)] + 1
                queue.append((nr, nc))
    return -1`,
    pyTest: `g = ["....", ".##.", "...."]
assert bfs(g, (0, 0), (2, 3)) == 5 and bfs([".#."], (0, 0), (0, 2)) == -1`,
    js: `function bfs(grid, start, goal) {
  const rows = grid.length, cols = grid[0].length, key = (r, c) => r * cols + c;
  const dist = new Map([[key(...start), 0]]);
  const queue = [start];
  for (let h = 0; h < queue.length; h++) {
    const [r, c] = queue[h];
    if (r === goal[0] && c === goal[1]) return dist.get(key(r, c));
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== '#' && !dist.has(key(nr, nc))) {
        dist.set(key(nr, nc), dist.get(key(r, c)) + 1);
        queue.push([nr, nc]);
      }
    }
  }
  return -1;
}`,
    jsTest: `bfs(['....', '.##.', '....'], [0, 0], [2, 3]) === 5 && bfs(['.#.'], [0, 0], [0, 2]) === -1`,
  },
  'algo-dfs': {
    py: `def dfs(grid, start, goal):
    """Есть ли путь? Обход в глубину со стеком"""
    rows, cols = len(grid), len(grid[0])
    stack, seen = [start], {start}
    while stack:
        r, c = stack.pop()
        if (r, c) == goal:
            return True
        for nr, nc in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#' and (nr, nc) not in seen:
                seen.add((nr, nc))
                stack.append((nr, nc))
    return False`,
    pyTest: `assert dfs(["..", "#."], (0, 0), (1, 1)) and not dfs([".#", "#."], (0, 0), (1, 1))`,
    js: `function dfs(grid, start, goal) {
  const rows = grid.length, cols = grid[0].length, key = (r, c) => r * cols + c;
  const stack = [start], seen = new Set([key(...start)]);
  while (stack.length) {
    const [r, c] = stack.pop();
    if (r === goal[0] && c === goal[1]) return true;
    for (const [nr, nc] of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      if (nr >= 0 && nr < rows && nc >= 0 && nc < cols && grid[nr][nc] !== '#' && !seen.has(key(nr, nc))) {
        seen.add(key(nr, nc));
        stack.push([nr, nc]);
      }
    }
  }
  return false;
}`,
    jsTest: `dfs(['..', '#.'], [0, 0], [1, 1]) === true && dfs(['.#', '#.'], [0, 0], [1, 1]) === false`,
  },
  'algo-astar': {
    py: `import heapq

def astar(grid, start, goal):
    rows, cols = len(grid), len(grid[0])
    h = lambda p: abs(p[0] - goal[0]) + abs(p[1] - goal[1])
    g = {start: 0}
    heap = [(h(start), start)]
    while heap:
        _, cur = heapq.heappop(heap)
        if cur == goal:
            return g[cur]
        r, c = cur
        for nxt in ((r + 1, c), (r - 1, c), (r, c + 1), (r, c - 1)):
            nr, nc = nxt
            if 0 <= nr < rows and 0 <= nc < cols and grid[nr][nc] != '#':
                if g[cur] + 1 < g.get(nxt, float('inf')):
                    g[nxt] = g[cur] + 1
                    heapq.heappush(heap, (g[nxt] + h(nxt), nxt))
    return -1`,
    pyTest: `assert astar(["....", ".##.", "...."], (0, 0), (2, 3)) == 5 and astar(["..", "#."], (0, 0), (1, 1)) == 2`,
    js: `function astar(grid, start, goal) {
  const rows = grid.length, cols = grid[0].length, key = (p) => p[0] * cols + p[1];
  const h = (p) => Math.abs(p[0] - goal[0]) + Math.abs(p[1] - goal[1]);
  const g = new Map([[key(start), 0]]);
  const open = [[h(start), start]]; // для простоты — сортируемый массив вместо кучи
  while (open.length) {
    open.sort((x, y) => x[0] - y[0]);
    const [, cur] = open.shift();
    if (cur[0] === goal[0] && cur[1] === goal[1]) return g.get(key(cur));
    const [r, c] = cur;
    for (const nxt of [[r + 1, c], [r - 1, c], [r, c + 1], [r, c - 1]]) {
      const [nr, nc] = nxt;
      if (nr < 0 || nr >= rows || nc < 0 || nc >= cols || grid[nr][nc] === '#') continue;
      const ng = g.get(key(cur)) + 1;
      if (ng < (g.has(key(nxt)) ? g.get(key(nxt)) : Infinity)) { g.set(key(nxt), ng); open.push([ng + h(nxt), nxt]); }
    }
  }
  return -1;
}`,
    jsTest: `astar(['....', '.##.', '....'], [0, 0], [2, 3]) === 5`,
  },
  'algo-dijkstra': {
    py: `import heapq

def dijkstra(graph, start):
    """graph = {вершина: [(сосед, вес), ...]}; возвращает кратчайшие расстояния"""
    dist = {start: 0}
    heap = [(0, start)]
    while heap:
        d, v = heapq.heappop(heap)
        if d > dist[v]:
            continue
        for u, w in graph[v]:
            if d + w < dist.get(u, float('inf')):
                dist[u] = d + w
                heapq.heappush(heap, (dist[u], u))
    return dist`,
    pyTest: `G = {'A': [('B', 4), ('C', 1)], 'B': [('D', 1)], 'C': [('B', 2), ('D', 5)], 'D': []}
assert dijkstra(G, 'A') == {'A': 0, 'B': 3, 'C': 1, 'D': 4}`,
    js: `function dijkstra(graph, start) {
  const dist = { [start]: 0 };
  const open = [[0, start]]; // массив вместо кучи — проще читать
  while (open.length) {
    open.sort((x, y) => x[0] - y[0]);
    const [d, v] = open.shift();
    if (d > dist[v]) continue;
    for (const [u, w] of graph[v]) {
      if (d + w < (u in dist ? dist[u] : Infinity)) {
        dist[u] = d + w;
        open.push([dist[u], u]);
      }
    }
  }
  return dist;
}`,
    jsTest: `eq(Object.entries(dijkstra({ A: [['B', 4], ['C', 1]], B: [['D', 1]], C: [['B', 2], ['D', 5]], D: [] }, 'A')).sort(), [['A', 0], ['B', 3], ['C', 1], ['D', 4]])`,
  },
  'algo-stackqueue': {
    py: `from collections import deque

stack = []
stack.append(1)
stack.append(2)
top = stack.pop()        # 2 — последний пришёл, первым ушёл

queue = deque()
queue.append(1)
queue.append(2)
first = queue.popleft()  # 1 — первым пришёл, первым ушёл`,
    pyTest: `assert top == 2 and first == 1 and stack == [1] and list(queue) == [2]`,
    js: `const stack = [];
stack.push(1);
stack.push(2);
const top = stack.pop();     // 2

const queue = [];
queue.push(1);
queue.push(2);
const first = queue.shift(); // 1 (для больших очередей — кольцевой буфер)`,
    jsTest: `top === 2 && first === 1`,
  },
  'algo-bst': {
    py: `class Node:
    def __init__(self, key):
        self.key, self.left, self.right = key, None, None

def insert(root, key):
    if root is None:
        return Node(key)
    if key < root.key:
        root.left = insert(root.left, key)
    else:
        root.right = insert(root.right, key)
    return root

def search(root, key):
    while root and root.key != key:
        root = root.left if key < root.key else root.right
    return root is not None`,
    pyTest: `r = None
for k in [50, 30, 70, 20, 40]:
    r = insert(r, k)
assert search(r, 40) and not search(r, 45)`,
    js: `class Node {
  constructor(key) { this.key = key; this.left = null; this.right = null; }
}
function insert(root, key) {
  if (!root) return new Node(key);
  if (key < root.key) root.left = insert(root.left, key);
  else root.right = insert(root.right, key);
  return root;
}
function search(root, key) {
  while (root && root.key !== key) root = key < root.key ? root.left : root.right;
  return root !== null;
}`,
    jsTest: `(() => { let r = null; for (const k of [50, 30, 70, 20, 40]) r = insert(r, k); return search(r, 40) && !search(r, 45); })()`,
  },
  'algo-traversal': {
    py: `def inorder(node, out):
    if node:
        inorder(node.left, out)
        out.append(node.key)
        inorder(node.right, out)
    return out

def preorder(node, out):
    if node:
        out.append(node.key)
        preorder(node.left, out)
        preorder(node.right, out)
    return out

def postorder(node, out):
    if node:
        postorder(node.left, out)
        postorder(node.right, out)
        out.append(node.key)
    return out`,
    pyTest: `class N:
    def __init__(s, k, l=None, r=None): s.key, s.left, s.right = k, l, r
t = N(2, N(1), N(3))
assert inorder(t, []) == [1, 2, 3] and preorder(t, []) == [2, 1, 3] and postorder(t, []) == [1, 3, 2]`,
    js: `const inorder = (n, out = []) => { if (n) { inorder(n.left, out); out.push(n.key); inorder(n.right, out); } return out; };
const preorder = (n, out = []) => { if (n) { out.push(n.key); preorder(n.left, out); preorder(n.right, out); } return out; };
const postorder = (n, out = []) => { if (n) { postorder(n.left, out); postorder(n.right, out); out.push(n.key); } return out; };`,
    jsTest: `(() => { const t = { key: 2, left: { key: 1 }, right: { key: 3 } }; return eq(inorder(t), [1, 2, 3]) && eq(preorder(t), [2, 1, 3]) && eq(postorder(t), [1, 3, 2]); })()`,
  },
  'algo-heap': {
    py: `import heapq

h = []
for x in [5, 1, 8, 3]:
    heapq.heappush(h, x)      # O(log n)
smallest = heapq.heappop(h)   # 1 — в Python куча минимальная

# своя max-куча: вставка с «всплытием»
def push(heap, x):
    heap.append(x)
    i = len(heap) - 1
    while i > 0 and heap[(i - 1) // 2] < heap[i]:
        heap[(i - 1) // 2], heap[i] = heap[i], heap[(i - 1) // 2]
        i = (i - 1) // 2`,
    pyTest: `assert smallest == 1
m = []
for x in [3, 9, 4, 7]:
    push(m, x)
assert m[0] == 9`,
    js: `function push(heap, x) {   // max-куча на массиве
  heap.push(x);
  let i = heap.length - 1;
  while (i > 0 && heap[(i - 1) >> 1] < heap[i]) {
    const p = (i - 1) >> 1;
    [heap[p], heap[i]] = [heap[i], heap[p]];
    i = p;
  }
}`,
    jsTest: `(() => { const m = []; for (const x of [3, 9, 4, 7]) push(m, x); return m[0] === 9; })()`,
  },
  'algo-hash': {
    py: `class HashMap:
    def __init__(self, size=8):
        self.buckets = [[] for _ in range(size)]

    def _bucket(self, key):
        return self.buckets[hash(key) % len(self.buckets)]

    def put(self, key, value):
        bucket = self._bucket(key)
        for pair in bucket:
            if pair[0] == key:
                pair[1] = value
                return
        bucket.append([key, value])

    def get(self, key, default=None):
        for k, v in self._bucket(key):
            if k == key:
                return v
        return default`,
    pyTest: `m = HashMap(2)
for i, w in enumerate(["кот", "дом", "сок", "кот"]):
    m.put(w, i)
assert m.get("кот") == 3 and m.get("дом") == 1 and m.get("нет") is None`,
    js: `class HashMap {
  constructor(size = 8) { this.buckets = Array.from({ length: size }, () => []); }
  hash(key) { let h = 0; for (const ch of String(key)) h = (h * 31 + ch.charCodeAt(0)) | 0; return Math.abs(h) % this.buckets.length; }
  put(key, value) {
    const bucket = this.buckets[this.hash(key)];
    const pair = bucket.find((p) => p[0] === key);
    if (pair) pair[1] = value; else bucket.push([key, value]);
  }
  get(key) {
    const pair = this.buckets[this.hash(key)].find((p) => p[0] === key);
    return pair ? pair[1] : undefined;
  }
}`,
    jsTest: `(() => { const m = new HashMap(2); ['кот', 'дом', 'сок', 'кот'].forEach((w, i) => m.put(w, i)); return m.get('кот') === 3 && m.get('дом') === 1 && m.get('нет') === undefined; })()`,
  },
  'algo-linkedlist': {
    py: `class ListNode:
    def __init__(self, val, next=None):
        self.val, self.next = val, next

def reverse(head):
    prev = None
    while head:
        nxt = head.next
        head.next = prev
        prev = head
        head = nxt
    return prev`,
    pyTest: `h = ListNode(1, ListNode(2, ListNode(3)))
r = reverse(h)
assert [r.val, r.next.val, r.next.next.val] == [3, 2, 1] and r.next.next.next is None`,
    js: `function reverse(head) {
  let prev = null;
  while (head) {
    const next = head.next;
    head.next = prev;
    prev = head;
    head = next;
  }
  return prev;
}`,
    jsTest: `(() => { const r = reverse({ val: 1, next: { val: 2, next: { val: 3, next: null } } }); return r.val === 3 && r.next.val === 2 && r.next.next.val === 1 && r.next.next.next === null; })()`,
  },
  'algo-coins': {
    py: `def min_coins(coins, amount):
    INF = float('inf')
    dp = [0] + [INF] * amount      # dp[s] — минимум монет для суммы s
    for s in range(1, amount + 1):
        for c in coins:
            if c <= s and dp[s - c] + 1 < dp[s]:
                dp[s] = dp[s - c] + 1
    return dp[amount] if dp[amount] != INF else -1`,
    pyTest: `assert min_coins([1, 3, 4], 6) == 2 and min_coins([2], 3) == -1 and min_coins([1, 5, 10], 27) == 5`,
    js: `function minCoins(coins, amount) {
  const dp = [0, ...new Array(amount).fill(Infinity)];
  for (let s = 1; s <= amount; s++) {
    for (const c of coins) {
      if (c <= s && dp[s - c] + 1 < dp[s]) dp[s] = dp[s - c] + 1;
    }
  }
  return dp[amount] === Infinity ? -1 : dp[amount];
}`,
    jsTest: `minCoins([1, 3, 4], 6) === 2 && minCoins([2], 3) === -1 && minCoins([1, 5, 10], 27) === 5`,
  },
};
