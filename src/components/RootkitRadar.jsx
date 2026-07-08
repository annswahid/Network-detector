import {
    Chart as ChartJS,
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend,
} from 'chart.js';
import { Radar } from 'react-chartjs-2';

ChartJS.register(
    RadialLinearScale,
    PointElement,
    LineElement,
    Filler,
    Tooltip,
    Legend
);

const RootkitRadar = ({ status }) => {
    const data = {
        labels: ['Memory Integrity', 'Process Hiding', 'Module List', 'Syscall Table', 'Net Hooks', 'File Ops'],
        datasets: [
            {
                label: 'Current Scan',
                data: [
                    status?.memory || 100,
                    status?.process || 100,
                    status?.modules || 100,
                    status?.syscalls || 100,
                    status?.hooks || 100,
                    status?.files || 100
                ],
                backgroundColor: 'rgba(147, 51, 234, 0.2)',
                borderColor: '#9333ea',
                borderWidth: 2,
                pointBackgroundColor: '#9333ea',
                pointBorderColor: '#fff',
                pointHoverBackgroundColor: '#fff',
                pointHoverBorderColor: '#9333ea',
            },
        ],
    };

    const options = {
        responsive: true,
        maintainAspectRatio: false,
        scales: {
            r: {
                angleLines: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                grid: {
                    color: 'rgba(255, 255, 255, 0.1)'
                },
                pointLabels: {
                    color: '#94a3b8',
                    font: {
                        size: 11
                    }
                },
                ticks: {
                    display: false, // Hide numeric ticks for cleaner look
                    backdropColor: 'transparent'
                }
            },
        },
        plugins: {
            legend: {
                labels: {
                    color: '#f1f5f9'
                }
            }
        },
        animation: {
            duration: 1000,
            easing: 'easeInOutQuad'
        }
    };

    return (
        <div style={{ height: '300px', width: '100%' }}>
            <Radar data={data} options={options} />
        </div>
    );
};

export default RootkitRadar;
