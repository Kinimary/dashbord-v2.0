document.addEventListener("DOMContentLoaded", function () {
    const userId = 1; // пока «жёсткий» пользователь

    // --- GET ---
    fetch("/api/settings")
        .then((r) => r.json())
        .then((data) => {
            document.getElementById("theme-select").value =
                data.theme || "dark";
            document.getElementById("lang-select").value = data.lang || "ru";
            document.getElementById("email-notify").checked = data.email_notify;
            document.getElementById("push-notify").checked = data.push_notify;
            // Заполняем историю входов (заглушка)
            document.getElementById("login-history").innerHTML =
                "<ul><li>2024-07-14 (127.0.0.1)</li></ul>";
        });

    // --- PUT ---
    function sendSettings() {
        const theme = document.getElementById("theme-select").value;
        const lang = document.getElementById("lang-select").value;
        const email = document.getElementById("email-notify").checked;
        const push = document.getElementById("push-notify").checked;

        fetch("/api/settings", {
            method: "PUT",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                theme,
                lang,
                email_notify: email,
                push_notify: push,
            }),
        })
            .then((r) => r.json())
            .then((d) => alert(d.message || "Ошибка"))
            .catch(console.error);
    }

    document.getElementById("theme-select").onchange = sendSettings;
    document.getElementById("lang-select").onchange = sendSettings;
    document.getElementById("email-notify").onchange = sendSettings;
    document.getElementById("push-notify").onchange = sendSettings;

    // --- RESET ---
    document.getElementById("reset-settings").onclick = () => {
        fetch("/api/settings/reset", { method: "POST" })
            .then((r) => r.json())
            .then((d) => {
                alert(d.message || "Ошибка");
                window.location.reload();
            })
            .catch(console.error);
    };
});
