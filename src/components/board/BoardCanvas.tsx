import React, { useCallback, useEffect, useMemo, useRef, useState, type CSSProperties, type DragEvent } from 'react';
import {
  Background,
  BackgroundVariant,
  ConnectionMode,
  Controls,
  MiniMap,
  Panel,
  ReactFlow,
  ReactFlowProvider,
  SelectionMode,
  applyEdgeChanges,
  applyNodeChanges,
  useReactFlow,
  type Connection,
  type Edge,
  type EdgeChange,
  type IsValidConnection,
  type Node,
  type NodeChange,
  type NodeTypes,
} from 'reactflow';
import 'reactflow/dist/style.css';
import type { BoardState, BoardValidationReport } from '@/core/board/boardTypes';
import type { ReactFlowBoardEdgeData, ReactFlowBoardSnapshot, ReactFlowChipNodeData } from '@/core/board/reactFlowMapper';
import {
  BOARD_EDGE_TYPE,
  boardToReactFlow,
  canConnectReactFlowEdge,
  createBoardEdgeFromConnection,
  createEdgePreview,
  createReactFlowNodeForChip,
  reactFlowToBoard,
  syncEdgesFromReactFlow,
  syncNodePositionsToBoard,
} from '@/core/board/reactFlowMapper';
import { BreadboardEdge } from '@/components/board/BreadboardEdge';
import { ChipNode } from '@/components/board/ChipNode';
import { applyValidationToEdges, summarizeValidationReport, validateBoard } from '@/core/board/validation';

/** RF 노드/엣지의 selected·dragging을 보드에서 온 스냅샷에 합쳐 선택 상태가 유실되지 않게 함 */
function mergeFlowSelection(
  snap: ReactFlowBoardSnapshot,
  liveNodes: Array<Node<ReactFlowChipNodeData>>,
  liveEdges: Array<Edge<ReactFlowBoardEdgeData>>,
): ReactFlowBoardSnapshot {
  return {
    nodes: snap.nodes.map((n) => {
      const live = liveNodes.find((ln) => ln.id === n.id);
      return live ? { ...n, selected: live.selected, dragging: live.dragging } : n;
    }),
    edges: snap.edges.map((e) => {
      const live = liveEdges.find((le) => le.id === e.id);
      return live ? { ...e, selected: live.selected } : e;
    }),
  };
}

function normalizeReactFlowConnection(connection: Connection | Edge): Connection {
  return {
    source: connection.source,
    target: connection.target,
    sourceHandle: connection.sourceHandle ?? null,
    targetHandle: connection.targetHandle ?? null,
  };
}

export type BoardCanvasSelection = {
  chipIds: string[];
  edgeIds: string[];
};

export type BoardCanvasProps = {
  board: BoardState;
  onBoardChange?: (board: BoardState) => void;
  onValidationChange?: (report: BoardValidationReport) => void;
  onSelectionChange?: (selection: BoardCanvasSelection) => void;
  onConnectionPreviewChange?: (preview: ReturnType<typeof createEdgePreview> | null) => void;
  onRunClick?: () => void;
  /** 상단 좌측 보드 이름/Run 오버레이 (레이아웃에서 별도 배치 시 false) */
  showBoardHud?: boolean;
  /** true이면 HUD에서 보드 이름을 입력으로 수정 (onBoardNameChange 필요) */
  editableBoardName?: boolean;
  onBoardNameChange?: (name: string) => void;
  readOnly?: boolean;
  className?: string;
  style?: CSSProperties;
  showMiniMap?: boolean;
  showControls?: boolean;
  showValidationPanel?: boolean;
  fitView?: boolean;
  droppedChipTypeDataKey?: string;
  /** Run 시 현재 실행 중인 칩 id — 해당 칩에서 나가는 연결선에 흐름 애니메이션 */
  flowPulseFromChipId?: string | null;
};

const nodeTypes: NodeTypes = {
  breadboardChip: ChipNode,
};

const edgeTypes = {
  [BOARD_EDGE_TYPE]: BreadboardEdge,
};

