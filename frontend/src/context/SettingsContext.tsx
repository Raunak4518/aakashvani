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
    type?: 'microphone' | 'system' | 'virtual'; // Source type for UI grouping
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

    // Helper to detect device type from label
    const getDeviceType = (label: string): 'microphone' | 'system' | 'virtual' => {
        const lowerLabel = label.toLowerCase();
        // Detect loopback/system audio devices
        if (lowerLabel.includes('stereo mix') || 
            lowerLabel.includes('what u hear') ||
            lowerLabel.includes('loopback') ||
            lowerLabel.includes('wave out') ||
            lowerLabel.includes('system audio') ||
            lowerLabel.includes('virtual cable') ||
            lowerLabel.includes('vb-audio') ||
            lowerLabel.includes('voicemeeter') ||
            lowerLabel.includes('blackhole') ||
            lowerLabel.includes('soundflower')) {
            return 'system';
        }
        // Detect virtual audio devices
        if (lowerLabel.includes('virtual') || 
            lowerLabel.includes('cable')) {
            return 'virtual';
        }
        return 'microphone';
    };

    // Load audio devices on mount
    const refreshAudioDevices = useCallback(async () => {
        try {
            // Request permission first to get device labels
            await navigator.mediaDevices.getUserMedia({ audio: true });
            const devices = await navigator.mediaDevices.enumerateDevices();
            
            const audioDevs: AudioDevice[] = [];
            
            // Add Tab/Screen audio option (for screen/window capture with audio)
            audioDevs.push({
                deviceId: 'screen-share-audio',
                label: '🖥️ Tab/Screen Audio (via Screen Share)',
                kind: 'audioinput',
                type: 'system'
            });
            
            // Separate loopback devices, virtual devices, and regular mics
            const inputDevices = devices.filter(d => d.kind === 'audioinput');
            
            // First add any loopback/system devices (like Stereo Mix)
            inputDevices
                .filter(d => getDeviceType(d.label) === 'system')
                .forEach(d => {
                    audioDevs.push({
                        deviceId: d.deviceId,
                        label: `🔊 ${d.label}`,
                        kind: 'audioinput',
                        type: 'system'
                    });
                });
            
            // Then add virtual audio devices
            inputDevices
                .filter(d => getDeviceType(d.label) === 'virtual')
                .forEach(d => {
                    audioDevs.push({
                        deviceId: d.deviceId,
                        label: `🔌 ${d.label}`,
                        kind: 'audioinput',
                        type: 'virtual'
                    });
                });
            
            // Then add regular microphones
            inputDevices
                .filter(d => getDeviceType(d.label) === 'microphone')
                .forEach(d => {
                    audioDevs.push({
                        deviceId: d.deviceId,
                        label: d.label || 'Microphone',
                        kind: 'audioinput',
                        type: 'microphone'
                    });
                });
            
            // Add output devices
            devices
                .filter(d => d.kind === 'audiooutput')
                .forEach(d => {
                    audioDevs.push({
                        deviceId: d.deviceId,
                        label: d.label || 'Speaker',
                        kind: 'audiooutput'
                    });
                });
                
            setAudioDevices(audioDevs);
        } catch (e) {
            console.error('Failed to get audio devices:', e);
            // Add default devices if failed
            setAudioDevices([
                { deviceId: 'screen-share-audio', label: '🖥️ Tab/Screen Audio (via Screen Share)', kind: 'audioinput', type: 'system' },
                { deviceId: 'default', label: 'Default Microphone', kind: 'audioinput', type: 'microphone' },
                { deviceId: 'default', label: 'Default Speaker', kind: 'audiooutput' }
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
