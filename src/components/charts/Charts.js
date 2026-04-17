'use client';
import { Line, Bar, Radar } from 'react-chartjs-2';
import {
  Chart as ChartJS,
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, RadialLinearScale, Filler, Tooltip, Legend,
} from 'chart.js';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  BarElement, RadialLinearScale, Filler, Tooltip, Legend
);

const tooltipDefaults = {
  backgroundColor: '#111411',
  borderColor: '#252b25',
  borderWidth: 1,
  titleColor: '#9aab9a',
  bodyColor: '#e8f5e9',
  titleFont: { family: 'DM Mono', size: 10 },
  bodyFont: { family: 'DM Mono', size: 12 },
  padding: 10,
};

const scaleDefaults = {
  x: { grid: { color: '#1e231e' }, ticks: { color: '#6b7c6b', font: { family: 'DM Mono', size: 10 } } },
  y: { grid: { color: '#1e231e' }, ticks: { color: '#6b7c6b', font: { family: 'DM Mono', size: 10 } } },
};

export function ChartCard({ title, subtitle, legend, children }) {
  return (
    <div className="card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>{title}</div>
          {subtitle && <div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{subtitle}</div>}
        </div>
        {legend && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5, fontSize: 10, color: 'var(--text-muted)', textAlign: 'right' }}>
            {legend.map(l => (
              <div key={l.label} style={{ display: 'flex', alignItems: 'center', gap: 6, justifyContent: 'flex-end' }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: l.color, flexShrink: 0 }} />
                {l.label}
              </div>
            ))}
          </div>
        )}
      </div>
      <div style={{ position: 'relative', height: 220 }}>{children}</div>
    </div>
  );
}

export function YieldLineChart({ labels, algaeoData, stdData }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: 'Algaeo', data: algaeoData, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.08)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#4ade80' },
          { label: 'Standard', data: stdData, borderColor: '#374237', backgroundColor: 'rgba(55,66,55,0.05)', tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#374237' },
        ],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipDefaults }, scales: scaleDefaults }}
    />
  );
}

export function CostLineChart({ labels, withData, withoutData }) {
  return (
    <Line
      data={{
        labels,
        datasets: [
          { label: 'Without Algaeo', data: withoutData, borderColor: '#f87171', backgroundColor: 'rgba(248,113,113,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
          { label: 'With Algaeo', data: withData, borderColor: '#60a5fa', backgroundColor: 'rgba(96,165,250,0.08)', tension: 0.4, fill: true, pointRadius: 3 },
        ],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipDefaults }, scales: scaleDefaults }}
    />
  );
}

export function ROILineChart({ labels, data }) {
  return (
    <Line
      data={{
        labels,
        datasets: [{
          label: 'Cumulative ROI',
          data,
          borderColor: '#4ade80',
          backgroundColor: 'rgba(74,222,128,0.1)',
          tension: 0.4, fill: true, pointRadius: 3, pointBackgroundColor: '#4ade80',
        }],
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: ctx => ' $' + ctx.raw.toLocaleString() } } },
        scales: scaleDefaults,
      }}
    />
  );
}

export function LeverBarChart({ labels, algaeoData, stdData }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          { label: 'With Algaeo', data: algaeoData, backgroundColor: 'rgba(74,222,128,0.7)', borderColor: '#4ade80', borderWidth: 1 },
          { label: 'Without Algaeo', data: stdData, backgroundColor: 'rgba(55,66,55,0.5)', borderColor: '#374237', borderWidth: 1 },
        ],
      }}
      options={{ responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false }, tooltip: tooltipDefaults }, scales: scaleDefaults }}
    />
  );
}

export function MultiCropBarChart({ labels, algaeoData, stdData }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [
          { label: 'AgTurbo', data: algaeoData, backgroundColor: 'rgba(74,222,128,0.75)', borderColor: '#4ade80', borderWidth: 1 },
          { label: 'Synthetic Only', data: stdData, backgroundColor: 'rgba(55,66,55,0.6)', borderColor: '#374237', borderWidth: 1 },
        ],
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#9aab9a', font: { family: 'DM Mono', size: 10 }, boxWidth: 10 } }, tooltip: tooltipDefaults },
        scales: scaleDefaults,
      }}
    />
  );
}

export function MicrobeLineChart({ labels, datasets }) {
  return (
    <Line
      data={{ labels, datasets: datasets.map(d => ({ ...d, tension: 0.4, fill: false, pointRadius: 3 })) }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#9aab9a', font: { family: 'DM Mono', size: 10 }, boxWidth: 10 } }, tooltip: tooltipDefaults },
        scales: { ...scaleDefaults, y: { ...scaleDefaults.y, title: { display: true, text: 'Activity Index', color: '#6b7c6b', font: { family: 'DM Mono', size: 10 } } } },
      }}
    />
  );
}

export function NutrientRadarChart({ algaeoData, stdData }) {
  const labels = ['Nitrogen','Phosphorus','Potassium','Calcium','Magnesium','Iron','Zinc'];
  return (
    <Radar
      data={{
        labels,
        datasets: [
          { label: 'AgTurbo', data: algaeoData, borderColor: '#4ade80', backgroundColor: 'rgba(74,222,128,0.15)', pointBackgroundColor: '#4ade80' },
          { label: 'Synthetic', data: stdData, borderColor: '#374237', backgroundColor: 'rgba(55,66,55,0.2)', pointBackgroundColor: '#374237' },
        ],
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#9aab9a', font: { family: 'DM Mono', size: 10 }, boxWidth: 10 } }, tooltip: tooltipDefaults },
        scales: { r: { grid: { color: '#1e231e' }, pointLabels: { color: '#9aab9a', font: { family: 'DM Mono', size: 10 } }, ticks: { color: '#6b7c6b', backdropColor: 'transparent', font: { family: 'DM Mono', size: 9 } } } },
      }}
    />
  );
}

export function SavingsBarChart({ labels, data }) {
  return (
    <Bar
      data={{
        labels,
        datasets: [{
          label: 'Cumulative Savings',
          data,
          backgroundColor: data.map(n => n > 0 ? 'rgba(74,222,128,0.7)' : 'rgba(248,113,113,0.7)'),
          borderColor: data.map(n => n > 0 ? '#4ade80' : '#f87171'),
          borderWidth: 1,
        }],
      }}
      options={{
        responsive: true, maintainAspectRatio: false,
        plugins: { legend: { display: false }, tooltip: { ...tooltipDefaults, callbacks: { label: ctx => ' $' + ctx.raw.toLocaleString() } } },
        scales: scaleDefaults,
      }}
    />
  );
}
