var zw;

onmessage = (ev) => {
    zw = parseInt(ev.data);
};

function timedCountAnkunft() {
    var delay = zw / -Math.log(Math.random());
    if (delay > zw * 10) delay = zw * 10;
    if (delay < zw / 10) delay = zw / 10;
    setTimeout(() => timedCountAnkunft(), delay);
    postMessage(true);
}

timedCountAnkunft();
