'use client';

import { useState, useEffect } from 'react';
import InputSection from './components/InputSection';
import AnalysisResult from './components/AnalysisResult';
import TranslationSection from './components/TranslationSection';
import SettingsModal from './components/SettingsModal';
import ThemeToggle from './components/ThemeToggle';
import LoginModal from './components/LoginModal';
import { analyzeSentence, TokenData, DEFAULT_API_URL, streamAnalyzeSentence } from './services/api';
import { FaExclamationTriangle, FaExclamationCircle } from 'react-icons/fa';

export default function Home() {
  const [currentSentence, setCurrentSentence] = useState('');
  const [analyzedTokens, setAnalyzedTokens] = useState<TokenData[]>([]);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [analysisError, setAnalysisError] = useState('');
  const [useStream, setUseStream] = useState<boolean>(true);
  const [streamContent, setStreamContent] = useState('');
  const [isJsonParseError, setIsJsonParseError] = useState(false);
  const [translationTrigger, setTranslationTrigger] = useState(0);
  
  // API설정 관련 상태
  const [isSettingsModalOpen, setIsSettingsModalOpen] = useState(false);
  const [userApiKey, setUserApiKey] = useState('');
  const [userApiUrl, setUserApiUrl] = useState(DEFAULT_API_URL);
  const [ttsProvider, setTtsProvider] = useState<'system' | 'gemini'>('gemini');
  
  // 비밀번호 인증 관련 상태
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [requiresAuth, setRequiresAuth] = useState(false);
  const [authError, setAuthError] = useState('');

  // 인증이 필요한지 확인
  useEffect(() => {
    const checkAuthRequirement = async () => {
      try {
        const response = await fetch('/api/auth');
        const data = await response.json();
        setRequiresAuth(data.requiresAuth);
        
        // 인증이 필요하지 않으면 인증된 것으로 설정
        if (!data.requiresAuth) {
          setIsAuthenticated(true);
        } else {
          // 이미 유효한 인증 상태가 있는지 확인
          const authStatus = localStorage.getItem('isAuthenticated');
          if (authStatus === 'true') {
            setIsAuthenticated(true);
          }
        }
      } catch (error) {
        console.error('인증 상태 확인 실패:', error);
        // 오류 시 기본적으로 인증이 필요하지 않음
        setRequiresAuth(false);
        setIsAuthenticated(true);
      }
    };
    
    checkAuthRequirement();
  }, []);

  // 로컬 스토리지에서 사용자 API 설정 로드
  useEffect(() => {
    const storedApiKey = localStorage.getItem('userApiKey') || '';
    const storedApiUrl = localStorage.getItem('userApiUrl') || DEFAULT_API_URL;
    const storedUseStream = localStorage.getItem('useStream');
    const storedTtsProvider = localStorage.getItem('ttsProvider') as 'system' | 'gemini' || 'gemini';
    
    setUserApiKey(storedApiKey);
    setUserApiUrl(storedApiUrl);
    setTtsProvider(storedTtsProvider);
    
    // 값이 명시적으로 설정된 경우에만 업데이트하고, 그렇지 않으면 기본값 유지
    if (storedUseStream !== null) {
      setUseStream(storedUseStream === 'true');
    }
  }, []);
  
  // 사용자 API 설정 저장
  const handleSaveSettings = (apiKey: string, apiUrl: string, streamEnabled: boolean) => {
    localStorage.setItem('userApiKey', apiKey);
    localStorage.setItem('userApiUrl', apiUrl);
    localStorage.setItem('useStream', streamEnabled.toString());
    
    setUserApiKey(apiKey);
    setUserApiUrl(apiUrl);
    setUseStream(streamEnabled);
  };

  // TTS 제공자 변경 처리
  const handleTtsProviderChange = (provider: 'system' | 'gemini') => {
    setTtsProvider(provider);
    localStorage.setItem('ttsProvider', provider);
  };

  // 비밀번호 인증 처리
  const handleLogin = async (password: string) => {
    try {
      setAuthError('');
      const response = await fetch('/api/auth', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      const data = await response.json();

      if (data.success) {
        setIsAuthenticated(true);
        localStorage.setItem('isAuthenticated', 'true');
      } else {
        setAuthError(data.message || '인증 실패');
      }
    } catch (error) {
      console.error('인증 중 오류 발생:', error);
      setAuthError('인증 중 오류가 발생했습니다. 다시 시도해주세요');
    }
  };

  // 스트림 콘텐츠에서 JSON 데이터 파싱
  const parseStreamContent = (content: string): TokenData[] => {
    try {
      // 내용이 비어있으면 빈 배열 반환
      if (!content || content.trim() === '') {
        return [];
      }
      
      // 내용을 정리하려고 시도
      let processedContent = content;
      
      // 내용에 markdown 코드 블록이 포함된 경우 추출 시도
      const jsonMatch = content.match(/```json\n([\s\S]*?)(\n```|$)/);
      if (jsonMatch && jsonMatch[1]) {
        processedContent = jsonMatch[1].trim();
        
        // 완전한 JSON 배열인지 확인
        if (!processedContent.endsWith(']') && processedContent.startsWith('[')) {
          console.log("불완전한 JSON 블록 발견, 완전하게 만들기 시도");
          // 마지막 완전한 객체 끝 위치 찾기
          const lastObjectEnd = processedContent.lastIndexOf('},');
          if (lastObjectEnd !== -1) {
            // 마지막 완전한 객체 추출
            processedContent = processedContent.substring(0, lastObjectEnd + 1) + ']';
          } else {
            // 완전한 객체를 찾을 수 없으면 최초 첫 객체 부분만 있을 수 있음
            const firstObjectStart = processedContent.indexOf('{');
            if (firstObjectStart !== -1) {
              const partialObject = processedContent.substring(firstObjectStart);
              // 최소한 하나의 완전한 필드가 있는지 확인
              if (partialObject.includes('":')) {
                return []; // 빈 배열 반환, 더 많은 내용 기다림
              }
            }
            return []; // 빈 배열 반환, 더 많은 내용 기다림
          }
        }
      } else {
        // 직접 JSON 배열 찾기
        const arrayStart = processedContent.indexOf('[');
        const arrayEnd = processedContent.lastIndexOf(']');
        
        if (arrayStart !== -1 && arrayEnd === -1) {
          // 시작은 있지만 끝을 찾을 수 없으면 불완전한 것
          const lastObjectEnd = processedContent.lastIndexOf('},');
          if (lastObjectEnd !== -1 && lastObjectEnd > arrayStart) {
            // 최소한 하나의 완전한 객체가 있음
            processedContent = processedContent.substring(arrayStart, lastObjectEnd + 1) + ']';
          } else {
            return []; // 완전한 객체가 없으면 빈 대기 더 많은 내용
          }
        } else if (arrayStart !== -1 && arrayEnd !== -1) {
          // 배열 부분 추출
          processedContent = processedContent.substring(arrayStart, arrayEnd + 1);
        }
      }
      
      // 정리된 내용 파싱 시도
      try {
        const parsed = JSON.parse(processedContent) as TokenData[];
        // 파싱된 객체에 필요한 필드가 있는지 확인
        if (Array.isArray(parsed) && parsed.length > 0) {
          const validTokens = parsed.filter(item => 
            item && typeof item === 'object' && 'word' in item && 'pos' in item
          );
          if (validTokens.length > 0) {
            return validTokens;
          }
        }
        return [];
      } catch (e) {
        console.log("처리된 JSON 파싱 실패:", processedContent);
        console.error(e);
        return [];
      }
    } catch (e) {
      console.error("JSON 파싱 중 오류:", e);
      console.debug("파싱 시도한 내용:", content);
      setIsJsonParseError(true);
      return [];
    }
  };

  // 스트림 콘텐츠 변경 감지, TokenData 파싱 시도
  useEffect(() => {
    if (streamContent && isAnalyzing) {
      const tokens = parseStreamContent(streamContent);
      if (tokens.length > 0) {
        setAnalyzedTokens(tokens);
        setIsJsonParseError(false);
      } else if (streamContent.includes('{') && streamContent.includes('"word":')) {
        // 내용은 있지만 파싱 실패, 불완전한 JSON일 가능성
        setIsJsonParseError(true);
      }
    }
  }, [streamContent, isAnalyzing]);

  // 추가 함수, 분석기 표시 여부 확인
  const shouldShowAnalyzer = (): boolean => {
    // 이미 파싱 결과가 있으면 표시
    if (analyzedTokens.length > 0) return true;
    
    // 내용이 없으면 표시하지 않음
    if (!streamContent) return false;
    
    // 내용은 있지만 파싱 실패, 상황에 따라
    if (isJsonParseError) {
      // 내용이 완전한 단어 정보를 포함하고 있으면 거의 완료된 것일 가능성
      return streamContent.includes('"word":') && streamContent.includes('"pos":');
    }
    
    return false;
  };

  const handleAnalyze = async (text: string) => {
    if (!text) return;

    setIsAnalyzing(true);
    setAnalysisError('');
    setCurrentSentence(text);
    setTranslationTrigger(Date.now());
    setStreamContent('');
    setAnalyzedTokens([]);
    setIsJsonParseError(false);
    
    try {
      if (useStream) {
        // 스트림 API를 사용하여 분석
        streamAnalyzeSentence(
          text,
          (chunk, isDone) => {
            setStreamContent(chunk);
            if (isDone) {
              setIsAnalyzing(false);
              // 최종적으로 완전한 내용 파싱
              const tokens = parseStreamContent(chunk);
              if (tokens.length > 0) {
                setAnalyzedTokens(tokens);
                setIsJsonParseError(false);
              } else if (chunk && chunk.includes('{') && chunk.includes('"word":')) {
                // 최종 내용 파싱 실패
                setIsJsonParseError(true);
              }
            }
          },
          (error) => {
            console.error('Stream analysis error:', error);
            setAnalysisError(error.message || '스트림 파싱 오류');
            setIsAnalyzing(false);
          },
          userApiKey,
          userApiUrl
        );
      } else {
        // 기존 API를 사용하여 분석
        const tokens = await analyzeSentence(text, userApiKey, userApiUrl);
        setAnalyzedTokens(tokens);
        setIsAnalyzing(false);
      }
    } catch (error) {
      console.error('Analysis error:', error);
      setAnalysisError(error instanceof Error ? error.message : '알 수 없는 오류');
      setAnalyzedTokens([]);
      setIsAnalyzing(false);
    }
  };

  // 인증이 필요하지만 인증되지 않은 경우 로그인 화면만 표시
  if (requiresAuth && !isAuthenticated) {
    return (
      <>
        <div className="min-h-screen flex flex-col items-center justify-center p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
          <div className="text-center mb-8">
            <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-200">
              일본어<span className="text-[#007AFF] dark:text-blue-400">글</span>분석기
            </h1>
            <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2 transition-colors duration-200">
              AI 구동・일본어 문장 구조와 단어 의미 깊이 이해
            </p>
          </div>
        </div>
        <LoginModal
          isOpen={true}
          onLogin={handleLogin}
          error={authError}
        />
      </>
    );
  }

  return (
    <div className="min-h-screen flex flex-col items-center justify-start pt-4 sm:pt-8 lg:pt-16 p-3 sm:p-4 bg-gray-50 dark:bg-gray-900 transition-colors duration-200">
      <div className="w-full max-w-3xl">
        {/* 테마 전환 버튼 - 고정 오른쪽 상단 */}
        <ThemeToggle />
        
        <header className="text-center mb-6 sm:mb-8 mt-12 sm:mt-16">
          <h1 className="text-3xl sm:text-4xl font-bold text-gray-800 dark:text-gray-100 transition-colors duration-200">
            일본어<span className="text-[#007AFF] dark:text-blue-400">글</span>분석기
          </h1>
          <p className="text-base sm:text-lg text-gray-600 dark:text-gray-400 mt-2 transition-colors duration-200">
            AI 구동・일본어 문장 구조와 단어 의미 깊이 이해
          </p>
        </header>

        <main>
          <InputSection 
            onAnalyze={handleAnalyze}
            userApiKey={userApiKey}
            userApiUrl={userApiUrl}
            useStream={useStream}
            ttsProvider={ttsProvider}
            onTtsProviderChange={handleTtsProviderChange}
          />

          {isAnalyzing && (!analyzedTokens.length || !useStream) && (
            <div className="premium-card">
              <div className="flex items-center justify-center py-6">
                <div className="loading-spinner"></div>
                <span className="ml-3 text-gray-600 dark:text-gray-400 transition-colors duration-200">분석 중, 잠시만 기다려주세요...</span>
              </div>
            </div>
          )}

          {isJsonParseError && streamContent && (
            <div className="premium-card">
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border-l-4 border-yellow-500 p-3 sm:p-4 mb-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaExclamationTriangle className="text-yellow-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-yellow-700 dark:text-yellow-300 transition-colors duration-200">
                      분석 중, 일부 내용을 받았지만 완전한 결과가 형성되지 않았습니다.
                    </p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 dark:bg-gray-800 p-3 rounded-md overflow-auto max-h-96 text-xs font-mono whitespace-pre-wrap text-gray-800 dark:text-gray-200 transition-colors duration-200">
                {streamContent}
              </div>
            </div>
          )}

          {analysisError && (
            <div className="premium-card">
              <div className="bg-red-50 dark:bg-red-900/20 border-l-4 border-red-500 p-3 sm:p-4 transition-colors duration-200">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FaExclamationCircle className="text-red-500" />
                  </div>
                  <div className="ml-3">
                    <p className="text-sm text-red-700 dark:text-red-300 transition-colors duration-200">
                      분석 오류: {analysisError}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {shouldShowAnalyzer() && (
            <AnalysisResult 
              tokens={analyzedTokens}
              originalSentence={currentSentence}
              userApiKey={userApiKey}
              userApiUrl={userApiUrl}
            />
          )}

          {currentSentence && (
            <TranslationSection
              japaneseText={currentSentence}
              userApiKey={userApiKey}
              userApiUrl={userApiUrl}
              useStream={useStream}
              trigger={translationTrigger}
            />
          )}
        </main>

        <footer className="text-center mt-8 sm:mt-12 py-4 sm:py-6 border-t border-gray-200 dark:border-gray-700 transition-colors duration-200">
          <p className="text-gray-500 dark:text-gray-400 text-xs sm:text-sm transition-colors duration-200">&copy; 2025 고급 일본어 분석 도구 by Howen. All rights reserved.</p>
          
        </footer>
      </div>
      
      {/* 설정 모달 */}
      <SettingsModal
        userApiKey={userApiKey}
        userApiUrl={userApiUrl}
        defaultApiUrl={DEFAULT_API_URL}
        useStream={useStream}
        onSaveSettings={handleSaveSettings}
        isModalOpen={isSettingsModalOpen}
        onModalClose={() => setIsSettingsModalOpen(!isSettingsModalOpen)}
      />
    </div>
  );
}
