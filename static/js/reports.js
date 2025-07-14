document.addEventListener("DOMContentLoaded", function () {
    function loadPreview() {
        const start = document.getElementById("start-date").value;
        const end = document.getElementById("end-date").value;
        if (start && end) {
            fetch(`/api/reports?start=${start}&end=${end}`)
                .then((r) => r.json())
                .then((data) => {
                    let html =
                        "<table><tr><th>ID</th><th>Count</th><th>Timestamp</th><th>Status</th><th>Received</th><th>Location</th></tr>";
                    data.forEach((row) => {
                        html += `<tr>
                            <td>${row.device_id}</td>
                            <td>${row.count}</td>
                            <td>${row.timestamp}</td>
                            <td>${row.status}</td>
                            <td>${row.received_at}</td>
                            <td>${row.location}</td>
                        </tr>`;
                    });
                    html += "</table>";
                    document.getElementById(
                        "report-preview-content"
                    ).innerHTML = html;
                });
        }
    }
    document.getElementById("start-date").onchange = loadPreview;
    document.getElementById("end-date").onchange = loadPreview;
    document.getElementById("generate-report").onclick = function () {
        const start = document.getElementById("start-date").value;
        const end = document.getElementById("end-date").value;
        const format = document.getElementById("report-format").value;
        fetch("/api/export", {
            method: "POST",
            headers: { "Content-Type": "application/x-www-form-urlencoded" },
            body: `format=${format}&start_date=${start}&end_date=${end}`,
        })
            .then((r) => r.json())
            .then((data) => {
                if (data.filename) {
                    window.location.href = `/static/${data.filename}`;
                }
            });
    };
});
