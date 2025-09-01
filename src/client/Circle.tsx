type CircleProps = {
    x: number;
    y: number;
    radius: number;
    fill?: string;
    stroke?: string;
    text?: string;
};

export function Circle({ x, y, radius, fill = 'none', stroke = 'none', text = '' }: CircleProps) {
    return (
        <g>
            <circle cx={x} cy={y} r={radius} fill={fill} stroke={stroke} />
            {text && (
                <text
                    x={x}
                    y={y}
                    textAnchor="middle"
                    alignmentBaseline="central"
                    fill="black"
                    fontSize={radius / 3} // Scale text size based on circle radius
                >
                    {text}
                </text>
            )}
        </g>
    );
}
