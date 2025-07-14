document.addEventListener("DOMContentLoaded", function () {
    function loadSensors() {
        fetch("/api/sensors")
            .then((r) => r.json())
            .then((data) => {
                let html = "";
                data.forEach((sensor) => {
                    html += `<tr>
                        <td>${sensor.id}</td>
                        <td>Датчик ${sensor.id}</td>
                        <td>${sensor.location}</td>
                        <td>${sensor.status}</td>
                        <td>${sensor.last_updated}</td>
                        <td>
                            <button class="edit-btn" data-id="${sensor.id}">Редактировать</button>
                            <button class="delete-btn" data-id="${sensor.id}">Удалить</button>
                        </td>
                    </tr>`;
                });
                document.getElementById("sensors-table-body").innerHTML = html;
            });
    }
    document.getElementById("sensor-search").oninput = function () {
        let filter = this.value.toLowerCase();
        let rows = document.querySelectorAll("#sensors-table-body tr");
        rows.forEach((row) => {
            row.style.display = row.innerText.toLowerCase().includes(filter)
                ? ""
                : "none";
        });
    };
    document.getElementById("add-sensor-btn").onclick = function () {
        alert("Окно добавления датчика");
    };
    loadSensors();
});
