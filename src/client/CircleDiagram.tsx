/* eslint-disable @typescript-eslint/no-explicit-any */
import { useEffect, useMemo, useState } from 'react';
import * as d3 from 'd3';
import { SVGWithPanAndZoom } from './SvgWithPanAndZoom';
import { visualizerConfig, SERVER_PORT, CIRCLE_COLOR } from '../server/visualizerConfig';
import type { CollectionOfCode, NestedCodeStructure, PieceOfCode } from '../server/readGitFiles/readGitFiles';

interface TreeNode {
    name: string;
    fullPath: string;
    children: Map<string, TreeNode>;
    piece?: PieceOfCode;
}

interface VisualNode {
    id: string;
    x: number;
    y: number;
    r: number;
    depth: number;
    isDirectory: boolean;
    data: any;
}

const DIRECTORY_FILL_COLOR = '#101828';

const DIRECTORY_OUTLINE_COLOR = '#311f57';

export interface CircleDiagramProps {
    nestedCodeStructure: NestedCodeStructure | null;
    activeFiles: Set<string>;
    setActiveFiles: React.Dispatch<React.SetStateAction<Set<string>>>;
    setError: React.Dispatch<React.SetStateAction<string | null>>;
}

/**
 * this component fetches `/api/get-repo-stats` and renders the data as a hierarchical circle diagram using d3js.
 * hovering a circle will display how many times that file has been changed since the recentCutoff and it will
 * draw a line to every file that has been changed in the same commit and display a count on each file indicating how many times
 * it has been changed together with the selected file. clicking on a file will show the recent commit history for that file in the sidebar
 * and double clicking a file or directory will open it in your code editor.
 */
