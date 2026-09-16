import { Problem } from "./types";

export const CONTEST_PROBLEMS: Problem[] = [
  {
    id: "p1-linked-list",
    order: 1,
    title: "Linked List — Remove Duplicates",
    topic: "Linked Lists",
    difficulty: "Medium",
    baseScore: 100,
    timeLimitMinutes: 10,
    description: `Given a singly linked list of integers, remove all duplicate values while keeping the first occurrence of each value.

Example:
Input:  10 → 20 → 10 → 30 → 20 → 40 → NULL
Output: 10 → 20 → 30 → 40 → NULL

Constraints & Directives:
• Do NOT use an auxiliary array, set, or hash map (Space complexity must be O(1) extra space).
• Modify the linked list strictly in-place by adjusting pointer references.
• Aim for O(n²) time complexity using two nested pointer traversals (e.g. current and runner pointers).

Remember: This is a Blind Coding challenge! Keep track of your node references and pointer mutations in your head.`,
    inputFormat: `The head node of a singly linked list of integers.`,
    outputFormat: `Return the head of the modified linked list with duplicate elements removed in-place.`,
    examples: [
      {
        input: "10 → 20 → 10 → 30 → 20 → 40 → NULL",
        output: "10 → 20 → 30 → 40 → NULL",
        explanation: "10 and 20 appear multiple times. First occurrences (at index 0 and 1) are preserved; duplicate instances are unlinked.",
      },
      {
        input: "5 → 5 → 5 → 5 → NULL",
        output: "5 → NULL",
        explanation: "All subsequent 5s are removed, leaving only the head node.",
      },
      {
        input: "1 → 2 → 3 → NULL",
        output: "1 → 2 → 3 → NULL",
        explanation: "No duplicate elements exist; list structure remains unchanged.",
      },
    ],
    constraints: [
      "0 <= Number of nodes <= 1000",
      "-10^4 <= Node.val <= 10^4",
      "Must operate in-place with O(1) extra space (No std::set / HashSet / auxiliary arrays allowed).",
      "Time complexity target: O(n²).",
    ],
    hints: [
      "Use two pointers: an outer pointer 'current' to pick each node, and an inner pointer 'runner' to scan forward.",
      "Compare runner->next->val with current->val. If equal, bypass node: runner->next = runner->next->next.",
      "Do NOT use arrays or sets; modify pointers in-place for O(1) space complexity.",
    ],
    solutionGuide: `// Conceptual Algorithm Guide:
// 1. Set current = head
// 2. Loop while current is not NULL:
// 3.    Set runner = current
// 4.    Loop while runner->next is not NULL:
// 5.       If (runner->next->val == current->val):
// 6.           Bypass duplicate node (runner->next = runner->next->next)
// 7.       Else: advance runner (runner = runner->next)
// 8.    Advance current (current = current->next)`,
    starterCode: {
      cpp: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     ListNode *next;
 *     ListNode(int x) : val(x), next(nullptr) {}
 * };
 */
#include <iostream>

ListNode* removeDuplicates(ListNode* head) {
    if (!head) return nullptr;
    
    ListNode* current = head;
    while (current != nullptr) {
        ListNode* runner = current;
        while (runner->next != nullptr) {
            if (runner->next->val == current->val) {
                ListNode* temp = runner->next;
                runner->next = runner->next->next;
                delete temp;
            } else {
                runner = runner->next;
            }
        }
        current = current->next;
    }
    
    return head;
}
`,
      java: `/**
 * Definition for singly-linked list.
 * public class ListNode {
 *     int val;
 *     ListNode next;
 *     ListNode(int val) { this.val = val; }
 * }
 */
class Solution {
    public ListNode removeDuplicates(ListNode head) {
        if (head == null) return null;
        
        ListNode current = head;
        while (current != null) {
            ListNode runner = current;
            while (runner.next != null) {
                if (runner.next.val == current.val) {
                    runner.next = runner.next.next;
                } else {
                    runner = runner.next;
                }
            }
            current = current.next;
        }
        
        return head;
    }
}
`,
      javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val)
 *     this.next = (next===undefined ? null : next)
 * }
 */
/**
 * @param {ListNode} head
 * @return {ListNode}
 */
function removeDuplicates(head) {
    if (!head) return null;
    
    let current = head;
    while (current !== null) {
        let runner = current;
        while (runner.next !== null) {
            if (runner.next.val === current.val) {
                runner.next = runner.next.next;
            } else {
                runner = runner.next;
            }
        }
        current = current.next;
    }
    
    return head;
}
`,
      python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def removeDuplicates(self, head: ListNode) -> ListNode:
        if not head:
            return None
            
        current = head
        while current:
            runner = current
            while runner.next:
                if runner.next.val == current.val:
                    runner.next = runner.next.next
                else:
                    runner = runner.next
            current = current.next
            
        return head
`,
      c: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     struct ListNode *next;
 * };
 */
#include <stdlib.h>

struct ListNode* removeDuplicates(struct ListNode* head) {
    if (!head) return NULL;
    
    struct ListNode* current = head;
    while (current != NULL) {
        struct ListNode* runner = current;
        while (runner->next != NULL) {
            if (runner->next->val == current->val) {
                struct ListNode* temp = runner->next;
                runner->next = runner->next->next;
                free(temp);
            } else {
                runner = runner->next;
            }
        }
        current = current->next;
    }
    
    return head;
}
`,
    },
  },
  {
    id: "p2-queues",
    order: 2,
    title: "Circular Queue — Basic Implementation",
    topic: "Queues",
    difficulty: "Medium",
    baseScore: 100,
    timeLimitMinutes: 35,
    description: `Implement a circular queue using an array of fixed size 5.

Support these operations:
• enqueue(x): Inserts element x at rear. Returns true if successful, false if full.
• dequeue(): Removes element from front. Returns true/value, false if empty.
• peek(): Returns front element without removing, or -1 if empty.
• isFull(): Returns true if queue is full (size == 5).
• isEmpty(): Returns true if queue is empty (size == 0).

Example Walkthrough:
1. Start:
   [ _ _ _ _ _ ]  (front = 0, rear = 0, size = 0)

2. Operations:
   enqueue(10), enqueue(20), enqueue(30), enqueue(40), enqueue(50)
   Queue: [10 20 30 40 50]  (front = 0, rear = 4, size = 5)

3. Dequeue x2:
   dequeue() → 10
   dequeue() → 20
   Queue: [ _ _ 30 40 50]   (front = 2, rear = 4, size = 3)

4. Wrap Around Enqueue:
   enqueue(60)
   enqueue(70)
   The 60 and 70 wrap around and reuse the freed spaces at indices 0 and 1:
   Queue: [60 70 30 40 50]  (front = 2, rear = 1, size = 5)

Goal: Correctly manage front, rear, and size pointers without shifting elements!`,
    inputFormat: `Method calls on Circular Queue initialized with fixed capacity 5.`,
    outputFormat: `Boolean results for mutation operations (enqueue, dequeue) and integer values for queries (peek, front).`,
    examples: [
      {
        input: "enqueue(10), enqueue(20), enqueue(30), enqueue(40), enqueue(50), dequeue(), dequeue(), enqueue(60), enqueue(70)",
        output: "Queue state: [60, 70, 30, 40, 50], front=2, rear=1, size=5",
        explanation: "After dequeuing twice, indices 0 and 1 become free. Enqueuing 60 and 70 wraps around via modulo arithmetic without shifting elements.",
      },
      {
        input: "isEmpty() on new queue; enqueue(10); peek(); isFull()",
        output: "isEmpty() -> true; peek() -> 10; isFull() -> false",
        explanation: "Empty check returns true initially. Peek exposes top element without removing.",
      },
    ],
    constraints: [
      "Fixed Array Capacity: k = 5",
      "0 <= x <= 1000",
      "Do NOT use element shifting (e.g. shift(), splice(), memmove). Index wrapping MUST be handled via front, rear, and size pointers.",
    ],
    hints: [
      "Maintain 4 variables: arr[5], front = 0, rear = -1, size = 0.",
      "Wrap pointers using modulo arithmetic: (rear + 1) % 5 and (front + 1) % 5.",
      "isFull() checks size == 5. isEmpty() checks size == 0.",
    ],
    solutionGuide: `// Conceptual Algorithm Guide:
// 1. enqueue(x): Check !isFull(). Move rear = (rear + 1) % 5, set arr[rear] = x, increment size.
// 2. dequeue(): Check !isEmpty(). Move front = (front + 1) % 5, decrement size.
// 3. peek(): Check !isEmpty(). Return arr[front], or -1 if empty.
// 4. isFull(): Return size == 5. isEmpty(): Return size == 0.`,
    starterCode: {
      cpp: `#include <iostream>

class CircularQueue {
private:
    int arr[5];
    int front;
    int rear;
    int size;
    const int CAPACITY = 5;

public:
    CircularQueue() {
        front = 0;
        rear = -1;
        size = 0;
    }

    bool enqueue(int x) {
        if (isFull()) return false;
        rear = (rear + 1) % CAPACITY;
        arr[rear] = x;
        size++;
        return true;
    }

    bool dequeue() {
        if (isEmpty()) return false;
        front = (front + 1) % CAPACITY;
        size--;
        return true;
    }

    int peek() {
        if (isEmpty()) return -1;
        return arr[front];
    }

    bool isEmpty() {
        return size == 0;
    }

    bool isFull() {
        return size == CAPACITY;
    }
};
`,
      java: `class CircularQueue {
    private int[] arr = new int[5];
    private int front = 0;
    private int rear = -1;
    private int size = 0;
    private final int CAPACITY = 5;

    public boolean enqueue(int x) {
        if (isFull()) return false;
        rear = (rear + 1) % CAPACITY;
        arr[rear] = x;
        size++;
        return true;
    }

    public boolean dequeue() {
        if (isEmpty()) return false;
        front = (front + 1) % CAPACITY;
        size--;
        return true;
    }

    public int peek() {
        if (isEmpty()) return -1;
        return arr[front];
    }

    public boolean isEmpty() {
        return size == 0;
    }

    public boolean isFull() {
        return size == CAPACITY;
    }
}
`,
      javascript: `class CircularQueue {
    constructor() {
        this.CAPACITY = 5;
        this.arr = new Array(5);
        this.front = 0;
        this.rear = -1;
        this.size = 0;
    }

    /**
     * @param {number} x
     * @return {boolean}
     */
    enqueue(x) {
        if (this.isFull()) return false;
        this.rear = (this.rear + 1) % this.CAPACITY;
        this.arr[this.rear] = x;
        this.size++;
        return true;
    }

    /**
     * @return {boolean}
     */
    dequeue() {
        if (this.isEmpty()) return false;
        this.front = (this.front + 1) % this.CAPACITY;
        this.size--;
        return true;
    }

    /**
     * @return {number}
     */
    peek() {
        if (this.isEmpty()) return -1;
        return this.arr[this.front];
    }

    /**
     * @return {boolean}
     */
    isEmpty() {
        return this.size === 0;
    }

    /**
     * @return {boolean}
     */
    isFull() {
        return this.size === this.CAPACITY;
    }
}
`,
      python: `class CircularQueue:
    def __init__(self):
        self.CAPACITY = 5
        self.arr = [0] * 5
        self.front = 0
        self.rear = -1
        self.size = 0

    def enqueue(self, x: int) -> bool:
        if self.isFull():
            return False
        self.rear = (self.rear + 1) % self.CAPACITY
        self.arr[self.rear] = x
        self.size += 1
        return True

    def dequeue(self) -> bool:
        if self.isEmpty():
            return False
        self.front = (self.front + 1) % self.CAPACITY
        self.size -= 1
        return True

    def peek(self) -> int:
        if self.isEmpty():
            return -1
        return self.arr[self.front]

    def isEmpty(self) -> bool:
        return self.size == 0

    def isFull(self) -> bool:
        return self.size == self.CAPACITY
`,
      c: `#include <stdbool.h>

typedef struct {
    int arr[5];
    int front;
    int rear;
    int size;
    int capacity;
} CircularQueue;

CircularQueue createQueue() {
    CircularQueue q;
    q.front = 0;
    q.rear = -1;
    q.size = 0;
    q.capacity = 5;
    return q;
}

bool enqueue(CircularQueue* q, int x) {
    if (q->size == q->capacity) return false;
    q->rear = (q->rear + 1) % q->capacity;
    q->arr[q->rear] = x;
    q->size++;
    return true;
}

bool dequeue(CircularQueue* q) {
    if (q->size == 0) return false;
    q->front = (q->front + 1) % q->capacity;
    q->size--;
    return true;
}

int peek(CircularQueue* q) {
    if (q->size == 0) return -1;
    return q->arr[q->front];
}

bool isEmpty(CircularQueue* q) {
    return q->size == 0;
}

bool isFull(CircularQueue* q) {
    return q->size == q->capacity;
}
`,
    },
  },
];
