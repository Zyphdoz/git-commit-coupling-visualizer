import { Circle } from './Circle';
import { SVGWithPanAndZoom } from './SvgWithPanAndZoom';

function App() {
    return (
        <div className="h-[1000px] w-[1000px]">
            <SVGWithPanAndZoom viewbox={{ x: -500, y: -500, w: 1000, h: 1000 }}>
                <Circle x={100} y={100} radius={50} fill="lightblue" stroke="black" text="Circle 1" />
                <Circle x={300} y={200} radius={75} fill="lightgreen" stroke="black" text="Circle 2" />
                <Circle x={500} y={400} radius={100} fill="lightcoral" stroke="black" text="Circle 3" />
            </SVGWithPanAndZoom>
        </div>
    );
}

export default App;
