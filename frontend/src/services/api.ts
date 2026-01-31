import axios from 'axios';

const API_URL = 'http://localhost:8000/api/v1';

export const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

export interface Session {
    id: string;
    start_time: number;
    status: 'idle' | 'recording' | 'paused' | 'ended';
    sample_count: number;
    duration: number;
}

export interface DetectionResult {
    id: string;
    timestamp: number;
    status: 'authentic' | 'deepfake' | 'uncertain' | 'analyzing';
    confidence: number;
    duration: number;
    method: string;
}

export interface Metrics {
    cpu_usage: number;
    memory_usage: number;
    latency: number;
    network_quality: 'excellent' | 'good' | 'fair' | 'poor';
    bandwidth_kbps: number;
    packet_loss: number;
    jitter: number;
    confidence_trend: number;
}

export interface SystemLog {
    timestamp: string;
    level: 'INFO' | 'WARN' | 'ERROR' | 'SUCCESS';
    message: string;
    source: string;
}

export const SessionAPI = {
    start: () => api.post<Session>('/session/start'),
    stop: () => api.post<Session>('/session/stop'),
    getCurrent: () => api.get<Session>('/session/current'),
    getHistory: () => api.get<DetectionResult[]>('/session/history'),
};

export const SystemAPI = {
    getMetrics: () => api.get<Metrics>('/system/metrics'),
    getLogs: (limit: number = 50) => api.get<SystemLog[]>(`/system/logs?limit=${limit}`),
};

export const SettingsAPI = {
    get: () => api.get('/settings'),
    update: (settings: any) => api.post('/settings', settings),
};
