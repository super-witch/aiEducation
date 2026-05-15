# app.py - Python AI服务主程序

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Dict, Optional
import json
import os
from dotenv import load_dotenv

from deepseek_client import call_deepseek
from mastery import calculate_mastery
from post_generator import generate_post
from comment_generator import generate_comments

# 加载环境变量
load_dotenv()

# 创建FastAPI应用
app = FastAPI()

# 允许跨域请求（前端可以调用这个服务）
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ========== 定义请求和响应的数据格式 ==========

class IdentifyRequest(BaseModel):
    text: str  # 题目文本

class GuideRequest(BaseModel):
    problem: str           # 题目内容
    knowledgeId: str       # 知识点ID
    history: List[Dict]    # 历史对话
    userAnswer: str        # 用户回答
    previousMastery: int   # 上一次掌握度
    responseTime: int      # 响应时间（秒）
    helpCount: int         # 求助次数

class PostRequest(BaseModel):
    knowledgeId: str
    sessionData: dict

class CommentRequest(BaseModel):
    postId: str
    title: str
    content: str
    knowledgeId: str

# ========== API接口 ==========

@app.post("/ai/identify")
async def identify_knowledge(request: IdentifyRequest):
    """
    识别题目属于哪个知识点
    """
    prompt = f"""
    分析以下题目内容，判断它属于数据结构的哪个知识点。
    知识点选项：quick_sort, binary_tree, linked_list, stack, binary_search
    
    题目：{request.text}
    
    返回JSON格式：{{"knowledge_id": "quick_sort", "confidence": 0.9, "topic": "快速排序"}}
    """
    
    result = call_deepseek(prompt)
    
    try:
        return json.loads(result)
    except:
        # 如果解析失败，返回默认值
        return {"knowledge_id": "SORT_02", "confidence": 0.5, "topic": "快速排序"}

@app.post("/ai/guide")
async def ai_guide(request: GuideRequest):
    """
    一问一答引导接口
    """
    # 构建历史对话文本（只取最近3轮）
    history_text = ""
    for h in request.history[-3:]:
        history_text += f"Q: {h.get('question', '')}\nA: {h.get('answer', '')}\n"
    
    # 构建提示词
    prompt = f"""
    题目：{request.problem}
    知识点：{request.knowledgeId}
    
    历史对话：
    {history_text}
    
    用户最新回答：{request.userAnswer}
    
    任务：
    1. 判断用户回答是否正确
    2. 如果不正确或部分正确，给出引导性提问（不要直接给答案）
    3. 如果正确且题目未完成，提出下一个相关问题
    4. 如果所有问题都已答完，标记is_finished为true
    5. 给出简短评价（如"很好""接近了""再想想"）
    
    返回JSON格式：
    {{
        "correct": true/false,
        "next_question": "下一个问题或空字符串",
        "evaluation": "评价语",
        "is_finished": false/true
    }}
    """
    
    result = call_deepseek(prompt)
    
    try:
        ai_data = json.loads(result)
    except:
        ai_data = {
            "correct": True,
            "next_question": "请继续思考",
            "evaluation": "继续",
            "is_finished": False
        }
    
    # 计算新的掌握度
    new_mastery = calculate_mastery(
        request.previousMastery,
        ai_data.get("correct", False),
        request.responseTime,
        request.helpCount
    )
    
    # 判断是否需要推送资源（题目未完成时才推送）
    resource = None
    if not ai_data.get("is_finished", False):
        if new_mastery < 70:
            resource = {"type": "card"}
        else:
            resource = {"type": "video"}
    
    return {
        "nextQuestion": ai_data.get("next_question", "请继续思考"),
        "isCorrect": ai_data.get("correct", False),
        "newMastery": new_mastery,
        "resource": resource,
        "isFinished": ai_data.get("is_finished", False),
        "evaluation": ai_data.get("evaluation", "")
    }

@app.post("/community/generate_post")
async def generate_learning_post(request: PostRequest):
    """
    生成学习博文
    """
    return generate_post(request.knowledgeId, request.sessionData)

@app.post("/community/generate_comments")
async def generate_ai_comments(request: CommentRequest):
    """
    生成AI评论
    """
    return generate_comments(request.title, request.content, request.knowledgeId)

@app.get("/health")
async def health_check():
    """
    健康检查接口
    """
    return {"status": "ok"}

# 启动服务
if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=5000)
