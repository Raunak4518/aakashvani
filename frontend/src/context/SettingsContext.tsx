import { createContext, useContext, useState, useEffect, useCallback } from 'react';
import type { ReactNode } from 'react';

const SETTINGS_STORAGE_KEY = 'aakashvani_settings';

export interface AppSettings {
    // General
    theme: 'dark' | 'light' | 'auto';
    language: string;
    sessionTimeout: number; // minutes

    // Audio
    inputDevice: string;
    outputDevice: string;
    inputVolume: number;
    outputVolume: number;
    sampleRate: number;
    noiseReduction: boolean;
    echoCancellation: boolean;
    autoGainControl: boolean;

    // Detection
    sensitivityThreshold: number;
    analysisWindow: number; // seconds
    realTimeAlerts: boolean;
    alertSounds: boolean;
    autoRecordSuspicious: boolean;

    // Advanced
    bufferSize: number;
    maxRetries: number;
    debugMode: boolean;
    apiEndpoint: string;
}

const defaultSettings: AppSettings = {
    // General
    theme: 'dark',
    language: 'English (US)',
    sessionTimeout: 30,

    // Audio
    inputDevice: 'default',
    outputDevice: 'default',
    inputVolume: 80,
    outputVolume: 70,
    sampleRate: 48000,
    noiseReduction: true,
    echoCancellation: true,
    autoGainControl: true,

    // Detection
    sensitivityThreshold: 70,
    analysisWindow: 3,
    realTimeAlerts: true,
    alertSounds: true,
    autoRecordSuspicious: false,

    // Advanced
    bufferSize: 4096,
    maxRetries: 3,
    debugMode: false,
    apiEndpoint: import.meta.env.VITE_API_URL || 'http://localhost:8000/api/v1'
};

interface AudioDevice {
    deviceId: string;
    label: string;
    kind: 'audioinput' | 'audiooutput';
}

interface SettingsContextType {
    settings: AppSettings;
    audioDevices: AudioDevice[];
    updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => void;
    saveSettings: () => void;
    resetSettings: () => void;
    refreshAudioDevices: () => Promise<void>;
    hasUnsavedChanges: boolean;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const loadSettings = (): AppSettings => {
    try {
        const stored = localStorage.getItem(SETTINGS_STORAGE_KEY);
        if (stored) {
            return { ...defaultSettings, ...JSON.parse(stored) };
        }
    } catch (e) {
        console.error('Failed to load settings:', e);
    }
    return defaultSettings;
};

export const SettingsProvider = ({ children }: { children: ReactNode }) => {
    const [settings, setSettings] = useState<AppSettings>(loadSettings);
    const [savedSettings, setSavedSettings] = useState<AppSettings>(loadSettings);
    const [audioDevices, setAudioDevices] = useState<AudioDevice[]>([]);

    const hasUnsavedChanges = JSON.stringify(settings) !== JSON.stringify(savedSettings);

    // Load audio devices on mount
    const refreshAudioDevices = useCallback(async () => {
        try {
            // Request permission first to get device labels
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            const audioDevs = devices
                .filter(d => d.kind === 'audioinput' || d.kind === 'audiooutput')
                .map(d => ({
                    deviceId: d.deviceId,
                    label: d.label || (d.kind === 'audioinput' ? 'Microphone' : 'Speaker'),
                    kind: d.kind as 'audioinput' | 'audiooutput'
                }));
            setAudioDevices(audioDevs);
        } catch (e) {
            console.error('Failed to get audio devices:', e);
            // Add default device if failed
            setAudioDevices([
                { deviceId: 'default', label: 'System Default', kind: 'audioinput' },
                { deviceId: 'default', label: 'System Default', kind: 'audiooutput' }
            ]);
        }
    }, []);

    useEffect(() => {
        refreshAudioDevices();

        // Listen for device changes
        navigator.mediaDevices.addEventListener('devicechange', refreshAudioDevices);
        return () => {
            navigator.mediaDevices.removeEventListener('devicechange', refreshAudioDevices);
        };
    }, [refreshAudioDevices]);

    const updateSetting = useCallback(<K extends keyof AppSettings>(key: K, value: AppSettings[K]) => {
        setSettings(prev => ({ ...prev, [key]: value }));
    }, []);

    const saveSettings = useCallback(() => {
        try {
            localStorage.setItem(SETTINGS_STORAGE_KEY, JSON.stringify(settings));
            setSavedSettings(settings);
        } catch (e) {
            console.error('Failed to save settings:', e);
        }
    }, [settings]);

    const resetSettings = useCallback(() => {
        setSettings(defaultSettings);
        setSavedSettings(defaultSettings);
        localStorage.removeItem(SETTINGS_STORAGE_KEY);
    }, []);

    return (
        <SettingsContext.Provider value={{
            settings,
            audioDevices,
            updateSetting,
            saveSettings,
            resetSettings,
            refreshAudioDevices,
            hasUnsavedChanges
        }}>
            {children}
        </SettingsContext.Provider>
    );
};

export const useSettings = () => {
    const context = useContext(SettingsContext);
    if (!context) throw new Error('useSettings must be used within SettingsProvider');
    return context;
};
