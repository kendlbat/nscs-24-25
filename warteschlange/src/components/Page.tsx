import { useEffect, useState } from "react";
import { Component } from "./Chart";
import { Input } from "./ui/input";
import { Label } from "./ui/label";
import { WorkerComp } from "./WorkerComp";

export const Page: React.FC = () => {
    const [zaz, setZaz] = useState(200);
    const [chartData, setChartData] = useState<
        {
            n: number;
            time: number;
        }[]
    >([]);
    const bz = 200;
    useEffect(() => {
        console.log(chartData);
    }, [chartData]);

    return (
        <>
            <h1>Warteschlange</h1>
            <Component chartData={chartData} />
            <div className="grid w-full max-w-sm items-center gap-1.5">
                <Label htmlFor="zaz">Zwischenankunftszeit</Label>
                <Input
                    type="number"
                    id="zaz"
                    placeholder="200"
                    value={zaz}
                    onChange={(e) => {
                        const val = parseInt(e.target.value);
                        if (isNaN(val) || val < 1) setZaz(200);
                        else setZaz(val);
                    }}
                />
            </div>
            <WorkerComp
                bedienzeit={zaz}
                onChange={function (number, time) {
                    setChartData((prev) => {
                        console.log(number);
                        return [...prev, { n: number, time }];
                    });
                }}
            />

            <p>Bedienzeit: {bz} ms</p>
            <p>Bedienrate: {(1000 / bz).toFixed(2)} /s</p>
            <p>Zwischenankunftszeit: {zaz} ms</p>
            <p>Ankunftsrate: {(1000 / zaz).toFixed(2)} /s</p>
            <p>
                Auslastung: {(bz / zaz).toFixed(2)} -{" "}
                {bz <= zaz ? "Gut" : "Nicht gut"}
            </p>
            <p>
                Durchschnittliche Länge:{" "}
                {chartData.reduce((a, b) => a + b.n, 0) / chartData.length}
            </p>
        </>
    );
};
