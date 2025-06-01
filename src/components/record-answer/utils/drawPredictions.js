export const drawPredictions = (predictions, canvas, video) => {
    const ctx = canvas.getContext("2d");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    predictions.forEach((pred) => {
        const [x, y, width, height] = pred.bbox;
        ctx.strokeStyle = "red";
        ctx.lineWidth = 2;
        ctx.fillStyle = "red";
        ctx.beginPath();
        ctx.rect(x, y, width, height);
        ctx.stroke();
        ctx.fillText(`${pred.class} - ${(pred.score * 100).toFixed(1)}%`, x, y > 10 ? y - 5 : 10);
    });
};
