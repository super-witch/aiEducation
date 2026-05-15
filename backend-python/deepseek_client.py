# deepseek_client.py - DeepSeek API调用模块

import requests
import os
import json
from dotenv import load_dotenv

# 加载环境变量
load_dotenv()

DEEPSEEK_API_KEY = os.getenv("DEEPSEEK_API_KEY")
DEEPSEEK_API_URL = "https://api.deepseek.com/v1/chat/completions" # 新版DeepSeek API通常省略/v1, 可按需调整

def call_deepseek(prompt: str, system_prompt: str = "你是一个数据结构教学AI助手，善于通过提问引导学生思考") -> str:
    """
    调用DeepSeek API
    
    参数:
    prompt: 用户输入的问题
    system_prompt: 系统提示词，定义AI的角色和行为
    
    返回:
    AI的回复内容
    """
    headers = {
        "Authorization": f"Bearer {DEEPSEEK_API_KEY}",
        "Content-Type": "application/json"
    }
    
    data = {
        "model": "deepseek-chat",
        "messages": [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ],
        "temperature": 0.7  # 温度越高回答越有创造性，越低越保守
    }
    
    try:
        response = requests.post(DEEPSEEK_API_URL, headers=headers, json=data)
        response.raise_for_status()  # 如果请求失败会抛出异常
        result = response.json()
        return result["choices"][0]["message"]["content"]
    except Exception as e:
        print(f"DeepSeek调用失败: {e}")
        # 返回一个默认的JSON响应，避免程序崩溃
        return '{"correct": true, "next_question": "请继续思考", "evaluation": "继续", "is_finished": false}'
