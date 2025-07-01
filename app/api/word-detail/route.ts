import { NextRequest, NextResponse } from 'next/server';

// API密钥从环境变量获取，不暴露给前端
const API_KEY = process.env.API_KEY || '';
const API_URL = process.env.API_URL || 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
const MODEL_NAME = "gemini-2.5-flash-preview-05-20";

export async function POST(req: NextRequest) {
  try {
    // 解析请求体
    const { word, pos, sentence, furigana, romaji, model = MODEL_NAME, apiUrl } = await req.json();
    
    // 从请求头中获取用户提供的API密钥（如果有）
    const authHeader = req.headers.get('Authorization');
    const userApiKey = authHeader ? authHeader.replace('Bearer ', '') : '';
    
    // 优先使用用户API密钥，如果没有则使用环境变量中的密钥
    const effectiveApiKey = userApiKey || API_KEY;
    
    // 优先使用用户提供的API URL，否则使用环境变量中的URL
    const effectiveApiUrl = apiUrl || API_URL;
    
    if (!effectiveApiKey) {
      return NextResponse.json(
        { error: { message: '未提供API密钥，请在设置中配置API密钥或联系管理员配置服务器密钥' } },
        { status: 500 }
      );
    }

    if (!word || !pos || !sentence) {
      return NextResponse.json(
        { error: { message: '缺少必要的参数' } },
        { status: 400 }
      );
    }

    // 构建上下文信息
    let contextWordInfo = `단어 "${word}" (품사: ${pos}`;
    if (furigana) contextWordInfo += `, 읽기: ${furigana}`;
    if (romaji) contextWordInfo += `, 로마자: ${romaji}`;
    contextWordInfo += `)`;

    // 构建详情查询请求
    const detailPrompt = `일본어 문장 "${sentence}" 의 컨텍스트에서, ${contextWordInfo} 의 구체적인 의미는 무엇입니까? 다음 정보를 제공하고 엄격한 JSON 객체 형식으로 반환하세요. 마크다운 또는 기타 JSON이 아닌 문자를 포함하지 마세요.

특히 주의하세요:
1. 동사의 경우 시제(과거형, 현재형 등)와 어미(수동, 의무 등)를 정확하게 인식하고 예의 정도(간체, 존대 등)를 구분하세요
2. 동사와 도움동사의 결합("먹었다")의 경우 원형과 활용 변화 과정을 명확하게 설명하세요
3. 형용사의 경우 い형용사와な형용사를 구분하고 활용 형태를 인식하세요
4. 정확하게 사전형을 제공하세요. 이미 사전형인 단어의 경우 동일한 값을 입력할 수 있습니다

{
  "originalWord": "${word}",
  "chineseTranslation": "중문 번역",
  "pos": "${pos}",
  "furigana": "${furigana || ''}",
  "romaji": "${romaji || ''}",
  "dictionaryForm": "사전형(만약 적용된다면)",
  "explanation": "중문 설명(형태 변화, 시제, 어미 등 세밀한 문법 정보 포함)"
}`;

    const payload = {
      model: model,
      reasoning_effort: "none",
      messages: [{ role: "user", content: detailPrompt }],
    };

    // 发送到实际的AI API
    const response = await fetch(effectiveApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${effectiveApiKey}`
      },
      body: JSON.stringify(payload)
    });

    // 获取AI API的响应
    const data = await response.json();

    if (!response.ok) {
      console.error('AI API error (Word Detail):', data);
      return NextResponse.json(
        { error: data.error || { message: '단어 세부 정보 가져오기 실패' } },
        { status: response.status }
      );
    }

    // 将AI API的响应传回给客户端
    return NextResponse.json(data);
  } catch (error) {
    console.error('Server error (Word Detail):', error);
    return NextResponse.json(
      { error: { message: error instanceof Error ? error.message : '서버 오류' } },
      { status: 500 }
    );
  }
} 