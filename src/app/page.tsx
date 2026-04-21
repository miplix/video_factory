'use client';

import { useEffect, useState } from 'react';
import type { VideoJob } from '@/lib/types';

const STATUS_LABELS: Record<string, string> = {
  pending: '⏳ В очереди',
  generating_script: '✍️ Сценарий',
  rendering_slides: '🖼️ Слайды',
  generating_voice: '🎙️ Озвучка',
  uploading: '☁️ Загрузка',
  rendering_video: '🎬 Рендеринг',
  done: '✅ Готово',
  failed: '❌ Ошибка',
};

const STATUS_COLORS: Record<string, string> = {
  pending: '#718096',
  generating_script: '#9F7AEA',
  rendering_slides: '#667EEA',
  generating_voice: '#F6AD55',
  uploading: '#63B3ED',
  rendering_video: '#F687B3',
  done: '#68D391',
  failed: '#FC8181',
};

export default function Dashboard() {
  const [jobs, setJobs] = useState<VideoJob[]>([]);
  const [loading, setLoading] = useState(true);
  const [generating, setGenerating] = useState(false);
  const [health, setHealth] = useState<Record<string, string> | null>(null);

  const fetchJobs = async () => {
    try {
      const res = await fetch('/api/jobs');
      const data = await res.json();
      setJobs(data.jobs || []);
    } catch { /* ignore */ }
    setLoading(false);
  };

  const fetchHealth = async () => {
    try {
      const res = await fetch('/api/health');
      setHealth(await res.json());
    } catch { /* ignore */ }
  };

  useEffect(() => {
    fetchJobs();
    fetchHealth();
    const interval = setInterval(fetchJobs, 15000);
    return () => clearInterval(interval);
  }, []);

  const handleGenerate = async () => {
    const key = prompt('Admin key:');
    if (!key) return;
    setGenerating(true);
    try {
      const res = await fetch('/api/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${key}`,
        },
        body: JSON.stringify({}),
      });
      const data = await res.json();
      if (data.error) alert(`Ошибка: ${data.error}`);
      else alert(`Запущено! Job ID: ${data.jobId}`);
      fetchJobs();
    } catch (e) {
      alert(`Ошибка: ${e}`);
    }
    setGenerating(false);
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(160deg, #0A0A1A 0%, #1A1040 100%)',
      color: '#F7FAFC',
      fontFamily: 'system-ui, -apple-system, sans-serif',
      padding: '32px 24px',
    }}>
      {/* Header */}
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 32 }}>
          <div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 700, color: '#B794F6' }}>
              🎬 YupSoul Video Factory
            </h1>
            <p style={{ margin: '8px 0 0', color: '#718096', fontSize: 14 }}>
              Автоматическая генерация TikTok-видео
            </p>
          </div>
          <button
            onClick={handleGenerate}
            disabled={generating}
            style={{
              background: generating ? '#4A2980' : 'linear-gradient(135deg, #9F7AEA, #F687B3)',
              border: 'none',
              borderRadius: 12,
              padding: '12px 24px',
              color: 'white',
              fontSize: 15,
              fontWeight: 600,
              cursor: generating ? 'not-allowed' : 'pointer',
            }}
          >
            {generating ? '⏳ Запуск...' : '▶ Сгенерировать видео'}
          </button>
        </div>

        {/* Health status */}
        {health && (
          <div style={{
            display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 32,
          }}>
            {Object.entries({
              LLM: health.llm,
              TTS: health.tts,
              Storage: health.storage,
              GitHub: health.github !== 'not configured' ? '✓' : '✗',
              Telegram: health.telegram === 'configured' ? '✓' : '✗',
            }).map(([k, v]) => (
              <div key={k} style={{
                background: '#1A1040',
                border: '1px solid #2D1B69',
                borderRadius: 8,
                padding: '8px 16px',
                fontSize: 13,
                color: v === '✗' || v === 'none' ? '#FC8181' : '#68D391',
              }}>
                <span style={{ color: '#718096', marginRight: 6 }}>{k}:</span>{v}
              </div>
            ))}
          </div>
        )}

        {/* Stats */}
        {jobs.length > 0 && (
          <div style={{ display: 'flex', gap: 16, marginBottom: 32, flexWrap: 'wrap' }}>
            {(['done', 'rendering_video', 'failed'] as const).map(s => (
              <div key={s} style={{
                background: '#1A1040',
                borderRadius: 12,
                padding: '16px 24px',
                flex: '1 1 120px',
                border: `1px solid ${STATUS_COLORS[s]}44`,
              }}>
                <div style={{ fontSize: 28, fontWeight: 700, color: STATUS_COLORS[s] }}>
                  {jobs.filter(j => j.status === s).length}
                </div>
                <div style={{ fontSize: 12, color: '#718096', marginTop: 4 }}>
                  {STATUS_LABELS[s]}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Job list */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {loading && <p style={{ color: '#718096' }}>Загрузка...</p>}
          {!loading && jobs.length === 0 && (
            <p style={{ color: '#718096' }}>Пока нет задач. Нажмите «Сгенерировать видео».</p>
          )}
          {jobs.map(job => (
            <div key={job.id} style={{
              background: '#0F0F2A',
              border: `1px solid ${STATUS_COLORS[job.status] || '#2D1B69'}44`,
              borderRadius: 12,
              padding: '16px 20px',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
                    <span style={{
                      background: `${STATUS_COLORS[job.status]}22`,
                      color: STATUS_COLORS[job.status],
                      borderRadius: 6,
                      padding: '3px 10px',
                      fontSize: 12,
                      fontWeight: 600,
                    }}>
                      {STATUS_LABELS[job.status] || job.status}
                    </span>
                    {job.script?.zodiacSign && (
                      <span style={{ color: '#B794F6', fontSize: 13 }}>
                        {job.script.zodiacSign}
                        {job.script.zodiacSign2 ? ` × ${job.script.zodiacSign2}` : ''}
                      </span>
                    )}
                    <span style={{ color: '#4A5568', fontSize: 11 }}>
                      {job.rubric}
                    </span>
                  </div>
                  {job.script?.title && (
                    <p style={{ margin: '0 0 4px', fontSize: 14, color: '#E2E8F0' }}>
                      {job.script.title}
                    </p>
                  )}
                  {job.error && (
                    <p style={{ margin: 0, fontSize: 12, color: '#FC8181' }}>
                      {job.error.slice(0, 120)}
                    </p>
                  )}
                  <p style={{ margin: '4px 0 0', fontSize: 11, color: '#4A5568' }}>
                    {job.id} · {new Date(job.createdAt).toLocaleString('ru')}
                  </p>
                </div>
                {job.videoPublicUrl && (
                  <a
                    href={job.videoPublicUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{
                      background: 'linear-gradient(135deg, #9F7AEA, #F687B3)',
                      borderRadius: 8,
                      padding: '8px 16px',
                      color: 'white',
                      fontSize: 13,
                      fontWeight: 600,
                      textDecoration: 'none',
                      whiteSpace: 'nowrap',
                      flexShrink: 0,
                    }}
                  >
                    ⬇ Скачать
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
