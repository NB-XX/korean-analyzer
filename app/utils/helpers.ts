// 工具函数
import { synthesizeSpeech } from '../services/api';

// 检查字符串是否包含汉字
export function containsKanji(text: string): boolean {
  const kanjiRegex = /[\u4E00-\u9FAF\u3400-\u4DBF]/;
  return kanjiRegex.test(text);
}

// 获取词性对应的CSS类名
export function getPosClass(pos: string): string {
  const basePos = pos.split('-')[0];
  const knownPos = ["名詞", "動詞", "形容詞", "副詞", "助詞", "助動詞", "接続詞", "感動詞", "連体詞", "代名詞", "形状詞", "記号", "接頭辞", "接尾辞", "フィラー", "その他"];
  if (knownPos.includes(basePos)) {
    return `pos-${basePos}`;
  }
  return 'pos-default';
}

// 词性中日对照表
export const posChineseMap: Record<string, string> = {
  "名詞": "名词", "動詞": "动词", "形容詞": "形容词", "副詞": "副词",
  "助詞": "助词", "助動詞": "助动词", "接続詞": "接续词", "感動詞": "感动词",
  "連体詞": "连体词", "代名詞": "代名词", "形状詞": "形容动词", "記号": "符号",
  "接頭辞": "接头辞", "接尾辞": "接尾辞", "フィラー": "填充词", "その他": "其他",
  "default": "未知词性"
};

// 朗读日语文本
export function speakKorean(text: string): void {
  if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
    window.speechSynthesis.cancel();
    
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'ko-KR';
    utterance.rate = 0.9;
    utterance.pitch = 1;
    window.speechSynthesis.speak(utterance);
  } else {
    console.warn('浏览器不支持语音朗读功能');
  }
}

// 使用Gemini TTS朗读文本
export async function speakKoreanWithTTS(text: string, apiKey?: string, voice?: string): Promise<void> {
  try {
    const url = await getKoreanTtsAudioUrl(text, apiKey, voice);
    const audioElement = new Audio(url);
    audioElement.play();
  } catch (error) {
    console.warn('Gemini TTS 播放失败，尝试使用系统朗读', error);
    speakKorean(text);
  }
}

// 获取 Gemini TTS 音频 URL
export async function getKoreanTtsAudioUrl(text: string, apiKey?: string, voice: string = 'Kore'): Promise<string> {
  const { audio, mimeType } = await synthesizeSpeech(text, voice, apiKey);
  return createPlayableUrlFromPcm(audio, mimeType);
}

// 将 Base64 PCM 数据转换为可播放的 WAV URL
function createPlayableUrlFromPcm(base64: string, mimeType: string): string {
  const byteString = atob(base64);
  const pcmData = new Uint8Array(byteString.length);
  for (let i = 0; i < byteString.length; i++) {
    pcmData[i] = byteString.charCodeAt(i);
  }

  const match = /rate=(\d+)/.exec(mimeType);
  const sampleRate = match ? parseInt(match[1], 10) : 24000;
  const numChannels = 1;
  const byteRate = sampleRate * numChannels * 2;
  const blockAlign = numChannels * 2;

  const buffer = new ArrayBuffer(44 + pcmData.length);
  const view = new DataView(buffer);

  function writeString(off: number, str: string) {
    for (let i = 0; i < str.length; i++) {
      view.setUint8(off + i, str.charCodeAt(i));
    }
  }

  writeString(0, 'RIFF');
  view.setUint32(4, 36 + pcmData.length, true);
  writeString(8, 'WAVE');
  writeString(12, 'fmt ');
  view.setUint32(16, 16, true);
  view.setUint16(20, 1, true);
  view.setUint16(22, numChannels, true);
  view.setUint32(24, sampleRate, true);
  view.setUint32(28, byteRate, true);
  view.setUint16(32, blockAlign, true);
  view.setUint16(34, 16, true);
  writeString(36, 'data');
  view.setUint32(40, pcmData.length, true);

  for (let i = 0; i < pcmData.length; i++) {
    view.setUint8(44 + i, pcmData[i]);
  }

  const wavBlob = new Blob([view], { type: 'audio/wav' });
  return URL.createObjectURL(wavBlob);
}

// 默认API URL
const DEFAULT_API_URL = 
  process.env.API_URL || 
  "https://generativelanguage.googleapis.com/v1beta/openai/chat/completions";

// 保存API设置到localStorage
export function saveApiSettings(apiKey: string, apiUrl: string): void {
  if (typeof window !== 'undefined') {
    if (apiKey) {
      localStorage.setItem('userApiKey', apiKey);
    } else {
      localStorage.removeItem('userApiKey');
    }
    
    if (apiUrl && apiUrl !== DEFAULT_API_URL) {
      localStorage.setItem('userApiUrl', apiUrl);
    } else {
      localStorage.removeItem('userApiUrl');
    }
  }
}

// 从localStorage获取API设置
export function getApiSettings(): { apiKey: string, apiUrl: string } {
  if (typeof window !== 'undefined') {
    // 尝试从localStorage读取
    const savedApiKey = localStorage.getItem('userApiKey') || '';
    const savedApiUrl = localStorage.getItem('userApiUrl') || DEFAULT_API_URL;
    
    // 尝试从环境变量读取默认值（如果本地没有值）
    const apiKey = savedApiKey || process.env.API_KEY || '';
    const apiUrl = savedApiUrl;
    
    return { apiKey, apiUrl };
  }
  return { 
    apiKey: process.env.API_KEY || '', 
    apiUrl: DEFAULT_API_URL 
  };
} 