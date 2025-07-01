'use client';

import { useState, useEffect } from 'react';
import { FaCog, FaGithub, FaSave } from 'react-icons/fa';

interface SettingsModalProps {
  userApiKey: string;
  userApiUrl: string;
  defaultApiUrl: string;
  useStream: boolean;
  onSaveSettings: (apiKey: string, apiUrl: string, useStream: boolean) => void;
  isModalOpen: boolean;
  onModalClose: () => void;
}

export default function SettingsModal({ 
  userApiKey, 
  userApiUrl,
  defaultApiUrl,
  useStream,
  onSaveSettings,
  isModalOpen,
  onModalClose
}: SettingsModalProps) {
  const [apiKey, setApiKey] = useState(userApiKey);
  const [apiUrl, setApiUrl] = useState(userApiUrl === defaultApiUrl ? '' : userApiUrl);
  const [streamEnabled, setStreamEnabled] = useState(useStream);
  const [status, setStatus] = useState('');
  const [statusClass, setStatusClass] = useState('');

  useEffect(() => {
    setApiKey(userApiKey);
    setApiUrl(userApiUrl === defaultApiUrl ? '' : userApiUrl);
    setStreamEnabled(useStream);
  }, [userApiKey, userApiUrl, defaultApiUrl, useStream]);

  const closeModal = () => {
    onModalClose();
  };

  const handleOutsideClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) {
      closeModal();
    }
  };

  const handleSaveSettings = () => {
    const trimmedApiKey = apiKey.trim();
    const trimmedApiUrl = apiUrl.trim();
    
    onSaveSettings(
      trimmedApiKey, 
      trimmedApiUrl || defaultApiUrl,
      streamEnabled
    );
    
    setStatus('설정이 저장되었습니다!');
    setStatusClass('mt-3 text-sm text-green-600');
    setTimeout(() => closeModal(), 1500);
  };

  return (
    <>
      <button
        id="settingsButton"
        title="API 설정"
        onClick={onModalClose}
        className="fixed top-6 right-6 z-1000 bg-white text-[#007AFF] border border-[#007AFF] rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-gray-50 transition-all"
      >
        <FaCog />
      </button>

      <a
        id="githubButton"
        href="https://github.com/cokice/japanese-analyzer"
        target="_blank"
        rel="noopener noreferrer"
        title="GitHub 저장소"
        className="fixed top-6 right-20 z-1000 bg-white dark:bg-gray-800 text-gray-800 dark:text-gray-300 border border-gray-800 dark:border-gray-600 rounded-full w-10 h-10 flex items-center justify-center shadow-md hover:bg-gray-50 dark:hover:bg-gray-700 transition-all"
      >
        <FaGithub />
      </a>

      <div 
        id="settingsModal" 
        className="settings-modal" 
        style={{ display: isModalOpen ? 'flex' : 'none' }}
        onClick={handleOutsideClick}
      >
        <div className="settings-modal-content">
          <span 
            id="closeSettingsModal" 
            className="settings-modal-close-button"
            onClick={closeModal}
          >
            &times;
          </span>
          <h3 className="text-xl font-semibold text-gray-700 mb-4">사용자 정의 API 설정</h3>
          
          <div className="mb-4">
            <p className="text-sm text-gray-600 mb-3">
              애플리케이션은 기본적으로 서버 측 API 키를 사용하여 작동합니다. 설정할 필요가 없습니다. 자신의 키와 API를 사용하려면 아래에서 설정하세요.
            </p>
            
            <label htmlFor="modalApiKeyInput" className="block text-sm font-medium text-gray-700 mb-1">
              사용자 정의 API 키 (선택 사항):
            </label>
            <input 
              type="password" 
              id="modalApiKeyInput" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
              placeholder="API 키 입력"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
            />
          </div>

          <div className="mb-4">
            <label htmlFor="modalApiUrlInput" className="block text-sm font-medium text-gray-700 mb-1">
              사용자 정의 API URL (선택 사항):
            </label>
            <input 
              type="text" 
              id="modalApiUrlInput" 
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500" 
              placeholder="예: https://generativelanguage.googleapis.com/v1beta/openai/chat/completions"
              value={apiUrl}
              onChange={(e) => setApiUrl(e.target.value)}
            />
            <p className="text-xs text-gray-500 mt-1">
              비워두면 기본 엔드포인트를 사용합니다. 사용자 정의 도메인을 사용하려면 도메인 뒤에
              <code className="px-1 py-0.5 bg-gray-100 rounded">v1/chat/completions</code>
            </p>
          </div>
          
          <div className="mb-4">
            <div className="flex items-center justify-between">
              <label htmlFor="useStreamToggle" className="block text-sm font-medium text-gray-700">
                스트림 출력 사용:
              </label>
              <label className="inline-flex items-center cursor-pointer">
                <input 
                  type="checkbox" 
                  id="useStreamToggle"
                  className="sr-only peer"
                  checked={streamEnabled}
                  onChange={() => setStreamEnabled(!streamEnabled)}
                />
                <div className="relative w-11 h-6 bg-gray-200 peer-focus:outline-none peer-focus:ring-4 peer-focus:ring-blue-300 dark:peer-focus:ring-blue-800 rounded-full peer dark:bg-gray-700 peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all dark:border-gray-600 peer-checked:bg-blue-600"></div>
              </label>
            </div>
            <p className="text-xs text-gray-500 mt-1">
              스트림 출력은 실시간으로 분석 결과를 표시할 수 있지만 일부 네트워크 환경에서는 불안정할 수 있습니다.
            </p>
          </div>

          <button 
            id="saveSettingsButton" 
            className="premium-button premium-button-success w-full"
            onClick={handleSaveSettings}
          >
            <FaSave className="mr-2" />설정 저장
          </button>
          {status && <div id="settingsStatus" className={statusClass}>{status}</div>}
          
          <div className="mt-4 text-xs text-gray-500">
            <p>참고: 사용자 정의 설정은 브라우저에 저장되며 서버로 전송되지 않습니다.</p>
          </div>
        </div>
      </div>
    </>
  );
} 