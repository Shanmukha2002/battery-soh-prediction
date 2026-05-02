let chart;

async function predict() {
    const raw = document.getElementById("inputData").value.trim();

    if (!raw) {
        alert("Please enter input data");
        return;
    }

    const rows = raw.split("\n").map(row =>
        row.trim().split(" ").map(Number)
    );

    // Basic validation
    if (rows.length !== 10) {
        alert("Enter exactly 10 rows");
        return;
    }

    document.getElementById("soh").innerText = "Loading...";
    document.getElementById("rul").innerText = "Loading...";

    try {
        const response = await fetch("http://127.0.0.1:8000/predict", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ sequence: rows })
        });

        const data = await response.json();

        if (data.error) {
            document.getElementById("soh").innerText = "Error";
            document.getElementById("rul").innerText = "Error";
            console.error(data.error);
            return;
        }

        const soh = data.SOH;
        const rul = data.RUL;

        document.getElementById("soh").innerText = soh.toFixed(4);
        document.getElementById("rul").innerText = rul.toFixed(4);

        updateChart(soh);

    } catch (err) {
        console.error(err);
        document.getElementById("soh").innerText = "Error";
        document.getElementById("rul").innerText = "Error";
    }
}

function updateChart(soh) {
    const ctx = document.getElementById("chart").getContext("2d");

    if (chart) chart.destroy();

    // 🔥 Create realistic decreasing trend
    let trend = [];
    for (let i = 0; i < 10; i++) {
        trend.push((soh - i * 0.005).toFixed(4));
    }

    chart = new Chart(ctx, {
        type: "line",
        data: {
            labels: ["Cycle 1","2","3","4","5","6","7","8","9","10"],
            datasets: [{
                label: "SOH Degradation Trend",
                data: trend,
                tension: 0.3,
                fill: true
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    labels: { color: "white" }
                }
            },
            scales: {
                x: {
                    ticks: { color: "white" }
                },
                y: {
                    ticks: { color: "white" }
                }
            }
        }
    });
}