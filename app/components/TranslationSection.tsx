'use client';

import { useState, useEffect } from 'react';
import { translateText, streamTranslateText } from '../services/api';

interface TranslationSectionProps {
  koreanText: string;
  userApiKey?: string;
  userApiUrl?: string;
  useStream?: boolean;
  trigger?: number;
}

export default function TranslationSection({
  koreanText,
  userApiKey,
  userApiUrl,
  useStream = true, // 默认为true，保持向后兼容
  trigger
}: TranslationSectionProps) {
  const [translation, setTranslation] = useState<string>('');
  const [isLoading, setIsLoading] = useState(false);
  const [isVisible, setIsVisible] = useState(true);

  const handleTranslate = async () => {
    if (!koreanText) {
      alert('한국어 문장을 먼저 입력하거나 분석하세요!');
      return;
    }

    setIsLoading(true);
    setIsVisible(true); // 确保显示翻译区域
    setTranslation(''); // 清空之前的翻译结果

    try {
      if (useStream) {
        // 使用流式API进行翻译
        streamTranslateText(
          koreanText,
          (chunk, isDone) => {
            setTranslation(chunk);
            if (isDone) {
              setIsLoading(false);
            }
          },
          (error) => {
            console.error('Error during streaming translation:', error);
            setTranslation(`번역 중 오류가 발생했습니다: ${error.message || '알 수 없는 오류'}입니다.`);
            setIsLoading(false);
          },
          userApiKey,
          userApiUrl
        );
      } else {
        // 使用传统API进行翻译
        const translatedText = await translateText(koreanText, userApiKey, userApiUrl);
        setTranslation(translatedText);
        setIsLoading(false);
      }
    } catch (error) {
      console.error('Error during full sentence translation:', error);
      setTranslation(`번역 중 오류가 발생했습니다: ${error instanceof Error ? error.message : '알 수 없는 오류'}입니다.`);
      setIsLoading(false);
    }
  };

  const toggleVisibility = () => {
    setIsVisible(!isVisible);
  };

  // 当trigger变化时自动开始翻译
  useEffect(() => {
    if (trigger && koreanText) {
      handleTranslate();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [trigger]);

  return (
    <>
      <div className="mt-6 flex flex-col sm:flex-row sm:justify-center space-y-3 sm:space-y-0 sm:space-x-4">
        <button 
          id="translateSentenceButton" 
          className="premium-button premium-button-primary w-full sm:w-auto"
          onClick={handleTranslate}
          disabled={isLoading}
        >
          {!isLoading && <span className="button-text">전체 문장 번역</span>}
          <div className="loading-spinner" style={{ display: isLoading ? 'inline-block' : 'none' }}></div>
          {isLoading && <span className="button-text">번역 중...</span>}
        </button>
      </div>

      {(isLoading || translation) && (
        <div id="fullTranslationCard" className="premium-card mt-4">
          <div className="flex justify-between items-center mb-3">
            <h2 className="text-2xl font-semibold text-gray-700" style={{ marginBottom: isVisible ? '0.75rem' : '0' }}>전체 번역 (중)</h2>
            <button 
              id="toggleFullTranslationButton" 
              className="premium-button premium-button-outlined text-sm px-3 py-1"
              onClick={toggleVisibility}
            >
              {isVisible ? '숨기기' : '보기'}
            </button>
          </div>
          
          {isVisible && (
            <div id="fullTranslationOutput" className="text-gray-800 p-3 bg-gray-50 rounded-lg min-h-[50px]">
              {isLoading && !translation ? (
                <div className="flex items-center justify-center py-4">
                  <div className="loading-spinner"></div>
                  <span className="ml-2 text-gray-500">번역 중입니다. 잠시만 기다려주세요...</span>
                </div>
              ) : (
                translation
              )}
            </div>
          )}
        </div>
      )}
    </>
  );
} 