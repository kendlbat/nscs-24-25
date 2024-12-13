let i = 0;
let zw = 200;

onmessage = () => {
    i++;
};

function bedienung() {
    if (i > 0) {
        let delay = zw / -Math.log(Math.random());
        if (delay > zw * 10) delay = zw * 10;
        if (delay < zw / 10) delay = zw / 10;
        setTimeout(() => bedienung(), delay);
        i--;
        postMessage(i);
    } else {
        setTimeout(() => bedienung(), 50);
    }
}

bedienung();
