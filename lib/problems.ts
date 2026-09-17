import { Problem } from "./types";

export const CONTEST_PROBLEMS: Problem[] = [
  {
    id: "p1-demo-array",
    order: 1,
    title: "Das's Stolen Money (Demo)",
    topic: "Arrays",
    difficulty: "Easy",
    isDemo: true,
    baseScore: 0,
    timeLimitMinutes: 5,
    description: `In the movie "DC" (2026), Das's gang recovers stolen cash bundles from Bhojaraj's operatives. The recovered amounts are stored in an array of integers:
Example: [500, 1200, 750, 2000, 950]

Write a simple function to calculate and return the total sum of all recovered money amounts in the array.

Note:
• This is a DEMO Question (5 Mins working time).
• NO MARKS and NO EVALUATION for this question.
• Use this question to get comfortable typing without visual syntax feedback in the Blind Coding workspace!`,
    inputFormat: `An array of integers representing recovered money amounts and the size of the array N.`,
    outputFormat: `Return the integer total sum of all recovered money amounts.`,
    examples: [
      {
        input: "amounts = [500, 1200, 750, 2000, 950], N = 5",
        output: "5400",
        explanation: "500 + 1200 + 750 + 2000 + 950 = 5400 total recovered cash.",
      },
      {
        input: "amounts = [100, 200, 300], N = 3",
        output: "600",
        explanation: "100 + 200 + 300 = 600.",
      },
    ],
    constraints: [
      "0 <= N <= 1000",
      "0 <= amounts[i] <= 10^5",
      "Demo Question: 5 Minutes working time. No marks or evaluation.",
    ],
    hints: [
      "Initialize sum = 0.",
      "Iterate through the array from i = 0 to N - 1 and add amounts[i] to sum.",
      "Return sum.",
    ],
    solutionGuide: `// Simple Array Sum Pseudocode:
// int total = 0;
// for (int val : amounts) total += val;
// return total;`,
    starterCode: {
      cpp: `#include <vector>
#include <numeric>

int calculateTotalMoney(const std::vector<int>& amounts) {
    int total = 0;
    for (int amount : amounts) {
        total += amount;
    }
    return total;
}
`,
      java: `class Solution {
    public int calculateTotalMoney(int[] amounts) {
        int total = 0;
        for (int amount : amounts) {
            total += amount;
        }
        return total;
    }
}
`,
      javascript: `function calculateTotalMoney(amounts) {
    let total = 0;
    for (let i = 0; i < amounts.length; i++) {
        total += amounts[i];
    }
    return total;
}
`,
      python: `class Solution:
    def calculateTotalMoney(self, amounts: list[int]) -> int:
        return sum(amounts)
`,
      c: `int calculateTotalMoney(int amounts[], int n) {
    int total = 0;
    for (int i = 0; i < n; i++) {
        total += amounts[i];
    }
    return total;
}
`,
    },
  },
  {
    id: "p2-stack-lodge",
    order: 2,
    title: "The Lodge Escape (Problem 1)",
    topic: "Stack",
    difficulty: "Medium",
    isDemo: false,
    baseScore: 100,
    timeLimitMinutes: 25,
    description: `In DC (2026), Das escapes through a sequential series of rooms in Bhojaraj's lodge:
Entering order: Room 1 → Room 2 → Room 3 → Room 4.

When the police task force seals off the main entrance, Das must exit in exact reverse Last-In-First-Out (LIFO) order:
Exit order: Room 4 → Room 3 → Room 2 → Room 1.

Implement a Stack data structure to simulate Das's room entry and escape sequence:
• push(roomId): Pushes room ID onto stack as Das enters a room.
• pop(): Removes and returns the top room ID as Das exits the current room (-1 if empty).
• peek(): Returns top room ID without removing it (-1 if empty).
• isEmpty(): Returns true if all rooms are cleared (stack is empty).

Goal: Maintain proper stack operations without corrupting room order.`,
    inputFormat: `Sequence of stack operations (push, pop, peek, isEmpty).`,
    outputFormat: `Room IDs returned during pop/peek queries and boolean for isEmpty.`,
    examples: [
      {
        input: "push(1), push(2), push(3), push(4), pop(), pop(), pop(), pop()",
        output: "Popped values: 4, 3, 2, 1",
        explanation: "Rooms entered 1->2->3->4 are exited in reverse LIFO order 4->3->2->1.",
      },
      {
        input: "isEmpty() on new stack; push(10); peek(); pop()",
        output: "isEmpty() -> true; peek() -> 10; pop() -> 10",
        explanation: "Stack operates cleanly with top pointer management.",
      },
    ],
    constraints: [
      "1 <= Number of room IDs <= 500",
      "0 <= roomId <= 10^4",
      "Stack operations push, pop, peek must execute in O(1) time.",
    ],
    hints: [
      "Use an internal array or vector with a top pointer index initialized to -1.",
      "push(x): increment top, set arr[top] = x.",
      "pop(): if top < 0 return -1; else return arr[top--].",
    ],
    solutionGuide: `// Stack Implementation Guide:
// push(x): arr[++top] = x
// pop(): return top < 0 ? -1 : arr[top--]
// peek(): return top < 0 ? -1 : arr[top]`,
    starterCode: {
      cpp: `#include <vector>
#include <iostream>

class LodgeEscapeStack {
private:
    std::vector<int> stack;

public:
    void push(int roomId) {
        stack.push_back(roomId);
    }

    int pop() {
        if (isEmpty()) return -1;
        int topVal = stack.back();
        stack.pop_back();
        return topVal;
    }

    int peek() {
        if (isEmpty()) return -1;
        return stack.back();
    }

    bool isEmpty() {
        return stack.empty();
    }
};
`,
      java: `import java.util.Stack;

class LodgeEscapeStack {
    private Stack<Integer> stack = new Stack<>();

    public void push(int roomId) {
        stack.push(roomId);
    }

    public int pop() {
        if (isEmpty()) return -1;
        return stack.pop();
    }

    public int peek() {
        if (isEmpty()) return -1;
        return stack.peek();
    }

    public boolean isEmpty() {
        return stack.isEmpty();
    }
}
`,
      javascript: `class LodgeEscapeStack {
    constructor() {
        this.stack = [];
    }

    push(roomId) {
        this.stack.push(roomId);
    }

    pop() {
        if (this.isEmpty()) return -1;
        return this.stack.pop();
    }

    peek() {
        if (this.isEmpty()) return -1;
        return this.stack[this.stack.length - 1];
    }

    isEmpty() {
        return this.stack.length === 0;
    }
}
`,
      python: `class LodgeEscapeStack:
    def __init__(self):
        self.stack = []

    def push(self, roomId: int):
        self.stack.append(roomId)

    def pop(self) -> int:
        if self.isEmpty():
            return -1
        return self.stack.pop()

    def peek(self) -> int:
        if self.isEmpty():
            return -1
        return self.stack[-1]

    def isEmpty(self) -> bool:
        return len(self.stack) == 0
`,
      c: `#include <stdbool.h>

typedef struct {
    int arr[500];
    int top;
} LodgeEscapeStack;

LodgeEscapeStack createStack() {
    LodgeEscapeStack s;
    s.top = -1;
    return s;
}

void push(LodgeEscapeStack* s, int roomId) {
    if (s->top < 499) {
        s->arr[++(s->top)] = roomId;
    }
}

int pop(LodgeEscapeStack* s) {
    if (s->top < 0) return -1;
    return s->arr[(s->top)--];
}

int peek(LodgeEscapeStack* s) {
    if (s->top < 0) return -1;
    return s->arr[s->top];
}

bool isEmpty(LodgeEscapeStack* s) {
    return s->top < 0;
}
`,
    },
  },
  {
    id: "p3-linkedlist-gang",
    order: 3,
    title: "Das's Gang (Problem 2)",
    topic: "Linked Lists",
    difficulty: "Medium",
    isDemo: false,
    baseScore: 100,
    timeLimitMinutes: 30,
    description: `In DC (2026), Das's gang members (Das, Karuppu, Sebastian, Kitty, etc.) are connected in a singly linked list in the exact order they joined the gang.

During a high-stakes escape from the police task force, one member leaves or is compromised. Given the head of the gang linked list and an integer targetVal representing the member to remove, remove all occurrences of that member in-place from the linked list and return the head of the updated gang list.

Example:
Input List:  Das (10) → Karuppu (20) → Sebastian (30) → Kitty (40) → NULL
Remove Target: 30 (Sebastian)
Output List: Das (10) → Karuppu (20) → Kitty (40) → NULL

Constraints & Directives:
• Do NOT use an auxiliary array, set, or dummy list data structures (O(1) extra space).
• Modify node pointer references strictly in-place.
• Handle edge cases: removing head node, removing consecutive matching nodes, or if targetVal is not present.
• Blind Coding Challenge: Track pointer mutations mentally!`,
    inputFormat: `Head node of a singly linked list representing member IDs and an integer targetVal.`,
    outputFormat: `Return the head pointer of the modified singly linked list with matching target member IDs unlinked.`,
    examples: [
      {
        input: "10 → 20 → 30 → 40 → NULL, targetVal = 30",
        output: "10 → 20 → 40 → NULL",
        explanation: "Sebastian (ID 30) is unlinked from the gang list.",
      },
      {
        input: "10 → 10 → 20 → 10 → NULL, targetVal = 10",
        output: "20 → NULL",
        explanation: "All head and trailing occurrences of ID 10 are unlinked.",
      },
      {
        input: "5 → 15 → 25 → NULL, targetVal = 100",
        output: "5 → 15 → 25 → NULL",
        explanation: "Target ID 100 is not found; linked list remains unchanged.",
      },
    ],
    constraints: [
      "0 <= Number of gang member nodes <= 1000",
      "-10^4 <= Node.val <= 10^4",
      "Space complexity: O(1) auxiliary space (In-place pointer manipulation).",
      "Time complexity target: O(n).",
    ],
    hints: [
      "Use a sentinel dummy node (dummy.next = head) and a prev pointer to handle removing head nodes easily.",
      "Traverse current pointer; if current.val == targetVal, bypass node: prev.next = current.next.",
      "Ensure proper deletion/cleanup of unlinked nodes in languages like C/C++.",
    ],
    solutionGuide: `// In-Place Linked List Removal Algorithm:
// 1. Create sentinel dummy node pointing to head.
// 2. Set prev = dummy, current = head.
// 3. While current != null:
// 4.    If current.val == targetVal: prev.next = current.next; delete current; current = prev.next;
// 5.    Else: prev = current; current = current.next;
// 6. Return dummy.next.`,
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

ListNode* removeGangMember(ListNode* head, int targetVal) {
    ListNode dummy(0);
    dummy.next = head;
    ListNode* prev = &dummy;
    ListNode* current = head;
    
    while (current != nullptr) {
        if (current->val == targetVal) {
            prev->next = current->next;
            delete current;
            current = prev->next;
        } else {
            prev = current;
            current = current->next;
        }
    }
    
    return dummy.next;
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
    public ListNode removeGangMember(ListNode head, int targetVal) {
        ListNode dummy = new ListNode(0);
        dummy.next = head;
        ListNode prev = dummy;
        ListNode current = head;
        
        while (current != null) {
            if (current.val == targetVal) {
                prev.next = current.next;
            } else {
                prev = current;
            }
            current = current.next;
        }
        
        return dummy.next;
    }
}
`,
      javascript: `/**
 * Definition for singly-linked list.
 * function ListNode(val, next) {
 *     this.val = (val===undefined ? 0 : val);
 *     this.next = (next===undefined ? null : next);
 * }
 */
function removeGangMember(head, targetVal) {
    const dummy = new ListNode(0, head);
    let prev = dummy;
    let current = head;
    
    while (current !== null) {
        if (current.val === targetVal) {
            prev.next = current.next;
        } else {
            prev = current;
        }
        current = current.next;
    }
    
    return dummy.next;
}
`,
      python: `# Definition for singly-linked list.
# class ListNode:
#     def __init__(self, val=0, next=None):
#         self.val = val
#         self.next = next

class Solution:
    def removeGangMember(self, head: ListNode, targetVal: int) -> ListNode:
        dummy = ListNode(0, head)
        prev = dummy
        current = head
        
        while current:
            if current.val == targetVal:
                prev.next = current.next
            else:
                prev = current
            current = current.next
            
        return dummy.next
`,
      c: `/**
 * Definition for singly-linked list.
 * struct ListNode {
 *     int val;
 *     struct ListNode *next;
 * };
 */
#include <stdlib.h>

struct ListNode* removeGangMember(struct ListNode* head, int targetVal) {
    struct ListNode dummy;
    dummy.val = 0;
    dummy.next = head;
    struct ListNode* prev = &dummy;
    struct ListNode* current = head;
    
    while (current != NULL) {
        if (current->val == targetVal) {
            struct ListNode* temp = current;
            prev->next = current->next;
            current = current->next;
            free(temp);
        } else {
            prev = current;
            current = current->next;
        }
    }
    
    return dummy.next;
}
`,
    },
  },
];