function BoardCanvasInner({
  board,
  onBoardChange,
  onValidationChange,
  onSelectionChange,
  onConnectionPreviewChange,
  onRunClick,
  showBoardHud = true,
  editableBoardName = false,
  onBoardNameChange,
  readOnly = false,
  className,
  style,
  showMiniMap = true,
  showControls = true,
  showValidationPanel = true,
  fitView = true,
  droppedChipTypeDataKey = 'application/x-breadboard-chip-type',
  flowPulseFromChipId = null,
}: BoardCanvasProps) {
  const reactFlow = useReactFlow<ReactFlowChipNodeData, ReactFlowBoardEdgeData>();
  const initialSnapshot = useMemo(() => boardToReactFlow(board), [board]);
  const [snapshot, setSnapshot] = useState<ReactFlowBoardSnapshot>(initialSnapshot);
  const [validationReport, setValidationReport] = useState<BoardValidationReport>(() => validateBoard(board));
  const [boardNameDraft, setBoardNameDraft] = useState(board.name);
  const containerRef = useRef<HTMLDivElement | null>(null);
  /** 빈 판에서 드래그한 사각형 선택 중일 때만 RF의 select 변경을 적용 (클릭 토글과 공존) */
  const selectionRectangleActiveRef = useRef(false);

  useEffect(() => {
    setBoardNameDraft(board.name);
  }, [board.name]);

  useEffect(() => {
    const validatedBoard = applyValidationToEdges(board);
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSnapshot(boardToReactFlow(validatedBoard));
    const report = validateBoard(validatedBoard);
    setValidationReport(report);
    onValidationChange?.(report);
  }, [board, onValidationChange]);

  const commitBoard = useCallback(
    (nextBoard: BoardState) => {
      const validatedBoard = applyValidationToEdges(nextBoard);
      const nextSnapshot = boardToReactFlow(validatedBoard);
      const report = validateBoard(validatedBoard);

      setSnapshot(nextSnapshot);
      setValidationReport(report);
      onBoardChange?.(validatedBoard);
      onValidationChange?.(report);

      const chipIds = nextSnapshot.nodes.filter((node) => node.selected).map((node) => node.id);
      const edgeIds = nextSnapshot.edges.filter((edge) => edge.selected).map((edge) => edge.id);
      onSelectionChange?.({ chipIds, edgeIds });
    },
    [onBoardChange, onSelectionChange, onValidationChange]
  );

  const handleNodesChange = useCallback(
    (changes: NodeChange[]) => {
      /** 사각형 드래그 선택이 아닐 때의 select는 클릭 토글(onNodeClick)과 충돌 → 무시 */
      const filtered = selectionRectangleActiveRef.current
        ? changes
        : changes.filter((c) => c.type !== 'select');
      if (filtered.length === 0) return;

      setSnapshot((current) => {
        const nextNodes = applyNodeChanges(filtered, current.nodes);

        const nextBoard = syncNodePositionsToBoard(
          reactFlowToBoard({
            boardId: board.id,
            name: board.name,
            nodes: nextNodes,
            edges: current.edges,
            logs: board.logs,
            viewport: board.viewport,
            meta: board.meta,
          }),
          nextNodes
        );

        const validatedBoard = applyValidationToEdges(nextBoard);
        const report = validateBoard(validatedBoard);
        const merged = mergeFlowSelection(boardToReactFlow(validatedBoard), nextNodes, current.edges);

        queueMicrotask(() => {
          setValidationReport(report);
          onBoardChange?.(validatedBoard);
          onValidationChange?.(report);
          onSelectionChange?.({
            chipIds: nextNodes.filter((n) => n.selected).map((n) => n.id),
            edgeIds: current.edges.filter((e) => e.selected).map((e) => e.id),
          });
        });

        return merged;
      });
    },
    [board, onBoardChange, onSelectionChange, onValidationChange]
  );

  const handleEdgesChange = useCallback(
    (changes: EdgeChange[]) => {
      const filtered = selectionRectangleActiveRef.current
        ? changes
        : changes.filter((c) => c.type !== 'select');
      if (filtered.length === 0) return;

      setSnapshot((current) => {
        const nextEdges = applyEdgeChanges(filtered, current.edges);

        const baseBoard = reactFlowToBoard({
          boardId: board.id,
          name: board.name,
          nodes: current.nodes,
          edges: nextEdges,
          logs: board.logs,
          viewport: board.viewport,
          meta: board.meta,
        });
        const nextBoard = syncEdgesFromReactFlow(baseBoard, nextEdges);

        const validatedBoard = applyValidationToEdges(nextBoard);
        const report = validateBoard(validatedBoard);
        const merged = mergeFlowSelection(boardToReactFlow(validatedBoard), current.nodes, nextEdges);

        queueMicrotask(() => {
          setValidationReport(report);
          onBoardChange?.(validatedBoard);
          onValidationChange?.(report);
          onSelectionChange?.({
            chipIds: current.nodes.filter((n) => n.selected).map((n) => n.id),
            edgeIds: nextEdges.filter((e) => e.selected).map((e) => e.id),
          });
        });

        return merged;
      });
    },
    [board, onBoardChange, onSelectionChange, onValidationChange]
  );

  const handleConnect = useCallback(
    (connection: Connection) => {
      const preview = createEdgePreview(board, connection);
      onConnectionPreviewChange?.(preview);
      if (!preview.valid) return;

      const newBoardEdge = createBoardEdgeFromConnection(board, connection);
      if (!newBoardEdge) return;

      const nextBoard: BoardState = {
        ...board,
        edges: [...board.edges, { ...newBoardEdge, validationLevel: 'allow' }],
      };

      commitBoard(nextBoard);
    },
    [board, commitBoard, onConnectionPreviewChange]
  );

  const isValidConnection = useCallback<IsValidConnection>(
    (connection) => {
      const conn = normalizeReactFlowConnection(connection);
      const preview = createEdgePreview(board, conn);
      onConnectionPreviewChange?.(preview);
      return canConnectReactFlowEdge(board, conn);
    },
    [board, onConnectionPreviewChange]
  );

  const handlePaneClick = useCallback(() => {
    onConnectionPreviewChange?.(null);
    if (readOnly) {
      onSelectionChange?.({ chipIds: [], edgeIds: [] });
      return;
    }
    setSnapshot((current) => {
      const nextNodes = current.nodes.map((n) => ({ ...n, selected: false }));
      const nextEdges = current.edges.map((e) => ({ ...e, selected: false }));
      const nextBoard = reactFlowToBoard({
        boardId: board.id,
        name: board.name,
        nodes: nextNodes,
        edges: nextEdges,
        logs: board.logs,
        viewport: board.viewport,
        meta: board.meta,
      });
      const validatedBoard = applyValidationToEdges(nextBoard);
      const merged = mergeFlowSelection(boardToReactFlow(validatedBoard), nextNodes, nextEdges);
      queueMicrotask(() => {
        onBoardChange?.(validatedBoard);
        onValidationChange?.(validateBoard(validatedBoard));
        onSelectionChange?.({ chipIds: [], edgeIds: [] });
      });
      return merged;
    });
  }, [board, onBoardChange, onConnectionPreviewChange, onSelectionChange, onValidationChange, readOnly]);

  const handleNodeClick = useCallback(
    (_event: React.MouseEvent, node: Node<ReactFlowChipNodeData>) => {
      if (readOnly) return;
      _event.stopPropagation();
      setSnapshot((current) => {
        const wasSelected = current.nodes.find((n) => n.id === node.id)?.selected;
        const nextNodes = current.nodes.map((n) =>
          n.id === node.id ? { ...n, selected: !wasSelected } : n,
        );
        const nextBoard = reactFlowToBoard({
          boardId: board.id,
          name: board.name,
          nodes: nextNodes,
          edges: current.edges,
          logs: board.logs,
          viewport: board.viewport,
          meta: board.meta,
        });
        const validatedBoard = applyValidationToEdges(nextBoard);
        const merged = mergeFlowSelection(boardToReactFlow(validatedBoard), nextNodes, current.edges);
        queueMicrotask(() => {
          onBoardChange?.(validatedBoard);
          onValidationChange?.(validateBoard(validatedBoard));
          onSelectionChange?.({
            chipIds: merged.nodes.filter((n) => n.selected).map((n) => n.id),
            edgeIds: merged.edges.filter((e) => e.selected).map((e) => e.id),
          });
        });
        return merged;
      });
    },
    [board, onBoardChange, onSelectionChange, onValidationChange, readOnly],
  );

  const handleEdgeClick = useCallback(
    (_event: React.MouseEvent, edge: Edge<ReactFlowBoardEdgeData>) => {
      if (readOnly) return;
      _event.stopPropagation();
      setSnapshot((current) => {
        const wasSelected = current.edges.find((e) => e.id === edge.id)?.selected;
        const nextEdges = current.edges.map((e) =>
          e.id === edge.id ? { ...e, selected: !wasSelected } : e,
        );
        const nextBoard = reactFlowToBoard({
          boardId: board.id,
          name: board.name,
          nodes: current.nodes,
          edges: nextEdges,
          logs: board.logs,
          viewport: board.viewport,
          meta: board.meta,
        });
        const validatedBoard = applyValidationToEdges(nextBoard);
        const merged = mergeFlowSelection(boardToReactFlow(validatedBoard), current.nodes, nextEdges);
        queueMicrotask(() => {
          onBoardChange?.(validatedBoard);
          onValidationChange?.(validateBoard(validatedBoard));
          onSelectionChange?.({
            chipIds: merged.nodes.filter((n) => n.selected).map((n) => n.id),
            edgeIds: merged.edges.filter((e) => e.selected).map((e) => e.id),
          });
        });
        return merged;
      });
    },
    [board, onBoardChange, onSelectionChange, onValidationChange, readOnly],
  );

  const handleSelectionChange = useCallback(
    ({ nodes, edges }: { nodes: Node<ReactFlowChipNodeData>[]; edges: Edge<ReactFlowBoardEdgeData>[] }) => {
      onSelectionChange?.({
        chipIds: nodes.map((node) => node.id),
        edgeIds: edges.map((edge) => edge.id),
      });
    },
    [onSelectionChange]
  );

  const handleSelectionStart = useCallback(() => {
    if (!readOnly) selectionRectangleActiveRef.current = true;
  }, [readOnly]);

  const handleSelectionEnd = useCallback(() => {
    setTimeout(() => {
      selectionRectangleActiveRef.current = false;
    }, 0);
  }, []);

  const handleDragOver = useCallback((event: DragEvent<HTMLDivElement>) => {
    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';
  }, []);

  const handleDrop = useCallback(
    (event: DragEvent<HTMLDivElement>) => {
      if (readOnly) return;
      event.preventDefault();

      const chipType = event.dataTransfer.getData(droppedChipTypeDataKey) || event.dataTransfer.getData('text/plain');
      if (!chipType) return;

      const bounds = containerRef.current?.getBoundingClientRect();
      const clientPosition = {
        x: event.clientX - (bounds?.left ?? 0),
        y: event.clientY - (bounds?.top ?? 0),
      };
      const flowPosition = reactFlow.screenToFlowPosition(clientPosition);
      const node = createReactFlowNodeForChip(chipType, {
        id: `chip_${chipType}_${Date.now()}`,
        position: flowPosition,
      });

      const nextBoard = reactFlowToBoard({
        boardId: board.id,
        name: board.name,
        nodes: [...snapshot.nodes, node],
        edges: snapshot.edges,
        logs: board.logs,
        viewport: board.viewport,
        meta: board.meta,
      });

      commitBoard(nextBoard);
    },
    [board, commitBoard, droppedChipTypeDataKey, reactFlow, readOnly, snapshot.edges, snapshot.nodes]
  );

  const validationSummary = useMemo(() => summarizeValidationReport(validationReport), [validationReport]);

  const edgesWithFlow = useMemo(
    () =>
      snapshot.edges.map((e) => ({
        ...e,
        animated: flowPulseFromChipId ? e.source === flowPulseFromChipId : Boolean(e.animated),
      })),
    [snapshot.edges, flowPulseFromChipId],
  );

  return (
    <div
      ref={containerRef}
      className={['breadboard-canvas', className].filter(Boolean).join(' ')}
      style={{
        width: '100%',
        height: '100%',
        minHeight: 0,
        borderRadius: 12,
        overflow: 'hidden',
        position: 'relative',
        background: 'linear-gradient(180deg, #505058 0%, #45454e 42%, #3c3c45 100%)',
        border: '1px solid rgba(0,0,0,0.18)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.12), 0 12px 32px rgba(0,0,0,0.22)',
        ...style,
      }}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      <div
        aria-hidden
        style={{
          pointerEvents: 'none',
          position: 'absolute',
          inset: 0,
          zIndex: 0,
          background:
            'linear-gradient(180deg, rgba(255,255,255,0.04) 0%, transparent 35%), linear-gradient(0deg, rgba(0,0,0,0.06) 0%, transparent 40%)',
          borderRadius: 12,
        }}
      />
      <ReactFlow
        className="breadboard-flow"
        style={{ position: 'relative', zIndex: 1, width: '100%', height: '100%' }}
        nodes={snapshot.nodes}
        edges={edgesWithFlow}
        nodeTypes={nodeTypes}
        edgeTypes={edgeTypes}
        onNodesChange={readOnly ? undefined : handleNodesChange}
        onEdgesChange={readOnly ? undefined : handleEdgesChange}
        onConnect={readOnly ? undefined : handleConnect}
        onPaneClick={handlePaneClick}
        onNodeClick={readOnly ? undefined : handleNodeClick}
        onEdgeClick={readOnly ? undefined : handleEdgeClick}
        onSelectionChange={handleSelectionChange}
        onSelectionStart={readOnly ? undefined : handleSelectionStart}
        onSelectionEnd={readOnly ? undefined : handleSelectionEnd}
        isValidConnection={readOnly ? undefined : isValidConnection}
        /** 출력(source)→입력(target)만 허용 */
        connectionMode={ConnectionMode.Strict}
        /** 마우스를 놓을 때 가까운 핸들에 스냅되는 반경(px). 기본보다 넓혀 맞추기 쉽게 함 */
        connectionRadius={44}
        fitView={fitView}
        snapToGrid
        snapGrid={[16, 16]}
        /** 클릭: onNodeClick 토글 / 빈 판 드래그: 사각형 선택(onSelectionStart 동안만 RF select 적용) */
        elementsSelectable={!readOnly}
        selectionOnDrag={!readOnly}
        selectionMode={SelectionMode.Partial}
        /* 왼쪽 드래그: 빈 판에서 다중 선택. 패닝: 가운데 클릭 드래그 또는 스페이스+드래그 */
        panOnDrag={readOnly ? true : [1]}
        panActivationKeyCode="Space"
        zoomOnPinch
        zoomOnScroll
        panOnScroll
        minZoom={0.35}
        maxZoom={1.8}
        defaultEdgeOptions={{
          type: BOARD_EDGE_TYPE,
          animated: false,
          style: { strokeWidth: 2.25, stroke: '#c2410c' },
        }}
        proOptions={{ hideAttribution: true }}
      >
        <Background variant={BackgroundVariant.Dots} gap={14} size={1.2} color="rgba(0, 0, 0, 0.11)" />
        {showControls ? <Controls showInteractive={!readOnly} position="bottom-right" /> : null}
        {showMiniMap ? (
          <MiniMap
            position="bottom-left"
            pannable
            zoomable
            style={{
              background: 'rgba(50, 50, 58, 0.96)',
              border: '1px solid rgba(0, 0, 0, 0.22)',
              width: 160,
              height: 120,
              borderRadius: 8,
              overflow: 'hidden',
            }}
            nodeColor={(node) => {
              const category = (node as unknown as { data?: { category?: string } }).data?.category;
              if (category === 'input') return '#0ea5e9';
              if (category === 'ai') return '#8b5cf6';
              if (category === 'logic') return '#f59e0b';
              if (category === 'action') return '#10b981';
              if (category === 'output') return '#ec4899';
              return '#64748b';
            }}
          />
        ) : null}

        {showBoardHud ? (
          <Panel position="top-left">
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(36, 36, 42, 0.92)',
                border: '1px solid rgba(0, 0, 0, 0.22)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                color: '#e4e4e7',
                minWidth: 260,
              }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                <div style={{ minWidth: 0, flex: 1 }}>
                  {editableBoardName && onBoardNameChange ? (
                    <>
                      <label className="sr-only" htmlFor="board-canvas-name-input">
                        보드 이름
                      </label>
                      <input
                        id="board-canvas-name-input"
                        type="text"
                        value={boardNameDraft}
                        onChange={(e) => setBoardNameDraft(e.target.value)}
                        onBlur={() => {
                          if (boardNameDraft !== board.name) {
                            onBoardNameChange(boardNameDraft);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            (e.target as HTMLInputElement).blur();
                          }
                        }}
                        placeholder="보드 이름"
                        style={{
                          width: '100%',
                          boxSizing: 'border-box',
                          color: '#fafafa',
                          fontSize: 17,
                          fontWeight: 800,
                          background: 'rgba(15, 15, 18, 0.65)',
                          border: '1px solid rgba(255, 255, 255, 0.12)',
                          borderRadius: 10,
                          padding: '8px 10px',
                          outline: 'none',
                        }}
                      />
                    </>
                  ) : (
                    <div style={{ color: '#fafafa', fontSize: 17, fontWeight: 800 }}>{board.name}</div>
                  )}
                  <div style={{ color: '#a1a1aa', fontSize: 13, marginTop: 6 }}>
                    칩 {board.chips.length}개 · 연결 {board.edges.length}개
                  </div>
                </div>
                {onRunClick ? (
                  <button
                    type="button"
                    onClick={onRunClick}
                    style={{
                      border: 'none',
                      borderRadius: 12,
                      padding: '10px 12px',
                      background: validationReport.ok ? '#2563eb' : '#475569',
                      color: '#fff',
                      fontWeight: 800,
                      cursor: 'pointer',
                      flexShrink: 0,
                    }}
                  >
                    Run
                  </button>
                ) : null}
              </div>
            </div>
          </Panel>
        ) : null}

        {showValidationPanel ? (
          <Panel position="top-right">
            <div
              style={{
                padding: '12px 14px',
                borderRadius: 14,
                background: 'rgba(36, 36, 42, 0.92)',
                border: validationReport.ok
                  ? '1px solid rgba(34, 197, 94, 0.45)'
                  : '1px solid rgba(239, 68, 68, 0.5)',
                boxShadow: '0 8px 24px rgba(0, 0, 0, 0.28)',
                color: '#e4e4e7',
                minWidth: 280,
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
                <span
                  style={{
                    width: 10,
                    height: 10,
                    borderRadius: '999px',
                    background: validationReport.ok ? '#22c55e' : '#ef4444',
                    boxShadow: `0 0 10px ${validationReport.ok ? '#22c55e' : '#ef4444'}`,
                  }}
                />
                <strong style={{ fontSize: 15 }}>{validationReport.ok ? '보드 검증 통과' : '보드 검증 필요'}</strong>
              </div>

              <div style={{ display: 'flex', gap: 8, marginBottom: 10 }}>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(239,68,68,0.12)',
                    color: '#fca5a5',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  오류 {validationReport.errors.length}
                </span>
                <span
                  style={{
                    padding: '4px 8px',
                    borderRadius: 999,
                    background: 'rgba(245,158,11,0.12)',
                    color: '#fcd34d',
                    fontSize: 15,
                    fontWeight: 700,
                  }}
                >
                  경고 {validationReport.warnings.length}
                </span>
              </div>

              <div style={{ display: 'grid', gap: 6 }}>
                {validationSummary.map((line) => (
                  <div key={line} style={{ color: '#d4d4d8', fontSize: 13 }}>
                    • {line}
                  </div>
                ))}
                {validationReport.errors.slice(0, 3).map((issue) => (
                  <div key={`${issue.code}-${issue.chipId ?? ''}-${issue.edgeId ?? ''}`} style={{ color: '#fca5a5', fontSize: 13 }}>
                    • {issue.message}
                  </div>
                ))}
                {validationReport.errors.length === 0 && validationReport.warnings.slice(0, 2).map((issue) => (
                  <div key={`${issue.code}-${issue.chipId ?? ''}-${issue.edgeId ?? ''}`} style={{ color: '#fcd34d', fontSize: 13 }}>
                    • {issue.message}
                  </div>
                ))}
              </div>
            </div>
          </Panel>
        ) : null}
      </ReactFlow>
    </div>
  );
}

export function BoardCanvas(props: BoardCanvasProps) {
  return (
    <ReactFlowProvider>
      <BoardCanvasInner {...props} />
    </ReactFlowProvider>
  );
}

export default BoardCanvas;

