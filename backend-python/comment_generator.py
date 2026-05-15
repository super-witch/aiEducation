# comment_generator.py - AI评论生成模块

import random

# 人设库
PERSONAS = [
    {"id": 1, "name": "考研二战学长", "style": "鼓励型，分享经验"},
    {"id": 2, "name": "同届学酥", "style": "同辈共鸣，请教细节"},
    {"id": 3, "name": "408卷王", "style": "挑战型，指出可优化点"},
    {"id": 4, "name": "佛系备考人", "style": "温和肯定"},
    {"id": 5, "name": "跨考小白", "style": "好奇提问"},
    {"id": 6, "name": "上岸学姐", "style": "干货补充"}
]

def generate_comments(post_title: str, post_content: str, knowledge_id: str) -> dict:
    """
    根据博文内容生成AI评论
    
    参数:
    post_title: 博文标题
    post_content: 博文正文
    knowledge_id: 知识点ID
    
    返回:
    包含评论列表的字典
    """
    # 随机选择3-5个人设
    selected_personas = random.sample(PERSONAS, min(5, len(PERSONAS)))
    num_comments = random.randint(3, 5)
    selected_personas = selected_personas[:num_comments]
    
    comments = []
    for persona in selected_personas:
        # 根据人设风格生成评论内容
        if persona["id"] == 1:  # 考研二战学长
            text = f"快速排序分区确实是高频考点，你这个总结很到位！我之前就是指针顺序搞反了。"
        elif persona["id"] == 2:  # 同届学酥
            text = f"我掌握度只有50多，你是怎么把递归终止条件搞懂的？"
        elif persona["id"] == 3:  # 408卷王
            text = f"建议再补充一下随机选基准和固定选基准的区别，面试常问。"
        elif persona["id"] == 4:  # 佛系备考人
            text = f"很棒的学习分享，继续保持～"
        elif persona["id"] == 5:  # 跨考小白
            text = f"刚开始学数据结构，这个分享对我很有帮助！"
        else:  # 上岸学姐
            text = f"补充一点：可以试试用画图的方式模拟分区过程，理解会更深刻。"
        
        # 每条评论的随机点赞数
        comment_likes = random.randint(5, 40)
        
        comments.append({
            "personaId": persona["id"],
            "personaName": persona["name"],
            "content": text,
            "likes": comment_likes
        })
    
    return {"comments": comments}