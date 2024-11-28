function convertFromRawBase64(data) {
    const binaryString = atob(data);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes;
}

function convertToRawBase64(data) {
    let binaryString = "";
    const bytes = new Uint8Array(data);
    const len = bytes.byteLength;
    for (let i = 0; i < len; i++) {
        binaryString += String.fromCharCode(bytes[i]);
    }
    return btoa(binaryString);
}

function medianFilter(rawData, width, height, filterWidth, filterHeight) {
    const getPixelIndex = (x, y) => (y * width + x) * 4;
    const median = (arr) => {
        arr.sort((a, b) => a - b);
        const mid = Math.floor(arr.length / 2);
        return arr.length % 2 !== 0 ? arr[mid] : (arr[mid - 1] + arr[mid]) / 2;
    };

    const medianFilteredData = new Uint8ClampedArray(rawData.length);
    const halfFilterWidth = Math.floor(filterWidth / 2);
    const halfFilterHeight = Math.floor(filterHeight / 2);

    for (let y = 0; y < height; y++) {
        for (let x = 0; x < width; x++) {
            const rValues = [];
            const gValues = [];
            const bValues = [];
            const aValues = [];

            let isBorder = false;

            for (let fy = -halfFilterHeight; fy <= halfFilterHeight; fy++) {
                for (let fx = -halfFilterWidth; fx <= halfFilterWidth; fx++) {
                    const nx = x + fx;
                    const ny = y + fy;

                    // Check if the filter window is within the image boundaries
                    if (nx < 0 || nx >= width || ny < 0 || ny >= height) {
                        isBorder = true;
                        break;
                    }

                    const index = getPixelIndex(nx, ny);

                    rValues.push(rawData[index]);
                    gValues.push(rawData[index + 1]);
                    bValues.push(rawData[index + 2]);
                    aValues.push(rawData[index + 3]);
                }
                if (isBorder) break;
            }

            const index = getPixelIndex(x, y);

            if (isBorder) {
                // Set the pixel to be fully transparent
                medianFilteredData[index] = 0;
                medianFilteredData[index + 1] = 0;
                medianFilteredData[index + 2] = 0;
                medianFilteredData[index + 3] = 0;
            } else {
                medianFilteredData[index] = median(rValues);
                medianFilteredData[index + 1] = median(gValues);
                medianFilteredData[index + 2] = median(bValues);
                medianFilteredData[index + 3] = median(aValues);
            }
        }
    }

    return medianFilteredData;
}

onmessage = (e) => {
    try {
        console.log("Worker received image:", {
            ...e.data,
            image: { ...e.data.image, data: undefined },
        });

        const { type, image, filter } = e.data;

        const { width, height, id, slice, data } = image;

        const pixelData = convertFromRawBase64(data);

        let filteredData;

        switch (filter.type) {
            case "median":
                const filteredData = medianFilter(
                    pixelData,
                    width,
                    height,
                    filter.width,
                    filter.height
                );

                postMessage({
                    type: "image",
                    filter,
                    image: {
                        id,
                        slice,
                        width,
                        height,
                        data: convertToRawBase64(filteredData),
                    },
                });

                break;
            default:
                console.log("No filter specified, returning original data");
        }
    } catch (e) {
        postMessage(e);
    }
};