export default function CircleDiagram({
    nestedCodeStructure,
    activeFiles,
    setActiveFiles,
    setError,
}: CircleDiagramProps) {
    const [hoveredFilePath, setHoveredFilePath] = useState<string | null>(null);

    const [tooltip, setTooltip] = useState<{ visible: boolean; x: number; y: number; text: string }>({
        visible: false,
        x: 0,
        y: 0,
        text: '',
    });

    const [windowSize, setWindowSize] = useState<{ width: number; height: number }>({
        width: window.innerWidth - 400, // - 400 width to make space for the sidebar on the left
        height: window.innerHeight - 64, // - 64 height to correct for the top and bottom margin
    });

    useEffect(() => {
        const handleResize = () => {
            setWindowSize({
                width: window.innerWidth - 400,
                height: window.innerHeight - 64,
            });
        };

        window.addEventListener('resize', handleResize);
        return () => {
            window.removeEventListener('resize', handleResize);
        };
    }, []);

    const openFileInCodeEditor = (path: string) => {
        document.body.style.cursor = 'wait';
        fetch(`http://localhost:${SERVER_PORT}/api/open-in-code-editor?path=${path}`)
            .then((res) => {
                document.body.style.cursor = 'default';
                if (!res.ok) throw new Error(`fetch failed: ${res.status}`);
                return res.json();
            })
            .catch((err) => setError(err));
    };

    const rootTree = useMemo<TreeNode | null>(() => {
        if (!nestedCodeStructure) return null;
        const root: TreeNode = { name: '', fullPath: '', children: new Map(), piece: undefined };

        const ensureDir = (dirPath: string) => {
            const segments = dirPath.split('/').filter(Boolean);
            let cur = root;
            let curPath = '';
            for (const seg of segments) {
                curPath = curPath ? `${curPath}/${seg}` : seg;
                if (!cur.children.has(seg)) {
                    cur.children.set(seg, { name: seg, fullPath: curPath, children: new Map() });
                }
                cur = cur.children.get(seg)!;
            }
            return cur;
        };

        const insertFile = (piece: PieceOfCode) => {
            const dirPath = piece.filePath.split('/').slice(0, -1).join('/');
            const fileName = piece.filePath.split('/').pop() || piece.filePath;
            const parent = dirPath ? ensureDir(dirPath) : root;
            parent.children.set(fileName, {
                name: fileName,
                fullPath: piece.filePath,
                children: new Map(),
                piece,
            });
        };

        const walk = (items: NestedCodeStructure) => {
            for (const item of items) {
                if ((item as CollectionOfCode).directoryPath !== undefined) {
                    const coll = item as CollectionOfCode;
                    ensureDir(coll.directoryPath);
                    walk(coll.children);
                } else if ((item as PieceOfCode).filePath !== undefined) {
                    insertFile(item as PieceOfCode);
                }
            }
        };

        walk(nestedCodeStructure);
        return root;
    }, [nestedCodeStructure]);

    const d3Root = useMemo<d3.HierarchyCircularNode<any> | null>(() => {
        if (!rootTree) return null;
        const toHierarchyObject = (node: TreeNode): any => {
            if (node.piece) {
                return {
                    name: node.name,
                    filePath: node.piece.filePath,
                    linesOfCode: Math.max(1, node.piece.linesOfCode || 1),
                    piece: node.piece,
                    type: 'file',
                };
            }
            const childrenArr = Array.from(node.children.values()).map((c) => toHierarchyObject(c));
            return {
                name: node.name || 'root',
                directoryPath: node.fullPath,
                children: childrenArr,
                type: 'directory',
            };
        };

        const rootObj = toHierarchyObject(rootTree);
        const hierarchy = d3
            .hierarchy(rootObj, (d) => (d.type === 'directory' ? d.children : null))
            .sum((d) => (d.type === 'file' ? d.linesOfCode : 0))
            .sort((a, b) => (b.value || 0) - (a.value || 0));

        return d3
            .pack()
            .size([windowSize.width - 2, windowSize.height - 2])
            .padding(4)(hierarchy);
    }, [rootTree, windowSize.height, windowSize.width]);

    const { visualNodes, filesByPath } = useMemo(() => {
        if (!d3Root) return { visualNodes: [], filesByPath: new Map<string, d3.HierarchyCircularNode<any>>() };
        const nodes = d3Root.descendants();
        const visual: VisualNode[] = nodes.map((n) => ({
            id: n.data.type === 'file' ? n.data.filePath || n.data.name : n.data.directoryPath || n.data.name,
            x: n.x,
            y: n.y,
            r: n.r,
            depth: n.depth,
            isDirectory: n.data.type !== 'file',
            data: n.data,
        }));
        const fileMap = new Map<string, d3.HierarchyCircularNode<any>>();
        for (const n of nodes) {
            if (n.data && n.data.type === 'file' && n.data.filePath) fileMap.set(n.data.filePath, n);
        }
        return { visualNodes: visual, filesByPath: fileMap };
    }, [d3Root]);

    const linesBetweenCircles = useMemo(() => {
        const allLines: { x1: number; y1: number; x2: number; y2: number; count: number }[] = [];
        const files = new Set([...(hoveredFilePath ? [hoveredFilePath] : []), ...activeFiles]);
        for (const filePath of files) {
            const sourceNode = filesByPath.get(filePath);
            if (!sourceNode) continue;
            const piece: PieceOfCode | undefined = sourceNode.data.piece;
            if (!piece) continue;
            for (const rel of piece.recentlyChangedTogether || []) {
                const targetNode = filesByPath.get(rel.filePath);
                if (!targetNode) continue;
                allLines.push({
                    x1: sourceNode.x,
                    y1: sourceNode.y,
                    x2: targetNode.x,
                    y2: targetNode.y,
                    count: rel.count,
                });
            }
        }
        return allLines;
    }, [hoveredFilePath, activeFiles, filesByPath]);

    if (nestedCodeStructure === null)
        return (
            <div className="relative m-8">
                <SVGWithPanAndZoom
                    viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
                    className="rounded-xl border border-gray-600"
                >
                    <text
                        className="cursor-grab select-none active:cursor-grabbing"
                        x={windowSize.width / 2}
                        y={windowSize.height / 2}
                        fontSize={150}
                        fill="White"
                        textAnchor="middle"
                    >
                        Loading...
                    </text>
                    <text
                        className="cursor-grab select-none active:cursor-grabbing"
                        x={windowSize.width / 2 - 80}
                        y={windowSize.height / 2 + 30}
                        fontSize={18}
                        fill="gray"
                        textAnchor="middle"
                    >
                        (if the codebase is big this may take a while)
                    </text>
                </SVGWithPanAndZoom>
            </div>
        );

    return (
        <div className="relative m-8">
            <SVGWithPanAndZoom
                viewBox={`0 0 ${windowSize.width} ${windowSize.height}`}
                className="rounded-xl border border-gray-600"
            >
                <g transform="translate(1,1)">
                    {visualNodes
                        .filter((n) => n.isDirectory)
                        .map((n) => (
                            <g
                                key={`dir-${n.id}`}
                                transform={`translate(${n.x},${n.y})`}
                                onMouseEnter={(e) =>
                                    setTooltip({
                                        visible: true,
                                        x: e.clientX + 10,
                                        y: e.clientY + 10,
                                        text: n.data.directoryPath || n.id,
                                    })
                                }
                                onMouseMove={(e) =>
                                    tooltip.visible &&
                                    setTooltip((t) => ({ ...t, x: e.clientX + 10, y: e.clientY + 10 }))
                                }
                                onMouseLeave={() => setTooltip({ visible: false, x: 0, y: 0, text: '' })}
                            >
                                <circle
                                    r={n.r}
                                    fill={DIRECTORY_FILL_COLOR}
                                    stroke={DIRECTORY_OUTLINE_COLOR}
                                    strokeWidth={1}
                                    onDoubleClick={(event) => {
                                        event.preventDefault();
                                        openFileInCodeEditor(
                                            visualizerConfig.repoPath + '/' + n.data.directoryPath ||
                                                visualizerConfig.repoPath, // open root folder if no directory path
                                        );
                                    }}
                                />
                            </g>
                        ))}

                    {visualNodes
                        .filter((n) => !n.isDirectory)
                        .map((n) => {
                            const piece: PieceOfCode = n.data.piece;
                            const filename = (n.data.filePath || n.data.name || '').split('/').pop() || '';
                            const color = piece.circleColor;
                            const isHoveringThis = hoveredFilePath === piece.filePath;
                            const fontSize = Math.min((n.r * 4) / filename.length, n.r / 4);

                            return (
                                <g
                                    key={`file-${n.id}`}
                                    transform={`translate(${n.x},${n.y})`}
                                    onMouseEnter={(e) => {
                                        setHoveredFilePath(piece.filePath);
                                        setTooltip({
                                            visible: true,
                                            x: e.clientX + 10,
                                            y: e.clientY + 10,
                                            text: n.data.directoryPath || n.id,
                                        });
                                        // we set the cursor with js rather than css because if we use css
                                        // it would take priority over the `wait` cursor when we double click
                                        document.body.style.cursor = 'pointer';
                                    }}
                                    onMouseMove={(e) =>
                                        tooltip.visible &&
                                        setTooltip((t) => ({ ...t, x: e.clientX + 10, y: e.clientY + 10 }))
                                    }
                                    onMouseLeave={() => {
                                        setHoveredFilePath((cur) => (cur === piece.filePath ? null : cur));
                                        setTooltip({ visible: false, x: 0, y: 0, text: '' });
                                        // we set the cursor with js rather than css because if we use css
                                        // it would take priority over the `wait` cursos when we double click
                                        document.body.style.cursor = 'default';
                                    }}
                                    onClick={() => {
                                        setActiveFiles((prev) => {
                                            const newSet = new Set(prev);
                                            // eslint-disable-next-line @typescript-eslint/no-unused-expressions
                                            newSet.has(piece.filePath)
                                                ? newSet.delete(piece.filePath)
                                                : newSet.add(piece.filePath);
                                            return newSet;
                                        });
                                    }}
                                >
                                    <circle
                                        r={n.r}
                                        fill={color}
                                        stroke={
                                            isHoveringThis || activeFiles.has(piece.filePath) ? 'blue' : 'transparent'
                                        }
                                        strokeWidth={isHoveringThis ? 2 : 1}
                                        onDoubleClick={(event) => {
                                            event.preventDefault();
                                            openFileInCodeEditor(visualizerConfig.repoPath + '/' + piece.filePath);
                                        }}
                                    />
                                    <text
                                        fontSize={fontSize}
                                        fill="#222"
                                        textAnchor="middle"
                                        dy={fontSize / 3}
                                        pointerEvents="none"
                                        className="select-none"
                                    >
                                        {filename}
                                    </text>
                                    {/**
                                     * show the number of times this file has been recently changed
                                     */}
                                    {(activeFiles.has(piece.filePath) || hoveredFilePath === piece.filePath) && (
                                        <g className="pointer-events-none">
                                            <rect
                                                x={-10}
                                                y={-16}
                                                width={20}
                                                height={14}
                                                rx={4}
                                                fill="black"
                                                fillOpacity="50%"
                                            />
                                            <text fontSize={9} fill="#fff" textAnchor="middle" dy={-6}>
                                                {
                                                    piece.gitHistory.filter(
                                                        (commit) => commit.date > visualizerConfig.recentCutoff,
                                                    ).length
                                                }
                                            </text>
                                        </g>
                                    )}
                                </g>
                            );
                        })}

                    {/** draw lines */}
                    {linesBetweenCircles.map((line, i) => (
                        <g key={`line-${i}`} className="pointer-events-none">
                            <line
                                x1={line.x1}
                                y1={line.y1}
                                x2={line.x2}
                                y2={line.y2}
                                stroke={
                                    line.count >= visualizerConfig.highCouplingThreshold
                                        ? CIRCLE_COLOR.red
                                        : line.count >= visualizerConfig.mediumCouplingThreshold
                                          ? CIRCLE_COLOR.orange
                                          : '#666'
                                }
                                strokeOpacity="30%"
                                strokeWidth={1.5}
                            />
                        </g>
                    ))}
                    {/**
                     * draw numbers at the end of the lines
                     * this is done in a separate loop from the lines because we want
                     * the numbers to always be rendered on top of the lines
                     */}
                    {linesBetweenCircles.map((line, i) => (
                        <g key={`changed-together-count-${i}`} className="pointer-events-none">
                            <rect
                                x={line.x2 - 10}
                                y={line.y2 - 16}
                                width={20}
                                height={14}
                                rx={4}
                                fill="black"
                                fillOpacity="50%"
                            />
                            <text x={line.x2} y={line.y2} fontSize={9} fill="#fff" textAnchor="middle" dy={-6}>
                                {line.count}
                            </text>
                        </g>
                    ))}
                </g>
            </SVGWithPanAndZoom>

            {tooltip.visible && (
                <div
                    className="bg-opacity-80 text-s pointer-events-none fixed z-50 rounded bg-black px-2 py-1 text-white"
                    style={{ left: tooltip.x, top: tooltip.y }}
                >
                    {tooltip.text}
                </div>
            )}
        </div>
    );
}
