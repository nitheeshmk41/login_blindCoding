"use client";

import React, { useState } from "react";
import { Play, RotateCcw, ArrowRight, CheckCircle2, ChevronRight, Info } from "lucide-react";

interface LearningVizProps {
  typeId?: "ARRAY_QUEUE_FRONT_REAR" | "LINKED_LIST_REMOVE_DUPES";
  initialMode?: "circular" | "standard";
}

export default function LearningViz({
  typeId = "ARRAY_QUEUE_FRONT_REAR",
  initialMode = "circular",
}: LearningVizProps) {
  const [activeTab, setActiveTab] = useState<"queue" | "list">(
    typeId === "ARRAY_QUEUE_FRONT_REAR" ? "queue" : "list"
  );

  // --- Circular Queue Visualizer State ---
  const CAPACITY = 5;
  const [queueArray, setQueueArray] = useState<(number | null)[]>([null, null, null, null, null]);
  const [front, setFront] = useState<number>(0);
  const [rear, setRear] = useState<number>(0);
  const [size, setSize] = useState<number>(0);
  const [inputValue, setInputValue] = useState<string>("10");
  const [queueLogs, setQueueLogs] = useState<string[]>([
    "Queue initialized: capacity = 5, front = 0, rear = 0, size = 0",
  ]);
  const [peekResult, setPeekResult] = useState<string | null>(null);

  // --- Linked List Visualizer State ---
  const [listNodes, setListNodes] = useState<number[]>([10, 20, 10, 30, 20, 40]);
  const [currentIdx, setCurrentIdx] = useState<number>(-1);
  const [runnerIdx, setRunnerIdx] = useState<number>(-1);
  const [isSimulatingList, setIsSimulatingList] = useState<boolean>(false);
  const [listLogs, setListLogs] = useState<string[]>([
    "Initial linked list: 10 → 20 → 10 → 30 → 20 → 40 → NULL",
  ]);

  // Queue Operations
  const handleEnqueue = (valOverride?: number) => {
    const val = valOverride !== undefined ? valOverride : parseInt(inputValue, 10);
    if (isNaN(val)) return;

    if (size >= CAPACITY) {
      setQueueLogs((prev) => [
        `❌ enqueue(${val}) failed: Queue is FULL (isFull() == true)`,
        ...prev,
      ]);
      setPeekResult(null);
      return;
    }

    const nextQueue = [...queueArray];
    const insertIdx = size === 0 ? front : (rear + 1) % CAPACITY;
    nextQueue[insertIdx] = val;

    setQueueArray(nextQueue);
    setRear(insertIdx);
    setSize((s) => s + 1);
    setPeekResult(null);

    const isWrap = insertIdx < rear || (size > 0 && insertIdx === 0);
    setQueueLogs((prev) => [
      `✅ enqueue(${val}) → placed at index ${insertIdx} ${
        isWrap ? "(Wrapped around!)" : ""
      }. front=${front}, rear=${insertIdx}, size=${size + 1}`,
      ...prev,
    ]);

    if (valOverride === undefined) {
      setInputValue((prev) => (parseInt(prev, 10) + 10).toString());
    }
  };

  const handleDequeue = () => {
    if (size === 0) {
      setQueueLogs((prev) => ["❌ dequeue() failed: Queue is EMPTY (isEmpty() == true)", ...prev]);
      setPeekResult(null);
      return;
    }

    const removedVal = queueArray[front];
    const nextQueue = [...queueArray];
    nextQueue[front] = null;

    const nextFront = size === 1 ? front : (front + 1) % CAPACITY;

    setQueueArray(nextQueue);
    setFront(nextFront);
    setSize((s) => s - 1);
    setPeekResult(null);

    setQueueLogs((prev) => [
      `📤 dequeue() → removed ${removedVal} from index ${front}. front=${nextFront}, rear=${rear}, size=${
        size - 1
      }`,
      ...prev,
    ]);
  };

  const handlePeek = () => {
    if (size === 0) {
      setPeekResult("Queue is empty (-1)");
      setQueueLogs((prev) => ["👀 peek() → -1 (Queue is empty)", ...prev]);
    } else {
      const val = queueArray[front];
      setPeekResult(`Front element is ${val}`);
      setQueueLogs((prev) => [`👀 peek() → ${val} (element at front index ${front})`, ...prev]);
    }
  };

  const handleResetQueue = () => {
    setQueueArray([null, null, null, null, null]);
    setFront(0);
    setRear(0);
    setSize(0);
    setInputValue("10");
    setPeekResult(null);
    setQueueLogs(["Queue reset: capacity = 5, front = 0, rear = 0, size = 0"]);
  };

  // Automated step-by-step example sequence from prompt
  const runQueueExampleWalkthrough = async () => {
    handleResetQueue();
    await new Promise((r) => setTimeout(r, 400));

    // Enqueue 10, 20, 30, 40, 50
    const values = [10, 20, 30, 40, 50];
    let curArray: (number | null)[] = [10, 20, 30, 40, 50];
    setQueueArray(curArray);
    setFront(0);
    setRear(4);
    setSize(5);
    setQueueLogs((prev) => [
      "▶ Example Walkthrough: Enqueued 10, 20, 30, 40, 50. Queue is now FULL [10, 20, 30, 40, 50]",
      ...prev,
    ]);

    await new Promise((r) => setTimeout(r, 1200));

    // Dequeue x2 (10 and 20)
    curArray[0] = null;
    curArray[1] = null;
    setQueueArray([...curArray]);
    setFront(2);
    setRear(4);
    setSize(3);
    setQueueLogs((prev) => [
      "▶ Example Walkthrough: Dequeued 10 & 20. freed indices 0 & 1. front=2, rear=4, size=3",
      ...prev,
    ]);

    await new Promise((r) => setTimeout(r, 1200));

    // Enqueue 60 and 70 (wrap around!)
    curArray[0] = 60;
    curArray[1] = 70;
    setQueueArray([...curArray]);
    setFront(2);
    setRear(1);
    setSize(5);
    setQueueLogs((prev) => [
      "🔄 Wrap-Around! Enqueued 60 & 70. Reused indices 0 & 1. [60, 70, 30, 40, 50] (front=2, rear=1)",
      ...prev,
    ]);
  };

  // Linked List Duplicates Removal Simulation
  const runListSimulation = async () => {
    if (isSimulatingList) return;
    setIsSimulatingList(true);
    let arr = [10, 20, 10, 30, 20, 40];
    setListNodes([...arr]);
    setListLogs(["Starting in-place O(n²) remove duplicates simulation..."]);

    for (let i = 0; i < arr.length; i++) {
      setCurrentIdx(i);
      setListLogs((prev) => [
        `Outer loop: current node value = ${arr[i]} at index ${i}`,
        ...prev,
      ]);
      await new Promise((r) => setTimeout(r, 800));

      let j = i;
      while (j < arr.length - 1) {
        setRunnerIdx(j + 1);
        await new Promise((r) => setTimeout(r, 600));

        if (arr[j + 1] === arr[i]) {
          setListLogs((prev) => [
            `✂ Duplicate found! Unlinking node with value ${arr[j + 1]} at index ${j + 1}`,
            ...prev,
          ]);
          arr.splice(j + 1, 1);
          setListNodes([...arr]);
          await new Promise((r) => setTimeout(r, 800));
        } else {
          j++;
        }
      }
    }

    setCurrentIdx(-1);
    setRunnerIdx(-1);
    setIsSimulatingList(false);
    setListLogs((prev) => [
      `🎉 In-place duplicate removal complete! Result: ${arr.join(" → ")} → NULL`,
      ...prev,
    ]);
  };

  const handleResetList = () => {
    setListNodes([10, 20, 10, 30, 20, 40]);
    setCurrentIdx(-1);
    setRunnerIdx(-1);
    setIsSimulatingList(false);
    setListLogs(["Linked list reset to: 10 → 20 → 10 → 30 → 20 → 40 → NULL"]);
  };

  return (
    <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-4 sm:p-5 shadow-lg space-y-4">
      {/* Header Controls */}
      <div className="flex items-center justify-between border-b border-zinc-800 pb-3">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-red-950 border border-red-800 flex items-center justify-center text-red-400 font-mono font-bold text-xs">
            VIZ
          </div>
          <div>
            <h3 className="text-xs font-mono font-bold text-white uppercase tracking-wider">
              Interactive Algorithm Visualizer
            </h3>
            <p className="text-[11px] font-mono text-zinc-400">
              Step-by-step visual demonstration of data structure operations
            </p>
          </div>
        </div>

        {/* Tab Switcher */}
        <div className="flex bg-zinc-900 p-0.5 rounded-lg border border-zinc-800 text-xs font-mono">
          <button
            onClick={() => setActiveTab("queue")}
            className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-colors ${
              activeTab === "queue" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Circular Queue (5)
          </button>
          <button
            onClick={() => setActiveTab("list")}
            className={`px-3 py-1 rounded text-[11px] font-bold uppercase transition-colors ${
              activeTab === "list" ? "bg-red-600 text-white" : "text-zinc-400 hover:text-white"
            }`}
          >
            Linked List Dedupe
          </button>
        </div>
      </div>

      {/* --- TAB 1: CIRCULAR QUEUE --- */}
      {activeTab === "queue" && (
        <div className="space-y-4">
          {/* Status Bar */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 font-mono text-xs text-center">
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">FRONT POINTER</span>
              <span className="text-emerald-400 font-bold text-sm">Index {front}</span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">REAR POINTER</span>
              <span className="text-blue-400 font-bold text-sm">Index {rear}</span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">SIZE / CAPACITY</span>
              <span className="text-amber-400 font-bold text-sm">
                {size} / {CAPACITY}
              </span>
            </div>
            <div className="p-2 rounded bg-zinc-900 border border-zinc-800">
              <span className="text-zinc-500 block text-[10px]">STATE</span>
              <span
                className={`font-bold text-sm ${
                  size === CAPACITY
                    ? "text-red-400"
                    : size === 0
                    ? "text-zinc-400"
                    : "text-emerald-400"
                }`}
              >
                {size === CAPACITY ? "FULL" : size === 0 ? "EMPTY" : "ACTIVE"}
              </span>
            </div>
          </div>

          {/* Array Grid Representation */}
          <div className="p-4 rounded-lg bg-black border border-zinc-900 space-y-3">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-zinc-500" />
                Array Buffer [Capacity: 5]
              </span>
              <span className="text-[11px] text-zinc-500">
                Modulo Formula: <code className="text-red-400">(rear + 1) % 5</code>
              </span>
            </div>

            {/* Slots */}
            <div className="grid grid-cols-5 gap-2">
              {queueArray.map((val, idx) => {
                const isFront = size > 0 && idx === front;
                const isRear = size > 0 && idx === rear;
                const isEmptySlot = val === null;

                return (
                  <div
                    key={idx}
                    className={`relative flex flex-col items-center justify-center h-20 rounded-lg border transition-all duration-300 ${
                      isFront && isRear
                        ? "bg-purple-950/60 border-purple-500 ring-2 ring-purple-500/40"
                        : isFront
                        ? "bg-emerald-950/60 border-emerald-500 ring-2 ring-emerald-500/40"
                        : isRear
                        ? "bg-blue-950/60 border-blue-500 ring-2 ring-blue-500/40"
                        : isEmptySlot
                        ? "bg-zinc-950 border-zinc-800 text-zinc-600"
                        : "bg-zinc-900 border-zinc-700 text-white font-bold"
                    }`}
                  >
                    {/* Index Badge */}
                    <span className="absolute top-1 left-1.5 text-[10px] font-mono text-zinc-500">
                      [{idx}]
                    </span>

                    {/* Pointer Labels */}
                    <div className="absolute top-1 right-1.5 flex gap-1 font-mono text-[9px]">
                      {isFront && (
                        <span className="px-1 rounded bg-emerald-500 text-black font-bold">
                          FRONT
                        </span>
                      )}
                      {isRear && (
                        <span className="px-1 rounded bg-blue-500 text-white font-bold">
                          REAR
                        </span>
                      )}
                    </div>

                    {/* Value */}
                    <span className="font-mono text-lg font-bold">
                      {val !== null ? val : "—"}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Operation Toolbar */}
          <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
            <div className="flex items-center gap-2">
              <input
                type="number"
                value={inputValue}
                onChange={(e) => setInputValue(e.target.value)}
                className="w-20 bg-zinc-900 border border-zinc-800 focus:border-red-600 text-zinc-100 font-mono text-xs rounded px-2 py-1.5 outline-none"
                placeholder="Val"
              />
              <button
                onClick={() => handleEnqueue()}
                disabled={size >= CAPACITY}
                className="px-3 py-1.5 rounded bg-emerald-700 hover:bg-emerald-600 text-white font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                enqueue({inputValue || "?"})
              </button>
              <button
                onClick={handleDequeue}
                disabled={size === 0}
                className="px-3 py-1.5 rounded bg-red-700 hover:bg-red-600 text-white font-mono text-xs font-bold transition-all cursor-pointer disabled:opacity-40"
              >
                dequeue()
              </button>
              <button
                onClick={handlePeek}
                className="px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 font-mono text-xs font-semibold border border-zinc-700 transition-all cursor-pointer"
              >
                peek()
              </button>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={runQueueExampleWalkthrough}
                className="px-3 py-1.5 rounded bg-zinc-900 hover:bg-zinc-800 border border-red-600/60 text-red-400 hover:text-white font-mono text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Play className="w-3.5 h-3.5" />
                Run Example Sequence
              </button>
              <button
                onClick={handleResetQueue}
                className="p-1.5 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-400 hover:text-white cursor-pointer"
                title="Reset"
              >
                <RotateCcw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>

          {peekResult && (
            <div className="p-2.5 rounded bg-zinc-900 border border-zinc-800 text-xs font-mono text-amber-400 font-semibold">
              Result: {peekResult}
            </div>
          )}

          {/* Operation Log */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
              Execution Log:
            </span>
            <div className="p-2.5 rounded bg-black border border-zinc-900 font-mono text-xs text-zinc-400 max-h-32 overflow-y-auto space-y-1">
              {queueLogs.map((log, i) => (
                <div key={i} className={i === 0 ? "text-zinc-200 font-bold" : "text-zinc-500"}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* --- TAB 2: LINKED LIST DUPLICATES REMOVAL --- */}
      {activeTab === "list" && (
        <div className="space-y-4">
          <div className="p-4 rounded-lg bg-black border border-zinc-900 space-y-4">
            <div className="flex items-center justify-between text-xs font-mono text-zinc-400">
              <span>Singly Linked List Nodes</span>
              <span className="text-[11px] text-zinc-500">Constraint: In-place O(n²) space O(1)</span>
            </div>

            {/* List Nodes Visualization */}
            <div className="flex flex-wrap items-center gap-2 min-h-[70px]">
              {listNodes.map((val, idx) => {
                const isCurrent = idx === currentIdx;
                const isRunner = idx === runnerIdx;

                return (
                  <React.Fragment key={idx}>
                    <div
                      className={`relative flex flex-col items-center justify-center w-14 h-14 rounded-lg border font-mono font-bold text-sm transition-all ${
                        isCurrent
                          ? "bg-amber-950/70 border-amber-500 text-amber-300 ring-2 ring-amber-500/40 scale-105"
                          : isRunner
                          ? "bg-purple-950/70 border-purple-500 text-purple-300 ring-2 ring-purple-500/40 scale-105"
                          : "bg-zinc-900 border-zinc-800 text-white"
                      }`}
                    >
                      <span>{val}</span>

                      {/* Pointer Badge */}
                      <div className="absolute -bottom-5 flex gap-0.5 text-[9px] font-mono">
                        {isCurrent && (
                          <span className="px-1 rounded bg-amber-500 text-black font-bold">
                            CURR
                          </span>
                        )}
                        {isRunner && (
                          <span className="px-1 rounded bg-purple-500 text-white font-bold">
                            RUN
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Pointer Arrow */}
                    <ArrowRight className="w-4 h-4 text-zinc-600 shrink-0" />
                  </React.Fragment>
                );
              })}

              <div className="w-14 h-14 rounded-lg border border-dashed border-zinc-800 flex items-center justify-center font-mono text-xs text-zinc-600">
                NULL
              </div>
            </div>
          </div>

          {/* Controls */}
          <div className="flex items-center justify-between">
            <button
              onClick={runListSimulation}
              disabled={isSimulatingList}
              className="btn-primary-red px-4 py-2 rounded-lg text-xs font-mono font-bold flex items-center gap-2 cursor-pointer disabled:opacity-40"
            >
              <Play className="w-3.5 h-3.5" />
              {isSimulatingList ? "Simulating..." : "Simulate removeDuplicates(head)"}
            </button>

            <button
              onClick={handleResetList}
              disabled={isSimulatingList}
              className="px-3 py-2 rounded bg-zinc-900 border border-zinc-800 hover:border-zinc-700 text-zinc-300 hover:text-white font-mono text-xs flex items-center gap-1.5 cursor-pointer disabled:opacity-40"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              Reset List
            </button>
          </div>

          {/* Log */}
          <div className="space-y-1">
            <span className="text-[11px] font-mono text-zinc-500 uppercase tracking-wider block font-bold">
              Simulation Steps:
            </span>
            <div className="p-2.5 rounded bg-black border border-zinc-900 font-mono text-xs text-zinc-400 max-h-32 overflow-y-auto space-y-1">
              {listLogs.map((log, i) => (
                <div key={i} className={i === 0 ? "text-zinc-200 font-bold" : "text-zinc-500"}>
                  {log}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
