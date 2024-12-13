import { useEffect, useState } from "react";

export const WorkerComp: React.FC<{
    bedienzeit: number;
    onChange: (n: number, time: number) => void;
}> = ({ onChange, bedienzeit }) => {
    const [ankunft, setAnkunft] = useState<Worker | null>(null);
    const [bedienung, setBedienung] = useState<Worker | null>(null);

    useEffect(() => {
        const a = new Worker("/ankunft.mjs");
        const b = new Worker("/bedienung.mjs");

        a.onmessage = (ev) => {
            b.postMessage(true);
        };

        b.onmessage = (ev) => {
            onChange(ev.data as number, new Date().getTime());
        };

        setAnkunft(a);
        setBedienung(b);

        return () => {
            a.terminate();
            b.terminate();
        };
    }, []);

    useEffect(() => {
        ankunft?.postMessage(bedienzeit);
    }, [bedienzeit, ankunft]);

    return <></>;
};
