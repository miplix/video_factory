// Simple job store backed by Cloudflare R2
// Each job = jobs/{id}.json
// Job list index = jobs/index.json
import type { VideoJob, AppConfig } from './types';
import { uploadJson, downloadJson, listKeys } from './storage/r2';

const JOB_PREFIX = 'jobs/';
const INDEX_KEY = 'jobs/index.json';

export function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

export async function saveJob(config: AppConfig, job: VideoJob): Promise<void> {
  job.updatedAt = new Date().toISOString();
  await uploadJson(config, `${JOB_PREFIX}${job.id}.json`, job);
  // Update index
  const index = await downloadJson<string[]>(config, INDEX_KEY) || [];
  if (!index.includes(job.id)) {
    index.push(job.id);
    await uploadJson(config, INDEX_KEY, index);
  }
}

export async function getJob(config: AppConfig, id: string): Promise<VideoJob | null> {
  return downloadJson<VideoJob>(config, `${JOB_PREFIX}${id}.json`);
}

export async function getJobs(config: AppConfig, limit = 50): Promise<VideoJob[]> {
  const index = await downloadJson<string[]>(config, INDEX_KEY) || [];
  const ids = index.slice(-limit).reverse();
  const jobs = await Promise.all(ids.map(id => getJob(config, id)));
  return jobs.filter((j): j is VideoJob => j !== null);
}

export async function getPendingJobs(config: AppConfig): Promise<VideoJob[]> {
  const all = await getJobs(config, 100);
  return all.filter(j => j.status === 'pending');
}

export async function getJobsByDate(config: AppConfig, date: string): Promise<VideoJob[]> {
  const all = await getJobs(config, 200);
  return all.filter(j => j.scheduledAt === date);
}
