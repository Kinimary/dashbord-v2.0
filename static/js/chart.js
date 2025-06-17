document.addEventListener("DOMContentLoaded", function () {
    // Revenue Growth Chart
    const revenueCtx = document.getElementById("revenueChart");
    if (revenueCtx) {
        const revenueChart = new Chart(revenueCtx, {
            type: "line",
            data: {
                labels: [
                    "01 янв.",
                    "05 янв.",
                    "10 янв.",
                    "15 янв.",
                    "20 янв.",
                    "25 янв.",
                    "01 февр.",
                ],
                datasets: [
                    {
                        label: "Общая выручка",
                        data: [5000, 7500, 10000, 12500, 15000, 20000, 23241],
                        borderColor: "#3b82f6",
                        backgroundColor: "rgba(59, 130, 246, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: "Новые продажи",
                        data: [4000, 6000, 8000, 9000, 11000, 14000, 18000],
                        borderColor: "#8b5cf6",
                        backgroundColor: "rgba(139, 92, 246, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                    },
                    {
                        label: "Возвраты и отмены",
                        data: [1000, 1500, 2000, 2500, 3000, 3500, 4000],
                        borderColor: "#ef4444",
                        backgroundColor: "rgba(239, 68, 68, 0.1)",
                        borderWidth: 2,
                        fill: true,
                        tension: 0.4,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                    tooltip: {
                        mode: "index",
                        intersect: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                        ticks: {
                            callback: function (value) {
                                return value + " руб.";
                            },
                        },
                    },
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                    },
                },
            },
        });
    }

    // Customers Engagement Chart
    const engagementCtx = document.getElementById("engagementChart");
    if (engagementCtx) {
        const engagementChart = new Chart(engagementCtx, {
            type: "bar",
            data: {
                labels: [
                    "01 янв.",
                    "05 янв.",
                    "10 янв.",
                    "15 янв.",
                    "20 янв.",
                    "25 янв.",
                    "01 февр.",
                ],
                datasets: [
                    {
                        label: "Взаимодействие",
                        data: [5, 10, 8, 15, 5, 12, 8, 17],
                        backgroundColor: "#3b82f6",
                        borderRadius: 5,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        display: false,
                    },
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                    },
                    x: {
                        grid: {
                            color: "rgba(255, 255, 255, 0.1)",
                        },
                    },
                },
            },
        });
    }

    // Top Products/Services Chart
    const productsCtx = document.getElementById("productsChart");
    if (productsCtx) {
        const productsChart = new Chart(productsCtx, {
            type: "doughnut",
            data: {
                labels: [
                    "Умный телефон X",
                    "Ноутбук Pro",
                    "Беспроводные наушники",
                    "Умные часы 4",
                    "Ноутбук 7 Pro",
                ],
                datasets: [
                    {
                        data: [24000, 15000, 8000, 5000, 3000],
                        backgroundColor: [
                            "#4ade80",
                            "#3b82f6",
                            "#f59e0b",
                            "#8b5cf6",
                            "#f97316",
                        ],
                        borderWidth: 0,
                    },
                ],
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: "right",
                        labels: {
                            generateLabels: (chart) => {
                                const data = chart.data;
                                if (
                                    data.labels.length &&
                                    data.datasets.length
                                ) {
                                    return data.labels.map((label, i) => ({
                                        text: `${label}: ${data.datasets[0].data[i]} руб.`,
                                        fillStyle:
                                            data.datasets[0].backgroundColor[i],
                                        strokeStyle:
                                            data.datasets[0].backgroundColor[i],
                                        lineWidth: 1,
                                        hidden: false,
                                        index: i,
                                    }));
                                }
                                return [];
                            },
                        },
                    },
                },
                cutout: "70%",
            },
        });
    }

    // Toggle dark mode
    const themeToggle = document.getElementById("dark-mode-toggle");
    if (themeToggle) {
        themeToggle.addEventListener("click", function () {
            document.body.classList.toggle("dark-mode");
        });
    }
});
