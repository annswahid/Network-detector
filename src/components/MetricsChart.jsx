import {
    Chart as ChartJS,
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend,
} from 'chart.js';
import { Line } from 'react-chartjs-2';
import { memo } from 'react';

ChartJS.register(
    CategoryScale,
    LinearScale,
    PointElement,
    LineElement,
    Title,
    Tooltip,
    Legend
);

const options = {
    responsive: true,
    maintainAspectRatio: false,
    interaction: {
        mode: 'index',
        intersect: false,
    },
    scales: {
        y: {
            beginAtZero: true,
            max: 100,
            grid: {
                color: 'rgba(255, 255, 255, 0.08)',
                lineWidth: 1,
            },
            border: {
                display: false,
            },
            ticks: {
                color: '#94a3b8',
                font: {
                    size: 11,
                    weight: '500',
                },
                callback: function (value) {
                    return value + '%';
                }
            },
        },
        x: {
            grid: {
                color: 'rgba(255, 255, 255, 0.05)',
                lineWidth: 1,
            },
            border: {
                display: false,
            },
            ticks: {
                color: '#64748b',
                font: {
                    size: 10,
                },
                maxRotation: 0,
                autoSkip: true,
                maxTicksLimit: 10,
            },
        },
    },
    plugins: {
        legend: {
            display: true,
            position: 'top',
            align: 'end',
            labels: {
                color: '#f1f5f9',
                font: {
                    size: 12,
                    weight: '600',
                },
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 15,
                boxWidth: 8,
                boxHeight: 8,
            },
        },
        tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            padding: 12,
            displayColors: true,
            callbacks: {
                label: function (context) {
                    return context.dataset.label + ': ' + context.parsed.y.toFixed(1) + '%';
                }
            }
        },
    },
    animation: false, // 🚀 PERFORMANCE FIX: Disable heavy animations on update
    transitions: {
        active: {
            animation: {
                duration: 0 // Instant transition
            }
        }
    },
};

const MetricsChart = ({ data }) => {
    const chartData = {
        labels: data.timestamps,
        datasets: [
            {
                label: 'CPU Usage',
                data: data.cpu,
                borderColor: 'rgb(255, 99, 132)',
                backgroundColor: 'rgba(255, 99, 132, 0.25)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                pointHoverBackgroundColor: 'rgb(255, 99, 132)',
                pointHoverBorderColor: '#fff',
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 10,
                shadowColor: 'rgba(255, 99, 132, 0.5)',
            },
            {
                label: 'Memory Usage',
                data: data.memory,
                borderColor: 'rgb(54, 162, 235)',
                backgroundColor: 'rgba(54, 162, 235, 0.25)',
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 6,
                pointHoverBorderWidth: 3,
                pointHoverBackgroundColor: 'rgb(54, 162, 235)',
                pointHoverBorderColor: '#fff',
                shadowOffsetX: 0,
                shadowOffsetY: 4,
                shadowBlur: 10,
                shadowColor: 'rgba(54, 162, 235, 0.5)',
            },
        ],
    };

    return (
        <div style={{ height: '300px' }}>
            <Line options={options} data={chartData} />
        </div>
    );
};

const areMetricsEqual = (prevProps, nextProps) => {
    const prev = prevProps.data;
    const next = nextProps.data;
    if (prev === next) return true;
    if (!prev || !next) return false;
    const prevLen = prev.timestamps.length;
    const nextLen = next.timestamps.length;
    if (prevLen !== nextLen) return false;
    if (prevLen === 0) return true;
    return (
        prev.timestamps[prevLen - 1] === next.timestamps[nextLen - 1] &&
        prev.cpu[prevLen - 1] === next.cpu[nextLen - 1] &&
        prev.memory[prevLen - 1] === next.memory[nextLen - 1]
    );
};

export default memo(MetricsChart, areMetricsEqual);
