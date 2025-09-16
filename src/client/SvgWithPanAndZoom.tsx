import React, { useState, useRef, useEffect } from 'react';

export type ViewBox = {
    x: number;
    y: number;
    w: number;
    h: number;
};

type SVGWithPanAndZoomProps = {
    children: React.ReactNode;
    viewBox: string;
} & React.SVGProps<SVGSVGElement>;

/**
 * This is like an `<svg></svg>` tag but when you click and drag it pans and when you scroll it zooms.
 * @param viewBox the initial size of the viewBox. note that these values will be changed and managed by this component when the user pans or zooms.
 * If you try to modify the viewBox elsewhere it may cause pan and zoom to behave strangely.
 * Limitations: The width and height of the svg element will be set to the same width and height as the viewBox. (passing in a different width or height will cause the pan speed to not align with the cursor speed)
 * @param children children is expected to be anything that you would normally put inside of an `<svg></svg>` tag.
 */
export function SVGWithPanAndZoom({ children, viewBox, ...rest }: SVGWithPanAndZoomProps) {
    const viewBoxRef = useRef<ViewBox>({
        x: 0,
        y: 0,
        w: parseInt(viewBox.split(' ')[2]),
        h: parseInt(viewBox.split(' ')[3]),
    });

    const svgRef = useRef<SVGSVGElement>(null);
    const requestAnimationFrameRef = useRef<number | null>(null);

    const [svgSize, setSvgSize] = useState<{ width: string; height: string }>({
        width: viewBox.split(' ')[2],
        height: viewBox.split(' ')[3],
    });

    useEffect(() => {
        viewBoxRef.current = { x: 0, y: 0, w: parseInt(viewBox.split(' ')[2]), h: parseInt(viewBox.split(' ')[3]) };
        setSvgSize({ width: viewBox.split(' ')[2], height: viewBox.split(' ')[3] });
    }, [viewBox]);

    const applyViewBox = () => {
        if (svgRef.current) {
            const { x, y, w, h } = viewBoxRef.current;
            svgRef.current.setAttribute('viewBox', `${x} ${y} ${w} ${h}`);
        }
        requestAnimationFrameRef.current = null;
    };

    const scheduleUpdate = () => {
        if (requestAnimationFrameRef.current == null) {
            requestAnimationFrameRef.current = requestAnimationFrame(applyViewBox);
        }
    };

    const handleWheel = (e: WheelEvent) => {
        e.preventDefault();
        if (!svgRef.current) return;

        const zoomFactor = 1.1;

        // this code ensures the svg coordinates under the cursor remains the same after zooming
        // which gives us a "zoom towards the cursor" behavior similar to how zooming works in google maps
        const svg = svgRef.current;
        const rect = svg.getBoundingClientRect();
        const scale = e.deltaY > 0 ? 1 / zoomFactor : zoomFactor;
        const prev = viewBoxRef.current;

        // cursor position relative to SVG element
        const cursorSvgX = prev.x + ((e.clientX - rect.left) / rect.width) * prev.w;
        const cursorSvgY = prev.y + ((e.clientY - rect.top) / rect.height) * prev.h;

        // new width/height after zoom
        const newW = prev.w / scale;
        const newH = prev.h / scale;

        // adjust x/y so cursor point stays fixed
        const newX = cursorSvgX - ((e.clientX - rect.left) / rect.width) * newW;
        const newY = cursorSvgY - ((e.clientY - rect.top) / rect.height) * newH;

        viewBoxRef.current = { x: newX, y: newY, w: newW, h: newH };
        scheduleUpdate();
    };

    useEffect(() => {
        const svg = svgRef.current!;
        let isDragging = false;
        let prevX = 0,
            prevY = 0;

        const handleMouseDown = (e: MouseEvent) => {
            isDragging = true;
            prevX = e.clientX;
            prevY = e.clientY;
            document.body.style.cursor = 'all-scroll';
        };
        const handleMouseMove = (e: MouseEvent) => {
            if (!isDragging) return;
            const dx = e.clientX - prevX;
            const dy = e.clientY - prevY;
            prevX = e.clientX;
            prevY = e.clientY;
            const vb = viewBoxRef.current;
            viewBoxRef.current = {
                ...vb,
                x: vb.x - dx * (vb.w / svg.clientWidth),
                y: vb.y - dy * (vb.h / svg.clientHeight),
            };
            scheduleUpdate();
        };
        const handleMouseUp = () => {
            isDragging = false;
            document.body.style.cursor = 'default';
        };

        svg.addEventListener('wheel', handleWheel, { passive: false });
        svg.addEventListener('mousedown', handleMouseDown);
        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            svg.removeEventListener('wheel', handleWheel);
            svg.removeEventListener('mousedown', handleMouseDown);
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
        };
        // eslint-disable-next-line react-hooks/exhaustive-deps
    }, []);

    return (
        <svg
            width={svgSize.width}
            height={svgSize.height}
            className={`border-2 border-red-50`}
            ref={svgRef}
            viewBox={`${viewBoxRef.current.x} ${viewBoxRef.current.y} ${viewBoxRef.current.w} ${viewBoxRef.current.h}`}
            {...rest}
        >
            {children}
        </svg>
    );
}
