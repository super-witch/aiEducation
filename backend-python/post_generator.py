# post_generator.py - 博文和点赞数生成模块

import random

def calculate_likes(session_data: dict) -> int:
    """
    根据学习数据计算点赞数
    
    参数:
    session_data: 本次学习的会话数据，包含掌握度变化、交互次数等
    
    返回:
    点赞数 (15-100)
    """
    improvement = session_data.get('mastery_improvement', 0)  # 提升幅度
    final_mastery = session_data.get('final_mastery', 50)     # 最终掌握度
    interactions = session_data.get('interaction_count', 5)   # 交互次数
    video_watched = session_data.get('video_watched', False)  # 是否看了视频
    
    # 计算基础分
    score = 0
    
    # 提升分：提升越大点赞越高，最高30
    score += min(improvement, 30)
    
    # 掌握度分：最终掌握度贡献，最高30
    score += int(final_mastery * 0.3)
    
    # 交互分：解决的问题越复杂，交互越多，最高15
    score += min(interactions, 15)
    
    # 视频观看加分
    if video_watched:
        score += 8
    
    # 随机波动 -5 到 +10
    score += random.randint(-5, 10)
    
    # 限制在15-100之间
    return max(15, min(100, score))

def generate_post(knowledge_id: str, session_data: dict) -> dict:
    """
    生成学习博文
    
    参数:
    knowledge_id: 知识点ID
    session_data: 学习会话数据
    
    返回:
    包含标题、正文、点赞数、评论数的字典
    """
    likes = calculate_likes(session_data)
    comment_count = random.randint(3, 8)
    
    # 知识点ID到名称的映射
    knowledge_names = {
        'SORT_02': '快速排序',
        'TREE_01': '二叉树遍历',
        'LIST_01': '单链表操作',
        'STACK_01': '栈的应用',
        'SEARCH_01': '二分查找'
    }
    topic = knowledge_names.get(knowledge_id, '数据结构')
    
    improvement = session_data.get('mastery_improvement', 0)
    final_mastery = session_data.get('final_mastery', 50)
    start_mastery = final_mastery - improvement
    correct_count = session_data.get('correct_count', 3)
    total_questions = session_data.get('total_questions', 5)
    video_watched = session_data.get('video_watched', False)
    key_takeaway = session_data.get('key_takeaway', '理解了核心概念')
    
    # 生成标题
    title = f"今天搞定了【{topic}】！掌握度从{start_mastery}→{final_mastery} 💪"
    
    # 生成正文
    video_text = "🎥 看了视频片段，帮助很大" if video_watched else ""
    content = f"""今天用AI助手学了一道{topic}的题目，分享一下学习过程～

📚 知识点：{topic}
📈 掌握度变化：{start_mastery} → {final_mastery}（+{improvement}）
💬 我答对了{correct_count}道追问中的{total_questions}道
{video_text}

关键收获：
- {key_takeaway}

#数据结构 #408考研 #{topic}
"""
    
    return {
        "title": title,
        "content": content.strip(),
        "likes": likes,
        "commentCount": comment_count
    }