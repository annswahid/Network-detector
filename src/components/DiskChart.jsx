import { Chart as ChartJS, ArcElement, Tooltip, Legend } from 'chart.js';
import { Doughnut } from 'react-chartjs-2';

ChartJS.register(ArcElement, Tooltip, Legend);

const ENABLE_ANIMATION = import.meta.env.VITE_CHART_ANIMATION === 'true';

const options = {
    responsive: true,
    maintainAspectRatio: false,
    cutout: '65%',
    plugins: {
        legend: {
            position: 'right',
            labels: {
                color: '#f1f5f9',
                font: {
                    size: 12,
                    weight: '600',
                },
                padding: 15,
                usePointStyle: true,
                pointStyle: 'circle',
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
            callbacks: {
                label: function (context) {
                    const label = context.label || '';
                    const value = context.parsed;
                    const total = context.dataset.data.reduce((a, b) => a + b, 0);
                    const percentage = ((value / total) * 100).toFixed(1);
                    return label + ': ' + value + ' GB (' + percentage + '%)';
                }
            }
        },
    },
    animation: ENABLE_ANIMATION ? {
        animateRotate: true,
        animateScale: true,
        duration: 1200,
        easing: 'easeInOutQuart',
    } : {
        duration: 0
    },
};

const DiskChart = ({ disk }) => {
    const data = {
        labels: ['Used', 'Free'],
        datasets: [
            {
                data: [disk.used, disk.free],
                backgroundColor: [
                    'rgba(239, 68, 68, 0.85)',
                    'rgba(34, 197, 94, 0.85)',
                ],
                borderColor: [
                    'rgba(239, 68, 68, 1)',
                    'rgba(34, 197, 94, 1)',
                ],
                borderWidth: 3,
                hoverOffset: 8,
                hoverBackgroundColor: [
                    'rgba(239, 68, 68, 0.95)',
                    'rgba(34, 197, 94, 0.95)',
                ],
            },
        ],
    };

    return (
        <div style={{ height: '100%', minHeight: '150px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ width: '100%', height: '120px' }}>
                <Doughnut data={data} options={options} />
            </div>
            <div style={{
                marginTop: '15px',
                color: '#94a3b8',
                fontSize: '0.9rem',
                textAlign: 'center',
                background: 'rgba(30, 41, 59, 0.5)',
                padding: '8px 15px',
                borderRadius: '8px',
                border: '1px solid rgba(148, 163, 184, 0.1)'
            }}>
                <div style={{ color: '#f1f5f9', fontWeight: 'bold', marginBottom: '4px' }}>
                    Total: {disk.total} GB
                </div>
                <div style={{ fontSize: '0.8rem' }}>
                    {disk.used} GB used of {disk.total} GB
                </div>
            </div>
        </div>
    );
};

export default DiskChart;
