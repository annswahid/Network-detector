import { Line } from 'react-chartjs-2';

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
                    return value + ' KB/s';
                }
            },
        },
        x: {
            display: false,
            grid: {
                display: false,
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
                    size: 11,
                    weight: '600',
                },
                usePointStyle: true,
                pointStyle: 'circle',
                padding: 12,
                boxWidth: 7,
                boxHeight: 7,
            },
        },
        tooltip: {
            enabled: true,
            backgroundColor: 'rgba(15, 23, 42, 0.95)',
            titleColor: '#f1f5f9',
            bodyColor: '#cbd5e1',
            borderColor: 'rgba(148, 163, 184, 0.2)',
            borderWidth: 1,
            padding: 10,
            displayColors: true,
            callbacks: {
                label: function (context) {
                    return context.dataset.label + ': ' + context.parsed.y.toFixed(0) + ' KB/s';
                }
            }
        },
    },
    elements: {
        point: {
            radius: 0,
            hitRadius: 10,
            hoverRadius: 5,
        }
    },
    animation: {
        duration: 800,
        easing: 'easeInOutQuart',
        x: {
            type: 'number',
            easing: 'linear',
            duration: 300,
        },
        y: {
            easing: 'easeInOutQuart',
            duration: 800,
        }
    },
    transitions: {
        active: {
            animation: {
                duration: 200
            }
        }
    },
};

const NetworkStats = ({ data }) => {
    const status = data.status || 'unknown';
    const statusLabel = status === 'online' ? 'Live'
        : status === 'disconnected' ? 'Disconnected'
            : status === 'fallback' ? 'Fallback'
                : 'Unknown';

    const chartData = {
        labels: data.timestamps,
        datasets: [
            {
                label: 'Upload',
                data: data.up,
                borderColor: '#22c55e',
                backgroundColor: 'rgba(34, 197, 94, 0.3)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBorderWidth: 2,
                pointHoverBackgroundColor: '#22c55e',
                pointHoverBorderColor: '#fff',
            },
            {
                label: 'Download',
                data: data.down,
                borderColor: '#3b82f6',
                backgroundColor: 'rgba(59, 130, 246, 0.3)',
                borderWidth: 2.5,
                tension: 0.4,
                fill: true,
                pointRadius: 0,
                pointHoverRadius: 5,
                pointHoverBorderWidth: 2,
                pointHoverBackgroundColor: '#3b82f6',
                pointHoverBorderColor: '#fff',
            },
        ],
    };

    return (
        <div style={{ height: '100%', minHeight: '150px', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <div className="network-meta">
                <div className={`network-status ${status}`}>
                    {statusLabel}
                </div>
                <div className="network-current">
                    <span>Up: {Math.round(data.currentUp || 0)} KB/s</span>
                    <span>Down: {Math.round(data.currentDown || 0)} KB/s</span>
                </div>
            </div>
            <div style={{ flex: 1, minHeight: '150px' }}>
                <Line options={options} data={chartData} />
            </div>
        </div>
    );
};

export default NetworkStats;
